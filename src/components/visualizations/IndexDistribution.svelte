<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';

    // Define interfaces for data structures
    interface CategoryCount {
        category: string;
        count: number;
        percentage: number;
    }

    // States
    let categoryCounts: CategoryCount[] = [];
    let totalItems: number = 0;
    let maxCount: number = 0;
    
    // Visualization variables
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';

    // Define translation keys
    const indexDescriptionKey = 'viz.index_distribution_description';

    // Color scale for bars
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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
        return t('viz.index_distribution_items', [formattedCount]);
    }
    
    // Update title HTML when needed
    function updateTitleHtml() {
        if (totalItems > 0) {
            titleHtml = getTitle(totalItems);
        } else {
            titleHtml = t('viz.index_distribution_title');
        }
    }

    // Call this function initially and whenever totalItems or language changes
    $: {
        updateTitleHtml();
    }
    
    // Subscribe to language changes
    languageStore.subscribe(value => {
        currentLang = value;
        
        // Force refresh the title when language changes
        updateTitleHtml();
        
        // Refresh visualization if data is available
        if ($itemsStore.items && $itemsStore.items.length > 0 && container) {
            createBarChart();
        }
    });

    // Process data to get index items by category
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Filter items with type "Notice d'autorité"
        const indexItems = $itemsStore.items.filter((item: OmekaItem) => 
            item.type === "Notice d'autorité"
        );
        
        totalItems = indexItems.length;
        
        if (totalItems === 0) return [];
        
        // Group by item_set_title
        const categoryGroups = d3.rollup(
            indexItems,
            v => v.length,
            d => d.item_set_title || t('viz.uncategorized')
        );
        
        // Convert map to array and calculate percentages
        const results: CategoryCount[] = Array.from(categoryGroups, ([category, count]) => ({
            category, 
            count,
            percentage: (count / totalItems) * 100
        }));
        
        // Sort by count descending
        const sortedResults = results.sort((a, b) => b.count - a.count);
        
        // Find max count for scaling
        maxCount = d3.max(sortedResults, d => d.count) || 0;
        
        // Update title HTML
        updateTitleHtml();
        
        return sortedResults;
    }

    // Create tooltip element
    function createTooltip() {
        try {
            // Remove any existing tooltip to prevent duplicates
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
        }
    }
    
    // Show tooltip with category information
    function showTooltip(event: MouseEvent, d: CategoryCount) {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                createTooltip(); // Recreate tooltip if it doesn't exist
            }
            
            if (!tooltip) return;
            
            tooltip.innerHTML = `
                <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                    ${d.category}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                    <span>${t('viz.items')}:</span><span style="text-align:right;font-weight:bold;">${d.count}</span>
                    <span>${t('viz.percent_of_total')}:</span><span style="text-align:right;font-weight:bold;">${d.percentage.toFixed(2)}%</span>
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

    // Create bar chart visualization
    function createBarChart() {
        try {
            if (!container) return;
            
            // Process data with current filters
            const data = processData();
            if (!data || data.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).append('div')
                    .attr('class', 'no-data')
                    .style('position', 'absolute')
                    .style('top', '50%')
                    .style('left', '50%')
                    .style('transform', 'translate(-50%, -50%)')
                    .style('text-align', 'center')
                    .style('color', 'var(--text-color-secondary)')
                    .text(t('viz.no_data'));
                return;
            }
            
            // Update categoryCounts for reactive updates
            categoryCounts = data;
            
            // Remove previous content
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
            
            // Get container dimensions
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = rect.height - 40; // Leave space for title
            
            // Set margins
            const margin = { top: 20, right: 30, bottom: 120, left: 60 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            // Create SVG container
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`);
            
            // Create chart group
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            // Create scales
            const xScale = d3.scaleBand()
                .domain(data.map(d => d.category))
                .range([0, chartWidth])
                .padding(0.2);
            
            const yScale = d3.scaleLinear()
                .domain([0, maxCount * 1.1]) // Add 10% padding at top
                .range([chartHeight, 0]);
            
            // Create and append x-axis
            const xAxis = d3.axisBottom(xScale);
            chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0, ${chartHeight})`)
                .call(xAxis)
                .selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Create and append y-axis
            const yAxis = d3.axisLeft(yScale).ticks(5);
            chart.append('g')
                .attr('class', 'y-axis')
                .call(yAxis)
                .selectAll('text')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Add axis labels
            chart.append('text')
                .attr('class', 'x-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + margin.bottom - 10)
                .style('font-size', 'var(--font-size-sm)')
                .style('fill', 'var(--text-color-secondary)')
                .text(t('viz.categories'));
            
            chart.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', `rotate(-90)`)
                .attr('x', -chartHeight / 2)
                .attr('y', -margin.left + 15)
                .style('font-size', 'var(--font-size-sm)')
                .style('fill', 'var(--text-color-secondary)')
                .text(t('viz.number_of_items'));
            
            // Create and append bars
            chart.selectAll('.bar')
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(d.category) || 0)
                .attr('y', d => yScale(d.count))
                .attr('width', xScale.bandwidth())
                .attr('height', d => chartHeight - yScale(d.count))
                .attr('fill', (d, i) => colorScale(d.category))
                .attr('rx', 3) // Rounded corners
                .attr('ry', 3)
                .style('stroke', 'white')
                .style('stroke-width', 1)
                .on('mouseenter', function(event, d) {
                    // Highlight bar on hover
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', d3.rgb(colorScale(d.category)).brighter(0.5).toString());
                    showTooltip(event, d);
                })
                .on('mousemove', function(event, d) {
                    showTooltip(event, d);
                })
                .on('mouseleave', function(event, d) {
                    // Restore original color
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', colorScale(d.category));
                    hideTooltip();
                });
            
            // Add value labels on top of bars
            chart.selectAll('.bar-label')
                .data(data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => (xScale(d.category) || 0) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d.count) - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-secondary)')
                .text(d => d.count);
        } catch (e) {
            console.error('Error creating bar chart:', e);
        }
    }
    
    // Update visualization when data changes
    $: if ($itemsStore.items && container) {
        createBarChart();
    }

    onMount(() => {
        let resizeObserver: ResizeObserver | undefined;
        
        // Initialize component
        const initialize = async () => {
            try {
                // Wait for component to mount
                await tick();
                
                if (!container) {
                    console.error('Container element not found');
                    return;
                }
                
                // Create tooltip
                createTooltip();
                
                // Create visualization
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    createBarChart();
                } else {
                    // Load items if not already loaded
                    itemsStore.loadItems();
                }
                
                // Add resize observer
                resizeObserver = new ResizeObserver(() => {
                    if (container) {
                        createBarChart();
                    }
                });
                
                resizeObserver.observe(container);
            } catch (e) {
                console.error('Error in initialization:', e);
            }
        };
        
        // Start initialization
        initialize();
        
        // Return cleanup function
        return () => {
            try {
                // Safely disconnect observer
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
                
                // Clean up any D3 selections to prevent memory leaks
                if (container) {
                    // Remove any SVG, divs or other elements D3 might have created
                    d3.select(container).selectAll('*').remove();
                }
                
                // Clean up tooltip
                if (tooltip && document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };
    });
</script>

<div class="index-visualization-container">
    <BaseVisualization
        title=""
        translationKey=""
        description="This visualization shows the distribution of index items by category. The size of each bar represents the number of items in that category."
        descriptionTranslationKey={indexDescriptionKey}
        titleHtml={titleHtml}
    >
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="stats">
            {#if categoryCounts.length > 0}
                <div class="stat-summary">
                    <h3>{t('viz.summary')}</h3>
                    <p>{t('viz.total_items')}: <strong>{formatNumber(totalItems)}</strong></p>
                    <p>{t('viz.number_of_categories')}: <strong>{formatNumber(categoryCounts.length)}</strong></p>
                </div>
                <div class="top-categories">
                    <h3>{t('viz.top_categories')}</h3>
                    <ul>
                        {#each categoryCounts.slice(0, 5) as category}
                            <li>
                                <span class="category-name">{category.category}</span>
                                <span class="category-count">{formatNumber(category.count)} {t('viz.items')} ({category.percentage.toFixed(1)}%)</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    .index-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    /* Override the visualization header margin to reduce space */
    :global(.index-visualization-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    /* Override the title container padding to reduce space */
    :global(.index-visualization-container .title-container) {
        padding-bottom: 0 !important;
    }
    
    .chart-container {
        flex: 1;
        min-height: 500px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        margin-bottom: var(--spacing-md);
    }
    
    .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stat-summary, .top-categories {
        padding: var(--spacing-md);
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-sm);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-xs);
    }
    
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    li {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
    }
    
    .category-name {
        color: var(--text-color-primary);
    }
    
    .category-count {
        color: var(--text-color-secondary);
        font-weight: bold;
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
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .stats {
            grid-template-columns: 1fr;
        }
    }
</style> 