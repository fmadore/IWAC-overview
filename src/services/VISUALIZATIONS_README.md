# Visualization Services

This document provides an overview of all visualization services in the application, explaining how they work together and how to create new visualizations.

## Core Visualization Services

The application includes the following core visualization services:

1. **[D3 Service](./README.md)** - Base service providing common D3.js utilities and functions
2. **[Bar Chart Service](./BARCHART_README.md)** - Creates and manages bar charts
3. **[Treemap Service](./TREEMAP_README.md)** - Creates and manages treemap visualizations
4. **[Timeline Chart Service](./TIMELINE_README.md)** - Creates and manages timeline visualizations

These services are designed to work together, with the D3 Service providing core functionality that the specialized chart services build upon.

## Service Relationships

```
┌───────────────┐
│   D3 Service  │
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────┐
│                                       │
│  ┌─────────────┐ ┌──────────────┐     │
│  │  Bar Chart  │ │   Treemap    │     │
│  │   Service   │ │   Service    │     │
│  └─────────────┘ └──────────────┘     │
│                                       │
│  ┌─────────────┐                      │
│  │  Timeline   │                      │
│  │   Service   │                      │
│  └─────────────┘                      │
│                                       │
└───────────────────────────────────────┘
```

## Existing Visualization Components

The application includes the following visualization components built using these services:

1. **Index Distribution** - Uses the Bar Chart Service to show how index items are distributed across categories
2. **Language Distribution** - Uses the D3 Service directly to create a pie chart showing language distribution
3. **Timeline Distribution** - Uses the Timeline Chart Service to show monthly additions and cumulative totals
4. **Type Distribution** - Uses the D3 Service to create a stacked bar chart showing item types by year
5. **Word Distribution** - Uses the Treemap Service to show word count distribution by country and item set

## When to Use Each Service

- **D3 Service**: Use for low-level D3.js operations and when creating custom visualizations that don't fit into the other service categories
- **Bar Chart Service**: Use for any vertical or horizontal bar charts, including grouped and stacked variations
- **Treemap Service**: Use for hierarchical data visualization with nested rectangles
- **Timeline Service**: Use for time-series data showing changes over time

## Data Transformation Utilities

### BarChartUtils

The Bar Chart service includes a set of utility functions to help with data transformation and preparation. These utilities make it easier to format your data for use with the bar chart service.

```typescript
import { BarChartUtils, type BarData } from '../../services/barChart';
```

#### mapData

Transforms arbitrary data into the standard BarData format expected by the bar chart service.

```typescript
const rawData = [
  { category: 'A', count: 10, otherField: 'info' },
  { category: 'B', count: 20, otherField: 'info' }
];

// Convert to BarData format
const barData = BarChartUtils.mapData(rawData, 'category', 'count');
// Result:
// [
//   { key: 'A', value: 10, otherField: 'info' },
//   { key: 'B', value: 20, otherField: 'info' }
// ]
```

With original key preservation:

```typescript
const translatedData = [
  { originalName: 'Category A', translatedName: 'Catégorie A', count: 10 },
  { originalName: 'Category B', translatedName: 'Catégorie B', count: 20 }
];

// Convert to BarData with original key preserved
const barData = BarChartUtils.mapData(
  translatedData, 
  'translatedName', 
  'count', 
  'originalName'
);
// Result:
// [
//   { key: 'Catégorie A', value: 10, originalKey: 'Category A', ... },
//   { key: 'Catégorie B', value: 20, originalKey: 'Category B', ... }
// ]
```

#### calculatePercentages

Adds percentage values to each data item based on their proportion of the total value.

```typescript
const barData = [
  { key: 'A', value: 30 },
  { key: 'B', value: 70 }
];

// Add percentage field to each item
const dataWithPercentages = BarChartUtils.calculatePercentages(barData);
// Result:
// [
//   { key: 'A', value: 30, percentage: 30 },
//   { key: 'B', value: 70, percentage: 70 }
// ]
```

#### sortByValue

Sorts bar data by their values in ascending or descending order.

```typescript
const barData = [
  { key: 'A', value: 10 },
  { key: 'C', value: 30 },
  { key: 'B', value: 20 }
];

// Sort by value in descending order
const sortedDesc = BarChartUtils.sortByValue(barData, true);
// Result: [{ key: 'C', value: 30 }, { key: 'B', value: 20 }, { key: 'A', value: 10 }]

// Sort by value in ascending order
const sortedAsc = BarChartUtils.sortByValue(barData, false);
// Result: [{ key: 'A', value: 10 }, { key: 'B', value: 20 }, { key: 'C', value: 30 }]
```

#### Combining Utilities

These utilities can be chained together for complete data transformation:

```typescript
function prepareChartData(rawData) {
  // 1. Map raw data to standard format
  const barData = BarChartUtils.mapData(rawData, 'name', 'count');
  
  // 2. Calculate percentages
  const dataWithPercentages = BarChartUtils.calculatePercentages(barData);
  
  // 3. Sort by value (descending)
  const sortedData = BarChartUtils.sortByValue(dataWithPercentages, true);
  
  // 4. Return the transformed data
  return sortedData;
}
```

## Pie Charts

While there is no dedicated pie chart service yet, you can create pie charts using the D3 Service directly. Here's an example approach:

```typescript
import { D3Service } from '../../services/d3Service';
import * as d3 from 'd3';

// Inside your component's rendering function
function createPieChart(data, container) {
  // Create SVG with proper margins
  const { svg, chart, chartWidth, chartHeight } = D3Service.createSVG({
    container,
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  });
  
  // Compute the position of each group on the pie
  const pie = d3.pie<any>()
    .value(d => d.value)
    .sort(null); // Do not sort to maintain data order
  
  const pieData = pie(data);
  
  // Shape helper to build arcs
  const radius = Math.min(chartWidth, chartHeight) / 2;
  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);
  
  // For label positioning
  const labelArc = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius * 0.6);
  
  // Create color scale
  const color = D3Service.createColorScale(data.map(d => d.key));
  
  // Create pie chart group
  const pieGroup = chart.append('g')
    .attr('transform', `translate(${chartWidth / 2}, ${chartHeight / 2})`);
  
  // Create the arcs
  pieGroup.selectAll('path')
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', arc as any)
    .attr('fill', d => color(d.data.key))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseenter', (event, d) => {
      // Handle tooltip display
    })
    .on('mouseleave', () => {
      // Hide tooltip
    });
  
  // Add labels
  pieGroup.selectAll('text')
    .data(pieData)
    .enter()
    .append('text')
    .attr('transform', d => `translate(${labelArc.centroid(d as any)})`)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => d.data.key)
    .attr('font-size', 'var(--font-size-xs)')
    .attr('fill', 'var(--color-text-primary)');
  
  // Create legend using D3Service
  D3Service.createLegend(svg, data.map(d => ({
    key: d.key,
    color: color(d.key)
  })), {
    position: { x: 10, y: chartHeight + 10 },
    orientation: 'horizontal'
  });
  
  return { svg, chart, pieGroup };
}
```

A dedicated PieChart service is planned for future development to standardize this functionality.

## Creating New Visualizations

To create a new visualization in the application:

### 1. Determine the Right Service

First, determine which existing service best fits your needs:

- Need to visualize hierarchical data? Use the Treemap Service
- Need to show categorical data comparisons? Use the Bar Chart Service
- Need to visualize time-series data? Use the Timeline Chart Service
- Need something custom? Use the D3 Service directly

### 2. Import the Appropriate Service

```typescript
// For bar charts
import { createBarChart, type BarData } from '../../services/barChart';

// For treemaps
import TreemapService, { type TreemapNode } from '../../services/treemap';

// For timelines
import { TimelineChart, type MonthlyData } from '../../services/timelineChart';

// For custom visualizations using D3 directly
import { D3Service } from '../../services/d3Service';
```

### 3. Prepare Your Data

Transform your raw data into the format expected by the service:

```typescript
// For bar charts
const barData: BarData[] = rawData.map(item => ({
  key: item.category,
  value: item.count
}));

// For treemaps
const treemapData: TreemapNode = {
  name: 'Root',
  children: categories.map(category => ({
    name: category.name,
    children: category.items.map(item => ({
      name: item.name,
      value: item.value
    }))
  }))
};

// For timelines
const timelineData: MonthlyData[] = monthlyGroups.map(group => ({
  date: new Date(group.year, group.month - 1, 1),
  month: `${group.year}-${group.month.toString().padStart(2, '0')}`,
  monthFormatted: new Date(group.year, group.month - 1, 1)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  count: group.count,
  total: group.runningTotal,
  percentage: group.percentage
}));
```

### 4. Create the Visualization

Use the appropriate service to create your visualization:

```typescript
// For bar charts
const chart = createBarChart({
  container: chartContainer,
  data: barData,
  responsive: true,
  // Additional options...
});

// For treemaps
TreemapService.createTreemap(treemapData, {
  container: treemapContainer,
  tooltipCallback: handleTooltip,
  zoomCallback: handleZoom,
  // Additional options...
});

// For timelines
const timeline = new TimelineChart({
  container: timelineContainer,
  width: containerWidth,
  height: containerHeight,
  // Additional options...
});
timeline.setTooltipCallbacks({ showTooltip, hideTooltip });
timeline.render(timelineData);
```

### 5. Handle Updates and Cleanup

Make sure to update your visualization when data changes and clean up resources when components are destroyed:

```typescript
// For bar charts
function updateChart(newData) {
  chart.update(newData);
}

function cleanup() {
  chart.destroy();
}

// For treemaps
function updateTreemap(newData) {
  TreemapService.createTreemap(newData, options);
}

// For timelines
function updateTimeline(newData) {
  timeline.render(newData);
}
```

## Creating New Visualization Services

If you need to create a new type of visualization service:

1. Start by leveraging the D3Service for common operations
2. Follow the pattern established by existing services:
   - Use TypeScript interfaces to define data structures and options
   - Provide a clean, reusable API
   - Include responsive handling
   - Implement proper cleanup methods
   - Support event callbacks for interaction
   - Use consistent styling variables
3. Document your service with a README.md file following the established format

## Best Practices

When working with visualization services:

1. **Consistent styling**: Use CSS variables for theming
2. **Error handling**: Always handle empty data and edge cases
3. **Responsive design**: Ensure visualizations adapt to container size
4. **Accessibility**: Include ARIA attributes and keyboard navigation
5. **Performance**: Optimize visualizations for large datasets
6. **Animation**: Use smooth transitions but be mindful of performance
7. **Documentation**: Document your visualization's API and options

## Roadmap

Planned improvements to visualization services:

1. **Pie Chart Service**: Dedicated service for creating pie and donut charts
2. **Network Graph Service**: For visualizing interconnected data
3. **Map Service**: For geographic visualizations
4. **Improved animation options**: More control over transitions
5. **Legend standardization**: Consistent legend integration across all services 