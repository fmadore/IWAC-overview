import * as d3 from 'd3';
import { createGridTooltipContent } from '../hooks/useTooltip';

// Define interfaces for data structures
export interface MonthlyData {
    date: Date;          // First day of the month
    month: string;       // Formatted month (e.g., "2024-03")
    monthFormatted: string; // Display format (e.g., "Mar 2024")
    count: number;       // Number of items added in this month
    total: number;       // Cumulative total as of this month
    percentage: number;  // Percentage of total
}

export interface TimelineOptions {
    container: HTMLDivElement;
    width: number;
    height: number;
    isMobile?: boolean;
    isExtraSmall?: boolean;
    formatNumber?: (num: number) => string;
    currentLang?: 'en' | 'fr';
    translations?: {
        monthlyAdditions?: string;
        totalItems?: string;
        newItems?: string;
        percentage?: string;
        month?: string;
    };
}

export interface TooltipCallbacks {
    showTooltip: (event: MouseEvent, content: string) => void;
    hideTooltip: () => void;
}

export class TimelineChart {
    private options: TimelineOptions;
    private tooltipCallbacks: TooltipCallbacks | null = null;
    private monthFormat = d3.timeFormat('%Y-%m');
    private displayFormat = d3.timeFormat('%b %Y');

    constructor(options: TimelineOptions) {
        this.options = {
            ...options,
            isMobile: options.width < 768,
            isExtraSmall: options.width < 480
        };
    }

    /**
     * Sets tooltip callbacks for interactive elements
     */
    setTooltipCallbacks(callbacks: TooltipCallbacks) {
        this.tooltipCallbacks = callbacks;
    }

    /**
     * Renders the timeline visualization
     */
    render(timelineData: MonthlyData[]) {
        try {
            const { container, width, height, isMobile, isExtraSmall, currentLang = 'en' } = this.options;
            
            console.log('[TimelineChart] Rendering with dimensions:', { width, height });
            console.log('[TimelineChart] Container element:', container);
            console.log('[TimelineChart] Data points to render:', timelineData.length);
            
            // Check if we have data
            if (!timelineData || timelineData.length === 0) {
                console.warn('[TimelineChart] No timeline data available');
                d3.select(container).selectAll('*').remove();
                d3.select(container).append('div')
                    .attr('class', 'absolute inset-center text-secondary')
                    .text('No timeline data available with the current filters');
                return;
            }
            
            // Check if container exists
            if (!container) {
                console.error('[TimelineChart] Container element is null or undefined');
                return;
            }
            
            // Check if dimensions are valid
            let validWidth = width;
            let validHeight = height;
            
            // Apply minimum dimensions if needed
            if (!validWidth || validWidth <= 0) {
                console.warn('[TimelineChart] Invalid width, using minimum width of 300px');
                validWidth = 300;
            }
            
            if (!validHeight || validHeight <= 0) {
                console.warn('[TimelineChart] Invalid height, using minimum height of 500px');
                validHeight = 500;
            }
            
            console.log('[TimelineChart] Using dimensions:', { width: validWidth, height: validHeight });
            
            // Remove previous content
            d3.select(container).selectAll('*').remove();
            
            // Set margins based on screen size
            const margin = {
                top: isMobile ? 20 : 40,
                right: isMobile ? 15 : 30,
                bottom: isMobile ? 70 : 80,
                left: isMobile ? 40 : 60
            };
            
            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', validWidth)
                .attr('height', validHeight)
                .attr('viewBox', `0 0 ${validWidth} ${validHeight}`)
                .attr('class', 'timeline-chart');
            
            // Calculate chart dimensions
            const chartWidth = validWidth - margin.left - margin.right;
            const fullChartHeight = validHeight - margin.top - margin.bottom;
            
            // Adjust chartHeight for two charts
            const chartHeight = (fullChartHeight - (isMobile ? 30 : 50)) / 2;
            
            // Create x scale for both charts (shared)
            const xScale = d3.scaleTime()
                .domain(d3.extent(timelineData, d => d.date) as [Date, Date])
                .range([0, chartWidth]);
            
            // Add divider line between charts
            svg.append('line')
                .attr('x1', margin.left)
                .attr('y1', margin.top + chartHeight + (isMobile ? 15 : 25))
                .attr('x2', validWidth - margin.right)
                .attr('y2', margin.top + chartHeight + (isMobile ? 15 : 25))
                .attr('stroke', 'var(--color-border-default)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3');
            
            // Add legend only if not extra small
            this.addLegend(svg, margin, isExtraSmall, validWidth);
            
            // Create circle marker definition for line points
            svg.append('defs').append('marker')
                .attr('id', 'circle')
                .attr('viewBox', '-5 -5 10 10')
                .attr('refX', 0)
                .attr('refY', 0)
                .attr('markerWidth', 5)
                .attr('markerHeight', 5)
                .append('circle')
                .attr('r', 3)
                .attr('fill', 'var(--color-primary)');
                
            // Render monthly additions chart
            this.renderMonthlyChart(svg, timelineData, margin, chartWidth, chartHeight, xScale, isMobile);
            
            // Render total items chart
            this.renderTotalChart(svg, timelineData, margin, chartWidth, chartHeight, xScale, isMobile);
            
            console.log('[TimelineChart] Successfully rendered timeline chart');
        } catch (error) {
            console.error('[TimelineChart] Error rendering timeline chart:', error);
            
            // Try to show error in container
            try {
                if (this.options.container) {
                    d3.select(this.options.container).selectAll('*').remove();
                    d3.select(this.options.container).append('div')
                        .attr('class', 'absolute inset-center text-error p-md')
                        .text('Error rendering timeline chart. Please check console for details.');
                }
            } catch (e) {
                console.error('[TimelineChart] Error showing error message:', e);
            }
        }
    }

    /**
     * Adds legend to the chart
     */
    private addLegend(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number, right: number, bottom: number, left: number },
        isExtraSmall: boolean | undefined,
        width: number
    ) {
        if (isExtraSmall) return;
        
        const { translations } = this.options;
        
        const legendGroup = svg.append('g')
            .attr('transform', `translate(${width - margin.right}, ${margin.top - 10})`);
            
        // Monthly additions legend item
        legendGroup.append('line')
            .attr('x1', -100)
            .attr('y1', 0)
            .attr('x2', -80)
            .attr('y2', 0)
            .attr('stroke', 'var(--color-primary)')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#circle)');
            
        legendGroup.append('text')
            .attr('x', -75)
            .attr('y', 4)
            .attr('class', 'text-xs text-secondary')
            .text(translations?.monthlyAdditions || 'Monthly Additions');
            
        // Total items legend item
        legendGroup.append('line')
            .attr('x1', -100)
            .attr('y1', 20)
            .attr('x2', -80)
            .attr('y2', 20)
            .attr('stroke', 'var(--color-secondary)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4 2');
            
        legendGroup.append('text')
            .attr('x', -75)
            .attr('y', 24)
            .attr('class', 'text-xs text-secondary')
            .text(translations?.totalItems || 'Total Items');
    }
    
    /**
     * Renders the monthly additions chart
     */
    private renderMonthlyChart(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: MonthlyData[],
        margin: { top: number, right: number, bottom: number, left: number },
        chartWidth: number,
        chartHeight: number,
        xScale: d3.ScaleTime<number, number>,
        isMobile: boolean | undefined
    ) {
        const { translations, currentLang = 'en' } = this.options;
        
        const chart1 = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
        // Create y scale for monthly chart
        const yScaleMonthly = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.count) || 0) * 1.1])
            .range([chartHeight, 0]);
            
        // Create grid lines for monthly chart
        chart1.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(yScaleMonthly.ticks(isMobile ? 3 : 5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleMonthly(d))
            .attr('y2', d => yScaleMonthly(d))
            .attr('stroke', 'var(--color-border-default)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for monthly chart
        const numTicks = Math.max(2, Math.floor(chartWidth / (isMobile ? 60 : 80))); // Dynamic ticks
        const xAxis = d3.axisBottom(xScale)
            .ticks(numTicks)
            .tickFormat(d => { // Locale-aware formatting
                const date = d as Date;
                return currentLang === 'fr' ? 
                    date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : 
                    d3.timeFormat("%b '%y")(date);
            });
        
        chart1.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('class', 'text-xs text-primary')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', `rotate(${isMobile ? -45 : -30})`);
            
        // Create y-axis for monthly chart
        const yAxis = d3.axisLeft(yScaleMonthly)
            .ticks(isMobile ? 3 : 5);
        
        chart1.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .attr('class', 'text-xs text-primary');
            
        // Add y-axis label for monthly chart (only on non-mobile)
        if (!isMobile) {
            chart1.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('transform', 'rotate(-90)')
                .attr('y', -50)
                .attr('x', -chartHeight / 2)
                .attr('text-anchor', 'middle')
                .text(translations?.monthlyAdditions || 'Monthly Additions');
        }
            
        // Create line generator for monthly data
        const lineMonthly = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleMonthly(d.count))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for monthly data
        chart1.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-primary)')
            .attr('stroke-width', isMobile ? 1.5 : 2)
            .attr('d', lineMonthly);
            
        // Add interactive dots
        this.addMonthlyDots(chart1, data, xScale, yScaleMonthly, isMobile);
    }
    
    /**
     * Adds interactive dots to the monthly chart
     */
    private addMonthlyDots(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: MonthlyData[],
        xScale: d3.ScaleTime<number, number>,
        yScale: d3.ScaleLinear<number, number>,
        isMobile: boolean | undefined
    ) {
        const { formatNumber, translations, currentLang = 'en' } = this.options;
        
        if (!this.tooltipCallbacks) return;
        const { showTooltip, hideTooltip } = this.tooltipCallbacks;
        
        // Add dots for each data point in monthly chart - fewer on mobile
        chart.selectAll('.dot-monthly')
            .data(isMobile ? data.filter((_, i) => i % 2 === 0) : data)
            .enter()
            .append('circle')
            .attr('class', 'dot-monthly cursor-pointer')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.count))
            .attr('r', isMobile ? 3 : 4)
            .attr('fill', 'var(--color-primary)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event: any, d: MonthlyData) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 5 : 6);
                
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: translations?.newItems || 'New Items', value: formatNumber ? formatNumber(d.count) : d.count.toString() },
                        { label: translations?.percentage || 'Percentage', value: `${d.percentage.toFixed(2)}%` }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mousemove', function(event: any, d: MonthlyData) {
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: translations?.newItems || 'New Items', value: formatNumber ? formatNumber(d.count) : d.count.toString() },
                        { label: translations?.percentage || 'Percentage', value: `${d.percentage.toFixed(2)}%` }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 3 : 4);
                hideTooltip();
            });
    }
    
    /**
     * Renders the total items chart
     */
    private renderTotalChart(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: MonthlyData[],
        margin: { top: number, right: number, bottom: number, left: number },
        chartWidth: number,
        chartHeight: number,
        xScale: d3.ScaleTime<number, number>,
        isMobile: boolean | undefined
    ) {
        const { translations, currentLang = 'en' } = this.options;
        
        const chart2 = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight + (isMobile ? 30 : 50)})`);
            
        // Create y scale for total chart
        const yScaleTotal = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.total) || 0) * 1.1])
            .range([chartHeight, 0]);
            
        // Create grid lines for total chart
        chart2.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(yScaleTotal.ticks(isMobile ? 3 : 5))
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScaleTotal(d))
            .attr('y2', d => yScaleTotal(d))
            .attr('stroke', 'var(--color-border-default)')
            .attr('stroke-width', 0.5);
            
        // Create x-axis for total chart
        const numTicksTotal = Math.max(2, Math.floor(chartWidth / (isMobile ? 60 : 80))); // Dynamic ticks
        const xAxisTotal = d3.axisBottom(xScale)
            .ticks(numTicksTotal)
            .tickFormat(d => { // Locale-aware formatting
                const date = d as Date;
                return currentLang === 'fr' ? 
                    date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : 
                    d3.timeFormat("%b '%y")(date);
            });
        
        chart2.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(xAxisTotal)
            .selectAll('text')
            .attr('class', 'text-xs text-primary')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', `rotate(${isMobile ? -45 : -30})`);
            
        // Create y-axis for total chart
        const yAxis = d3.axisLeft(yScaleTotal)
            .ticks(isMobile ? 3 : 5);
        
        chart2.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .attr('class', 'text-xs text-primary');
            
        // Add y-axis label for total chart (only on non-mobile)
        if (!isMobile) {
            chart2.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('transform', 'rotate(-90)')
                .attr('y', -50)
                .attr('x', -chartHeight / 2)
                .attr('text-anchor', 'middle')
                .text(translations?.totalItems || 'Total Items');
                
            // Add x-axis label (only on non-mobile and on the bottom chart)
            chart2.append('text')
                .attr('class', 'text-xs text-secondary')
                .attr('text-anchor', 'middle')
                .attr('x', chartWidth / 2)
                .attr('y', chartHeight + 45)
                .text(translations?.month || 'Month');
        }
            
        // Create line generator for total data
        const lineTotal = d3.line<MonthlyData>()
            .x(d => xScale(d.date))
            .y(d => yScaleTotal(d.total))
            .curve(d3.curveMonotoneX);
            
        // Add the line path for total data
        chart2.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--color-secondary)')
            .attr('stroke-width', isMobile ? 1.5 : 2)
            .attr('stroke-dasharray', '4 2')
            .attr('d', lineTotal);
            
        // Add interactive dots
        this.addTotalDots(chart2, data, xScale, yScaleTotal, isMobile);
    }
    
    /**
     * Adds interactive dots to the total chart
     */
    private addTotalDots(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: MonthlyData[],
        xScale: d3.ScaleTime<number, number>,
        yScale: d3.ScaleLinear<number, number>,
        isMobile: boolean | undefined
    ) {
        const { formatNumber, translations, currentLang = 'en' } = this.options;
        
        if (!this.tooltipCallbacks) return;
        const { showTooltip, hideTooltip } = this.tooltipCallbacks;
        
        // Add dots for each data point in total chart - fewer on mobile
        chart.selectAll('.dot-total')
            .data(isMobile ? data.filter((_, i) => i % 2 === 0) : data)
            .enter()
            .append('circle')
            .attr('class', 'dot-total cursor-pointer')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.total))
            .attr('r', isMobile ? 3 : 4)
            .attr('fill', 'var(--color-secondary)')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .on('mouseenter', function(event: any, d: MonthlyData) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 5 : 6);
                
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: translations?.totalItems || 'Total Items', value: formatNumber ? formatNumber(d.total) : d.total.toString() }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mousemove', function(event: any, d: MonthlyData) {
                const monthName = d.date.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
                const year = d.date.getFullYear();
                
                const content = createGridTooltipContent(
                    `${monthName} ${year}`,
                    [
                        { label: translations?.totalItems || 'Total Items', value: formatNumber ? formatNumber(d.total) : d.total.toString() }
                    ]
                );
                
                showTooltip(event, content);
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', isMobile ? 3 : 4);
                hideTooltip();
            });
    }
} 