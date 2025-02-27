<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate } from '../../stores/translationStore';

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
    
    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const wordDistributionText = translate('viz.word_distribution');
    const totalWordsText = translate('viz.total_words');
    const avgWordsPerItemText = translate('viz.avg_words_per_item');
    const clickZoomInText = translate('viz.click_zoom_in');
    const clickZoomOutText = translate('viz.click_zoom_out');
    const unknownText = translate('viz.unknown');
    const noSetText = translate('viz.no_set');

    // Process data
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return { name: 'root', children: [] };
        
        // Filter items - only include those with word_count
        const filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
            // Must have word_count field
            if (item.word_count === undefined) return false;
            return true;
        });
        
        // Update total counts
        totalItems = filteredItems.length;
        totalWordCount = filteredItems.reduce((sum, item) => sum + (item.word_count || 0), 0);
        
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
                countryNode.wordCount! += setWordCount;
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
        updateVisualization();
    }

    // Create or update the visualization
    function updateVisualization() {
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
        const margin = { top: 40, right: 10, bottom: 10, left: 10 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Add title
        const titleText = zoomedNode 
            ? `${zoomedNode.data.name}: ${zoomedNode.data.wordCount?.toLocaleString() || 0} words (${zoomedNode.data.itemCount} items)`
            : `Word Distribution by Country and Item Set (${totalItems} items, ${totalWordCount.toLocaleString()} words)`;
            
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', 'var(--font-size-lg)')
            .attr('font-weight', 'bold')
            .attr('fill', 'var(--text-color-primary)')
            .text(titleText);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // If zoomed in, add a button to zoom out
        if (zoomedNode) {
            const button = svg.append('g')
                .attr('class', 'zoom-out-button')
                .attr('transform', `translate(${margin.left}, ${margin.top - 30})`)
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
                .text('← Back to All');
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
            // When zoomed in, use the zoomed node as root
            root = zoomedNode;
        } else {
            // When not zoomed, create hierarchy from full data
            root = d3.hierarchy<WordHierarchyNode>(hierarchyData)
                .sum(d => d.value || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0));
        }
        
        // Apply treemap layout
        treemap(root as d3.HierarchyRectangularNode<WordHierarchyNode>);
        
        // Color scale
        const colorScale = d3.scaleOrdinal<string>()
            .domain(root.children ? root.children.map(d => d.data.name) : [root.data.name])
            .range(d3.schemeCategory10);
        
        // Create cells for countries (first level)
        const countries = chart.selectAll('.country')
            .data(zoomedNode ? [] : (root.children || []))
            .enter()
            .append('g')
            .attr('class', 'country')
            .attr('transform', d => `translate(${(d as any).x0},${(d as any).y0})`);
        
        // Add country background
        countries.append('rect')
            .attr('width', d => (d as any).x1 - (d as any).x0)
            .attr('height', d => (d as any).y1 - (d as any).y0)
            .attr('fill', d => colorScale(d.data.name))
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
            .text(d => `${d.data.name} (${d.data.wordCount?.toLocaleString() || 0} words)`)
            .style('pointer-events', 'none')
            .each(function(d) {
                const self = d3.select(this);
                const textLength = (this as SVGTextElement).getComputedTextLength();
                const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                
                if (textLength > availableWidth) {
                    self.text(d.data.name)
                        .append('title')
                        .text(`${d.data.name} (${d.data.wordCount?.toLocaleString() || 0} words)`);
                }
            });
        
        // Create cells for item sets (second level)
        const itemSets = chart.selectAll('.item-set')
            .data(zoomedNode ? (root.children || []) : root.leaves())
            .enter()
            .append('g')
            .attr('class', 'item-set')
            .attr('transform', d => `translate(${(d as any).x0},${(d as any).y0})`);
        
        // Add item set rectangles
        itemSets.append('rect')
            .attr('width', d => Math.max(0, (d as any).x1 - (d as any).x0))
            .attr('height', d => Math.max(0, (d as any).y1 - (d as any).y0))
            .attr('fill', d => {
                // Use a lighter shade of the country/parent color
                const nodeColor = zoomedNode 
                    ? colorScale(zoomedNode.data.name) 
                    : colorScale((d.parent as any).data.name);
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
                    .text(`${country} > ${d.data.name}: ${d.data.wordCount?.toLocaleString() || 0} words (${d.data.itemCount} items)`);
                
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
    }

    // Create tooltip
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
        tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        if (document && document.body) {
            document.body.appendChild(tooltip);
        }
    }

    // Show tooltip with data
    function showTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<WordHierarchyNode>) {
        if (!tooltip) return;
        
        const country = zoomedNode ? zoomedNode.data.name : (d.parent ? d.parent.data.name : '');
        const itemSet = d.data.name;
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
                <span>Words:</span>
                <span style="text-align:right;font-weight:bold">${wordCount.toLocaleString()}</span>
                <span>Items:</span>
                <span style="text-align:right">${itemCount}</span>
                <span>Avg words/item:</span>
                <span style="text-align:right">${avgWordsPerItem}</span>
                <span>% of country:</span>
                <span style="text-align:right">${percentOfCountry}</span>
                <span>% of total:</span>
                <span style="text-align:right">${percentOfTotal}</span>
            </div>
        `;
        
        const tooltipWidth = 200;
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
    }

    // Hide tooltip
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Initialize visualization when data changes
    $: if ($itemsStore.items && container) {
        updateVisualization();
    }

    onMount(async () => {
        await tick();
        
        if (!container) {
            console.error('Container element not found in onMount');
            return;
        }
        
        // Create tooltip
        createTooltip();
        
        // Create visualization if data is available
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            updateVisualization();
        } else {
            // Load items if not already loaded
            itemsStore.loadItems();
        }
        
        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (container) {
                updateVisualization();
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

<div class="word-distribution-container">
    <div class="chart-container" bind:this={container}>
        {#if $itemsStore.loading}
            <div class="loading">{t('ui.loading')}</div>
        {:else if $itemsStore.error}
            <div class="error">{$itemsStore.error}</div>
        {/if}
    </div>
    
    <div class="stats">
        <div class="stat-summary">
            <h3>Summary</h3>
            <p>Total items with word count: <strong>{totalItems}</strong></p>
            <p>Total words: <strong>{totalWordCount.toLocaleString()}</strong></p>
            {#if totalItems > 0}
                <p>Average words per item: <strong>{Math.round(totalWordCount / totalItems).toLocaleString()}</strong></p>
            {/if}
            {#if zoomedNode}
                <p>Currently viewing: <strong>{zoomedNode.data.name}</strong></p>
                <p>Click the "Back to All" button to return to the full view</p>
            {:else}
                <p>Click on a country block to zoom in</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .word-distribution-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
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