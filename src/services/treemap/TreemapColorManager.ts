import type { TreemapNode } from './TreemapConfig';
import * as d3 from 'd3';

export class TreemapColorManager {
    private colorScale: d3.ScaleOrdinal<string, string>;
    private colorMap: Map<string, string>;
    private defaultColors: readonly string[];
    private parentColorMap: Map<string, string>; // Maps child -> parent color

    constructor(
        providedColors?: d3.ScaleOrdinal<string, string>,
        providedColorMap?: Map<string, string>,
        customColorScheme?: readonly string[]
    ) {
        this.colorMap = providedColorMap || new Map();
        this.parentColorMap = new Map();
        
        // Use a limited, balanced color palette for better visual coherence
        this.defaultColors = customColorScheme || [
            '#1f77b4', // blue
            '#ff7f0e', // orange  
            '#2ca02c', // green
            '#d62728', // red
            '#9467bd', // purple
            '#8c564b', // brown
            '#e377c2', // pink
            '#7f7f7f', // gray
            '#bcbd22', // olive
            '#17becf'  // cyan
        ];
        
        if (providedColors) {
            this.colorScale = providedColors;
        } else {
            this.colorScale = d3.scaleOrdinal<string>()
                .range(this.defaultColors);
        }
    }

    /**
     * Initialize color scale with domain from hierarchy and establish parent-child relationships
     */
    initializeFromHierarchy(root: d3.HierarchyNode<TreemapNode>): void {
        // Limit domain to ensure consistent coloring
        const domain = root.children ? root.children.map(d => d.data.name) : [root.data.name];
        this.colorScale.domain(domain);

        // Clear previous parent mappings
        this.parentColorMap.clear();

        // Store colors in colorMap for consistency and establish parent-child relationships
        if (root.children) {
            root.children.forEach(child => {
                // Assign parent color
                if (!this.colorMap.has(child.data.name)) {
                    this.colorMap.set(child.data.name, this.colorScale(child.data.name));
                }
                
                // Map all grandchildren to their parent's color
                if (child.children) {
                    const parentColor = this.colorMap.get(child.data.name)!;
                    child.children.forEach(grandchild => {
                        this.parentColorMap.set(grandchild.data.name, parentColor);
                    });
                }
            });
        }
    }

    /**
     * Get color for a node
     */
    getColor(nodeName: string): string {
        // First check the persistent color map
        if (this.colorMap.has(nodeName)) {
            return this.colorMap.get(nodeName)!;
        }

        // Otherwise use the color scale
        const color = this.colorScale(nodeName);
        this.colorMap.set(nodeName, color);
        return color;
    }

    /**
     * Get color for a child node, using parent-child relationship
     */
    getChildColor(
        childName: string, 
        parentName?: string, 
        useParentBase: boolean = false
    ): string {
        // If we have a stored parent color relationship, use it
        if (this.parentColorMap.has(childName)) {
            const parentColor = this.parentColorMap.get(childName)!;
            return this.createColorVariant(parentColor, childName);
        }

        if (useParentBase && parentName) {
            const parentColor = this.getColor(parentName);
            return this.createColorVariant(parentColor, childName);
        }

        return this.getColor(childName);
    }

    /**
     * Get color for a node in the context of zoom (when viewing children)
     */
    getZoomedChildColor(childName: string, parentColor: string): string {
        return this.createColorVariant(parentColor, childName);
    }

    /**
     * Create a color variant based on parent color with better variation
     */
    private createColorVariant(baseColor: string, identifier: string): string {
        const hash = this.simpleHash(identifier);
        
        // Convert to HSL for better color manipulation
        const hsl = d3.hsl(baseColor);
        if (!hsl) return baseColor;
        
        // Create variations by adjusting saturation and lightness
        // This creates more visually appealing variants than just lightness
        const saturationVariation = 0.15 + (hash % 0.3); // 0.15 to 0.45
        const lightnessVariation = 0.25 + (hash % 0.5); // 0.25 to 0.75
        
        // Apply variations while keeping the hue consistent
        hsl.s = Math.min(1, Math.max(0.2, hsl.s * saturationVariation));
        hsl.l = Math.min(0.9, Math.max(0.1, lightnessVariation));
        
        return hsl.toString();
    }

    /**
     * Simple hash function for consistent color variants
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }

    /**
     * Get the underlying color scale
     */
    getColorScale(): d3.ScaleOrdinal<string, string> {
        return this.colorScale;
    }

    /**
     * Get the color map for persistence
     */
    getColorMap(): Map<string, string> {
        return new Map(this.colorMap); // Return a copy
    }

    /**
     * Set a specific color for a node
     */
    setColor(nodeName: string, color: string): void {
        this.colorMap.set(nodeName, color);
    }

    /**
     * Clear all stored colors and parent relationships
     */
    clear(): void {
        this.colorMap.clear();
        this.parentColorMap.clear();
    }

    /**
     * Create a new color manager with the same configuration
     */
    clone(): TreemapColorManager {
        const cloned = new TreemapColorManager(
            this.colorScale,
            new Map(this.colorMap),
            this.defaultColors
        );
        cloned.parentColorMap = new Map(this.parentColorMap);
        return cloned;
    }
}
