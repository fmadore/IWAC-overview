<!--
  WordDistribution Component - Refactored to use Modular Treemap API
  
  This component has been updated to use the new modular TreemapVisualization class
  instead of the legacy TreemapService.createTreemap() method.
  
  Key improvements:
  - Better separation of concerns with modular architecture
  - Type-safe configuration with TreemapConfiguration
  - Proper cleanup and memory management
  - More maintainable and testable code structure
  
  Migration changes:
  - TreemapService.createTreemap() → TreemapVisualization class
  - Options object → TreemapConfiguration interface
  - Added proper cleanup with treemapVisualization.destroy()
  - Improved configuration management with updateConfig()
-->

<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import itemsStore from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';
    import WordDistributionSummary from './WordDistributionSummary.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { TreemapVisualization, type TreemapNode, type TreemapConfiguration } from '../../services/treemap/index';
    import { createWordDistributionHierarchy } from '../../utils/dataTransformers';
    import { getColorPalette } from '../../utils/colorPalette';

    const COMPONENT_ID = 'WordDistributionRefactored';
    let isMounted = false;
    let unsubscribeItems: () => void;

    // Visualization state
    let container: HTMLDivElement;
    let width = 0;
    let height = 0;
    let totalWordCount = 0;
    let totalItems = 0;
    let hierarchyData: TreemapNode = { name: 'root', children: [] };
    let zoomedNode: d3.HierarchyNode<TreemapNode> | null = null;
    let grandTotalWordCount = 0;
    let titleHtml = '';
    let currentLang: 'en' | 'fr' = 'en';
    // Store country colors to maintain consistency when zooming - use modern palette
    let countryColors: Map<string, string> = new Map();
    
    // Treemap visualization instance
    let treemapVisualization: TreemapVisualization | null = null;
    
    // Initialize professional color palette and create D3 scale
    const modernColors = getColorPalette('professional');
    const colorScale = d3.scaleOrdinal<string>().range(modernColors);
    
    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip({
        maxWidth: '250px'
    });
    
    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;
    
    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const wordDistributionText = translate('viz.word_distribution');
    const totalWordsText = translate('viz.total_words');
    const avgWordsPerItemText = translate('viz.avg_words_per_item');
    const clickZoomInText = translate('viz.click_zoom_in');
    const clickZoomOutText = translate('viz.click_zoom_out');
    const unknownText = translate('viz.unknown');
    const noSetText = translate('viz.no_set');
    const backToAllText = translate('viz.back_to_all');
    const totalItemsWithWordCountText = translate('viz.total_items_with_word_count');
    const wordsText = translate('viz.words');
    const itemsText = translate('viz.items');
    const percentOfCountryText = translate('viz.percent_of_country');
    const percentOfTotalText = translate('viz.percent_of_total');
    const itemSetSummaryText = translate('viz.item_set_summary');

    // Initialize data processing hook
    const { filterItems } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['word_count', 'country'],
        filterFn: (item: OmekaItem): boolean => 
            !!(item.word_count !== undefined && item.word_count > 0 && item.country)
    });

    // Function to format numbers with spaces as thousands separator
    function formatNumber(num: number): string {
        // Use locale-specific formatting
        return num.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
    }

    // Function to update the title HTML
    function updateTitleHtml() {
        if (totalItems > 0) {
            // Show "Distribution of X words by country and sub-collection"
            if (currentLang === 'en') {
                titleHtml = `Distribution of ${formatNumber(totalWordCount)} ${$wordsText} by country and sub-collection`;
            } else {
                titleHtml = `Répartition de ${formatNumber(totalWordCount)} ${$wordsText} par pays et sous-collection`;
            }
        } else {
            titleHtml = t('viz.word_distribution');
        }
    }

    // Update zoomed node title
    function updateZoomedNodeTitle() {
        if (!zoomedNode) return;
        
        if (currentLang === 'en') {
            titleHtml = `${zoomedNode.data.name}: ${formatNumber(zoomedNode.data.wordCount || 0)} ${$wordsText}`;
        } else {
            titleHtml = `${zoomedNode.data.name}: ${formatNumber(zoomedNode.data.wordCount || 0)} ${$wordsText}`;
        }
    }

    // Process data using the external transformer with modern colors
    function prepareVisualizationData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) {
            totalItems = 0;
            totalWordCount = 0;
            updateTitleHtml();
            return { name: 'root', children: [] };
        }

        const hierarchy = createWordDistributionHierarchy($itemsStore.items);

        // Assign modern colors to countries
        if (hierarchy.children) {
            hierarchy.children.forEach((country: TreemapNode, index: number) => {
                if (!countryColors.has(country.name)) {
                    const colorIndex = index % modernColors.length;
                    countryColors.set(country.name, modernColors[colorIndex]);
                }
            });
        }

        // Recalculate totals based on the processed hierarchy root
        totalItems = hierarchy.children?.reduce((sum: number, country: TreemapNode) => sum + (country.itemCount || 0), 0) || 0;
        totalWordCount = hierarchy.children?.reduce((sum: number, country: TreemapNode) => sum + (country.wordCount || 0), 0) || 0;
        
        // Store the grand total when data is first processed
        grandTotalWordCount = totalWordCount;

        updateTitleHtml();
        return hierarchy;
    }

    // Zoom to a node
    function zoomToNode(node: d3.HierarchyNode<TreemapNode> | null) {
        zoomedNode = node;
        
        if (zoomedNode) {
            // Update summary statistics for the zoomed node
            totalItems = zoomedNode.data.itemCount || 0;
            totalWordCount = zoomedNode.data.wordCount || 0;
            
            // Update title for zoomed node
            updateZoomedNodeTitle();
        } else {
            // Reset to global statistics when zooming out
            if ($itemsStore.items && $itemsStore.items.length > 0) {
                // Use filterItems from the hook to get filtered items
                const filteredItems = filterItems($itemsStore.items);
                
                totalItems = filteredItems.length;
                totalWordCount = filteredItems.reduce((sum, item) => sum + (item.word_count || 0), 0);
            }
            
            // Update title for main view
            updateTitleHtml();
        }
        
        updateVisualization();
    }

    // Handle tooltip display
    function handleShowTooltip(event: MouseEvent, d: d3.HierarchyNode<TreemapNode>) {
        try {
            if (!event) {
                logDebug(COMPONENT_ID, 'Event object is undefined in handleShowTooltip');
                return;
            }
            
            const country = d.parent ? d.parent.data.name : d.data.name;
            const itemSet = d.parent ? d.data.name : 'All';
            const wordCount = d.data.wordCount || 0;
            const itemCount = d.data.itemCount || 0;
            const avgWordsPerItem = itemCount > 0 ? Math.round(wordCount / itemCount) : 0;
            
            const countryWordCount = zoomedNode ? zoomedNode.data.wordCount : (d.parent ? d.parent.data.wordCount : 0);
            const percentOfCountry = countryWordCount && countryWordCount > 0 ? 
                ((wordCount / countryWordCount) * 100).toFixed(1) + '%' : 'N/A';
                
            const percentOfTotal = grandTotalWordCount > 0 ? 
                ((wordCount / grandTotalWordCount) * 100).toFixed(1) + '%' : 'N/A';
            
            const content = createGridTooltipContent(
                `${country} > ${itemSet}`,
                [
                    { label: $wordsText, value: wordCount.toLocaleString() },
                    { label: $itemsText, value: itemCount },
                    { label: $avgWordsPerItemText, value: avgWordsPerItem },
                    { label: $percentOfCountryText, value: percentOfCountry },
                    { label: $percentOfTotalText, value: percentOfTotal }
                ]
            );
            
            showTooltip(event, content, 250, 150);
            
            logDebug(COMPONENT_ID, 'Tooltip shown', { 
                country, 
                itemSet
            });
        } catch (e) {
            console.error('Error showing tooltip:', e);
            logDebug(COMPONENT_ID, 'Error showing tooltip', e);
        }
    }

    // Create or update the visualization using the new modular API
    // MIGRATION NOTE: Updated from TreemapService.createTreemap() to TreemapVisualization class
    // Benefits: Better separation of concerns, improved configuration management, easier testing
    function updateVisualization(dataToRender: TreemapNode = hierarchyData) {
        try {
            if (!container) {
                console.error('Container element not found');
                return;
            }
            
            // Use the passed data, handle empty case
            if (!dataToRender.children || dataToRender.children.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary')
                    .text($noDataText);
                return;
            }
            
            // Create or update treemap using the new modular API
            if (!treemapVisualization) {
                // Create new visualization instance with modern configuration
                const config: Partial<TreemapConfiguration> = {
                    container,
                    dimensions: {
                        width: container.clientWidth,
                        height: 500, // Explicitly set fixed height
                        margin: { top: 10, right: 10, bottom: 10, left: 10 }
                    },
                    style: {
                        colors: colorScale,
                        padding: { outer: 3, top: 16, inner: 1 },
                        labelOptions: {
                            parentLabel: {
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'bold',
                                color: 'white'
                            },
                            childLabel: {
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-primary)',
                                minWidth: 30,
                                minHeight: 20
                            }
                        },
                        colorMap: countryColors
                    },
                    navigation: {
                        useBreadcrumbs: true,
                        rootName: currentLang === 'en' ? 'All' : 'Tous',
                        showZoomButton: true
                    },
                    behavior: {
                        minSizeThreshold: 0.001,
                        enableZoom: true,
                        enableTooltips: true,
                        responsive: false
                    },
                    callbacks: {
                        onTooltipShow: handleShowTooltip,
                        onTooltipHide: hideTooltip,
                        onZoom: (node: d3.HierarchyNode<TreemapNode> | null) => {
                            zoomToNode(node);
                        }
                    },
                    currentZoomedNode: zoomedNode
                };
                
                treemapVisualization = new TreemapVisualization(container, config);
            } else {
                // Update existing visualization configuration
                treemapVisualization.updateConfig({
                    callbacks: {
                        onTooltipShow: handleShowTooltip,
                        onTooltipHide: hideTooltip,
                        onZoom: (node: d3.HierarchyNode<TreemapNode> | null) => {
                            zoomToNode(node);
                        }
                    },
                    currentZoomedNode: zoomedNode,
                    style: {
                        colors: colorScale,
                        colorMap: countryColors,
                        padding: { outer: 3, top: 16, inner: 1 },
                        labelOptions: {
                            parentLabel: {
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'bold',
                                color: 'white'
                            },
                            childLabel: {
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-primary)',
                                minWidth: 30,
                                minHeight: 20
                            }
                        }
                    },
                    navigation: {
                        useBreadcrumbs: true,
                        rootName: currentLang === 'en' ? 'All' : 'Tous',
                        showZoomButton: true
                    }
                });
            }
            
            // Render the visualization
            treemapVisualization.render(dataToRender);
            
            logDebug(COMPONENT_ID, 'Visualization updated successfully', { 
                itemCount: dataToRender.children?.length || 0,
                isZoomed: !!zoomedNode
            });
        } catch (e) {
            console.error('Error in updateVisualization:', e);
        }
    }

    function handleItemsChange(items: any) {
        if (!isMounted || !container) return;
        
        logDebug(COMPONENT_ID, 'Items store changed', { itemCount: items?.length || 0 });
        
        // Only update if the component is still mounted and not zoomed
        if (document.body.contains(container)) {
            if (!zoomedNode) {
                hierarchyData = prepareVisualizationData(); // Recalculate data
                updateVisualization(hierarchyData); // Update with new data
            } else {
                // If zoomed, we might need to update if the underlying data changes
                // For simplicity now, we only update if the zoom level changes or language changes
                // A more complex approach might recalculate the zoomed view based on new items
                // updateVisualization(hierarchyData); // Re-render potentially stale zoomed view
            }
        }
    }

    onMount((): (() => void) => {
        try {
            isMounted = true;
            trackMount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component mounted');
            
            // Use tick() in a separate function to avoid Promise return type issues
            const initialize = async (): Promise<() => void> => {
                await tick();
                
                if (!container) {
                    console.error('Container element not found in onMount');
                    return () => {}; // Return empty cleanup function for this path
                }
                
                // Initialize resize hook
                resizeHook = useD3Resize({
                    container,
                    onResize: () => {
                        if (isMounted && container) {
                            // Only update width, keep height fixed at 500px to prevent expansion
                            const { width: newWidth } = resizeHook.dimensions;
                            width = newWidth;
                            height = 500; // Force fixed height
                            updateVisualization();
                        }
                    },
                    debounce: true,
                    debounceDelay: 300 // Increase debounce delay to prevent frequent updates
                });
                
                // Set initial dimensions
                width = container.clientWidth;
                height = Math.min(container.clientHeight, 500); // Ensure height is capped

                // Add language subscription here
                const languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    currentLang = value;
                    
                    // Update title when language changes
                    if (zoomedNode) {
                        updateZoomedNodeTitle();
                    } else {
                        updateTitleHtml();
                    }
                    
                    // Update visualization if needed
                    if (container && document.body.contains(container)) {
                        updateVisualization();
                    }
                });
                
                // Subscribe to the items store
                unsubscribeItems = itemsStore.subscribe(store => {
                    handleItemsChange(store.items);
                });
                
                // Create visualization if data is available
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    hierarchyData = prepareVisualizationData(); // Initial data prep
                    updateVisualization(hierarchyData);
                } else {
                    // Load items if not already loaded
                    itemsStore.loadItems();
                }
                
                // Return cleanup function
                return () => {
                    try {
                        // This cleanup function is called when the component is unmounted
                        isMounted = false;
                        trackUnmount(COMPONENT_ID);
                        logDebug(COMPONENT_ID, 'Component cleanup started');
                        
                        // Clean up treemap visualization
                        if (treemapVisualization) {
                            treemapVisualization.destroy();
                            treemapVisualization = null;
                            logDebug(COMPONENT_ID, 'Treemap visualization cleaned up');
                        }
                        
                        // Clean up D3 selections to prevent memory leaks
                        if (container) {
                            d3.select(container).selectAll('*').remove();
                            logDebug(COMPONENT_ID, 'D3 selections removed');
                        }
                        
                        // Clean up resize hook
                        if (resizeHook) {
                            resizeHook.cleanup();
                            logDebug(COMPONENT_ID, 'Resize hook cleaned up');
                        }
                        
                        // Clean up store subscriptions
                        if (unsubscribeItems) {
                            unsubscribeItems();
                            logDebug(COMPONENT_ID, 'Unsubscribed from items store');
                        }

                        // Clean up language subscription
                        if (languageUnsubscribe) {
                            languageUnsubscribe();
                            logDebug(COMPONENT_ID, 'Unsubscribed from language store');
                        }
                        
                        logDebug(COMPONENT_ID, 'Component cleanup completed');
                    } catch (e) {
                        console.error('Error during cleanup:', e);
                    }
                };
            };
            
            // Start initialization and return its result
            const cleanup = initialize();
            return () => {
                cleanup.then(cleanupFn => cleanupFn());
            };
        } catch (e) {
            console.error('Error in onMount:', e);
            return () => {}; // Return empty cleanup function in case of error
        }
    });
    
    onDestroy(() => {
        // This is a backup in case the cleanup function in onMount doesn't run
        if (isMounted) {
            isMounted = false;
            trackUnmount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component destroyed (backup cleanup)');
            
            try {
                // Clean up treemap visualization
                if (treemapVisualization) {
                    treemapVisualization.destroy();
                    treemapVisualization = null;
                    logDebug(COMPONENT_ID, 'Treemap visualization cleaned up (backup)');
                }
                
                // Clean up resize hook
                if (resizeHook) {
                    resizeHook.cleanup();
                    logDebug(COMPONENT_ID, 'Resize hook cleaned up (backup)');
                }
                
                // Clean up store subscriptions
                if (unsubscribeItems) {
                    unsubscribeItems();
                    logDebug(COMPONENT_ID, 'Unsubscribed from items store (backup)');
                }
            } catch (e) {
                console.error('Error during backup cleanup:', e);
            }
        }
    });
</script>

<div class="w-full h-full flex flex-col gap-md">
    <BaseVisualization
        title=""
        translationKey=""
        description="This visualization shows the distribution of words across items by country and collection. The size of each block represents the word count in that country or collection."
        descriptionTranslationKey="viz.word_distribution_description"
        {titleHtml}
        className="word-visualization-compact-header"
    >
        <div 
            class="flex-1 min-h-500 relative overflow-hidden bg-card rounded shadow chart-modern" 
            bind:this={container}
            style="height: 500px; max-height: 500px;"
        >
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
            <!-- SVG will be rendered here by TreemapService -->
        </div>
        
        <!-- Use the new summary component -->
        <WordDistributionSummary 
            {totalItems}
            {totalWordCount}
            {zoomedNode}
            {formatNumber}
        />
        
    </BaseVisualization>
</div>

<style>
    /* Modern styling for word distribution treemap */
    
    /* Enhanced chart container with modern effects */
    :global(.chart-modern) {
        transition: all var(--transition-normal) var(--ease-out);
        border: 1px solid var(--color-border-light);
    }
    
    :global(.chart-modern:hover) {
        box-shadow: var(--shadow-xl);
        transform: translateY(-2px);
    }
    
    /* Modern treemap styling */
    :global(.treemap-rect-modern) {
        stroke: var(--color-bg-card);
        stroke-width: 2;
        rx: 4;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
        transition: all var(--transition-fast) var(--ease-out);
    }
    
    :global(.treemap-rect-modern:hover) {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        stroke-width: 3;
        transform: scale(1.02);
    }
    
    /* Modern text styling for treemap labels */
    :global(.treemap-text) {
        font-weight: var(--font-weight-medium);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        pointer-events: none;
    }
    
    /* Modern breadcrumb styling */
    :global(.breadcrumb-nav) {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        padding: var(--spacing-xs) var(--spacing-sm);
        box-shadow: var(--shadow-sm);
        backdrop-filter: blur(4px);
    }
    
    :global(.breadcrumb-link) {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: var(--font-weight-medium);
        transition: color var(--transition-fast);
    }
    
    :global(.breadcrumb-link:hover) {
        color: var(--color-primary-dark);
        text-decoration: underline;
    }
    
    /* Modern loading and error states */
    :global(.absolute.inset-center) {
        padding: var(--spacing-lg);
        border-radius: var(--radius-md);
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--shadow-md);
        font-weight: var(--font-weight-medium);
    }
    
    /* Enhanced tooltip styling for treemap */
    :global(.tooltip-modern) {
        background: rgba(26, 32, 44, 0.95);
        backdrop-filter: blur(8px);
        color: var(--color-text-light);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        font-size: var(--font-size-sm);
        padding: var(--spacing-sm) var(--spacing-md);
    }
    
    /* Modern zoom controls */
    :global(.zoom-out-button) {
        background: var(--color-primary);
        color: var(--color-text-light);
        border: none;
        border-radius: var(--radius-md);
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }
    
    :global(.zoom-out-button:hover) {
        background: var(--color-primary-dark);
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
    }
    
    /* Animation for treemap elements */
    :global(.treemap-rect) {
        animation: fadeInScale var(--transition-normal) var(--ease-out);
    }
    
    @keyframes fadeInScale {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>