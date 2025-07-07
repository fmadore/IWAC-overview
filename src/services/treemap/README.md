# Treemap Visualization Refactoring

## Overview

The treemap visualization has been refactored from a single monolithic `TreemapService` class into a modular architecture that improves maintainability, testability, and extensibility.

## New Modular Structure

### Core Modules

1. **TreemapConfig** - Configuration management with validation
2. **TreemapDataProcessor** - Data transformation and hierarchy preparation  
3. **TreemapColorManager** - Color scheme management
4. **TreemapRenderer** - Core D3 treemap layout and SVG creation
5. **TreemapNodeRenderer** - Individual node rendering logic
6. **TreemapNavigator** - Zoom and navigation logic
7. **TreemapVisualization** - Main orchestrator class

### Benefits of Modular Architecture

1. **Single Responsibility Principle** - Each module has one clear purpose
2. **Better Testability** - Individual modules can be unit tested
3. **Improved Maintainability** - Changes to one aspect don't affect others
4. **Flexible Configuration** - Type-safe configuration with validation
5. **Reusability** - Components can be reused in other visualizations
6. **Clearer Code Organization** - Easy to find and modify specific functionality

## Migration Guide

### For Backward Compatibility

The original `TreemapService` API is still supported:

```typescript
import TreemapService from './treemap';

// This still works exactly as before
const result = TreemapService.createTreemap(data, options);
```

### For New Projects (Recommended)

Use the new modular API:

```typescript
import { TreemapVisualization } from './treemap';

const config = {
    container: document.getElementById('treemap-container'),
    dimensions: {
        width: 800,
        height: 600
    },
    style: {
        padding: { outer: 3, top: 16, inner: 1 },
        labelOptions: {
            parentLabel: { fontSize: '14px', color: 'white' },
            childLabel: { fontSize: '12px', color: '#333' }
        }
    },
    behavior: {
        enableZoom: true,
        enableTooltips: true
    },
    callbacks: {
        onZoom: (node) => console.log('Zoomed to:', node?.data.name),
        onTooltipShow: (event, data) => showTooltip(event, data)
    }
};

const visualization = new TreemapVisualization(container, config);
const result = visualization.render(data);
```

### Advanced Usage

Use individual modules for custom implementations:

```typescript
import { 
    TreemapDataProcessor, 
    TreemapColorManager, 
    TreemapNodeRenderer 
} from './treemap';

// Custom data processing
const processor = new TreemapDataProcessor();
const hierarchy = processor.prepareHierarchy(data, 0.01);

// Custom color management
const colorManager = new TreemapColorManager();
colorManager.initializeFromHierarchy(hierarchy);

// Custom rendering
const renderer = new TreemapNodeRenderer(colorManager, labelOptions);
```

## Configuration Improvements

### Type Safety

The new configuration system provides full TypeScript support with interfaces for:
- `TreemapConfiguration` - Main configuration object
- `TreemapDimensions` - Size and margin configuration
- `TreemapStyleConfig` - Visual styling options
- `TreemapBehaviorConfig` - Interaction behavior
- `TreemapCallbacks` - Event handlers

### Validation

Configuration is automatically validated:
- Required fields are enforced
- Value ranges are checked (e.g., dimensions > 0)
- Type safety prevents invalid configurations

### Default Values

Sensible defaults are provided for all optional configuration:
```typescript
const defaultConfig = {
    dimensions: { width: 800, height: 500, margin: { top: 10, right: 10, bottom: 10, left: 10 } },
    behavior: { enableZoom: true, enableTooltips: true, minSizeThreshold: 0.001 },
    navigation: { useBreadcrumbs: false, showZoomButton: true, rootName: 'All' }
};
```

## Testing Strategy

The modular structure enables focused unit testing:

```typescript
// Test data processing in isolation
describe('TreemapDataProcessor', () => {
    it('should validate data structure', () => {
        expect(TreemapDataProcessor.validateData(validData)).toBe(true);
        expect(TreemapDataProcessor.validateData(invalidData)).toBe(false);
    });
});

// Test color management
describe('TreemapColorManager', () => {
    it('should maintain color consistency', () => {
        const manager = new TreemapColorManager();
        const color1 = manager.getColor('Country A');
        const color2 = manager.getColor('Country A');
        expect(color1).toBe(color2);
    });
});
```

## Performance Improvements

1. **Lazy Initialization** - Components are only created when needed
2. **Efficient Re-rendering** - Only affected components update when configuration changes
3. **Memory Management** - Proper cleanup and disposal methods
4. **Reduced Coupling** - Less overhead from unnecessary dependencies

## Future Extensibility

The modular structure makes it easy to add new features:

1. **New Renderers** - Add support for different node shapes or styles
2. **Animation System** - Add smooth transitions between states
3. **Accessibility** - Add keyboard navigation and screen reader support
4. **Export Features** - Add SVG/PNG export capabilities
5. **Custom Layouts** - Support for different treemap algorithms

## File Structure

```
src/services/treemap/
├── index.ts                 # Main exports
├── TreemapVisualization.ts  # Main orchestrator + legacy compatibility
├── TreemapConfig.ts         # Configuration management
├── TreemapDataProcessor.ts  # Data processing utilities
├── TreemapColorManager.ts   # Color management
├── TreemapNodeRenderer.ts   # Node rendering logic
├── TreemapNavigator.ts      # Navigation and zoom
└── README.md               # This file
```

## Migration Timeline

1. **Phase 1** (Current) - Refactored code with backward compatibility
2. **Phase 2** - Update existing components to use new API
3. **Phase 3** - Add new features (animations, accessibility, etc.)
4. **Phase 4** - Remove legacy API (major version bump)
