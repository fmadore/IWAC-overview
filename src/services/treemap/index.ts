// Re-export the main visualization class and legacy service
export { TreemapVisualization } from './TreemapVisualization';
export { default as TreemapService } from './TreemapVisualization';

// Export individual modules for advanced usage
export { TreemapConfig } from './TreemapConfig';
export { TreemapDataProcessor } from './TreemapDataProcessor';
export { TreemapColorManager } from './TreemapColorManager';
export { TreemapNodeRenderer } from './TreemapNodeRenderer';
export { TreemapNavigator } from './TreemapNavigator';

// Export types
export type {
    TreemapConfiguration,
    TreemapDimensions,
    TreemapPadding,
    TreemapLabelOptions,
    TreemapCallbacks,
    TreemapNavigationConfig,
    TreemapStyleConfig,
    TreemapBehaviorConfig
} from './TreemapConfig';

// Re-export types from the main treemap interfaces
// Note: TreemapNode and TreemapOptions are now defined locally in TreemapConfig.ts
export type { TreemapNode, TreemapOptions } from './TreemapConfig';
