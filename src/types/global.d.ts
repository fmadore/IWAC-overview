import type { VisualizationData } from './OmekaItem';

// Global declarations for store values
declare global {
  // Add store values as properties on the global namespace
  var $itemsStore: VisualizationData;
  var $language: string;
  
  // Add window extensions for debug
  interface Window {
    __IWAC_DEBUG?: {
      logs: any[];
      dumpLogs: () => void;
      exportLogs: () => string;
      mountedComponents: () => string[];
      hierarchy: Record<string, string[]>;
    };
    
    __TRANSLATION_DEBUG?: {
      dumpLogs: () => void;
      exportLogs: () => string;
      currentLanguage: () => string;
      isMounted: () => boolean;
    };
  }
} 