# Visualization Hooks

This directory contains reusable hooks for visualization components. These hooks extract common functionality from visualization components to reduce code duplication and improve maintainability.

## Available Hooks

### useTooltip

The `useTooltip` hook provides a standardized way to create and manage tooltips in visualization components.

#### Usage

```typescript
import { useTooltip, createGridTooltipContent } from '../hooks/useTooltip';

// In your component
const { showTooltip, hideTooltip, updateTooltipContent } = useTooltip({
  // Optional configuration
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  fontSize: '12px',
  // ... other options
});

// Show a tooltip
function handleMouseOver(event: MouseEvent, data: YourDataType) {
  const content = createGridTooltipContent(
    'Title',
    [
      { label: 'Count', value: data.count },
      { label: 'Percentage', value: `${data.percentage.toFixed(2)}%` }
    ]
  );
  
  showTooltip(event, content);
}

// Hide the tooltip
function handleMouseOut() {
  hideTooltip();
}

// Update tooltip content without changing position
function handleMouseMove(event: MouseEvent, data: YourDataType) {
  const content = createGridTooltipContent(
    'Updated Title',
    [
      { label: 'Count', value: data.count },
      { label: 'Percentage', value: `${data.percentage.toFixed(2)}%` }
    ]
  );
  
  updateTooltipContent(content);
}
```

#### API

##### useTooltip(options)

Creates a tooltip instance with the specified options.

**Parameters:**
- `options` (optional): Configuration options for the tooltip
  - `backgroundColor`: Background color of the tooltip (default: 'rgba(0, 0, 0, 0.8)')
  - `color`: Text color of the tooltip (default: 'white')
  - `padding`: Padding inside the tooltip (default: '8px 12px')
  - `borderRadius`: Border radius of the tooltip (default: '4px')
  - `fontSize`: Font size of the tooltip text (default: '12px')
  - `zIndex`: Z-index of the tooltip (default: '1000')
  - `boxShadow`: Box shadow of the tooltip (default: '0 2px 5px rgba(0,0,0,0.2)')
  - `defaultWidth`: Default width of the tooltip for positioning calculations (default: 200)
  - `defaultHeight`: Default height of the tooltip for positioning calculations (default: 100)
  - `offset`: Offset from cursor in pixels (default: 10)

**Returns:**
- `showTooltip(event, content, width?, height?)`: Shows the tooltip with the provided content at the event position
- `hideTooltip()`: Hides the tooltip
- `updateTooltipContent(content)`: Updates the tooltip content without changing its position
- `calculatePosition(event, width?, height?)`: Calculates the optimal position for the tooltip
- `getTooltipElement()`: Returns the tooltip DOM element

##### createGridTooltipContent(title, rows)

Helper function to create a grid-style tooltip content.

**Parameters:**
- `title`: Title for the tooltip
- `rows`: Array of label/value pairs to display in the grid

**Returns:**
- Formatted HTML string for the tooltip

## Planned Hooks

Future hooks to be implemented:

1. `useD3Resize`: Handle responsive D3.js visualizations
2. `useDataProcessing`: Common data processing logic for visualizations
3. `useLegend`: Create and manage legends for visualizations
4. `useAxis`: Create and manage D3.js axes
5. `useZoom`: Handle zoom behavior in visualizations 