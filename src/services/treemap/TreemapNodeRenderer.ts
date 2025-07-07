import type { TreemapNode } from './TreemapConfig';
import type { TreemapConfiguration, TreemapLabelOptions } from './TreemapConfig';
import type { TreemapColorManager } from './TreemapColorManager';
import * as d3 from 'd3';

type TreemapHierarchyNode = d3.HierarchyRectangularNode<TreemapNode>;

export class TreemapNodeRenderer {
    private colorManager: TreemapColorManager;
    private labelOptions: TreemapLabelOptions;

    constructor(colorManager: TreemapColorManager, labelOptions: TreemapLabelOptions) {
        this.colorManager = colorManager;
        this.labelOptions = labelOptions;
    }

    /**
     * Renders parent-level nodes (e.g., countries)
     */
    renderParentNodes(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        nodes: TreemapHierarchyNode[],
        onNodeClick?: (node: TreemapHierarchyNode) => void
    ): void {
        const nodeGroups = chart.selectAll('.parent-node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'parent-node')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Add background rectangles
        nodeGroups.append('rect')
            .attr('width', d => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
            .attr('height', d => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
            .attr('fill', d => this.colorManager.getColor(d.data.name))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .attr('class', 'cursor-pointer treemap-rect-modern')
            .on('click', (event, d) => {
                if (onNodeClick) {
                    onNodeClick(d);
                }
            });
        
        // Add labels
        this.addParentLabels(nodeGroups);
    }

    /**
     * Renders leaf-level nodes (e.g., item sets) with proper color inheritance
     */
    renderLeafNodes(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        nodes: TreemapHierarchyNode[],
        parentColor?: string,
        onTooltipShow?: (event: MouseEvent, d: TreemapHierarchyNode) => void,
        onTooltipHide?: () => void
    ): void {
        const nodeGroups = chart.selectAll('.leaf-node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'leaf-node')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);
        
        // Add rectangles with same parent color for all children
        nodeGroups.append('rect')
            .attr('width', d => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
            .attr('height', d => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
            .attr('fill', d => {
                if (parentColor) {
                    // When zoomed into a parent, ALL children use the SAME parent color
                    return parentColor;
                } else {
                    // When showing overview, ALL children use their parent's EXACT color (no variations)
                    const parentName = d.parent?.data.name;
                    return parentName ? 
                        this.colorManager.getColor(parentName) :  // Use parent's exact color
                        this.colorManager.getColor(d.data.name);
                }
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .attr('class', 'cursor-pointer treemap-rect-modern')
            .on('mouseover', (event, d) => {
                if (onTooltipShow) {
                    onTooltipShow(event, d);
                }
            })
            .on('mousemove', (event, d) => {
                if (onTooltipShow) {
                    onTooltipShow(event, d);
                }
            })
            .on('mouseout', () => {
                if (onTooltipHide) {
                    onTooltipHide();
                }
            });
        
        // Add labels
        this.addChildLabels(nodeGroups);
    }

    /**
     * Adds labels to parent nodes
     */
    private addParentLabels(
        nodeGroups: d3.Selection<SVGGElement, TreemapHierarchyNode, SVGGElement, unknown>
    ): void {
        nodeGroups.append('text')
            .attr('x', 5)
            .attr('y', 15)
            .attr('font-size', this.labelOptions.parentLabel.fontSize)
            .attr('font-weight', this.labelOptions.parentLabel.fontWeight)
            .attr('fill', this.labelOptions.parentLabel.color)
            .attr('class', 'treemap-text')
            .text(d => {
                const availableWidth = Math.max(0, (d.x1 || 0) - (d.x0 || 0)) - 10;
                return this.truncateText(d.data.name, availableWidth, this.labelOptions.parentLabel.fontSize);
            })
            .attr('pointer-events', 'none')
            .each(function(d) {
                // Hide text if rectangle is too small
                const rectWidth = Math.max(0, (d.x1 || 0) - (d.x0 || 0));
                const rectHeight = Math.max(0, (d.y1 || 0) - (d.y0 || 0));
                if (rectWidth < 50 || rectHeight < 20) {
                    d3.select(this).style('display', 'none');
                }
            });
    }

    /**
     * Adds labels to child nodes
     */
    private addChildLabels(
        nodeGroups: d3.Selection<SVGGElement, TreemapHierarchyNode, SVGGElement, unknown>
    ): void {
        nodeGroups.append('text')
            .attr('x', 3)
            .attr('y', 13)
            .attr('font-size', this.labelOptions.childLabel.fontSize)
            .attr('fill', this.labelOptions.childLabel.color)
            .attr('class', 'treemap-text')
            .attr('pointer-events', 'none')
            .each(function(d) {
                const rectWidth = Math.max(0, (d.x1 || 0) - (d.x0 || 0));
                const rectHeight = Math.max(0, (d.y1 || 0) - (d.y0 || 0));
                
                // Hide text if rectangle is too small
                if (rectWidth < 30 || rectHeight < 20) {
                    d3.select(this).style('display', 'none');
                    return;
                }

                const availableWidth = rectWidth - 6; // Account for padding
                const element = d3.select(this);
                let text = d.data.name;
                
                // Set initial text
                element.text(text);
                let textLength = (element.node() as SVGTextElement)?.getComputedTextLength() || 0;
                
                // Truncate if necessary
                while (textLength > availableWidth && text.length > 3) {
                    text = text.slice(0, -1);
                    element.text(text + '...');
                    textLength = (element.node() as SVGTextElement)?.getComputedTextLength() || 0;
                }
            });
    }

    /**
     * Helper method to truncate text based on available width
     */
    private truncateText(text: string, availableWidth: number, fontSize: string): string {
        // This is a rough estimation - in practice you might want to measure actual text width
        const avgCharWidth = this.getAverageCharWidth(fontSize);
        const maxChars = Math.floor(availableWidth / avgCharWidth);
        
        if (text.length <= maxChars) {
            return text;
        }
        
        return text.slice(0, Math.max(1, maxChars - 3)) + '...';
    }

    /**
     * Rough estimation of character width based on font size
     */
    private getAverageCharWidth(fontSize: string): number {
        // Extract numeric value from CSS font size (e.g., "12px" -> 12)
        const sizeMatch = fontSize.match(/(\d+)/);
        const size = sizeMatch ? parseInt(sizeMatch[1]) : 12;
        return size * 0.6; // Rough approximation
    }

    /**
     * Update label options
     */
    updateLabelOptions(labelOptions: TreemapLabelOptions): void {
        this.labelOptions = labelOptions;
    }

    /**
     * Update color manager
     */
    updateColorManager(colorManager: TreemapColorManager): void {
        this.colorManager = colorManager;
    }
}
