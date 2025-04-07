import { writable } from 'svelte/store';
import type { OmekaItem, VisualizationData } from '../types/OmekaItem';

// Keep track of loading state outside the store to prevent multiple simultaneous loads
let loadPromise: Promise<any> | null = null;

// Create the store with initial values
const { subscribe, set, update } = writable<VisualizationData>({
    items: [],
    loading: false,
    error: null
});

// Create a store object with methods
const itemsStore = {
    subscribe,
    
    // The loadItems method with cache to prevent multiple simultaneous loads
    loadItems: async () => {
        // Return existing promise if already loading
        if (loadPromise) {
            return loadPromise;
        }
        
        update(state => ({ ...state, loading: true, error: null }));
        
        // Create new load promise
        loadPromise = (async () => {
            try {
                // Use Vite's built-in BASE_URL which respects the 'base' config
                const response = await fetch(`${import.meta.env.BASE_URL}items.json`);
                const items = await response.json();
                set({ items, loading: false, error: null });
                return items;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load items';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            } finally {
                // Clear the promise when done
                loadPromise = null;
            }
        })();
        
        return loadPromise;
    }
};

// Export as default to match existing imports across the codebase
export default itemsStore; 