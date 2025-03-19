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

    // Initialize resize hook
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
            return t('viz.timeline_distribution_items', { '0': formattedCount });
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
        // Prevent unnecessary redraws by limiting updates
        if (width !== resizeHook.dimensions.width || height !== resizeHook.dimensions.height) {
            width = resizeHook.dimensions.width;
            height = resizeHook.dimensions.height;
            updateVisualization();
        }
    }

    // Add a debounce mechanism to prevent excessive updates
    let updateTimeoutId: number | null = null;

    // Function to debounce updates
    function debounceUpdate() {
        if (updateTimeoutId) {
            clearTimeout(updateTimeoutId);
        }
        
        updateTimeoutId = setTimeout(() => {
            updateVisualization();
            updateTimeoutId = null;
        }, 250) as unknown as number;
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
                            // Only update width and height if they've changed significantly
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            const widthChanged = Math.abs(width - newWidth) > 5;
                            const heightChanged = Math.abs(height - newHeight) > 5;
                            
                            if (widthChanged || heightChanged) {
                                width = newWidth;
                                height = newHeight;
                                debounceUpdate();
                            }
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
                        debounceUpdate();
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
            d3.select(container).selectAll('*').remove();
            d3.select(container).append('div')
                .attr('class', 'absolute inset-center text-secondary')
                .text('No timeline data available with the current filters');
            return;
        }
        
        // Update timeline data for reactive updates
        timelineData = data;
        
        // Get current dimensions from the container's bounding rect
        const containerRect = container.getBoundingClientRect();
        // Use the stored width/height values instead of recalculating - prevents feedback loop
        const containerWidth = width;
        const containerHeight = height;
        const isMobile = containerWidth < 768;
        const isExtraSmall = containerWidth < 480;
        
        // Remove previous content
        d3.select(container).selectAll('*').remove();
        
        // Create SVG container with fixed dimensions based on the current container size
        const svg = d3.select(container)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
            .attr('class', 'timeline-chart');
            
        // Set margins based on screen size
        const margin = {
            top: isMobile ? 20 : 40,
            right: isMobile ? 15 : 30,
            bottom: isMobile ? 70 : 80,
            left: isMobile ? 40 : 60
        };
        const chartWidth = containerWidth - margin.left - margin.right;
        const chartHeight = (containerHeight - margin.top - margin.bottom - (isMobile ? 30 : 50)) / 2;
        
        // Create x scale for both charts (shared)
        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.date) as [Date, Date])
            .range([0, chartWidth]);
            
        // Add divider line between charts
        svg.append('line')
            .attr('x1', margin.left)
            .attr('y1', margin.top + chartHeight + (isMobile ? 15 : 25))
            .attr('x2', containerWidth - margin.right)
            .attr('y2', margin.top + chartHeight + (isMobile ? 15 : 25))
            .attr('stroke', 'var(--color-border-default)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
            
        // Add legend only if not extra small
        if (!isExtraSmall) {
            const legendGroup = svg.append('g')
                .attr('transform', `translate(${containerWidth - margin.right}, ${margin.top - 10})`);
                
            // Monthly additions legend item
            legendGroup.append('line')
                .attr('x1', -100)
                .attr('y1', 0)
                .attr('x2', -80)
                .attr('y2', 0)
                .attr('stroke', 'var(--color-primary)')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#circle)');
                
            legendGroup.append('text')
                .attr('x', -75)
                .attr('y', 4)
                .attr('class', 'text-xs text-secondary')
                .text(t('viz.monthly_additions'));
                
            // Total items legend item
            legendGroup.append('line')
                .attr('x1', -100)
                .attr('y1', 20)
                .attr('x2', -80)
                .attr('y2', 20)
                .attr('stroke', 'var(--color-secondary)')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4 2');
                
            legendGroup.append('text')
                .attr('x', -75)
                .attr('y', 24)
                .attr('class', 'text-xs text-secondary')
                .text(t('viz.total_items'));
        }
            
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
            .attr('fill', 'var(--color-primary)');

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
            .data(yScaleMonthly.ticks(isMobile ? 3 : 5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleMonthly(d))
            .attr('y2', d => yScaleMonthly(d))
            .attr('stroke', 'var(--color-border-default)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for monthly chart
        chart1.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(isMobile ? d3.timeMonth.every(2) : d3.timeMonth.every(1))
                .tickFormat(d => {
                    const date = new Date(d as Date);
                    return isMobile ? 
                        `${date.getMonth() + 1}/${date.getFullYear().toString().substr(2)}` : 
                        d3.timeFormat('%Y-%m')(date);
                }))
            .selectAll('text')
            .attr('class', 'text-xs text-primary')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', `rotate(${isMobile ? -45 : -30})`);
            
        // Create y-axis for monthly chart
        chart1.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScaleMonthly).ticks(isMobile ? 3 : 5))
            .selectAll('text')
            .attr('class', 'text-xs text-primary');
            
        // Add y-axis label for monthly chart (only on non-mobile)
        if (!isMobile) {
            chart1.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('transform', 'rotate(-90)')
                .attr('y', -40)
                .attr('x', -chartHeight / 2)
                .attr('text-anchor', 'middle')
                .text(t('viz.monthly_additions'));
        }
            
        // Create line generator for monthly data
        const lineMonthly = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleMonthly(d.count))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for monthly data
        chart1.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-primary)')
            .attr('stroke-width', isMobile ? 1.5 : 2)
            .attr('d', lineMonthly);
            
        // Add dots for each data point in monthly chart - fewer on mobile
        const dotsMonthly = chart1.selectAll('.dot-monthly')
            .data(isMobile ? data.filter((_, i) => i % 2 === 0) : data)
            .enter()
            .append('circle')
            .attr('class', 'dot-monthly cursor-pointer')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScaleMonthly(d.count))
            .attr('r', isMobile ? 3 : 4)
            .attr('fill', 'var(--color-primary)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 5 : 6);
                
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
                    .attr('r', isMobile ? 3 : 4);
                hideTooltip();
            });

        // CHART 2: Total Items
        // =========================
        const chart2 = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + (isMobile ? 30 : 50)})`);
            
        // Create y scale for total chart
        const yScaleTotal = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.total) || 0) * 1.1])
            .range([chartHeight, 0]);
            
        // Create grid lines for total chart
        chart2.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(yScaleTotal.ticks(isMobile ? 3 : 5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleTotal(d))
            .attr('y2', d => yScaleTotal(d))
            .attr('stroke', 'var(--color-border-default)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for total chart
        chart2.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(isMobile ? d3.timeMonth.every(2) : d3.timeMonth.every(1))
                .tickFormat(d => {
                    const date = new Date(d as Date);
                    return isMobile ? 
                        `${date.getMonth() + 1}/${date.getFullYear().toString().substr(2)}` : 
                        d3.timeFormat('%Y-%m')(date);
                }))
            .selectAll('text')
            .attr('class', 'text-xs text-primary')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', `rotate(${isMobile ? -45 : -30})`);
            
        // Create y-axis for total chart
        chart2.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScaleTotal).ticks(isMobile ? 3 : 5))
            .selectAll('text')
            .attr('class', 'text-xs text-primary');
            
        // Add y-axis label for total chart (only on non-mobile)
        if (!isMobile) {
            chart2.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('transform', 'rotate(-90)')
                .attr('y', -40)
                .attr('x', -chartHeight / 2)
                .attr('text-anchor', 'middle')
                .text(t('viz.total_items'));
        }
            
        // Add x-axis label (only on non-mobile and on the bottom chart)
        if (!isMobile) {
            chart2.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + 45)
                .text(t('viz.month'));
        }
            
        // Create line generator for total data
        const lineTotal = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleTotal(d.total))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for total data
        chart2.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-secondary)')
            .attr('stroke-width', isMobile ? 1.5 : 2)
            .attr('stroke-dasharray', '4 2')
            .attr('d', lineTotal);
            
        // Add dots for each data point in total chart - fewer on mobile
        const dotsTotal = chart2.selectAll('.dot-total')
            .data(isMobile ? data.filter((_, i) => i % 2 === 0) : data)
            .enter()
            .append('circle')
            .attr('class', 'dot-total cursor-pointer')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScaleTotal(d.total))
            .attr('r', isMobile ? 3 : 4)
            .attr('fill', 'var(--color-secondary)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 5 : 6);
                
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
                    .attr('r', isMobile ? 3 : 4);
                hideTooltip();
            });
    }
    
    // Handle country filter change
    function handleCountryChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedCountry = select.value;
        debounceUpdate();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        debounceUpdate();
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
        debounceUpdate();
    }
</script>

<div class="w-full h-full flex flex-col gap-md">
    <BaseVisualization
        title="Timeline Distribution"
        titleHtml={titleHtml}
        descriptionTranslationKey={timelineDescriptionKey}
        theme="default"
        className="timeline-visualization"
    >
        <div class="flex flex-wrap gap-md p-md bg-card rounded-t border-b border-solid border-default filters">
            <div class="flex flex-col gap-xs filter-group">
                <label for="country-filter" class="text-xs font-bold text-secondary">{$filterByCountryText}:</label>
                <select id="country-filter" on:change={handleCountryChange} value={selectedCountry} class="p-xs px-sm rounded-sm border border-solid border-default bg-card text-primary text-sm">
                    {#each countryOptions as option}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="flex flex-col gap-xs filter-group">
                <label for="type-filter" class="text-xs font-bold text-secondary">{$filterByTypeText}:</label>
                <select id="type-filter" on:change={handleTypeChange} value={selectedType} class="p-xs px-sm rounded-sm border border-solid border-default bg-card text-primary text-sm">
                    {#each typeOptions as option}
                        <option value={option.value}>{option.label} ({formatNumber(option.count)})</option>
                    {/each}
                </select>
            </div>
            
            <div class="ml-auto self-end text-sm text-secondary summary">
                {#if timelineData.length > 0}
                    <span>{$showingItemsOverMonthsText.replace('{0}', formatNumber(totalItems)).replace('{1}', timelineData.length.toString())}</span>
                {/if}
            </div>
        </div>
        
        <div class="flex-1 relative min-h-500 bg-card rounded-b p-md chart-container overflow-hidden"
             bind:this={container}>
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="grid grid-cols-2 gap-md p-md bg-card rounded shadow mt-md stats">
            {#if timelineData.length > 0}
                <div class="p-md stat-summary">
                    <h3 class="mt-0 mb-sm text-md text-primary border-b border-solid border-default pb-xs">{$summaryText}</h3>
                    <p class="text-sm mb-xs">{$totalItemsText}: <strong class="font-medium">{formatNumber(totalItems)}</strong></p>
                    <p class="text-sm mb-xs">{$timePeriodText}: <strong class="font-medium">{timelineData[0]?.monthFormatted || ''} to {timelineData[timelineData.length - 1]?.monthFormatted || ''}</strong></p>
                    <p class="text-sm">{$avgMonthlyAdditionsText}: <strong class="font-medium">{formatNumber(Math.round(totalItems / (timelineData.length || 1)))}</strong></p>
                </div>
                <div class="p-md peak-months">
                    <h3 class="mt-0 mb-sm text-md text-primary border-b border-solid border-default pb-xs">{$peakGrowthMonthsText}</h3>
                    <ul class="list-style-none p-0 m-0">
                        {#each [...timelineData].sort((a, b) => b.count - a.count).slice(0, 3) as month}
                            <li class="flex justify-between mb-xs text-sm">
                                <span class="text-primary">{month.monthFormatted}</span>
                                <span class="text-secondary font-medium">{formatNumber(month.count)} {$itemsText} ({((month.count / (totalItems || 1)) * 100).toFixed(1)}%)</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
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
        
        .stats {
            grid-template-columns: 1fr !important;
        }
    }
</style> 