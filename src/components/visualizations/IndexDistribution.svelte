<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';
    import { D3Service } from '../../services/d3Service';

    // Define interfaces for data structures
    interface CategoryCount {
        category: string;
        originalCategory: string;
        count: number;
        percentage: number;
    }

    // Map French item_set_title to category keys
    const categoryMappings: Record<string, string> = {
        'Évènements': 'Events',
        'Associations': 'Organizations',
        'Individus': 'Persons',
        'Emplacements': 'Locations',
        'Sujets': 'Topics',
        'Notices d\'autorité': 'Authority Files'
    };

    // Function to map item set title to the correct category key
    function mapToCategory(itemSetTitle: string): string {
        // Return mapped category if exists, otherwise return original
        return categoryMappings[itemSetTitle] || itemSetTitle;
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

    // Initialize data processing hook with custom filter function
    const { filterItems, groupAndCount } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['type'],
        filterFn: (item: OmekaItem) => item.type === "Notice d'autorité",
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
    });

    // Define translation keys
    const indexDescriptionKey = 'viz.index_distribution_description';

    // Create a reused color scale
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
        return t('viz.index_distribution_items', { '0': formattedCount });
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
        
        // Filter and group items
        const results = groupAndCount(
            $itemsStore.items,
            item => item.item_set_title || t('viz.uncategorized')
        );
        
        // Transform results to match our CategoryCount interface
        const categoryCounts: CategoryCount[] = results.map(result => {
            // Map the item_set_title to the correct category key first
            const mappedCategory = mapToCategory(result.key);
            // Then build the translation key
            const categoryKey = `category.${mappedCategory}`;
            // Use the translation store's t function to get the proper translation
            const translatedCategory = t(categoryKey);
            
            return {
                // Only use the translated string if it exists, otherwise use the original key
                category: translatedCategory !== categoryKey ? translatedCategory : result.key,
                originalCategory: result.key,
                count: result.count,
                percentage: result.percentage || 0
            };
        });
        
        // Update state
        totalItems = results.reduce((sum, r) => sum + r.count, 0);
        maxCount = d3.max(categoryCounts, d => d.count) || 0;
        updateTitleHtml();
        
        return categoryCounts;
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
                D3Service.handleNoData(container, t('viz.no_data'));
                return;
            }
            
            // Update categoryCounts for reactive updates
            categoryCounts = data;
            
            // Check if mobile view (width < 768px)
            const isMobile = width < 768;
            const isExtraSmall = width < 480;
            
            // Set margins - adjust for mobile
            const margin = isMobile 
                ? { top: 20, right: 15, bottom: 140, left: 45 }
                : { top: 20, right: 30, bottom: 120, left: 60 };
            
            // Create SVG with D3Service
            const { svg, chart, chartWidth, chartHeight } = D3Service.createSVG({
                container,
                width,
                height,
                margin,
                className: 'index-distribution-chart',
                responsive: true
            });
            
            // Create scales with D3Service
            const xScale = D3Service.createScale({
                type: 'band',
                domain: data.map(d => d.category),
                range: [0, chartWidth],
                padding: isMobile ? 0.1 : 0.2 // Reduce padding on mobile
            }) as d3.ScaleBand<string>;
            
            const yScale = D3Service.createScale({
                type: 'linear',
                domain: [0, maxCount * 1.1], // Add 10% padding at top
                range: [chartHeight, 0]
            }) as d3.ScaleLinear<number, number>;
            
            // Create axes with D3Service
            const xAxis = D3Service.createAxis({
                type: 'x',
                scale: xScale,
                position: 'bottom'
            });
            
            const yAxis = D3Service.createAxis({
                type: 'y',
                scale: yScale,
                ticks: isMobile ? 3 : 5, // Fewer ticks on mobile
            });
            
            // Render X axis with manual rotation to match the original implementation
            chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0, ${chartHeight})`)
                .call(g => D3Service.renderAxis(g, xAxis))
                .selectAll('text')
                .attr('transform', isMobile ? 'rotate(-70)' : 'rotate(-45)') // More rotation on mobile
                .attr('text-anchor', 'end')
                .attr('dx', isMobile ? '-.8em' : '-.8em')
                .attr('dy', isMobile ? '.15em' : '.15em')
                .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)') // Smaller text on mobile
                .attr('fill', 'var(--color-text-primary)');
            
            // Render Y axis
            chart.append('g')
                .attr('class', 'y-axis')
                .call(g => D3Service.renderAxis(g, yAxis))
                .selectAll('text')
                .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)') // Smaller text on mobile
                .attr('fill', 'var(--color-text-primary)');
            
            // Add axis labels - hide on very small screens
            if (width > 320) {
                chart.append('text')
                    .attr('class', 'x-axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('x', chartWidth / 2)
                    .attr('y', chartHeight + (isMobile ? margin.bottom - 5 : margin.bottom - 10))
                    .attr('font-size', isMobile ? '10px' : 'var(--font-size-sm)')
                    .attr('fill', 'var(--color-text-secondary)')
                    .text(t('viz.categories'));
                
                chart.append('text')
                    .attr('class', 'y-axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('transform', `rotate(-90)`)
                    .attr('x', -chartHeight / 2)
                    .attr('y', isMobile ? -margin.left + 12 : -margin.left + 15)
                    .attr('font-size', isMobile ? '10px' : 'var(--font-size-sm)')
                    .attr('fill', 'var(--color-text-secondary)')
                    .text(t('viz.number_of_items'));
            }
            
            // Create bars with consistent colors based on originalCategory, not translated category
            chart.selectAll('.bar')
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'bar cursor-pointer')
                .attr('x', d => xScale(d.category) || 0)
                .attr('y', d => yScale(d.count))
                .attr('width', xScale.bandwidth())
                .attr('height', d => Math.max(0, chartHeight - yScale(d.count))) // Ensure height is not negative
                .attr('fill', (d, i) => colorScale(d.originalCategory))
                .attr('rx', isMobile ? 2 : 3) // Smaller rounded corners on mobile
                .attr('ry', isMobile ? 2 : 3)
                .attr('stroke', 'white')
                .attr('stroke-width', isMobile ? 0.5 : 1) // Thinner stroke on mobile
                .on('mouseenter', function(event, d) {
                    if (!isMounted) return;
                    // Highlight bar on hover
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', d3.rgb(colorScale(d.originalCategory)).brighter(0.5).toString());
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
                        .attr('fill', colorScale(d.originalCategory));
                    hideTooltip();
                });
            
            // Add value labels on top of bars - only if bar is large enough
            chart.selectAll('.bar-label')
                .data(data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => (xScale(d.category) || 0) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d.count) - 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)')
                .attr('fill', 'var(--color-text-secondary)')
                .attr('display', d => {
                    // Hide labels on very small bars or on small screens
                    const barHeight = chartHeight - yScale(d.count);
                    return (barHeight < 15 && isMobile) ? 'none' : 'block';
                })
                .text(d => d.count);
        } catch (e) {
            console.error('Error creating bar chart:', e);
        }
    }
    
    // Update visualization when data changes
    $: if (isMounted && $itemsStore.items && container) {
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

    // Add onDestroy to ensure cleanup
    onDestroy(() => {
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
    });
</script>

<div class="w-full h-full flex flex-col index-visualization-container">
    <BaseVisualization
        titleHtml={titleHtml}
        descriptionTranslationKey={indexDescriptionKey}
        theme="default"
        className="index-visualization"
    >
        <div class="chart-container relative flex-1 bg-card rounded p-md overflow-hidden min-h-400" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error absolute inset-center text-error">{$itemsStore.error}</div>
            {/if}
        </div>
    </BaseVisualization>
</div>

<style>
    /* Only keep styles that can't be achieved with utility classes */
    /* Responsive adjustments handled by utility classes */
</style> 