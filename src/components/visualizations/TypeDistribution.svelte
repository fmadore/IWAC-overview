<script lang="ts">
    import { onMount, onDestroy, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { log } from '../../utils/logger';
    import { t, translate } from '../../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../../utils/debug';

    const COMPONENT_ID = 'TypeDistribution';
    let isMounted = false;
    let unsubscribeItems: () => void;

    // Data interfaces
    interface TypeYearData {
        year: number;
        type: string;
        count: number;
    }

    interface FacetOption {
        value: string;
        label: string;
        count: number;
        selected: boolean;
    }

    // Add a new interface for type visibility
    interface TypeVisibility {
        type: string;
        visible: boolean;
    }

    // Visualization state
    let container: HTMLDivElement;
    let tooltip: HTMLDivElement;
    let width = 0;
    let height = 0;
    let countryOptions: FacetOption[] = [];
    let allYears: number[] = [];
    let selectedYearRange: [number, number] = [0, 0];
    let typeYearData: TypeYearData[] = [];
    let totalItems = 0;
    
    // Add state for type visibility
    let typeVisibility: TypeVisibility[] = [];

    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const filterByCountryText = translate('viz.filter_by_country');
    const allCountriesText = translate('viz.all_countries');
    const publicationYearText = translate('viz.publication_year');
    const numberOfItemsText = translate('viz.number_of_items');
    const toggleTypesText = translate('viz.toggle_types');
    const toggledTypeText = translate('viz.toggled_type');

    // Extract year from different date formats
    function extractYear(dateString?: string): number | null {
        if (!dateString) return null;
        
        // Handle YYYY format
        if (/^\d{4}$/.test(dateString)) {
            return parseInt(dateString);
        }
        
        // Handle YYYY-MM format
        if (/^\d{4}-\d{2}$/.test(dateString)) {
            return parseInt(dateString.substring(0, 4));
        }
        
        // Handle YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return parseInt(dateString.substring(0, 4));
        }
        
        return null;
    }

    // Process data based on current filters
    function processData() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return [];
        
        // Get selected countries
        const selectedCountries = countryOptions
            .filter(option => option.selected)
            .map(option => option.value);
        
        // Filter items by selected countries, valid publication dates, and exclude "Notice d'autorité" type
        const filteredItems = $itemsStore.items.filter((item: OmekaItem) => {
            // Exclude items with type "Notice d'autorité"
            if (item.type === "Notice d'autorité") return false;
            
            // Filter by publication date
            const year = extractYear(item.publication_date);
            if (!year) return false;
            
            // Filter by selected years
            if (year < selectedYearRange[0] || year > selectedYearRange[1]) return false;
            
            // Filter by selected countries (if any are selected)
            if (selectedCountries.length > 0 && !selectedCountries.includes(item.country)) {
                return false;
            }
            
            return true;
        });
        
        totalItems = filteredItems.length;
        
        // Group items by year and type
        const yearTypeMap = new Map();
        
        filteredItems.forEach(item => {
            const year = extractYear(item.publication_date);
            if (!year) return;
            
            const type = item.type || 'Unknown';
            
            const key = `${year}-${type}`;
            if (yearTypeMap.has(key)) {
                yearTypeMap.set(key, yearTypeMap.get(key) + 1);
            } else {
                yearTypeMap.set(key, 1);
            }
        });
        
        // Convert map to array of TypeYearData objects
        const result: TypeYearData[] = [];
        yearTypeMap.forEach((count, key) => {
            const [yearStr, type] = key.split('-');
            result.push({
                year: parseInt(yearStr),
                type,
                count
            });
        });
        
        return result;
    }

    // Generate facet options for countries
    function generateCountryFacets() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        // Get items with publication dates and exclude "Notice d'autorité" type
        const itemsWithDates = $itemsStore.items.filter(item => 
            extractYear(item.publication_date) !== null && 
            item.type !== "Notice d'autorité"
        );
        
        // Group by country
        const countryGroups = d3.group(itemsWithDates, (d: OmekaItem) => d.country || 'Unknown');
        
        // Convert to facet options format, excluding "Unknown" country
        countryOptions = Array.from(countryGroups, ([country, items]) => ({
            value: country,
            label: country,
            count: items.length,
            selected: false // Initially not selected
        }))
        .filter(option => option.value !== 'Unknown') // Exclude "Unknown" country
        .sort((a, b) => b.count - a.count);
    }

    // Generate array of all years present in the data
    function generateYearRange() {
        if (!$itemsStore.items || $itemsStore.items.length === 0) return;
        
        const years = $itemsStore.items
            .filter(item => item.type !== "Notice d'autorité") // Exclude "Notice d'autorité" type
            .map(item => extractYear(item.publication_date))
            .filter((year): year is number => year !== null);
        
        if (years.length === 0) return;
        
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        allYears = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
        selectedYearRange = [minYear, maxYear];
    }

    // Handle country selection change
    function toggleCountry(option: FacetOption) {
        option.selected = !option.selected;
        countryOptions = [...countryOptions]; // Trigger reactivity
        updateVisualization();
    }

    // Handle year range change
    function handleYearRangeChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const index = parseInt(input.dataset.index || '0');
        const value = parseInt(input.value);
        
        if (index === 0) {
            // Min year changed
            selectedYearRange = [value, Math.max(value, selectedYearRange[1])];
        } else {
            // Max year changed
            selectedYearRange = [Math.min(value, selectedYearRange[0]), value];
        }
        
        updateVisualization();
    }

    // Create tooltip
    function createTooltip() {
        try {
            // Remove any existing tooltip first
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
            
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
        } catch (e) {
            console.error('Error creating tooltip:', e);
        }
    }

    // Show tooltip with data
    function showTooltip(event: MouseEvent, d: any, stackedData: d3.Series<any, string>[]) {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                createTooltip();
            }
            
            if (!tooltip) return;
            
            const year = d.data.year;
            const typeCounts = stackedData.map(series => {
                const typeItem = series.find(item => item.data.year === year);
                return {
                    type: series.key,
                    count: typeItem ? typeItem[1] - typeItem[0] : 0
                };
            }).filter(item => item.count > 0);
            
            // Calculate total for percentage
            const total = typeCounts.reduce((sum, item) => sum + item.count, 0);
            
            tooltip.innerHTML = `
                <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                    Year: ${year}
                </div>
                <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px;">
                    <span style="font-weight:bold">Type</span>
                    <span style="text-align:right;font-weight:bold">Count</span>
                    <span style="text-align:right;font-weight:bold">%</span>
                    ${typeCounts.map(item => `
                        <span>${item.type}</span>
                        <span style="text-align:right">${item.count}</span>
                        <span style="text-align:right">${((item.count / total) * 100).toFixed(1)}%</span>
                    `).join('')}
                    <span style="border-top:1px solid rgba(255,255,255,0.3);font-weight:bold;margin-top:2px;padding-top:2px;">Total</span>
                    <span style="border-top:1px solid rgba(255,255,255,0.3);text-align:right;font-weight:bold;margin-top:2px;padding-top:2px;">${total}</span>
                    <span></span>
                </div>
            `;
            
            const tooltipWidth = 250;
            const tooltipHeight = 150;
            
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
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }

    // Hide tooltip
    function hideTooltip() {
        try {
            if (tooltip && document.body.contains(tooltip)) {
                tooltip.style.display = 'none';
            }
        } catch (e) {
            console.error('Error hiding tooltip:', e);
        }
    }

    // Create or update the visualization
    function updateVisualization() {
        if (!container) {
            console.error('Container element not found in updateVisualization');
            return;
        }
        
        // Process data based on current filters
        typeYearData = processData();
        
        if (typeYearData.length === 0) {
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
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
        
        // Remove previous visualization and no-data message
        d3.select(container).select('svg').remove();
        d3.select(container).select('.no-data').remove();
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        
        // Set margins
        const margin = { top: 40, right: 60, bottom: 120, left: 60 }; // Increased bottom margin for legend
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Get all unique types
        const types = Array.from(new Set(typeYearData.map(d => d.type)));
        
        // Initialize type visibility if not already set
        if (typeVisibility.length === 0) {
            typeVisibility = types.map(type => ({ type, visible: true }));
        } else {
            // Add any new types that weren't in the visibility list
            const existingTypes = typeVisibility.map(t => t.type);
            types.forEach(type => {
                if (!existingTypes.includes(type)) {
                    typeVisibility.push({ type, visible: true });
                }
            });
        }
        
        // Group the data by year, only including visible types
        const yearData = Array.from(d3.group(
            typeYearData.filter(d => typeVisibility.find(t => t.type === d.type)?.visible ?? true),
            d => d.year
        ), ([year, items]) => {
            const result: any = { year };
            
            // Add count for each type
            items.forEach(item => {
                result[item.type] = item.count;
            });
            
            return result;
        }).sort((a, b) => a.year - b.year);
        
        // Get only visible types for the chart
        const visibleTypes = types.filter(type => 
            typeVisibility.find(t => t.type === type)?.visible ?? true
        );
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Create scales
        const x = d3.scaleBand()
            .domain(yearData.map(d => d.year.toString()))
            .range([0, chartWidth])
            .padding(0.1);
        
        // Get maximum stacked value for y scale
        const stackedData = d3.stack<any>()
            .keys(visibleTypes)
            .value((d, key) => d[key] || 0)
            (yearData);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(stackedData.length > 0 ? stackedData[stackedData.length - 1] : [], d => d[1]) || 0])
            .range([chartHeight, 0]);
        
        // Create color scale for types
        const color = d3.scaleOrdinal<string>()
            .domain(types)
            .range(d3.schemeCategory10);
        
        // Add x axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .selectAll('text')
            .style('text-anchor', 'middle')
            .attr('dy', '0.8em')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)');
        
        // Add y axis
        chart.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text')
            .style('font-size', 'var(--font-size-xs)')
            .style('fill', 'var(--text-color-primary)');
        
        // Add axis labels
        chart.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + margin.bottom - 10)
            .attr('fill', 'var(--text-color-secondary)')
            .style('font-size', 'var(--font-size-sm)')
            .text($publicationYearText);
        
        chart.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -margin.left + 15)
            .attr('fill', 'var(--text-color-secondary)')
            .style('font-size', 'var(--font-size-sm)')
            .text($numberOfItemsText);
        
        // Create stacked bars
        chart.selectAll('.type-bars')
            .data(stackedData)
            .enter()
            .append('g')
            .attr('class', 'type-bars')
            .attr('fill', d => color(d.key))
            .selectAll('rect')
            .data(d => d)
            .enter()
            .append('rect')
            .attr('x', d => x(d.data.year.toString()) || 0)
            .attr('y', d => y(d[1]))
            .attr('height', d => y(d[0]) - y(d[1]))
            .attr('width', x.bandwidth())
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', (event, d) => {
                showTooltip(event, d, stackedData);
            })
            .on('mousemove', (event, d) => {
                showTooltip(event, d, stackedData);
            })
            .on('mouseleave', () => {
                hideTooltip();
            });
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', 'var(--font-size-lg)')
            .attr('font-weight', 'bold')
            .attr('fill', 'var(--text-color-primary)')
            .text(`Item Types by Publication Year (${totalItems} items)`);
        
        // Add interactive legend below the chart instead of on the right
        const legendItemWidth = 150; // Width of each legend item
        const legendItemsPerRow = Math.floor(chartWidth / legendItemWidth); // Number of items per row
        const legendRowHeight = 25; // Height of each row
        
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + 40})`);
        
        // Add legend title
        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('font-size', 'var(--font-size-sm)')
            .attr('font-weight', 'bold')
            .attr('fill', 'var(--text-color-primary)')
            .text($toggleTypesText);
        
        types.forEach((type, i) => {
            const isVisible = typeVisibility.find(t => t.type === type)?.visible ?? true;
            
            // Calculate position in grid layout
            const row = Math.floor(i / legendItemsPerRow);
            const col = i % legendItemsPerRow;
            
            // Create a group for each legend item
            const legendItem = legend.append('g')
                .attr('transform', `translate(${col * legendItemWidth}, ${row * legendRowHeight})`) // Position in grid
                .attr('class', 'legend-item')
                .attr('role', 'button')
                .style('cursor', 'pointer');
            
            // Add background for better click target
            legendItem.append('rect')
                .attr('x', -5)
                .attr('y', -5)
                .attr('width', legendItemWidth - 10)
                .attr('height', 20)
                .attr('fill', 'transparent')
                .attr('class', 'legend-hitbox');
            
            // Add color box
            legendItem.append('rect')
                .attr('width', 14)
                .attr('height', 14)
                .attr('fill', color(type))
                .attr('stroke', isVisible ? 'none' : '#999')
                .attr('stroke-width', isVisible ? 0 : 1)
                .attr('opacity', isVisible ? 1 : 0.5);
            
            // Add text
            const text = legendItem.append('text')
                .attr('x', 24)
                .attr('y', 12)
                .attr('font-size', 'var(--font-size-sm)')
                .attr('fill', 'var(--text-color-primary)')
                .style('opacity', isVisible ? 1 : 0.5)
                .text(type);
            
            // Add strikethrough for hidden types
            if (!isVisible) {
                const textNode = text.node();
                if (textNode) {
                    const textWidth = textNode.getComputedTextLength();
                    legendItem.append('line')
                        .attr('x1', 24)
                        .attr('y1', 12)
                        .attr('x2', 24 + textWidth)
                        .attr('y2', 12)
                        .attr('stroke', 'var(--text-color-primary)')
                        .attr('stroke-width', 1)
                        .attr('opacity', 0.7);
                }
            }
            
            // Add click handler to the entire group
            legendItem.on('click', () => {
                console.log(`Clicked on type: ${type}`);
                d3.select(container).append('div')
                    .attr('class', 'debug-message')
                    .style('position', 'fixed')
                    .style('bottom', '10px')
                    .style('left', '10px')
                    .style('background', 'rgba(0,0,0,0.7)')
                    .style('color', 'white')
                    .style('padding', '5px 10px')
                    .style('border-radius', '4px')
                    .style('z-index', 9999)
                    .text(`Toggled type: ${type}`)
                    .transition()
                    .duration(2000)
                    .style('opacity', 0)
                    .remove();
                
                const typeIndex = typeVisibility.findIndex(t => t.type === type);
                if (typeIndex >= 0) {
                    typeVisibility[typeIndex].visible = !typeVisibility[typeIndex].visible;
                    typeVisibility = [...typeVisibility]; // Trigger reactivity
                    updateVisualization();
                }
            })
            .attr('tabindex', '0')
            .on('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const typeIndex = typeVisibility.findIndex(t => t.type === type);
                    if (typeIndex >= 0) {
                        typeVisibility[typeIndex].visible = !typeVisibility[typeIndex].visible;
                        typeVisibility = [...typeVisibility]; // Trigger reactivity
                        updateVisualization();
                    }
                }
            });
            
            // Add hover effects
            legendItem.on('mouseenter', function() {
                d3.select(this).select('text').style('font-weight', 'bold');
                d3.select(this).select('.legend-hitbox').attr('fill', 'rgba(0,0,0,0.05)');
            }).on('mouseleave', function() {
                d3.select(this).select('text').style('font-weight', 'normal');
                d3.select(this).select('.legend-hitbox').attr('fill', 'transparent');
            });
        });
    }

    function handleItemsChange(items: any) {
        if (!isMounted || !container) return;
        
        logDebug(COMPONENT_ID, 'Items store changed', { itemCount: items?.length || 0 });
        
        // Only update if the component is still mounted
        if (document.body.contains(container)) {
            generateCountryFacets();
            generateYearRange();
            updateVisualization();
        }
    }

    onMount(async () => {
        isMounted = true;
        trackMount(COMPONENT_ID);
        logDebug(COMPONENT_ID, 'Component mounted');
        
        await tick();
        
        if (!container) {
            console.error('Container element not found in onMount');
            return;
        }
        
        // Create tooltip
        createTooltip();
        
        // Subscribe to the items store
        unsubscribeItems = itemsStore.subscribe(store => {
            handleItemsChange(store.items);
        });
        
        // Generate facets and create visualization if data is available
        if ($itemsStore.items && $itemsStore.items.length > 0) {
            generateCountryFacets();
            generateYearRange();
            updateVisualization();
        } else {
            // Load items if not already loaded
            itemsStore.loadItems();
        }
        
        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (!isMounted) return;
            
            if (container && document.body.contains(container)) {
                updateVisualization();
            }
        });
        
        resizeObserver.observe(container);
        
        return () => {
            // This cleanup function is called when the component is unmounted
            isMounted = false;
            trackUnmount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component cleanup started');
            
            // Clean up resize observer
            try {
                resizeObserver.disconnect();
                logDebug(COMPONENT_ID, 'Resize observer disconnected');
            } catch (e) {
                console.error('Error disconnecting resize observer:', e);
            }
            
            // Clean up tooltip
            try {
                if (tooltip && document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                    logDebug(COMPONENT_ID, 'Tooltip removed');
                }
            } catch (e) {
                console.error('Error removing tooltip:', e);
            }
            
            // Clean up store subscriptions
            if (unsubscribeItems) {
                unsubscribeItems();
                logDebug(COMPONENT_ID, 'Unsubscribed from items store');
            }
            
            logDebug(COMPONENT_ID, 'Component cleanup completed');
        };
    });
    
    onDestroy(() => {
        // This is a backup in case the cleanup function in onMount doesn't run
        if (isMounted) {
            isMounted = false;
            trackUnmount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component destroyed (backup cleanup)');
            
            // Clean up store subscriptions
            if (unsubscribeItems) {
                unsubscribeItems();
                logDebug(COMPONENT_ID, 'Unsubscribed from items store (backup)');
            }
        }
    });
</script>

<div class="type-distribution-container">
    <div class="controls">
        <div class="facets">
            <div class="facet-group">
                <h3>Countries</h3>
                <div class="facet-options">
                    {#each countryOptions as option}
                        <div 
                            class="facet-option" 
                            class:selected={option.selected} 
                            on:click={() => toggleCountry(option)}
                            on:keydown={(e) => e.key === 'Enter' && toggleCountry(option)}
                            role="checkbox"
                            aria-checked={option.selected}
                            tabindex="0"
                        >
                            <span class="facet-checkbox">
                                {#if option.selected}
                                    <svg viewBox="0 0 24 24" width="14" height="14">
                                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                {/if}
                            </span>
                            <span class="facet-label">{option.label}</span>
                            <span class="facet-count">{option.count}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
        
        <div class="year-range">
            <h3>Year Range</h3>
            <div class="slider-container">
                <div class="slider-labels">
                    <span>{selectedYearRange[0]}</span>
                    <span>{selectedYearRange[1]}</span>
                </div>
                <div class="slider-inputs">
                    <input 
                        type="range" 
                        min={allYears[0]} 
                        max={allYears[allYears.length - 1]} 
                        value={selectedYearRange[0]} 
                        data-index="0"
                        on:input={handleYearRangeChange}
                    />
                    <input 
                        type="range" 
                        min={allYears[0]} 
                        max={allYears[allYears.length - 1]} 
                        value={selectedYearRange[1]} 
                        data-index="1"
                        on:input={handleYearRangeChange}
                    />
                </div>
            </div>
        </div>
    </div>
    
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
            <p>Showing {totalItems} items published between {selectedYearRange[0]} and {selectedYearRange[1]}</p>
            {#if typeYearData.length > 0}
                <p>
                    Types: 
                    {Array.from(new Set(typeYearData.map(d => d.type))).join(', ')}
                </p>
            {/if}
        </div>
    </div>
</div>

<style>
    .type-distribution-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
    }
    
    .facets {
        flex: 1;
    }
    
    .year-range {
        flex: 1;
        min-width: 200px;
    }
    
    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-sm);
        color: var(--text-color-primary);
        font-size: var(--font-size-md);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: var(--spacing-xs);
    }
    
    .facet-options {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
        max-height: 120px;
        overflow-y: auto;
    }
    
    .facet-option {
        display: flex;
        align-items: center;
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--background-color);
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        user-select: none;
        transition: background-color var(--transition-fast);
    }
    
    .facet-option:hover {
        background: var(--divider-color);
    }
    
    .facet-option.selected {
        background: var(--primary-color-light);
        color: var(--text-color-light);
    }
    
    .facet-checkbox {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 16px;
        height: 16px;
        border: 1px solid var(--border-color);
        border-radius: 3px;
        margin-right: var(--spacing-xs);
        background: white;
        color: var(--primary-color);
    }
    
    .facet-option.selected .facet-checkbox {
        background: var(--primary-color);
        border-color: var(--primary-color);
    }
    
    .facet-label {
        margin-right: var(--spacing-xs);
        font-size: var(--font-size-sm);
    }
    
    .facet-count {
        font-size: var(--font-size-xs);
        color: var(--text-color-tertiary);
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 5px;
        border-radius: 10px;
    }
    
    .facet-option.selected .facet-count {
        color: var(--text-color-light);
        background: rgba(255, 255, 255, 0.2);
    }
    
    .slider-container {
        padding: var(--spacing-sm) 0;
    }
    
    .slider-labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--text-color-secondary);
    }
    
    .slider-inputs {
        position: relative;
        height: 30px;
    }
    
    input[type="range"] {
        position: absolute;
        width: 100%;
        pointer-events: none;
        appearance: none;
        height: 4px;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        background: var(--divider-color);
        outline: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        border: none;
    }
    
    input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        border: none;
    }
    
    .chart-container {
        flex: 1;
        min-height: 400px;
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
    
    :global(.legend-item:hover) {
        filter: brightness(1.1);
    }
    
    :global(.legend-item text) {
        pointer-events: none;
    }
    
    :global(.legend-item rect) {
        pointer-events: none;
    }
    
    :global(.legend-item line) {
        pointer-events: none;
    }
</style> 