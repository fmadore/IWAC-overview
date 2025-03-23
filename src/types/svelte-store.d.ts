import { Readable, Writable } from 'svelte/store';
import type { OmekaItem, VisualizationData } from './OmekaItem';
import type { Language, TranslationStore, TranslationFunction, ReactiveTranslationFunction, TranslationKeys, TranslationParams } from './translations';

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

  interface ComponentEvents {
    languageChange: CustomEvent<Language>;
  }
}

// Add proper typing for store values
declare const $type: unique symbol;
declare type StoreValue<T> = T extends { [$type]: infer U } ? U : never;

// Add type declarations for translation store
declare module '../stores/translationStore' {
  export type { Language, TranslationStore, TranslationFunction, ReactiveTranslationFunction, TranslationKeys, TranslationParams };
} 