import { Readable, Writable } from 'svelte/store';
import type { OmekaItem, VisualizationData } from './OmekaItem';

// Extend the global declarations
declare global {
  // Add proper typing for Svelte store subscriptions
  interface SvelteStoreSubscribe<T> {
    (value: T): () => void;
  }

  // Add proper typing for Svelte store contracts
  interface SvelteStoreContract<T> {
    subscribe: SvelteStoreSubscribe<T>;
  }

  // Add proper typing for Svelte stores
  interface SvelteStore<T> extends SvelteStoreContract<T> {}

  // Add proper typing for Svelte readable stores
  interface SvelteReadable<T> extends Readable<T> {}

  // Add proper typing for Svelte writable stores
  interface SvelteWritable<T> extends Writable<T> {}
}

// Declare module augmentation for Svelte
declare module 'svelte/store' {
  export interface Readable<T> {
    subscribe: SvelteStoreSubscribe<T>;
  }

  export interface Writable<T> extends Readable<T> {
    set(value: T): void;
    update(updater: (value: T) => T): void;
  }
}

// Declare module augmentation for store values
declare module 'svelte' {
  interface ComponentProps {
    // Add any global component props here
  }
}

// Add proper typing for store values
declare const $type: unique symbol;
declare type StoreValue<T> = T extends { [$type]: infer U } ? U : never;

// Add specific store types
declare module '../stores/itemsStore' {
  export const itemsStore: {
    subscribe: (callback: (value: VisualizationData) => void) => () => void;
    loadItems: () => Promise<void>;
  };
}

declare module '../stores/translationStore' {
  export const language: {
    subscribe: (callback: (value: string) => void) => () => void;
    toggleLanguage: () => void;
  };
  
  export function t(key: string, params?: string[]): string;
  export function translate(key: string, params?: string[]): Readable<string>;
} 