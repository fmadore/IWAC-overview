import * as echarts from 'echarts';
import { getColorPalette } from '../utils/colorPalette';

export interface BarChartData {
    key: string;
    value: number;
    percentage?: number;
    originalKey?: string;
    [key: string]: any;
}

export interface EChartsBarOptions {
    width?: number;
    height?: number;
    colors?: string[];
    responsive?: boolean;
    showGrid?: boolean;
    showLegend?: boolean;
    horizontal?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
    valueFormatter?: (value: number) => string;
    onBarClick?: (params: any) => void;
    onTooltip?: (params: any) => string;
    theme?: 'light' | 'dark';
}

export class EChartsBarService {
    private chart: echarts.ECharts | null = null;
    private container: HTMLElement;
    private currentOptions: EChartsBarOptions;
    private resizeObserver: ResizeObserver | null = null;
    private windowResizeHandler: (() => void) | null = null;
    private isInitialized: boolean = false;
    private isDisposed: boolean = false;
    private resizeTimeout: number | null = null;

    constructor(container: HTMLElement, options: EChartsBarOptions = {}) {
        this.container = container;
        this.currentOptions = {
            width: 800,
            height: 400,
            colors: getColorPalette('primary'),
            responsive: true,
            showGrid: true,
            showLegend: false,
            horizontal: false,
            valueFormatter: (value: number) => value.toString(),
            theme: 'light',
            ...options
        };
    }

    /**
     * Render or update the bar chart
     */
    render(data: BarChartData[]): echarts.ECharts {
        if (this.isDisposed) {
            console.warn('Cannot render on disposed service');
            throw new Error('Service has been disposed');
        }

        if (!this.container || !this.container.isConnected) {
            console.warn('Container is not connected to DOM');
            throw new Error('Container is not connected to DOM');
        }

        const containerRect = this.container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.warn('Container has zero dimensions, cannot render chart');
            return this.chart || ({} as echarts.ECharts);
        }

        try {
            // Initialize chart if needed
            if (!this.chart) {
                this.chart = echarts.init(this.container, null, {
                    width: containerRect.width,
                    height: containerRect.height,
                    renderer: 'svg',
                    devicePixelRatio: window.devicePixelRatio || 1
                });

                // Setup resize observer for responsiveness
                if (this.currentOptions.responsive) {
                    this.setupResizeObserver();
                    this.setupWindowResize();
                }

                // Setup click handler
                if (this.currentOptions.onBarClick) {
                    this.chart.on('click', this.currentOptions.onBarClick);
                }
            }

            // Build chart options
            const option = this.buildChartOptions(data);
            
            // Set options
            this.chart.setOption(option, true);
            this.isInitialized = true;

            return this.chart;
        } catch (error) {
            console.error('Error rendering bar chart:', error);
            throw error;
        }
    }

    /**
     * Build ECharts options for bar chart
     */
    private buildChartOptions(data: BarChartData[]): any {
        const categories = data.map(d => d.key);
        const values = data.map(d => d.value);
        const colors = this.currentOptions.colors || getColorPalette('primary', data.length);
        
        // Check if we're on mobile
        const isMobile = this.container.clientWidth < 768;

        return {
            color: colors,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'var(--color-border-light)',
                borderWidth: 1,
                borderRadius: 8,
                textStyle: {
                    color: 'var(--color-text-primary)',
                    fontSize: isMobile ? 11 : 12,
                    fontFamily: 'var(--font-family-base)'
                },
                padding: [8, 12],
                formatter: (params: any) => {
                    if (Array.isArray(params)) {
                        params = params[0]; // Take first item if array
                    }
                    const dataItem = data[params.dataIndex];
                    const formatter = this.currentOptions.valueFormatter || ((v: number) => v.toString());
                    let content = `<div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div>`;
                    content += `<div style="display: flex; align-items: center;">`;
                    content += `<span style="display: inline-block; width: 10px; height: 10px; background-color: ${params.color}; border-radius: 50%; margin-right: 6px;"></span>`;
                    content += `${formatter(params.value)}`;
                    if (dataItem.percentage !== undefined) {
                        content += ` (${dataItem.percentage.toFixed(1)}%)`;
                    }
                    content += `</div>`;
                    return content;
                }
            },
            grid: {
                left: isMobile ? '15%' : '12%',
                right: isMobile ? '5%' : '8%',
                bottom: isMobile ? '25%' : '20%',
                top: isMobile ? '5%' : '8%',
                containLabel: true,
                show: this.currentOptions.showGrid,
                borderColor: 'var(--color-border-light)',
                borderWidth: 1
            },
            xAxis: {
                type: this.currentOptions.horizontal ? 'value' : 'category',
                data: this.currentOptions.horizontal ? undefined : categories,
                name: this.currentOptions.xAxisLabel,
                nameLocation: 'middle',
                nameGap: isMobile ? 40 : 50,
                nameTextStyle: {
                    color: 'var(--color-text-secondary)',
                    fontSize: isMobile ? 11 : 13,
                    fontFamily: 'var(--font-family-base)',
                    fontWeight: 500
                },
                axisLine: {
                    lineStyle: {
                        color: 'var(--color-border-default)'
                    }
                },
                axisLabel: {
                    color: 'var(--color-text-secondary)',
                    fontSize: isMobile ? 10 : 11,
                    fontFamily: 'var(--font-family-base)',
                    rotate: this.currentOptions.horizontal ? 0 : (isMobile ? -60 : -45),
                    interval: 0,
                    margin: isMobile ? 8 : 12,
                    formatter: (value: string) => {
                        const maxLength = isMobile ? 8 : 12;
                        return value.length > maxLength ? value.substring(0, maxLength - 2) + '...' : value;
                    }
                },
                axisTick: {
                    alignWithLabel: true,
                    lineStyle: {
                        color: 'var(--color-border-light)'
                    }
                }
            },
            yAxis: {
                type: this.currentOptions.horizontal ? 'category' : 'value',
                data: this.currentOptions.horizontal ? categories : undefined,
                name: this.currentOptions.yAxisLabel,
                nameLocation: 'middle',
                nameGap: isMobile ? 40 : 50,
                nameTextStyle: {
                    color: 'var(--color-text-secondary)',
                    fontSize: isMobile ? 11 : 13,
                    fontFamily: 'var(--font-family-base)'
                },
                axisLine: {
                    lineStyle: {
                        color: 'var(--color-border-default)'
                    }
                },
                axisLabel: {
                    color: 'var(--color-text-secondary)',
                    fontSize: isMobile ? 10 : 11,
                    fontFamily: 'var(--font-family-base)',
                    formatter: this.currentOptions.valueFormatter
                },
                splitLine: {
                    lineStyle: {
                        color: 'var(--color-border-light)',
                        type: 'dashed'
                    }
                }
            },
            series: [{
                name: 'Items',
                type: 'bar',
                data: this.currentOptions.horizontal ? values : values,
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                },
                emphasis: {
                    itemStyle: {
                        opacity: 0.8,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.2)'
                    }
                },
                animationDelay: (idx: number) => idx * 50,
                animationDuration: 800,
                animationEasing: 'elasticOut'
            }],
            animation: true,
            animationThreshold: 2000,
            animationDuration: 1000,
            animationEasing: 'cubicInOut'
        };
    }

    /**
     * Update chart data
     */
    updateData(data: BarChartData[]): void {
        if (!this.chart || this.isDisposed) return;
        
        const option = this.buildChartOptions(data);
        this.chart.setOption(option, true);
    }

    /**
     * Update chart options
     */
    updateOptions(options: Partial<EChartsBarOptions>): void {
        this.currentOptions = { ...this.currentOptions, ...options };
        
        if (this.chart && !this.isDisposed) {
            // Re-render with current data would require storing data, 
            // so this method should be called before render or with updateData
            this.chart.setOption(this.buildChartOptions([]), true);
        }
    }

    /**
     * Setup resize observer for responsive behavior
     */
    private setupResizeObserver(): void {
        if (!this.currentOptions.responsive || this.resizeObserver) return;

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === this.container && this.chart && !this.isDisposed) {
                    // Get the new dimensions
                    const rect = this.container.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        // Debounce resize to avoid too many calls
                        this.debounceResize();
                    }
                }
            }
        });

        this.resizeObserver.observe(this.container);
    }

    /**
     * Setup window resize listener for better responsiveness
     */
    private setupWindowResize(): void {
        if (this.windowResizeHandler) return;

        this.windowResizeHandler = () => {
            if (this.chart && !this.isDisposed) {
                this.debounceResize();
            }
        };

        window.addEventListener('resize', this.windowResizeHandler);
    }

    /**
     * Debounced resize method to avoid excessive resize calls
     */
    private debounceResize(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = window.setTimeout(() => {
            if (this.chart && !this.isDisposed) {
                try {
                    // Get current container dimensions
                    const rect = this.container.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        // Resize the chart with explicit dimensions
                        this.chart.resize({
                            width: rect.width,
                            height: rect.height
                        });
                    }
                } catch (error) {
                    console.error('Error resizing chart:', error);
                }
            }
            this.resizeTimeout = null;
        }, 100);
    }

    /**
     * Resize chart manually
     */
    resize(): void {
        if (this.chart && !this.isDisposed) {
            try {
                const rect = this.container.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    this.chart.resize({
                        width: rect.width,
                        height: rect.height
                    });
                }
            } catch (error) {
                console.error('Error resizing chart:', error);
            }
        }
    }

    /**
     * Get chart instance
     */
    getChart(): echarts.ECharts | null {
        return this.chart;
    }

    /**
     * Dispose of the chart and clean up resources
     */
    dispose(): void {
        if (this.isDisposed) return;

        try {
            // Clear resize timeout
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = null;
            }

            // Remove window resize listener
            if (this.windowResizeHandler) {
                window.removeEventListener('resize', this.windowResizeHandler);
                this.windowResizeHandler = null;
            }

            // Remove resize observer
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            // Dispose ECharts instance
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }

            this.isDisposed = true;
            this.isInitialized = false;
        } catch (error) {
            console.error('Error disposing bar chart:', error);
        }
    }
}
