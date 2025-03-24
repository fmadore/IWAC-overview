# Pie Chart Service

The Pie Chart service provides a standardized way to create and manage pie and donut charts in the application. It abstracts the D3.js implementation details to provide a simpler, more consistent API.

## Features

- Create both pie charts and donut charts with a consistent API
- Responsive design with proper resizing
- Interactive hover effects with customizable tooltips
- Animated transitions when data updates
- Support for legends
- Optional segment labels
- Customizable color schemes
- Data utilities for transforming, sorting, and grouping data

## Basic Usage

```typescript
import { createPieChart, createDonutChart, PieChartUtils, type PieChartDataItem } from '../../services/pieChart';

// Inside your component
function renderChart() {
  // Prepare data in the format expected by the pie chart service
  const pieData: PieChartDataItem[] = [
    { key: 'Category A', value: 30 },
    { key: 'Category B', value: 25 },
    { key: 'Category C', value: 15 },
    { key: 'Category D', value: 10 },
    { key: 'Category E', value: 20 }
  ];
  
  // Create a pie chart
  const chart = createPieChart(pieData, {
    container: chartContainer,
    width: 500,
    height: 400,
    responsive: true,
    showLegend: true,
    legendPosition: 'right'
  });
  
  // Or create a donut chart
  const donutChart = createDonutChart(pieData, {
    container: donutContainer,
    width: 500,
    height: 400,
    responsive: true,
    innerRadius: 0.6, // Controls the size of the hole (0-1)
    showLegend: true
  });
  
  // Update data later
  function updateChart(newData) {
    chart.update(newData);
  }
  
  // Clean up when component is destroyed
  function cleanup() {
    chart.destroy();
  }
}
```

## Data Format

The pie chart service expects data in the following format:

```typescript
interface PieChartDataItem {
  key: string;    // Category name
  value: number;  // Numeric value
  percentage?: number; // Optional percentage (calculated automatically if not provided)
}
```

## Configuration Options

The pie chart service supports the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | HTMLElement | *required* | The DOM element to render the chart in |
| `width` | number | container width | Width of the chart |
| `height` | number | container height | Height of the chart |
| `margin` | object | `{ top: 20, right: 20, bottom: 20, left: 20 }` | Margins around the chart |
| `innerRadius` | number | 0 (pie) / 0.5 (donut) | Inner radius ratio (0-1), where 0 is a pie chart |
| `responsive` | boolean | true | Whether the chart should resize with its container |
| `colorScheme` | string[] or function | d3.schemeCategory10 | Color scheme for segments |
| `hoverEffectEnabled` | boolean | true | Whether segments enlarge on hover |
| `hoverRadiusIncrease` | number | 10 | How much segments expand on hover |
| `showLegend` | boolean | true | Whether to show a legend |
| `legendPosition` | 'right' \| 'bottom' | 'right' | Where to position the legend |
| `showLabels` | boolean | false | Whether to show labels on segments |
| `labelMinAngle` | number | 15 | Minimum angle (degrees) for a segment to show a label |
| `sortValues` | boolean | false | Whether to sort segments by value |
| `sortDescending` | boolean | true | Sort order (descending or ascending) |
| `onMouseEnter` | function | undefined | Callback when mouse enters a segment |
| `onMouseMove` | function | undefined | Callback when mouse moves over a segment |
| `onMouseLeave` | function | undefined | Callback when mouse leaves a segment |
| `animationDuration` | number | 500 | Duration of animations in milliseconds |

## Utility Functions

The service includes utility functions for working with pie chart data:

### mapData

Transforms an array of objects into the PieChartDataItem format.

```typescript
const rawData = [
  { name: 'Category A', count: 30 },
  { name: 'Category B', count: 20 }
];

const pieData = PieChartUtils.mapData(rawData, 'name', 'count');
```

### calculatePercentages

Calculates percentages for each item based on the total.

```typescript
const dataWithPercentages = PieChartUtils.calculatePercentages(pieData);
```

### sortByValue

Sorts data by value in ascending or descending order.

```typescript
const sortedData = PieChartUtils.sortByValue(pieData, true); // true for descending
```

### groupSmallSegments

Groups small segments into an "Other" category.

```typescript
const groupedData = PieChartUtils.groupSmallSegments(pieData, 5); // Group segments < 5%
```

## Examples

### Creating a Pie Chart with Tooltips

```typescript
import { createPieChart, PieChartUtils } from '../../services/pieChart';

// Prepare data
const data = PieChartUtils.mapData(rawData, 'category', 'value');
const dataWithPercentages = PieChartUtils.calculatePercentages(data);

// Create chart with tooltips
const chart = createPieChart(dataWithPercentages, {
  container: chartContainer,
  responsive: true,
  onMouseEnter: (event, d) => {
    const tooltip = d3.select('#tooltip');
    tooltip
      .style('opacity', 1)
      .html(`
        <strong>${d.data.key}</strong><br>
        Value: ${d.data.value}<br>
        Percentage: ${d.data.percentage.toFixed(1)}%
      `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 25}px`);
  },
  onMouseLeave: () => {
    d3.select('#tooltip').style('opacity', 0);
  }
});
```

### Creating a Donut Chart with Custom Colors

```typescript
import { createDonutChart } from '../../services/pieChart';
import * as d3 from 'd3';

const donutChart = createDonutChart(data, {
  container: donutContainer,
  innerRadius: 0.6, // Larger hole
  colorScheme: d3.schemeSet3, // Different color scheme
  showLabels: true, // Show labels on segments
  labelMinAngle: 20 // Only show labels on segments with angle >= 20 degrees
});
```

## Responsive Design

The pie chart service automatically handles responsiveness with the `responsive` option (enabled by default). This ensures the chart resizes properly when its container changes size.

## Donut vs Pie Charts

The service supports both pie charts and donut charts:

- **Pie Charts** (innerRadius = 0): Good for showing part-to-whole relationships, best when you have 5-7 categories
- **Donut Charts** (innerRadius > 0): Functionally the same as pie charts, but:
  - Reduced chart junk (less ink)
  - Space in the center can be used for additional information
  - Generally considered more aesthetically pleasing

Use `createPieChart()` with innerRadius = 0 for pie charts, or `createDonutChart()` for donut charts (which sets innerRadius = 0.5 by default). 