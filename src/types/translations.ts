import type { Readable } from 'svelte/store';

// Define supported languages
export type Language = 'en' | 'fr';

// Define translation namespaces
export type TranslationNamespace = 
  | 'app'
  | 'tab'
  | 'ui'
  | 'viz'
  | 'lang'
  | 'country'
  | 'type'
  | 'category';

// Define translation keys for each namespace
export interface TranslationKeys {
  [key: string]: string | {
    [key: string]: string;
  };
}

// Define a type for translation keys with parameters
export type TranslationKeyWithParams = {
  key: string;
  params: string[];
};

// Define a type for translation key paths
export type TranslationKeyPath = keyof TranslationKeys;

// Define a type for translation key values
export type TranslationKeyValue<T extends TranslationKeyPath> = keyof TranslationKeys[T];

// Define a type for translation parameters
export type TranslationParams = Record<string, string | number>;

// Define a type for the translation store
export interface TranslationStore {
  subscribe: (callback: (value: Language) => void) => () => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

// Define a type for the translation function
export type TranslationFunction = (key: string, params?: TranslationParams) => string;

// Define a type for the reactive translation function
export type ReactiveTranslationFunction = (key: string, params?: TranslationParams) => Readable<string>; 