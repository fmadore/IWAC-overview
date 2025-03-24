import * as d3 from 'd3';
import { D3Service } from './d3Service';
import { useLegend, type LegendItem } from '../hooks/useLegend';

/**
 * Interface for pie chart data items
 */
export interface PieChartDataItem {
  key: string;
  label?: string;
  value: number;
  percentage?: number;
}

/**
 * Pie chart configuration options
 */
export interface PieChartOptions {
  // Container element to render the chart in
  container: HTMLElement;
  // Chart dimensions
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  // Whether to create a donut chart (inner radius)
  innerRadius?: number;
  // Whether to make the chart responsive
  responsive?: boolean;
  // Chart colors
  colorScheme?: readonly string[] | ((key: string) => string);
  // Tooltip callbacks
  onMouseEnter?: (event: MouseEvent, d: d3.PieArcDatum<PieChartDataItem>) => void;
  onMouseMove?: (event: MouseEvent, d: d3.PieArcDatum<PieChartDataItem>) => void;
  onMouseLeave?: (event: MouseEvent, d: d3.PieArcDatum<PieChartDataItem>) => void;
  // Animation settings
  animationDuration?: number;
  // Hover effect settings
  hoverEffectEnabled?: boolean;
  hoverRadiusIncrease?: number;
  // Legend settings
  showLegend?: boolean;
  legendPosition?: 'right' | 'bottom';
  legendTitle?: string;
  // Labels settings
  showLabels?: boolean;
  labelMinAngle?: number; // Minimum angle (in degrees) to show labels
  // Sorting
  sortValues?: boolean;
  sortDescending?: boolean;
}

/**
 * Result object from createPieChart function
 */
export interface PieChartResult {
  // D3 selections
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  pieGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  // Update functions
  update: (newData: PieChartDataItem[]) => void;
  // Cleanup function
  destroy: () => void;
}

/**
 * Default options for pie charts
 */
const DEFAULT_OPTIONS: Partial<PieChartOptions> = {
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  innerRadius: 0, // 0 for pie chart, > 0 for donut chart
  responsive: true,
  colorScheme: d3.schemeCategory10,
  animationDuration: 500,
  hoverEffectEnabled: true,
  hoverRadiusIncrease: 10,
  showLegend: true,
  legendPosition: 'right',
  showLabels: false,
  labelMinAngle: 15,
  sortValues: false,
  sortDescending: true
};

/**
 * Creates a pie or donut chart
 */
export function createPieChart(
  data: PieChartDataItem[],
  options: PieChartOptions
): PieChartResult {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };
  const {
    container,
    width = container.clientWidth,
    height = container.clientHeight,
    margin = { top: 20, right: 20, bottom: 20, left: 20 },
    innerRadius = 0,
    responsive = true,
    animationDuration = 500,
    hoverEffectEnabled = true,
    hoverRadiusIncrease = 10,
    showLabels = false,
    labelMinAngle = 15,
    sortValues = false,
    sortDescending = true
  } = config;

  // Clear existing SVG if present
  d3.select(container).select('svg').remove();

  // Process data - sort if requested
  let processedData = [...data];
  if (sortValues) {
    processedData.sort((a, b) => {
      return sortDescending 
        ? b.value - a.value 
        : a.value - b.value;
    });
  }

  // Create SVG
  const { svg, chartWidth, chartHeight } = D3Service.createSVG({
    container,
    width,
    height,
    margin,
    responsive
  });

  // Calculate radius - ensure it's not too large for container
  const maxRadius = Math.min(chartWidth, chartHeight) / 2;
  const radius = maxRadius * 0.9; // Slightly smaller to ensure it fits

  // Create pie layout with proper sorting
  const pie = d3.pie<PieChartDataItem>()
    .value(d => d.value);
  
  // Set the sort function based on sortValues
  if (!sortValues) {
    // Pass null for no sorting (preserves input order)
    pie.sort(null);
  }

  // Create arc generators
  const arc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
    .innerRadius(innerRadius * radius) // 0 for pie, > 0 for donut
    .outerRadius(radius);

  // Create hover arc generator for hover effect
  const hoverArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
    .innerRadius(innerRadius * radius)
    .outerRadius(radius + hoverRadiusIncrease);

  // Create label arc generator
  const labelArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7);

  // Create color scale
  let colorFunction: (key: string) => string;
  if (typeof config.colorScheme === 'function') {
    colorFunction = config.colorScheme;
  } else {
    const colorScale = d3.scaleOrdinal<string>()
      .domain(processedData.map(d => d.key))
      .range(config.colorScheme || d3.schemeCategory10);
    colorFunction = (key: string) => colorScale(key);
  }

  // Create chart group element
  const pieGroup = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  // Generate pie data
  const pieData = pie(processedData);

  // Create pie segments
  const segments = pieGroup.selectAll('path')
    .data(pieData)
    .enter()
    .append('path')
    .attr('class', 'pie-segment cursor-pointer')
    .attr('d', arc as any)
    .attr('fill', d => colorFunction(d.data.key))
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  // Add hover effect if enabled
  if (hoverEffectEnabled) {
    segments
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc as any);
        
        if (config.onMouseEnter) {
          config.onMouseEnter(event, d as d3.PieArcDatum<PieChartDataItem>);
        }
      })
      .on('mousemove', function(event, d) {
        if (config.onMouseMove) {
          config.onMouseMove(event, d as d3.PieArcDatum<PieChartDataItem>);
        }
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any);
        
        if (config.onMouseLeave) {
          config.onMouseLeave(event, d as d3.PieArcDatum<PieChartDataItem>);
        }
      });
  }

  // Add labels if enabled
  if (showLabels) {
    pieGroup.selectAll('text')
      .data(pieData)
      .enter()
      .append('text')
      .attr('transform', d => {
        // Only show labels for segments with sufficient angle
        return (d.endAngle - d.startAngle) * (180 / Math.PI) >= labelMinAngle
          ? `translate(${labelArc.centroid(d as any)})`
          : '';
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => d.data.key)
      .style('font-size', '12px')
      .style('fill', 'var(--color-text-primary, #333)')
      .style('opacity', d => 
        (d.endAngle - d.startAngle) * (180 / Math.PI) >= labelMinAngle ? 1 : 0
      );
  }

  // Initialize legend
  let legendInstance: ReturnType<typeof useLegend> | null = null;

  // Add legend if enabled
  if (config.showLegend) {
    // Create legend items from data
    const legendItems: LegendItem[] = processedData.map(d => ({
      key: d.key,
      color: colorFunction(d.key),
      value: d.value,
      percentage: d.percentage
    }));

    // Check if mobile view
    const isMobile = width < 768;
    
    // Calculate available space for the legend
    const legendSpace = isMobile ? 
      { width: chartWidth, height: 100 } : 
      { width: 180, height: chartHeight };
    
    // Adjust chart dimensions to make room for the legend
    if (isMobile) {
      // For mobile, reduce the chart height to make room for the legend at the bottom
      const newRadius = Math.min(chartWidth, chartHeight - legendSpace.height) / 2 * 0.9;
      pieGroup.attr('transform', `translate(${width / 2}, ${(height - legendSpace.height) / 2})`);
    } else if (config.legendPosition === 'right') {
      // For desktop with right legend, shift the chart to the left
      pieGroup.attr('transform', `translate(${(width - legendSpace.width) / 2}, ${height / 2})`);
    }
    
    // Create traditional D3 legend rather than using useLegend
    // This gives more control over styling and ensures consistency
    
    // Create legend group with proper positioning
    const legendX = isMobile ? margin.left : width - legendSpace.width;
    const legendY = isMobile ? height - legendSpace.height : margin.top + 20;
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Add legend title if provided
    if (config.legendTitle) {
      legend.append('text')
        .attr('class', 'legend-title')
        .attr('x', isMobile ? 0 : 0)
        .attr('y', isMobile ? 0 : -5)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', 'var(--color-text-primary, #333)')
        .text(config.legendTitle);
    }
    
    // Create legend items
    const legendItemSize = 15;
    const legendItemSpacing = isMobile ? 20 : 25;
    const legendTextOffset = 5;
    const maxLegendItems = isMobile ? 6 : 12;
    
    // Calculate legend layout
    let legendItemsPerRow = isMobile ? Math.floor(chartWidth / 120) : 1;
    legendItemsPerRow = Math.max(1, legendItemsPerRow);
    
    // Limit number of items to display
    const displayedItems = processedData.slice(0, maxLegendItems);
    
    // Create legend items
    displayedItems.forEach((item, i) => {
      const row = Math.floor(i / legendItemsPerRow);
      const col = i % legendItemsPerRow;
      
      const itemX = isMobile ? col * (chartWidth / legendItemsPerRow) : 0;
      const itemY = (isMobile ? 20 : 0) + row * legendItemSpacing;
      
      const itemGroup = legend.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${itemX}, ${itemY})`);
      
      // Add color rectangle
      itemGroup.append('rect')
        .attr('width', legendItemSize)
        .attr('height', legendItemSize)
        .attr('fill', colorFunction(item.key))
        .attr('stroke', 'var(--color-border, #e2e8f0)')
        .attr('stroke-width', 0.5)
        .attr('rx', 2);
      
      // Get translated key if available (e.g., language names)
      const translatedKey = item.label || item.key;
      
      // Add item label
      itemGroup.append('text')
        .attr('x', legendItemSize + legendTextOffset)
        .attr('y', legendItemSize / 2)
        .attr('dy', '0.35em')
        .attr('fill', 'var(--color-text-primary, #333)')
        .attr('font-size', '12px')
        .attr('font-family', 'var(--font-family-base, sans-serif)')
        .text(translatedKey);
      
      // Add value text if available
      if (item.value !== undefined) {
        const formattedValue = isMobile ? 
          item.value.toLocaleString() : 
          `${item.value.toLocaleString()} (${item.percentage?.toFixed(1)}%)`;
        
        if (isMobile) {
          // For mobile, add value next to the label
          itemGroup.append('text')
            .attr('x', legendItemSize + legendTextOffset + translatedKey.length * 7 + 10)
            .attr('y', legendItemSize / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'start')
            .attr('fill', 'var(--color-text-secondary, #666)')
            .attr('font-size', '11px')
            .attr('font-family', 'var(--font-family-base, sans-serif)')
            .text(`(${item.value.toLocaleString()})`);
        } else {
          // For desktop, add value below the label
          itemGroup.append('text')
            .attr('x', legendItemSize + legendTextOffset)
            .attr('y', legendItemSize / 2 + 14)
            .attr('fill', 'var(--color-text-secondary, #666)')
            .attr('font-size', '11px')
            .attr('font-family', 'var(--font-family-base, sans-serif)')
            .text(formattedValue);
        }
      }
    });
    
    // Add "more" indicator if there are more items than displayed
    if (processedData.length > maxLegendItems) {
      const moreItemsCount = processedData.length - maxLegendItems;
      const row = Math.floor(maxLegendItems / legendItemsPerRow);
      const col = maxLegendItems % legendItemsPerRow;
      
      const itemX = isMobile ? col * (chartWidth / legendItemsPerRow) : 0;
      const itemY = (isMobile ? 20 : 0) + row * legendItemSpacing;
      
      legend.append('text')
        .attr('x', itemX + (isMobile ? 0 : legendItemSize + legendTextOffset))
        .attr('y', itemY + (isMobile ? 0 : legendItemSize / 2))
        .attr('fill', 'var(--color-text-secondary, #666)')
        .attr('font-size', '11px')
        .attr('font-style', 'italic')
        .attr('font-family', 'var(--font-family-base, sans-serif)')
        .text(`+${moreItemsCount} more...`);
    }
  }

  // Update function
  const update = (newData: PieChartDataItem[]) => {
    // Process data
    let updatedData = [...newData];
    if (sortValues) {
      updatedData.sort((a, b) => {
        return sortDescending 
          ? b.value - a.value 
          : a.value - b.value;
      });
    }

    // Update color scale domain if needed
    if (typeof config.colorScheme !== 'function') {
      // Recreate the color function with the updated domain
      const colorScale = d3.scaleOrdinal<string>()
        .domain(updatedData.map(d => d.key))
        .range(config.colorScheme || d3.schemeCategory10);
      colorFunction = (key: string) => colorScale(key);
    }

    // Update pie data
    const updatedPieData = pie(updatedData);

    // Update segments with transition
    const updatedSegments = pieGroup.selectAll<SVGPathElement, d3.PieArcDatum<PieChartDataItem>>('path')
      .data(updatedPieData);

    // Remove old segments
    updatedSegments.exit()
      .transition()
      .duration(animationDuration)
      .attrTween('d', function(this: SVGPathElement, d: any) {
        // Create a properly typed target state
        const datumTyped = d as d3.PieArcDatum<PieChartDataItem>;
        const targetAngle = datumTyped.endAngle;
        const targetState: d3.PieArcDatum<PieChartDataItem> = {
          ...datumTyped,
          startAngle: targetAngle,
          endAngle: targetAngle
        };
        
        const interpolate = d3.interpolate(datumTyped, targetState);
        return function(t) {
          return arc(interpolate(t)) as string;
        };
      })
      .remove();

    // Add new segments
    updatedSegments.enter()
      .append('path')
      .attr('class', 'pie-segment cursor-pointer')
      .attr('fill', d => colorFunction(d.data.key))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('d', arc as any)
      .style('opacity', 0)
      .transition()
      .duration(animationDuration)
      .style('opacity', 1);

    // Update existing segments
    updatedSegments
      .transition()
      .duration(animationDuration)
      .attrTween('d', function(d) {
        const currentArc = this as any;
        const currentData = currentArc.__data__;
        const interpolate = d3.interpolate(currentData, d);
        return function(t) {
          return arc(interpolate(t)) as string;
        };
      })
      .attr('fill', d => colorFunction(d.data.key));

    // Update hover handlers
    if (hoverEffectEnabled) {
      pieGroup.selectAll<SVGPathElement, d3.PieArcDatum<PieChartDataItem>>('path')
        .on('mouseenter', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', hoverArc as any);
          
          if (config.onMouseEnter) {
            config.onMouseEnter(event, d);
          }
        })
        .on('mousemove', function(event, d) {
          if (config.onMouseMove) {
            config.onMouseMove(event, d);
          }
        })
        .on('mouseleave', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arc as any);
          
          if (config.onMouseLeave) {
            config.onMouseLeave(event, d);
          }
        });
    }

    // Update labels if enabled
    if (showLabels) {
      const updatedLabels = pieGroup.selectAll('text')
        .data(updatedPieData);

      // Remove old labels
      updatedLabels.exit().remove();

      // Add new labels
      updatedLabels.enter()
        .append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-primary, #333)')
        .merge(updatedLabels as any)
        .transition()
        .duration(animationDuration)
        .attr('transform', d => {
          return (d.endAngle - d.startAngle) * (180 / Math.PI) >= labelMinAngle
            ? `translate(${labelArc.centroid(d as any)})`
            : '';
        })
        .text(d => d.data.key)
        .style('opacity', d => 
          (d.endAngle - d.startAngle) * (180 / Math.PI) >= labelMinAngle ? 1 : 0
        );
    }

    // Update legend if enabled
    if (config.showLegend) {
      // Remove existing legend
      svg.select('.legend').remove();
      
      // Check if mobile view
      const isMobile = width < 768;
      
      // Calculate available space for the legend
      const legendSpace = isMobile ? 
        { width: chartWidth, height: 100 } : 
        { width: 180, height: chartHeight };
      
      // Adjust chart dimensions to make room for the legend
      if (isMobile) {
        // For mobile, reduce the chart height to make room for the legend at the bottom
        const newRadius = Math.min(chartWidth, chartHeight - legendSpace.height) / 2 * 0.9;
        pieGroup.attr('transform', `translate(${width / 2}, ${(height - legendSpace.height) / 2})`);
      } else if (config.legendPosition === 'right') {
        // For desktop with right legend, shift the chart to the left
        pieGroup.attr('transform', `translate(${(width - legendSpace.width) / 2}, ${height / 2})`);
      }
      
      // Create legend group with proper positioning
      const legendX = isMobile ? margin.left : width - legendSpace.width;
      const legendY = isMobile ? height - legendSpace.height : margin.top + 20;
      
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
      
      // Add legend title if provided
      if (config.legendTitle) {
        legend.append('text')
          .attr('class', 'legend-title')
          .attr('x', isMobile ? 0 : 0)
          .attr('y', isMobile ? 0 : -5)
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('fill', 'var(--color-text-primary, #333)')
          .text(config.legendTitle);
      }
      
      // Create legend items
      const legendItemSize = 15;
      const legendItemSpacing = isMobile ? 20 : 25;
      const legendTextOffset = 5;
      const maxLegendItems = isMobile ? 6 : 12;
      
      // Calculate legend layout
      let legendItemsPerRow = isMobile ? Math.floor(chartWidth / 120) : 1;
      legendItemsPerRow = Math.max(1, legendItemsPerRow);
      
      // Limit number of items to display
      const displayedItems = updatedData.slice(0, maxLegendItems);
      
      // Create legend items
      displayedItems.forEach((item, i) => {
        const row = Math.floor(i / legendItemsPerRow);
        const col = i % legendItemsPerRow;
        
        const itemX = isMobile ? col * (chartWidth / legendItemsPerRow) : 0;
        const itemY = (isMobile ? 20 : 0) + row * legendItemSpacing;
        
        const itemGroup = legend.append('g')
          .attr('class', 'legend-item')
          .attr('transform', `translate(${itemX}, ${itemY})`);
        
        // Add color rectangle
        itemGroup.append('rect')
          .attr('width', legendItemSize)
          .attr('height', legendItemSize)
          .attr('fill', colorFunction(item.key))
          .attr('stroke', 'var(--color-border, #e2e8f0)')
          .attr('stroke-width', 0.5)
          .attr('rx', 2);
        
        // Get translated key if available (e.g., language names)
        const translatedKey = item.label || item.key;
        
        // Add item label
        itemGroup.append('text')
          .attr('x', legendItemSize + legendTextOffset)
          .attr('y', legendItemSize / 2)
          .attr('dy', '0.35em')
          .attr('fill', 'var(--color-text-primary, #333)')
          .attr('font-size', '12px')
          .attr('font-family', 'var(--font-family-base, sans-serif)')
          .text(translatedKey);
        
        // Add value text if available
        if (item.value !== undefined) {
          const formattedValue = isMobile ? 
            item.value.toLocaleString() : 
            `${item.value.toLocaleString()} (${item.percentage?.toFixed(1)}%)`;
          
          if (isMobile) {
            // For mobile, add value next to the label
            itemGroup.append('text')
              .attr('x', legendItemSize + legendTextOffset + translatedKey.length * 7 + 10)
              .attr('y', legendItemSize / 2)
              .attr('dy', '0.35em')
              .attr('text-anchor', 'start')
              .attr('fill', 'var(--color-text-secondary, #666)')
              .attr('font-size', '11px')
              .attr('font-family', 'var(--font-family-base, sans-serif)')
              .text(`(${item.value.toLocaleString()})`);
          } else {
            // For desktop, add value below the label
            itemGroup.append('text')
              .attr('x', legendItemSize + legendTextOffset)
              .attr('y', legendItemSize / 2 + 14)
              .attr('fill', 'var(--color-text-secondary, #666)')
              .attr('font-size', '11px')
              .attr('font-family', 'var(--font-family-base, sans-serif)')
              .text(formattedValue);
          }
        }
      });
      
      // Add "more" indicator if there are more items than displayed
      if (updatedData.length > maxLegendItems) {
        const moreItemsCount = updatedData.length - maxLegendItems;
        const row = Math.floor(maxLegendItems / legendItemsPerRow);
        const col = maxLegendItems % legendItemsPerRow;
        
        const itemX = isMobile ? col * (chartWidth / legendItemsPerRow) : 0;
        const itemY = (isMobile ? 20 : 0) + row * legendItemSpacing;
        
        legend.append('text')
          .attr('x', itemX + (isMobile ? 0 : legendItemSize + legendTextOffset))
          .attr('y', itemY + (isMobile ? 0 : legendItemSize / 2))
          .attr('fill', 'var(--color-text-secondary, #666)')
          .attr('font-size', '11px')
          .attr('font-style', 'italic')
          .attr('font-family', 'var(--font-family-base, sans-serif)')
          .text(`+${moreItemsCount} more...`);
      }
    }
  };

  // Destroy function to clean up resources
  const destroy = () => {
    if (container) {
      d3.select(container).select('svg').remove();
    }
  };

  return {
    svg,
    pieGroup,
    update,
    destroy
  };
}

/**
 * Utility functions for pie charts
 */
export const PieChartUtils = {
  /**
   * Maps data from an array of objects to the PieChartDataItem format
   * @param data Array of objects to map
   * @param keyField Field to use as the key
   * @param valueField Field to use as the value
   */
  mapData<T extends object>(
    data: T[],
    keyField: keyof T,
    valueField: keyof T
  ): PieChartDataItem[] {
    return data.map(item => ({
      key: String(item[keyField]),
      value: Number(item[valueField])
    }));
  },

  /**
   * Calculates percentages for each item in the data array
   * @param data Array of PieChartDataItem objects
   */
  calculatePercentages(data: PieChartDataItem[]): PieChartDataItem[] {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      ...item,
      percentage: (item.value / total) * 100
    }));
  },

  /**
   * Sorts data array by value
   * @param data Array of PieChartDataItem objects
   * @param descending Whether to sort in descending order
   */
  sortByValue(
    data: PieChartDataItem[],
    descending: boolean = true
  ): PieChartDataItem[] {
    return [...data].sort((a, b) => {
      return descending ? b.value - a.value : a.value - b.value;
    });
  },

  /**
   * Groups small segments into an "Other" category
   * @param data Array of PieChartDataItem objects
   * @param threshold Minimum percentage to keep as separate segment
   * @param otherLabel Label for the "Other" category
   */
  groupSmallSegments(
    data: PieChartDataItem[],
    threshold: number = 3,
    otherLabel: string = 'Other'
  ): PieChartDataItem[] {
    // Ensure percentages are calculated
    const dataWithPercentages = data.every(d => d.percentage !== undefined)
      ? data
      : PieChartUtils.calculatePercentages(data);
    
    // Split data into main segments and small segments
    const mainSegments = dataWithPercentages.filter(d => (d.percentage || 0) >= threshold);
    const smallSegments = dataWithPercentages.filter(d => (d.percentage || 0) < threshold);
    
    // If there are small segments, add an "Other" category
    if (smallSegments.length > 0) {
      const otherValue = smallSegments.reduce((sum, item) => sum + item.value, 0);
      const otherPercentage = smallSegments.reduce((sum, item) => sum + (item.percentage || 0), 0);
      
      return [
        ...mainSegments,
        {
          key: otherLabel,
          value: otherValue,
          percentage: otherPercentage
        }
      ];
    }
    
    return mainSegments;
  }
};

/**
 * Creates a donut chart (convenience function)
 */
export function createDonutChart(
  data: PieChartDataItem[],
  options: PieChartOptions
): PieChartResult {
  // Set innerRadius to 0.5 if not specified
  return createPieChart(data, {
    ...options,
    innerRadius: options.innerRadius === undefined ? 0.5 : options.innerRadius
  });
} 