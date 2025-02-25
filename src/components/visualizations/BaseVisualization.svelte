<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';

    export let title: string;
    export let description: string = '';

    let container: HTMLDivElement;
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    
    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    let width = 0;
    let height = 0;

    onMount(() => {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
                updateVisualization();
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    });

    function updateVisualization() {
        if (!container) return;
        
        // Clear previous SVG
        d3.select(container).select('svg').remove();
        
        // Create new SVG
        svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', 'var(--font-size-lg)')
            .style('fill', 'var(--text-color-primary)')
            .text(title);
    }
</script>

<div class="visualization-container" bind:this={container}>
    {#if $itemsStore.loading}
        <div class="loading">Loading...</div>
    {:else if $itemsStore.error}
        <div class="error">{$itemsStore.error}</div>
    {/if}
</div>

<style>
    .visualization-container {
        width: 100%;
        height: 100%;
        min-height: 400px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        padding: var(--spacing-md);
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