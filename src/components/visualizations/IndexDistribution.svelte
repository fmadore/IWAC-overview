<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore, translations } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';

    // Define interfaces for data structures
    interface CategoryCount {
        category: string;
        originalCategory: string;
        count: number;
        percentage: number;
    }

    // States
    let categoryCounts: CategoryCount[] = [];
    let totalItems: number = 0;
    let maxCount: number = 0;
    let isMounted = false;
    
    // Visualization variables
    let container: HTMLDivElement;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    let width = 0;
    let height = 0;

    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip();

    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;

    // Define translation keys
    const indexDescriptionKey = 'viz.index_distribution_description';

    // Color scale for bars
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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
        return t('viz.index_distribution_items', [formattedCount]);
    }
    
    // Update title HTML when needed
    function updateTitleHtml() {
        if (!isMounted) return;
        
        if (totalItems > 0) {
            titleHtml = getTitle(totalItems);
        } else {
            titleHtml = t('viz.index_distribution_title');
        }
    }

    // Subscribe to language changes
    let languageUnsubscribe: () => void;

    // Process data to get index items by category
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Filter items with type "Notice d'autorité"
        const indexItems = $itemsStore.items.filter((item: OmekaItem) => 
            item.type === "Notice d'autorité"
        );
        
        totalItems = indexItems.length;
        
        if (totalItems === 0) return [];
        
        // Group by item_set_title
        const categoryGroups = d3.rollup(
            indexItems,
            v => v.length,
            d => d.item_set_title || t('viz.uncategorized')
        );
        
        // Convert map to array and calculate percentages
        const results: CategoryCount[] = Array.from(categoryGroups, ([category, count]) => {
            // Try to translate the category name if it's one of our known categories
            // If no translation exists, it will return the key, which we'll replace with the original category
            const translationKey = `category.${category}`;
            const translated = t(translationKey);
            // If the translation is the same as the key, it means no translation was found
            const translatedCategory = (translated === translationKey) ? category : translated;
            
            return {
                category: translatedCategory,
                originalCategory: category, // Store original category name for data lookups
                count,
                percentage: (count / totalItems) * 100
            };
        });
        
        // Sort by count descending
        const sortedResults = results.sort((a, b) => b.count - a.count);
        
        // Find max count for scaling
        maxCount = d3.max(sortedResults, d => d.count) || 0;
        
        // Update title HTML
        updateTitleHtml();
        
        return sortedResults;
    }

    // Show tooltip with category information
    function handleShowTooltip(event: MouseEvent, d: CategoryCount) {
        if (!isMounted) return;
        
        const content = createGridTooltipContent(
            d.category,
            [
                { label: t('viz.items'), value: formatNumber(d.count) },
                { label: t('viz.percent_of_total'), value: `${d.percentage.toFixed(2)}%` }
            ]
        );
        
        showTooltip(event, content);
    }

    // Create bar chart visualization
    function createBarChart() {
        if (!isMounted || !container) return;
        
        try {
            // Process data with current filters
            const data = processData();
            if (!data || data.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).append('div')
                    .attr('class', 'no-data')
                    .style('position', 'absolute')
                    .style('top', '50%')
                    .style('left', '50%')
                    .style('transform', 'translate(-50%, -50%)')
                    .style('text-align', 'center')
                    .style('color', 'var(--text-color-secondary)')
                    .text(t('viz.no_data'));
                return;
            }
            
            // Update categoryCounts for reactive updates
            categoryCounts = data;
            
            // Remove previous content
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
            
            // Set margins
            const margin = { top: 20, right: 30, bottom: 120, left: 60 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            // Create SVG container
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`);
            
            // Create chart group
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            // Create scales
            const xScale = d3.scaleBand()
                .domain(data.map(d => d.category))
                .range([0, chartWidth])
                .padding(0.2);
            
            const yScale = d3.scaleLinear()
                .domain([0, maxCount * 1.1]) // Add 10% padding at top
                .range([chartHeight, 0]);
            
            // Create and append x-axis
            const xAxis = d3.axisBottom(xScale);
            chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0, ${chartHeight})`)
                .call(xAxis)
                .selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Create and append y-axis
            const yAxis = d3.axisLeft(yScale).ticks(5);
            chart.append('g')
                .attr('class', 'y-axis')
                .call(yAxis)
                .selectAll('text')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-primary)');
            
            // Add axis labels
            chart.append('text')
                .attr('class', 'x-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + margin.bottom - 10)
                .style('font-size', 'var(--font-size-sm)')
                .style('fill', 'var(--text-color-secondary)')
                .text(t('viz.categories'));
            
            chart.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', `rotate(-90)`)
                .attr('x', -chartHeight / 2)
                .attr('y', -margin.left + 15)
                .style('font-size', 'var(--font-size-sm)')
                .style('fill', 'var(--text-color-secondary)')
                .text(t('viz.number_of_items'));
            
            // Create and append bars
            chart.selectAll('.bar')
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(d.category) || 0)
                .attr('y', d => yScale(d.count))
                .attr('width', xScale.bandwidth())
                .attr('height', d => chartHeight - yScale(d.count))
                .attr('fill', (d, i) => colorScale(d.category))
                .attr('rx', 3) // Rounded corners
                .attr('ry', 3)
                .style('stroke', 'white')
                .style('stroke-width', 1)
                .on('mouseenter', function(event, d) {
                    if (!isMounted) return;
                    // Highlight bar on hover
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', d3.rgb(colorScale(d.category)).brighter(0.5).toString());
                    handleShowTooltip(event, d);
                })
                .on('mousemove', function(event, d) {
                    if (!isMounted) return;
                    handleShowTooltip(event, d);
                })
                .on('mouseleave', function(event, d) {
                    if (!isMounted) return;
                    // Restore original color
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', colorScale(d.category));
                    hideTooltip();
                });
            
            // Add value labels on top of bars
            chart.selectAll('.bar-label')
                .data(data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => (xScale(d.category) || 0) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d.count) - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', 'var(--font-size-xs)')
                .style('fill', 'var(--text-color-secondary)')
                .text(d => d.count);
        } catch (e) {
            console.error('Error creating bar chart:', e);
        }
    }
    
    // Update visualization when data changes
    $: if ($itemsStore.items && container && isMounted) {
        createBarChart();
    }

    let initializationPromise: Promise<void>;

    onMount(() => {
        // Set mounted flag first
        isMounted = true;

        // Create initialization promise
        initializationPromise = (async () => {
            try {
                // Wait for the next tick to ensure container is bound
                await tick();
                
                // Double check container after tick
                if (!container) {
                    console.error('Container element not found in onMount');
                    return;
                }

                // Initialize resize hook
                resizeHook = useD3Resize({
                    container,
                    onResize: () => {
                        if (isMounted && container) {
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            width = newWidth;
                            height = newHeight;
                            createBarChart();
                        }
                    }
                });
                
                // Subscribe to language changes
                languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    currentLang = value;
                    
                    if (container) {
                        updateTitleHtml();
                        
                        if ($itemsStore.items && $itemsStore.items.length > 0) {
                            createBarChart();
                        }
                    }
                });
                
                // Initialize data
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    createBarChart();
                } else {
                    // Load items if not already loaded
                    itemsStore.loadItems();
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            try {
                isMounted = false;
                
                if (resizeHook) {
                    resizeHook.cleanup();
                }
                
                if (languageUnsubscribe) {
                    languageUnsubscribe();
                }
                
                if (container) {
                    d3.select(container).selectAll('*').remove();
                }
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };
    });
</script>

<div class="index-visualization-container">
    <BaseVisualization
        title=""
        translationKey=""
        description="This visualization shows the distribution of index items by category. The size of each bar represents the number of items in that category."
        descriptionTranslationKey={indexDescriptionKey}
        titleHtml={titleHtml}
    >
        <div class="chart-container" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error">{$itemsStore.error}</div>
            {/if}
        </div>
        
        <div class="stats">
            {#if categoryCounts.length > 0}
                <div class="stat-summary">
                    <h3>{t('viz.summary')}</h3>
                    <p>{t('viz.total_items')}: <strong>{formatNumber(totalItems)}</strong></p>
                    <p>{t('viz.number_of_categories')}: <strong>{formatNumber(categoryCounts.length)}</strong></p>
                </div>
                <div class="top-categories">
                    <h3>{t('viz.top_categories')}</h3>
                    <ul>
                        {#each categoryCounts.slice(0, 5) as category}
                            <li>
                                <span class="category-name">{category.category}</span>
                                <span class="category-count">{formatNumber(category.count)} {t('viz.items')} ({category.percentage.toFixed(1)}%)</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    .index-visualization-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    
    /* Override the visualization header margin to reduce space */
    :global(.index-visualization-container .visualization-header) {
        margin-bottom: var(--spacing-xs) !important;
    }
    
    /* Override the title container padding to reduce space */
    :global(.index-visualization-container .title-container) {
        padding-bottom: 0 !important;
    }
    
    .chart-container {
        flex: 1;
        min-height: 500px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        margin-bottom: var(--spacing-md);
    }
    
    .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .stat-summary, .top-categories {
        padding: var(--spacing-md);
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-sm);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-xs);
    }
    
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    li {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
    }
    
    .category-name {
        color: var(--text-color-primary);
    }
    
    .category-count {
        color: var(--text-color-secondary);
        font-weight: bold;
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
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .stats {
            grid-template-columns: 1fr;
        }
    }
</style> 