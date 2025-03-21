<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { useLegend, type LegendItem } from '../../hooks/useLegend';

    const COMPONENT_ID = 'TypeDistribution';
    let isMounted = false;
    let unsubscribeItems: () => void;
    let unsubscribeLanguage: () => void;
    let currentLang: 'en' | 'fr' = 'en';

    // Add legend hook reference
    let legendHook: ReturnType<typeof useLegend>;

    // Data interfaces
    interface TypeYearData {
        year: number;
        type: string;
        count: number;
    }

    interface FacetOption {
        value: string;
        label: string;
        count: number;
        selected: boolean;
    }

    // Add a new interface for type visibility
    interface TypeVisibility {
        type: string;
        visible: boolean;
    }

    // Visualization state
    let container: HTMLDivElement;
    let width = 0;
    let height = 0;
    let countryOptions: FacetOption[] = [];
    let allYears: number[] = [];
    let selectedYearRange: [number, number] = [0, 0];
    let typeYearData: TypeYearData[] = [];
    let totalItems = 0;
    
    // Add state for type visibility
    let typeVisibility: TypeVisibility[] = [];
    
    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip({
        defaultWidth: 250,
        defaultHeight: 150
    });

    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;

    // Initialize data processing hook
    const { filterItems, groupAndCount, groupHierarchically } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['publication_date', 'type'],
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
    });

    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const filterByCountryText = translate('viz.filter_by_country');
    const allCountriesText = translate('viz.all_countries');
    const publicationYearText = translate('viz.publication_year');
    const yearText = translate('viz.year');
    const numberOfItemsText = translate('viz.number_of_items');
    const toggleTypesText = translate('viz.toggle_types');
    const toggledTypeText = translate('viz.toggled_type');
    const countriesText = translate('viz.countries');
    const yearRangeText = translate('viz.time_period');
    const summaryText = translate('viz.summary');
    const showingItemsText = translate('viz.showing_items_over_months');
    const typesText = translate('viz.types');
    const publishedBetweenText = translate('viz.published_between');
    
    // Add title HTML for bilingual support
    let titleHtml = '';
    
    // Function to format numbers with locale-specific formatting
    function formatNumber(num: number): string {
        return num.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
    }

    // Function to update the title with the current count
    function updateTitleHtml() {
        if (totalItems > 0) {
            // Format the number with spaces as thousands separator
            const formattedCount = totalItems.toLocaleString();
            // Use the current language's translation with the formatted count
            titleHtml = t('viz.type_distribution_items', { '0': formattedCount });
        } else {
            titleHtml = t('viz.type_distribution_title');
        }
        console.log("Type Distribution Title updated:", titleHtml);
    }
    
    // Extract year from different date formats
    function extractYear(dateString?: string): number | null {
        if (!dateString) return null;
        
        // Handle YYYY format
        if (/^\d{4}$/.test(dateString)) {
            return parseInt(dateString);
        }
        
        // Handle YYYY-MM format
        if (/^\d{4}-\d{2}$/.test(dateString)) {
            return parseInt(dateString.substring(0, 4));
        }
        
        // Handle YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return parseInt(dateString.substring(0, 4));
        }
        
        return null;
    }

    // Process data based on current filters
    function processData() {
        if (!isMounted || !$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Get selected countries
        const selectedCountries = countryOptions
            .filter(option => option.selected)
            .map(option => option.value);
        
        // Check if "all" is selected
        const allCountriesSelected = selectedCountries.includes('all');
        
        // Create filter function for the data processing hook
        const filterFn = (item: OmekaItem) => {
            // Exclude items with type "Notice d'autorité"
            if (item.type === "Notice d'autorité") return false;
            
            // Filter by publication date
            const year = extractYear(item.publication_date);
            if (!year) return false;
            
            // Filter by selected years
            if (year < selectedYearRange[0] || year > selectedYearRange[1]) return false;
            
            // Always exclude items with unknown country
            if (!item.country || item.country.trim() === '' || item.country === 'Unknown') {
                return false;
            }
            
            // Filter by selected countries (if not "all")
            if (!allCountriesSelected && !selectedCountries.includes(item.country)) {
                return false;
            }
            
            return true;
        };

        // Initialize data processing with the filter
        const { filterItems: processWithFilter } = useDataProcessing({
            filterMissingValues: true,
            requiredFields: ['publication_date', 'type'],
            filterFn
        });

        // Filter items
        const filteredItems = processWithFilter($itemsStore.items);
        
        // Update total items count
        totalItems = filteredItems.length;
        
        // Update title with new count
        updateTitleHtml();
        
        // Group items by year and type using groupHierarchically
        const yearTypeData = groupHierarchically(
            filteredItems,
            [
                item => extractYear(item.publication_date)?.toString() || 'Unknown',
                item => item.type || 'Unknown'
            ]
        );

        // Convert hierarchical data to TypeYearData format
        const result: TypeYearData[] = [];
        yearTypeData.children?.forEach(yearGroup => {
            const year = parseInt(yearGroup.name);
            yearGroup.children?.forEach(typeGroup => {
                result.push({
                    year,
                    type: typeGroup.name,
                    count: typeGroup.value
                });
            });
        });
        
        return result;
    }

    // Generate country facet options
    function generateCountryFacets() {
        if (!isMounted || !$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Create filter function for facets
        const filterFn = (item: OmekaItem) => {
            // Filter out "Notice d'autorité" items
            if (item.type === "Notice d'autorité") return false;
            
            // Filter by year range
            const year = extractYear(item.publication_date);
            return year !== null && 
                   year >= selectedYearRange[0] && 
                   year <= selectedYearRange[1];
        };

        // Initialize data processing with the filter
        const { filterItems: filterForFacets, groupAndCount: countForFacets } = useDataProcessing({
            filterMissingValues: true,
            requiredFields: ['publication_date'],
            filterFn
        });

        // Filter items
        const filteredItems = filterForFacets($itemsStore.items);

        // Generate country counts using groupAndCount
        const countryData = countForFacets(
            filteredItems,
            item => item.country || 'Unknown'
        );

        // Count items with known countries
        const itemsWithKnownCountry = filteredItems.filter(item => 
            item.country && item.country.trim() !== '' && item.country !== 'Unknown'
        ).length;

        // Create options with translated labels
        countryOptions = [
            {
                value: 'all',
                label: t('country.all'),
                count: itemsWithKnownCountry,
                selected: countryOptions.find(opt => opt.value === 'all')?.selected ?? true
            },
            ...countryData
                .filter(item => item.key !== 'Unknown')
                .map(item => ({
                    value: item.key,
                    label: t(`country.${item.key}`) || item.key,
                    count: item.count,
                    selected: countryOptions.find(opt => opt.value === item.key)?.selected ?? false
                }))
        ];
        
        // Sort alphabetically by label (except "All Countries" which stays first)
        countryOptions.sort((a, b) => {
            if (a.value === 'all') return -1;
            if (b.value === 'all') return 1;
            return a.label.localeCompare(b.label);
        });
    }

    // Generate year range for slider
    function generateYearRange() {
        if (!isMounted || !$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Extract years from items, excluding "Notice d'autorité" items
        const years = $itemsStore.items
            .filter(item => item.type !== "Notice d'autorité")
            .map((item: OmekaItem) => extractYear(item.publication_date))
            .filter((year): year is number => year !== null);
        
        if (years.length === 0) return;
        
        // Get min and max years
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        // Create array of all years in range
        allYears = Array.from(
            { length: maxYear - minYear + 1 },
            (_, i) => minYear + i
        );
        
        // Initialize selected year range if not already set
        if (selectedYearRange[0] === 0 || selectedYearRange[1] === 0) {
            selectedYearRange = [minYear, maxYear];
        }
    }

    // Toggle country selection
    function toggleCountry(option: FacetOption) {
        if (!isMounted) return;
        
        // If "all" is selected, deselect all others
        if (option.value === 'all') {
            countryOptions.forEach(opt => {
                opt.selected = opt.value === 'all';
            });
        } else {
            // If a specific country is selected, deselect "all"
            countryOptions.find(opt => opt.value === 'all')!.selected = false;
            
            // Toggle the selected state of the clicked option
            option.selected = !option.selected;
            
            // If no countries are selected, select "all" again
            if (!countryOptions.some(opt => opt.selected)) {
                countryOptions.find(opt => opt.value === 'all')!.selected = true;
            }
        }
        
        // Force update of countryOptions array
        countryOptions = [...countryOptions];
        
        // Update visualization
        updateVisualization();
    }

    // Handle year range change
    function handleYearRangeChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const index = parseInt(input.dataset.index || '0');
        const value = parseInt(input.value);
        
        if (index === 0) {
            // Min year changed
            selectedYearRange = [value, Math.max(value, selectedYearRange[1])];
        } else {
            // Max year changed
            selectedYearRange = [Math.min(value, selectedYearRange[0]), value];
        }
        
        // Update country facets with new time range
        generateCountryFacets();
        
        // Update visualization
        updateVisualization();
    }

    // Update visualization based on current data and filters
    function updateVisualization() {
        if (!isMounted || !container || !document.body.contains(container)) {
            console.error('Cannot update visualization - component not mounted or container not found');
            return;
        }
        
        try {
            // Process data based on current filters
            typeYearData = processData();
            
            // Remove previous visualization and no-data message
            d3.select(container).select('svg').remove();
            d3.select(container).selectAll('.absolute.inset-center').remove();
            
            // No need to clean up previous legend since we're removing everything
            
            if (typeYearData.length === 0) {
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary z-50')
                    .text($noDataText);
                return;
            }
            
            // Check again if component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Get initial dimensions from container
            const rect = container.getBoundingClientRect();
            width = rect.width;
            
            // More reasonable height for the visualization area
            height = Math.max(400, rect.height - 100);
            
            // Verify component is still mounted after accessing DOM properties
            if (!isMounted || !document.body.contains(container)) return;
            
            // Get all unique types for dynamic margin calculation
            const types = Array.from(new Set(typeYearData.map(d => d.type)));
            
            // Calculate margin with proper dimensions to match the screenshot
            const margin = { 
                top: 20, 
                right: 30, 
                bottom: 70, // Increased bottom margin to make room for x-axis labels and prevent overlap with legend
                left: 60 
            };
            
            const chartWidth = width - margin.left - margin.right;
            
            // Sort types alphabetically for consistent display
            types.sort((a, b) => {
                // Try to get translations for comparison
                const aTranslated = t(`type.${a}`) !== `type.${a}` ? t(`type.${a}`) : a;
                const bTranslated = t(`type.${b}`) !== `type.${b}` ? t(`type.${b}`) : b;
                return aTranslated.localeCompare(bTranslated);
            });
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Initialize type visibility if not already set
            if (typeVisibility.length === 0) {
                typeVisibility = types.map(type => ({ type, visible: true }));
            } else {
                // Add any new types that weren't in the visibility list
                const existingTypes = typeVisibility.map(t => t.type);
                types.forEach(type => {
                    if (!existingTypes.includes(type)) {
                        typeVisibility.push({ type, visible: true });
                    }
                });
            }
            
            // Get visible types for the chart
            const visibleTypes = types.filter(type => 
                typeVisibility.find(t => t.type === type)?.visible ?? true
            );
            
            // Recalculate chart height with the adjusted margin
            const chartHeight = height - margin.top - margin.bottom;
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // If no types are visible, show a message and return
            if (visibleTypes.length === 0) {
                d3.select(container).selectAll('.absolute.inset-center').remove();
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary z-50')
                    .text($noDataText);
                return;
            }
            
            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // Create chart group
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            // Group the data by year, only including visible types
            const yearData = Array.from(d3.group(
                typeYearData.filter(d => typeVisibility.find(t => t.type === d.type)?.visible ?? true),
                d => d.year
            ), ([year, items]) => {
                const result: any = { year };
                
                // Add count for each type
                items.forEach(item => {
                    result[item.type] = item.count;
                });
                
                return result;
            }).sort((a, b) => a.year - b.year);
            
            // If yearData is empty after filtering, show no data message
            if (yearData.length === 0) {
                d3.select(container).selectAll('.absolute.inset-center').remove();
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary z-50')
                    .text($noDataText);
                return;
            }
            
            // Create scales
            const x = d3.scaleBand()
                .domain(yearData.map(d => d.year.toString()))
                .range([0, chartWidth])
                .padding(0.1);
            
            // Get maximum stacked value for y scale
            const stackedData = d3.stack<any>()
                .keys(visibleTypes)
                .value((d, key) => d[key] || 0)
                (yearData);
            
            const y = d3.scaleLinear()
                .domain([0, d3.max(stackedData.length > 0 ? stackedData[stackedData.length - 1] : [], d => d[1]) || 0])
                .range([chartHeight, 0]);
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Create color scale for types - use a fixed domain order to ensure consistent colors
            // This ensures the same type always gets the same color regardless of which types are visible
            const allPossibleTypes = [
                "Press Article", "Journal Article", "Book Chapter", "Doctoral Thesis", 
                "type.Article d'encyclopédie", "type.Mémoire de maitrise", "Book", 
                "type.Compte rendu de livre", "type.Rapport", "type.Working paper", 
                "type.Mémoire de licence", "Islamic Periodical", "Document", "type.Photographie", 
                "Blog Post", "Scientific Communication", "type.Enregistrement vidéo",
                "Article de presse", "Article de revue", "Chapitre de livre", "Thèse de doctorat", 
                "Article d'encyclopédie", "Mémoire de maitrise", "Livre", 
                "Compte rendu de livre", "Rapport", "Working paper", 
                "Mémoire de licence", "Périodique islamique", "Document", "Photographie", 
                "Article de blog", "Communication scientifique", "Enregistrement vidéo"
            ];
            
            const color = d3.scaleOrdinal<string>()
                .domain(allPossibleTypes)
                .range(d3.schemeCategory10);
            
            // Add x axis with filtered ticks (every 5 years)
            chart.append('g')
                .attr('transform', `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(x)
                    .tickValues(yearData
                        .filter(d => d.year % 5 === 0) // Show only years divisible by 5
                        .map(d => d.year.toString()))
                    .tickSizeOuter(0))
                .selectAll('text')
                .attr('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-45)')
                .attr('class', 'text-xs text-primary');
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Add y axis
            chart.append('g')
                .call(d3.axisLeft(y).ticks(5))
                .selectAll('text')
                .attr('class', 'text-xs text-primary');
            
            // Add axis labels
            chart.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + 40)
                .attr('fill', 'var(--color-text-secondary)')
                .attr('class', 'text-sm text-secondary')
                .text($yearText);
            
            chart.append('text')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .attr('x', -chartHeight / 2)
                .attr('y', -margin.left + 15)
                .attr('fill', 'var(--color-text-secondary)')
                .attr('class', 'text-sm text-secondary')
                .text($numberOfItemsText);
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Create stacked bars
            chart.selectAll('.type-bars')
                .data(stackedData)
                .enter()
                .append('g')
                .attr('class', 'type-bars')
                .attr('fill', d => color(d.key))
                .selectAll('rect')
                .data(d => d)
                .enter()
                .append('rect')
                .attr('x', d => x(d.data.year.toString()) || 0)
                .attr('y', d => y(d[1]))
                .attr('height', d => y(d[0]) - y(d[1]))
                .attr('width', x.bandwidth())
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .on('mouseenter', (event, d) => {
                    if (isMounted) {
                        const content = createTypeTooltipContent(d, stackedData);
                        showTooltip(event, content);
                    }
                })
                .on('mousemove', (event, d) => {
                    if (isMounted) {
                        const content = createTypeTooltipContent(d, stackedData);
                        showTooltip(event, content);
                    }
                })
                .on('mouseleave', () => {
                    if (isMounted) hideTooltip();
                });
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Create type count for legend items
            const typeCounts = types.map(type => {
                const count = typeYearData
                    .filter(d => d.type === type)
                    .reduce((sum, d) => sum + d.count, 0);
                return { type, count };
            }).sort((a, b) => b.count - a.count); // Sort by count descending
            
            // Update the legend with current data using the useLegend hook
            if (legendHook) {
                // Update existing legend with new data
                const legendItems: LegendItem[] = typeCounts.map(item => ({
                    key: item.type,
                    label: t(`type.${item.type}`) !== `type.${item.type}` ? t(`type.${item.type}`) : item.type,
                    color: color(item.type),
                    value: item.count,
                    visible: typeVisibility.find(t => t.type === item.type)?.visible ?? true,
                    customProperties: { type: item.type }
                }));
                
                legendHook.update(legendItems);
            } else {
                // Create new legend
                legendHook = useLegend({
                    container,
                    title: t('viz.toggle_types'),
                    items: typeCounts.map(item => ({
                        key: item.type,
                        label: t(`type.${item.type}`) !== `type.${item.type}` ? t(`type.${item.type}`) : item.type,
                        color: color(item.type),
                        value: item.count,
                        visible: typeVisibility.find(t => t.type === item.type)?.visible ?? true,
                        customProperties: { type: item.type }
                    })),
                    type: 'html',
                    position: 'bottom',
                    orientation: 'horizontal',
                    className: 'multi-row-legend',
                    showValues: true,
                    valueFormatter: (value) => formatNumber(value),
                    translateKeys: {
                        itemPrefix: 'type.',
                    },
                    responsive: true,
                    breakpoint: 768,
                    interactive: true,
                    onItemClick: (item) => {
                        if (!isMounted) return;
                        
                        // Find and toggle the visibility of this type
                        const typeIndex = typeVisibility.findIndex(t => t.type === item.customProperties?.type);
                        if (typeIndex >= 0) {
                            typeVisibility[typeIndex].visible = !typeVisibility[typeIndex].visible;
                            typeVisibility = [...typeVisibility]; // Trigger reactivity
                            
                            // Update legend item visibility
                            legendHook.updateVisibility(item.key, typeVisibility[typeIndex].visible);
                            
                            // Update country facets to reflect the new type visibility
                            generateCountryFacets();
                            
                            // Update chart
                            updateVisualization();
                        }
                    }
                });
                
                // Render the legend
                legendHook.render();
            }
            
            // Set appropriate SVG height to accommodate the chart and legend
            // Estimate legend height based on number of types
            const rowCount = Math.ceil(typeCounts.length / 5); // Assume about 5 items per row
            const legendHeight = rowCount * 22 + 30; // Approximate height per row + padding
            svg.attr('height', height + legendHeight + 30); // Add extra padding for legend
            
        } catch (error) {
            console.error('Error updating visualization:', error);
            // Don't try to update anything else if there was an error
        }
    }

    function handleItemsChange(items: any) {
        if (!isMounted || !container || !document.body.contains(container)) return;
        
        logDebug(COMPONENT_ID, 'Items store changed', { itemCount: items?.length || 0 });
        
        // Only update if the component is still mounted
        if (isMounted && document.body.contains(container)) {
            generateCountryFacets();
            generateYearRange();
            updateVisualization();
            updateTitleHtml(); // Update title after visualization is updated
        }
    }

    // Function to create tooltip content for a data point
    function createTypeTooltipContent(d: any, stackedData: d3.Series<any, string>[]) {
        const year = d.data.year;
        const typeCounts = stackedData.map(series => {
            const typeItem = series.find(item => item.data.year === year);
            return {
                type: series.key,
                count: typeItem ? typeItem[1] - typeItem[0] : 0
            };
        }).filter(item => item.count > 0);
        
        // Calculate total for percentage
        const total = typeCounts.reduce((sum, item) => sum + item.count, 0);
        
        // Create rows for the grid tooltip
        const rows = [
            // Header row for types, count, and percentage
            { label: t('viz.type'), value: t('viz.count') + ' / %' }
        ];
        
        // Add rows for each type
        typeCounts.forEach(item => {
            const typeKey = `type.${item.type}`;
            let displayType = item.type;
            
            // Try to get the translation
            const translatedType = t(typeKey);
            // If translation doesn't return the key itself, use it
            if (translatedType !== typeKey) {
                displayType = translatedType;
            }
            
            rows.push({
                label: displayType,
                value: `${formatNumber(item.count)} (${((item.count / total) * 100).toFixed(1)}%)`
            });
        });
        
        // Add total row
        rows.push({ 
            label: t('viz.total_items'), 
            value: formatNumber(total)
        });
        
        return createGridTooltipContent(
            `${t('viz.year')}: ${year}`,
            rows
        );
    }
    
    onMount(() => {
        isMounted = true;
        trackMount(COMPONENT_ID);

        // Create initialization promise
        const initPromise = (async () => {
            try {
                // Wait for the next tick to ensure container is bound
                await tick();
                
                // Double check container after tick
                if (!container) {
                    console.error('Container element not found in onMount');
                    return;
                }

                // Initialize resize hook
                resizeHook = useD3Resize({
                    container,
                    onResize: () => {
                        if (isMounted && container) {
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            width = newWidth;
                            height = newHeight;
                            updateVisualization();
                        }
                    }
                });
                
                // Subscribe to language changes
                unsubscribeLanguage = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    currentLang = value;
                    
                    if (container) {
                        updateTitleHtml();
                        
                        if ($itemsStore.items && $itemsStore.items.length > 0) {
                            generateCountryFacets();
                            updateVisualization();
                        }
                    }
                });
                
                // Subscribe to items store
                unsubscribeItems = itemsStore.subscribe(value => {
                    if (!isMounted) return;
                    
                    if (value?.items && value.items.length > 0) {
                        // Generate year range and country facets
                        generateYearRange();
                        generateCountryFacets();
                        updateTitleHtml();
                        
                        // Update visualization
                        if (container) {
                            updateVisualization();
                        }
                    }
                });
                
                // Initial data load if needed
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    generateYearRange();
                    generateCountryFacets();
                    updateTitleHtml();
                    updateVisualization();
                } else {
                    itemsStore.loadItems();
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            isMounted = false;
            trackUnmount(COMPONENT_ID);
            
            if (resizeHook) {
                resizeHook.cleanup();
            }
            
            if (unsubscribeItems) {
                unsubscribeItems();
                unsubscribeItems = null as unknown as () => void;
            }
            
            if (unsubscribeLanguage) {
                unsubscribeLanguage();
                unsubscribeLanguage = null as unknown as () => void;
            }
            
            // Clean up legend hook if it exists
            if (legendHook) {
                legendHook.cleanup();
                legendHook = null as unknown as ReturnType<typeof useLegend>;
            }
            
            // Clean up by removing all elements
            if (container) {
                d3.select(container).selectAll('*').remove();
            }
        };
    });

    onDestroy(() => {
        // This is a backup in case the cleanup function in onMount doesn't run
        isMounted = false;
        
        // Clean up store subscriptions
        if (unsubscribeItems) {
            unsubscribeItems();
            unsubscribeItems = null as unknown as () => void;
        }
        
        // Clean up language subscription
        if (unsubscribeLanguage) {
            unsubscribeLanguage();
            unsubscribeLanguage = null as unknown as () => void;
        }
        
        // Clean up legend hook if it exists
        if (legendHook) {
            legendHook.cleanup();
            legendHook = null as unknown as ReturnType<typeof useLegend>;
        }
        
        logDebug(COMPONENT_ID, 'Component destroyed');
    });
</script>

<BaseVisualization
    title=""
    translationKey=""
    description="This visualization shows the distribution of items by type over time. You can filter by country and year range to explore how different types of items have been published over time."
    descriptionTranslationKey="viz.type_distribution_description"
    titleHtml={titleHtml}
    className="word-visualization-compact-header"
>
    <div class="type-distribution-container">
        <!-- Countries section at the top -->
        <div class="controls-container">
            <!-- Countries facet -->
            <div class="facets">
                <div class="facet-group">
                    <h3>{$countriesText}</h3>
                    <div class="facet-options table-layout">
                        {#each countryOptions as option}
                            <div 
                                class="facet-option" 
                                class:selected={option.selected} 
                                on:click={() => toggleCountry(option)}
                                on:keydown={(e) => e.key === 'Enter' && toggleCountry(option)}
                                role="checkbox"
                                aria-checked={option.selected}
                                tabindex="0"
                            >
                                <span class="facet-checkbox">
                                    {#if option.selected}
                                        <svg viewBox="0 0 24 24" width="14" height="14">
                                            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                    {/if}
                                </span>
                                <span class="facet-label">{option.label}</span>
                                <span class="facet-count">{option.count}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
            
            <!-- Time period slider -->
            <div class="year-range">
                <h3>{$yearRangeText}</h3>
                <div class="slider-container">
                    <div class="slider-labels">
                        <span>{selectedYearRange[0]}</span>
                        <span>{selectedYearRange[1]}</span>
                    </div>
                    <div class="slider-inputs">
                        <input 
                            type="range" 
                            min={allYears[0]} 
                            max={allYears[allYears.length - 1]} 
                            value={selectedYearRange[0]} 
                            data-index="0"
                            on:input={handleYearRangeChange}
                        />
                        <input 
                            type="range" 
                            min={allYears[0]} 
                            max={allYears[allYears.length - 1]} 
                            value={selectedYearRange[1]} 
                            data-index="1"
                            on:input={handleYearRangeChange}
                        />
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Chart container below the controls -->
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary z-50">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error z-50">{$itemsStore.error}</div>
            {/if}
        </div>
    </div>
</BaseVisualization>

<style>
    .type-distribution-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    /* Controls container for facets and year range */
    .controls-container {
        display: flex;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-sm);
    }
    
    /* Make the facets and year range side by side */
    .facets, .year-range {
        flex: 1;
        background-color: var(--color-bg-card);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-sm);
    }
    
    /* Make the chart container take up remaining space */
    .chart-container {
        flex: 1;
        position: relative;
        background: var(--color-bg-card);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        /* Reasonable height that allows the chart to be visible without being too tall */
        min-height: 450px;
        max-height: 600px;
        height: auto;
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-xs);
        color: var(--color-text-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--color-border);
        padding-bottom: var(--spacing-xs);
    }
    
    .facet-group {
        margin-bottom: var(--spacing-sm);
    }
    
    .facet-options {
        padding-right: var(--spacing-sm);
    }
    
    /* Add table-like layout for facet options to match screenshot */
    .facet-options.table-layout {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: var(--spacing-xs) var(--spacing-md);
    }
    
    .facet-option {
        display: flex;
        align-items: center;
        padding: var(--spacing-xs) 0;
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background-color var(--transition-fast);
        font-size: var(--font-size-sm);
    }
    
    .facet-option:hover {
        background-color: var(--color-bg-hover);
    }
    
    .facet-option.selected {
        font-weight: bold;
        color: var(--color-primary);
    }
    
    .facet-checkbox {
        width: 14px;
        height: 14px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        margin-right: var(--spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        flex-shrink: 0;
    }
    
    .facet-option.selected .facet-checkbox {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }
    
    .facet-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .facet-count {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        margin-left: var(--spacing-xs);
    }
    
    .slider-container {
        margin-top: var(--spacing-md);
    }
    
    .slider-labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
    }
    
    .slider-inputs {
        position: relative;
        height: 30px;
    }
    
    input[type="range"] {
        position: absolute;
        width: 100%;
        pointer-events: none;
        appearance: none;
        height: 4px;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        background: var(--color-border-light);
        outline: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        border: none;
    }
    
    input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-primary);
        cursor: pointer;
        border: none;
    }
    
    /* Add header compact styles */
    :global(.type-distribution-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    :global(.type-distribution-container .title-container) {
        padding-bottom: 0 !important;
    }
</style> 