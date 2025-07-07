import type { TreemapNode } from './TreemapConfig';
import * as d3 from 'd3';

export class TreemapDataProcessor {
    
    /**
     * Prepares hierarchy from raw data
     */
    static prepareHierarchy(
        data: TreemapNode, 
        minSizeThreshold: number = 0
    ): d3.HierarchyNode<TreemapNode> {
        const root = d3.hierarchy<TreemapNode>(data)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // Filter out nodes with very small values
        if (root.children && minSizeThreshold > 0) {
            const totalValue = root.value || 0;
            root.children = root.children.filter(child => {
                const childValue = child.value || 0;
                return (childValue / totalValue) >= minSizeThreshold;
            });
        }

        return root;
    }

    /**
     * Prepares hierarchy for zoomed view
     */
    static prepareZoomedHierarchy(
        zoomedNode: d3.HierarchyNode<TreemapNode>
    ): d3.HierarchyNode<TreemapNode> {
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
     * Validates data structure
     */
    static validateData(data: TreemapNode): boolean {
        if (!data) {
            console.error('TreemapDataProcessor: No data provided');
            return false;
        }

        if (!data.name) {
            console.error('TreemapDataProcessor: Root node must have a name');
            return false;
        }

        if (!data.children || data.children.length === 0) {
            console.warn('TreemapDataProcessor: No children data found');
            return false;
        }

        // Validate children structure
        const hasValidChildren = data.children.every((child: TreemapNode) => {
            return child.name && (child.value !== undefined || child.children);
        });

        if (!hasValidChildren) {
            console.error('TreemapDataProcessor: Invalid children structure - each child must have a name and either a value or children');
            return false;
        }

        return true;
    }

    /**
     * Calculates total value for a node and its children
     */
    static calculateTotalValue(node: TreemapNode): number {
        if (node.value !== undefined) {
            return node.value;
        }

        if (node.children && node.children.length > 0) {
            return node.children.reduce((sum: number, child: TreemapNode) => sum + this.calculateTotalValue(child), 0);
        }

        return 0;
    }

    /**
     * Gets flat list of all leaf nodes
     */
    static getLeafNodes(root: d3.HierarchyNode<TreemapNode>): d3.HierarchyNode<TreemapNode>[] {
        return root.leaves();
    }

    /**
     * Gets immediate children of root
     */
    static getParentNodes(root: d3.HierarchyNode<TreemapNode>): d3.HierarchyNode<TreemapNode>[] {
        return root.children || [];
    }
}
