<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import BaseVisualization from './BaseVisualization.svelte';

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
    let tooltip: HTMLDivElement;
    let legend: HTMLDivElement;

    // Color scale for pie segments
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create reactive translations
    const allCountriesText = translate('viz.all_countries');
    const allTypesText = translate('viz.all_types');
    const filterByCountryText = translate('viz.filter_by_country');
    const filterByTypeText = translate('viz.filter_by_type');
    const noDataText = translate('viz.no_data');
    const showingItemsText = translate('viz.showing_items');
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
        return t('viz.language_distribution_items', [formattedCount]);
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
    
    // Subscribe to language changes
    languageStore.subscribe(value => {
        console.log("Language changed to:", value);
        currentLang = value;
        
        // Force refresh the title when language changes
        updateTitleHtml();
        
        // Refresh facet options to update translated country names
        generateFacetOptions();
        
        // Refresh the legend if it exists
        if (legend && languageCounts.length > 0) {
            updateLegend(languageCounts);
        }
        
        // Refresh the chart to update all translated elements
        if (container) {
            createPieChart();
        }
    });

    // Process data based on current filters
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Filter items based on selected facets
        let filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
            // Only include items with a language
            if (!item.language) return false;
            
            // Apply country filter if not 'all'
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            
            // Apply type filter if not 'all'
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            
            return true;
        });
        
        totalItems = filteredItems.length;
        
        // Update the title after the total items count has been updated
        updateTitleHtml();
        
        console.log(`Processed ${totalItems} items with language data`);
        
        // Count by language
        const languageCounts = d3.rollup(
            filteredItems,
            v => v.length,
            d => d.language || "Unknown"
        );
        
        // Convert map to array and calculate percentages
        const results: LanguageCount[] = Array.from(languageCounts, ([language, count]) => ({
            language, 
            count,
            percentage: (count / totalItems) * 100
        }));
        
        // Sort by count descending
        return results.sort((a, b) => b.count - a.count);
    }
    
    // Generate facet options
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Get only items with languages
        const itemsWithLanguage = $itemsStore.items.filter(item => item.language);
        
        // Generate country options
        const countries = d3.rollup(
            itemsWithLanguage,
            v => v.length,
            d => d.country || "Unknown"
        );
        
        // Get the current translations directly from the translation store
        const currentAllCountriesText = t('viz.all_countries');
        const currentAllTypesText = t('viz.all_types');
        
        countryOptions = [
            { value: 'all', label: currentAllCountriesText, count: itemsWithLanguage.length },
            ...Array.from(countries, ([country, count]) => {
                // Skip "Unknown" country
                if (country === "Unknown") return null;
                
                // Translate country name if available
                const translatedCountry = t(`country.${country}`) || country;
                return {
                    value: country,
                    label: translatedCountry,
                    count
                };
            })
            .filter(item => item !== null) // Remove null items (Unknown)
            .sort((a, b) => b.count - a.count)
        ];
        
        // Generate type options
        const types = d3.rollup(
            itemsWithLanguage,
            v => v.length,
            d => d.type || "Unknown"
        );
        
        typeOptions = [
            { value: 'all', label: currentAllTypesText, count: itemsWithLanguage.length },
            ...Array.from(types, ([type, count]) => ({
                value: type,
                label: type,
                count
            })).sort((a, b) => b.count - a.count)
        ];
    }

    // Create tooltip element
    function createTooltip() {
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
    }
    
    // Show tooltip with language information
    function showTooltip(event: MouseEvent, d: d3.PieArcDatum<LanguageCount>) {
        if (!tooltip) return;
        
        const data = d.data;
        const languageName = t(`lang.${data.language}`) || data.language;
        
        tooltip.innerHTML = `
            <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                ${languageName}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                <span>${t('viz.items')}:</span><span style="text-align:right;font-weight:bold;">${formatNumber(data.count)}</span>
                <span>${t('viz.percent_of_total')}:</span><span style="text-align:right;font-weight:bold;">${data.percentage.toFixed(2)}%</span>
            </div>
        `;
        
        const tooltipWidth = 200;
        const tooltipHeight = 100;
        
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
    }
    
    // Hide tooltip
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
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
    function createPieChart() {
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
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        
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
                showTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                showTooltip(event, d);
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
        createPieChart();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        createPieChart();
    }
    
    // Update visualization when data changes or filters change
    $: if ($itemsStore.items && container) {
        generateFacetOptions();
        createPieChart();
    }
    
    // Make sure facet options update when language changes
    $: if ($languageStore) {
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            generateFacetOptions();
        }
    }

    onMount(async () => {
        // Wait for component to mount
        await tick();
        
        if (!container) {
            console.error('Container element not found');
            return;
        }
        
        // Create tooltip
        createTooltip();
        
        // Generate facet options and create visualization
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            generateFacetOptions();
            createPieChart();
        } else {
            // Load items if not already loaded
            itemsStore.loadItems();
        }
        
        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (container) {
                createPieChart();
            }
        });
        
        resizeObserver.observe(container);
        
        return () => {
            resizeObserver.disconnect();
            
            // Clean up tooltip
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
            
            // Clean up legend
            if (legend && legend.parentNode) {
                legend.parentNode.removeChild(legend);
            }
        };
    });
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
                    <span>{t('viz.showing_items', [formatNumber(totalItems), languageCounts.length.toString()])}</span>
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