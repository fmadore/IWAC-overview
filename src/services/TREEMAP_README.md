# Treemap Service

The Treemap Service provides a reusable, standardized way to create and manage D3.js treemap visualizations across the application. It abstracts the complex treemap rendering logic into a reusable service, making treemap visualizations easier to implement and maintain.

## Purpose

This service was created to:

1. Reduce code duplication between components that use treemap visualizations
2. Standardize the treemap implementation and appearance
3. Improve maintainability by centralizing treemap-specific logic
4. Make it easier to implement new treemap visualizations

## Features

- Hierarchical data visualization with nesting support
- Interactive zooming into node hierarchies
- Consistent color management across zooming levels
- Automatic text truncation for labels
- Responsive sizing
- Customizable appearance through options
- Tooltips support via callback
- Error handling for empty data and rendering issues

## Usage Example

```typescript
import TreemapService, { type TreemapNode } from '../../services/treemap';
import { useTooltip } from '../../hooks/useTooltip';

// In your component
let container: HTMLDivElement;
let hierarchyData: TreemapNode;
let countryColors: Map<string, string> = new Map();
let zoomedNode: d3.HierarchyNode<TreemapNode> | null = null;

// Initialize tooltip hook
const { showTooltip, hideTooltip } = useTooltip();

// Process your data into TreemapNode format
function processData() {
  // Process your data here and return it in the TreemapNode format
  return {
    name: 'Root',
    children: [
      {
        name: 'Group A',
        children: [
          { name: 'Item 1', value: 100, itemCount: 10 },
          { name: 'Item 2', value: 200, itemCount: 15 }
        ]
      },
      {
        name: 'Group B',
        children: [
          { name: 'Item 3', value: 300, itemCount: 20 },
          { name: 'Item 4', value: 150, itemCount: 12 }
        ]
      }
    ]
  };
}

// Handle tooltip display
function handleTooltip(event: MouseEvent, d: d3.HierarchyNode<TreemapNode>) {
  showTooltip(event, `${d.data.name}: ${d.data.value}`);
}

// Handle zoom functionality
function handleZoom(node: d3.HierarchyNode<TreemapNode> | null) {
  zoomedNode = node;
  updateVisualization();
}

// Update visualization
function updateVisualization() {
  // Get fresh data if not zoomed
  if (!zoomedNode) {
    hierarchyData = processData();
  }
  
  // Create treemap using TreemapService
  TreemapService.createTreemap(hierarchyData, {
    container,
    colorMap: countryColors,
    tooltipCallback: handleTooltip,
    zoomCallback: handleZoom,
    currentZoomedNode: zoomedNode,
    labelOptions: {
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
  });
}
```

## API Reference

### TreemapNode Interface

```typescript
interface TreemapNode {
    name: string;
    children?: TreemapNode[];
    value?: number;
    wordCount?: number;
    itemCount?: number;
    [key: string]: any; // Allow additional properties
}
```

### TreemapOptions Interface

```typescript
interface TreemapOptions {
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
    zoomCallback?: (node: d3.HierarchyNode<TreemapNode> | null) => void;
    currentZoomedNode?: d3.HierarchyNode<TreemapNode> | null;
    minSizeThreshold?: number;
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
```

### createTreemap Method

```typescript
static createTreemap(data: TreemapNode, options: TreemapOptions)
```

Creates a treemap visualization with the provided data and options. Returns an object containing the SVG and chart D3 selections.

## Migration Guide

To migrate an existing treemap visualization to use this service:

1. Import the TreemapService and interfaces
2. Convert your data to follow the TreemapNode interface
3. Define your tooltip and zoom callbacks
4. Replace direct D3 treemap creation with TreemapService.createTreemap()
5. Configure the treemap using the options parameter

## Styling

The service uses CSS variables for styling, which can be customized in your theme:

- `--primary-color`: Used for highlights and zoom button
- `--color-text-primary`: Used for text in child nodes
- `--font-size-sm`: Used for parent node labels
- `--font-size-xs`: Used for child node labels

## Dependencies

- D3.js (d3): For the core visualization functionality
- D3Service: Used for SVG creation and no-data handling 