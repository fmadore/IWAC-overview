<!--
  WordDistribution Component - ECharts Version
  
  Cette version utilise ECharts au lieu de D3, ce qui simplifie considérablement 
  le code tout en offrant plus de fonctionnalités intégrées.
  
  Avantages:
  - Code beaucoup plus simple (~200 lignes vs ~700 lignes)
  - Fonctionnalités intégrées: zoom, navigation, tooltips, breadcrumbs
  - Performance optimisée pour de gros datasets
  - Animation et interactions fluides
  - Maintenance simplifiée
-->

<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import itemsStore from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { translate, languageStore } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';
    import WordDistributionSummary from './WordDistributionSummary.svelte';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { EChartsTreemapService, type EChartsTreemapNode, type EChartsTreemapOptions } from '../../services/treemap/index';
    import { createWordDistributionHierarchy } from '../../utils/dataTransformers';
    import { getColorPalette } from '../../utils/colorPalette';
    import { useStandardVisualizationHeader } from '../../hooks/useVisualizationHeader';

    const COMPONENT_ID = 'WordDistributionECharts';
    
    // Svelte 5 reactive state using $state rune
    let isMounted = $state(false);
    let unsubscribeItems: (() => void) | null = $state(null);

    // Visualization state with $state rune
    let container: HTMLDivElement;
    let width = $state(0);
    let height = $state(0);
    let totalWordCount = $state(0);
    let totalItems = $state(0);
    let hierarchyData = $state<EChartsTreemapNode>({ name: 'root', children: [] });
    let grandTotalWordCount = $state(0);
    
    // ECharts treemap service instance
    let treemapService: EChartsTreemapService | null = $state(null);
    
    // Initialize header management hook
    const headerHook = useStandardVisualizationHeader('word');
    
    // Reactive variables for header using $derived
    const currentLang = $derived(headerHook.currentLang);
    const titleHtml = $derived(headerHook.titleHtml);
    
    // Initialize professional color palette
    const modernColors = getColorPalette('professional');
    
    // Initialize data processing hook
    const { filterItems } = useDataProcessing({});

    // Create reactive translations - translate returns derived stores, so we access them directly
    const noDataText = translate('viz.no_data');
    const loadingText = translate('ui.loading');
    const wordDistributionText = translate('viz.word_distribution');
    const totalWordsText = translate('viz.total_words');
    const avgWordsPerItemText = translate('viz.avg_words_per_item');
    const unknownText = translate('viz.unknown');
    const noSetText = translate('viz.no_set');
    const backToAllText = translate('viz.back_to_all');
    const totalItemsWithWordCountText = translate('viz.total_items_with_word_count');
    const wordsText = translate('viz.words');
    const itemsText = translate('viz.items');
    const percentOfCountryText = translate('viz.percent_of_country');
    const percentOfTotalText = translate('viz.percent_of_total');

    // Helper function to format numbers (delegate to header hook)
    function formatNumber(num: number): string {
        return headerHook.formatNumber(num);
    }

    // Process data using the external transformer
    function prepareVisualizationData() {
        const storeData = $itemsStore;
        const items = storeData.items || [];
        
        logDebug(COMPONENT_ID, 'Preparing visualization data', { 
            itemsLength: items.length,
            storeLoading: storeData.loading,
            storeError: storeData.error
        });
        
        if (!items || items.length === 0) {
            log('No items available for WordDistribution visualization');
            hierarchyData = { name: 'root', children: [] };
            totalWordCount = 0;
            totalItems = 0;
            // Update header with empty data
            headerHook.updateTitle({ 
                totalCount: 0, 
                additionalCount: 0 
            });
            return;
        }

        try {
            // Use the external data transformer
            const result = createWordDistributionHierarchy(items);
            hierarchyData = result;
            
            logDebug(COMPONENT_ID, 'Hierarchy data created', { 
                resultChildren: result.children?.length || 0
            });
            
            // Calculate totals from the hierarchy
            totalWordCount = 0;
            totalItems = 0;
            grandTotalWordCount = 0;
            
            if (result.children) {
                result.children.forEach(country => {
                    if (country.children) {
                        country.children.forEach(set => {
                            totalWordCount += set.wordCount || 0;
                            totalItems += set.itemCount || 0;
                        });
                    }
                });
            }
            grandTotalWordCount = totalWordCount;

            // Update header with current data
            headerHook.updateTitle({ 
                totalCount: totalItems, 
                additionalCount: totalWordCount 
            });
            
            log(`WordDistribution data prepared: ${totalWordCount} words, ${totalItems} items`);
        } catch (error) {
            console.error('Error preparing visualization data:', error);
            hierarchyData = { name: 'root', children: [] };
            totalWordCount = 0;
            totalItems = 0;
            // Update header with empty data
            headerHook.updateTitle({ 
                totalCount: 0, 
                additionalCount: 0 
            });
        }
    }

    // Custom tooltip formatter
    function createTooltip(params: any): string {
        const data = params.data;
        if (!data) return '';

        let tooltip = `<div class="echarts-tooltip">`;
        
        // Afficher différemment selon le niveau hiérarchique
        if (params.treePathInfo && params.treePathInfo.length > 1) {
            // C'est un enfant (collection), afficher pays > collection
            const country = params.treePathInfo[1]?.name || 'Inconnu';
            const collection = data.name;
            tooltip += `<div class="font-semibold text-base mb-2">${country} › ${collection}</div>`;
        } else {
            // C'est un parent (pays)
            tooltip += `<div class="font-semibold text-base mb-2">${data.name}</div>`;
        }
        
        if (data.wordCount !== undefined) {
            const percentOfTotal = grandTotalWordCount > 0 ? ((data.wordCount / grandTotalWordCount) * 100).toFixed(1) : '0';
            tooltip += `<div><span class="text-blue-600">📝</span> ${$wordsText}: <strong>${headerHook.formatNumber(data.wordCount)}</strong> (${percentOfTotal}%)</div>`;
        }
        
        if (data.itemCount !== undefined) {
            tooltip += `<div><span class="text-green-600">📄</span> ${$itemsText}: <strong>${headerHook.formatNumber(data.itemCount)}</strong></div>`;
        }
        
        if (data.wordCount && data.itemCount) {
            const avgWords = Math.round(data.wordCount / data.itemCount);
            tooltip += `<div><span class="text-purple-600">📊</span> Moyenne: <strong>${headerHook.formatNumber(avgWords)}</strong> mots/élément</div>`;
        }

        tooltip += `</div>`;
        return tooltip;
    }

    // Create or update the visualization using ECharts
    function updateVisualization() {
        if (!container) {
            log('Container not available for visualization');
            return;
        }
        
        if (!hierarchyData?.children?.length) {
            log('No hierarchy data available for visualization');
            return;
        }

        try {
            logDebug(COMPONENT_ID, 'Updating visualization', { 
                containerWidth: container.clientWidth,
                hierarchyChildren: hierarchyData.children.length 
            });

            // Configure ECharts options
            const options: EChartsTreemapOptions = {
                width: container.clientWidth || 800,
                height: 500, // Fixed height to match the container
                colors: modernColors,
                enableZoom: true,
                showBreadcrumb: true,
                roam: false,
                onTooltip: createTooltip,
                labelOptions: {
                    show: true,
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#333'
                },
                responsive: true
            };

            // Create or update the treemap service
            if (!treemapService) {
                logDebug(COMPONENT_ID, 'Creating new treemap service');
                treemapService = new EChartsTreemapService(container, options);
            } else {
                logDebug(COMPONENT_ID, 'Updating existing treemap service');
                treemapService.updateOptions(options);
            }

            // Render the visualization
            treemapService.render(hierarchyData);
            
            log('ECharts treemap visualization updated successfully');
        } catch (error) {
            console.error('Error updating visualization:', error);
            log(`Error updating visualization: ${error}`);
        }
    }

    // Handle items store changes
    function handleItemsChange(storeData: any) {
        if (!isMounted) return;
        
        logDebug(COMPONENT_ID, 'Items changed, updating visualization', { itemCount: storeData?.items?.length || 0 });
        
        try {
            prepareVisualizationData();
            
            // Use requestAnimationFrame to prevent blocking the UI
            requestAnimationFrame(() => {
                updateVisualization();
            });
        } catch (error) {
            console.error('Error handling items change:', error);
        }
    }

    // Handle language changes
    function handleLanguageChange(lang: 'en' | 'fr') {
        if (!isMounted) return;
        
        logDebug(COMPONENT_ID, 'Language changed', { lang });
        
        try {
            prepareVisualizationData();
            
            // Use requestAnimationFrame to prevent blocking the UI
            requestAnimationFrame(() => {
                updateVisualization();
            });
        } catch (error) {
            console.error('Error handling language change:', error);
        }
    }

    // Handle container resize
    function handleResize() {
        if (treemapService && container) {
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = 500; // Keep fixed height
            
            treemapService.updateOptions({ width, height });
            treemapService.resize();
        }
    }

    // Reactive state tracking for preventing infinite loops
    let lastItemsLength = $state(0);
    let lastLanguage = $state('en');

    // Svelte 5 effect to watch for store changes - prevent infinite loops
    $effect(() => {
        if (!isMounted) return;
        
        const storeData = $itemsStore;
        const currentItemsLength = storeData?.items?.length || 0;
        
        // Only update if items actually changed
        if (currentItemsLength !== lastItemsLength) {
            lastItemsLength = currentItemsLength;
            logDebug(COMPONENT_ID, 'Items length changed', { 
                oldLength: lastItemsLength, 
                newLength: currentItemsLength 
            });
            handleItemsChange(storeData);
        }
    });

    // Svelte 5 effect to watch for language changes - prevent infinite loops  
    $effect(() => {
        if (!isMounted) return;
        
        const lang = $languageStore;
        
        // Only update if language actually changed
        if (lang !== lastLanguage) {
            lastLanguage = lang;
            logDebug(COMPONENT_ID, 'Language changed', { 
                oldLang: lastLanguage, 
                newLang: lang 
            });
            handleLanguageChange(lang);
        }
    });

    onMount((): (() => void) => {
        logDebug(COMPONENT_ID, 'Component mounting');
        trackMount(COMPONENT_ID);
        
        let cleanupFunctions: (() => void)[] = [];
        
        try {
            // Set mounted state first
            isMounted = true;

            // Initialize header hook
            headerHook.initialize({ totalCount: 0, additionalCount: 0 });

            // Set up resize observer
            const resizeObserver = new ResizeObserver(handleResize);
            cleanupFunctions.push(() => resizeObserver.disconnect());
            
            // Wait for DOM to be ready
            tick().then(() => {
                if (container) {
                    logDebug(COMPONENT_ID, 'Container found, setting up visualization');
                    
                    const rect = container.getBoundingClientRect();
                    width = rect.width || 800;
                    height = 500; // Force fixed height
                    
                    resizeObserver.observe(container);
                    
                    // Initial data preparation and visualization
                    try {
                        prepareVisualizationData();
                        
                        // Use requestAnimationFrame for smooth initialization
                        requestAnimationFrame(() => {
                            updateVisualization();
                        });
                    } catch (error) {
                        console.error('Error during initial visualization setup:', error);
                    }
                } else {
                    console.warn('Container not found during onMount');
                }
            }).catch(error => {
                console.error('Error during component initialization:', error);
            });
        } catch (error) {
            console.error('Error in onMount:', error);
        }

        return () => {
            logDebug(COMPONENT_ID, 'Component unmounting');
            trackUnmount(COMPONENT_ID);
            isMounted = false;
            
            try {
                // Run all cleanup functions
                cleanupFunctions.forEach(cleanup => {
                    try {
                        cleanup();
                    } catch (error) {
                        console.error('Error during cleanup:', error);
                    }
                });
                
                // Cleanup header hook
                if (headerHook) {
                    headerHook.destroy();
                }
                
                // Cleanup treemap service
                if (treemapService) {
                    treemapService.destroy();
                    treemapService = null;
                }
            } catch (error) {
                console.error('Error during component cleanup:', error);
            }
        };
    });

    onDestroy(() => {
        if (unsubscribeItems) {
            unsubscribeItems();
            unsubscribeItems = null;
        }
        if (treemapService) {
            treemapService.destroy();
            treemapService = null;
        }
        // Clean up header hook
        headerHook.destroy();
    });
</script>

<div class="w-full h-full flex flex-col gap-2">
    <BaseVisualization
        title={titleHtml}
        translationKey=""
        description="Cette visualisation montre la distribution des mots à travers les éléments par pays et collection. La taille de chaque bloc représente le nombre de mots dans ce pays ou cette collection."
        descriptionTranslationKey="viz.word_distribution_description"
        className="word-visualization-compact-header"
        padding="8px"
        minHeight="520px"
    >
        <div 
            class="chart-container-glass flex-1 relative overflow-hidden" 
            bind:this={container}
            style="height: 500px; max-height: 500px; padding: 0; min-height: 500px;"
        >
            {#if $itemsStore.loading}
                <div class="loading-state">{$loadingText}</div>
            {:else if $itemsStore.error}
                <div class="error-state">{$itemsStore.error}</div>
            {:else if !hierarchyData?.children?.length}
                <div class="no-data-state">{$noDataText}</div>
            {/if}
            <!-- ECharts visualization will be rendered here -->
        </div>
        
        <!-- Use the summary component -->
        <WordDistributionSummary 
            {totalItems}
            {totalWordCount}
            zoomedNode={null}
            formatNumber={headerHook.formatNumber}
        />
        
    </BaseVisualization>
</div>

<style>
    /* Modern glassmorphism styling for word distribution treemap */
    
    /* Enhanced chart container with glassmorphism effect */
    :global(.chart-container-glass) {
        background: rgba(255, 255, 255, 0.85);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-lg);
        box-shadow: 
            var(--shadow-lg),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
        transition: all var(--transition-normal) var(--ease-out);
    }
    
    :global(.chart-container-glass::before) {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg, 
            transparent, 
            rgba(255, 255, 255, 0.6) 50%, 
            transparent
        );
        z-index: var(--z-above);
    }
    
    :global(.chart-container-glass:hover) {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 
            var(--shadow-xl),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            var(--shadow-glow);
        transform: translateY(-2px);
        border-color: rgba(var(--color-primary), 0.3);
    }

    /* Modern state indicators with glassmorphism */
    :global(.loading-state),
    :global(.error-state),
    :global(.no-data-state) {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: var(--spacing-lg) var(--spacing-xl);
        border-radius: var(--radius-lg);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 
            var(--shadow-md),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-md);
        z-index: var(--z-popover);
        animation: fadeInGlass var(--transition-normal) var(--ease-out);
    }
    
    :global(.loading-state) {
        color: var(--color-text-secondary);
        background: rgba(var(--color-primary-50), 0.9);
        border-color: rgba(var(--color-primary), 0.2);
    }
    
    :global(.error-state) {
        color: var(--color-error);
        background: rgba(var(--color-error-light), 0.9);
        border-color: rgba(var(--color-error), 0.2);
    }
    
    :global(.no-data-state) {
        color: var(--color-text-secondary);
    }

    /* Enhanced ECharts tooltip with glassmorphism */
    :global(.echarts-tooltip) {
        background: rgba(26, 32, 44, 0.95) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        backdrop-filter: blur(20px) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: var(--radius-lg) !important;
        box-shadow: 
            var(--shadow-xl),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        font-size: var(--font-size-sm) !important;
        padding: var(--spacing-md) var(--spacing-lg) !important;
        font-weight: var(--font-weight-medium) !important;
        font-family: var(--font-family-base) !important;
        line-height: var(--line-height-relaxed) !important;
        max-width: 280px !important;
    }

    :global(.echarts-tooltip > div) {
        margin-bottom: var(--spacing-xs);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }

    :global(.echarts-tooltip > div:last-child) {
        margin-bottom: 0;
    }
    
    /* Glassmorphism animations */
    @keyframes fadeInGlass {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
            -webkit-backdrop-filter: blur(0px);
            backdrop-filter: blur(0px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            -webkit-backdrop-filter: blur(16px);
            backdrop-filter: blur(16px);
        }
    }
    
    /* Compact visualization header with glassmorphism touch */
    :global(.word-visualization-compact-header) {
        margin-bottom: var(--spacing-sm);
        position: relative;
    }
    
    :global(.word-visualization-compact-header::after) {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg, 
            transparent, 
            rgba(var(--color-primary), 0.3) 20%, 
            rgba(var(--color-primary), 0.1) 50%,
            rgba(var(--color-primary), 0.3) 80%, 
            transparent
        );
    }
</style>
