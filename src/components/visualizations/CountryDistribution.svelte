<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import { t, translate } from '../../stores/translationStore';

    // Added interfaces for item and hierarchy datum
    interface Item {
        country: string;
        item_set_title: string;
        // add other properties if needed
    }
    
    interface HierarchyDatum {
        name: string;
        children?: HierarchyDatum[];
        value?: number;
    }

    // Extend the base visualization
    import BaseVisualization from './BaseVisualization.svelte';

    // Configuration options
    let colorScheme = 'viridis'; // Options: 'viridis', 'spectral', 'blues'
    let showLabels = true;
    let searchQuery = '';
    let searchResults: d3.HierarchyRectangularNode<HierarchyDatum>[] = [];
    let selectedNode: d3.HierarchyRectangularNode<HierarchyDatum> | null = null;

    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const distributionText = translate('viz.distribution_items');
    const itemsText = translate('viz.country.items');
    const percentParentText = translate('viz.country.percent_parent');
    const percentTotalText = translate('viz.country.percent_total');
    const clickZoomInText = translate('viz.country.click_zoom_in');
    const clickZoomOutText = translate('viz.country.click_zoom_out');
    const unknownText = translate('viz.country.unknown');
    const noSetText = translate('viz.country.no_set');

    // Function to process data into hierarchical structure
    function processData(items: Item[]): d3.HierarchyNode<HierarchyDatum> {
        // Filter out items without a country value first
        const validItems = items.filter(item => item.country && item.country.trim() !== '');
        
        // Group by country first
        const countryGroups = d3.group(validItems, (d: Item) => d.country);
        
        // Create hierarchical structure
        const root: HierarchyDatum = {
            name: "root",
            children: Array.from(countryGroups, ([country, items]) => ({
                name: country,
                // Group by item_set_title within each country
                children: Array.from(
                    d3.group(items, (d: Item) => d.item_set_title),
                    ([itemSet, items]) => ({
                        name: itemSet || $noSetText,
                        value: items.length // Count of items in this set
                    })
                )
            }))
        };

        return d3.hierarchy<HierarchyDatum>(root)
            .sum((d: HierarchyDatum) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    let width = 0;
    let height = 0;
    let container: HTMLDivElement;
    let currentNode: d3.HierarchyRectangularNode<HierarchyDatum>;
    let g: d3.Selection<SVGGElement, unknown, null, undefined>;
    let root: d3.HierarchyRectangularNode<HierarchyDatum>;
    let tooltip: HTMLDivElement;

    // Forward declare zoom functions so TypeScript knows they exist
    let zoomin: (d: d3.HierarchyRectangularNode<HierarchyDatum>) => void;
    let zoomout: (d: d3.HierarchyRectangularNode<HierarchyDatum>) => void;
    let resetToRoot: () => void;

    // Replace updateBreadcrumb with a simpler function to log the current node
    function logCurrentNode(node: d3.HierarchyRectangularNode<HierarchyDatum>) {
        log(`Current node: ${node.data.name}`);
    }

    // Create color scales based on selected scheme
    function getColorScale(scheme: string, domain: [number, number]) {
        switch(scheme) {
            case 'viridis':
                return d3.scaleSequential(d3.interpolateViridis).domain(domain);
            case 'spectral':
                return d3.scaleSequential(d3.interpolateSpectral).domain(domain);
            case 'blues':
                return d3.scaleSequential(d3.interpolateBlues).domain(domain);
            default:
                return d3.scaleSequential(d3.interpolateViridis).domain(domain);
        }
    }

    // Handle search functionality
    function handleSearch() {
        // No need for this function since we removed the search input
        // But keeping a stub in case it's called elsewhere
        return;
    }
    
    // Create notification for search result - keeping this but simplifying
    function createSearchNotification(node: d3.HierarchyRectangularNode<HierarchyDatum>) {
        // No need for this function since we're not showing search results
        // But keeping a stub in case it's called elsewhere
        return;
    }
    
    // Download visualization as SVG
    function downloadVisualization() {
        if (!container) return;
        
        const svgElement = container.querySelector('svg');
        if (!svgElement) return;
        
        // Create a copy of the SVG to modify for download
        const svgCopy = svgElement.cloneNode(true) as SVGElement;
        
        // Add CSS styles inline
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            text { font-family: sans-serif; }
            .treemap-cell rect { stroke: white; }
            .search-highlight rect { stroke: #ff5500; stroke-width: 2px; }
        `;
        svgCopy.insertBefore(styleElement, svgCopy.firstChild);
        
        // Convert SVG to string
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgCopy);
        
        // Add XML declaration
        svgString = '<?xml version="1.0" standalone="no"?>\n' + svgString;
        
        // Create download link
        const link = document.createElement('a');
        link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        link.download = 'iwac_treemap.svg';
        
        // Make sure document.body exists before appending
        if (document && document.body) {
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // New createTreemap function with enhanced interactivity
    function createTreemap() {
        if (!container || !$itemsStore.items.length) return;

        // Clear previous content
        d3.select(container).select('svg').remove();

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        // Create SVG container with viewBox adjusted for header offset
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 -60 ${width} ${height + 60}`)
            .style('font', '10px sans-serif');

        // Define custom tiling function to adapt aspect ratio when zooming
        function tile(node: any, x0: number, y0: number, x1: number, y1: number) {
            d3.treemapBinary(node, 0, 0, width, height);
            for (const child of node.children) {
                child.x0 = x0 + (child.x0 / width) * (x1 - x0);
                child.x1 = x0 + (child.x1 / width) * (x1 - x0);
                child.y0 = y0 + (child.y0 / height) * (y1 - y0);
                child.y1 = y0 + (child.y1 / height) * (y1 - y0);
            }
        }

        // Process data and compute layout using the custom tile function
        const hierarchyData = processData($itemsStore.items as Item[]);
        const treemapLayout = d3.treemap<HierarchyDatum>()
            .tile(tile)
            .size([width, height - 30])
            .padding(7)
            .paddingTop(15);  // Increase padding for better label visibility
            
        treemapLayout(hierarchyData);
        root = hierarchyData as d3.HierarchyRectangularNode<HierarchyDatum>;
        currentNode = root;
        selectedNode = null;

        // Add title after root is defined
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text(t('viz.distribution_items', [root.value?.toString() || '0']));

        // Create scales for positioning (y-scale adjusted for header height)
        const x = d3.scaleLinear().rangeRound([0, width]).domain([0, width]);
        const y = d3.scaleLinear().rangeRound([0, height - 30]).domain([0, height - 30]);

        // Create color scale based on selected scheme
        const values = root.leaves().map(d => d.value || 0);
        const minValue = d3.min(values) || 0;
        const maxValue = d3.max(values) || 1;
        const colorScale = getColorScale(colorScheme, [minValue, maxValue]);

        // Initial render at the root level
        g = svg.append('g');
        render(g, root, x, y, colorScale);

        // Render function draws nodes and attaches click events for zooming
        function render(
            group: d3.Selection<SVGGElement, any, null, undefined>, 
            node: d3.HierarchyRectangularNode<HierarchyDatum>, 
            xScale: d3.ScaleLinear<number, number>, 
            yScale: d3.ScaleLinear<number, number>,
            colors: d3.ScaleSequential<string>
        ) {
            const nodes = node.children ? [node].concat(node.children) : [node];
            const cell = group.selectAll('g')
                .data(nodes)
                .join('g')
                .attr('class', 'treemap-cell')
                .attr('data-id', d => d.data.name)
                .attr('transform', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => 
                    d === node ? `translate(0,-30)` : `translate(${xScale(d.x0)},${yScale(d.y0) + 30})`)
                .on('mouseenter', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => {
                    showTooltip(event, d);
                    selectedNode = d;
                    
                    // Highlight the cell
                    d3.select(event.currentTarget as Element)
                        .select('rect')
                        .attr('stroke', '#ff5500')
                        .attr('stroke-width', 2);
                })
                .on('mouseleave', (event: MouseEvent) => {
                    hideTooltip();
                    
                    // Remove highlight
                    d3.select(event.currentTarget as Element)
                        .select('rect')
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1);
                });

            cell.filter((d: d3.HierarchyRectangularNode<HierarchyDatum>) => d !== node && !!d.children)
                .attr('cursor', 'pointer')
                .on('click', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => zoomin(d));
                
            if (node !== root) {
                cell.filter((d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node)
                    .attr('cursor', 'pointer')
                    .on('click', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => zoomout(d));
            }

            // Add rectangles with color scale based on value
            cell.append('rect')
                .attr('fill', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => {
                    if (d === node) return '#fff';
                    if (!d.children) {
                        // Leaf nodes get color based on value
                        return colors(d.value || 0);
                    }
                    // Parent nodes get color based on average of children
                    const childValues = d.children.map(c => c.value || 0);
                    const avgValue = d3.mean(childValues) || 0;
                    return colors(avgValue);
                })
                .attr('stroke', '#fff')
                .attr('width', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => 
                    d === node ? width : xScale(d.x1) - xScale(d.x0))
                .attr('height', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => 
                    d === node ? 30 : yScale(d.y1) - yScale(d.y0));

            // Add text labels if enabled and if there's enough space
            if (showLabels) {
                cell.append('text')
                    .attr('x', 4)
                    .attr('y', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? 20 : 13)
                    .attr('fill', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => {
                        if (d === node) return '#000';
                        
                        // Calculate brightness of background for text contrast
                        const rect = d3.select(`[data-id="${d.data.name}"]`).select('rect');
                        const fill = rect.attr('fill') || '#ccc';
                        const rgb = d3.rgb(fill);
                        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                        
                        return brightness > 125 ? '#000' : '#fff';
                    })
                    .attr('font-weight', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => 
                        d === node ? 'bold' : 'normal')
                    .attr('font-size', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => 
                        d === node ? '14px' : '12px')
                    .text((d: d3.HierarchyRectangularNode<HierarchyDatum>) => {
                        // Only show text if the cell is big enough
                        const cellWidth = d === node ? width : xScale(d.x1) - xScale(d.x0);
                        const cellHeight = d === node ? 30 : yScale(d.y1) - yScale(d.y0);
                        
                        if (cellWidth < 30 || cellHeight < 15) return '';
                        
                        return d.data.name + (d.value ? ` (${d.value})` : '');
                    });
            }
        }

        // Zoom in by rendering a new view for the selected node
        zoomin = function(d: d3.HierarchyRectangularNode<HierarchyDatum>) {
            currentNode = d;
            logCurrentNode(d);
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([d.x0, d.x1]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([d.y0, d.y1]);
            const oldGroup = g;
            g = svg.append('g');
            render(g, d, newX, newY, colorScale);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        };

        // Zoom out by rendering the parent view of the current node
        zoomout = function(d: d3.HierarchyRectangularNode<HierarchyDatum>) {
            if (!d.parent) return;
            currentNode = d.parent;
            logCurrentNode(d.parent);
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([d.parent.x0, d.parent.x1]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([d.parent.y0, d.parent.y1]);
            const oldGroup = g;
            g = svg.insert('g', '*');
            render(g, d.parent, newX, newY, colorScale);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        };
        
        // Reset to root view
        resetToRoot = function() {
            if (currentNode === root) return;
            currentNode = root;
            logCurrentNode(root);
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([0, width]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([0, height - 30]);
            const oldGroup = g;
            g = svg.insert('g', '*');
            render(g, root, newX, newY, colorScale);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        };
        
        // Update UI based on search results
        if (searchQuery && searchResults.length > 0) {
            handleSearch();
        }
    }
    
    // Define an external resetToRoot function for standalone use
    function resetToRootExternal() {
        if (currentNode === root) return;
        currentNode = root;
        logCurrentNode(root);
        createTreemap(); // Recreate the entire treemap
    }

    // Create tooltip element with enhanced styling
    function createTooltip() {
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
        tooltip.style.maxWidth = '200px';
        tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // Make sure document.body exists before appending
        if (document && document.body) {
            document.body.appendChild(tooltip);
        }
    }

    // Update tooltip content and position
    function showTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        if (!tooltip || !root) return;
        
        const totalValue = root.value || 0;
        const parentValue = d.parent ? d.parent.value || 0 : totalValue;
        const value = d.value || 0;
        const percentageOfParent = ((value / parentValue) * 100).toFixed(2);
        const percentageOfTotal = ((value / totalValue) * 100).toFixed(2);

        tooltip.innerHTML = `
            <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                ${d.data.name}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                <span>${$itemsText}:</span><span style="text-align:right;font-weight:bold;">${value}</span>
                <span>${$percentParentText}:</span><span style="text-align:right;font-weight:bold;">${percentageOfParent}%</span>
                <span>${$percentTotalText}:</span><span style="text-align:right;font-weight:bold;">${percentageOfTotal}%</span>
            </div>
            ${d.children ? `<div style="font-style:italic;margin-top:4px;font-size:10px;">${$clickZoomInText}</div>` : ''}
            ${d === currentNode && d !== root ? `<div style="font-style:italic;margin-top:4px;font-size:10px;">${$clickZoomOutText}</div>` : ''}
        `;
        
        // Position tooltip with smart placement
        const tooltipWidth = 200; // Approximate width
        const tooltipHeight = 120; // Approximate height
        
        let left = event.pageX + 10;
        let top = event.pageY + 10;
        
        // Adjust if tooltip would go off the right edge
        if (left + tooltipWidth > window.innerWidth) {
            left = event.pageX - tooltipWidth - 10;
        }
        
        // Adjust if tooltip would go off the bottom edge
        if (top + tooltipHeight > window.innerHeight) {
            top = event.pageY - tooltipHeight - 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.display = 'block';
    }

    // Hide tooltip
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Update visualization when data changes or on resize
    $: if ($itemsStore.items) createTreemap();

    onMount(async () => {
        // Wait for initial tick to ensure the component is mounted
        await tick();
        
        // Check if container exists before proceeding
        if (!container) {
            console.error('Container element not found');
            return;
        }
        
        // Now create UI elements in the correct order
        createTooltip();
        
        // Create the initial visualization
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            createTreemap();
        } else {
            // Load items if not already loaded
            itemsStore.loadItems();
        }
        
        const resizeObserver = new ResizeObserver(() => {
            if (container) {
                createTreemap();
            }
        });

        resizeObserver.observe(container);
        
        return () => {
            resizeObserver.disconnect();
            
            // Clean up tooltip
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
        };
    });
</script>

<div class="country-visualization-container">
    <div class="visualization" bind:this={container}>
        {#if $itemsStore.loading}
            <div class="loading">{t('ui.loading')}</div>
        {:else if $itemsStore.error}
            <div class="error">{$itemsStore.error}</div>
        {:else if !$itemsStore.items || $itemsStore.items.length === 0}
            <div class="no-data">{$noDataText}</div>
        {/if}
    </div>
</div>

<style>
    .country-visualization-container {
        width: 100%;
        height: 600px;
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
    }

    .visualization {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .loading, .error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .error {
        color: red;
    }

    .no-data {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        font-weight: bold;
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