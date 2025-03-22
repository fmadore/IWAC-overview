<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import TreemapService, { type TreemapNode, type TreemapOptions } from '../../services/treemap';

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
    let titleHtml = '';
    let currentLang: 'en' | 'fr' = 'en';
    // Store country colors to maintain consistency when zooming
    let countryColors: Map<string, string> = new Map();
    
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
    const currentlyViewingText = translate('viz.currently_viewing');
    const clickBackText = translate('viz.click_back_to_return');
    const totalItemsWithWordCountText = translate('viz.total_items_with_word_count');
    const summaryText = translate('viz.summary');
    const wordsText = translate('viz.words');
    const itemsText = translate('viz.items');
    const percentOfCountryText = translate('viz.percent_of_country');
    const percentOfTotalText = translate('viz.percent_of_total');
    const itemSetSummaryText = translate('viz.item_set_summary');

    // Initialize data processing hook
    const { filterItems, groupAndCount, groupHierarchically } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['word_count', 'country'],
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
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

    // Process data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return { name: 'root', children: [] };
        
        // Create filter function for the data processing hook
        const filterFn = (item: OmekaItem) => {
            // Must have word_count field and it must be greater than 0
            if (item.word_count === undefined || item.word_count === 0) return false;
            // Must have a valid country value
            if (!item.country) return false;
            return true;
        };

        // Initialize data processing with the filter
        const { filterItems: processWithFilter } = useDataProcessing({
            filterMissingValues: true,
            requiredFields: ['word_count', 'country'],
            filterFn
        });

        // Filter items
        const filteredItems = processWithFilter($itemsStore.items);
        
        // Update total counts
        totalItems = filteredItems.length;
        totalWordCount = filteredItems.reduce((sum, item) => sum + (item.word_count || 0), 0);
        
        // Update title HTML
        updateTitleHtml();
        
        // Create hierarchical structure manually to correctly calculate word counts
        const countryMap = new Map<string, {
            words: number, 
            items: number, 
            sets: Map<string, {words: number, items: number}>
        }>();
        
        // First pass: group and sum word counts by country and set
        filteredItems.forEach(item => {
            const country = item.country || 'Unknown';
            const set = item.item_set_title || 'No Set';
            const wordCount = item.word_count || 0;
            
            // Initialize or update country data
            if (!countryMap.has(country)) {
                countryMap.set(country, {
                    words: 0,
                    items: 0,
                    sets: new Map()
                });
            }
            
            const countryData = countryMap.get(country)!;
            countryData.words += wordCount;
            countryData.items += 1;
            
            // Initialize or update set data
            if (!countryData.sets.has(set)) {
                countryData.sets.set(set, {
                    words: 0,
                    items: 0
                });
            }
            
            const setData = countryData.sets.get(set)!;
            setData.words += wordCount;
            setData.items += 1;
        });
        
        // Convert to hierarchical structure
        const root: TreemapNode = {
            name: 'Word Distribution',
            children: Array.from(countryMap.entries()).map(([countryName, countryData]) => ({
                name: countryName,
                wordCount: countryData.words,
                itemCount: countryData.items,
                children: Array.from(countryData.sets.entries()).map(([setName, setData]) => ({
                    name: setName,
                    value: setData.words, // Use word count as value for treemap sizing
                    wordCount: setData.words,
                    itemCount: setData.items
                }))
            }))
        };

        // Ensure children array exists before sorting
        if (root.children) {
            // Sort countries by word count descending
            root.children.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));

            // Sort item sets within each country by word count descending
            root.children.forEach(country => {
                if (country.children) {
                    country.children.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
                }
            });
        }
        
        return root;
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
                const filteredItems = filterItems($itemsStore.items).filter(item => 
                    item.word_count !== undefined && item.word_count > 0 && item.country
                );
                
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
                
            const percentOfTotal = totalWordCount > 0 ? 
                ((wordCount / totalWordCount) * 100).toFixed(1) + '%' : 'N/A';
            
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

    // Create or update the visualization
    function updateVisualization() {
        try {
            if (!container) {
                console.error('Container element not found');
                return;
            }
            
            // Get fresh data if not zoomed
            if (!zoomedNode) {
                hierarchyData = processData();
            }
            
            if (!hierarchyData.children || hierarchyData.children.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary')
                    .text($noDataText);
                return;
            }
            
            // Create treemap using TreemapService
            TreemapService.createTreemap(hierarchyData, {
                container,
                height: 500, // Explicitly set fixed height
                colorMap: countryColors,
                tooltipCallback: handleShowTooltip,
                zoomCallback: zoomToNode,
                currentZoomedNode: zoomedNode,
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
            });
        } catch (e) {
            console.error('Error in updateVisualization:', e);
        }
    }

    function handleItemsChange(items: any) {
        if (!isMounted || !container) return;
        
        logDebug(COMPONENT_ID, 'Items store changed', { itemCount: items?.length || 0 });
        
        // Only update if the component is still mounted
        if (document.body.contains(container)) {
            updateVisualization();
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
                    updateVisualization();
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
            class="flex-1 min-h-500 relative bg-card rounded shadow" 
            bind:this={container}
            style="height: 500px; max-height: 500px; overflow: hidden; position: relative;"
        >
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="p-md bg-card rounded shadow mt-md">
            <div>
                <h3 class="mt-0 mb-sm text-primary text-md font-medium border-b border-solid border-default pb-xs">{$summaryText}</h3>
                <p class="my-xs text-sm text-secondary">{$totalItemsWithWordCountText}: <strong class="font-medium">{formatNumber(totalItems)}</strong></p>
                <p class="my-xs text-sm text-secondary">{$totalWordsText}: <strong class="font-medium">{formatNumber(totalWordCount)}</strong></p>
                {#if totalItems > 0}
                    <p class="my-xs text-sm text-secondary">{$avgWordsPerItemText}: <strong class="font-medium">{formatNumber(Math.round(totalWordCount / totalItems))}</strong></p>
                {/if}
                {#if zoomedNode}
                    <p class="my-xs text-sm text-secondary">{$currentlyViewingText}: <strong class="font-medium">{zoomedNode.data.name}</strong></p>
                    <p class="my-xs text-sm text-secondary">{$clickBackText}</p>
                {:else}
                    <p class="my-xs text-sm text-secondary">{$clickZoomInText}</p>
                {/if}
            </div>
        </div>
    </BaseVisualization>
</div> 