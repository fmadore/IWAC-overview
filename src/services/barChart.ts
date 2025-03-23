import * as d3 from 'd3';
import { D3Service } from './d3Service';

/**
 * Interface for generic bar data
 */
export interface BarData {
    key: string;
    value: number;
    percentage?: number;
    originalKey?: string;
    [key: string]: any; // Allow additional properties
}

/**
 * Configuration options for bar charts
 */
export interface BarChartOptions {
    // Container and dimensions
    container: HTMLElement;
    width?: number;
    height?: number;
    
    // Data and keys
    data: BarData[];
    keyField?: string;
    valueField?: string;
    
    // Styling
    className?: string;
    barColors?: string[] | d3.ScaleOrdinal<string, string>;
    barPadding?: number;
    barCornerRadius?: number;
    barStroke?: string;
    barStrokeWidth?: number;
    
    // Margins and responsiveness
    margin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    responsive?: boolean;
    isMobile?: boolean;
    
    // Axes
    showXAxis?: boolean;
    showYAxis?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
    xAxisRotation?: number;
    xAxisTickFormat?: (d: any) => string;
    yAxisTickFormat?: (d: any) => string;
    xAxisTicks?: number;
    yAxisTicks?: number;
    
    // Labels
    showValueLabels?: boolean;
    valueLabelMinHeight?: number;
    valueFormatter?: (value: number) => string;
    
    // Interaction
    enableInteraction?: boolean;
    highlightColor?: string;
    
    // Events
    onBarMouseEnter?: (event: MouseEvent, data: BarData, element: SVGRectElement) => void;
    onBarMouseMove?: (event: MouseEvent, data: BarData, element: SVGRectElement) => void;
    onBarMouseLeave?: (event: MouseEvent, data: BarData, element: SVGRectElement) => void;
    onBarClick?: (event: MouseEvent, data: BarData, element: SVGRectElement) => void;
}

/**
 * Result of chart creation
 */
export interface BarChartResult {
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    chart: d3.Selection<SVGGElement, unknown, null, undefined>;
    xScale: d3.ScaleBand<string>;
    yScale: d3.ScaleLinear<number, number>;
    chartWidth: number;
    chartHeight: number;
    update: (newData: BarData[]) => void;
    destroy: () => void;
}

/**
 * Creates a bar chart with the provided options
 */
export function createBarChart(options: BarChartOptions): BarChartResult {
    const {
        // Container and dimensions
        container,
        width = container.clientWidth,
        height = container.clientHeight,
        
        // Data and keys
        data,
        keyField = 'key',
        valueField = 'value',
        
        // Styling
        className = 'bar-chart',
        barPadding = 0.2,
        barCornerRadius = 3,
        barStroke = 'white',
        barStrokeWidth = 1,
        
        // Margins and responsiveness
        margin = { top: 20, right: 30, bottom: 60, left: 50 },
        responsive = true,
        isMobile = false,
        
        // Axes
        showXAxis = true,
        showYAxis = true,
        xAxisLabel,
        yAxisLabel,
        xAxisRotation = -45,
        xAxisTickFormat,
        yAxisTickFormat,
        xAxisTicks,
        yAxisTicks = 5,
        
        // Labels
        showValueLabels = true,
        valueLabelMinHeight = 15,
        valueFormatter = (value: number) => value.toString(),
        
        // Interaction
        enableInteraction = true,
        highlightColor,
        
        // Events
        onBarMouseEnter,
        onBarMouseMove,
        onBarMouseLeave,
        onBarClick
    } = options;
    
    // Get or create color scale
    let colorScale: d3.ScaleOrdinal<string, string>;
    
    if (options.barColors) {
        if (Array.isArray(options.barColors)) {
            colorScale = d3.scaleOrdinal<string>()
                .domain(data.map(d => d[options.keyField || 'key']))
                .range(options.barColors);
        } else {
            colorScale = options.barColors;
        }
    } else {
        // Default color scale
        colorScale = d3.scaleOrdinal<string>(d3.schemeCategory10);
    }
    
    // Determine max value for y-scale
    const maxValue = d3.max(data, d => d[valueField]) || 0;
    
    // Create SVG using D3Service
    const { svg, chart, chartWidth, chartHeight } = D3Service.createSVG({
        container,
        width,
        height,
        margin,
        className,
        responsive
    });
    
    // Create scales
    const xScale = D3Service.createScale({
        type: 'band',
        domain: data.map(d => d[keyField]),
        range: [0, chartWidth],
        padding: isMobile ? Math.min(barPadding, 0.1) : barPadding
    }) as d3.ScaleBand<string>;
    
    const yScale = D3Service.createScale({
        type: 'linear',
        domain: [0, maxValue * 1.1], // Add 10% padding at the top
        range: [chartHeight, 0]
    }) as d3.ScaleLinear<number, number>;
    
    // Create and render axes if needed
    if (showXAxis) {
        const xAxis = D3Service.createAxis({
            type: 'x',
            scale: xScale,
            position: 'bottom',
            tickFormat: xAxisTickFormat,
            ticks: xAxisTicks,
            rotate: xAxisRotation
        });
        
        chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(g => D3Service.renderAxis(g, xAxis))
            .selectAll('text')
            .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)')
            .attr('fill', 'var(--color-text-primary)');
        
        // Add X-axis label if provided
        if (xAxisLabel) {
            chart.append('text')
                .attr('class', 'x-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + (isMobile ? margin.bottom - 5 : margin.bottom - 10))
                .attr('font-size', isMobile ? '10px' : 'var(--font-size-sm)')
                .attr('fill', 'var(--color-text-secondary)')
                .text(xAxisLabel);
        }
    }
    
    if (showYAxis) {
        const yAxis = D3Service.createAxis({
            type: 'y',
            scale: yScale,
            position: 'left',
            tickFormat: yAxisTickFormat,
            ticks: isMobile ? Math.min(yAxisTicks, 3) : yAxisTicks
        });
        
        chart.append('g')
            .attr('class', 'y-axis')
            .call(g => D3Service.renderAxis(g, yAxis))
            .selectAll('text')
            .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)')
            .attr('fill', 'var(--color-text-primary)');
        
        // Add Y-axis label if provided
        if (yAxisLabel) {
            chart.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .attr('x', -chartHeight / 2)
                .attr('y', isMobile ? -margin.left + 12 : -margin.left + 15)
                .attr('font-size', isMobile ? '10px' : 'var(--font-size-sm)')
                .attr('fill', 'var(--color-text-secondary)')
                .text(yAxisLabel);
        }
    }
    
    // Create bars
    const bars = chart.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d[keyField]) || 0)
        .attr('y', d => yScale(d[valueField]))
        .attr('width', xScale.bandwidth())
        .attr('height', d => Math.max(0, chartHeight - yScale(d[valueField])))
        .attr('fill', d => colorScale(d.originalKey || d[keyField]))
        .attr('rx', isMobile ? Math.min(barCornerRadius, 2) : barCornerRadius)
        .attr('ry', isMobile ? Math.min(barCornerRadius, 2) : barCornerRadius)
        .attr('stroke', barStroke)
        .attr('stroke-width', isMobile ? barStrokeWidth / 2 : barStrokeWidth);
    
    // Add event listeners if interaction is enabled
    if (enableInteraction) {
        bars.classed('cursor-pointer', true)
            .on('mouseenter', function(event, d) {
                const barEl = this as SVGRectElement;
                // Highlight bar on hover
                if (highlightColor) {
                    d3.select(barEl)
                        .transition()
                        .duration(200)
                        .attr('fill', highlightColor);
                } else {
                    // Brighten current color if no highlight color provided
                    const currentColor = colorScale(d.originalKey || d[keyField]);
                    d3.select(barEl)
                        .transition()
                        .duration(200)
                        .attr('fill', d3.rgb(currentColor).brighter(0.5).toString());
                }
                
                // Trigger event callback if provided
                if (onBarMouseEnter) {
                    onBarMouseEnter(event, d, barEl);
                }
            })
            .on('mousemove', function(event, d) {
                if (onBarMouseMove) {
                    onBarMouseMove(event, d, this as SVGRectElement);
                }
            })
            .on('mouseleave', function(event, d) {
                const barEl = this as SVGRectElement;
                // Restore original color
                d3.select(barEl)
                    .transition()
                    .duration(200)
                    .attr('fill', colorScale(d.originalKey || d[keyField]));
                
                // Trigger event callback if provided
                if (onBarMouseLeave) {
                    onBarMouseLeave(event, d, barEl);
                }
            })
            .on('click', function(event, d) {
                if (onBarClick) {
                    onBarClick(event, d, this as SVGRectElement);
                }
            });
    }
    
    // Add value labels if enabled
    if (showValueLabels) {
        chart.selectAll('.bar-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => (xScale(d[keyField]) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d[valueField]) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)')
            .attr('fill', 'var(--color-text-secondary)')
            .attr('display', d => {
                // Hide labels on very small bars
                const barHeight = chartHeight - yScale(d[valueField]);
                return (barHeight < valueLabelMinHeight && isMobile) ? 'none' : 'block';
            })
            .text(d => valueFormatter(d[valueField]));
    }
    
    // Function to update chart with new data
    function update(newData: BarData[]) {
        // Update scales with new data
        xScale.domain(newData.map(d => d[keyField]));
        
        const newMaxValue = d3.max(newData, d => d[valueField]) || 0;
        yScale.domain([0, newMaxValue * 1.1]);
        
        // Update axes if needed
        if (showXAxis) {
            const xAxisGroup = chart.select('.x-axis');
            const newXAxis = D3Service.createAxis({
                type: 'x',
                scale: xScale,
                position: 'bottom',
                tickFormat: xAxisTickFormat,
                ticks: xAxisTicks,
                rotate: xAxisRotation
            });
            
            // Convert transition to any to avoid TypeScript errors
            (xAxisGroup.transition().duration(500) as any)
                .call((g: d3.Selection<SVGGElement, unknown, null, undefined>) => D3Service.renderAxis(g, newXAxis));
        }
        
        if (showYAxis) {
            const yAxisGroup = chart.select('.y-axis');
            const newYAxis = D3Service.createAxis({
                type: 'y',
                scale: yScale,
                position: 'left',
                tickFormat: yAxisTickFormat,
                ticks: isMobile ? Math.min(yAxisTicks, 3) : yAxisTicks
            });
            
            // Convert transition to any to avoid TypeScript errors
            (yAxisGroup.transition().duration(500) as any)
                .call((g: d3.Selection<SVGGElement, unknown, null, undefined>) => D3Service.renderAxis(g, newYAxis));
        }
        
        // Update bars with animation
        const updateBars = chart.selectAll('.bar')
            .data(newData);
        
        // Remove bars that no longer exist
        updateBars.exit()
            .transition()
            .duration(300)
            .attr('y', chartHeight)
            .attr('height', 0)
            .remove();
        
        // Add new bars
        const enterBars = updateBars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d[keyField]) || 0)
            .attr('y', chartHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', d => colorScale(d.originalKey || d[keyField]))
            .attr('rx', isMobile ? Math.min(barCornerRadius, 2) : barCornerRadius)
            .attr('ry', isMobile ? Math.min(barCornerRadius, 2) : barCornerRadius)
            .attr('stroke', barStroke)
            .attr('stroke-width', isMobile ? barStrokeWidth / 2 : barStrokeWidth);
        
        // Apply event handlers to new bars
        if (enableInteraction) {
            enterBars.classed('cursor-pointer', true)
                .on('mouseenter', function(event, d) {
                    const barEl = this as SVGRectElement;
                    // Highlight bar on hover
                    if (highlightColor) {
                        d3.select(barEl)
                            .transition()
                            .duration(200)
                            .attr('fill', highlightColor);
                    } else {
                        // Brighten current color if no highlight color provided
                        const currentColor = colorScale(d.originalKey || d[keyField]);
                        d3.select(barEl)
                            .transition()
                            .duration(200)
                            .attr('fill', d3.rgb(currentColor).brighter(0.5).toString());
                    }
                    
                    // Trigger event callback if provided
                    if (onBarMouseEnter) {
                        onBarMouseEnter(event, d, barEl);
                    }
                })
                .on('mousemove', function(event, d) {
                    if (onBarMouseMove) {
                        onBarMouseMove(event, d, this as SVGRectElement);
                    }
                })
                .on('mouseleave', function(event, d) {
                    const barEl = this as SVGRectElement;
                    // Restore original color
                    d3.select(barEl)
                        .transition()
                        .duration(200)
                        .attr('fill', colorScale(d.originalKey || d[keyField]));
                    
                    // Trigger event callback if provided
                    if (onBarMouseLeave) {
                        onBarMouseLeave(event, d, barEl);
                    }
                })
                .on('click', function(event, d) {
                    if (onBarClick) {
                        onBarClick(event, d, this as SVGRectElement);
                    }
                });
        }
        
        // Update existing bars
        updateBars
            .transition()
            .duration(500)
            .attr('x', d => xScale(d[keyField]) || 0)
            .attr('y', d => yScale(d[valueField]))
            .attr('width', xScale.bandwidth())
            .attr('height', d => Math.max(0, chartHeight - yScale(d[valueField])))
            .attr('fill', d => colorScale(d.originalKey || d[keyField]));
        
        // Animate new bars in
        enterBars
            .transition()
            .duration(500)
            .attr('y', d => yScale(d[valueField]))
            .attr('height', d => Math.max(0, chartHeight - yScale(d[valueField])));
        
        // Update value labels if enabled
        if (showValueLabels) {
            const updateLabels = chart.selectAll('.bar-label')
                .data(newData);
            
            // Remove labels for bars that no longer exist
            updateLabels.exit().remove();
            
            // Add labels for new bars
            updateLabels.enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => (xScale(d[keyField]) || 0) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d[valueField]) - 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', isMobile ? '8px' : 'var(--font-size-xs)')
                .attr('fill', 'var(--color-text-secondary)')
                .attr('opacity', 0)
                .text(d => valueFormatter(d[valueField]))
                .attr('display', d => {
                    const barHeight = chartHeight - yScale(d[valueField]);
                    return (barHeight < valueLabelMinHeight && isMobile) ? 'none' : 'block';
                })
                .transition()
                .duration(500)
                .attr('opacity', 1);
            
            // Update existing labels
            updateLabels
                .transition()
                .duration(500)
                .attr('x', d => (xScale(d[keyField]) || 0) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d[valueField]) - 5)
                .text(d => valueFormatter(d[valueField]))
                .attr('display', d => {
                    const barHeight = chartHeight - yScale(d[valueField]);
                    return (barHeight < valueLabelMinHeight && isMobile) ? 'none' : 'block';
                });
        }
    }
    
    // Function to destroy the chart and clean up
    function destroy() {
        if (svg) {
            svg.selectAll('*').remove();
            svg.remove();
        }
    }
    
    // Return chart and helper functions
    return {
        svg,
        chart,
        xScale,
        yScale,
        chartWidth,
        chartHeight,
        update,
        destroy
    };
}

/**
 * Utility functions for preparing data for bar charts
 */
export const BarChartUtils = {
    /**
     * Map data to the standard BarData format
     */
    mapData(data: any[], keyField: string, valueField: string, originalKeyField?: string): BarData[] {
        return data.map(item => ({
            key: item[keyField],
            value: item[valueField],
            originalKey: originalKeyField ? item[originalKeyField] : undefined,
            ...item // Keep all original properties
        }));
    },
    
    /**
     * Calculate percentages for bar data
     */
    calculatePercentages(data: BarData[]): BarData[] {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return data;
        
        return data.map(item => ({
            ...item,
            percentage: (item.value / total) * 100
        }));
    },
    
    /**
     * Sort bar data by value
     */
    sortByValue(data: BarData[], descending: boolean = true): BarData[] {
        return [...data].sort((a, b) => 
            descending ? b.value - a.value : a.value - b.value
        );
    }
};

// Export a class-based version for those who prefer OOP
export class BarChart {
    private chart: BarChartResult | null = null;
    private options: BarChartOptions;
    
    constructor(options: BarChartOptions) {
        this.options = options;
    }
    
    render(): BarChartResult {
        if (this.chart) this.destroy();
        this.chart = createBarChart(this.options);
        return this.chart;
    }
    
    update(newData: BarData[]) {
        if (this.chart) {
            this.chart.update(newData);
        } else {
            this.options.data = newData;
            this.render();
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
    
    getChart(): BarChartResult | null {
        return this.chart;
    }
} 