<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { D3Service } from '../../services/d3Service';
    import { createBarChart, BarChartUtils, type BarData, type BarChartResult } from '../../services/barChart';

    // Define interfaces for data structures
    interface CategoryCount {
        category: string;
        originalCategory: string;
        count: number;
        percentage: number;
    }

    // Map French item_set_title to category keys
    const categoryMappings: Record<string, string> = {
        'Évènements': 'Events',
        'Associations': 'Organizations',
        'Individus': 'Persons',
        'Emplacements': 'Locations',
        'Sujets': 'Topics',
        'Notices d\'autorité': 'Authority Files'
    };

    // Function to map item set title to the correct category key
    function mapToCategory(itemSetTitle: string): string {
        // Return mapped category if exists, otherwise return original
        return categoryMappings[itemSetTitle] || itemSetTitle;
    }

    // States
    let categoryCounts: CategoryCount[] = [];
    let totalItems: number = 0;
    let maxCount: number = 0;
    let isMounted = false;
    
    // Visualization variables
    let container: HTMLDivElement;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    let width = 0;
    let height = 0;
    let barChartInstance: BarChartResult | null = null;

    // Reference to BaseVisualization component to access its tooltip functions
    let baseVisualization: BaseVisualization;

    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;

    // Initialize data processing hook with custom filter function
    const { filterItems, groupAndCount } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['type'],
        filterFn: (item: OmekaItem) => item.type === "Notice d'autorité",
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
    });

    // Define translation keys
    const indexDescriptionKey = 'viz.index_distribution_description';

    // Create a reused color scale
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
        return t('viz.index_distribution_items', { '0': formattedCount });
    }
    
    // Update title HTML when needed
    function updateTitleHtml() {
        if (!isMounted) return;
        
        if (totalItems > 0) {
            titleHtml = getTitle(totalItems);
        } else {
            titleHtml = t('viz.index_distribution_title');
        }
    }

    // Subscribe to language changes
    let languageUnsubscribe: () => void;

    onMount(async () => {
        try {
            // Set mounted flag first
            isMounted = true;
            
            // Wait for the next tick to ensure container is bound
            await tick();
            
            // Double check container after tick
            if (!container) {
                console.error('Container element not found in onMount');
                return;
            }
            
            // Get initial dimensions
            const rect = container.getBoundingClientRect();
            width = rect.width || 100;  // Provide fallback width
            height = rect.height || 400; // Provide fallback height
            
            // Initialize resize hook
            resizeHook = useD3Resize({
                container,
                onResize: () => {
                    if (isMounted && container) {
                        // Only update width, keep height fixed
                        width = resizeHook.width;
                        // Don't change height to avoid unwanted resizing
                        renderBarChart();
                    }
                },
                debounce: true,
                debounceDelay: 200 // Longer debounce to avoid frequent updates
            });
            
            // Subscribe to language changes
            languageUnsubscribe = languageStore.subscribe(value => {
                if (!isMounted) return;
                currentLang = value;
                
                if (container) {
                    updateTitleHtml();
                    
                    if ($itemsStore.items && $itemsStore.items.length > 0) {
                        renderBarChart();
                    }
                }
            });
            
            // Initialize data
            if ($itemsStore.items && $itemsStore.items.length > 0) {
                renderBarChart();
            } else {
                // Load items if not already loaded
                itemsStore.loadItems();
            }
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    });

    // Create bar chart visualization using the new BarChart service
    function renderBarChart() {
        if (!isMounted || !container) return;
        
        try {
            // Get dimensions from container
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = 500; // Fixed height
            
            // Process data with current filters
            const data = processData();
            if (!data || data.length === 0) {
                D3Service.handleNoData(container, t('viz.no_data'));
                return;
            }
            
            // Update categoryCounts for reactive updates
            categoryCounts = data;
            
            // Check if mobile view (width < 768px)
            const isMobile = width < 768;
            
            // Clean up previous chart if it exists
            if (barChartInstance) {
                barChartInstance.destroy();
                barChartInstance = null;
            }
            
            // Convert data to BarData format
            const barData: BarData[] = data.map(item => ({
                key: item.category,
                value: item.count,
                originalKey: item.originalCategory,
                percentage: item.percentage
            }));
            
            // Calculate margins based on data - use more space if we have many categories
            const hasManyCatetgories = data.length > 5;
            const margin = {
                top: 20,
                right: 30,
                // Use larger bottom margin to ensure x-axis labels are visible
                bottom: 150, 
                left: 60
            };
            
            // Create the bar chart with the BarChart service
            barChartInstance = createBarChart({
                container,
                width,
                height,
                data: barData,
                margin,
                className: 'index-distribution-chart',
                isMobile,
                barColors: colorScale,
                barPadding: 0.2,
                barCornerRadius: 3,
                xAxisLabel: t('viz.categories'),
                yAxisLabel: t('viz.number_of_items'),
                // Steeper angle for better label display
                xAxisRotation: -70,
                // Limit the number of ticks based on available width
                xAxisTicks: Math.max(3, Math.floor(width / 120)),
                yAxisTicks: isMobile ? 3 : 5,
                // Format axis ticks
                xAxisTickFormat: (d: string) => {
                    // Truncate long category names
                    return d.length > 15 ? d.substring(0, 12) + '...' : d;
                },
                valueFormatter: formatNumber,
                // Event handlers for tooltips
                onBarMouseEnter: (event: MouseEvent, d: BarData) => {
                    const categoryData = categoryCounts.find(c => c.category === d.key);
                    if (categoryData) {
                        handleShowTooltip(event, categoryData);
                    }
                },
                onBarMouseMove: (event: MouseEvent, d: BarData) => {
                    const categoryData = categoryCounts.find(c => c.category === d.key);
                    if (categoryData) {
                        handleShowTooltip(event, categoryData);
                    }
                },
                onBarMouseLeave: () => {
                    if (baseVisualization) {
                        baseVisualization.hideTooltip();
                    }
                }
            });
            
        } catch (e) {
            console.error('Error creating bar chart:', e);
        }
    }
    
    // Process data to get index items by category
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        console.log(`Processing ${$itemsStore.items.length} items`);
        
        // Filter items of type "Notice d'autorité" first
        const filteredItems = $itemsStore.items.filter(item => item.type === "Notice d'autorité");
        console.log(`Found ${filteredItems.length} items of type "Notice d'autorité"`);
        
        if (filteredItems.length === 0) return [];
        
        // Group items by item_set_title
        const results = groupAndCount(
            filteredItems,
            item => item.item_set_title || t('viz.uncategorized')
        );
        
        console.log(`Grouped into ${results.length} categories`);
        
        // Transform results to match our CategoryCount interface
        const categoryCounts: CategoryCount[] = results.map(result => {
            // Map the item_set_title to the correct category key first
            const mappedCategory = mapToCategory(result.key);
            // Then build the translation key
            const categoryKey = `category.${mappedCategory}`;
            // Use the translation store's t function to get the proper translation
            const translatedCategory = t(categoryKey);
            
            return {
                // Only use the translated string if it exists, otherwise use the original key
                category: translatedCategory !== categoryKey ? translatedCategory : result.key,
                originalCategory: result.key,
                count: result.count,
                percentage: result.percentage || 0
            };
        });
        
        // Update state
        totalItems = results.reduce((sum, r) => sum + r.count, 0);
        maxCount = d3.max(categoryCounts, d => d.count) || 0;
        updateTitleHtml();
        
        return categoryCounts;
    }

    // Show tooltip with category information
    function handleShowTooltip(event: MouseEvent, d: CategoryCount) {
        if (!isMounted || !baseVisualization) return;
        
        const content = baseVisualization.createGridTooltipContent(
            d.category,
            [
                { label: t('viz.items'), value: formatNumber(d.count) },
                { label: t('viz.percent_of_total'), value: `${d.percentage.toFixed(2)}%` }
            ]
        );
        
        baseVisualization.showTooltip(event, content);
    }

    // Update visualization when data changes
    $: if (isMounted && $itemsStore.items && container) {
        renderBarChart();
    }

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
            
            if (barChartInstance) {
                barChartInstance.destroy();
                barChartInstance = null;
            }
            
            if (container) {
                d3.select(container).selectAll('*').remove();
            }
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    });
</script>

<div class="w-full index-visualization-container">
    <BaseVisualization
        titleHtml={titleHtml}
        descriptionTranslationKey={indexDescriptionKey}
        theme="default"
        className="index-visualization"
        bind:this={baseVisualization}
    >
        <div class="chart-container relative bg-card rounded p-md overflow-hidden" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    :global(.index-distribution-chart) {
        height: 100%;
    }
    
    :global(.index-distribution-chart text) {
        font-family: var(--font-family-base);
        font-size: var(--font-size-xs);
    }
    
    :global(.index-distribution-chart .x-axis text) {
        text-anchor: end;
        font-size: var(--font-size-xs);
        fill: var(--color-text-secondary);
    }
    
    :global(.index-distribution-chart .y-axis text) {
        font-size: var(--font-size-xs);
        fill: var(--color-text-secondary);
    }
    
    :global(.index-distribution-chart .x-axis-label, .index-distribution-chart .y-axis-label) {
        font-size: var(--font-size-sm);
        fill: var(--color-text-secondary);
        font-weight: var(--font-weight-medium);
    }
    
    :global(.index-distribution-chart .bar-label) {
        font-size: var(--font-size-xs);
        fill: var(--color-text-secondary);
    }
    
    /* Set fixed height for chart container */
    .chart-container {
        height: 500px;
    }
</style> 