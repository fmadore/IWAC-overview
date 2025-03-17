<script lang="ts">
    import { onMount, tick } from 'svelte';
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
        console.log("Language Distribution Title updated:", titleHtml);
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
                    console.log("Language changed to:", value);
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
        
        console.log(`Processed ${totalItems} items with language data`);
        
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
            legend.style.position = 'absolute';
            legend.style.right = '20px';
            legend.style.top = '20px';
            legend.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            legend.style.padding = '10px';
            legend.style.borderRadius = '4px';
            legend.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            legend.style.maxHeight = '300px';
            legend.style.overflowY = 'auto';
            legend.style.color = 'var(--text-color-primary)';
            legend.style.fontFamily = 'var(--font-family-primary)';
            legend.style.fontSize = 'var(--font-size-sm)';
            container.appendChild(legend);
        }
    }
    
    // Update legend with current data
    function updateLegend(data: LanguageCount[]) {
        if (!legend) return;
        
        legend.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;font-size:14px;color:var(--text-color-primary);">${t('viz.languages')} (${data.length})</div>
            <div style="display:grid;grid-template-columns:20px auto 40px;gap:4px;font-size:12px;">
                ${data.map((d, i) => {
                    const languageName = t(`lang.${d.language}`) || d.language;
                    return `
                        <div style="width:12px;height:12px;background-color:${colorScale(d.language)};border-radius:2px;margin-top:2px;"></div>
                        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-color-primary);">${languageName}</div>
                        <div style="text-align:right;color:var(--text-color-secondary);">${formatNumber(d.count)}</div>
                    `;
                }).join('')}
            </div>
        `;
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
        
        // Set margins
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Calculate radius
        const radius = Math.min(chartWidth, chartHeight) / 2;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
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
            .outerRadius(radius + 10);
        
        // Create pie segments
        const segments = svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => colorScale(d.data.language))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
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
        
        // Update the legend with current data
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

<div class="language-visualization-container">
    <BaseVisualization
        title=""
        translationKey=""
        description=""
        descriptionTranslationKey="viz.language_distribution_description"
        titleHtml={titleHtml}
    >
        <div class="filters">
            <div class="filter-group">
                <label for="country-filter">{$filterByCountryText}:</label>
                <select id="country-filter" on:change={handleCountryChange} bind:value={selectedCountry}>
                    {#each countryOptions as option (option.value)}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="type-filter">{$filterByTypeText}:</label>
                <select id="type-filter" on:change={handleTypeChange} bind:value={selectedType}>
                    {#each typeOptions as option (option.value)}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="summary">
                {#if languageCounts.length > 0}
                    <span>{t('viz.showing_items', { '0': formatNumber(totalItems), '1': languageCounts.length.toString() })}</span>
                {/if}
            </div>
        </div>
        
        <div class="pie-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="stats">
            <div class="stat-summary">
                <h3>{t('viz.summary')}</h3>
                <p>{t('viz.total_items')}: <strong>{totalItems}</strong></p>
                <p>{t('viz.languages')}: <strong>{languageCounts.length}</strong></p>
            </div>
        </div>
    </BaseVisualization>
</div>

<style>
    .language-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .filters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background-color: var(--background-color);
        border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .filter-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }
    
    label {
        font-size: var(--font-size-xs);
        font-weight: bold;
        color: var(--text-color-secondary);
    }
    
    select {
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--border-radius-sm);
        border: 1px solid var(--border-color);
        background-color: var(--card-background);
        color: var(--text-color-primary);
        min-width: 200px;
        font-family: var(--font-family-primary);
        font-size: var(--font-size-sm);
    }
    
    .summary {
        margin-left: auto;
        display: flex;
        align-items: flex-end;
        font-size: var(--font-size-sm);
        color: var(--text-color-secondary);
    }
    
    .pie-container {
        flex: 1;
        min-height: 500px;
        position: relative;
        background: var(--card-background);
        border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stats {
        padding: var(--spacing-md);
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stat-summary p {
        margin: var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        color: var(--text-color-secondary);
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-sm);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-xs);
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
</style> 