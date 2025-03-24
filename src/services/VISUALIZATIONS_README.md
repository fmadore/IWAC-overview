# Visualization Services

This document provides an overview of all visualization services in the application, explaining how they work together and how to create new visualizations.

## Core Visualization Services

The application includes the following core visualization services:

1. **[D3 Service](./README.md)** - Base service providing common D3.js utilities and functions
2. **[Bar Chart Service](./BARCHART_README.md)** - Creates and manages bar charts
3. **[Treemap Service](./TREEMAP_README.md)** - Creates and manages treemap visualizations
4. **[Timeline Chart Service](./TIMELINE_README.md)** - Creates and manages timeline visualizations
5. **[Pie Chart Service](./PIECHART_README.md)** - Creates and manages pie and donut charts

These services are designed to work together, with the D3 Service providing core functionality that the specialized chart services build upon.

## Service Relationships

```
┌───────────────┐
│   D3 Service  │
└───────┬───────┘
        │
        ▼
┌────────────────────────────────────────────┐
│                                            │
│  ┌─────────────┐ ┌──────────────┐          │
│  │  Bar Chart  │ │   Treemap    │          │
│  │   Service   │ │   Service    │          │
│  └─────────────┘ └──────────────┘          │
│                                            │
│  ┌─────────────┐ ┌──────────────┐          │
│  │  Timeline   │ │   Pie Chart  │          │
│  │   Service   │ │   Service    │          │
│  └─────────────┘ └──────────────┘          │
│                                            │
└────────────────────────────────────────────┘
```

## Existing Visualization Components

The application includes the following visualization components built using these services:

1. **Index Distribution** - Uses the Bar Chart Service to show how index items are distributed across categories
2. **Language Distribution** - Uses the Pie Chart Service to create a pie or donut chart showing language distribution
3. **Timeline Distribution** - Uses the Timeline Chart Service to show monthly additions and cumulative totals
4. **Type Distribution** - Uses the D3 Service to create a stacked bar chart showing item types by year
5. **Word Distribution** - Uses the Treemap Service to show word count distribution by country and item set

## When to Use Each Service

- **D3 Service**: Use for low-level D3.js operations and when creating custom visualizations that don't fit into the other service categories
- **Bar Chart Service**: Use for any vertical or horizontal bar charts, including grouped and stacked variations
- **Treemap Service**: Use for hierarchical data visualization with nested rectangles
- **Timeline Service**: Use for time-series data showing changes over time
- **Pie Chart Service**: Use for showing proportions of a whole or comparing parts of a dataset

## Data Transformation Utilities

### BarChartUtils

The Bar Chart service includes a set of utility functions to help with data transformation and preparation. These utilities make it easier to format your data for use with the bar chart service.

```typescript
import { BarChartUtils, type BarData } from '../../services/barChart';
```

#### mapData

Transforms arbitrary data into the standard BarData format expected by the bar chart service.

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

### PieChartUtils

The Pie Chart service also provides utility functions for data transformation and preparation:

```typescript
import { PieChartUtils, type PieChartDataItem } from '../../services/pieChart';
```

#### mapData

Transforms arbitrary data into the standard PieChartDataItem format.

```typescript
function prepareChartData(rawData) {
  // 1. Map raw data to standard format
  const pieData = PieChartUtils.mapData(rawData, 'language', 'count');
  
  // 2. Calculate percentages
  const dataWithPercentages = PieChartUtils.calculatePercentages(pieData);
  
  // 3. Sort by value (descending)
  const sortedData = PieChartUtils.sortByValue(dataWithPercentages, true);
  
  // 4. Group small segments for better readability
  const groupedData = PieChartUtils.groupSmallSegments(sortedData, 3);
  
  // 5. Return the transformed data
  return groupedData;
}
```

## Creating New Visualizations

To create a new visualization in the application:

### 1. Determine the Right Service

First, determine which existing service best fits your needs:

- Need to visualize hierarchical data? Use the Treemap Service
- Need to show categorical data comparisons? Use the Bar Chart Service
- Need to visualize time-series data? Use the Timeline Chart Service
- Need to show proportional parts of a whole? Use the Pie Chart Service
- Need something custom? Use the D3 Service directly

### 2. Import the Appropriate Service

```typescript
// For bar charts
import { createBarChart, type BarData } from '../../services/barChart';

// For treemaps
import TreemapService, { type TreemapNode } from '../../services/treemap';

// For timelines
import { TimelineChart, type MonthlyData } from '../../services/timelineChart';

// For pie/donut charts
import { createPieChart, createDonutChart, type PieChartDataItem } from '../../services/pieChart';

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

// For pie charts
const pieData: PieChartDataItem[] = rawData.map(item => ({
  key: item.language,
  value: item.count,
  percentage: item.percentage
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

// For pie charts
const pieChart = createPieChart(pieData, {
  container: pieContainer,
  innerRadius: 0, // 0 for pie chart
  showLegend: true,
  // Additional options...
});

// For donut charts
const donutChart = createDonutChart(pieData, {
  container: donutContainer,
  innerRadius: 0.6, // Controls the size of the hole (0-1)
  showLegend: true,
  // Additional options...
});
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

// For pie/donut charts
function updatePieChart(newData) {
  pieChart.update(newData);
}

function cleanup() {
  pieChart.destroy();
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

1. **Network Graph Service**: For visualizing interconnected data
2. **Map Service**: For geographic visualizations
3. **Improved animation options**: More control over transitions
4. **Legend standardization**: Consistent legend integration across all services 
5. **Enhanced interactivity**: Standardized approach to user interactions 