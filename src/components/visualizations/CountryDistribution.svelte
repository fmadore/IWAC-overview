<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';

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
                        name: itemSet || 'No Set',
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
    let breadcrumb: HTMLDivElement;

    // Create breadcrumb element
    function createBreadcrumb() {
        breadcrumb = document.createElement('div');
        breadcrumb.style.position = 'absolute';
        breadcrumb.style.top = '10px';
        breadcrumb.style.left = '10px';
        breadcrumb.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        breadcrumb.style.padding = '5px 10px';
        breadcrumb.style.borderRadius = '3px';
        breadcrumb.style.fontSize = '12px';
        breadcrumb.style.pointerEvents = 'none';
        document.body.appendChild(breadcrumb);
    }

    // Update breadcrumb content
    function updateBreadcrumb(node: d3.HierarchyRectangularNode<HierarchyDatum>) {
        let ancestors = node.ancestors();
        // Always ensure the root node is displayed as "IWAC"
        const path = ancestors
            .reverse()
            .map(d => d === root || d.data.name === 'root' ? 'IWAC' : d.data.name)
            .join(' / ');
        log(`Breadcrumb updated: ${path}`);
        breadcrumb.textContent = path;
    }

    // New createTreemap function with custom tiling and zoom transitions
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
            .attr('viewBox', `0 -30 ${width} ${height + 30}`)
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
            .padding(7);
        treemapLayout(hierarchyData);
        root = hierarchyData as d3.HierarchyRectangularNode<HierarchyDatum>;
        currentNode = root;

        // Create scales for positioning (y-scale adjusted for header height)
        const x = d3.scaleLinear().rangeRound([0, width]).domain([0, width]);
        const y = d3.scaleLinear().rangeRound([0, height - 30]).domain([0, height - 30]);

        // Initial render at the root level
        g = svg.append('g');
        render(g, root, x, y);

        // Render function draws nodes and attaches click events for zooming
        function render(group: d3.Selection<SVGGElement, any, null, undefined>, node: d3.HierarchyRectangularNode<HierarchyDatum>, xScale: d3.ScaleLinear<number, number>, yScale: d3.ScaleLinear<number, number>) {
            const nodes = node.children ? [node].concat(node.children) : [node];
            const cell = group.selectAll('g')
                .data(nodes)
                .join('g')
                .attr('transform', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? `translate(0,-30)` : `translate(${xScale(d.x0)},${yScale(d.y0) + 30})`);

            cell.filter((d: d3.HierarchyRectangularNode<HierarchyDatum>) => d !== node && !!d.children)
                .attr('cursor', 'pointer')
                .on('click', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => zoomin(d));
            if (node !== root) {
                cell.filter((d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node)
                    .attr('cursor', 'pointer')
                    .on('click', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => zoomout(d));
            }

            cell.on('mouseover', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => showTooltip(event, d))
                .on('mousemove', (event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) => showTooltip(event, d))
                .on('mouseout', hideTooltip);

            cell.append('rect')
                .attr('fill', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? '#fff' : d.children ? '#ccc' : '#ddd')
                .attr('stroke', '#fff')
                .attr('width', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? width : xScale(d.x1) - xScale(d.x0))
                .attr('height', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? 30 : yScale(d.y1) - yScale(d.y0));

            cell.append('text')
                .attr('x', 4)
                .attr('y', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? 20 : 13)
                .attr('fill', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? '#000' : (d.children ? '#000' : '#fff'))
                .attr('font-weight', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? 'bold' : 'normal')
                .attr('font-size', (d: d3.HierarchyRectangularNode<HierarchyDatum>) => d === node ? '14px' : '12px')
                .text((d: d3.HierarchyRectangularNode<HierarchyDatum>) => d.data.name);
        }

        // Zoom in by rendering a new view for the selected node
        function zoomin(d: d3.HierarchyRectangularNode<HierarchyDatum>) {
            currentNode = d;
            updateBreadcrumb(d);
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([d.x0, d.x1]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([d.y0, d.y1]);
            const oldGroup = g;
            g = svg.append('g');
            render(g, d, newX, newY);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        }

        // Zoom out by rendering the parent view of the current node
        function zoomout(d: d3.HierarchyRectangularNode<HierarchyDatum>) {
            if (!d.parent) return;
            currentNode = d.parent;
            updateBreadcrumb(d.parent);
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([d.parent.x0, d.parent.x1]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([d.parent.y0, d.parent.y1]);
            const oldGroup = g;
            g = svg.insert('g', '*');
            render(g, d.parent, newX, newY);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        }
    }

    // Create tooltip element
    function createTooltip() {
        tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    // Update tooltip content and position
    function showTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        const totalValue = root.value || 0;
        const parentValue = d.parent ? d.parent.value || 0 : totalValue;
        const value = d.value || 0;
        const percentageOfParent = ((value / parentValue) * 100).toFixed(2);
        const percentageOfTotal = ((value / totalValue) * 100).toFixed(2);

        tooltip.innerHTML = `
            <strong>${d.data.name}</strong><br>
            Items: ${value}<br>
            % of Parent: ${percentageOfParent}%<br>
            % of Total: ${percentageOfTotal}%
        `;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.style.display = 'block';
    }

    // Hide tooltip
    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    // Update visualization when data changes or on resize
    $: if ($itemsStore.items) createTreemap();

    onMount(() => {
        createTooltip();
        createBreadcrumb();
        const resizeObserver = new ResizeObserver(() => {
            createTreemap();
        });

        resizeObserver.observe(container);
        return () => {
            resizeObserver.disconnect();
            document.body.removeChild(tooltip);
            document.body.removeChild(breadcrumb);
        };
    });
</script>

<div class="treemap-container" bind:this={container}>
    {#if $itemsStore.loading}
        <div class="loading">Loading...</div>
    {:else if $itemsStore.error}
        <div class="error">{$itemsStore.error}</div>
    {/if}
</div>

<style>
    .treemap-container {
        width: 100%;
        height: 600px;
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
</style> 