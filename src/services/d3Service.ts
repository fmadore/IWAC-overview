import * as d3 from 'd3';

/**
 * D3Service provides a standardized API for creating and managing D3.js visualizations.
 * It abstracts common D3 operations to reduce code duplication and improve consistency.
 */

/**
 * SVG configuration options
 */
export interface SVGOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  margin?: Margin;
  className?: string;
  responsive?: boolean;
}

/**
 * Chart margin configuration
 */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Scale configuration options
 */
export interface ScaleOptions {
  type: 'linear' | 'log' | 'time' | 'ordinal' | 'band';
  domain: any[];
  range: any[];
  padding?: number;
  nice?: boolean;
}

/**
 * Axis configuration options
 */
export interface AxisOptions {
  type: 'x' | 'y';
  scale: d3.AxisScale<any>;
  position?: 'top' | 'right' | 'bottom' | 'left';
  ticks?: number;
  tickFormat?: (d: any) => string;
  tickSize?: number;
  tickPadding?: number;
  rotate?: number;
}

/**
 * Default margins for charts
 */
export const DEFAULT_MARGINS: Margin = {
  top: 20,
  right: 30,
  bottom: 40,
  left: 50
};

/**
 * Creates SVG element inside the provided container
 */
export function createSVG(options: SVGOptions) {
  const { 
    container, 
    width = container.clientWidth, 
    height = container.clientHeight,
    margin = DEFAULT_MARGINS,
    className = 'd3-visualization',
    responsive = true
  } = options;

  // Clear existing SVG if present
  d3.select(container).select('svg').remove();

  // Create the SVG element
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', className);
  
  // Add viewBox for responsiveness if required
  if (responsive) {
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');
  }

  // Create a group element with the margin transform
  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Return both the SVG and the chart group
  return {
    svg,
    chart,
    width,
    height,
    margin,
    chartWidth: width - margin.left - margin.right,
    chartHeight: height - margin.top - margin.bottom
  };
}

/**
 * Creates an appropriate scale based on the provided options
 */
export function createScale(options: ScaleOptions) {
  const { type, domain, range, padding = 0.1, nice = true } = options;
  
  let scale;
  
  switch(type) {
    case 'linear':
      scale = d3.scaleLinear()
        .domain(domain)
        .range(range);
      break;
    case 'log':
      scale = d3.scaleLog()
        .domain(domain)
        .range(range);
      break;
    case 'time':
      scale = d3.scaleTime()
        .domain(domain)
        .range(range);
      break;
    case 'ordinal':
      scale = d3.scaleOrdinal()
        .domain(domain)
        .range(range);
      break;
    case 'band':
      scale = d3.scaleBand()
        .domain(domain)
        .range(range)
        .padding(padding);
      break;
    default:
      throw new Error(`Unsupported scale type: ${type}`);
  }
  
  // Apply nice() to appropriate scale types
  if (nice && ['linear', 'time', 'log'].includes(type)) {
    (scale as d3.ScaleLinear<number, number> | 
             d3.ScaleTime<number, number> | 
             d3.ScaleLogarithmic<number, number>).nice();
  }
  
  return scale;
}

/**
 * Creates an axis based on the provided options
 */
export function createAxis(options: AxisOptions) {
  const { 
    type, 
    scale, 
    position = type === 'x' ? 'bottom' : 'left',
    ticks,
    tickFormat,
    tickSize,
    tickPadding,
    rotate
  } = options;
  
  let axis;
  
  // Create the appropriate axis
  if (position === 'bottom') {
    axis = d3.axisBottom(scale);
  } else if (position === 'top') {
    axis = d3.axisTop(scale);
  } else if (position === 'left') {
    axis = d3.axisLeft(scale);
  } else if (position === 'right') {
    axis = d3.axisRight(scale);
  } else {
    throw new Error(`Unsupported axis position: ${position}`);
  }
  
  // Apply optional configurations
  if (ticks !== undefined) axis.ticks(ticks);
  if (tickFormat !== undefined) axis.tickFormat(tickFormat);
  if (tickSize !== undefined) axis.tickSize(tickSize);
  if (tickPadding !== undefined) axis.tickPadding(tickPadding);
  
  return { axis, rotate };
}

/**
 * Renders an axis to the specified selection
 */
export function renderAxis(selection: d3.Selection<SVGGElement, unknown, null, undefined>, axisObj: { axis: d3.Axis<any>, rotate?: number }) {
  const { axis, rotate } = axisObj;
  
  // Call the axis on the selection
  selection.call(axis);
  
  // Apply text rotation if specified
  if (rotate) {
    selection.selectAll('text')
      .style('text-anchor', rotate > 45 ? 'end' : 'middle')
      .attr('transform', `rotate(${rotate})`);
  }
}

/**
 * Creates a color scale
 */
export function createColorScale(domain: string[], rangeType: 'categorical' | 'sequential' | 'diverging' = 'categorical') {
  if (rangeType === 'categorical') {
    return d3.scaleOrdinal<string>()
      .domain(domain)
      .range(d3.schemeCategory10);
  } else if (rangeType === 'sequential') {
    return d3.scaleSequential(d3.interpolateBlues)
      .domain([0, domain.length - 1]);
  } else if (rangeType === 'diverging') {
    return d3.scaleSequential(d3.interpolateRdBu)
      .domain([0, domain.length - 1]);
  }
  
  throw new Error(`Unsupported color range type: ${rangeType}`);
}

/**
 * Adds a title to the SVG element
 */
export function addTitle(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, text: string, className: string = 'chart-title') {
  svg.append('text')
    .attr('class', className)
    .attr('x', svg.attr('width') ? parseInt(svg.attr('width')) / 2 : 0)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .text(text);
}

/**
 * Creates a legend for the visualization
 */
export function createLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
  items: {key: string, color: string}[], 
  options: {
    position?: {x: number, y: number},
    orientation?: 'horizontal' | 'vertical',
    itemWidth?: number,
    itemHeight?: number,
    itemMargin?: number,
    className?: string
  } = {}
) {
  const { 
    position = {x: 10, y: 10}, 
    orientation = 'horizontal',
    itemWidth = 20,
    itemHeight = 20,
    itemMargin = 5,
    className = 'legend'
  } = options;
  
  const legend = svg.append('g')
    .attr('class', className)
    .attr('transform', `translate(${position.x}, ${position.y})`);
  
  const isHorizontal = orientation === 'horizontal';
  
  items.forEach((item, i) => {
    const x = isHorizontal ? i * (itemWidth + itemMargin * 3) : 0;
    const y = isHorizontal ? 0 : i * (itemHeight + itemMargin);
    
    const g = legend.append('g')
      .attr('transform', `translate(${x}, ${y})`);
    
    g.append('rect')
      .attr('width', itemWidth)
      .attr('height', itemHeight)
      .attr('fill', item.color);
    
    g.append('text')
      .attr('x', itemWidth + itemMargin)
      .attr('y', itemHeight / 2)
      .attr('dy', '0.35em')
      .text(item.key);
  });
  
  return legend;
}

/**
 * Gets tick values from a scale - safely handles different scale types
 */
function getTickValues(scale: d3.AxisScale<any>, tickCount: number): any[] {
  if ('ticks' in scale && typeof scale.ticks === 'function') {
    return scale.ticks(tickCount);
  } else if ('domain' in scale && typeof scale.domain === 'function') {
    // For scales like band or ordinal that don't have ticks method
    return scale.domain();
  }
  return [];
}

/**
 * Adds a grid to the chart
 */
export function addGrid(
  chart: d3.Selection<SVGGElement, unknown, null, undefined>,
  options: {
    width: number,
    height: number,
    xScale?: d3.AxisScale<any>,
    yScale?: d3.AxisScale<any>,
    xTicks?: number,
    yTicks?: number,
    className?: string
  }
) {
  const { 
    width, 
    height, 
    xScale, 
    yScale,
    xTicks = 10,
    yTicks = 10,
    className = 'grid'
  } = options;
  
  const grid = chart.append('g')
    .attr('class', className);
  
  // Add vertical grid lines if xScale is provided
  if (xScale) {
    const xTickValues = getTickValues(xScale, xTicks);
    
    grid.append('g')
      .attr('class', 'grid-x')
      .selectAll('line')
      .data(xTickValues)
      .enter()
      .append('line')
      .attr('x1', (d: any) => xScale(d) as number)
      .attr('x2', (d: any) => xScale(d) as number)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '3,3');
  }
  
  // Add horizontal grid lines if yScale is provided
  if (yScale) {
    const yTickValues = getTickValues(yScale, yTicks);
    
    grid.append('g')
      .attr('class', 'grid-y')
      .selectAll('line')
      .data(yTickValues)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d: any) => yScale(d) as number)
      .attr('y2', (d: any) => yScale(d) as number)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '3,3');
  }
  
  return grid;
}

/**
 * Creates a D3 transition with specified options
 */
export function createTransition(
  duration: number = 500, 
  easing: (t: number) => number = d3.easeCubicInOut
) {
  return d3.transition()
    .duration(duration)
    .ease(easing);
}

/**
 * Applies responsive behavior to an SVG element
 */
export function makeResponsive(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
  // Get current dimensions
  const width = parseInt(svg.attr('width'));
  const height = parseInt(svg.attr('height'));
  
  // Apply responsive attributes
  svg.attr('viewBox', `0 0 ${width} ${height}`)
     .attr('preserveAspectRatio', 'xMidYMid meet')
     .attr('width', '100%')
     .attr('height', '100%');
}

/**
 * Handles "no data" scenario for visualizations
 */
export function handleNoData(
  container: HTMLElement,
  message: string = 'No data available',
  className: string = 'absolute inset-center text-secondary z-50'
) {
  // Clear existing SVG if present
  d3.select(container).select('svg').remove();
  
  // Remove any existing no-data message
  d3.select(container).selectAll(`.${className.split(' ')[0]}`).remove();
  
  // Add no-data message
  d3.select(container).append('div')
    .attr('class', className)
    .text(message);
}

/**
 * Creates a tooltip container in the document body
 */
export function createTooltipContainer(
  className: string = 'visualization-tooltip',
  styles: {[key: string]: string} = {}
) {
  // Remove any existing tooltip with the same class
  d3.select(`.${className}`).remove();
  
  // Create tooltip container
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', className)
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('background', styles.background || 'rgba(0, 0, 0, 0.8)')
    .style('color', styles.color || 'white')
    .style('padding', styles.padding || '8px 12px')
    .style('border-radius', styles.borderRadius || '4px')
    .style('font-size', styles.fontSize || '12px')
    .style('z-index', styles.zIndex || '1000')
    .style('box-shadow', styles.boxShadow || '0 2px 5px rgba(0,0,0,0.2)');
  
  return tooltip;
}

export const D3Service = {
  createSVG,
  createScale,
  createAxis,
  renderAxis,
  createColorScale,
  addTitle,
  createLegend,
  addGrid,
  createTransition,
  makeResponsive,
  handleNoData,
  createTooltipContainer
}; 