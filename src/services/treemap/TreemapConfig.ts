import * as d3 from 'd3';

// Core TreemapNode interface
export interface TreemapNode {
    name: string;
    children?: TreemapNode[];
    value?: number;
    wordCount?: number;
    itemCount?: number;
    [key: string]: any; // Allow additional properties
}

// Legacy interface for backward compatibility
export interface TreemapOptions {
    container: HTMLElement;
    width?: number;
    height?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    padding?: {
        outer?: number;
        top?: number;
        inner?: number;
    };
    colors?: d3.ScaleOrdinal<string, string>;
    colorMap?: Map<string, string>;
    tooltipCallback?: (event: MouseEvent, d: d3.HierarchyNode<TreemapNode>) => void;
    hideTooltipCallback?: () => void;
    zoomCallback?: (node: d3.HierarchyNode<TreemapNode> | null) => void;
    currentZoomedNode?: d3.HierarchyNode<TreemapNode> | null;
    minSizeThreshold?: number;
    useBreadcrumbs?: boolean;
    rootName?: string;
    labelOptions?: {
        parentLabel?: {
            fontSize?: string;
            fontWeight?: string;
            color?: string;
        };
        childLabel?: {
            fontSize?: string;
            color?: string;
            minWidth?: number;
            minHeight?: number;
        };
    };
}

export interface TreemapDimensions {
    width: number;
    height: number;
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface TreemapPadding {
    outer: number;
    top: number;
    inner: number;
}

export interface TreemapLabelOptions {
    parentLabel: {
        fontSize: string;
        fontWeight: string;
        color: string;
    };
    childLabel: {
        fontSize: string;
        color: string;
        minWidth: number;
        minHeight: number;
    };
}

export interface TreemapCallbacks {
    onTooltipShow?: (event: MouseEvent, d: d3.HierarchyNode<TreemapNode>) => void;
    onTooltipHide?: () => void;
    onZoom?: (node: d3.HierarchyNode<TreemapNode> | null) => void;
}

export interface TreemapNavigationConfig {
    useBreadcrumbs: boolean;
    rootName: string;
    showZoomButton: boolean;
}

export interface TreemapStyleConfig {
    colors?: d3.ScaleOrdinal<string, string>;
    colorMap?: Map<string, string>;
    padding: TreemapPadding;
    labelOptions: TreemapLabelOptions;
}

export interface TreemapBehaviorConfig {
    minSizeThreshold: number;
    enableZoom: boolean;
    enableTooltips: boolean;
    responsive: boolean;
}

export interface TreemapConfiguration {
    container: HTMLElement;
    dimensions: TreemapDimensions;
    style: TreemapStyleConfig;
    navigation: TreemapNavigationConfig;
    behavior: TreemapBehaviorConfig;
    callbacks: TreemapCallbacks;
    currentZoomedNode?: d3.HierarchyNode<TreemapNode> | null;
}

export class TreemapConfig {
    private config: TreemapConfiguration;

    constructor(container: HTMLElement, options: Partial<TreemapConfiguration> = {}) {
        this.config = this.mergeWithDefaults(container, options);
        this.validate();
    }

    private mergeWithDefaults(
        container: HTMLElement, 
        options: Partial<TreemapConfiguration>
    ): TreemapConfiguration {
        const defaultConfig: TreemapConfiguration = {
            container,
            dimensions: {
                width: options.dimensions?.width ?? container.clientWidth,
                height: options.dimensions?.height ?? Math.min(container.clientHeight, 500),
                margin: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10,
                    ...options.dimensions?.margin
                }
            },
            style: {
                padding: {
                    outer: 3,
                    top: 16,
                    inner: 1,
                    ...options.style?.padding
                },
                labelOptions: {
                    parentLabel: {
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'bold',
                        color: 'white',
                        ...options.style?.labelOptions?.parentLabel
                    },
                    childLabel: {
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-primary)',
                        minWidth: 30,
                        minHeight: 20,
                        ...options.style?.labelOptions?.childLabel
                    }
                },
                colors: options.style?.colors,
                colorMap: options.style?.colorMap
            },
            navigation: {
                useBreadcrumbs: false,
                rootName: 'All',
                showZoomButton: true,
                ...options.navigation
            },
            behavior: {
                minSizeThreshold: 0.001,
                enableZoom: true,
                enableTooltips: true,
                responsive: false,
                ...options.behavior
            },
            callbacks: {
                ...options.callbacks
            },
            currentZoomedNode: options.currentZoomedNode
        };

        return defaultConfig;
    }

    private validate(): void {
        if (!this.config.container) {
            throw new Error('TreemapConfig: container is required');
        }

        if (this.config.dimensions.width <= 0 || this.config.dimensions.height <= 0) {
            throw new Error('TreemapConfig: width and height must be positive numbers');
        }

        if (this.config.behavior.minSizeThreshold < 0 || this.config.behavior.minSizeThreshold > 1) {
            throw new Error('TreemapConfig: minSizeThreshold must be between 0 and 1');
        }
    }

    public get(): TreemapConfiguration {
        return { ...this.config }; // Return a copy to prevent external mutations
    }

    public update(updates: Partial<TreemapConfiguration>): void {
        this.config = { ...this.config, ...updates };
        this.validate();
    }

    public getChartDimensions() {
        const { width, height, margin } = this.config.dimensions;
        return {
            chartWidth: width - margin.left - margin.right,
            chartHeight: height - margin.top - margin.bottom
        };
    }

    public getAdjustedMargin() {
        const { margin } = this.config.dimensions;
        const { useBreadcrumbs } = this.config.navigation;
        const { currentZoomedNode } = this.config;

        if (currentZoomedNode && useBreadcrumbs) {
            return { ...margin, top: margin.top + 30 };
        }
        return margin;
    }
}
