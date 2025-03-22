import * as d3 from 'd3';
import { D3Service } from './d3Service';

export interface TreemapNode {
    name: string;
    children?: TreemapNode[];
    value?: number;
    wordCount?: number;
    itemCount?: number;
    [key: string]: any; // Allow additional properties
}

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

export default class TreemapService {
    /**
     * Creates a treemap visualization
     */
    static createTreemap(
        data: TreemapNode,
        options: TreemapOptions
    ) {
        try {
            const {
                container,
                width = container.clientWidth,
                height = Math.min(container.clientHeight, 500), // Limit max height
                margin = { top: 10, right: 10, bottom: 10, left: 10 },
                padding = { outer: 3, top: 16, inner: 1 },
                tooltipCallback,
                hideTooltipCallback,
                zoomCallback,
                currentZoomedNode = null,
                minSizeThreshold = 0.001,
                useBreadcrumbs = false,
                rootName = 'All',
                labelOptions = {
                    parentLabel: {
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'bold',
                        color: 'white'
                    },
                    childLabel: {
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-primary)',
                        minWidth: 30,
                        minHeight: 20
                    }
                }
            } = options;

            // Clear existing content
            d3.select(container).select('svg').remove();
            d3.select(container).select('.absolute').remove();

            // Handle empty data case
            if (!data.children || data.children.length === 0) {
                D3Service.handleNoData(container);
                return { svg: null, chart: null };
            }

            // Force fixed height on container to prevent expansion
            container.style.height = `${height}px`;
            container.style.maxHeight = `${height}px`;
            container.style.overflow = 'hidden';
            
            // Adjust margins for breadcrumbs if needed
            const adjustedMargin = { ...margin };
            if (currentZoomedNode && useBreadcrumbs) {
                adjustedMargin.top += 30; // Add space for breadcrumb navigation
            }
            
            // Create SVG with fixed dimensions to prevent layout loops
            const { svg, chart, chartWidth, chartHeight } = D3Service.createSVG({
                container,
                width,
                height,
                margin: adjustedMargin,
                responsive: false // Disable responsive behavior which might cause expansion
            });
            
            // Explicitly set fixed height attributes to ensure stability
            svg.attr('height', height)
               .attr('viewBox', `0 0 ${width} ${height}`)
               .style('height', `${height}px`)
               .style('max-height', `${height}px`)
               .style('overflow', 'hidden')
               // Add mouseout for the entire SVG to catch when cursor leaves the chart area
               .on('mouseout', (event) => {
                   // Only hide tooltip if we're actually leaving the SVG
                   if (event.relatedTarget && !svg.node()?.contains(event.relatedTarget as Node)) {
                       if (hideTooltipCallback) hideTooltipCallback();
                   }
               });

            // If zoomed in, add navigation (either breadcrumbs or button)
            if (currentZoomedNode) {
                if (useBreadcrumbs) {
                    this.addBreadcrumbNavigation(svg, margin, currentZoomedNode, rootName, zoomCallback);
                } else {
                    this.addZoomOutButton(svg, margin, zoomCallback);
                }
            }

            // Create treemap layout
            const treemap = d3.treemap<TreemapNode>()
                .size([chartWidth, chartHeight])
                .paddingOuter(padding.outer || 3)
                .paddingTop(padding.top || 16)
                .paddingInner(padding.inner || 1)
                .round(true);

            // Create hierarchy
            let root: d3.HierarchyNode<TreemapNode>;

            if (currentZoomedNode) {
                root = this.prepareZoomedHierarchy(currentZoomedNode);
            } else {
                // Create hierarchy from full data
                root = d3.hierarchy<TreemapNode>(data)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));

                // Filter out nodes with very small values
                if (root.children && minSizeThreshold > 0) {
                    const totalValue = root.value || 0;
                    const threshold = totalValue * minSizeThreshold;
                    root.children = root.children.filter(child => 
                        (child.value || 0) > threshold
                    );
                }
            }

            // Apply treemap layout
            try {
                treemap(root as d3.HierarchyRectangularNode<TreemapNode>);
            } catch (e) {
                console.error('Error applying treemap layout:', e);
                D3Service.handleNoData(container, 'Error rendering treemap');
                return { svg: null, chart: null };
            }

            // Create or use color scale
            const colorScale = this.createColorScale(root, options);
            
            // Track the parent node's color when zoomed in to maintain color consistency
            let parentColor: string | undefined;
            if (currentZoomedNode && options.colorMap) {
                parentColor = options.colorMap.get(currentZoomedNode.data.name);
            }

            // Draw the treemap elements
            if (currentZoomedNode) {
                // When zoomed in, render the children directly with parent's color
                this.renderLeafNodes(
                    chart, 
                    root.children || [], 
                    colorScale, 
                    tooltipCallback, 
                    labelOptions,
                    parentColor, // Pass parent color to ensure consistency
                    hideTooltipCallback
                );
            } else {
                // When not zoomed in, render countries and their children
                this.renderParentNodes(chart, root.children || [], colorScale, zoomCallback, labelOptions);
                this.renderLeafNodes(chart, root.leaves(), colorScale, tooltipCallback, labelOptions, undefined, hideTooltipCallback);
            }

            return { svg, chart };
        } catch (e) {
            console.error('Error creating treemap:', e);
            D3Service.handleNoData(options.container, 'Error creating treemap');
            return { svg: null, chart: null };
        }
    }

    /**
     * Prepares hierarchy for zoomed view
     */
    private static prepareZoomedHierarchy(zoomedNode: d3.HierarchyNode<TreemapNode>): d3.HierarchyNode<TreemapNode> {
        // If the zoomed node data has children, use it directly
        if (zoomedNode.data.children && zoomedNode.data.children.length > 0) {
            const childrenData: TreemapNode = {
                name: zoomedNode.data.name,
                children: zoomedNode.data.children
            };
            
            return d3.hierarchy<TreemapNode>(childrenData)
                .sum(d => d.value || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0));
        } 
        // If the zoomed node only has a flat representation, create a hierarchy from its children
        else if (zoomedNode.children && zoomedNode.children.length > 0) {
            const tempChildren = zoomedNode.children.map(child => ({
                name: child.data.name,
                value: child.data.value || child.value,
                wordCount: child.data.wordCount,
                itemCount: child.data.itemCount
            }));
            
            const tempRoot: TreemapNode = {
                name: zoomedNode.data.name,
                children: tempChildren
            };
            
            return d3.hierarchy<TreemapNode>(tempRoot)
                .sum(d => d.value || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0));
        } 
        else {
            // Fallback to an empty hierarchy if something goes wrong
            console.warn('Zoomed node has no valid children data');
            return d3.hierarchy<TreemapNode>({ name: 'Empty', children: [] })
                .sum(d => d.value || 0);
        }
    }

    /**
     * Creates or uses color scale for treemap
     */
    private static createColorScale(
        root: d3.HierarchyNode<TreemapNode>,
        options: TreemapOptions
    ): d3.ScaleOrdinal<string, string> {
        // Use provided color scale if available
        if (options.colors) {
            return options.colors;
        }

        // Create a new color scale
        const newColorScale = d3.scaleOrdinal<string>()
            .domain(root.children ? root.children.map(d => d.data.name) : [root.data.name])
            .range(d3.schemeCategory10);

        // Store colors in the provided colorMap if available
        if (options.colorMap && root.children) {
            root.children.forEach(child => {
                if (options.colorMap && !options.colorMap.has(child.data.name)) {
                    options.colorMap.set(child.data.name, newColorScale(child.data.name));
                }
            });
        }

        return newColorScale;
    }

    /**
     * Adds a button to zoom out
     */
    private static addZoomOutButton(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number },
        zoomCallback?: (node: d3.HierarchyNode<TreemapNode> | null) => void
    ) {
        if (!zoomCallback) return;

        const button = svg.append('g')
            .attr('class', 'zoom-out-button cursor-pointer')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
            .on('click', () => zoomCallback(null));
            
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
    private static addBreadcrumbNavigation(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        margin: { top: number; right: number; bottom: number; left: number },
        currentNode: d3.HierarchyNode<TreemapNode>,
        rootName: string,
        zoomCallback?: (node: d3.HierarchyNode<TreemapNode> | null) => void
    ) {
        if (!zoomCallback) return;

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
            .text(rootName)
            .on('click', () => zoomCallback(null));
        
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
            .text(currentNode.data.name);
    }

    /**
     * Renders parent-level nodes (e.g., countries)
     */
    private static renderParentNodes(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        nodes: d3.HierarchyNode<TreemapNode>[],
        colorScale: d3.ScaleOrdinal<string, string>,
        zoomCallback?: (node: d3.HierarchyNode<TreemapNode> | null) => void,
        labelOptions?: any
    ) {
        const nodeGroups = chart.selectAll('.parent-node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'parent-node')
            .attr('transform', d => {
                const x = (d as any).x0 || 0;
                const y = (d as any).y0 || 0;
                return `translate(${x},${y})`;
            });
        
        // Add background rectangles
        nodeGroups.append('rect')
            .attr('width', d => {
                const x0 = (d as any).x0 || 0;
                const x1 = (d as any).x1 || 0;
                return Math.max(0, x1 - x0);
            })
            .attr('height', d => {
                const y0 = (d as any).y0 || 0;
                const y1 = (d as any).y1 || 0;
                return Math.max(0, y1 - y0);
            })
            .attr('fill', d => colorScale(d.data.name))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .attr('class', 'cursor-pointer')
            .on('click', (event, d) => {
                if (zoomCallback) zoomCallback(d);
            });
        
        // Add labels
        nodeGroups.append('text')
            .attr('x', 5)
            .attr('y', 15)
            .attr('font-size', labelOptions?.parentLabel?.fontSize || 'var(--font-size-sm)')
            .attr('font-weight', labelOptions?.parentLabel?.fontWeight || 'bold')
            .attr('fill', labelOptions?.parentLabel?.color || 'white')
            .text(d => {
                // Calculate available width
                const width = (d as any).x1 - (d as any).x0 - 10;
                // If width is too small, just show the name without word count
                if (width < 150) return d.data.name;
                // Otherwise show name with word count
                return `${d.data.name} (${d.data.wordCount?.toLocaleString() || 0})`;
            })
            .attr('pointer-events', 'none')
            .each(function(d) {
                const self = d3.select(this);
                const textLength = (this as SVGTextElement).getComputedTextLength();
                const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                
                if (textLength > availableWidth) {
                    // Truncate text if too long
                    let text = d.data.name;
                    self.text(text);
                    
                    let currentTextLength = (this as SVGTextElement).getComputedTextLength();
                    let ellipsis = false;
                    
                    while (currentTextLength > availableWidth && text.length > 3) {
                        text = text.slice(0, -1);
                        self.text(text);
                        currentTextLength = (this as SVGTextElement).getComputedTextLength();
                        ellipsis = true;
                    }
                    
                    if (ellipsis) {
                        self.text(text + '...');
                    }
                    
                    // Add tooltip with full name and word count
                    self.append('title')
                        .text(`${d.data.name} (${d.data.wordCount?.toLocaleString() || 0})`);
                }
            });
    }

    /**
     * Renders leaf-level nodes (e.g., item sets)
     */
    private static renderLeafNodes(
        chart: d3.Selection<SVGGElement, unknown, null, undefined>,
        nodes: d3.HierarchyNode<TreemapNode>[],
        colorScale: d3.ScaleOrdinal<string, string>,
        tooltipCallback?: (event: MouseEvent, d: d3.HierarchyNode<TreemapNode>) => void,
        labelOptions?: any,
        parentColor?: string,
        hideTooltipCallback?: () => void
    ) {
        const nodeGroups = chart.selectAll('.leaf-node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'leaf-node')
            .attr('transform', d => {
                const x = (d as any).x0 || 0;
                const y = (d as any).y0 || 0;
                return `translate(${x},${y})`;
            });
        
        // Add rectangles
        nodeGroups.append('rect')
            .attr('width', d => {
                const x0 = (d as any).x0 || 0;
                const x1 = (d as any).x1 || 0;
                return Math.max(0, x1 - x0);
            })
            .attr('height', d => {
                const y0 = (d as any).y0 || 0;
                const y1 = (d as any).y1 || 0;
                return Math.max(0, y1 - y0);
            })
            .attr('fill', d => {
                // If we have a parentColor (in zoomed view), use it for all children
                if (parentColor) {
                    return parentColor;
                }
                // Otherwise use the parent's color (in main view)
                return d.parent 
                    ? colorScale(d.parent.data.name)
                    : colorScale(d.data.name);
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .attr('class', 'cursor-pointer')
            .on('mouseover', function(event, d) {
                // Highlight on hover
                d3.select(this)
                    .attr('stroke', 'var(--primary-color)')
                    .attr('stroke-width', 2);
                
                // Call tooltip callback if provided
                if (tooltipCallback) tooltipCallback(event, d);
            })
            .on('mousemove', function(event, d) {
                // Update tooltip position
                if (tooltipCallback) tooltipCallback(event, d);
            })
            .on('mouseout', function() {
                // Remove highlight
                d3.select(this)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5);
                
                // Hide tooltip when mouse leaves the element
                if (hideTooltipCallback) hideTooltipCallback();
            });
        
        // Add labels
        nodeGroups.append('text')
            .attr('x', 3)
            .attr('y', 13)
            .attr('font-size', labelOptions?.childLabel?.fontSize || 'var(--font-size-xs)')
            .attr('fill', labelOptions?.childLabel?.color || 'var(--color-text-primary)')
            .attr('pointer-events', 'none')
            .each(function(d) {
                const self = d3.select(this);
                const width = (d as any).x1 - (d as any).x0;
                const height = (d as any).y1 - (d as any).y0;
                
                // Only add text if rectangle is big enough
                const minWidth = labelOptions?.childLabel?.minWidth || 30;
                const minHeight = labelOptions?.childLabel?.minHeight || 20;
                
                if (width < minWidth || height < minHeight) {
                    return;
                }
                
                let text = d.data.name;
                // Truncate text if too long
                const availableWidth = width - 6;
                
                // Get the parent/category for the tooltip
                const parent = d.parent ? d.parent.data.name : '';
                
                self.text(text)
                    .append('title')
                    .text(`${parent} > ${d.data.name}: ${d.data.wordCount?.toLocaleString() || 0} (${d.data.itemCount || 0} items)`);
                
                // Check if text fits and truncate if necessary
                const node = this as SVGTextElement;
                let textLength = node.getComputedTextLength();
                let ellipsis = false;
                
                while (textLength > availableWidth && text.length > 3) {
                    text = text.slice(0, -1);
                    self.text(text);
                    textLength = node.getComputedTextLength();
                    ellipsis = true;
                }
                
                if (ellipsis) {
                    self.text(text + '...');
                    // Re-add the tooltip since it was lost when changing the text
                    self.append('title')
                        .text(`${parent} > ${d.data.name}: ${d.data.wordCount?.toLocaleString() || 0} (${d.data.itemCount || 0} items)`);
                }
            });
    }
} 