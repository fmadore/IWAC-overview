import { writable, derived, get } from 'svelte/store';

// Define types for translations
export type Language = 'en' | 'fr';

export interface Translation {
    [key: string]: string;
}

export interface Translations {
    [language: string]: Translation;
}

// Define translations for English and French
export const translations: Translations = {
    en: {
        // App navigation
        'app.title': 'IWAC Database Overview',
        'tab.countries': 'Country Distribution',
        'tab.languages': 'Languages',
        'tab.timeline': 'Timeline',
        'tab.types': 'Type Distribution',
        'tab.categories': 'Index Categories',
        'tab.words': 'Word Distribution',
        
        // UI elements and status messages
        'ui.loading': 'Loading database...',
        'ui.select_visualization': 'Select a visualization from the tabs above',
        'ui.toggle_language': 'Changer en français',
        
        // Visualization components
        'viz.summary': 'Summary',
        'viz.total_items': 'Total items',
        'viz.number_of_categories': 'Number of categories',
        'viz.top_categories': 'Top Categories',
        'viz.filter_by_country': 'Filter by Country',
        'viz.filter_by_type': 'Filter by Type',
        'viz.showing_items': 'Showing {0} items in {1} languages',
        'viz.all_countries': 'All Countries',
        'viz.all_types': 'All Types',
        'viz.no_data': 'No data available with the current filters',
    },
    fr: {
        // App navigation
        'app.title': 'Aperçu de la base de données IWAC',
        'tab.countries': 'Répartition par pays',
        'tab.languages': 'Langues',
        'tab.timeline': 'Chronologie',
        'tab.types': 'Répartition par type',
        'tab.categories': 'Catégories d\'index',
        'tab.words': 'Répartition des mots',
        
        // UI elements and status messages
        'ui.loading': 'Chargement de la base de données...',
        'ui.select_visualization': 'Sélectionnez une visualisation dans les onglets ci-dessus',
        'ui.toggle_language': 'Switch to English',
        
        // Visualization components
        'viz.summary': 'Résumé',
        'viz.total_items': 'Nombre total d\'éléments',
        'viz.number_of_categories': 'Nombre de catégories',
        'viz.top_categories': 'Principales catégories',
        'viz.filter_by_country': 'Filtrer par pays',
        'viz.filter_by_type': 'Filtrer par type',
        'viz.showing_items': 'Affichage de {0} éléments dans {1} langues',
        'viz.all_countries': 'Tous les pays',
        'viz.all_types': 'Tous les types',
        'viz.no_data': 'Aucune donnée disponible avec les filtres actuels',
    }
};

// Create a store for the current language
function createTranslationStore() {
    // Default language is English
    const { subscribe, set, update } = writable<Language>('en');
    
    return {
        subscribe,
        setLanguage: (language: Language) => set(language),
        toggleLanguage: () => update(currentLang => currentLang === 'en' ? 'fr' : 'en')
    };
}

export const language = createTranslationStore();

// Process a translation string with replacements
function processTranslation(text: string, replacements: string[] = []): string {
    return text.replace(/{(\d+)}/g, (match, index) => {
        const position = parseInt(index);
        return position < replacements.length ? replacements[position] : match;
    });
}

// Helper function to translate a key (not reactive, use with caution)
export function t(key: string, replacements: string[] = []): string {
    const currentLang = get(language);
    const translation = translations[currentLang]?.[key] || key;
    return processTranslation(translation, replacements);
}

// Create a derived store for reactive translations in components
export function translate(key: string, replacements: string[] = []) {
    return derived(language, ($language) => {
        const translation = translations[$language]?.[key] || key;
        return processTranslation(translation, replacements);
    });
} 