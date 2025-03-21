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

### useD3Resize

The `useD3Resize` hook provides standardized resize handling for D3.js visualizations, with built-in debouncing and cleanup.

#### Usage

```typescript
import { useD3Resize } from '../hooks/useD3Resize';

// In your component
let container: HTMLDivElement;

// Initialize the resize hook
const { width, height, dimensions, updateDimensions } = useD3Resize({
  container,
  onResize: () => {
    // Update your visualization with new dimensions
    updateVisualization();
  },
  // Optional: customize debounce behavior
  debounce: true,
  debounceDelay: 100
});

// Use the dimensions in your visualization
function updateVisualization() {
  const { width, height } = dimensions;
  // Update your D3 visualization with new dimensions
  // ...
}
```

#### API

##### useD3Resize(options)

Creates a resize handler for D3.js visualizations.

**Parameters:**
- `options`: Configuration options for the resize handler
  - `container`: The container element to observe for size changes
  - `onResize`: Callback function to be called when the container size changes
  - `debounce`: Whether to debounce the resize callback (default: true)
  - `debounceDelay`: Debounce delay in milliseconds (default: 100)

**Returns:**
- `width`: The current width of the container
- `height`: The current height of the container
- `dimensions`: Object containing both width and height
- `updateDimensions`: Function to manually trigger a resize update

### useDataProcessing

The `useDataProcessing` hook provides standardized data processing utilities for visualizations, including filtering, grouping, and time-based data processing.

#### Usage

```typescript
import { useDataProcessing } from '../hooks/useDataProcessing';

// In your component
const { filterItems, groupAndCount, groupHierarchically, processTimeData } = useDataProcessing({
  // Optional configuration
  filterMissingValues: true,
  requiredFields: ['country', 'language'],
  calculatePercentages: true,
  sortByCount: true,
  sortDescending: true
});

// Filter items
const filteredItems = filterItems(items);

// Group and count items by a key
const languageCounts = groupAndCount(
  items,
  item => item.language || 'Unknown'
);

// Group items hierarchically (e.g., by country then language)
const hierarchicalData = groupHierarchically(
  items,
  [item => item.country, item => item.language]
);

// Process time-based data
const monthlyData = processTimeData(
  items,
  'created_date',
  {
    startDate: new Date('2024-01-01'),
    includeCumulative: true
  }
);
```

#### API

##### useDataProcessing(options)

Creates a data processing instance with the specified options.

**Parameters:**
- `options`: Configuration options for data processing
  - `filterMissingValues`: Whether to filter out items with missing values (default: true)
  - `requiredFields`: Fields to check for missing values (default: [])
  - `filterFn`: Custom filter function to apply to items
  - `calculatePercentages`: Whether to calculate percentages (default: true)
  - `sortByCount`: Whether to sort results by count (default: true)
  - `sortDescending`: Whether to sort in descending order (default: true)

**Returns:**
- `filterItems(items)`: Filters items based on the provided options
- `groupAndCount(items, keyFn, totalItems?)`: Groups items by a key and counts them
- `groupHierarchically(items, keyFns, totalItems?)`: Groups items by multiple keys hierarchically
- `processTimeData(items, dateField, options?)`: Processes time-based data with monthly aggregation

### useLegend

The `useLegend` hook provides a standardized way to create and manage legends for visualizations, with support for both HTML DOM-based and D3 SVG-based legends.

#### Usage

```typescript
import { useLegend } from '../hooks/useLegend';

// For HTML/DOM-based legend
const { render, update, updateVisibility, cleanup } = useLegend({
  container: legendContainer,
  title: 'Languages',
  titleTranslationKey: 'viz.languages',
  items: languageCounts.map(d => ({
    key: d.language,
    color: colorScale(d.language),
    value: d.count,
    visible: true
  })),
  type: 'html',
  maxItems: 8,
  translateKeys: {
    itemPrefix: 'lang.',
    othersLabel: 'viz.others'
  },
  valueFormatter: (value) => formatNumber(value)
});

// For D3 SVG-based legend
const { render, update, updateVisibility, cleanup } = useLegend({
  container: svg,
  titleTranslationKey: 'viz.types',
  items: types.map(type => ({
    key: type,
    color: colorScale(type),
    visible: typeVisibility.find(t => t.type === type)?.visible || true
  })),
  type: 'svg',
  position: 'bottom',
  orientation: 'horizontal',
  interactive: true,
  translateKeys: {
    itemPrefix: 'type.'
  },
  onItemClick: (item, index) => {
    // Toggle visibility
    updateVisibility(item.key, !(item.visible === true));
    // Update chart
    updateVisualization();
  }
});

// For line chart legend
const { render, update, cleanup } = useLegend({
  container: svg,
  items: [
    {
      key: 'monthlyAdditions',
      label: t('viz.monthly_additions'),
      color: 'var(--color-primary)',
      customProperties: { marker: true }
    },
    {
      key: 'totalItems',
      label: t('viz.total_items'),
      color: 'var(--color-secondary)',
      customProperties: { dashArray: '4 2' }
    }
  ],
  type: 'svg',
  position: 'right',
  customProperties: {
    lineChart: true
  }
});

// Make sure to call render
render();

// Cleanup when component is destroyed
onDestroy(() => {
  cleanup();
});
```

#### API

##### useLegend(options)

Creates a legend with the specified options.

**Parameters:**
- `options`: Configuration options for the legend
  - `container`: The container element or D3 selection to append the legend to
  - `title`: The title text for the legend (optional)
  - `titleTranslationKey`: Translation key for the legend title (optional)
  - `items`: Array of legend items to display
  - `type`: Type of legend to create ('html' or 'svg', default: 'html')
  - `orientation`: Legend layout ('horizontal', 'vertical', or 'grid', default: 'vertical')
  - `position`: Position of the legend ('top', 'right', 'bottom', 'left', or 'custom', default: 'right')
  - `customPosition`: Custom position for the legend ({x, y}, used when position is 'custom')
  - `maxItems`: Maximum number of items to show before grouping as "Others" (default: 10)
  - `showValues`: Whether to show values alongside items (default: true)
  - `className`: Additional CSS class name to add to the legend
  - `valueFormatter`: Function to format values (default: value.toLocaleString())
  - `translateKeys`: Translation key prefixes and suffixes
    - `itemPrefix`: Prefix for item key translations (e.g., "lang." or "type.")
    - `othersLabel`: Translation key for "Others" label (default: 'viz.others')
    - `countLabel`: Translation key for count label (default: 'viz.items')
  - `responsive`: Whether the legend should be responsive (default: true)
  - `breakpoint`: Mobile breakpoint in pixels (default: 768)
  - `interactive`: Whether the legend items can be clicked (default: false)
  - `onItemClick`: Callback for when a legend item is clicked (item, index) => void
  - `customProperties`: Additional custom properties for specialized legends
    - `lineChart`: Whether this is a line chart legend

**Returns:**
- `render()`: Renders the legend
- `update(newItems)`: Updates the legend with new items
- `updateVisibility(key, visible)`: Updates the visibility of a specific item
- `getLegendElement()`: Returns the legend DOM element or D3 selection
- `cleanup()`: Cleans up the legend (removes event listeners, etc.)

## Planned Hooks

Future hooks to be implemented:

1. `useAxis`: Create and manage D3.js axes
2. `useZoom`: Handle zoom behavior in visualizations 