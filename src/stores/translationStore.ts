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
        'ui.show_description': 'Show description',
        'ui.hide_description': 'Hide description',
        'ui.no_visualization_content': 'No visualization content available',
        
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
        'viz.distribution_items': 'Distribution of {0} items by country and sub-collection',
        'viz.language_distribution_title': 'Language Distribution',
        'viz.language_distribution_items': 'Distribution of {0} items by language',
        'viz.language_distribution_description': 'This visualization shows the distribution of items by language. You can filter by country and item type to explore the language distribution across different segments of the collection.',
        'viz.publication_year': 'Publication Year',
        'viz.number_of_items': 'Number of Items',
        'viz.toggle_types': 'Toggle Types',
        'viz.toggled_type': 'Toggled type: {0}',
        'viz.languages': 'Languages',
        
        // Country distribution specific
        'viz.country_distribution_title': 'Country Distribution',
        'viz.country_distribution_description': 'This visualization shows the distribution of items by country and sub-collection. You can click on any country block to zoom in and see its sub-collections. The size of each block represents the number of items in that country or sub-collection.',
        'viz.country.items': 'Items',
        'viz.country.percent_parent': '% of Parent',
        'viz.country.percent_total': '% of Total',
        'viz.country.click_zoom_in': 'Click to zoom in',
        'viz.country.click_zoom_out': 'Click to zoom out',
        'viz.country.unknown': 'Unknown',
        'viz.country.no_set': 'No Set',
        'viz.countries': 'Countries',
        'viz.sub_collections': 'Sub-collections',
        
        // Common visualization elements
        'viz.currently_viewing': 'Currently viewing',
        'viz.click_back_to_return': 'Click the "Back to All" button to return to the full view',
        'viz.click_zoom_in': 'Click on a country block to zoom in',
        'viz.unknown': 'Unknown',
        'viz.no_set': 'No Set',

        // Word distribution specific
        'viz.word_distribution': 'Word Distribution',
        'viz.total_words': 'Total Words',
        'viz.avg_words_per_item': 'Average Words per Item',
        'viz.back_to_all': '← Back to All',
        'viz.total_items_with_word_count': 'Total items with word count',
        'viz.word_distribution_subtitle': 'Word Distribution by Country and Item Set ({0} items, {1} words)',
        'viz.words': 'words',
        'viz.items': 'items',
        'viz.percent_of_country': '% of country',
        'viz.percent_of_total': '% of total',
        'viz.item_set_summary': 'Item Set Summary',
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
        'ui.show_description': 'Afficher la description',
        'ui.hide_description': 'Masquer la description',
        'ui.no_visualization_content': 'Aucun contenu de visualisation disponible',
        
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
        'viz.distribution_items': 'Répartition de {0} éléments par pays et sous-collection',
        'viz.language_distribution_title': 'Répartition par langue',
        'viz.language_distribution_items': 'Répartition de {0} éléments par langue',
        'viz.language_distribution_description': 'Cette visualisation montre la répartition des éléments par langue. Vous pouvez filtrer par pays et par type d\'élément pour explorer la répartition des langues dans différents segments de la collection.',
        'viz.publication_year': 'Année de publication',
        'viz.number_of_items': 'Nombre d\'éléments',
        'viz.toggle_types': 'Basculer les types',
        'viz.toggled_type': 'Type basculé : {0}',
        'viz.languages': 'Langues',
        
        // Country distribution specific
        'viz.country_distribution_title': 'Répartition par pays',
        'viz.country_distribution_description': 'Cette visualisation montre la répartition des éléments par pays et sous-collection. Vous pouvez cliquer sur n\'importe quel bloc pays pour zoomer et voir ses sous-collections. La taille de chaque bloc représente le nombre d\'éléments dans ce pays ou cette sous-collection.',
        'viz.country.items': 'Éléments',
        'viz.country.percent_parent': '% du parent',
        'viz.country.percent_total': '% du total',
        'viz.country.click_zoom_in': 'Cliquer pour zoomer',
        'viz.country.click_zoom_out': 'Cliquer pour dézoomer',
        'viz.country.unknown': 'Inconnu',
        'viz.country.no_set': 'Sans ensemble',
        'viz.countries': 'Pays',
        'viz.sub_collections': 'Sous-collections',
        
        // Common visualization elements
        'viz.currently_viewing': 'Affichage actuel',
        'viz.click_back_to_return': 'Cliquez sur le bouton "Retour à tous" pour revenir à la vue complète',
        'viz.click_zoom_in': 'Cliquez sur un bloc pays pour zoomer',
        'viz.unknown': 'Inconnu',
        'viz.no_set': 'Sans ensemble',

        // Word distribution specific
        'viz.word_distribution': 'Répartition des mots',
        'viz.total_words': 'Nombre total de mots',
        'viz.avg_words_per_item': 'Moyenne de mots par élément',
        'viz.back_to_all': '← Retour à tous',
        'viz.total_items_with_word_count': 'Total des éléments avec nombre de mots',
        'viz.word_distribution_subtitle': 'Répartition des mots par pays et ensemble d\'éléments ({0} éléments, {1} mots)',
        'viz.words': 'mots',
        'viz.items': 'éléments',
        'viz.percent_of_country': '% du pays',
        'viz.percent_of_total': '% du total',
        'viz.item_set_summary': 'Résumé de l\'ensemble d\'éléments',
    }
};

// Create a store for the current language
function createTranslationStore() {
    // Default language is English
    const { subscribe, set, update } = writable<Language>('en');
    
    return {
        subscribe,
        setLanguage: (language: Language) => {
            console.log('[TranslationStore] Setting language to:', language);
            set(language);
        },
        toggleLanguage: () => update(currentLang => {
            const newLang = currentLang === 'en' ? 'fr' : 'en';
            console.log('[TranslationStore] Toggling language from', currentLang, 'to', newLang);
            return newLang;
        })
    };
}

export const language = createTranslationStore();

// Process a translation string with replacements
function processTranslation(text: string, replacements: string[] = []): string {
    console.log('[TranslationStore] Processing translation:', { text, replacements });
    const result = text.replace(/{(\d+)}/g, (match, index) => {
        const position = parseInt(index);
        return position < replacements.length ? replacements[position] : match;
    });
    console.log('[TranslationStore] Processed result:', result);
    return result;
}

// Helper function to translate a key (not reactive, use with caution)
export function t(key: string, replacements: string[] = []): string {
    const currentLang = get(language);
    console.log('[TranslationStore] t() translation lookup:', { key, currentLang, replacements });
    const translation = translations[currentLang]?.[key] || key;
    return processTranslation(translation, replacements);
}

// Create a derived store for reactive translations in components
export function translate(key: string, replacements: string[] = []) {
    console.log('[TranslationStore] Creating reactive translation for key:', key);
    return derived(language, ($language) => {
        console.log('[TranslationStore] Reactive translation update:', { key, language: $language });
        const translation = translations[$language]?.[key] || key;
        return processTranslation(translation, replacements);
    });
} 