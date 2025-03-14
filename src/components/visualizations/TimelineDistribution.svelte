<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import BaseVisualization from './BaseVisualization.svelte';

    // Define interfaces for data structures
    interface MonthlyData {
        date: Date;          // First day of the month
        month: string;       // Formatted month (e.g., "2024-03")
        monthFormatted: string; // Display format (e.g., "Mar 2024")
        count: number;       // Number of items added in this month
        total: number;       // Cumulative total as of this month
        percentage: number;  // Percentage of total
    }

    interface FacetOption {
        value: string;
        label: string;
        count: number;
    }

    // Define translation keys
    const timelineDescriptionKey = 'viz.timeline_distribution_description';

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
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    
    // Visualization variables
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;

    // Format date strings
    const monthFormat = d3.timeFormat('%Y-%m');
    const displayFormat = d3.timeFormat('%b %Y');

    // Create reactive translations
    const filterByCountryText = translate('viz.filter_by_country');
    const filterByTypeText = translate('viz.filter_by_type');
    const noDataText = translate('viz.no_data');
    const summaryText = translate('viz.summary');
    const totalItemsText = translate('viz.total_items');
    const timePeriodText = translate('viz.time_period');
    const avgMonthlyAdditionsText = translate('viz.avg_monthly_additions');
    const peakGrowthMonthsText = translate('viz.peak_growth_months');
    const showingItemsOverMonthsText = translate('viz.showing_items_over_months');
    const itemsText = translate('viz.items');
    const timelineItemsText = translate('viz.timeline_distribution_items');
    const monthlyAdditionsText = translate('viz.monthly_additions');
    const monthText = translate('viz.month');

    // Function to format numbers with spaces as thousands separator
    function formatNumber(num: number): string {
        // Use locale-specific formatting - in French/many European countries spaces are used
        return num.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
    }
    
    // Function to get the title with the current count
    function getTitle() {
        // Only show count if we have data
        if (totalItems > 0) {
            // Format the number with spaces as thousands separator
            const formattedCount = formatNumber(totalItems);
            // Use the current language's translation with the formatted count
            return t('viz.timeline_distribution_items', [formattedCount]);
        } else {
            // Use the basic title without count when data isn't loaded yet
            return t('viz.timeline_distribution_title');
        }
    }
    
    // Function to update the title HTML when language or count changes
    function updateTitleHtml() {
        console.log('[TimelineDistribution] Updating title with count:', totalItems);
        titleHtml = getTitle();
    }

    // Update title immediately when items count changes
    $: {
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            console.log('[TimelineDistribution] Items loaded, updating title');
            totalItems = $itemsStore.items.filter(item => {
                // Apply country filter if not 'all'
                if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
                
                // Apply type filter if not 'all'
                if (selectedType !== 'all' && item.type !== selectedType) return false;
                
                return true;
            }).length;
            
            updateTitleHtml();
        }
    }

    // Update title when language changes
    $: $languageStore, updateTitleHtml();

    // Subscribe to language changes to update the chart
    languageStore.subscribe(value => {
        console.log("[TimelineDistribution] Language changed to:", value);
        currentLang = value;
        
        // Update facet options when language changes
        generateFacetOptions();
        
        // Refresh the chart to update all translated elements
        if (container && $itemsStore.items && $itemsStore.items.length > 0) {
            createTimeline();
        }
    });

    // Process data based on current filters and generate timeline data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Define the start date (April 1, 2024)
        const startDate = new Date(2024, 3, 1); // Note: Months are 0-indexed, so 3 = April
        
        // First, calculate the starting total from items before April 2024
        let startingTotal = 0;
        
        // Apply country and type filters consistently
        const filterItem = (item: OmekaItem) => {
            if (!item.created_date) return false;
            
            // Apply country filter if not 'all'
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            
            // Apply type filter if not 'all'
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            
            return true;
        };
        
        // Calculate items from before April 2024 (our starting total)
        const beforeAprilItems = $itemsStore.items.filter(item => {
            if (!filterItem(item)) return false;
            
            const itemDate = new Date(item.created_date);
            return itemDate < startDate;
        });
        
        startingTotal = beforeAprilItems.length;
        
        // Filter items for April 2024 and onwards (for monthly visualization)
        let filteredItems = $itemsStore.items.filter(item => {
            if (!filterItem(item)) return false;
            
            // Only include items from April 2024 onwards in the monthly breakdown
            const itemDate = new Date(item.created_date);
            return itemDate >= startDate;
        });
        
        // Total items is the sum of starting total and filtered items
        totalItems = startingTotal + filteredItems.length;
        
        if (filteredItems.length === 0) return [];
        
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
                    total: 0, // Will calculate cumulative total next
                    percentage: 0 // Will calculate percentage next
                };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate cumulative totals and percentages
        // Start with the initial total from before April 2024
        let runningTotal = startingTotal;
        monthsArray.forEach(month => {
            runningTotal += month.count;
            month.total = runningTotal;
            // Calculate percentage based on the count relative to all items added since April
            month.percentage = (month.count / filteredItems.length) * 100;
        });
        
        // Calculate max values for scaling
        maxMonthlyCount = d3.max(monthsArray, d => d.count) || 0;
        maxTotalCount = d3.max(monthsArray, d => d.total) || 0;
        
        return monthsArray;
    }
    
    // Generate facet options
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Define the start date (April 1, 2024)
        const startDate = new Date(2024, 3, 1); // Note: Months are 0-indexed, so 3 = April
        
        // Get only items with created_date and after April 2024
        const itemsWithDate = $itemsStore.items.filter(item => {
            if (!item.created_date) return false;
            const itemDate = new Date(item.created_date);
            return itemDate >= startDate;
        });
        
        // Generate country options
        const countries = d3.rollup(
            itemsWithDate,
            v => v.length,
            d => d.country || "Unknown"
        );
        
        countryOptions = [
            { value: 'all', label: t('country.all'), count: itemsWithDate.length },
            ...Array.from(countries, ([country, count]) => ({
                value: country,
                // Use translation for country name if available
                label: t(`country.${country}`),
                count
            })).filter(option => option.value !== "Unknown") // Remove Unknown option
            .sort((a, b) => b.count - a.count)
        ];
        
        // Generate type options
        const types = d3.rollup(
            itemsWithDate,
            v => v.length,
            d => d.type || "Unknown"
        );
        
        typeOptions = [
            { value: 'all', label: t('type.all'), count: itemsWithDate.length },
            ...Array.from(types, ([type, count]) => ({
                value: type,
                // Use translation for the type label if available
                label: t(`type.${type}`),
                count
            })).filter(option => option.value !== "Unknown") // Remove Unknown option
            .sort((a, b) => b.count - a.count)
        ];
    }

    // Create tooltip element
    function createTooltip() {
        try {
            // Remove existing tooltip if it exists to prevent duplicates
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
    
    // Show tooltip with data information
    function showTooltip(event: MouseEvent, d: MonthlyData, type: 'monthly' | 'total') {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                createTooltip(); // Recreate tooltip if it doesn't exist
            }
            
            if (!tooltip) return;
            
            const monthName = d.date.toLocaleString('default', { month: 'long' });
            const year = d.date.getFullYear();
            
            if (type === 'monthly') {
                tooltip.innerHTML = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${monthName} ${year}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        <span>New Items:</span><span style="text-align:right;font-weight:bold;">${d.count}</span>
                        <span>Percentage:</span><span style="text-align:right;font-weight:bold;">${d.percentage.toFixed(2)}%</span>
                    </div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${monthName} ${year}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                        <span>Total Items:</span><span style="text-align:right;font-weight:bold;">${d.total}</span>
                    </div>
                `;
            }
            
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

    // Create timeline visualization
    function createTimeline() {
        if (!container) {
            console.error('[TimelineDistribution] Container element not found in createTimeline');
            return;
        }
        
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
                .text('No timeline data available with the current filters');
            return;
        }
        
        // Update timeline data for reactive updates
        timelineData = data;
        
        // Remove previous content
        d3.select(container).select('svg').remove();
        d3.select(container).select('.no-data').remove();
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        // Increase the height for less cramped charts
        height = rect.height - 50; // Reduced from -100 to -50 to give more height
        
        // Create SVG container
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);
            
        // Set margins
        const margin = { top: 30, right: 60, bottom: 50, left: 70 }; // Increased left and right margins
        const chartWidth = width - margin.left - margin.right;
        
        // Calculate individual chart heights - increase gap between charts to 50px
        const chartHeight = (height - margin.top - margin.bottom - 50) / 2; // Increased from 20px to 50px gap
        
        // Create x scale for both charts (shared)
        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.date) as [Date, Date])
            .range([0, chartWidth]);
            
        // Add divider line between charts
        svg.append('line')
            .attr('x1', margin.left)
            .attr('y1', margin.top + chartHeight + 25) // Position in the middle of the gap
            .attr('x2', width - margin.right)
            .attr('y2', margin.top + chartHeight + 25)
            .attr('stroke', 'var(--divider-color)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3'); // Dotted line
            
        // Add legend
        const legendGroup = svg.append('g')
            .attr('transform', `translate(${width - margin.right}, ${margin.top - 10})`);
            
        // Monthly additions legend item
        legendGroup.append('line')
            .attr('x1', -100)
            .attr('y1', 0)
            .attr('x2', -80)
            .attr('y2', 0)
            .attr('stroke', 'var(--primary-color)')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#circle)');
            
        legendGroup.append('text')
            .attr('x', -75)
            .attr('y', 4)
            .attr('fill', 'var(--text-color-primary)')
            .attr('font-size', 'var(--font-size-sm)')
            .text(t('viz.monthly_additions'));
            
        // Total items legend item
        legendGroup.append('line')
            .attr('x1', -100)
            .attr('y1', 20)
            .attr('x2', -80)
            .attr('y2', 20)
            .attr('stroke', 'var(--secondary-color)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 2');
            
        legendGroup.append('text')
            .attr('x', -75)
            .attr('y', 24)
            .attr('fill', 'var(--text-color-primary)')
            .attr('font-size', 'var(--font-size-sm)')
            .text(t('viz.total_items'));
            
        // Create circle marker definition for line points
        svg.append('defs').append('marker')
            .attr('id', 'circle')
            .attr('viewBox', '-5 -5 10 10')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .append('circle')
            .attr('r', 3)
            .attr('fill', 'var(--primary-color)');

        // CHART 1: Monthly Additions
        // =========================
        const chart1 = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
        // Create y scale for monthly chart
        const yScaleMonthly = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.count) || 0) * 1.1])
            .range([chartHeight, 0]);
            
        // Create grid lines for monthly chart
        chart1.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(yScaleMonthly.ticks(5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleMonthly(d))
            .attr('y2', d => yScaleMonthly(d))
            .attr('stroke', 'var(--divider-color)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for monthly chart
        chart1.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            // @ts-ignore: D3 typing issues with axisBottom
            .call(d3.axisBottom(xScale)
                .ticks(d3.timeMonth.every(1))
                // @ts-ignore: D3 typing issues with tickFormat
                .tickFormat(d3.timeFormat('%Y-%m')))
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');
            
        // Create y-axis for monthly chart
        chart1.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScaleMonthly).ticks(5))
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)');
            
        // Add y-axis label for monthly chart
        chart1.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -55)
            .attr('x', -chartHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', 'var(--font-size-sm)')
            .style('fill', 'var(--text-color-secondary)')
            .text(t('viz.monthly_additions'));
            
        // Create line generator for monthly data
        const lineMonthly = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleMonthly(d.count))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for monthly data
        chart1.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--primary-color)')
            .attr('stroke-width', 2)
            .attr('d', lineMonthly);
            
        // Add dots for each data point in monthly chart
        const dotsMonthly = chart1.selectAll('.dot-monthly')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot-monthly')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScaleMonthly(d.count))
            .attr('r', 4)
            .attr('fill', 'var(--primary-color)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                showTooltip(event, d, 'monthly');
            })
            .on('mousemove', function(event, d) {
                showTooltip(event, d, 'monthly');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);
                hideTooltip();
            });

        // CHART 2: Total Items
        // =========================
        const chart2 = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + 50})`); // Increased from 20px to 50px gap
            
        // Create y scale for total chart
        const yScaleTotal = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.total) || 0) * 1.1])
            .range([chartHeight, 0]);
            
        // Create grid lines for total chart
        chart2.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(yScaleTotal.ticks(5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleTotal(d))
            .attr('y2', d => yScaleTotal(d))
            .attr('stroke', 'var(--divider-color)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for total chart
        chart2.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            // @ts-ignore: D3 typing issues with axisBottom
            .call(d3.axisBottom(xScale)
                .ticks(d3.timeMonth.every(1))
                // @ts-ignore: D3 typing issues with tickFormat
                .tickFormat(d3.timeFormat('%Y-%m')))
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');
            
        // Create y-axis for total chart
        chart2.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScaleTotal).ticks(5))
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)');
            
        // Add y-axis label for total chart
        chart2.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -55)
            .attr('x', -chartHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', 'var(--font-size-sm)')
            .style('fill', 'var(--text-color-secondary)')
            .text(t('viz.total_items'));
            
        // Add x-axis label (only need it on the bottom chart)
        chart2.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 50)
            .style('font-size', 'var(--font-size-sm)')
            .style('fill', 'var(--text-color-secondary)')
            .text(t('viz.month'));
            
        // Create line generator for total data
        const lineTotal = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleTotal(d.total))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for total data
        chart2.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--secondary-color)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 2')
            .attr('d', lineTotal);
            
        // Add dots for each data point in total chart
        const dotsTotal = chart2.selectAll('.dot-total')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot-total')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScaleTotal(d.total))
            .attr('r', 4)
            .attr('fill', 'var(--secondary-color)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                showTooltip(event, d, 'total');
            })
            .on('mousemove', function(event, d) {
                showTooltip(event, d, 'total');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);
                hideTooltip();
            });
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
        console.log('[TimelineDistribution] Component mounted');
        
        // Wait for component to mount and DOM to update
        await tick();
        
        // Create tooltip
        createTooltip();
        
        // Wait for items to load if needed
        if (!$itemsStore.items || $itemsStore.items.length === 0) {
            console.log('[TimelineDistribution] No items loaded, waiting for data');
            await itemsStore.loadItems();
        }
        
        // Wait for another tick to ensure container is bound
        await tick();
        
        if (!container) {
            console.error('[TimelineDistribution] Container element not found after waiting');
            return;
        }
        
        console.log('[TimelineDistribution] Container found, generating visualization');
        
        // Generate facet options and create visualization
        generateFacetOptions();
        createTimeline();
        
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
    <BaseVisualization
        title="Timeline Distribution"
        titleHtml={titleHtml}
        descriptionTranslationKey={timelineDescriptionKey}
    >
        <div class="filters">
            <div class="filter-group">
                <label for="country-filter">{$filterByCountryText}:</label>
                <select id="country-filter" on:change={handleCountryChange} value={selectedCountry}>
                    {#each countryOptions as option}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="type-filter">{$filterByTypeText}:</label>
                <select id="type-filter" on:change={handleTypeChange} value={selectedType}>
                    {#each typeOptions as option}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="summary">
                {#if timelineData.length > 0}
                    <span>{$showingItemsOverMonthsText.replace('{0}', formatNumber(totalItems)).replace('{1}', timelineData.length.toString())}</span>
                {/if}
            </div>
        </div>
        
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="stats">
            {#if timelineData.length > 0}
                <div class="stat-summary">
                    <h3>{$summaryText}</h3>
                    <p>{$totalItemsText}: <strong>{formatNumber(totalItems)}</strong></p>
                    <p>{$timePeriodText}: <strong>{timelineData[0]?.monthFormatted || ''} to {timelineData[timelineData.length - 1]?.monthFormatted || ''}</strong></p>
                    <p>{$avgMonthlyAdditionsText}: <strong>{formatNumber(Math.round(totalItems / (timelineData.length || 1)))}</strong></p>
                </div>
                <div class="peak-months">
                    <h3>{$peakGrowthMonthsText}</h3>
                    <ul>
                        {#each [...timelineData].sort((a, b) => b.count - a.count).slice(0, 3) as month}
                            <li>
                                <span class="month-name">{month.monthFormatted}</span>
                                <span class="month-count">{formatNumber(month.count)} {$itemsText} ({((month.count / (totalItems || 1)) * 100).toFixed(1)}%)</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    .timeline-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md); /* Increased gap between elements */
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
        min-height: 650px; /* Increased from 550px to 650px for more space */
        position: relative;
        background: var(--card-background);
        border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
        margin-bottom: var(--spacing-sm);
        padding: var(--spacing-md); /* Added padding */
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