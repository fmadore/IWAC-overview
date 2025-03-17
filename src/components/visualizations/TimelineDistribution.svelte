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
    
    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip({
        defaultWidth: 200,
        defaultHeight: 100
    });

    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;
    
    // Initialize data processing hook
    const { filterItems, groupAndCount, processTimeData } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['created_date'],
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true,
        filterFn: (item: OmekaItem) => {
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            return true;
        }
    });
    
    // Store unsubscribe functions
    let languageUnsubscribe: () => void;
    
    // Track component state
    let isMounted = false;
    let isInitialized = false;

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
    // Add translations for tooltip labels
    const newItemsText = translate('viz.new_items');
    const percentageText = translate('viz.percentage');

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

    // Initialize visualization when data changes
    $: if (isMounted && isInitialized && $itemsStore.items && container && resizeHook) {
        const { width: newWidth, height: newHeight } = resizeHook.dimensions;
        width = newWidth;
        height = newHeight;
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
                    console.error('[TimelineDistribution] Container element not found in onMount');
                    return;
                }

                // Initialize resize hook
                resizeHook = useD3Resize({
                    container,
                    onResize: () => {
                        if (isMounted && isInitialized && container) {
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            width = newWidth;
                            height = newHeight;
                            updateVisualization();
                        }
                    }
                });
                
                // Subscribe to language changes
                languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted || !isInitialized) return;
                    console.log("[TimelineDistribution] Language changed to:", value);
                    currentLang = value;
                    
                    if (container) {
                        updateTitleHtml();
                        updateVisualization();
                    }
                });
                
                // Initialize data
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    // Get initial dimensions
                    const { width: initialWidth, height: initialHeight } = resizeHook.dimensions;
                    width = initialWidth;
                    height = initialHeight;
                    
                    // Generate initial facet options
                    generateFacetOptions();
                    
                    // Set initialization flag
                    isInitialized = true;
                    
                    // Wait for next tick before updating visualization
                    await tick();
                    if (container) {
                        updateVisualization();
                    }
                } else {
                    await itemsStore.loadItems();
                    // Set initialization flag after data is loaded
                    isInitialized = true;
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            try {
                isMounted = false;
                isInitialized = false;
                
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

    // Create timeline visualization
    function updateVisualization() {
        if (!container || !isMounted || !isInitialized) {
            console.error('[TimelineDistribution] Cannot update visualization - component not ready');
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
                
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: t('viz.new_items'), value: formatNumber(d.count) },
                        { label: t('viz.percentage'), value: `${d.percentage.toFixed(2)}%` }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mousemove', function(event, d) {
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: t('viz.new_items'), value: formatNumber(d.count) },
                        { label: t('viz.percentage'), value: `${d.percentage.toFixed(2)}%` }
                    ]
                );
                
                showTooltip(event, content);
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
                
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: t('viz.total_items'), value: formatNumber(d.total) }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mousemove', function(event, d) {
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: t('viz.total_items'), value: formatNumber(d.total) }
                    ]
                );
                
                showTooltip(event, content);
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
        updateVisualization();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        updateVisualization();
    }
    
    // Make sure facet options update when language changes
    $: if (isMounted && $languageStore && $itemsStore.items && $itemsStore.items.length > 0) {
        generateFacetOptions();
    }

    // Process data based on current filters and generate timeline data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Define the start date (April 1, 2024)
        const startDate = new Date(2024, 3, 1); // Note: Months are 0-indexed, so 3 = April

        // Process time-based data using the hook
        const timelineData = processTimeData(
            $itemsStore.items,
            'created_date',
            {
                startDate,
                includeCumulative: true
            }
        );

        if (timelineData.length === 0) return [];

        // Update total items count
        totalItems = timelineData[timelineData.length - 1].total;

        // Calculate max values for scaling
        maxMonthlyCount = Math.max(...timelineData.map(d => d.count));
        maxTotalCount = Math.max(...timelineData.map(d => d.total));
        
        return timelineData;
    }
    
    // Generate facet options using the data processing hook
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Define the start date (April 1, 2024)
        const startDate = new Date(2024, 3, 1);
        
        // Filter items after April 2024 without applying country/type filters
        const { filterItems: filterItemsWithoutFacets } = useDataProcessing({
            filterMissingValues: true,
            requiredFields: ['created_date']
        });
        
        const filteredItems = filterItemsWithoutFacets($itemsStore.items).filter(item => {
            const itemDate = new Date(item.created_date!);
            return itemDate >= startDate;
        });

        // Generate country options using groupAndCount
        const countryData = groupAndCount(
            filteredItems,
            item => item.country || 'Unknown',
            filteredItems.length
        );

        countryOptions = [
            { value: 'all', label: t('country.all'), count: filteredItems.length },
            ...countryData
                .filter(item => item.key !== 'Unknown')
                .map(item => ({
                    value: item.key,
                    label: t(`country.${item.key}`),
                    count: item.count
                }))
                .sort((a, b) => b.count - a.count)
        ];

        // Generate type options using groupAndCount
        const typeData = groupAndCount(
            filteredItems,
            item => item.type || 'Unknown',
            filteredItems.length
        );

        typeOptions = [
            { value: 'all', label: t('type.all'), count: filteredItems.length },
            ...typeData
                .filter(item => item.key !== 'Unknown')
                .map(item => ({
                    value: item.key,
                    label: t(`type.${item.key}`),
                    count: item.count
                }))
                .sort((a, b) => b.count - a.count)
        ];
    }

    // Update when filters change, but only if initialized
    $: if (isInitialized && (selectedCountry || selectedType)) {
        updateVisualization();
    }
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