import { writable } from 'svelte/store';
import type { OmekaItem, VisualizationData } from '../types/OmekaItem';

const createItemsStore = () => {
    const { subscribe, set, update } = writable<VisualizationData>({
        items: [],
        loading: false,
        error: null
    });

    return {
        subscribe,
        loadItems: async () => {
            update(state => ({ ...state, loading: true, error: null }));
            try {
                const basePath = import.meta.env.DEV ? '' : '/IWAC-overview';
                const response = await fetch(`${basePath}/items.json`);
                const items = await response.json();
                set({ items, loading: false, error: null });
            } catch (error) {
                update(state => ({
                    ...state,
                    loading: false,
                    error: error instanceof Error ? error.message : 'Failed to load items'
                }));
            }
        }
    };
};

export const itemsStore = createItemsStore(); 