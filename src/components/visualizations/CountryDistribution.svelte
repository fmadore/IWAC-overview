<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';

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

            cell.append('title')
                .text((d: d3.HierarchyRectangularNode<HierarchyDatum>) => {
                    if (d === node) {
                        return `${node.data.name}\nTotal Items: ${node.value}\nClick to zoom out`;
                    } else if (d.children) {
                        return `${d.data.name}\nItems: ${d.value}\nClick to zoom in`;
                    }
                    return '';
                });

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
            const newX = d3.scaleLinear().rangeRound([0, width]).domain([d.parent.x0, d.parent.x1]);
            const newY = d3.scaleLinear().rangeRound([0, height - 30]).domain([d.parent.y0, d.parent.y1]);
            const oldGroup = g;
            g = svg.insert('g', '*');
            render(g, d.parent, newX, newY);
            oldGroup.transition().duration(750).style('opacity', 0).remove();
        }
    }

    // Update visualization when data changes or on resize
    $: if ($itemsStore.items) createTreemap();

    onMount(() => {
        const resizeObserver = new ResizeObserver(() => {
            createTreemap();
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
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