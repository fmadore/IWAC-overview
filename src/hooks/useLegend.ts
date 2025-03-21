import * as d3 from 'd3';
import { translate, t } from '../stores/translationStore';

// Define types for the hook
export interface LegendItem {
  key: string;           // Unique identifier for the item
  label?: string;        // Display label (if not provided, key will be used)
  color: string;         // Color for the item
  value?: number;        // Optional value to display
  visible?: boolean;     // For interactive legends, if the item is visible
  customProperties?: Record<string, any>; // Any additional properties
}

export interface LegendOptions {
  // Common options
  container: HTMLElement | d3.Selection<any, unknown, null, undefined>;
  title?: string;
  titleTranslationKey?: string;
  items: LegendItem[];
  
  // Style and layout options
  type?: 'html' | 'svg';
  orientation?: 'horizontal' | 'vertical' | 'grid';
  position?: 'top' | 'right' | 'bottom' | 'left' | 'custom';
  customPosition?: { x: number, y: number };
  maxItems?: number;     // Max number of items to show before grouping as "Others"
  showValues?: boolean;  // Whether to show values
  className?: string;    // Additional CSS class
  
  // Formatting options
  valueFormatter?: (value: number) => string;
  
  // Translation options
  translateKeys?: {
    itemPrefix?: string;       // Prefix for item key translations (e.g., "lang." or "type.")
    othersLabel?: string;      // Translation key for "Others" label
    countLabel?: string;       // Translation key for count label
  };
  
  // Responsive options
  responsive?: boolean;
  breakpoint?: number;         // Mobile breakpoint
  
  // Interaction options
  interactive?: boolean;
  onItemClick?: (item: LegendItem, index: number) => void;
  
  // Custom properties for specialized legends
  customProperties?: {
    lineChart?: boolean;       // Whether this is a line chart legend
    [key: string]: any;        // Allow any other custom properties
  };
}

export interface UseLegendResult {
  render: () => void;
  update: (newItems: LegendItem[]) => void;
  updateVisibility: (key: string, visible: boolean) => void;
  getLegendElement: () => HTMLElement | d3.Selection<any, unknown, null, undefined> | null;
  cleanup: () => void;
}

/**
 * Hook for creating and managing legends in visualizations
 */
export function useLegend(options: LegendOptions): UseLegendResult {
  // Set defaults
  const {
    container,
    title,
    titleTranslationKey,
    items = [],
    type = 'html',
    orientation = 'vertical',
    position = 'right',
    customPosition,
    maxItems = 10,
    showValues = true,
    className = '',
    valueFormatter = (value) => value.toLocaleString(),
    translateKeys = {
      itemPrefix: '',
      othersLabel: 'viz.others',
      countLabel: 'viz.items',
    },
    responsive = true,
    breakpoint = 768,
    interactive = false,
    onItemClick = () => {},
    customProperties,
  } = options;

  // Store references
  let legendElement: HTMLElement | d3.Selection<any, unknown, null, undefined> | null = null;
  let currentItems = [...items];
  let resizeListener: (() => void) | null = null;

  /**
   * Create a DOM-based HTML legend
   */
  function createHtmlLegend() {
    // Check if container is HTMLElement
    if (!(container instanceof HTMLElement)) {
      console.error('Container must be an HTMLElement for HTML legend');
      return null;
    }

    // Clear existing legend if any
    if (legendElement instanceof HTMLElement) {
      legendElement.innerHTML = '';
    } else {
      legendElement = document.createElement('div');
      const isMobile = responsive && window.innerWidth < breakpoint;
      
      // Set className based on options
      legendElement.className = `legend ${isMobile ? 'legend-mobile' : 'legend-desktop'} ${className}`.trim();
      
      // Position the legend based on options
      if (position === 'custom' && customPosition) {
        legendElement.style.position = 'absolute';
        legendElement.style.left = `${customPosition.x}px`;
        legendElement.style.top = `${customPosition.y}px`;
      } else {
        // Apply positioning classes based on position value
        legendElement.classList.add(`legend-${position}`);
      }
      
      // Append the legend to the container
      container.appendChild(legendElement);
    }

    // Determine if we need to show mobile layout
    const isMobile = responsive && window.innerWidth < breakpoint;
    
    // Determine legend title
    let legendTitle = '';
    if (titleTranslationKey) {
      legendTitle = t(titleTranslationKey);
    } else if (title) {
      legendTitle = title;
    }
    
    // Prepare items to display
    let displayItems = [...currentItems];
    let othersItem: LegendItem | null = null;
    
    // If we have more items than maxItems, group the rest as "Others"
    if (maxItems > 0 && displayItems.length > maxItems) {
      const visibleItems = displayItems.slice(0, maxItems);
      const otherItems = displayItems.slice(maxItems);
      
      // Create "Others" item
      othersItem = {
        key: 'others',
        label: t(translateKeys.othersLabel || 'viz.others'),
        color: '#999999',
        value: otherItems.reduce((sum, item) => sum + (item.value || 0), 0),
      };
      
      displayItems = visibleItems;
    }

    // Generate legend HTML
    const legendTitleHtml = legendTitle 
      ? `<div class="legend-heading${isMobile ? '-mobile' : ''}">${legendTitle} (${currentItems.length})</div>` 
      : '';
    
    const gridClass = isMobile ? 'legend-grid-mobile' : 'legend-grid';
    
    // Create legend items HTML
    const itemsHtml = displayItems.map(item => {
      // Get translated label if prefix is provided
      let itemLabel = item.label || item.key;
      if (translateKeys.itemPrefix) {
        const translatedKey = `${translateKeys.itemPrefix}${item.key}`;
        const translated = t(translatedKey);
        if (translated !== translatedKey) {
          itemLabel = translated;
        }
      }
      
      // Define CSS classes based on mobile/desktop and visibility
      const colorClass = isMobile ? 'legend-color-mobile' : 'legend-color';
      const labelClass = isMobile ? 'legend-label-mobile' : 'legend-label';
      const valueClass = isMobile ? 'legend-value-mobile' : 'legend-value';
      
      const visibilityStyle = item.visible === false ? 'opacity: 0.5; text-decoration: line-through;' : '';
      
      return `
        <div class="${colorClass}" data-color="${item.color}" style="${visibilityStyle}"></div>
        <div class="${labelClass}" style="${visibilityStyle}">${itemLabel}</div>
        ${showValues && item.value !== undefined 
          ? `<div class="${valueClass}" style="${visibilityStyle}">${valueFormatter(item.value)}</div>` 
          : ''}
      `;
    }).join('');
    
    // Add "Others" item if needed
    const othersHtml = othersItem ? `
      <div class="${isMobile ? 'legend-color-mobile' : 'legend-color'}" data-color="${othersItem.color}"></div>
      <div class="${isMobile ? 'legend-label-mobile' : 'legend-label'}">${othersItem.label}</div>
      ${showValues && othersItem.value !== undefined 
        ? `<div class="${isMobile ? 'legend-value-mobile' : 'legend-value'}">${valueFormatter(othersItem.value)}</div>` 
        : ''}
    ` : '';

    // Combine all HTML
    legendElement.innerHTML = `
      ${legendTitleHtml}
      <div class="${gridClass}">
        ${itemsHtml}
        ${othersHtml}
      </div>
    `;

    // Apply background colors using dataset attributes
    legendElement.querySelectorAll(`[data-color]`).forEach(el => {
      (el as HTMLElement).style.backgroundColor = (el as HTMLElement).dataset.color || '';
    });
    
    // Add click handlers if interactive
    if (interactive) {
      const itemElements = legendElement.querySelectorAll(`.${isMobile ? 'legend-label-mobile' : 'legend-label'}`);
      itemElements.forEach((el, index) => {
        if (index < displayItems.length) {
          el.classList.add('cursor-pointer');
          el.addEventListener('click', () => onItemClick(displayItems[index], index));
        }
      });
    }

    return legendElement;
  }

  /**
   * Create a D3 SVG-based legend
   */
  function createSvgLegend() {
    // Get the correct D3 selection
    let svgSelection: d3.Selection<any, unknown, null, undefined>;
    
    if (container instanceof HTMLElement) {
      // Create a D3 selection from the HTML element
      svgSelection = d3.select(container);
    } else {
      // Use the provided D3 selection
      svgSelection = container;
    }
    
    // Clear any existing legend with the same class
    svgSelection.selectAll(`.legend${className ? `.${className}` : ''}`).remove();
    
    // Determine position for the legend
    let x = 10, y = 10;
    
    if (position === 'custom' && customPosition) {
      x = customPosition.x;
      y = customPosition.y;
    } else if (position === 'right') {
      // Try to position on the right side if we can determine the width
      const svgNode = svgSelection.node();
      if (svgNode) {
        const bbox = (svgNode as SVGSVGElement).getBoundingClientRect();
        x = bbox.width - 120;
      }
    } else if (position === 'bottom') {
      // Try to position at the bottom if we can determine the height
      const svgNode = svgSelection.node();
      if (svgNode) {
        const bbox = (svgNode as SVGSVGElement).getBoundingClientRect();
        y = bbox.height - 50;
      }
    }
    
    // Create legend group
    const legend = svgSelection.append('g')
      .attr('class', `legend ${className}`.trim())
      .attr('transform', `translate(${x}, ${y})`);
    
    // Add title if provided
    if (title || titleTranslationKey) {
      const legendTitle = titleTranslationKey ? t(titleTranslationKey) : (title || '');
      legend.append('text')
        .attr('class', 'legend-title')
        .attr('x', 0)
        .attr('y', -10)
        .attr('font-size', 'var(--font-size-xs)')
        .attr('fill', 'var(--color-text-secondary)')
        .text(`${legendTitle} (${currentItems.length})`);
    }
    
    // Configure legend layout
    const isHorizontal = orientation === 'horizontal';
    const itemWidth = 20;
    const itemHeight = 20;
    const itemMargin = 5;
    const textOffset = 5;
    
    // Limit items if maxItems is specified
    const displayItems = maxItems > 0 && currentItems.length > maxItems
      ? currentItems.slice(0, maxItems)
      : currentItems;
    
    // Create legend items
    displayItems.forEach((item, i) => {
      const x = isHorizontal ? i * (itemWidth + itemMargin * 3 + 60) : 0;
      const y = isHorizontal ? 0 : i * (itemHeight + itemMargin);
      
      // Get translated label if prefix is provided
      let itemLabel = item.label || item.key;
      if (translateKeys.itemPrefix) {
        const translatedKey = `${translateKeys.itemPrefix}${item.key}`;
        const translated = t(translatedKey);
        if (translated !== translatedKey) {
          itemLabel = translated;
        }
      }
      
      // Create item group
      const itemGroup = legend.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${x}, ${y})`);
      
      // Add color swatch
      itemGroup.append('rect')
        .attr('width', itemWidth)
        .attr('height', itemHeight)
        .attr('fill', item.color)
        .attr('stroke', item.visible === false ? '#999' : 'none')
        .attr('stroke-width', item.visible === false ? 1 : 0)
        .attr('opacity', item.visible === false ? 0.5 : 1);
      
      // Add label
      const textElement = itemGroup.append('text')
        .attr('x', itemWidth + textOffset)
        .attr('y', itemHeight / 2)
        .attr('dy', '0.35em')
        .attr('fill', 'var(--color-text-primary)')
        .attr('font-size', 'var(--font-size-sm)')
        .text(itemLabel);
      
      // Add value if showValues is true and value exists
      if (showValues && item.value !== undefined) {
        // For horizontal layout, place value after label
        // For vertical layout, place value below label
        const valueX = isHorizontal ? itemWidth + textOffset + getTextWidth(textElement) + 5 : itemWidth + textOffset;
        const valueY = isHorizontal ? itemHeight / 2 : itemHeight / 2 + 15;
        
        itemGroup.append('text')
          .attr('x', valueX)
          .attr('y', valueY)
          .attr('dy', '0.35em')
          .attr('fill', 'var(--color-text-secondary)')
          .attr('font-size', 'var(--font-size-xs)')
          .text(valueFormatter(item.value));
      }
      
      // If interactive, add click behavior
      if (interactive) {
        itemGroup
          .attr('class', 'legend-item cursor-pointer')
          .attr('role', 'button')
          .style('cursor', 'pointer')
          .on('click', () => onItemClick(item, i));
        
        // Add strikethrough for hidden items
        if (item.visible === false) {
          const textNode = textElement.node();
          if (textNode) {
            const textWidth = (textNode as SVGTextElement).getComputedTextLength();
            
            itemGroup.append('line')
              .attr('x1', itemWidth + textOffset)
              .attr('y1', itemHeight / 2)
              .attr('x2', itemWidth + textOffset + textWidth)
              .attr('y2', itemHeight / 2)
              .attr('stroke', 'var(--color-text-primary)')
              .attr('stroke-width', 1);
          }
        }
      }
    });
    
    // Add "Others" item if needed
    if (maxItems > 0 && currentItems.length > maxItems) {
      const otherItems = currentItems.slice(maxItems);
      const otherValue = otherItems.reduce((sum, item) => sum + (item.value || 0), 0);
      
      const x = isHorizontal ? displayItems.length * (itemWidth + itemMargin * 3 + 60) : 0;
      const y = isHorizontal ? 0 : displayItems.length * (itemHeight + itemMargin);
      
      const othersGroup = legend.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${x}, ${y})`);
      
      // Add color swatch for "Others"
      othersGroup.append('rect')
        .attr('width', itemWidth)
        .attr('height', itemHeight)
        .attr('fill', '#999999');
      
      // Add label for "Others"
      const othersLabel = t(translateKeys.othersLabel || 'viz.others');
      othersGroup.append('text')
        .attr('x', itemWidth + textOffset)
        .attr('y', itemHeight / 2)
        .attr('dy', '0.35em')
        .attr('fill', 'var(--color-text-primary)')
        .attr('font-size', 'var(--font-size-sm)')
        .text(othersLabel);
      
      // Add count for "Others" if needed
      if (showValues) {
        othersGroup.append('text')
          .attr('x', isHorizontal ? itemWidth + textOffset + othersLabel.length * 8 + 5 : itemWidth + textOffset)
          .attr('y', isHorizontal ? itemHeight / 2 : itemHeight / 2 + 15)
          .attr('dy', '0.35em')
          .attr('fill', 'var(--color-text-secondary)')
          .attr('font-size', 'var(--font-size-xs)')
          .text(valueFormatter(otherValue));
      }
    }
    
    // Store and return the legend selection
    legendElement = legend;
    return legend;
  }

  /**
   * Create a D3 SVG legend for a line chart (special case)
   */
  function createLineChartLegend() {
    // This is a specialized legend for line charts with lines instead of rectangles
    
    // Get the correct D3 selection
    let svgSelection: d3.Selection<any, unknown, null, undefined>;
    
    if (container instanceof HTMLElement) {
      svgSelection = d3.select(container);
    } else {
      svgSelection = container;
    }
    
    // Clear any existing legend with the same class
    svgSelection.selectAll(`.legend${className ? `.${className}` : ''}`).remove();
    
    // Determine position for the legend
    let x = 10, y = 10;
    
    if (position === 'custom' && customPosition) {
      x = customPosition.x;
      y = customPosition.y;
    } else if (position === 'right') {
      const svgNode = svgSelection.node();
      if (svgNode) {
        const bbox = (svgNode as SVGSVGElement).getBoundingClientRect();
        x = bbox.width - 120;
      }
    }
    
    // Create legend group
    const legend = svgSelection.append('g')
      .attr('class', `legend ${className}`.trim())
      .attr('transform', `translate(${x}, ${y})`);
    
    // Configure legend layout
    const lineLength = 20;
    const itemMargin = 20;
    const textOffset = 5;
    
    // Create legend items
    currentItems.forEach((item, i) => {
      const yPosition = i * itemMargin;
      
      // Get translated label if prefix is provided
      let itemLabel = item.label || item.key;
      if (translateKeys.itemPrefix) {
        const translatedKey = `${translateKeys.itemPrefix}${item.key}`;
        const translated = t(translatedKey);
        if (translated !== translatedKey) {
          itemLabel = translated;
        }
      }
      
      // Create line with the item's style
      legend.append('line')
        .attr('x1', 0)
        .attr('y1', yPosition)
        .attr('x2', lineLength)
        .attr('y2', yPosition)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.customProperties?.dashArray || 'none');
      
      // Add marker if specified
      if (item.customProperties?.marker) {
        legend.append('circle')
          .attr('cx', lineLength)
          .attr('cy', yPosition)
          .attr('r', 3)
          .attr('fill', item.color);
      }
      
      // Add label
      legend.append('text')
        .attr('x', lineLength + textOffset + 5)
        .attr('y', yPosition)
        .attr('dy', '0.35em')
        .attr('class', 'text-xs text-secondary')
        .text(itemLabel);
    });
    
    // Store and return the legend selection
    legendElement = legend;
    return legend;
  }

  /**
   * Get the approximate width of text using a D3 text element
   */
  function getTextWidth(textElement: d3.Selection<any, unknown, null, undefined>): number {
    const node = textElement.node();
    if (node) {
      return (node as SVGTextElement).getComputedTextLength();
    }
    return 0;
  }

  /**
   * Render the legend
   */
  function render() {
    // Determine which type of legend to create
    if (type === 'html') {
      createHtmlLegend();
    } else if (type === 'svg') {
      // Special case for line charts with a custom option
      if (options.customProperties?.lineChart === true) {
        createLineChartLegend();
      } else {
        createSvgLegend();
      }
    }
    
    // Add window resize handler for responsive legends
    if (responsive && !resizeListener) {
      resizeListener = () => {
        // Only re-render if crossing the breakpoint threshold
        const wasMobile = legendElement instanceof HTMLElement && legendElement.classList.contains('legend-mobile');
        const isMobile = window.innerWidth < breakpoint;
        
        if (wasMobile !== isMobile) {
          render();
        }
      };
      
      window.addEventListener('resize', resizeListener);
    }
  }

  /**
   * Update legend with new items
   */
  function update(newItems: LegendItem[]) {
    currentItems = [...newItems];
    render();
  }

  /**
   * Update visibility of a specific legend item
   */
  function updateVisibility(key: string, visible: boolean) {
    const updatedItems = currentItems.map(item => 
      item.key === key ? { ...item, visible } : item
    );
    
    currentItems = updatedItems;
    render();
  }

  /**
   * Get the legend element
   */
  function getLegendElement() {
    return legendElement;
  }

  /**
   * Clean up the legend (remove event listeners, etc.)
   */
  function cleanup() {
    // Remove resize listener if any
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener);
      resizeListener = null;
    }
    
    // Remove the legend element if it's HTML
    if (legendElement instanceof HTMLElement && legendElement.parentNode) {
      legendElement.parentNode.removeChild(legendElement);
    }
    
    // Remove the legend element if it's SVG
    if (container && type === 'svg') {
      if (container instanceof HTMLElement) {
        d3.select(container).selectAll(`.legend${className ? `.${className}` : ''}`).remove();
      } else {
        container.selectAll(`.legend${className ? `.${className}` : ''}`).remove();
      }
    }
    
    // Reset reference
    legendElement = null;
  }

  // Return the API
  return {
    render,
    update,
    updateVisibility,
    getLegendElement,
    cleanup
  };
} 