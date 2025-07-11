<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import itemsStore from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { TimelineChart, type MonthlyData } from '../../services/timelineChart';
    import { getColorPalette } from '../../utils/colorPalette';

    // Define interfaces for data structures
    interface FacetOption {
        value: string;
        label: string;
        count: number;
    }

    // Define translation keys
    const timelineDescriptionKey = 'viz.growth_since_april_description';

    // Filter states
    let selectedCountry: string = 'all';
    let selectedType: string = 'all';
    
    // Data states
    let timelineData: MonthlyData[] = [];
    let countryOptions: FacetOption[] = [];
    let typeOptions: FacetOption[] = [];
    let totalItems: number = 0;
    let growthSinceStart: number = 0;
    let maxMonthlyCount: number = 0;
    let maxTotalCount: number = 0;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    
    // Visualization variables
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let timelineChart: TimelineChart;
    
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
            if (item.type === "Notice d'autorité") return false;
            if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
            if (selectedType !== 'all' && item.type !== selectedType) return false;
            return true;
        }
    });
    
    // Additional hooks for facet generation
    const countryFacetHook = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['created_date'],
        filterFn: (item: OmekaItem) => {
            if (item.type === "Notice d'autorité") return false;
            if (!item.created_date) return false;
            const itemDate = new Date(item.created_date);
            if (isNaN(itemDate.getTime()) || itemDate < new Date(2024, 3, 1)) return false;
            return selectedType === 'all' || item.type === selectedType;
        }
    });
    
    const typeFacetHook = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['created_date'],
        filterFn: (item: OmekaItem) => {
            if (item.type === "Notice d'autorité") return false;
            if (!item.created_date) return false;
            const itemDate = new Date(item.created_date);
            if (isNaN(itemDate.getTime()) || itemDate < new Date(2024, 3, 1)) return false;
            return selectedCountry === 'all' || item.country === selectedCountry;
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
    const growthSinceAprilText = translate('viz.growth_since_april');
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
        // Only show count if we have data and growth is positive
        if (growthSinceStart > 0) {
            // Format the number with spaces as thousands separator
            const formattedGrowth = formatNumber(growthSinceStart);
            // Use the new translation key with the formatted growth
            return t('viz.items_added_since_april', { '0': formattedGrowth });
        } else {
            // Use a corresponding basic title when data isn't loaded yet or growth is zero/negative
            return t('viz.items_added_since_april_title');
        }
    }
    
    // Function to update the title HTML when language or count changes
    function updateTitleHtml() {
        console.log('[TimelineDistribution] Updating title with count:', totalItems);
        titleHtml = getTitle();
    }

    // Update title immediately when items count changes
    // $: {
    //     if ($itemsStore.items && $itemsStore.items.length > 0) {
    //         console.log('[TimelineDistribution] Items loaded, updating title');
    //         totalItems = $itemsStore.items.filter(item => {
    //             // Exclude specific type globally
    //             if (item.type === "Notice d'autorité") return false;
    //
    //             // Apply country filter if not 'all'
    //             if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
    //             
    //             // Apply type filter if not 'all'
    //             if (selectedType !== 'all' && item.type !== selectedType) return false;
    //             
    //             return true;
    //         }).length;
    //         
    //         updateTitleHtml();
    //     }
    // }

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
        console.log('[TimelineDistribution] Component mounted');

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
                
                console.log('[TimelineDistribution] Container element found:', container);

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
                                console.log('[TimelineDistribution] Size changed, updating visualization', { newWidth, newHeight });
                                width = newWidth;
                                height = newHeight;
                                debounceUpdate();
                            }
                        }
                    }
                });
                
                // Get initial dimensions
                const { width: initialWidth, height: initialHeight } = resizeHook.dimensions;
                width = initialWidth;
                height = initialHeight || 500;
                
                console.log('[TimelineDistribution] Initial dimensions:', { width, height });
                
                // Subscribe to language changes
                languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    console.log("[TimelineDistribution] Language changed to:", value);
                    currentLang = value;
                    updateTitleHtml();
                    
                    if (isInitialized && container) {
                        debounceUpdate();
                    }
                });
                
                // Check if items are already loaded
                if (!$itemsStore.items || $itemsStore.items.length === 0) {
                    console.log('[TimelineDistribution] No items loaded, loading items');
                    try {
                        await itemsStore.loadItems();
                        console.log('[TimelineDistribution] Items loaded:', $itemsStore.items?.length);
                    } catch (e) {
                        console.error('[TimelineDistribution] Error loading items:', e);
                    }
                } else {
                    console.log('[TimelineDistribution] Items already loaded:', $itemsStore.items.length);
                }
                    
                    // Generate initial facet options
                    generateFacetOptions();
                    
                    // Set initialization flag
                    isInitialized = true;
                    
                // Initialize and update visualization
                    await tick();
                    if (container) {
                    // Initialize timeline chart 
                    initializeTimelineChart();
                    // Update visualization with data
                        updateVisualization();
                    console.log('[TimelineDistribution] Visualization initialized');
                } else {
                    console.error('[TimelineDistribution] Container not available after initialization');
                }
            } catch (error) {
                console.error('[TimelineDistribution] Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            try {
                console.log('[TimelineDistribution] Component unmounting, cleaning up');
                isMounted = false;
                isInitialized = false;
                
                if (resizeHook) {
                    resizeHook.cleanup();
                }
                
                if (languageUnsubscribe) {
                    languageUnsubscribe();
                }
                
                if (updateTimeoutId) {
                    clearTimeout(updateTimeoutId);
                    updateTimeoutId = null;
                }
                
                if (container) {
                    d3.select(container).selectAll('*').remove();
                }
            } catch (e) {
                console.error('[TimelineDistribution] Error during cleanup:', e);
            }
        };
    });

    // Initialize the timeline chart with modern styling
    function initializeTimelineChart() {
        try {
            console.log('[TimelineDistribution] Initializing timeline chart with dimensions:', { width, height });
            console.log('[TimelineDistribution] Container element:', container);
            
            // Make sure container is empty
            d3.select(container).selectAll('*').remove();
            
            timelineChart = new TimelineChart({
                container,
                width,
                height,
                formatNumber,
                currentLang,
                translations: {
                    monthlyAdditions: $monthlyAdditionsText,
                    totalItems: $totalItemsText,
                    newItems: $newItemsText,
                    percentage: $percentageText,
                    month: $monthText
                }
            });
            
            // Set tooltip callbacks
            timelineChart.setTooltipCallbacks({
                showTooltip,
                hideTooltip
            });
            
            console.log('[TimelineDistribution] Timeline chart initialized with modern styling');
        } catch (error) {
            console.error('[TimelineDistribution] Error initializing timeline chart:', error);
        }
    }

    // Create timeline visualization using the service
    function updateVisualization() {
        try {
            if (!container || !isMounted || !isInitialized) {
                console.error('[TimelineDistribution] Cannot update visualization - component not ready', 
                    { container: !!container, isMounted, isInitialized });
                return;
            }
            
            console.log('[TimelineDistribution] Updating visualization with dimensions:', { width, height });
            
            // Ensure height is not zero
            if (height <= 0) {
                height = 500; // Use a default height if the detected height is zero
                console.log('[TimelineDistribution] Using fallback height of 500px');
            }
        
        // Process data with current filters
        const data = processData();
        if (!data || data.length === 0) {
                console.warn('[TimelineDistribution] No timeline data available with current filters');
                // Clear previous content and show no data message
            d3.select(container).selectAll('*').remove();
            d3.select(container).append('div')
                .attr('class', 'absolute inset-center text-secondary')
                .text('No timeline data available with the current filters');
            return;
        }
        
        // Update timeline data for reactive updates
        timelineData = data;
            console.log('[TimelineDistribution] Timeline data updated with', timelineData.length, 'data points');
            
            // Force clear previous chart content to avoid rendering issues
            d3.select(container).selectAll('*').remove();
            
            // Create a new TimelineChart instance
            timelineChart = new TimelineChart({
                container,
                width,
                height,
                formatNumber,
                currentLang,
                translations: {
                    monthlyAdditions: $monthlyAdditionsText,
                    totalItems: $totalItemsText,
                    newItems: $newItemsText,
                    percentage: $percentageText,
                    month: $monthText
                }
            });
            
            // Set tooltip callbacks
            timelineChart.setTooltipCallbacks({
                showTooltip,
                hideTooltip
            });
            
            // Render the chart
            timelineChart.render(data);
            console.log('[TimelineDistribution] Chart rendered with', data.length, 'data points');
            
            // Update the title HTML after data processing is complete
            updateTitleHtml();
        } catch (error) {
            console.error('[TimelineDistribution] Error updating visualization:', error);
            
            // Try to show an error message in the container
            if (container) {
                try {
                    d3.select(container).selectAll('*').remove();
                    d3.select(container).append('div')
                        .attr('class', 'absolute inset-center text-error')
                        .text('Error rendering timeline visualization');
                } catch (e) {
                    console.error('[TimelineDistribution] Error showing error message:', e);
                }
            }
        }
    }
    
    // Handle country filter change
    function handleCountryChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedCountry = select.value;
        generateFacetOptions(); // Regenerate facets when filter changes
        debounceUpdate();
    }
    
    // Handle type filter change
    function handleTypeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedType = select.value;
        generateFacetOptions(); // Regenerate facets when filter changes
        debounceUpdate();
    }
    
    // Make sure facet options update when language changes
    $: if (isMounted && $languageStore && $itemsStore.items && $itemsStore.items.length > 0) {
        generateFacetOptions();
    }

    // Process data based on current filters and generate timeline data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) {
            console.warn('[TimelineDistribution] No items available for timeline data');
            return [];
        }
        
        console.log('[TimelineDistribution] Processing data with filters:', 
            { country: selectedCountry, type: selectedType });
        console.log('[TimelineDistribution] Total items before filtering:', $itemsStore.items.length);
        
        try {
            // Define the start date (April 2024)
            const startDate = new Date(2024, 3, 1);
            
            // Define the initial baseline count (previously added items before April 2024)
            const initialBaseline = 8874; // Updated baseline count
            
            // Log a few sample dates to help with debugging
            if ($itemsStore.items.length > 0) {
                console.log('[TimelineDistribution] Sample created_date values:',
                    $itemsStore.items.slice(0, 5).map(item => item.created_date));
            }
    
            // Apply filters first before processing time data
            const filteredItems = filterItems($itemsStore.items);
            console.log('[TimelineDistribution] Items after filtering:', filteredItems.length);

            // Process time-based data using the hook
            const timelineData = processTimeData(
                filteredItems,
                'created_date',
                {
                    startDate,
                    includeCumulative: true,
                    initialTotal: initialBaseline // Add the initial baseline to the total
                }
            );

            console.log('[TimelineDistribution] Processed timeline data length:', timelineData.length);
            if (timelineData.length > 0) {
                console.log('[TimelineDistribution] First and last data points:', 
                    timelineData[0], timelineData[timelineData.length - 1]);
            }
    
            if (timelineData.length === 0) {
                console.warn('[TimelineDistribution] No timeline data generated after processing');
                return [];
            }

            // Update total items count, including the initial baseline
            totalItems = timelineData[timelineData.length - 1]?.total || initialBaseline;
            // Calculate the growth since the start date
            growthSinceStart = totalItems - initialBaseline;

            // Calculate max values for scaling
            maxMonthlyCount = Math.max(...timelineData.map(d => d.count));
            maxTotalCount = Math.max(...timelineData.map(d => d.total));
        
            return timelineData;
        } catch (error) {
            console.error('[TimelineDistribution] Error processing timeline data:', error);
            return [];
        }
    }
    
    // Generate facet options using the data processing hook
    function generateFacetOptions() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        console.log('[TimelineDistribution] Generating facet options with filters:', 
            { country: selectedCountry, type: selectedType });
        
        // Filter items for country facet (apply only type filter)
        const itemsForCountryFacet = countryFacetHook.filterItems($itemsStore.items);
        
        // Filter items for type facet (apply only country filter)
        const itemsForTypeFacet = typeFacetHook.filterItems($itemsStore.items);
        
        console.log('[TimelineDistribution] Items for country facets:', itemsForCountryFacet.length);
        console.log('[TimelineDistribution] Items for type facets:', itemsForTypeFacet.length);
        
        // Generate country options
        const countryData = countryFacetHook.groupAndCount(
            itemsForCountryFacet,
            item => item.country || 'Unknown',
            itemsForCountryFacet.length
        );

        countryOptions = [
            { value: 'all', label: t('country.all'), count: itemsForCountryFacet.length },
            ...countryData
                .filter(item => item.key !== 'Unknown')
                .map(item => ({
                    value: item.key,
                    label: t(`country.${item.key}`),
                    count: item.count
                }))
                .sort((a, b) => b.count - a.count)
        ];

        // Generate type options
        const typeData = typeFacetHook.groupAndCount(
            itemsForTypeFacet,
            item => item.type || 'Unknown',
            itemsForTypeFacet.length
        );

        typeOptions = [
            { value: 'all', label: t('type.all'), count: itemsForTypeFacet.length },
            ...typeData
                .filter(item => item.key !== 'Unknown' && item.count > 0)  // Filter out empty categories
                .map(item => ({
                    value: item.key,
                    label: t(`type.${item.key}`),
                    count: item.count
                }))
                .sort((a, b) => b.count - a.count)
        ];
        
        console.log('[TimelineDistribution] Updated facet options:', { 
            countryOptions: countryOptions.length,
            typeOptions: typeOptions.length
        });
    }

    // Update when filters change, but only if initialized
    $: if (isInitialized && (selectedCountry || selectedType)) {
        debounceUpdate();
    }
</script>

<div class="w-full h-full flex flex-col gap-md">
    <BaseVisualization
        title="Growth of the Database"
        titleHtml={titleHtml}
        descriptionTranslationKey={timelineDescriptionKey}
        theme="default"
        className="timeline-visualization"
    >
        <div class="flex flex-wrap gap-md p-md bg-card rounded-t border-b border-solid border-default filters glass-overlay">
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
                {#if timelineData && timelineData.length > 0}
                    <span>{$showingItemsOverMonthsText.replace('{0}', formatNumber(totalItems)).replace('{1}', timelineData.length.toString())}</span>
                {/if}
            </div>
        </div>
        
        <div 
            class="flex-1 relative min-h-500 bg-card rounded-b p-md chart-container chart-modern overflow-hidden"
            style="height: 500px;"
            bind:this={container}
        >
            {#if !$itemsStore}
                <div class="absolute inset-center text-error">Store not available</div>
            {:else if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">
                    <div class="loading-spinner mr-sm"></div>
                    <span>{t('ui.loading')}</span>
                </div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {:else if !isInitialized}
                <div class="absolute inset-center text-secondary">
                    <div class="loading-spinner mr-sm"></div>
                    <span>Initializing visualization...</span>
                </div>
            {:else if !timelineData || timelineData.length === 0}
                <div class="absolute inset-center text-secondary">{$noDataText}</div>
            {/if}
        </div>
        
        <div class="grid grid-cols-2 gap-md p-md bg-card rounded shadow mt-md stats">
            {#if timelineData && timelineData.length > 0}
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
            {:else}
                <div class="p-md col-span-2 text-center text-secondary">
                    {$noDataText}
                </div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    /* Modern styling for timeline distribution */
    .filter-group {
        min-width: 200px;
    }
    
    /* Modern filter styling */
    .filters {
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid var(--color-border-light);
        transition: all var(--transition-fast);
    }
    
    /* Modern chart container with enhanced styling */
    .chart-container {
        min-height: 400px;
        height: 500px;
        width: 100%;
        transition: box-shadow var(--transition-fast);
    }
    
    .chart-container:hover {
        box-shadow: var(--shadow-xl);
    }
    
    /* Modern timeline chart styling */
    :global(.timeline-chart.timeline-modern) {
        background: var(--color-bg-card);
    }
    
    :global(.timeline-modern .timeline-bar) {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        transition: all var(--transition-fast);
    }
    
    :global(.timeline-modern .timeline-bar:hover) {
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
        transform: scaleY(1.02);
    }
    
    :global(.timeline-modern .axis-modern text) {
        fill: var(--color-text-secondary);
        font-size: var(--font-size-sm);
    }
    
    :global(.timeline-modern .grid line) {
        stroke: var(--color-border-light);
        stroke-dasharray: 2,2;
        opacity: 0.6;
    }
    
    /* Modern select and form styling */
    .filter-group select {
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }
    
    .filter-group select:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-primary-light);
    }
    
    .filter-group select:focus {
        box-shadow: var(--shadow-glow);
        border-color: var(--color-primary);
        outline: none;
    }
    
    /* Modern stats cards */
    .stats {
        background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-card-alt) 100%);
        border: 1px solid var(--color-border-light);
        box-shadow: var(--shadow-md);
        transition: all var(--transition-fast);
    }
    
    .stats:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
    }
    
    .stat-summary, .peak-months {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(4px);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
    }
    
    .stat-summary:hover, .peak-months:hover {
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-1px);
    }
    
    /* Loading spinner with modern styling */
    .loading-spinner {
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        border: 3px solid var(--color-border-light);
        border-radius: 50%;
        border-top-color: var(--color-primary);
        animation: spin 1s ease-in-out infinite;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* Modern loading and error states */
    :global(.absolute.inset-center) {
        padding: var(--spacing-lg);
        border-radius: var(--radius-md);
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--shadow-md);
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