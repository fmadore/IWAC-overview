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
        // Group by country first
        const countryGroups = d3.group(items, (d: Item) => d.country);
        
        // Create hierarchical structure
        const root: HierarchyDatum = {
            name: "root",
            children: Array.from(countryGroups, ([country, items]) => ({
                name: country,
                // Group by item_set_title within each country
                children: Array.from(
                    d3.group(items, (d: Item) => d.item_set_title),
                    ([itemSet, items]) => ({
                        name: itemSet,
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

        // Process data
        const hierarchyData = processData($itemsStore.items as Item[]);

        // Create treemap layout
        const treemapLayout = d3.treemap<HierarchyDatum>()
            .size([width, height])
            .padding(1)
            .round(true);

        treemapLayout(hierarchyData);
        // Cast to HierarchyRectangularNode to get x0, y0, etc.
        const root = hierarchyData as d3.HierarchyRectangularNode<HierarchyDatum>;

        // Color scale for countries
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Create cells
        const cell = svg.selectAll('g')
            .data(root.leaves())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        cell.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => d.parent ? colorScale(d.parent.data.name) : '#ccc')
            .attr('opacity', 0.8)
            .attr('stroke', '#fff');

        // Add text labels
        cell.append('text')
            .attr('x', 3)
            .attr('y', 13)
            .text(d => `${d.data.name} (${d.value})`)
            .attr('font-size', '10px')
            .attr('fill', 'white')
            .each(function(d: d3.HierarchyRectangularNode<HierarchyDatum>) {
                const self = d3.select(this);
                const node = self.node();
                if (!node) return;
                let textLength = node.getComputedTextLength();
                const boxWidth = d.x1 - d.x0;
                
                if (textLength > boxWidth) {
                    let text = d.data.name;
                    while (text.length > 0 && textLength > boxWidth) {
                        text = text.slice(0, -1);
                        self.text(text + '...' + ` (${d.value})`);
                        textLength = node.getComputedTextLength();
                    }
                }
            });

        // Add tooltips
        cell.append('title')
            .text(d => `Country: ${d.parent ? d.parent.data.name : ''}\nSet: ${d.data.name}\nItems: ${d.value}`);
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