<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';

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

    // Color scale for bars
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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
            d => d.item_set_title || "Uncategorized"
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
                    <span>Count:</span><span style="text-align:right;font-weight:bold;">${d.count}</span>
                    <span>Percentage:</span><span style="text-align:right;font-weight:bold;">${d.percentage.toFixed(2)}%</span>
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
                    .text('No index items available');
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
            const margin = { top: 60, right: 30, bottom: 120, left: 60 };
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
                .text('Categories');
            
            chart.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', `rotate(-90)`)
                .attr('x', -chartHeight / 2)
                .attr('y', -margin.left + 15)
                .style('font-size', 'var(--font-size-sm)')
                .style('fill', 'var(--text-color-secondary)')
                .text('Number of Items');
            
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
            
            // Add title
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', 30)
                .attr('font-size', 'var(--font-size-lg)')
                .attr('font-weight', 'bold')
                .attr('fill', 'var(--text-color-primary)')
                .text(`Index Distribution by Category (${totalItems} items)`);
        } catch (e) {
            console.error('Error creating bar chart:', e);
        }
    }
    
    // Update visualization when data changes
    $: if ($itemsStore.items && container) {
        createBarChart();
    }

    onMount(async () => {
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
            const resizeObserver = new ResizeObserver(() => {
                if (container) {
                    createBarChart();
                }
            });
            
            resizeObserver.observe(container);
            
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
        } catch (e) {
            console.error('Error in onMount:', e);
        }
    });
</script>

<div class="index-visualization-container">
    <div class="chart-container" bind:this={container}>
        {#if $itemsStore.loading}
            <div class="loading">Loading...</div>
        {:else if $itemsStore.error}
            <div class="error">{$itemsStore.error}</div>
        {/if}
    </div>
    
    <div class="stats">
        {#if categoryCounts.length > 0}
            <div class="stat-summary">
                <h3>Summary</h3>
                <p>Total index items: <strong>{totalItems}</strong></p>
                <p>Number of categories: <strong>{categoryCounts.length}</strong></p>
            </div>
            <div class="top-categories">
                <h3>Top Categories</h3>
                <ul>
                    {#each categoryCounts.slice(0, 5) as category}
                        <li>
                            <span class="category-name">{category.category}</span>
                            <span class="category-count">{category.count} items ({category.percentage.toFixed(1)}%)</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
</div>

<style>
    .index-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
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