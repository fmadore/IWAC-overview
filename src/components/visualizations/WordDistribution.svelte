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

    const COMPONENT_ID = 'WordDistribution';
    let isMounted = false;
    let unsubscribeItems: () => void;

    // Data interfaces
    interface WordHierarchyNode {
        name: string;
        children?: WordHierarchyNode[];
        value?: number;
        wordCount?: number;
        itemCount?: number;
    }

    // Visualization state
    let container: HTMLDivElement;
    let width = 0;
    let height = 0;
    let totalWordCount = 0;
    let totalItems = 0;
    let hierarchyData: WordHierarchyNode = { name: 'root', children: [] };
    let zoomedNode: d3.HierarchyNode<WordHierarchyNode> | null = null;
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
        
        // Group items hierarchically by country and item_set_title
        const hierarchicalData = groupHierarchically(
            filteredItems,
            [
                item => item.country || 'Unknown', // Add fallback for undefined
                item => item.item_set_title || 'No Set'
            ]
        );

        // Convert hierarchical data to the required format
        const root: WordHierarchyNode = {
            name: 'Word Distribution',
            children: (hierarchicalData.children || []).map(country => ({
                name: country.name,
                children: (country.children || []).map(set => ({
                    name: set.name,
                    value: set.value,
                    wordCount: set.value,
                    itemCount: set.itemCount
                })),
                wordCount: country.value,
                itemCount: country.itemCount
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
    function zoomToNode(node: d3.HierarchyNode<WordHierarchyNode> | null) {
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
            
            // Remove previous visualization and messages
            d3.select(container).select('svg').remove();
            d3.select(container).select('.absolute').remove();
            
            // Get container dimensions
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            
            // Set margins
            const margin = { top: 10, right: 10, bottom: 10, left: 10 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // Create chart group
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            // If zoomed in, add a button to zoom out
            if (zoomedNode) {
                const button = svg.append('g')
                    .attr('class', 'zoom-out-button')
                    .attr('transform', `translate(${margin.left}, ${margin.top})`)
                    .style('cursor', 'pointer')
                    .on('click', () => zoomToNode(null));
                    
                button.append('rect')
                    .attr('width', 100)
                    .attr('height', 24)
                    .attr('rx', 4)
                    .attr('fill', 'var(--primary-color)')
                    .attr('opacity', 0.8);
                    
                button.append('text')
                    .attr('x', 50)
                    .attr('y', 16)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', 'var(--font-size-sm)')
                    .text($backToAllText);
                    
                // Update title HTML for zoomed node - remove item count
                updateZoomedNodeTitle();
            }
            
            // Create treemap layout
            const treemap = d3.treemap<WordHierarchyNode>()
                .size([chartWidth, chartHeight])
                .paddingOuter(3)
                .paddingTop(16)
                .paddingInner(1)
                .round(true);
            
            // Create hierarchy
            let root: d3.HierarchyNode<WordHierarchyNode>;
            
            if (zoomedNode) {
                // When zoomed in, we have two approaches:
                // 1. If the zoomed node data has children, use it directly
                if (zoomedNode.data.children && zoomedNode.data.children.length > 0) {
                    // Create a new hierarchy from the children data
                    const childrenData: WordHierarchyNode = {
                        name: zoomedNode.data.name,
                        children: zoomedNode.data.children
                    };
                    
                    root = d3.hierarchy<WordHierarchyNode>(childrenData)
                        .sum(d => d.value || 0)
                        .sort((a, b) => (b.value || 0) - (a.value || 0));
                } 
                // 2. If the zoomed node only has a flat representation (no children),
                // create a flat hierarchy using its actual children nodes
                else if (zoomedNode.children && zoomedNode.children.length > 0) {
                    // Create a temporary root with the zoomed node's children
                    const tempChildren = zoomedNode.children.map(child => ({
                        name: child.data.name,
                        value: child.data.value || child.value,
                        wordCount: child.data.wordCount,
                        itemCount: child.data.itemCount
                    }));
                    
                    const tempRoot: WordHierarchyNode = {
                        name: zoomedNode.data.name,
                        children: tempChildren
                    };
                    
                    root = d3.hierarchy<WordHierarchyNode>(tempRoot)
                        .sum(d => d.value || 0)
                        .sort((a, b) => (b.value || 0) - (a.value || 0));
                } 
                else {
                    // Fallback to the full hierarchy if something goes wrong
                    console.warn('Zoomed node has no valid children data, falling back to full hierarchy');
                    hierarchyData = processData();
                    root = d3.hierarchy<WordHierarchyNode>(hierarchyData)
                        .sum(d => d.value || 0)
                        .sort((a, b) => (b.value || 0) - (a.value || 0));
                }
            } else {
                // When not zoomed, create hierarchy from full data
                root = d3.hierarchy<WordHierarchyNode>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
                
                // Filter out nodes with very small values that might cause display issues
                // This ensures all displayed countries have enough space to be visible
                if (root.children) {
                    // Calculate minimum threshold (e.g., 0.1% of total)
                    const totalValue = root.value || 0;
                    const minThreshold = totalValue * 0.001; // 0.1% of total
                    
                    // Filter children to only include those with sufficient value
                    root.children = root.children.filter(child => 
                        (child.value || 0) > minThreshold
                    );
                }
            }
            
            // Apply treemap layout - make sure to validate
            try {
                treemap(root as d3.HierarchyRectangularNode<WordHierarchyNode>);
            } catch (e) {
                console.error('Error applying treemap layout:', e);
                // If treemap fails, revert to full data view
                zoomedNode = null;
                hierarchyData = processData();
                root = d3.hierarchy<WordHierarchyNode>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
                treemap(root as d3.HierarchyRectangularNode<WordHierarchyNode>);
            }
            
            // Color scale - use d3.schemeCategory10 for consistent colors
            const colorScale = d3.scaleOrdinal<string>()
                .domain(root.children ? root.children.map(d => d.data.name) : [root.data.name])
                .range(d3.schemeCategory10);
            
            // If not zoomed, store the colors for each country
            if (!zoomedNode) {
                // Initialize or update country colors
                if (root.children) {
                    root.children.forEach(child => {
                        if (!countryColors.has(child.data.name)) {
                            countryColors.set(child.data.name, colorScale(child.data.name));
                        }
                    });
                }
            }
            
            // Create cells for countries (first level)
            const countries = chart.selectAll('.country')
                .data(zoomedNode ? [] : (root.children || []))
                .enter()
                .append('g')
                .attr('class', 'country')
                .attr('transform', d => {
                    const x = (d as any).x0 || 0;
                    const y = (d as any).y0 || 0;
                    return `translate(${x},${y})`;
                });
            
            // Add country background
            countries.append('rect')
                .attr('width', d => {
                    const x0 = (d as any).x0 || 0;
                    const x1 = (d as any).x1 || 0;
                    return Math.max(0, x1 - x0);
                })
                .attr('height', d => {
                    const y0 = (d as any).y0 || 0;
                    const y1 = (d as any).y1 || 0;
                    return Math.max(0, y1 - y0);
                })
                .attr('fill', d => {
                    // Use stored color if available
                    return countryColors.get(d.data.name) || colorScale(d.data.name);
                })
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('opacity', 0.7)
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    zoomToNode(d);
                })
                .attr('title', $clickZoomInText)
                .append('title')
                .text(() => $clickZoomInText);
            
            // Add country labels
            countries.append('text')
                .attr('x', 5)
                .attr('y', 15)
                .attr('font-size', 'var(--font-size-sm)')
                .attr('font-weight', 'bold')
                .attr('fill', 'white')
                .text(d => {
                    // Calculate available width
                    const width = (d as any).x1 - (d as any).x0 - 10;
                    // If width is too small, just show the name without word count
                    if (width < 150) return d.data.name;
                    // Otherwise show name with word count
                    return `${d.data.name} (${d.data.wordCount?.toLocaleString() || 0} ${$wordsText})`;
                })
                .style('pointer-events', 'none')
                .each(function(d) {
                    const self = d3.select(this);
                    const textLength = (this as SVGTextElement).getComputedTextLength();
                    const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                    
                    if (textLength > availableWidth) {
                        // If text is too long, truncate it
                        let text = d.data.name;
                        self.text(text);
                        
                        // Check if text fits and truncate if necessary
                        let currentTextLength = (this as SVGTextElement).getComputedTextLength();
                        let ellipsis = false;
                        
                        while (currentTextLength > availableWidth && text.length > 3) {
                            text = text.slice(0, -1);
                            self.text(text);
                            currentTextLength = (this as SVGTextElement).getComputedTextLength();
                            ellipsis = true;
                        }
                        
                        if (ellipsis) {
                            self.text(text + '...');
                        }
                        
                        // Add tooltip with full name and word count
                        self.append('title')
                            .text(`${d.data.name} (${d.data.wordCount?.toLocaleString() || 0} ${$wordsText})`);
                    }
                });
            
            // Create cells for item sets (second level)
            const itemSets = chart.selectAll('.item-set')
                .data(zoomedNode ? (root.children || []) : root.leaves())
                .enter()
                .append('g')
                .attr('class', 'item-set')
                .attr('transform', d => {
                    // Ensure d.x0 and d.y0 are valid numbers
                    const x = (d as any).x0 || 0;
                    const y = (d as any).y0 || 0;
                    return `translate(${x},${y})`;
                });
            
            // Add item set rectangles
            itemSets.append('rect')
                .attr('width', d => {
                    const x0 = (d as any).x0 || 0;
                    const x1 = (d as any).x1 || 0;
                    return Math.max(0, x1 - x0);
                })
                .attr('height', d => {
                    const y0 = (d as any).y0 || 0;
                    const y1 = (d as any).y1 || 0;
                    return Math.max(0, y1 - y0);
                })
                .attr('fill', d => {
                    // Use a lighter shade of the country/parent color
                    const nodeColor = zoomedNode 
                        ? countryColors.get(zoomedNode.data.name) || colorScale(zoomedNode.data.name)
                        : countryColors.get((d.parent as any)?.data?.name) || colorScale((d.parent as any)?.data?.name);
                    const baseColor = d3.rgb(nodeColor);
                    return d3.rgb(baseColor).brighter(0.7).toString();
                })
                .attr('stroke', 'white')
                .attr('stroke-width', 0.5)
                .style('cursor', 'pointer')
                .on('mouseover', function(event, d) {
                    // Highlight on hover
                    d3.select(this)
                        .attr('stroke', 'var(--primary-color)')
                        .attr('stroke-width', 2);
                    
                    // Show tooltip using the new handler
                    handleShowTooltip(event, d);
                })
                .on('mousemove', function(event, d) {
                    // Update tooltip position
                    handleShowTooltip(event, d);
                })
                .on('mouseout', function() {
                    // Remove highlight
                    d3.select(this)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 0.5);
                    
                    // Hide tooltip
                    hideTooltip();
                });
            
            // Add item set labels
            itemSets.append('text')
                .attr('x', 3)
                .attr('y', 13)
                .attr('font-size', 'var(--font-size-xs)')
                .attr('fill', 'var(--text-color-primary)')
                .style('pointer-events', 'none')
                .each(function(d) {
                    const self = d3.select(this);
                    const width = (d as any).x1 - (d as any).x0;
                    const height = (d as any).y1 - (d as any).y0;
                    
                    // Only add text if rectangle is big enough
                    if (width < 30 || height < 20) {
                        return;
                    }
                    
                    let text = d.data.name;
                    // Truncate text if too long
                    const availableWidth = width - 6;
                    
                    // Get the parent/country for the tooltip
                    const country = zoomedNode ? zoomedNode.data.name : (d.parent ? d.parent.data.name : '');
                    
                    self.text(text)
                        .append('title')
                        .text(`${country} > ${d.data.name}: ${d.data.wordCount?.toLocaleString() || 0} ${$wordsText} (${d.data.itemCount} ${$itemsText})`);
                    
                    // Check if text fits and truncate if necessary
                    const node = this as SVGTextElement;
                    let textLength = node.getComputedTextLength();
                    let ellipsis = false;
                    
                    while (textLength > availableWidth && text.length > 3) {
                        text = text.slice(0, -1);
                        self.text(text);
                        textLength = node.getComputedTextLength();
                        ellipsis = true;
                    }
                    
                    if (ellipsis) {
                        self.text(text + '...');
                        // Re-add the tooltip since it was lost when changing the text
                        self.append('title')
                            .text(`${country} > ${d.data.name}: ${d.data.wordCount?.toLocaleString() || 0} ${$wordsText} (${d.data.itemCount} ${$itemsText})`);
                    }
                });
        } catch (e) {
            console.error('Error in updateVisualization:', e);
        }
    }

    // Handle tooltip display
    function handleShowTooltip(event: MouseEvent, d: any) {
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
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            width = newWidth;
                            height = newHeight;
                            updateVisualization();
                        }
                    }
                });

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
        <div class="flex-1 min-h-500 relative bg-card rounded-md shadow" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="p-md bg-card rounded-md shadow">
            <div>
                <h3 class="mt-0 mb-sm text-primary text-md border-b border-solid border-default pb-xs">{$summaryText}</h3>
                <p class="my-xs text-sm text-secondary">{$totalItemsWithWordCountText}: <strong>{formatNumber(totalItems)}</strong></p>
                <p class="my-xs text-sm text-secondary">{$totalWordsText}: <strong>{formatNumber(totalWordCount)}</strong></p>
                {#if totalItems > 0}
                    <p class="my-xs text-sm text-secondary">{$avgWordsPerItemText}: <strong>{formatNumber(Math.round(totalWordCount / totalItems))}</strong></p>
                {/if}
                {#if zoomedNode}
                    <p class="my-xs text-sm text-secondary">{$currentlyViewingText}: <strong>{zoomedNode.data.name}</strong></p>
                    <p class="my-xs text-sm text-secondary">{$clickBackText}</p>
                {:else}
                    <p class="my-xs text-sm text-secondary">{$clickZoomInText}</p>
                {/if}
            </div>
        </div>
    </BaseVisualization>
</div> 