import type { TreemapNode } from './TreemapConfig';
import type { TreemapConfiguration } from './TreemapConfig';
import { TreemapConfig } from './TreemapConfig';
import { TreemapDataProcessor } from './TreemapDataProcessor';
import { TreemapColorManager } from './TreemapColorManager';
import { TreemapNodeRenderer } from './TreemapNodeRenderer';
import { TreemapNavigator } from './TreemapNavigator';
import * as d3 from 'd3';
import { D3Service } from '../d3Service';

type TreemapHierarchyNode = d3.HierarchyRectangularNode<TreemapNode>;

export class TreemapVisualization {
    private config: TreemapConfig;
    private dataProcessor: TreemapDataProcessor;
    private colorManager: TreemapColorManager;
    private nodeRenderer: TreemapNodeRenderer;
    private navigator: TreemapNavigator;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private chart: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

    constructor(container: HTMLElement, options: Partial<TreemapConfiguration> = {}) {
        // Initialize configuration
        this.config = new TreemapConfig(container, options);
        
        // Initialize components
        this.dataProcessor = new TreemapDataProcessor();
        this.colorManager = new TreemapColorManager(
            options.style?.colors,
            options.style?.colorMap
        );
        this.nodeRenderer = new TreemapNodeRenderer(
            this.colorManager,
            this.config.get().style.labelOptions
        );
        this.navigator = new TreemapNavigator(
            this.config.get().navigation,
            this.handleZoom.bind(this)
        );
    }

    /**
     * Create or update the treemap visualization
     */
    render(data: TreemapNode): { svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null, chart: d3.Selection<SVGGElement, unknown, null, undefined> | null } {
        try {
            const config = this.config.get();

            // Validate data
            if (!TreemapDataProcessor.validateData(data)) {
                this.handleNoData('Invalid data structure');
                return { svg: null, chart: null };
            }

            // Clear existing content
            this.clearContainer();

            // Set up container
            this.setupContainer();

            // Prepare hierarchy
            const root = this.prepareHierarchy(data);
            if (!root) {
                this.handleNoData('No data to display');
                return { svg: null, chart: null };
            }

            // Initialize colors
            this.colorManager.initializeFromHierarchy(root);

            // Create SVG
            this.createSVG(root);

            // Apply treemap layout
            this.applyTreemapLayout(root);

            // Render nodes
            this.renderNodes(root);

            // Add navigation if zoomed
            this.addNavigation();

            return { svg: this.svg, chart: this.chart };
        } catch (error) {
            console.error('Error creating treemap:', error);
            this.handleError('Error creating treemap');
            return { svg: null, chart: null };
        }
    }

    /**
     * Zoom to a specific node
     */
    zoomToNode(node: TreemapHierarchyNode | null): void {
        this.navigator.zoomToNode(node);
        this.config.update({ currentZoomedNode: node });
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<TreemapConfiguration>): void {
        this.config.update(updates);
        
        // Update components with new config
        const newConfig = this.config.get();
        this.nodeRenderer.updateLabelOptions(newConfig.style.labelOptions);
        this.navigator.updateConfig(newConfig.navigation);
    }

    /**
     * Get current configuration
     */
    getConfig(): TreemapConfiguration {
        return this.config.get();
    }

    /**
     * Destroy the visualization and clean up
     */
    destroy(): void {
        if (this.svg) {
            this.svg.remove();
        }
        this.svg = null;
        this.chart = null;
    }

    // Private methods

    private clearContainer(): void {
        const config = this.config.get();
        d3.select(config.container).select('svg').remove();
        d3.select(config.container).select('.absolute').remove();
    }

    private setupContainer(): void {
        const config = this.config.get();
        const { height } = config.dimensions;
        
        // Force fixed height on container to prevent expansion
        config.container.style.height = `${height}px`;
        config.container.style.maxHeight = `${height}px`;
        config.container.style.overflow = 'hidden';
    }

    private prepareHierarchy(data: TreemapNode): TreemapHierarchyNode | null {
        const config = this.config.get();
        
        if (config.currentZoomedNode) {
            return TreemapDataProcessor.prepareZoomedHierarchy(config.currentZoomedNode) as TreemapHierarchyNode;
        } else {
            return TreemapDataProcessor.prepareHierarchy(data, config.behavior.minSizeThreshold) as TreemapHierarchyNode;
        }
    }

    private createSVG(root: TreemapHierarchyNode): void {
        const config = this.config.get();
        const { width, height } = config.dimensions;
        const adjustedMargin = this.config.getAdjustedMargin();

        // Create SVG with fixed dimensions to prevent layout loops
        const svgResult = D3Service.createSVG({
            container: config.container,
            width,
            height,
            margin: adjustedMargin,
            responsive: config.behavior.responsive
        });

        this.svg = svgResult.svg;
        this.chart = svgResult.chart;

        // Explicitly set fixed height attributes to ensure stability
        this.svg
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('height', `${height}px`)
            .style('max-height', `${height}px`)
            .style('overflow', 'hidden')
            .on('mouseout', (event) => {
                // Only hide tooltip if we're actually leaving the SVG
                if (event.relatedTarget && !this.svg?.node()?.contains(event.relatedTarget as Node)) {
                    const config = this.config.get();
                    if (config.callbacks.onTooltipHide) {
                        config.callbacks.onTooltipHide();
                    }
                }
            });
    }

    private applyTreemapLayout(root: TreemapHierarchyNode): void {
        const config = this.config.get();
        const { chartWidth, chartHeight } = this.config.getChartDimensions();
        const { padding } = config.style;

        // Create treemap layout
        const treemap = d3.treemap<TreemapNode>()
            .size([chartWidth, chartHeight])
            .paddingOuter(padding.outer)
            .paddingTop(padding.top)
            .paddingInner(padding.inner)
            .round(true);

        // Apply layout
        try {
            treemap(root);
        } catch (error) {
            console.error('Error applying treemap layout:', error);
            throw new Error('Failed to apply treemap layout');
        }
    }

    private renderNodes(root: TreemapHierarchyNode): void {
        if (!this.chart) return;

        const config = this.config.get();
        const currentZoomedNode = config.currentZoomedNode;

        if (currentZoomedNode) {
            // When zoomed in, render the children directly
            const parentColor = this.colorManager.getColor(currentZoomedNode.data.name);
            this.nodeRenderer.renderLeafNodes(
                this.chart,
                root.children || [],
                parentColor,
                config.callbacks.onTooltipShow,
                config.callbacks.onTooltipHide
            );
        } else {
            // When not zoomed in, render countries and their children
            this.nodeRenderer.renderParentNodes(
                this.chart,
                root.children || [],
                (node) => this.handleNodeClick(node)
            );
            this.nodeRenderer.renderLeafNodes(
                this.chart,
                root.leaves(),
                undefined,
                config.callbacks.onTooltipShow,
                config.callbacks.onTooltipHide
            );
        }
    }

    private addNavigation(): void {
        if (!this.svg) return;

        const config = this.config.get();
        const adjustedMargin = this.config.getAdjustedMargin();

        this.navigator.setCurrentNode((config.currentZoomedNode as TreemapHierarchyNode) || null);
        this.navigator.addNavigation(this.svg, adjustedMargin);
    }

    private handleNodeClick(node: TreemapHierarchyNode): void {
        const config = this.config.get();
        if (config.behavior.enableZoom) {
            this.zoomToNode(node);
        }
    }

    private handleZoom(node: TreemapHierarchyNode | null): void {
        const config = this.config.get();
        if (config.callbacks.onZoom) {
            config.callbacks.onZoom(node);
        }
    }

    private handleNoData(message: string): void {
        const config = this.config.get();
        D3Service.handleNoData(config.container, message);
    }

    private handleError(message: string): void {
        const config = this.config.get();
        D3Service.handleNoData(config.container, message);
    }
}

// Export the main service class for backward compatibility
export default class TreemapService {
    /**
     * Creates a treemap visualization (legacy API)
     */
    static createTreemap(
        data: TreemapNode,
        options: any // Using any for backward compatibility
    ): { svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null, chart: d3.Selection<SVGGElement, unknown, null, undefined> | null } {
        // Convert legacy options to new configuration format
        const config: Partial<TreemapConfiguration> = {
            container: options.container,
            dimensions: {
                width: options.width,
                height: options.height,
                margin: options.margin
            },
            style: {
                colors: options.colors,
                colorMap: options.colorMap,
                padding: options.padding,
                labelOptions: options.labelOptions
            },
            navigation: {
                useBreadcrumbs: options.useBreadcrumbs || false,
                rootName: options.rootName || 'All',
                showZoomButton: true
            },
            behavior: {
                minSizeThreshold: options.minSizeThreshold || 0.001,
                enableZoom: true,
                enableTooltips: true,
                responsive: false
            },
            callbacks: {
                onTooltipShow: options.tooltipCallback,
                onTooltipHide: options.hideTooltipCallback,
                onZoom: options.zoomCallback
            },
            currentZoomedNode: options.currentZoomedNode
        };

        const visualization = new TreemapVisualization(options.container, config);
        return visualization.render(data);
    }
}
