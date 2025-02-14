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

    /* Added helper function to compute the bounding box of a node and its descendants */
    function getBoundingBox(node: d3.HierarchyRectangularNode<HierarchyDatum>): { x0: number, y0: number, x1: number, y1: number } {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        node.descendants().forEach(d => {
            if (d.x0 < x0) x0 = d.x0;
            if (d.y0 < y0) y0 = d.y0;
            if (d.x1 > x1) x1 = d.x1;
            if (d.y1 > y1) y1 = d.y1;
        });
        return { x0, y0, x1, y1 };
    }

    function zoom(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        // Traverse up from the clicked node until its parent equals the current selection
        let newSelected: d3.HierarchyRectangularNode<HierarchyDatum> = d;
        while (newSelected.parent && newSelected.parent !== currentNode) {
            newSelected = newSelected.parent;
        }
        // If the newSelected node has children, update currentNode
        if (newSelected && newSelected.children) {
            currentNode = newSelected;
        } else {
            currentNode = newSelected;
        }

        // Select the main container group for zooming
        const mainGroup = d3.select(container).select('svg').select('g');
        const transition = mainGroup.transition().duration(750);

        // Compute bounding box of the selected node (including its descendants)
        const bbox = getBoundingBox(currentNode);
        const boxWidth = bbox.x1 - bbox.x0;
        const boxHeight = bbox.y1 - bbox.y0;
        const newScale = Math.min(width / boxWidth, height / boxHeight) * 0.9; // 0.9 for padding
        const cx = (bbox.x0 + bbox.x1) / 2;
        const cy = (bbox.y0 + bbox.y1) / 2;
        const translateX = width / 2 - newScale * cx;
        const translateY = height / 2 - newScale * cy;

        transition.attr('transform', `translate(${translateX},${translateY}) scale(${newScale})`);

        // Update text visibility based on the new scale
        transition.on('end', () => {
            mainGroup.selectAll('text')
                .style('display', function(n: any) {
                    const node = n as d3.HierarchyRectangularNode<HierarchyDatum>;
                    const cellWidth = (node.x1 - node.x0) * newScale;
                    const cellHeight = (node.y1 - node.y0) * newScale;
                    return cellWidth > 50 && cellHeight > 30 ? 'block' : 'none';
                });
        });
    }

    function createTreemap() {
        if (!container || !$itemsStore.items.length) return;

        // Clear previous content
        d3.select(container).select('svg').remove();

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('font-family', 'sans-serif');

        // Create container group for zooming
        g = svg.append('g');

        // Process data
        const hierarchyData = processData($itemsStore.items as Item[]);

        // Create treemap layout
        const treemapLayout = d3.treemap<HierarchyDatum>()
            .size([width, height])
            .paddingTop(28)
            .paddingRight(7)
            .paddingBottom(7)
            .paddingLeft(7)
            .round(true);

        treemapLayout(hierarchyData);
        root = hierarchyData as d3.HierarchyRectangularNode<HierarchyDatum>;
        currentNode = root;

        // Color scale for countries
        const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Create cells for all nodes
        const cell = g.selectAll('g')
            .data(root.descendants())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        cell.append('rect')
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill', d => {
                if (!d.parent) return 'none';
                if (d.depth === 1) return colorScale(d.data.name);
                const baseColor = d3.color(colorScale(d.parent.data.name));
                return baseColor ? d3.rgb(baseColor).brighter(0.5).toString() : '#ccc';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', d => d.depth === 1 ? 2 : 1)
            .style('cursor', d => d.depth <= 1 ? 'pointer' : 'default')
            .on('click', (event, d) => d.depth <= 1 && zoom(event, d));

        // Add text labels
        const text = cell.append('text')
            .style('user-select', 'none')
            .attr('pointer-events', 'none')
            .attr('x', 4)
            .attr('y', d => d.depth === 1 ? 20 : 13)
            .attr('fill', d => d.depth === 1 ? '#000' : '#fff')
            .attr('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
            .attr('font-size', d => d.depth === 1 ? '14px' : '12px');

        text.append('tspan')
            .text(d => d.data.name);

        text.append('tspan')
            .attr('fill-opacity', 0.7)
            .text(d => d.value ? ` (${d.value})` : '');

        // Update text visibility initially
        text.style('display', function(d) {
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            return width > 50 && height > 30 ? 'block' : 'none';
        });

        // Add tooltips
        cell.append('title')
            .text(d => {
                if (d.depth === 1) {
                    return `${d.data.name}\nTotal Items: ${d.value}\nClick to zoom`;
                } else if (d.depth === 2) {
                    return `${d.parent?.data.name} > ${d.data.name}\nItems: ${d.value}`;
                }
                return '';
            });
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