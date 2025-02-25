<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';

    // Define interfaces for data structures
    interface MonthlyData {
        date: Date;          // First day of the month
        month: string;       // Formatted month (e.g., "2024-03")
        monthFormatted: string; // Display format (e.g., "Mar 2024")
        count: number;       // Number of items added in this month
        total: number;       // Cumulative total as of this month
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
    let timelineData: MonthlyData[] = [];
    let countryOptions: FacetOption[] = [];
    let typeOptions: FacetOption[] = [];
    let totalItems: number = 0;
    let maxMonthlyCount: number = 0;
    let maxTotalCount: number = 0;
    
    // Visualization variables
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;

    // Format date strings
    const monthFormat = d3.timeFormat('%Y-%m');
    const displayFormat = d3.timeFormat('%b %Y');

    // Process data based on current filters and generate timeline data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Filter items based on selected facets
        let filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
            // Skip items without created_date
            if (!item.created_date) return false;
            
            // Apply country filter if not 'all'
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            
            // Apply type filter if not 'all'
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            
            return true;
        });
        
        totalItems = filteredItems.length;
        
        if (totalItems === 0) return [];
        
        // Extract the month from created_date and count occurrences
        const monthCounts = new Map<string, number>();
        
        filteredItems.forEach(item => {
            // Parse the date and extract the month
            const date = new Date(item.created_date);
            const month = monthFormat(date);
            
            // Increment the count for this month
            monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
        });
        
        // Convert to array and sort chronologically
        const monthsArray = Array.from(monthCounts.entries())
            .map(([month, count]) => {
                // Convert YYYY-MM to Date object (first day of month)
                const [year, monthNum] = month.split('-').map(Number);
                const date = new Date(year, monthNum - 1, 1); // JS months are 0-indexed
                
                return {
                    date,
                    month,
                    monthFormatted: displayFormat(date),
                    count,
                    total: 0 // Will calculate cumulative total next
                };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate cumulative totals
        let runningTotal = 0;
        monthsArray.forEach(month => {
            runningTotal += month.count;
            month.total = runningTotal;
        });
        
        // Calculate max values for scaling
        maxMonthlyCount = d3.max(monthsArray, d => d.count) || 0;
        maxTotalCount = d3.max(monthsArray, d => d.total) || 0;
        
        return monthsArray;
    }
    
    // Generate facet options
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Get only items with created_date
        const itemsWithDate = $itemsStore.items.filter(item => item.created_date);
        
        // Generate country options
        const countries = d3.rollup(
            itemsWithDate,
            v => v.length,
            d => d.country || "Unknown"
        );
        
        countryOptions = [
            { value: 'all', label: 'All Countries', count: itemsWithDate.length },
            ...Array.from(countries, ([country, count]) => ({
                value: country,
                label: country,
                count
            })).sort((a, b) => b.count - a.count)
        ];
        
        // Generate type options
        const types = d3.rollup(
            itemsWithDate,
            v => v.length,
            d => d.type || "Unknown"
        );
        
        typeOptions = [
            { value: 'all', label: 'All Types', count: itemsWithDate.length },
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
    
    // Show tooltip with month information
    function showTooltip(event: MouseEvent, d: MonthlyData) {
        if (!tooltip) return;
        
        const percentOfTotal = ((d.count / totalItems) * 100).toFixed(1);
        
        tooltip.innerHTML = `
            <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                ${d.monthFormatted}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                <span>Added this month:</span><span style="text-align:right;font-weight:bold;">${d.count}</span>
                <span>Total items:</span><span style="text-align:right;font-weight:bold;">${d.total}</span>
                <span>% of all additions:</span><span style="text-align:right;font-weight:bold;">${percentOfTotal}%</span>
            </div>
        `;
        
        const tooltipWidth = 220;
        const tooltipHeight = 120;
        
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

    // Create timeline visualization
    function createTimeline() {
        if (!container) return;
        
        // Process data
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
                .text('No timeline data available with the current filters');
            return;
        }
        
        // Update timelineData for reactive updates
        timelineData = data;
        
        // Remove previous content
        d3.select(container).select('svg').remove();
        d3.select(container).select('.no-data').remove();
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height - 40; // Leave space for title
        
        // Set margins
        const margin = { top: 60, right: 80, bottom: 80, left: 60 };
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
        const xScale = d3.scalePoint<string>()
            .domain(data.map(d => d.monthFormatted))
            .range([0, chartWidth])
            .padding(0.5);
            
        // Left y-axis for monthly additions
        const yScaleMonthly = d3.scaleLinear()
            .domain([0, maxMonthlyCount * 1.1]) // Add 10% padding at top
            .range([chartHeight, 0]);
            
        // Right y-axis for total items
        const yScaleTotal = d3.scaleLinear()
            .domain([0, maxTotalCount * 1.1]) // Add 10% padding at top
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
        
        // Create and append left y-axis
        const yAxisMonthly = d3.axisLeft(yScaleMonthly).ticks(5);
        chart.append('g')
            .attr('class', 'y-axis')
            .call(yAxisMonthly)
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)');
            
        // Create and append right y-axis
        const yAxisTotal = d3.axisRight(yScaleTotal).ticks(5);
        chart.append('g')
            .attr('class', 'y-axis-right')
            .attr('transform', `translate(${chartWidth}, 0)`)
            .call(yAxisTotal)
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
            .text('Month');
            
        // Left y-axis label
        chart.append('text')
            .attr('class', 'y-axis-label-left')
            .attr('text-anchor', 'middle')
            .attr('transform', `rotate(-90)`)
            .attr('x', -chartHeight / 2)
            .attr('y', -margin.left + 15)
            .style('font-size', 'var(--font-size-sm)')
            .style('fill', '#3366cc') // Match the monthly additions line color
            .text('Monthly Additions');
            
        // Right y-axis label
        chart.append('text')
            .attr('class', 'y-axis-label-right')
            .attr('text-anchor', 'middle')
            .attr('transform', `rotate(90)`)
            .attr('x', chartHeight / 2)
            .attr('y', -chartWidth - margin.right + 15)
            .style('font-size', 'var(--font-size-sm)')
            .style('fill', '#00aa00') // Match the total items line color
            .text('Total Items');
        
        // Create line generator for monthly additions
        const monthlyLine = d3.line<MonthlyData>()
            .x(d => xScale(d.monthFormatted) || 0)
            .y(d => yScaleMonthly(d.count));
        
        // Create line generator for total items
        const totalLine = d3.line<MonthlyData>()
            .x(d => xScale(d.monthFormatted) || 0)
            .y(d => yScaleTotal(d.total));
        
        // Add monthly additions line
        chart.append('path')
            .datum(data)
            .attr('class', 'monthly-line')
            .attr('fill', 'none')
            .attr('stroke', '#3366cc') // Blue color for monthly additions
            .attr('stroke-width', 2)
            .attr('d', monthlyLine);
            
        // Add total items line (dashed)
        chart.append('path')
            .datum(data)
            .attr('class', 'total-line')
            .attr('fill', 'none')
            .attr('stroke', '#00aa00') // Green color for total items
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4') // Dashed line
            .attr('d', totalLine);
        
        // Add dots for monthly additions
        chart.selectAll('.monthly-dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'monthly-dot')
            .attr('cx', d => xScale(d.monthFormatted) || 0)
            .attr('cy', d => yScaleMonthly(d.count))
            .attr('r', 4)
            .attr('fill', '#3366cc')
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                showTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                showTooltip(event, d);
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);
                hideTooltip();
            });
            
        // Add dots for total items
        chart.selectAll('.total-dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'total-dot')
            .attr('cx', d => xScale(d.monthFormatted) || 0)
            .attr('cy', d => yScaleTotal(d.total))
            .attr('r', 4)
            .attr('fill', '#00aa00')
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                showTooltip(event, d);
            })
            .on('mousemove', function(event, d) {
                showTooltip(event, d);
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);
                hideTooltip();
            });
        
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width / 2}, 30)`);
            
        // Monthly additions legend
        legend.append('line')
            .attr('x1', -80)
            .attr('y1', 0)
            .attr('x2', -60)
            .attr('y2', 0)
            .attr('stroke', '#3366cc')
            .attr('stroke-width', 2);
            
        legend.append('circle')
            .attr('cx', -70)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', '#3366cc');
            
        legend.append('text')
            .attr('x', -55)
            .attr('y', 4)
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)')
            .text('Monthly Additions');
            
        // Total items legend
        legend.append('line')
            .attr('x1', 70)
            .attr('y1', 0)
            .attr('x2', 90)
            .attr('y2', 0)
            .attr('stroke', '#00aa00')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');
            
        legend.append('circle')
            .attr('cx', 80)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', '#00aa00');
            
        legend.append('text')
            .attr('x', 95)
            .attr('y', 4)
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)')
            .text('Total Items');
        
        // Add title
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', margin.top / 2)
            .attr('font-size', 'var(--font-size-lg)')
            .attr('font-weight', 'bold')
            .attr('fill', 'var(--text-color-primary)')
            .text(`Database Growth Over Time (${totalItems} items)`);
    }
    
    // Handle country filter change
    function handleCountryChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedCountry = select.value;
        createTimeline();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        createTimeline();
    }
    
    // Update visualization when data changes or filters change
    $: if ($itemsStore.items && container) {
        generateFacetOptions();
        createTimeline();
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
            createTimeline();
        } else {
            // Load items if not already loaded
            itemsStore.loadItems();
        }
        
        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (container) {
                createTimeline();
            }
        });
        
        resizeObserver.observe(container);
        
        return () => {
            resizeObserver.disconnect();
            
            // Clean up tooltip
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
        };
    });
</script>

<div class="timeline-visualization-container">
    <div class="filters">
        <div class="filter-group">
            <label for="country-filter">Filter by Country:</label>
            <select id="country-filter" on:change={handleCountryChange} value={selectedCountry}>
                {#each countryOptions as option}
                    <option value={option.value}>{option.label} ({option.count})</option>
                {/each}
            </select>
        </div>
        
        <div class="filter-group">
            <label for="type-filter">Filter by Type:</label>
            <select id="type-filter" on:change={handleTypeChange} value={selectedType}>
                {#each typeOptions as option}
                    <option value={option.value}>{option.label} ({option.count})</option>
                {/each}
            </select>
        </div>
        
        <div class="summary">
            {#if timelineData.length > 0}
                <span>Showing {totalItems} items over {timelineData.length} months</span>
            {/if}
        </div>
    </div>
    
    <div class="chart-container" bind:this={container}>
        {#if $itemsStore.loading}
            <div class="loading">Loading...</div>
        {:else if $itemsStore.error}
            <div class="error">{$itemsStore.error}</div>
        {/if}
    </div>
    
    <div class="stats">
        {#if timelineData.length > 0}
            <div class="stat-summary">
                <h3>Growth Summary</h3>
                <p>Total items: <strong>{totalItems}</strong></p>
                <p>Time period: <strong>{timelineData[0].monthFormatted} to {timelineData[timelineData.length - 1].monthFormatted}</strong></p>
                <p>Average monthly additions: <strong>{Math.round(totalItems / timelineData.length)}</strong></p>
            </div>
            <div class="peak-months">
                <h3>Peak Growth Months</h3>
                <ul>
                    {#each [...timelineData].sort((a, b) => b.count - a.count).slice(0, 3) as month}
                        <li>
                            <span class="month-name">{month.monthFormatted}</span>
                            <span class="month-count">{month.count} items ({((month.count / totalItems) * 100).toFixed(1)}%)</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
</div>

<style>
    .timeline-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
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
    
    .chart-container {
        flex: 1;
        min-height: 500px;
        position: relative;
        background: var(--card-background);
        border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
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
    
    .stat-summary, .peak-months {
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
    
    .month-name {
        color: var(--text-color-primary);
    }
    
    .month-count {
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