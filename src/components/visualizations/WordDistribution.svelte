<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';
    import BaseVisualization from './BaseVisualization.svelte';

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
    let tooltip: HTMLDivElement;
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

    // Subscribe to language changes
    languageStore.subscribe(value => {
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

    // Process data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return { name: 'root', children: [] };
        
        // Filter items - only include those with word_count greater than 0
        const filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
            // Must have word_count field and it must be greater than 0
            if (item.word_count === undefined || item.word_count === 0) return false;
            return true;
        });
        
        // Update total counts
        totalItems = filteredItems.length;
        totalWordCount = filteredItems.reduce((sum, item) => sum + (item.word_count || 0), 0);
        
        // Update title HTML
        updateTitleHtml();
        
        // Group by country, then by item_set_title
        const countryGroups = d3.group(filteredItems, d => d.country || 'Unknown');
        
        // Create hierarchy
        const root: WordHierarchyNode = {
            name: 'Word Distribution',
            children: []
        };
        
        // Process each country
        countryGroups.forEach((countryItems, country) => {
            // Group items by item_set_title
            const setGroups = d3.group(countryItems, d => d.item_set_title || 'No Set');
            
            // Create country node
            const countryNode: WordHierarchyNode = {
                name: country,
                children: [],
                wordCount: 0,
                itemCount: countryItems.length
            };
            
            // Process each item set
            setGroups.forEach((setItems, setTitle) => {
                // Calculate total word count for this set
                const setWordCount = setItems.reduce((sum, item) => sum + (item.word_count || 0), 0);
                
                // Create set node with value representing word count
                const setNode: WordHierarchyNode = {
                    name: setTitle,
                    value: setWordCount, // for treemap size
                    wordCount: setWordCount,
                    itemCount: setItems.length
                };
                
                // Add to country's children
                countryNode.children!.push(setNode);
                
                // Add to country's word count
                if (countryNode.wordCount !== undefined) {
                    countryNode.wordCount += setWordCount;
                } else {
                    countryNode.wordCount = setWordCount;
                }
            });
            
            // Sort item sets by word count descending
            countryNode.children!.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
            
            // Add country to root
            root.children!.push(countryNode);
        });
        
        // Sort countries by word count descending
        root.children!.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
        
        return root;
    }

    // Zoom to a node
    function zoomToNode(node: d3.HierarchyNode<WordHierarchyNode> | null) {
        zoomedNode = node;
        
        // When zooming to a node, ensure it has proper hierarchy data
        if (zoomedNode) {
            // Check if the node has children, if not, create a new hierarchy from its data
            if (!zoomedNode.children || zoomedNode.children.length === 0) {
                // Process only this node's data to ensure proper structure
                const nodeData = {
                    name: zoomedNode.data.name,
                    children: zoomedNode.data.children || [],
                    wordCount: zoomedNode.data.wordCount,
                    itemCount: zoomedNode.data.itemCount
                };
                
                // If there are no children in the original data, no need to zoom
                if (!nodeData.children || nodeData.children.length === 0) {
                    console.warn('Cannot zoom to node without children');
                    return;
                }
            }
            
            // Update summary statistics for the zoomed node
            totalItems = zoomedNode.data.itemCount || 0;
            totalWordCount = zoomedNode.data.wordCount || 0;
            
            // Update title for zoomed node
            updateZoomedNodeTitle();
        } else {
            // Reset to global statistics when zooming out
            if ($itemsStore.items && $itemsStore.items.length > 0) {
                // Recalculate total counts from all items with word count > 0
                const filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
                    if (item.word_count === undefined || item.word_count === 0) return false;
                    return true;
                });
                
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
                    .attr('class', 'no-data')
                    .style('position', 'absolute')
                    .style('top', '50%')
                    .style('left', '50%')
                    .style('transform', 'translate(-50%, -50%)')
                    .style('text-align', 'center')
                    .style('color', 'var(--text-color-secondary)')
                    .text($noDataText);
                return;
            }
            
            // Remove previous visualization and messages
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
            
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
                .paddingOuter(4)
                .paddingTop(20)
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
                .text(d => `${d.data.name} (${d.data.wordCount?.toLocaleString() || 0} ${$wordsText})`)
                .style('pointer-events', 'none')
                .each(function(d) {
                    const self = d3.select(this);
                    const textLength = (this as SVGTextElement).getComputedTextLength();
                    const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                    
                    if (textLength > availableWidth) {
                        self.text(d.data.name)
                            .append('title')
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
                    
                    // Show tooltip
                    showTooltip(d, event);
                })
                .on('mousemove', function(event, d) {
                    // Update tooltip position
                    showTooltip(d, event);
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
                    }
                });
        } catch (e) {
            console.error('Error in updateVisualization:', e);
        }
    }

    // Create tooltip
    function createTooltip() {
        try {
            // Remove any existing tooltip to prevent duplicates
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

    // Show tooltip with data
    function showTooltip(d, event) {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                logDebug(COMPONENT_ID, 'Tooltip element not found, creating new one');
                createTooltip();
            }
            
            if (!event) {
                logDebug(COMPONENT_ID, 'Event object is undefined in showTooltip');
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
            
            tooltip.innerHTML = `
                <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                    ${country} > ${itemSet}
                </div>
                <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                    <span>${$wordsText}:</span>
                    <span style="text-align:right;font-weight:bold">${wordCount.toLocaleString()}</span>
                    <span>${$itemsText}:</span>
                    <span style="text-align:right">${itemCount}</span>
                    <span>${$avgWordsPerItemText}:</span>
                    <span style="text-align:right">${avgWordsPerItem}</span>
                    <span>${$percentOfCountryText}:</span>
                    <span style="text-align:right">${percentOfCountry}</span>
                    <span>${$percentOfTotalText}:</span>
                    <span style="text-align:right">${percentOfTotal}</span>
                </div>
            `;
            
            const tooltipWidth = 200;
            const tooltipHeight = 120;
            
            // Get safe coordinates for the tooltip
            let left = 0;
            let top = 0;
            
            try {
                left = event.pageX + 10;
                top = event.pageY + 10;
                
                // Make sure tooltip stays within viewport
                if (left + tooltipWidth > window.innerWidth) {
                    left = event.pageX - tooltipWidth - 10;
                }
                
                if (top + tooltipHeight > window.innerHeight) {
                    top = event.pageY - tooltipHeight - 10;
                }
                
                // Ensure we don't have negative positions
                left = Math.max(0, left);
                top = Math.max(0, top);
            } catch (e) {
                logDebug(COMPONENT_ID, 'Error calculating tooltip position', e);
                // Fallback to center of screen
                left = window.innerWidth / 2 - tooltipWidth / 2;
                top = window.innerHeight / 2 - tooltipHeight / 2;
            }
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.display = 'block';
            
            logDebug(COMPONENT_ID, 'Tooltip shown', { 
                country, 
                itemSet, 
                position: { left, top } 
            });
        } catch (e) {
            console.error('Error showing tooltip:', e);
            logDebug(COMPONENT_ID, 'Error showing tooltip', e);
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

    function handleItemsChange(items: any) {
        if (!isMounted || !container) return;
        
        logDebug(COMPONENT_ID, 'Items store changed', { itemCount: items?.length || 0 });
        
        // Only update if the component is still mounted
        if (document.body.contains(container)) {
            updateVisualization();
        }
    }

    onMount(() => {
        try {
            isMounted = true;
            trackMount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component mounted');
            
            // Use tick() in a separate function to avoid Promise return type issues
            const initialize = async () => {
                await tick();
                
                if (!container) {
                    console.error('Container element not found in onMount');
                    return;
                }
                
                // Create tooltip
                createTooltip();
                
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
                
                // Add resize observer
                const resizeObserver = new ResizeObserver(() => {
                    if (!isMounted) return;
                    
                    if (container && document.body.contains(container)) {
                        updateVisualization();
                    }
                });
                
                resizeObserver.observe(container);
            };
            
            // Start initialization
            initialize();
            
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
                    
                    // Clean up tooltip
                    if (tooltip && document.body.contains(tooltip)) {
                        document.body.removeChild(tooltip);
                        logDebug(COMPONENT_ID, 'Tooltip removed');
                    }
                    
                    // Clean up store subscriptions
                    if (unsubscribeItems) {
                        unsubscribeItems();
                        logDebug(COMPONENT_ID, 'Unsubscribed from items store');
                    }
                    
                    logDebug(COMPONENT_ID, 'Component cleanup completed');
                } catch (e) {
                    console.error('Error during cleanup:', e);
                }
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
                // Clean up store subscriptions
                if (unsubscribeItems) {
                    unsubscribeItems();
                    logDebug(COMPONENT_ID, 'Unsubscribed from items store (backup)');
                }
                
                // Clean up tooltip as a backup
                if (tooltip && document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                    logDebug(COMPONENT_ID, 'Tooltip removed (backup)');
                }
            } catch (e) {
                console.error('Error during backup cleanup:', e);
            }
        }
    });
</script>

<div class="word-distribution-container">
    <BaseVisualization
        title=""
        translationKey=""
        description="This visualization shows the distribution of words across items by country and collection. The size of each block represents the word count in that country or collection."
        descriptionTranslationKey="viz.word_distribution_description"
        {titleHtml}
    >
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="stats">
            <div class="stat-summary">
                <h3>{$summaryText}</h3>
                <p>{$totalItemsWithWordCountText}: <strong>{formatNumber(totalItems)}</strong></p>
                <p>{$totalWordsText}: <strong>{formatNumber(totalWordCount)}</strong></p>
                {#if totalItems > 0}
                    <p>{$avgWordsPerItemText}: <strong>{formatNumber(Math.round(totalWordCount / totalItems))}</strong></p>
                {/if}
                {#if zoomedNode}
                    <p>{$currentlyViewingText}: <strong>{zoomedNode.data.name}</strong></p>
                    <p>{$clickBackText}</p>
                {:else}
                    <p>{$clickZoomInText}</p>
                {/if}
            </div>
        </div>
    </BaseVisualization>
</div>

<style>
    .word-distribution-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    /* Override the visualization header margin to reduce space */
    :global(.word-distribution-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    /* Override the title container padding to reduce space */
    :global(.word-distribution-container .title-container) {
        padding-bottom: 0 !important;
    }
    
    .chart-container {
        flex: 1;
        min-height: 500px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stats {
        padding: var(--spacing-md);
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stat-summary p {
        margin: var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        color: var(--text-color-secondary);
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-sm);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-xs);
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
</style> 