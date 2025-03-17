import { onMount, onDestroy } from 'svelte';

interface D3ResizeOptions {
    /**
     * The container element to observe for size changes
     */
    container: HTMLElement | null;
    
    /**
     * Callback function to be called when the container size changes
     */
    onResize: () => void;
    
    /**
     * Whether to debounce the resize callback to prevent too frequent updates
     * @default true
     */
    debounce?: boolean;
    
    /**
     * Debounce delay in milliseconds
     * @default 100
     */
    debounceDelay?: number;
}

interface D3ResizeResult {
    /**
     * The current width of the container
     */
    width: number;
    
    /**
     * The current height of the container
     */
    height: number;
    
    /**
     * The current dimensions object with width and height
     */
    dimensions: { width: number; height: number };
    
    /**
     * Function to manually trigger a resize update
     */
    updateDimensions: () => void;

    /**
     * Function to clean up the resize observer
     */
    cleanup: () => void;
}

/**
 * Hook for handling responsive D3.js visualizations
 * Provides standardized resize handling with optional debouncing
 */
export function useD3Resize(options: D3ResizeOptions): D3ResizeResult {
    const {
        container,
        onResize,
        debounce = true,
        debounceDelay = 100
    } = options;

    let width = 0;
    let height = 0;
    let resizeObserver: ResizeObserver | null = null;
    let debounceTimeout: number | null = null;

    // Function to update dimensions
    function updateDimensions() {
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        
        if (debounce) {
            // Clear existing timeout if any
            if (debounceTimeout !== null) {
                window.clearTimeout(debounceTimeout);
            }
            
            // Set new timeout
            debounceTimeout = window.setTimeout(() => {
                onResize();
            }, debounceDelay);
        } else {
            onResize();
        }
    }

    // Initialize resize observer
    if (container) {
        // Initial dimensions
        updateDimensions();

        // Set up resize observer
        resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        resizeObserver.observe(container);
    }

    // Cleanup function
    function cleanup() {
        // Clean up resize observer
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        // Clear any pending debounce timeout
        if (debounceTimeout !== null) {
            window.clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }
    }

    return {
        width,
        height,
        dimensions: { width, height },
        updateDimensions,
        cleanup
    };
} 