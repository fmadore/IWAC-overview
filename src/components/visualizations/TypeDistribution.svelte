<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore, translations } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';

    const COMPONENT_ID = 'TypeDistribution';
    let isMounted = false;
    let unsubscribeItems: () => void;
    let unsubscribeLanguage: () => void;
    let currentLang: 'en' | 'fr' = 'en';
    let resizeObserver: ResizeObserver | null = null;

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
    let tooltip: HTMLDivElement | null;
    let width = 0;
    let height = 0;
    let countryOptions: FacetOption[] = [];
    let allYears: number[] = [];
    let selectedYearRange: [number, number] = [0, 0];
    let typeYearData: TypeYearData[] = [];
    let totalItems = 0;
    
    // Add state for type visibility
    let typeVisibility: TypeVisibility[] = [];

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
    
    // Function to update the title with the current count
    function updateTitleHtml() {
        if (totalItems > 0) {
            // Format the number with spaces as thousands separator
            const formattedCount = totalItems.toLocaleString();
            // Use the current language's translation with the formatted count
            titleHtml = t('viz.type_distribution_items', [formattedCount]);
        } else {
            titleHtml = t('viz.type_distribution_title');
        }
        console.log("Type Distribution Title updated:", titleHtml);
    }
    
    // Update title when totalItems changes
    $: if (isMounted) {
        updateTitleHtml();
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
        
        // Filter items by selected countries, valid publication dates, and exclude "Notice d'autorité" type
        const filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
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
        });
        
        // Update total items count
        totalItems = filteredItems.length;
        
        // Update title with new count
        updateTitleHtml();
        
        // Group items by year and type
        const yearTypeMap = new Map();
        
        filteredItems.forEach(item => {
            const year = extractYear(item.publication_date);
            if (!year) return;
            
            const type = item.type || 'Unknown';
            
            const key = `${year}-${type}`;
            if (yearTypeMap.has(key)) {
                yearTypeMap.set(key, yearTypeMap.get(key) + 1);
            } else {
                yearTypeMap.set(key, 1);
            }
        });
        
        // Convert map to array of TypeYearData objects
        const result: TypeYearData[] = [];
        yearTypeMap.forEach((count, key) => {
            const [yearStr, type] = key.split('-');
            result.push({
                year: parseInt(yearStr),
                type,
                count
            });
        });
        
        return result;
    }

    // Generate country facet options
    function generateCountryFacets() {
        if (!isMounted || !$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Filter out "Notice d'autorité" items first
        const filteredItems = $itemsStore.items.filter(item => item.type !== "Notice d'autorité");
        
        // Filter by year range if it's set
        let itemsInTimeRange = filteredItems;
        if (selectedYearRange[0] > 0 && selectedYearRange[1] > 0) {
            itemsInTimeRange = filteredItems.filter(item => {
                const year = extractYear(item.publication_date);
                return year !== null && 
                       year >= selectedYearRange[0] && 
                       year <= selectedYearRange[1];
            });
        }
        
        // Get all countries from filtered items, excluding "Unknown"
        const countries = itemsInTimeRange
            .map((item: OmekaItem) => item.country || 'Unknown')
            .filter((country: string) => country.trim() !== '' && country !== 'Unknown');
        
        // Count items per country
        const countryCounts = d3.rollup(
            countries,
            v => v.length,
            d => d
        );
        
        // Count items with known countries (excluding Unknown)
        const itemsWithKnownCountry = itemsInTimeRange.filter(item => 
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
            ...Array.from(countryCounts, ([country, count]) => ({
                value: country,
                label: t(`country.${country}`) || country,
                count,
                selected: countryOptions.find(opt => opt.value === country)?.selected ?? false
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

    // Create tooltip
    function createTooltip() {
        try {
            // Remove any existing tooltip first
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
            
            tooltip = document.createElement('div');
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.display = 'none';
            tooltip.style.fontSize = '12px';
            tooltip.style.zIndex = '1000';
            tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            
            if (document && document.body) {
                document.body.appendChild(tooltip);
            }
        } catch (e) {
            console.error('Error creating tooltip:', e);
            tooltip = null;
        }
    }

    // Show tooltip with data
    function showTooltip(event: MouseEvent, d: any, stackedData: d3.Series<any, string>[]) {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                createTooltip();
            }
            
            if (!tooltip) return;
            
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
            
            tooltip.innerHTML = `
                <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                    Year: ${year}
                </div>
                <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px;">
                    <span style="font-weight:bold">Type</span>
                    <span style="text-align:right;font-weight:bold">Count</span>
                    <span style="text-align:right;font-weight:bold">%</span>
                    ${typeCounts.map(item => `
                        <span>${item.type}</span>
                        <span style="text-align:right">${item.count}</span>
                        <span style="text-align:right">${((item.count / total) * 100).toFixed(1)}%</span>
                    `).join('')}
                    <span style="border-top:1px solid rgba(255,255,255,0.3);font-weight:bold;margin-top:2px;padding-top:2px;">Total</span>
                    <span style="border-top:1px solid rgba(255,255,255,0.3);text-align:right;font-weight:bold;margin-top:2px;padding-top:2px;">${total}</span>
                    <span></span>
                </div>
            `;
            
            const tooltipWidth = 250;
            const tooltipHeight = 150;
            
            let left = event.pageX + 10;
            let top = event.pageY + 10;
            
            if (left + tooltipWidth > window.innerWidth) {
                left = event.pageX - tooltipWidth - 10;
            }
            
            if (top + tooltipHeight > window.innerHeight) {
                top = event.pageY - tooltipHeight - 10;
            }
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.display = 'block';
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }

    // Hide tooltip
    function hideTooltip() {
        try {
            if (tooltip && document.body.contains(tooltip)) {
                tooltip.style.display = 'none';
            }
        } catch (e) {
            console.error('Error hiding tooltip:', e);
        }
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
            
            if (typeYearData.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).select('.no-data').remove();
                d3.select(container).append('div')
                    .attr('class', 'no-data')
                    .style('position', 'absolute')
                    .style('top', '50%')
                    .style('left', '50%')
                    .style('transform', 'translate(-50%, -50%)')
                    .style('text-align', 'center')
                    .style('color', 'var(--text-color-secondary)')
                    .text($noDataText);
                return;
            }
            
            // Check again if component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Remove previous visualization and no-data message
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
            
            // Set up dimensions
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            
            // Verify component is still mounted after accessing DOM properties
            if (!isMounted || !document.body.contains(container)) return;
            
            // Set margins - make bottom margin just enough for the legend
            let margin = { top: 20, right: 30, bottom: 120, left: 60 };
            const chartWidth = width - margin.left - margin.right;
            
            // Get all unique types
            const types = Array.from(new Set(typeYearData.map(d => d.type)));
            
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
            
            // Calculate the number of legend rows needed - make it more compact
            const legendItemWidth = 150; // Smaller width
            const maxItemsPerRow = 6; // More items per row
            const legendItemsPerRow = Math.min(Math.floor(chartWidth / legendItemWidth) || 1, maxItemsPerRow);
            const legendRowHeight = 25; // Increased row height
            const numRows = Math.ceil(types.length / legendItemsPerRow);
            
            // Adjust bottom margin based on the number of rows
            margin.bottom = Math.max(margin.bottom, numRows * legendRowHeight + 70);
            
            // Recalculate chart height with the adjusted margin
            const chartHeight = height - margin.top - margin.bottom;
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
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
            
            // Get only visible types for the chart
            const visibleTypes = types.filter(type => 
                typeVisibility.find(t => t.type === type)?.visible ?? true
            );
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // Create chart group
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
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
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-45)') // Rotate labels for better readability
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Add y axis
            chart.append('g')
                .call(d3.axisLeft(y).ticks(5))
                .selectAll('text')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Add axis labels
            chart.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + 40)
                .attr('fill', 'var(--text-color-secondary)')
                .style('font-size', 'var(--font-size-sm)')
                .text($yearText);
            
            chart.append('text')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .attr('x', -chartHeight / 2)
                .attr('y', -margin.left + 15)
                .attr('fill', 'var(--text-color-secondary)')
                .style('font-size', 'var(--font-size-sm)')
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
                    if (isMounted) showTooltip(event, d, stackedData);
                })
                .on('mousemove', (event, d) => {
                    if (isMounted) showTooltip(event, d, stackedData);
                })
                .on('mouseleave', () => {
                    if (isMounted) hideTooltip();
                });
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            // Add interactive legend below the chart (under x-axis)
            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + 60})`);
            
            // Add legend title with improved styling - make it smaller
            legend.append('text')
                .attr('x', 0)
                .attr('y', -15)
                .attr('font-size', 'var(--font-size-xs)')
                .attr('font-weight', 'normal')
                .attr('fill', 'var(--text-color-secondary)')
                .text($toggleTypesText);
            
            // Create a container for the legend items
            const legendItems = legend.append('g')
                .attr('class', 'legend-items')
                .attr('transform', 'translate(0, 5)');
            
            // Check component is still mounted
            if (!isMounted || !document.body.contains(container)) return;
            
            types.forEach((type, i) => {
                // Check component is still mounted in each iteration
                if (!isMounted || !document.body.contains(container)) return;
                
                const isVisible = typeVisibility.find(t => t.type === type)?.visible ?? true;
                
                // Calculate position in grid layout
                const row = Math.floor(i / legendItemsPerRow);
                const col = i % legendItemsPerRow;
                
                // Create a group for each legend item
                const legendItem = legendItems.append('g')
                    .attr('transform', `translate(${col * legendItemWidth}, ${row * legendRowHeight})`)
                    .attr('class', 'legend-item')
                    .attr('role', 'button')
                    .style('cursor', 'pointer');
                
                // Add background for better click target
                legendItem.append('rect')
                    .attr('x', -5)
                    .attr('y', -5)
                    .attr('width', legendItemWidth - 10)
                    .attr('height', 15)
                    .attr('fill', 'transparent')
                    .attr('class', 'legend-hitbox');
                
                // Add color box - make it smaller
                legendItem.append('rect')
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('fill', color(type))
                    .attr('stroke', isVisible ? 'none' : '#999')
                    .attr('stroke-width', isVisible ? 0 : 1)
                    .attr('opacity', isVisible ? 1 : 0.5);
                
                // Add text with translated type name - make it smaller
                const typeKey = `type.${type}`;
                let displayText = type;
                
                try {
                    // First try to get the translation
                    const translatedType = t(typeKey);
                    // If translation doesn't return the key itself, use it
                    if (translatedType !== typeKey) {
                        displayText = translatedType;
                    }
                    // Log for debugging
                    console.log(`Type: ${type}, Translation key: ${typeKey}, Result: ${displayText}`);
                } catch (e) {
                    console.error(`Error translating type ${type}:`, e);
                }
                
                const text = legendItem.append('text')
                    .attr('x', 15) // Reduce spacing
                    .attr('y', 8) // Adjust vertical position
                    .attr('font-size', 'var(--font-size-xs)') // Make font smaller
                    .attr('fill', 'var(--text-color-secondary)') // Make text less prominent
                    .style('opacity', isVisible ? 1 : 0.5)
                    .text(displayText);
                
                // Add strikethrough for hidden types
                if (!isVisible) {
                    const textNode = text.node();
                    if (textNode) {
                        const textWidth = textNode.getComputedTextLength();
                        legendItem.append('line')
                            .attr('x1', 15)
                            .attr('y1', 8)
                            .attr('x2', 15 + textWidth)
                            .attr('y2', 8)
                            .attr('stroke', 'var(--text-color-secondary)')
                            .attr('stroke-width', 1)
                            .attr('opacity', 0.7);
                    }
                }
                
                // Add click handler to the entire group
                legendItem.on('click', () => {
                    if (!isMounted) return;
                    
                    console.log(`Clicked on type: ${type}`);
                    d3.select(container).append('div')
                        .attr('class', 'debug-message')
                        .style('position', 'fixed')
                        .style('bottom', '10px')
                        .style('left', '10px')
                        .style('background', 'rgba(0,0,0,0.7)')
                        .style('color', 'white')
                        .style('padding', '5px 10px')
                        .style('border-radius', '4px')
                        .style('z-index', 9999)
                        .text(`Toggled type: ${type}`)
                        .transition()
                        .duration(2000)
                        .style('opacity', 0)
                        .remove();
                    
                    const typeIndex = typeVisibility.findIndex(t => t.type === type);
                    if (typeIndex >= 0 && isMounted) {
                        typeVisibility[typeIndex].visible = !typeVisibility[typeIndex].visible;
                        typeVisibility = [...typeVisibility]; // Trigger reactivity
                        
                        // Update country facets to reflect the new type visibility
                        generateCountryFacets();
                        
                        updateVisualization();
                    }
                })
                .attr('tabindex', '0')
                .on('keydown', (event) => {
                    if (!isMounted) return;
                    
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const typeIndex = typeVisibility.findIndex(t => t.type === type);
                        if (typeIndex >= 0 && isMounted) {
                            typeVisibility[typeIndex].visible = !typeVisibility[typeIndex].visible;
                            typeVisibility = [...typeVisibility]; // Trigger reactivity
                            
                            // Update country facets to reflect the new type visibility
                            generateCountryFacets();
                            
                            updateVisualization();
                        }
                    }
                });
                
                // Add hover effects
                legendItem.on('mouseenter', function() {
                    if (!isMounted) return;
                    d3.select(this).select('text').style('font-weight', 'bold');
                    d3.select(this).select('.legend-hitbox').attr('fill', 'rgba(0,0,0,0.05)');
                }).on('mouseleave', function() {
                    if (!isMounted) return;
                    d3.select(this).select('text').style('font-weight', 'normal');
                    d3.select(this).select('.legend-hitbox').attr('fill', 'transparent');
                });
            });
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

    onMount(() => {
        isMounted = true;
        trackMount(COMPONENT_ID);
        logDebug(COMPONENT_ID, 'Component mounted');
        
        let mounted = true; // Local variable to track mounting status within async operations
        
        tick().then(() => {
            if (!mounted || !isMounted || !container) {
                console.error('Container element not found in onMount or component unmounted');
                return;
            }
            
            // Create tooltip
            createTooltip();
            
            // Subscribe to the items store - using the local mounted variable
            unsubscribeItems = itemsStore.subscribe(store => {
                if (mounted && isMounted) {
                    handleItemsChange(store.items);
                }
            });
            
            // Subscribe to the language store - using the local mounted variable
            unsubscribeLanguage = languageStore.subscribe(value => {
                if (!mounted || !isMounted) return;
                
                currentLang = value;
                if (mounted && isMounted && container && document.body.contains(container)) {
                    // Update country facets to get translated labels
                    generateCountryFacets();
                    
                    // Update title with new language
                    updateTitleHtml();
                    
                    // Update visualization
                    updateVisualization();
                }
            });
            
            // Generate facets and create visualization if data is available
            if (mounted && isMounted && $itemsStore.items && $itemsStore.items.length > 0) {
                generateCountryFacets();
                generateYearRange();
                updateVisualization();
            } else if (mounted && isMounted) {
                // Load items if not already loaded
                itemsStore.loadItems();
            }
            
            // Add resize observer
            resizeObserver = new ResizeObserver(() => {
                if (!mounted || !isMounted) return;
                
                if (mounted && isMounted && container && document.body.contains(container)) {
                    updateVisualization();
                }
            });
            
            if (resizeObserver && container) {
                resizeObserver.observe(container);
            }
        });
        
        // Return cleanup function
        return () => {
            // Mark as unmounted immediately to prevent any new operations
            mounted = false;
            isMounted = false;
            
            trackUnmount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component cleanup started');
            
            // Clean up resize observer
            if (resizeObserver) {
                try {
                    resizeObserver.disconnect();
                    logDebug(COMPONENT_ID, 'Resize observer disconnected');
                } catch (e) {
                    console.error('Error disconnecting resize observer:', e);
                }
                resizeObserver = null;
            }
            
            // Clean up tooltip
            try {
                if (tooltip && document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                    logDebug(COMPONENT_ID, 'Tooltip removed');
                }
                tooltip = null;
            } catch (e) {
                console.error('Error removing tooltip:', e);
            }
            
            // Clean up store subscriptions
            if (unsubscribeItems) {
                unsubscribeItems();
                unsubscribeItems = null as unknown as () => void;
                logDebug(COMPONENT_ID, 'Unsubscribed from items store');
            }
            
            // Clean up language subscription
            if (unsubscribeLanguage) {
                unsubscribeLanguage();
                unsubscribeLanguage = null as unknown as () => void;
                logDebug(COMPONENT_ID, 'Unsubscribed from language store');
            }
            
            logDebug(COMPONENT_ID, 'Component cleanup completed');
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
        
        // Clean up resize observer
        if (resizeObserver) {
            try {
                resizeObserver.disconnect();
            } catch (e) {
                console.error('Error disconnecting resize observer:', e);
            }
            resizeObserver = null;
        }
        
        // Clean up tooltip
        try {
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
            tooltip = null;
        } catch (e) {
            console.error('Error removing tooltip:', e);
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
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
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
    
    /* Override the visualization header margin to reduce space */
    :global(.type-distribution-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    /* Override the title container padding to reduce space */
    :global(.type-distribution-container .title-container) {
        padding-bottom: 0 !important;
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
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        padding: var(--spacing-sm);
    }
    
    /* Make the chart container take up remaining space */
    .chart-container {
        flex: 1;
        min-height: 550px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    /* Style for the legend - make it more compact */
    :global(.legend-items) {
        display: flex;
        flex-wrap: wrap;
    }
    
    /* Make legend items more compact */
    :global(.legend-item) {
        font-size: var(--font-size-xs);
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-xs);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
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
        border-radius: var(--border-radius-sm);
        transition: background-color var(--transition-fast);
        font-size: var(--font-size-sm);
    }
    
    .facet-option:hover {
        background-color: var(--hover-color);
    }
    
    .facet-option.selected {
        font-weight: bold;
        color: var(--primary-color);
    }
    
    .facet-checkbox {
        width: 14px;
        height: 14px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        margin-right: var(--spacing-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        flex-shrink: 0;
    }
    
    .facet-option.selected .facet-checkbox {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }
    
    .facet-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .facet-count {
        color: var(--text-color-secondary);
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
        color: var(--text-color-secondary);
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
        background: var(--divider-color);
        outline: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        border: none;
    }
    
    input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        border: none;
    }
    
    .loading, .error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-color-secondary);
    }
    
    .error {
        color: var(--error-color);
    }
    
    :global(.legend-item:hover) {
        filter: brightness(1.1);
    }
    
    :global(.legend-item text) {
        pointer-events: none;
    }
    
    :global(.legend-item rect) {
        pointer-events: none;
    }
    
    :global(.legend-item line) {
        pointer-events: none;
    }
</style> 