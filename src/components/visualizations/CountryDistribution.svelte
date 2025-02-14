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

    function zoom(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        if (!d.parent) return; // Don't zoom on root

        const transition = d3.select(container)
            .select('svg')
            .transition()
            .duration(750)
            .ease(d3.easeCubicInOut);

        // If we're already zoomed into this node, zoom out to root
        if (currentNode === d) {
            currentNode = d.parent;
            displayNode(currentNode, transition);
            return;
        }

        // If we're zooming into a new node
        currentNode = d;
        displayNode(d, transition);
    }

    function displayNode(
        d: d3.HierarchyRectangularNode<HierarchyDatum>,
        transition: d3.Transition<d3.BaseType, unknown, null, undefined>
    ) {
        // Calculate the scale and translation to center the node
        const x = d.x0;
        const y = d.y0;
        const dx = d.x1 - d.x0;
        const dy = d.y1 - d.y0;

        // Add some padding around the zoomed area
        const padding = 0.05;
        const scale = Math.min(
            width / (dx * (1 + padding * 2)),
            height / (dy * (1 + padding * 2))
        );

        const translateX = width / 2 - (x + dx / 2) * scale;
        const translateY = height / 2 - (y + dy / 2) * scale;

        // Apply the transform to the container group
        transition.selectAll('g')
            .attr('transform', `translate(${translateX},${translateY})scale(${scale})`);

        // Update visibility of text based on available space
        d3.select(container)
            .selectAll('text')
            .style('display', function(n: any) {
                const node = n as d3.HierarchyRectangularNode<HierarchyDatum>;
                if (!node.parent) return 'none';
                const width = (node.x1 - node.x0) * scale;
                const height = (node.y1 - node.y0) * scale;
                return width > 30 && height > 20 ? 'block' : 'none';
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
            .attr('height', height);

        // Create container group for zooming
        const g = svg.append('g');

        // Process data
        const hierarchyData = processData($itemsStore.items as Item[]);

        // Create treemap layout
        const treemapLayout = d3.treemap<HierarchyDatum>()
            .size([width, height])
            .paddingTop(28)
            .paddingRight(3)
            .paddingBottom(3)
            .paddingLeft(3)
            .round(true);

        treemapLayout(hierarchyData);
        // Cast to HierarchyRectangularNode to get x0, y0, etc.
        const root = hierarchyData as d3.HierarchyRectangularNode<HierarchyDatum>;
        currentNode = root;

        // Color scale for countries
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Create cells for all nodes (including parents)
        const cell = g.selectAll('g')
            .data(root.descendants())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        cell.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => {
                if (!d.parent) return 'none'; // root node
                if (d.depth === 1) return colorScale(d.data.name); // country
                // Convert the brightened color to a string
                const baseColor = d3.color(colorScale(d.parent.data.name));
                return baseColor ? d3.rgb(baseColor).brighter(0.5).toString() : '#ccc';
            })
            .attr('fill-opacity', d => d.depth === 1 ? 0.6 : 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', d => d.depth === 1 ? 2 : 1)
            .style('cursor', d => d.depth <= 1 ? 'pointer' : 'default')
            .on('click', (event, d) => d.depth <= 1 && zoom(event, d));

        // Add text labels with better positioning and sizing
        cell.append('text')
            .attr('x', 4)
            .attr('y', d => d.depth === 1 ? 20 : 13)
            .attr('fill', d => d.depth === 1 ? 'black' : 'white')
            .attr('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
            .attr('font-size', d => d.depth === 1 ? '14px' : '12px')
            .text(d => `${d.data.name}${d.value ? ` (${d.value})` : ''}`)
            .each(function(d) {
                const self = d3.select(this);
                const node = self.node();
                if (!node) return;
                let textLength = node.getComputedTextLength();
                const boxWidth = d.x1 - d.x0;
                
                if (textLength > boxWidth - 8) {
                    let text = d.data.name;
                    while (text.length > 0 && textLength > boxWidth - 8) {
                        text = text.slice(0, -1);
                        self.text(text + '...' + (d.value ? ` (${d.value})` : ''));
                        textLength = node.getComputedTextLength();
                    }
                }
            });

        // Add tooltips with more information
        cell.append('title')
            .text(d => {
                if (d.depth === 1) {
                    return `Country: ${d.data.name}\nTotal Items: ${d.value}\nClick to zoom`;
                } else if (d.depth === 2) {
                    return `Country: ${d.parent?.data.name}\nSet: ${d.data.name}\nItems: ${d.value}`;
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