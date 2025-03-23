# Bar Chart Service

The Bar Chart service provides a standardized way to create and manage bar charts across the application. It leverages D3.js and offers a flexible API for creating customizable, interactive, and responsive bar charts.

## Features

- Consistent, reusable API for creating bar charts
- Responsive design with mobile support
- Interactive features with customizable event handlers
- Smooth animations for data updates
- Flexible styling options
- Utility functions for data transformation
- Proper cleanup to prevent memory leaks
- Integration with existing tooltip system
- Support for both functional and class-based usage patterns

## Usage Examples

### Basic Bar Chart

```typescript
import { createBarChart, type BarData } from '../../services/barChart';

// Prepare data
const barData: BarData[] = [
  { key: 'Category A', value: 20 },
  { key: 'Category B', value: 35 },
  { key: 'Category C', value: 15 },
  { key: 'Category D', value: 40 }
];

// Create the chart
const chart = createBarChart({
  container: document.getElementById('chart-container'),
  data: barData,
  className: 'custom-bar-chart'
});
```

### Responsive Chart with Tooltips

```typescript
import { createBarChart, type BarData } from '../../services/barChart';
import { useTooltip } from '../../hooks/useTooltip';

// Set up tooltip hook
const { showTooltip, hideTooltip } = useTooltip();

// Create chart with events
const chart = createBarChart({
  container: chartContainer,
  data: barData,
  responsive: true,
  onBarMouseEnter: (event, d) => {
    const content = `<strong>${d.key}</strong><br>Value: ${d.value}`;
    showTooltip(event, content);
  },
  onBarMouseLeave: () => {
    hideTooltip();
  }
});
```

### Using Data Transformation Utils

```typescript
import { createBarChart, BarChartUtils } from '../../services/barChart';

// Raw data
const rawData = [
  { name: 'Category A', count: 20 },
  { name: 'Category B', count: 35 },
  { name: 'Category C', count: 15 }
];

// Transform data to bar chart format
const barData = BarChartUtils.mapData(rawData, 'name', 'count');

// Calculate percentages
const dataWithPercentages = BarChartUtils.calculatePercentages(barData);

// Sort by value descending
const sortedData = BarChartUtils.sortByValue(dataWithPercentages, true);

// Create chart
const chart = createBarChart({
  container: chartContainer,
  data: sortedData
});
```

### Class-Based Usage

```typescript
import { BarChart, type BarData } from '../../services/barChart';

// Initialize chart
const barChart = new BarChart({
  container: chartContainer,
  data: barData,
  xAxisLabel: 'Categories',
  yAxisLabel: 'Values'
});

// Render chart
barChart.render();

// Later, update with new data
const newData: BarData[] = [
  // ... new data items
];
barChart.update(newData);

// Clean up when component is destroyed
barChart.destroy();
```

## API Reference

### BarData Interface

```typescript
interface BarData {
  key: string;           // The label for the bar
  value: number;         // The numeric value of the bar
  percentage?: number;   // Optional percentage (relative to total)
  originalKey?: string;  // Optional original key for translation scenarios
  [key: string]: any;    // Any additional custom properties
}
```

### BarChartOptions Interface

The options object supports the following properties:

#### Container and Dimensions
- `container`: HTMLElement - The container element for the chart (required)
- `width`: number - Chart width (default: container width)
- `height`: number - Chart height (default: container height)

#### Data and Keys
- `data`: BarData[] - Array of bar data items (required)
- `keyField`: string - Property name for bar labels (default: 'key')
- `valueField`: string - Property name for bar values (default: 'value')

#### Styling
- `className`: string - CSS class for the chart (default: 'bar-chart')
- `barColors`: string[] | d3.ScaleOrdinal - Colors for bars
- `barPadding`: number - Padding between bars (default: 0.2)
- `barCornerRadius`: number - Corner radius for bars (default: 3)
- `barStroke`: string - Border color for bars (default: 'white')
- `barStrokeWidth`: number - Border width for bars (default: 1)

#### Margins and Responsiveness
- `margin`: { top, right, bottom, left } - Chart margins
- `responsive`: boolean - Whether chart should be responsive (default: true)
- `isMobile`: boolean - Whether to use mobile-specific settings

#### Axes
- `showXAxis`: boolean - Whether to show x-axis (default: true)
- `showYAxis`: boolean - Whether to show y-axis (default: true)
- `xAxisLabel`: string - Label for x-axis
- `yAxisLabel`: string - Label for y-axis
- `xAxisRotation`: number - Rotation angle for x-axis labels (default: -45)
- `xAxisTickFormat`: (d: any) => string - Format function for x-axis ticks
- `yAxisTickFormat`: (d: any) => string - Format function for y-axis ticks
- `xAxisTicks`: number - Number of ticks on x-axis
- `yAxisTicks`: number - Number of ticks on y-axis (default: 5)

#### Labels
- `showValueLabels`: boolean - Whether to show value labels on bars (default: true)
- `valueLabelMinHeight`: number - Minimum bar height to show label (default: 15)
- `valueFormatter`: (value: number) => string - Format function for value labels

#### Interaction
- `enableInteraction`: boolean - Whether to enable interactions (default: true)
- `highlightColor`: string - Color for highlighted bars on hover

#### Events
- `onBarMouseEnter`: (event, data, element) => void - Handler for mouseenter event
- `onBarMouseMove`: (event, data, element) => void - Handler for mousemove event
- `onBarMouseLeave`: (event, data, element) => void - Handler for mouseleave event
- `onBarClick`: (event, data, element) => void - Handler for click event

### BarChartResult Interface

The returned object from `createBarChart` includes:

- `svg`: D3 selection for the SVG element
- `chart`: D3 selection for the chart group 
- `xScale`: D3 scale for the x-axis
- `yScale`: D3 scale for the y-axis
- `chartWidth`: Width of the chart area (excluding margins)
- `chartHeight`: Height of the chart area (excluding margins)
- `update(newData)`: Function to update the chart with new data
- `destroy()`: Function to clean up the chart

### BarChartUtils

The `BarChartUtils` object provides utility functions for data transformation:

- `mapData(data, keyField, valueField, originalKeyField?)`: Maps arbitrary data to the BarData format
- `calculatePercentages(data)`: Calculates percentages for each bar based on total
- `sortByValue(data, descending?)`: Sorts bar data by value

### BarChart Class

The `BarChart` class provides an object-oriented interface for the bar chart:

- `constructor(options)`: Initialize with chart options
- `render()`: Create and render the chart
- `update(newData)`: Update the chart with new data
- `destroy()`: Clean up the chart
- `getChart()`: Get the underlying chart result object

## Integration with Existing Components

The Bar Chart service integrates seamlessly with other aspects of the application:

1. **With BaseVisualization**: The chart container should be placed within a BaseVisualization component
2. **With Tooltip Hooks**: Event handlers can use the tooltip functions provided by the BaseVisualization component
3. **With Resize Hooks**: Should be used with useD3Resize for responsive handling
4. **With Theme System**: Respects CSS variables for consistent styling

## Customization

The bar chart can be customized in several ways:

1. Through the options object when creating the chart
2. With CSS variables for consistent styling across components
3. By extending the BarChart class for specialized chart types
4. By directly manipulating the returned chart elements for advanced customization

## Roadmap

Planned future enhancements:

1. **Stacked bar charts**: Support for multi-series stacked bars
2. **Horizontal bar charts**: Option for horizontal orientation
3. **Animation options**: More control over transitions
4. **Legend integration**: Built-in legend support
5. **Axis customization**: More control over axis appearance 