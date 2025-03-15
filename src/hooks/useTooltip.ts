import { onMount, onDestroy } from 'svelte';

/**
 * Interface for tooltip options
 */
export interface TooltipOptions {
    /** Background color of the tooltip */
    backgroundColor?: string;
    /** Text color of the tooltip */
    color?: string;
    /** Padding inside the tooltip */
    padding?: string;
    /** Border radius of the tooltip */
    borderRadius?: string;
    /** Font size of the tooltip text */
    fontSize?: string;
    /** Z-index of the tooltip */
    zIndex?: string;
    /** Box shadow of the tooltip */
    boxShadow?: string;
    /** Default width of the tooltip for positioning calculations */
    defaultWidth?: number;
    /** Default height of the tooltip for positioning calculations */
    defaultHeight?: number;
    /** Offset from cursor in pixels */
    offset?: number;
}

/**
 * Interface for tooltip position
 */
export interface TooltipPosition {
    left: number;
    top: number;
}

/**
 * Hook for creating and managing tooltips in visualization components
 * 
 * @param options - Configuration options for the tooltip
 * @returns Object with tooltip methods and properties
 */
export function useTooltip(options: TooltipOptions = {}) {
    // Default options
    const {
        backgroundColor = 'rgba(0, 0, 0, 0.8)',
        color = 'white',
        padding = '8px 12px',
        borderRadius = '4px',
        fontSize = '12px',
        zIndex = '1000',
        boxShadow = '0 2px 5px rgba(0,0,0,0.2)',
        defaultWidth = 200,
        defaultHeight = 100,
        offset = 10
    } = options;

    // Tooltip element reference
    let tooltip: HTMLDivElement | null = null;
    let isMounted = false;

    /**
     * Creates the tooltip element and appends it to the document body
     */
    function createTooltip() {
        try {
            // Remove any existing tooltip to prevent duplicates
            if (tooltip && document.body.contains(tooltip)) {
                document.body.removeChild(tooltip);
            }
            
            tooltip = document.createElement('div');
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = backgroundColor;
            tooltip.style.color = color;
            tooltip.style.padding = padding;
            tooltip.style.borderRadius = borderRadius;
            tooltip.style.pointerEvents = 'none';
            tooltip.style.display = 'none';
            tooltip.style.fontSize = fontSize;
            tooltip.style.zIndex = zIndex;
            tooltip.style.boxShadow = boxShadow;
            
            if (document && document.body) {
                document.body.appendChild(tooltip);
            }
        } catch (e) {
            console.error('Error creating tooltip:', e);
            tooltip = null;
        }
    }

    /**
     * Shows the tooltip with the provided content at the event position
     * 
     * @param event - Mouse event that triggered the tooltip
     * @param content - HTML content to display in the tooltip
     * @param width - Optional custom width for this specific tooltip instance
     * @param height - Optional custom height for this specific tooltip instance
     */
    function showTooltip(
        event: MouseEvent, 
        content: string, 
        width: number = defaultWidth, 
        height: number = defaultHeight
    ) {
        try {
            if (!tooltip || !document.body.contains(tooltip)) {
                createTooltip();
            }
            
            if (!tooltip) return;
            
            tooltip.innerHTML = content;
            
            // Calculate position
            const position = calculatePosition(event, width, height);
            
            tooltip.style.left = `${position.left}px`;
            tooltip.style.top = `${position.top}px`;
            tooltip.style.display = 'block';
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }

    /**
     * Calculates the optimal position for the tooltip
     * 
     * @param event - Mouse event that triggered the tooltip
     * @param width - Width of the tooltip
     * @param height - Height of the tooltip
     * @returns Optimal position for the tooltip
     */
    function calculatePosition(
        event: MouseEvent, 
        width: number = defaultWidth, 
        height: number = defaultHeight
    ): TooltipPosition {
        try {
            let left = event.pageX + offset;
            let top = event.pageY + offset;
            
            // Adjust if tooltip would go off screen
            if (left + width > window.innerWidth) {
                left = event.pageX - width - offset;
            }
            
            if (top + height > window.innerHeight) {
                top = event.pageY - height - offset;
            }
            
            return { left, top };
        } catch (e) {
            console.error('Error calculating tooltip position:', e);
            // Fallback to center of screen
            return {
                left: window.innerWidth / 2 - width / 2,
                top: window.innerHeight / 2 - height / 2
            };
        }
    }

    /**
     * Hides the tooltip
     */
    function hideTooltip() {
        try {
            if (tooltip && document.body.contains(tooltip)) {
                tooltip.style.display = 'none';
            }
        } catch (e) {
            console.error('Error hiding tooltip:', e);
        }
    }

    /**
     * Updates the tooltip content without changing its position
     * 
     * @param content - New HTML content for the tooltip
     */
    function updateTooltipContent(content: string) {
        try {
            if (tooltip && document.body.contains(tooltip)) {
                tooltip.innerHTML = content;
            }
        } catch (e) {
            console.error('Error updating tooltip content:', e);
        }
    }

    /**
     * Lifecycle setup
     */
    onMount(() => {
        isMounted = true;
        createTooltip();
    });

    onDestroy(() => {
        isMounted = false;
        if (tooltip && document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
        }
    });

    return {
        showTooltip,
        hideTooltip,
        updateTooltipContent,
        calculatePosition,
        getTooltipElement: () => tooltip
    };
}

/**
 * Helper function to create a grid-style tooltip content
 * 
 * @param title - Title for the tooltip
 * @param rows - Array of label/value pairs to display in the grid
 * @returns Formatted HTML string for the tooltip
 */
export function createGridTooltipContent(
    title: string, 
    rows: Array<{ label: string; value: string | number; }>
): string {
    const titleHtml = title ? 
        `<div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
            ${title}
        </div>` : '';
    
    const rowsHtml = rows.map(row => 
        `<span>${row.label}:</span><span style="text-align:right;font-weight:bold;">${row.value}</span>`
    ).join('');
    
    return `
        ${titleHtml}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            ${rowsHtml}
        </div>
    `;
} 