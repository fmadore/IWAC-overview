import type { SvelteComponentTyped } from 'svelte';

// Define a generic type for Svelte components
declare module '*.svelte' {
  export default class Component extends SvelteComponentTyped<any, any, any> {}
}

// Define specific component types
declare module 'src/components/DebugPanel.svelte' {
  export default class DebugPanel extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/LanguageToggle.svelte' {
  export default class LanguageToggle extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/TranslationContext.svelte' {
  export default class TranslationContext extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/BaseVisualization.svelte' {
  export default class BaseVisualization extends SvelteComponentTyped<{
    title?: string;
    translationKey?: string;
    description?: string;
    descriptionTranslationKey?: string;
    showDescription?: boolean;
    titleHtml?: string;
    ariaLabel?: string;
    enableResizeObserver?: boolean;
    theme?: 'default' | 'light' | 'dark' | 'custom';
    customBackground?: string;
    customTextColor?: string;
    minHeight?: string;
    padding?: string;
    className?: string;
    modernStyle?: boolean;
    enableTooltip?: boolean;
    tooltipBackgroundColor?: string;
    tooltipTextColor?: string;
    tooltipMaxWidth?: string;
  }, { resize: CustomEvent<{ width: number; height: number }> }, { default: {} }> {}
}

declare module 'src/components/visualizations/CountryDistribution.svelte' {
  export default class CountryDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/LanguageDistribution.svelte' {
  export default class LanguageDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/TimelineDistribution.svelte' {
  export default class TimelineDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/TypeDistribution.svelte' {
  export default class TypeDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/IndexDistribution.svelte' {
  export default class IndexDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/WordDistribution.svelte' {
  export default class WordDistribution extends SvelteComponentTyped<{}, {}, {}> {}
}

declare module 'src/components/visualizations/VisualizationHeader.svelte' {
  export default class VisualizationHeader extends SvelteComponentTyped<{
    title: string;
    translationKey?: string;
    description?: string;
    showDescription?: boolean;
    descriptionTranslationKey?: string;
    titleHtml?: string;
    descriptionId: string;
    className?: string;
  }, {}, {}> {}
} 