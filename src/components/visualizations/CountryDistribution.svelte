<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate, language } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';

    // Move all the interface definitions to the top
    interface Item {
        country: string;
        item_set_title: string;
        // add other properties if needed
    }
    
    interface HierarchyDatum {
        name: string;
        children?: HierarchyDatum[];
        value?: number;
        itemCount?: number;
        originalName?: string; // Store original name for data lookups
    }

    // Initialize essential variables first
    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;
    let hierarchyData: HierarchyDatum = { name: 'root', children: [] };
    let root: d3.HierarchyNode<HierarchyDatum> | null = null;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    let totalItems = 0;
    let countryCount = 0;
    let subCollectionCount = 0;
    let searchResults: d3.HierarchyRectangularNode<HierarchyDatum>[] = [];
    let selectedNode: d3.HierarchyRectangularNode<HierarchyDatum> | null = null;
    let zoomedNode: d3.HierarchyRectangularNode<HierarchyDatum> | null = null;
    let searchQuery = '';
    let showLabels = true;
    let resizeObserver: ResizeObserver | null = null;
    
    // Store country colors to maintain consistency when zooming
    let countryColors: Map<string, string> = new Map();
    
    // Define translation keys
    const countryDescriptionKey = 'viz.country_distribution_description';
    
    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const itemsText = translate('viz.items');
    const percentParentText = translate('viz.percent_of_country');
    const percentTotalText = translate('viz.percent_of_total');
    const clickZoomInText = translate('viz.click_zoom_in');
    const backToAllText = translate('viz.back_to_all');
    const unknownText = translate('viz.unknown');
    const noSetText = translate('viz.no_set');
    const summaryText = translate('viz.summary');
    const totalItemsText = translate('viz.total_items');
    const countriesText = translate('viz.countries');
    const subCollectionsText = translate('viz.sub_collections');
    const currentlyViewingText = translate('viz.currently_viewing');
    const clickBackText = translate('viz.click_back_to_return');
    
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
        return t('viz.distribution_items', [formattedCount]);
    }
    
    // IMPORTANT - Replace the reactive declaration for titleHtml with a function call
    // Instead, compute titleHtml directly inside a function
    function updateTitleHtml() {
        if (totalItems > 0) {
            titleHtml = getTitle(totalItems);
        } else {
            titleHtml = t('viz.country_distribution_title');
        }
        console.log("Title HTML updated:", titleHtml);
    }

    // Call this function initially and whenever totalItems or language changes
    $: {
        updateTitleHtml();
    }

    // Direct subscription to log title changes for debugging
    $: {
        console.log("Title HTML updated:", titleHtml);
    }
    
    // Subscribe to language changes - do this after initializing all variables
    language.subscribe(value => {
        console.log("Language changed to:", value);
        currentLang = value;
        
        // Force refresh the title when language changes
        updateTitleHtml();
        
        // Reprocess data with translated country names when language changes
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            // Store the current zoom state
            const currentZoomedNode = zoomedNode;
            const currentZoomedCountry = currentZoomedNode?.data.originalName;
            
            // Reset zoom state temporarily
            zoomedNode = null;
            
            // Reprocess data with new translations
            hierarchyData = processData($itemsStore.items as Item[]);
            
            // Restore zoom state if needed
            if (currentZoomedNode && currentZoomedCountry) {
                // Find the node with the same original country name
                const newRoot = d3.hierarchy<HierarchyDatum>(hierarchyData);
                const matchingNode = newRoot.children?.find(node => 
                    node.data.originalName === currentZoomedCountry
                );
                
                if (matchingNode) {
                    zoomToNode(matchingNode);
                    return; // updateVisualization is called in zoomToNode
                }
            }
            
            // Update visualization with new translations
            updateVisualization();
        }
    });

    // Function to process data into hierarchical structure
    function processData(items: Item[]): HierarchyDatum {
        // Filter out items without a country value first
        const validItems = items.filter(item => item.country && item.country.trim() !== '');
        
        // Group by country first
        const countryGroups = d3.group(validItems, (d: Item) => d.country);
        
        // Create hierarchical structure
        const root: HierarchyDatum = {
            name: "root",
            children: Array.from(countryGroups, ([country, items]) => {
                // Translate country name
                const translatedCountry = t(`country.${country}`) || country;
                
                // Group by item_set_title within each country
                const itemSets = Array.from(
                    d3.group(items, (d: Item) => d.item_set_title || $noSetText),
                    ([itemSet, setItems]) => ({
                        name: itemSet,
                        value: setItems.length, // Count of items in this set
                        itemCount: setItems.length,
                        originalName: itemSet // Store original name for data lookups
                    })
                );
                
                return {
                    name: translatedCountry,
                    children: itemSets,
                    itemCount: items.length,
                    originalName: country // Store original country name for data lookups
                };
            })
        };

        // Update statistics
        totalItems = validItems.length;
        countryCount = countryGroups.size;
        subCollectionCount = root.children?.reduce((total, country) => 
            total + (country.children?.length || 0), 0) || 0;
        
        // Important: Update the title HTML whenever the data changes
        updateTitleHtml();
        
        console.log("Data processed, total items:", totalItems);

        return root;
    }

    // Zoom to a node
    function zoomToNode(node: d3.HierarchyNode<HierarchyDatum> | null) {
        zoomedNode = node as d3.HierarchyRectangularNode<HierarchyDatum> | null;
        
        // When zooming to a node, ensure it has proper hierarchy data
        if (zoomedNode) {
            // Check if the node has children to zoom into
            if (!zoomedNode.children || zoomedNode.children.length === 0) {
                console.warn('Cannot zoom to node without children');
                return;
            }
            
            // Log the zoomed node for debugging
            console.log('Zooming to node:', zoomedNode.data.name, 'Original name:', zoomedNode.data.originalName);
            
            // Update statistics for the zoomed node
            totalItems = zoomedNode.data.itemCount || 0;
            subCollectionCount = zoomedNode.children?.length || 0;
        } else {
            // Reset to global statistics when zooming out
            if ($itemsStore.items && $itemsStore.items.length > 0) {
                // Cast items to the correct type
                const items = $itemsStore.items as unknown as Item[];
                const validItems = items.filter(item => item.country && item.country.trim() !== '');
                totalItems = validItems.length;
                
                // Recalculate country count and subcollection count
                const countryGroups = d3.group(validItems, (d) => d.country);
                countryCount = countryGroups.size;
                
                // Calculate subcollection count across all countries
                subCollectionCount = Array.from(countryGroups).reduce((total, [country, countryItems]) => {
                    const itemSets = d3.group(countryItems, (d) => d.item_set_title || '');
                    return total + itemSets.size;
                }, 0);
            }
        }
        
        // Update the title to reflect the current view
        updateTitleHtml();
        
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
                hierarchyData = processData($itemsStore.items as Item[]);
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
            
            // Set margins - reduce top margin to decrease space
            const margin = { top: 10, right: 10, bottom: 10, left: 10 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
            
            // DO NOT add any title text to the SVG - removed
            // Instead create chart group directly
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
                
            // If zoomed in, add a button to zoom out but outside the title area
            if (zoomedNode) {
                const button = chart.append('g')
                    .attr('class', 'zoom-out-button')
                    .attr('transform', `translate(0, 0)`)
                    .style('cursor', 'pointer')
                    .on('click', () => zoomToNode(null));
                    
                button.append('rect')
                    .attr('width', 100)
                    .attr('height', 20)
                    .attr('rx', 4)
                    .attr('fill', 'var(--primary-color)')
                    .attr('opacity', 0.8);
                    
                button.append('text')
                    .attr('x', 50)
                    .attr('y', 14)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', 'var(--font-size-sm)')
                    .text($backToAllText);
            }
            
            // Create treemap layout
            const treemap = d3.treemap<HierarchyDatum>()
                .size([chartWidth, chartHeight])
                .paddingOuter(4)
                .paddingTop(20)
                .paddingInner(1)
                .round(true);
            
            // Create hierarchy
            let localRoot: d3.HierarchyNode<HierarchyDatum>;
            
            if (zoomedNode) {
                // When zoomed in, create a new hierarchy from the zoomed node's children
                const zoomedData: HierarchyDatum = {
                    name: zoomedNode.data.name,
                    children: zoomedNode.data.children,
                    originalName: zoomedNode.data.originalName // Preserve original name
                };
                
                localRoot = d3.hierarchy<HierarchyDatum>(zoomedData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
            } else {
                localRoot = d3.hierarchy<HierarchyDatum>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
            }
            
            // Update the global root variable
            root = localRoot;
            
            // Apply treemap layout
            try {
                treemap(localRoot as d3.HierarchyRectangularNode<HierarchyDatum>);
            } catch (e) {
                console.error('Error applying treemap layout:', e);
                // If treemap fails, revert to full data view
                zoomedNode = null;
                hierarchyData = processData($itemsStore.items as Item[]);
                localRoot = d3.hierarchy<HierarchyDatum>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
                root = localRoot;
                treemap(localRoot as d3.HierarchyRectangularNode<HierarchyDatum>);
            }
            
            // Color scale - use d3.schemeCategory10 for similar colors to WordDistribution
            const colorScale = d3.scaleOrdinal<string>()
                .domain(localRoot.children ? localRoot.children.map(d => d.data.originalName || d.data.name) : [localRoot.data.originalName || localRoot.data.name])
                .range(d3.schemeCategory10);
            
            // Create cells for countries (first level)
            const countries = chart.selectAll('.country')
                .data(zoomedNode ? [] : (localRoot.children || []))
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
                    // Use the original country name for color consistency
                    const originalName = d.data.originalName || d.data.name;
                    if (countryColors.has(originalName)) {
                        return countryColors.get(originalName) || colorScale(originalName);
                    } else {
                        const color = colorScale(originalName);
                        countryColors.set(originalName, color);
                        return color;
                    }
                })
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('opacity', 0.7)
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    zoomToNode(d);
                })
                .on('mouseover', function(event, d) {
                    // Show tooltip for countries too
                    showTooltip(event, d as any);
                })
                .on('mousemove', function(event, d) {
                    showTooltip(event, d as any);
                })
                .on('mouseout', function() {
                    hideTooltip();
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
                .text(d => `${d.data.name} (${d.data.itemCount || 0} ${$itemsText})`)
                .style('pointer-events', 'none')
                .each(function(d) {
                    const self = d3.select(this);
                    const textLength = (this as SVGTextElement).getComputedTextLength();
                    const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                    
                    if (textLength > availableWidth) {
                        self.text(d.data.name)
                            .append('title')
                            .text(`${d.data.name} (${d.data.itemCount || 0} ${$itemsText})`);
                    }
                });
            
            // Create cells for item sets (second level)
            const itemSets = chart.selectAll('.item-set')
                .data(zoomedNode ? (localRoot.children || []) : localRoot.leaves())
                .enter()
                .append('g')
                .attr('class', 'item-set')
                .attr('transform', d => {
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
                    let originalName: string;
                    
                    if (zoomedNode) {
                        // When zoomed in, use the original name of the zoomed node
                        originalName = zoomedNode.data.originalName || zoomedNode.data.name;
                    } else {
                        // When not zoomed, use the original name of the parent country
                        originalName = (d.parent as any)?.data?.originalName || (d.parent as any)?.data?.name || 'Unknown';
                    }
                    
                    const nodeColor = countryColors.get(originalName) || colorScale(originalName);
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
                    showTooltip(event, d as any);
                })
                .on('mousemove', function(event, d) {
                    // Update tooltip position
                    showTooltip(event, d as any);
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
                        .text(`${country} > ${d.data.name}: ${d.data.itemCount || d.value || 0} ${$itemsText}`);
                    
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

    // Create tooltip element - make it more resilient
    function createTooltip() {
        // Remove any existing tooltip to prevent duplication
        if (tooltip && document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
        }
        
        try {
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
            tooltip.style.maxWidth = '250px';
            tooltip.style.whiteSpace = 'nowrap';
            
            if (document && document.body) {
                document.body.appendChild(tooltip);
            }
        } catch (e) {
            console.error('Error creating tooltip:', e);
        }
    }

    // Show tooltip with data - add error handling
    function showTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        if (!tooltip || !document.body.contains(tooltip)) {
            createTooltip(); // Recreate tooltip if it doesn't exist
        }
        
        try {
            // Different tooltips for countries vs item sets
            const isCountry = d.parent === root; // If parent is root, it's a country
            const isItemSet = !isCountry;
            
            if (isCountry) {
                // Country tooltip
                const countryName = d.data.name; // Already translated in processData
                const countryItems = d.data.itemCount || d.value || 0;
                const subCollections = d.children?.length || 0;
                const percentOfTotal = totalItems > 0 ? ((countryItems / totalItems) * 100).toFixed(1) + '%' : 'N/A';
                
                tooltip.innerHTML = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${countryName}
                    </div>
                    <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                        <span>${$itemsText}:</span>
                        <span style="text-align:right;font-weight:bold">${countryItems}</span>
                        <span>${$subCollectionsText}:</span>
                        <span style="text-align:right">${subCollections}</span>
                        <span>${$percentTotalText}:</span>
                        <span style="text-align:right">${percentOfTotal}</span>
                    </div>
                    <div style="margin-top:4px;font-style:italic;font-size:10px;">
                        ${$clickZoomInText}
                    </div>
                `;
            } else {
                // Item set tooltip
                const country = zoomedNode ? zoomedNode.data.name : (d.parent ? d.parent.data.name : '');
                const itemSet = d.data.name;
                const itemCount = d.data.itemCount || d.value || 0;
                
                const totalItemCount = totalItems;
                const countryItemCount = zoomedNode ? zoomedNode.data.itemCount : (d.parent ? d.parent.data.itemCount : 0);
                
                const percentOfCountry = countryItemCount && countryItemCount > 0 ? 
                    ((itemCount / countryItemCount) * 100).toFixed(1) + '%' : 'N/A';
                    
                const percentOfTotal = totalItemCount > 0 ? 
                    ((itemCount / totalItemCount) * 100).toFixed(1) + '%' : 'N/A';
                
                tooltip.innerHTML = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${country} > ${itemSet}
                    </div>
                    <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                        <span>${$itemsText}:</span>
                        <span style="text-align:right;font-weight:bold">${itemCount}</span>
                        <span>${$percentParentText}:</span>
                        <span style="text-align:right">${percentOfCountry}</span>
                        <span>${$percentTotalText}:</span>
                        <span style="text-align:right">${percentOfTotal}</span>
                    </div>
                `;
            }
            
            const tooltipWidth = 250;
            const tooltipHeight = 120;
            
            let left = event.pageX + 10;
            let top = event.pageY + 10;
            
            if (left + tooltipWidth > window.innerWidth) {
                left = event.pageX - tooltipWidth - 10;
            }
            
            if (top + tooltipHeight > window.innerHeight) {
                top = event.pageY - tooltipHeight - 10;
            }
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.display = 'block';
        } catch (e) {
            console.error('Error showing tooltip:', e);
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

    // React to changes in the itemsStore
    $: if ($itemsStore.items && $itemsStore.items.length > 0 && !totalItems) {
        // Force a reprocess of data when items change
        hierarchyData = processData($itemsStore.items as Item[]);
    }

    // Initialize visualization when data changes
    $: if ($itemsStore.items && container) {
        updateVisualization();
    }

    onMount(() => {
        try {
            // Wait for component to render
            tick().then(() => {
                if (!container) {
                    console.error('Container element not found in onMount');
                    return;
                }
                
                // Create tooltip
                createTooltip();
                
                // Initialize data
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    // Process data and update visualization
                    hierarchyData = processData($itemsStore.items as Item[]);
                    
                    // Initialize country colors map
                    if (hierarchyData.children && hierarchyData.children.length > 0) {
                        const colorScale = d3.scaleOrdinal<string>()
                            .domain(hierarchyData.children.map(d => d.originalName || d.name))
                            .range(d3.schemeCategory10);
                            
                        // Pre-populate the country colors map
                        hierarchyData.children.forEach(country => {
                            const originalName = country.originalName || country.name;
                            if (!countryColors.has(originalName)) {
                                countryColors.set(originalName, colorScale(originalName));
                            }
                        });
                    }
                    
                    updateVisualization();
                } else {
                    // Load items if not already loaded
                    itemsStore.loadItems();
                }
                
                // Add resize observer only after container is available
                resizeObserver = new ResizeObserver(() => {
                    if (container) {
                        updateVisualization();
                    }
                });
                
                if (container) {
                    resizeObserver.observe(container);
                } else {
                    console.error('Container element not available for ResizeObserver');
                }
            });
            
            // Return cleanup function
            return () => {
                try {
                    // Safely disconnect observer if it exists
                    if (resizeObserver) {
                        resizeObserver.disconnect();
                    }
                    
                    // Clean up D3 selections to prevent memory leaks
                    if (container) {
                        d3.select(container).selectAll('*').remove();
                    }
                    
                    // Clean up tooltip
                    if (tooltip && document.body.contains(tooltip)) {
                        document.body.removeChild(tooltip);
                    }
                } catch (e) {
                    console.error('Error during cleanup:', e);
                }
            };
        } catch (error) {
            console.error('Error in onMount:', error);
            return () => {}; // Return empty cleanup function in case of error
        }
    });
</script>

<div class="country-distribution-container">
    <!-- Using BaseVisualization with our enhanced header -->
    <BaseVisualization
        title=""
        translationKey="" 
        description="This visualization shows the distribution of items by country and sub-collection. You can click on any country block to zoom in and see its sub-collections. The size of each block represents the number of items in that country or sub-collection."
        descriptionTranslationKey={countryDescriptionKey}
        titleHtml={titleHtml}
    >
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {:else if !$itemsStore.items || $itemsStore.items.length === 0}
                <div class="no-data">{$noDataText}</div>
            {:else if !container}
                <div class="loading">Initializing visualization...</div>
            {/if}
        </div>
        
        <div class="stats">
            <div class="stat-summary">
                <h3>{$summaryText}</h3>
                <p>{$totalItemsText}: <strong>{formatNumber(totalItems)}</strong></p>
                {#if !zoomedNode}
                    <p>{$countriesText}: <strong>{formatNumber(countryCount)}</strong></p>
                {/if}
                <p>{$subCollectionsText}: <strong>{formatNumber(subCollectionCount)}</strong></p>
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
    .country-distribution-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    /* Override the visualization header margin to reduce space */
    :global(.country-distribution-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    /* Override the title container padding to reduce space */
    :global(.country-distribution-container .title-container) {
        padding-bottom: 0 !important;
    }
    
    .chart-container {
        flex: 1;
        min-height: 450px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        margin-top: 0;
        padding-top: 0;
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
    
    .loading, .error, .no-data {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-color-secondary);
    }
    
    .error {
        color: var(--error-color);
    }

    :global(.search-highlight rect) {
        stroke: #ff5500 !important;
        stroke-width: 2px !important;
        stroke-dasharray: 5, 2;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { stroke-opacity: 0.6; }
        50% { stroke-opacity: 1; }
        100% { stroke-opacity: 0.6; }
    }
</style> 