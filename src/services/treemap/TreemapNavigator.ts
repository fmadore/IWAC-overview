import type { TreemapNode } from './TreemapConfig';
import type { TreemapNavigationConfig } from './TreemapConfig';
import * as d3 from 'd3';

type TreemapHierarchyNode = d3.HierarchyRectangularNode<TreemapNode>;

export class TreemapNavigator {
    private config: TreemapNavigationConfig;
    private currentZoomedNode: TreemapHierarchyNode | null = null;
    private onZoomCallback?: (node: TreemapHierarchyNode | null) => void;

    constructor(config: TreemapNavigationConfig, onZoom?: (node: TreemapHierarchyNode | null) => void) {
        this.config = config;
        this.onZoomCallback = onZoom;
    }

    /**
     * Set the zoom callback
     */
    setZoomCallback(callback: (node: TreemapHierarchyNode | null) => void): void {
        this.onZoomCallback = callback;
    }

    /**
     * Set current zoomed node
     */
    setCurrentNode(node: TreemapHierarchyNode | null): void {
        this.currentZoomedNode = node;
    }

    /**
     * Get current zoomed node
     */
    getCurrentNode(): TreemapHierarchyNode | null {
        return this.currentZoomedNode;
    }

    /**
     * Zoom to a specific node
     */
    zoomToNode(node: TreemapHierarchyNode | null): void {
        this.currentZoomedNode = node;
        if (this.onZoomCallback) {
            this.onZoomCallback(node);
        }
    }

    /**
     * Zoom out to root
     */
    zoomOut(): void {
        this.zoomToNode(null);
    }

    /**
     * Check if currently zoomed in
     */
    isZoomedIn(): boolean {
        return this.currentZoomedNode !== null;
    }

    /**
     * Adds zoom out button to the visualization
     */
    addZoomOutButton(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number }
    ): void {
        if (!this.config.showZoomButton || !this.currentZoomedNode) {
            return;
        }

        const button = svg.append('g')
            .attr('class', 'zoom-out-button cursor-pointer')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
            .on('click', () => this.zoomOut());
            
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
            .text('Back to All');
    }

    /**
     * Adds breadcrumb navigation to the visualization
     */
    addBreadcrumbNavigation(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number }
    ): void {
        if (!this.config.useBreadcrumbs || !this.currentZoomedNode) {
            return;
        }

        // Create a background for better visibility
        const bgHeight = 30;
        const bgWidth = svg.node()?.getBoundingClientRect().width || 300;
        
        svg.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', bgWidth)
            .attr('height', bgHeight)
            .attr('fill', 'white')
            .attr('opacity', 0.9);

        // Create navigation container
        const nav = svg.append('g')
            .attr('class', 'breadcrumb-navigation')
            .attr('transform', `translate(${margin.left + 10}, ${margin.top + 10})`);
        
        // Add "All" link with a clearer interactive style
        const allLink = nav.append('text')
            .attr('x', 0)
            .attr('y', 5)
            .attr('font-size', 'var(--font-size-sm)')
            .attr('fill', 'var(--primary-color)')
            .attr('class', 'cursor-pointer')
            .text(this.config.rootName)
            .on('click', () => this.zoomOut());
        
        // Underline to make it clear it's clickable
        const allLinkWidth = allLink.node()?.getComputedTextLength() || 20;
        nav.append('line')
            .attr('x1', 0)
            .attr('y1', 22)
            .attr('x2', allLinkWidth)
            .attr('y2', 22)
            .attr('stroke', 'var(--primary-color)')
            .attr('stroke-width', 1);
        
        // Add separator
        nav.append('text')
            .attr('x', allLinkWidth + 8)
            .attr('y', 5)
            .attr('font-size', 'var(--font-size-sm)')
            .attr('fill', 'var(--color-text-secondary)')
            .text('/');
        
        // Add current node name
        nav.append('text')
            .attr('x', allLinkWidth + 20)
            .attr('y', 5)
            .attr('font-size', 'var(--font-size-sm)')
            .attr('font-weight', 'bold')
            .attr('fill', 'var(--color-text-primary)')
            .text(this.currentZoomedNode.data.name);
    }

    /**
     * Add appropriate navigation based on configuration
     */
    addNavigation(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number }
    ): void {
        if (this.config.useBreadcrumbs) {
            this.addBreadcrumbNavigation(svg, margin);
        } else if (this.config.showZoomButton) {
            this.addZoomOutButton(svg, margin);
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<TreemapNavigationConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get navigation path as array of node names
     */
    getNavigationPath(): string[] {
        if (!this.currentZoomedNode) {
            return [this.config.rootName];
        }

        const path: string[] = [this.config.rootName];
        path.push(this.currentZoomedNode.data.name);
        return path;
    }

    /**
     * Check if navigation should adjust margins
     */
    shouldAdjustMargins(): boolean {
        return this.isZoomedIn() && this.config.useBreadcrumbs;
    }
}
