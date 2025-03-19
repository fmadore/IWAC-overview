<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';

    // Define interfaces for data structures
    interface LanguageCount {
        language: string;
        count: number;
        percentage: number;
    }

    interface FacetOption {
        value: string;
        label: string;
        count: number;
    }

    // Filter states
    let selectedCountry: string = 'all';
    let selectedType: string = 'all';
    
    // Data states
    let languageCounts: LanguageCount[] = [];
    let countryOptions: FacetOption[] = [];
    let typeOptions: FacetOption[] = [];
    let totalItems: number = 0;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    
    // Visualization variables
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let legend: HTMLDivElement;

    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip();
    
    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;
    
    // Initialize data processing hook with custom filter function
    const { filterItems, groupAndCount } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['language'],
        filterFn: (item: OmekaItem) => {
            // Apply country filter if not 'all'
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            
            // Apply type filter if not 'all'
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            
            return true;
        },
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
    });
    
    // Store unsubscribe functions
    let languageUnsubscribe: () => void;
    
    // Track if component is mounted
    let isMounted = false;

    // Color scale for pie segments
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create reactive translations
    const allCountriesText = translate('viz.all_countries');
    const allTypesText = translate('viz.all_types');
    const filterByCountryText = translate('viz.filter_by_country');
    const filterByTypeText = translate('viz.filter_by_type');
    const noDataText = translate('viz.no_data');
    const showingItemsText = translate('viz.showing_items', {
        '0': formatNumber(totalItems),
        '1': formatNumber(languageCounts.length)
    });
    const countText = translate('viz.items');
    const percentageText = translate('viz.percent_of_total');

    // Function to format numbers with spaces as thousands separator
    function formatNumber(num: number): string {
        // Use locale-specific formatting - in French/many European countries spaces are used
        return num.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
    }
    
    // Function to get the title with current count and proper formatting
    function getTitle(count: number): string {
        // Format the number with spaces as thousands separator
        const formattedCount = formatNumber(count);
        // Use the current language's translation with the formatted count
        return t('viz.language_distribution_items', { '0': formattedCount });
    }
    
    // Function to update the title HTML based on current data
    function updateTitleHtml() {
        if (totalItems > 0) {
            titleHtml = getTitle(totalItems);
        } else {
            titleHtml = t('viz.language_distribution_title');
        }
    }

    // Call this function whenever totalItems or language changes
    $: {
        updateTitleHtml();
    }
    
    // Initialize visualization when data changes
    $: if (isMounted && $itemsStore.items && container) {
        updateVisualization();
    }

    let initializationPromise: Promise<void>;

    onMount(() => {
        // Set mounted flag first
        isMounted = true;

        // Create initialization promise
        initializationPromise = (async () => {
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
                languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    currentLang = value;
                    
                    if (container) {
                        updateTitleHtml();
                        
                        if ($itemsStore.items && $itemsStore.items.length > 0) {
                            updateVisualization();
                        }
                    }
                });
                
                // Initialize data
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    // Get initial dimensions
                    const { width: initialWidth, height: initialHeight } = resizeHook.dimensions;
                    width = initialWidth;
                    height = initialHeight;
                    
                    // Wait for next tick before updating visualization
                    await tick();
                    if (container) {
                        updateVisualization();
                    }
                } else {
                    itemsStore.loadItems();
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            try {
                isMounted = false;
                
                if (resizeHook) {
                    resizeHook.cleanup();
                }
                
                if (languageUnsubscribe) {
                    languageUnsubscribe();
                }
                
                if (container) {
                    d3.select(container).selectAll('*').remove();
                }
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };
    });

    // Add onDestroy to ensure cleanup
    onDestroy(() => {
        try {
            isMounted = false;
            
            if (resizeHook) {
                resizeHook.cleanup();
            }
            
            if (languageUnsubscribe) {
                languageUnsubscribe();
            }
            
            if (container) {
                d3.select(container).selectAll('*').remove();
            }
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    });

    // Process data based on current filters
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Use the data processing hook to filter and group items
        const results = groupAndCount(
            $itemsStore.items,
            item => item.language || "Unknown"
        );
        
        // Transform results to match our LanguageCount interface
        const processedCounts: LanguageCount[] = results.map(result => ({
            language: result.key,
            count: result.count,
            percentage: result.percentage || 0
        }));
        
        // Update total items
        totalItems = processedCounts.reduce((sum, item) => sum + item.count, 0);
        
        // Update the title after the total items count has been updated
        updateTitleHtml();
        
        return processedCounts;
    }
    
    // Generate facet options
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Use the data processing hook to filter items with languages
        const itemsWithLanguage = filterItems($itemsStore.items);
        
        // Generate country options using the hook
        const countryResults = groupAndCount(
            itemsWithLanguage,
            item => item.country || "Unknown"
        );
        
        // Get the current translations directly from the translation store
        const currentAllCountriesText = t('viz.all_countries');
        const currentAllTypesText = t('viz.all_types');
        
        countryOptions = [
            { value: 'all', label: currentAllCountriesText, count: itemsWithLanguage.length },
            ...countryResults
                .filter(result => result.key !== "Unknown")
                .map(result => {
                    // Translate country name if available
                    const translatedCountry = t(`country.${result.key}`) || result.key;
                    return {
                        value: result.key,
                        label: translatedCountry,
                        count: result.count
                    };
                })
                .sort((a, b) => b.count - a.count)
        ];
        
        // Generate type options using the hook
        const typeResults = groupAndCount(
            itemsWithLanguage,
            item => item.type || "Unknown"
        );
        
        typeOptions = [
            { value: 'all', label: currentAllTypesText, count: itemsWithLanguage.length },
            ...typeResults
                .map(result => ({
                    value: result.key,
                    label: result.key,
                    count: result.count
                }))
                .sort((a, b) => b.count - a.count)
        ];
    }

    // Show tooltip with language information
    function handleShowTooltip(event: MouseEvent, d: d3.PieArcDatum<LanguageCount>) {
        const data = d.data;
        const languageName = t(`lang.${data.language}`) || data.language;
        
        const content = createGridTooltipContent(
            languageName,
            [
                { label: t('viz.items'), value: formatNumber(data.count) },
                { label: t('viz.percent_of_total'), value: `${data.percentage.toFixed(2)}%` }
            ]
        );
        
        showTooltip(event, content);
    }

    // Create legend element
    function createLegend() {
        if (legend) {
            legend.innerHTML = '';
        } else {
            legend = document.createElement('div');
            
            // Position legend differently on mobile vs desktop
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
                legend.className = 'legend-mobile';
            } else {
                legend.className = 'legend-desktop';
            }
            
            container.appendChild(legend);
        }
    }
    
    // Update legend with current data
    function updateLegend(data: LanguageCount[]) {
        if (!legend) return;
        
        const isMobile = window.innerWidth < 768;
        
        // Make the legend more compact on mobile
        if (isMobile) {
            // On mobile, show fewer items and make the legend more compact
            const topLanguages = data.slice(0, 6); // Only show top 6 languages on mobile
            const totalOthers = data.slice(6).reduce((sum, d) => sum + d.count, 0);
            const othersPercentage = data.slice(6).reduce((sum, d) => sum + d.percentage, 0);
            
            legend.innerHTML = `
                <div class="legend-heading-mobile">${t('viz.languages')} (${data.length})</div>
                <div class="legend-grid-mobile">
                    ${topLanguages.map((d, i) => {
                        const languageName = t(`lang.${d.language}`) || d.language;
                        return `
                            <div class="legend-color-mobile" data-color="${colorScale(d.language)}"></div>
                            <div class="legend-label-mobile">${languageName}</div>
                            <div class="legend-value-mobile">${formatNumber(d.count)}</div>
                        `;
                    }).join('')}
                    ${data.length > 6 ? `
                        <div class="legend-color-mobile" data-color="#999"></div>
                        <div class="legend-label-mobile">${t('viz.others')}</div>
                        <div class="legend-value-mobile">${formatNumber(totalOthers)}</div>
                    ` : ''}
                </div>
            `;
            
            // Apply background colors using dataset
            legend.querySelectorAll('.legend-color-mobile').forEach(el => {
                (el as HTMLElement).style.backgroundColor = (el as HTMLElement).dataset.color || '';
            });
        } else {
            // Desktop view with full legend
            legend.innerHTML = `
                <div class="legend-heading">${t('viz.languages')} (${data.length})</div>
                <div class="legend-grid">
                    ${data.map((d, i) => {
                        const languageName = t(`lang.${d.language}`) || d.language;
                        return `
                            <div class="legend-color" data-color="${colorScale(d.language)}"></div>
                            <div class="legend-label">${languageName}</div>
                            <div class="legend-value">${formatNumber(d.count)}</div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Apply background colors using dataset
            legend.querySelectorAll('.legend-color').forEach(el => {
                (el as HTMLElement).style.backgroundColor = (el as HTMLElement).dataset.color || '';
            });
        }
    }

    // Create pie chart visualization
    function updateVisualization() {
        if (!container) return;
        
        // Process data
        const data = processData();
        languageCounts = data || [];
        
        if (!data || data.length === 0) {
            d3.select(container).select('svg').remove();
            return;
        }
        
        // Clear previous chart
        d3.select(container).select('svg').remove();
        
        // Get current container dimensions
        const containerRect = container.getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
        
        // Set margins - reduce margins on mobile
        const isMobile = width < 768;
        const margin = isMobile 
            ? { top: 10, right: 10, bottom: 10, left: 10 }
            : { top: 20, right: 20, bottom: 20, left: 20 };
            
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Calculate radius - ensure it's not too large for container
        const maxRadius = Math.min(chartWidth, chartHeight) / 2;
        // For mobile, use a slightly smaller radius to ensure it fits
        const radius = isMobile ? maxRadius * 0.9 : maxRadius;
        
        // Create SVG with responsive viewBox
        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        // Create pie layout
        const pie = d3.pie<LanguageCount>()
            .value(d => d.count)
            .sort(null);
        
        // Create arc generator
        const arc = d3.arc<d3.PieArcDatum<LanguageCount>>()
            .innerRadius(0)
            .outerRadius(radius);
        
        // Create arc generator for hover effect
        const arcHover = d3.arc<d3.PieArcDatum<LanguageCount>>()
            .innerRadius(0)
            .outerRadius(radius + (isMobile ? 5 : 10)); // Smaller hover effect on mobile
        
        // Create pie segments
        const segments = svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('class', 'cursor-pointer')
            .attr('d', arc)
            .attr('fill', d => colorScale(d.data.language))
            .attr('stroke', 'white')
            .attr('stroke-width', isMobile ? 1 : 2) // Thinner stroke on mobile
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', (d: any) => arcHover(d as d3.PieArcDatum<LanguageCount>)!);
                handleShowTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                handleShowTooltip(event, d);
            })
            .on('mouseleave', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', (d: any) => arc(d as d3.PieArcDatum<LanguageCount>)!);
                hideTooltip();
            });
        
        // Update the legend with current data - adjust position on mobile
        createLegend();
        updateLegend(data);
    }
    
    // Handle country filter change
    function handleCountryChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedCountry = select.value;
        updateVisualization();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        updateVisualization();
    }
    
    // Make sure facet options update when language changes
    $: if ($languageStore) {
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            generateFacetOptions();
        }
    }
</script>

<div class="w-full h-full flex flex-col language-visualization-container">
    <BaseVisualization
        titleHtml={titleHtml}
        descriptionTranslationKey="viz.language_distribution_description"
        theme="default"
        className="language-visualization"
    >
        <div class="flex flex-wrap gap-md p-md bg-card rounded-t border-b border-solid border-default filters">
            <div class="flex flex-col gap-xs filter-group">
                <label for="country-filter" class="text-xs font-bold text-secondary">{$filterByCountryText}:</label>
                <select id="country-filter" on:change={handleCountryChange} bind:value={selectedCountry} 
                        class="p-xs px-sm rounded-sm border border-solid border-default bg-card text-primary">
                    {#each countryOptions as option (option.value)}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="flex flex-col gap-xs filter-group">
                <label for="type-filter" class="text-xs font-bold text-secondary">{$filterByTypeText}:</label>
                <select id="type-filter" on:change={handleTypeChange} bind:value={selectedType}
                        class="p-xs px-sm rounded-sm border border-solid border-default bg-card text-primary">
                    {#each typeOptions as option (option.value)}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="ml-auto flex items-end text-sm text-secondary summary">
                {#if languageCounts.length > 0}
                    <span>{t('viz.showing_items', { '0': formatNumber(totalItems), '1': languageCounts.length.toString() })}</span>
                {/if}
            </div>
        </div>
        
        <div class="flex-1 relative min-h-500 bg-card rounded-b shadow overflow-hidden p-md pie-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="p-md bg-card rounded shadow mt-md stats">
            <div class="stat-summary">
                <h3 class="mt-0 mb-sm text-primary text-md border-b pb-xs">{t('viz.summary')}</h3>
                <p class="my-xs text-sm text-secondary">{t('viz.total_items')}: <strong class="font-medium">{formatNumber(totalItems)}</strong></p>
                <p class="my-xs text-sm text-secondary">{t('viz.languages')}: <strong class="font-medium">{formatNumber(languageCounts.length)}</strong></p>
            </div>
        </div>
    </BaseVisualization>
</div>

<style>
    /* Only keep styles that can't be achieved with utility classes */
    .filter-group {
        min-width: 200px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .filters {
            flex-direction: column;
        }
        
        .summary {
            margin-left: 0;
            margin-top: var(--spacing-sm);
            align-self: flex-start;
        }
    }
</style> 