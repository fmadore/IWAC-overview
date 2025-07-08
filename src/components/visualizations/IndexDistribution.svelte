<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import itemsStore from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import VisualizationHeader from '../ui/VisualizationHeader.svelte';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { EChartsBarService, type BarChartData } from '../../services/EChartsBarService';
    import { getColorPalette } from '../../utils/colorPalette';

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

    // Svelte 5 runes for reactive state
    let categoryCounts = $state<CategoryCount[]>([]);
    let totalItems = $state<number>(0);
    let maxCount = $state<number>(0);
    let isMounted = $state<boolean>(false);
    
    // Visualization variables
    let container: HTMLDivElement;
    let currentLang = $state<'en' | 'fr'>('en');
    let titleHtml = $state<string>('');
    let barChartService: EChartsBarService | null = null;

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

    // Get modern color palette - use a more vibrant palette
    const modernColors = getColorPalette('professional');

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

    onMount(() => {
        // Set mounted flag first
        isMounted = true;
        
        // Initialize chart after mount
        renderBarChart();
        
        // Add additional resize listener to ensure proper handling
        const handleResize = () => {
            if (barChartService && isMounted) {
                barChartService.resize();
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    // Reactive effect for language changes
    $effect(() => {
        currentLang = $languageStore;
        console.log('Language changed to:', currentLang);
        if (isMounted) {
            updateTitleHtml();
            // Dispose and recreate chart when language changes to update axis labels
            if (barChartService) {
                barChartService.dispose();
                barChartService = null;
            }
            renderBarChart();
        }
    });

    // Reactive effect for items store changes
    $effect(() => {
        if (isMounted && $itemsStore.items && $itemsStore.items.length > 0) {
            renderBarChart();
        }
    });

    // Create bar chart visualization using ECharts
    function renderBarChart() {
        if (!isMounted || !container) return;
        
        try {
            // Process data with current filters
            const data = processData();
            if (!data || data.length === 0) {
                // Clear container and show no data message
                container.innerHTML = `<div class="flex items-center justify-center h-full text-secondary">${t('viz.no_data')}</div>`;
                return;
            }
            
            // Update categoryCounts for reactive updates
            categoryCounts = data;
            
            // Convert data to BarChartData format
            const barData: BarChartData[] = data.map(item => ({
                key: item.category,
                value: item.count,
                originalKey: item.originalCategory,
                percentage: item.percentage
            }));
            
            // Initialize or update chart service
            if (!barChartService) {
                barChartService = new EChartsBarService(container, {
                    colors: modernColors,
                    responsive: true,
                    xAxisLabel: t('viz.categories'),
                    yAxisLabel: t('viz.number_of_items'),
                    valueFormatter: formatNumber
                });
                
                // Render the chart
                barChartService.render(barData);
            } else {
                // Update existing chart with new data
                barChartService.updateData(barData);
            }
            
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
        maxCount = Math.max(...categoryCounts.map(d => d.count));
        updateTitleHtml();
        
        return categoryCounts;
    }

    // Add onDestroy to ensure cleanup
    onDestroy(() => {
        try {
            isMounted = false;
            
            if (barChartService) {
                barChartService.dispose();
                barChartService = null;
            }
            
            if (container) {
                container.innerHTML = '';
            }
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    });
</script>

<div class="w-full index-visualization-container">
    <VisualizationHeader
        title={titleHtml}
        descriptionTranslationKey={indexDescriptionKey}
        descriptionId="index-distribution-description"
        className="index-visualization-header"
    />
    
    <div class="chart-container chart-modern" bind:this={container}>
        {#if $itemsStore.loading}
            <div class="flex items-center justify-center h-full text-secondary loading">
                <div class="chart-skeleton"></div>
            </div>
        {:else if $itemsStore.error}
            <div class="flex items-center justify-center h-full text-error error">
                <div class="bg-error-light rounded-lg p-4 border-l-4 border-error">
                    {$itemsStore.error}
                </div>
            </div>
        {:else if (!$itemsStore.items || $itemsStore.items.length === 0)}
            <div class="flex items-center justify-center h-full text-secondary">
                <div class="bg-info-light rounded-lg p-4 border-l-4 border-info">
                    {t('viz.no_data')}
                </div>
            </div>
        {/if}
        <!-- ECharts chart will be rendered here -->
    </div>
</div>

<style>
    /* Modern chart container styling using global CSS variables */
    .index-visualization-container {
        width: 100%;
        position: relative;
    }
    
    .chart-container {
        position: relative;
        background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-card-alt) 100%);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: var(--spacing-lg);
        overflow: hidden;
        min-height: 500px;
        height: 500px;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--color-border-light);
        transition: all var(--transition-fast) var(--ease-out);
    }
    
    .chart-container:hover {
        transform: translateY(-2px);
        box-shadow: 
            var(--shadow-xl),
            0 0 20px rgba(91, 110, 232, 0.15);
        border-color: var(--color-primary-200);
    }
    
    /* Modern loading and error states */
    .loading {
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        background: var(--gradient-primary);
        color: var(--color-text-light);
        font-weight: var(--font-weight-medium);
    }
    
    .error {
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
        font-weight: var(--font-weight-medium);
    }
    
    /* ECharts styling integration with modern design */
    :global(.echarts-tooltip) {
        border-radius: var(--radius-md) !important;
        border: 1px solid var(--color-border-light) !important;
        background: var(--color-bg-card) !important;
        box-shadow: var(--shadow-lg) !important;
        backdrop-filter: blur(8px) !important;
    }
    
    /* Modern chart skeleton animation */
    .chart-skeleton {
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
            var(--color-bg-card) 0%, 
            var(--color-primary-100) 25%,
            var(--color-secondary-100) 50%,
            var(--color-primary-100) 75%,
            var(--color-bg-card) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
        border-radius: var(--radius-md);
        position: relative;
        overflow: hidden;
    }
    
    .chart-skeleton::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        border: 3px solid var(--color-primary-200);
        border-top: 3px solid var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    
    @keyframes spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
    
    /* Responsive adjustments with modern styling */
    @media (max-width: 768px) {
        .chart-container {
            min-height: 400px;
            height: 400px;
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
        }
        
        .chart-container:hover {
            transform: none; /* Disable hover effects on mobile */
        }
    }
    
    @media (max-width: 480px) {
        .chart-container {
            min-height: 350px;
            height: 350px;
            padding: var(--spacing-sm);
        }
    }
    
    /* Add modern gradient overlay for enhanced visual appeal */
    .chart-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
            rgba(91, 110, 232, 0.02) 0%, 
            rgba(255, 107, 157, 0.02) 100%
        );
        pointer-events: none;
        z-index: 1;
    }
    
    /* Ensure chart content is above the gradient */
    .chart-container > :global(*) {
        position: relative;
        z-index: 2;
    }
</style> 