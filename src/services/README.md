# D3 Service

The D3 service provides a standardized API for creating and managing D3.js visualizations across the application. It abstracts common D3 operations to reduce code duplication, improve consistency, and make visualization components more maintainable.

## Purpose

This service addresses the consolidation of D3.js integration as specified in the project roadmap. It separates D3.js rendering logic from component business logic by providing reusable functions for common visualization tasks.

## Features

- Standardized SVG creation with proper margins and responsive handling
- Unified scale creation for different data types
- Consistent axis creation and rendering
- Helper functions for common visualization elements (legends, grids, titles)
- Standardized color scale generation
- Responsive behavior management
- Consistent error handling for "no data" scenarios
- Standardized tooltip container creation

## Usage Examples

### Basic Chart Setup

```typescript
import { D3Service } from '../../services/d3Service';
import * as d3 from 'd3';

// Inside your component's rendering function
function createVisualization() {
  if (!container) return;
  
  // Create SVG with proper margins
  const { svg, chart, chartWidth, chartHeight } = D3Service.createSVG({
    container,
    margin: { top: 20, right: 30, bottom: 40, left: 50 }
  });
  
  // Create scales
  const xScale = D3Service.createScale({
    type: 'band',
    domain: data.map(d => d.category),
    range: [0, chartWidth],
    padding: 0.2
  });
  
  const yScale = D3Service.createScale({
    type: 'linear',
    domain: [0, d3.max(data, d => d.value) || 0],
    range: [chartHeight, 0]
  });
  
  // Create and render axes
  const xAxis = D3Service.createAxis({
    type: 'x',
    scale: xScale,
    position: 'bottom'
  });
  
  const yAxis = D3Service.createAxis({
    type: 'y',
    scale: yScale,
    position: 'left',
    ticks: 5
  });
  
  // Render X axis
  chart.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d => D3Service.renderAxis(d, xAxis));
  
  // Render Y axis
  chart.append('g')
    .call(d => D3Service.renderAxis(d, yAxis));
  
  // Add grid
  D3Service.addGrid(chart, {
    width: chartWidth,
    height: chartHeight,
    yScale: yScale
  });
  
  // Render bars
  chart.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.category) as number)
    .attr('y', d => yScale(d.value) as number)
    .attr('width', xScale.bandwidth())
    .attr('height', d => chartHeight - yScale(d.value) as number)
    .attr('fill', 'steelblue');
}
```

### Handling No Data

```typescript
function updateVisualization() {
  if (!container) return;
  
  // Process data based on current filters
  const filteredData = processData();
  
  // Handle no data scenario
  if (filteredData.length === 0) {
    D3Service.handleNoData(container, noDataText);
    return;
  }
  
  // Continue with chart creation
  // ...
}
```

### Creating a Legend

```typescript
// Create legend items
const legendItems = types.map(type => ({
  key: type,
  color: colorScale(type)
}));

// Add legend to chart
D3Service.createLegend(svg, legendItems, {
  position: { x: 10, y: chartHeight + margin.top + 20 },
  orientation: 'horizontal'
});
```

### Creating a Tooltip

```typescript
// Create tooltip container
const tooltip = D3Service.createTooltipContainer('chart-tooltip', {
  background: 'rgba(0, 0, 0, 0.8)',
  padding: '10px 15px'
});

// Use tooltip in event handlers
chart.selectAll('.bar')
  .on('mouseover', (event, d) => {
    tooltip
      .html(`<strong>${d.category}</strong><br>Value: ${d.value}`)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 25}px`)
      .transition()
      .duration(200)
      .style('opacity', 0.9);
  })
  .on('mouseout', () => {
    tooltip
      .transition()
      .duration(500)
      .style('opacity', 0);
  });
```

## Migrating Existing Components

To migrate existing visualization components to use the D3 service:

1. Import the D3 service at the top of your component
2. Replace direct D3 SVG creation with `D3Service.createSVG`
3. Replace scale creation with `D3Service.createScale`
4. Replace axis creation with `D3Service.createAxis` and `D3Service.renderAxis`
5. Replace color scale creation with `D3Service.createColorScale`
6. Use `D3Service.handleNoData` for consistent no-data handling
7. Use other utility functions as needed

## Next Steps

After implementing the D3 service, the next steps in consolidating D3.js integration are:

1. Extract visualization-specific rendering to separate modules (countryChart.ts, timelineChart.ts, etc.)
2. Implement a consistent data transformation approach
3. Update visualization components to use the new abstraction 