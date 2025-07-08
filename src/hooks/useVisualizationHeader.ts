/**
 * useVisualizationHeader - A composable hook for managing visualization headers
 * 
 * This hook provides a reusable way to manage dynamic titles, descriptions, and formatting
 * for visualization components. It handles:
 * - Dynamic title generation with counts and language-aware formatting
 * - Number formatting with locale-specific separators
 * - Language-aware title templates
 * - Reactive updates when language or data changes
 */

import { writable, type Writable } from 'svelte/store';
import { translate, languageStore } from '../stores/translationStore';
import { get } from 'svelte/store';

export interface VisualizationHeaderConfig {
    /** Base translation key for the title when no data is available */
    baseTitleKey: string;
    /** Translation key for title with data count (should accept {0} placeholder) */
    countTitleKey?: string;
    /** Translation key for the description */
    descriptionKey?: string;
    /** Custom title formatter function for complex titles */
    customTitleFormatter?: (data: VisualizationHeaderData, lang: 'en' | 'fr') => string;
    /** Whether to format numbers with locale-specific separators */
    formatNumbers?: boolean;
}

export interface VisualizationHeaderData {
    /** Total count of items/data points */
    totalCount: number;
    /** Additional count (e.g., word count, subcollection count) */
    additionalCount?: number;
    /** Additional data for custom formatters */
    [key: string]: any;
}

export interface VisualizationHeaderState {
    /** Current formatted title HTML */
    titleHtml: string;
    /** Current language */
    currentLang: 'en' | 'fr';
    /** Whether to show description */
    showDescription: boolean;
    /** Formatted description text */
    descriptionText: string;
}

export function useVisualizationHeader(config: VisualizationHeaderConfig) {
    // Internal state
    const state: Writable<VisualizationHeaderState> = writable({
        titleHtml: '',
        currentLang: 'en',
        showDescription: false,
        descriptionText: ''
    });

    // Get current language
    let currentLang: 'en' | 'fr' = get(languageStore);
    
    // Subscribe to language changes
    const languageUnsubscribe = languageStore.subscribe((lang) => {
        currentLang = lang;
        state.update(s => ({ ...s, currentLang: lang }));
    });

    /**
     * Format numbers with locale-specific separators
     */
    function formatNumber(num: number): string {
        if (!config.formatNumbers) return num.toString();
        
        if (currentLang === 'fr') {
            // French uses spaces as thousands separator
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        } else {
            // English uses commas
            return num.toLocaleString('en-US');
        }
    }

    /**
     * Update the title based on current data and language
     */
    function updateTitle(data: VisualizationHeaderData) {
        let newTitle: string;

        try {
            // Use custom formatter if provided
            if (config.customTitleFormatter) {
                newTitle = config.customTitleFormatter(data, currentLang);
            } 
            // Use count-based title if data is available and count title key is provided
            else if (data.totalCount > 0 && config.countTitleKey) {
                const formattedCount = formatNumber(data.totalCount);
                const countTitle = get(translate(config.countTitleKey));
                newTitle = countTitle.replace('{0}', formattedCount);
            }
            // Fall back to base title
            else {
                newTitle = get(translate(config.baseTitleKey));
            }
        } catch (error) {
            console.error('Error updating visualization title:', error);
            // Fallback to base title in case of error
            newTitle = get(translate(config.baseTitleKey));
        }

        state.update(s => ({ ...s, titleHtml: newTitle }));
    }

    /**
     * Update the description text
     */
    function updateDescription() {
        if (config.descriptionKey) {
            const newDescription = get(translate(config.descriptionKey));
            state.update(s => ({ ...s, descriptionText: newDescription }));
        }
    }

    /**
     * Toggle description visibility
     */
    function toggleDescription() {
        state.update(s => ({ ...s, showDescription: !s.showDescription }));
    }

    /**
     * Set description visibility
     */
    function setDescriptionVisibility(visible: boolean) {
        state.update(s => ({ ...s, showDescription: visible }));
    }

    /**
     * Initialize with initial data
     */
    function initialize(initialData: VisualizationHeaderData = { totalCount: 0 }) {
        updateTitle(initialData);
        updateDescription();
    }

    /**
     * Clean up subscriptions
     */
    function destroy() {
        languageUnsubscribe();
    }

    return {
        // State store
        state,
        
        // Methods
        updateTitle,
        updateDescription,
        toggleDescription,
        setDescriptionVisibility,
        initialize,
        destroy,
        formatNumber,
        
        // Computed values for convenience
        get titleHtml() { return get(state).titleHtml; },
        get currentLang() { return get(state).currentLang; },
        get showDescription() { return get(state).showDescription; },
        get descriptionText() { return get(state).descriptionText; }
    };
}

/**
 * Pre-configured header hook for common visualization patterns
 */
export function useStandardVisualizationHeader(type: 'country' | 'type' | 'word' | 'timeline' | 'language' | 'index') {
    const configs = {
        country: {
            baseTitleKey: 'viz.country_distribution_title',
            countTitleKey: 'viz.distribution_items',
            descriptionKey: 'viz.country_distribution_description',
            formatNumbers: true
        },
        type: {
            baseTitleKey: 'viz.type_distribution_title',
            countTitleKey: 'viz.type_distribution_items',
            descriptionKey: 'viz.type_distribution_description',
            formatNumbers: true
        },
        word: {
            baseTitleKey: 'viz.word_distribution',
            descriptionKey: 'viz.word_distribution_description',
            formatNumbers: true,
            customTitleFormatter: (data: VisualizationHeaderData, lang: 'en' | 'fr') => {
                if (data.totalCount > 0 && data.additionalCount) {
                    const formattedWordCount = data.additionalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                    const wordsText = lang === 'en' ? 'words' : 'mots';
                    
                    if (lang === 'en') {
                        return `Distribution of ${formattedWordCount} ${wordsText} by country and sub-collection`;
                    } else {
                        return `Répartition de ${formattedWordCount} ${wordsText} par pays et sous-collection`;
                    }
                }
                return lang === 'en' ? 'Word Distribution' : 'Répartition des mots';
            }
        },
        timeline: {
            baseTitleKey: 'viz.timeline_distribution_title',
            countTitleKey: 'viz.timeline_distribution_items',
            descriptionKey: 'viz.timeline_distribution_description',
            formatNumbers: true
        },
        language: {
            baseTitleKey: 'viz.language_distribution_title',
            countTitleKey: 'viz.language_distribution_items',
            descriptionKey: 'viz.language_distribution_description',
            formatNumbers: true
        },
        index: {
            baseTitleKey: 'viz.index_distribution_title',
            countTitleKey: 'viz.index_distribution_items',
            descriptionKey: 'viz.index_distribution_description',
            formatNumbers: true
        }
    };

    return useVisualizationHeader(configs[type]);
}
