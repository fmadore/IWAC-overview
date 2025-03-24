import { writable, derived, get, type Readable } from 'svelte/store';
import type { 
    Language, 
    TranslationKeys, 
    TranslationParams, 
    TranslationStore,
    TranslationFunction,
    ReactiveTranslationFunction 
} from '../types/translations';

// Define translations for English and French
const translations: Record<Language, Record<string, string>> = {
    en: {
        // App navigation
        'app.title': '<i>Islam West Africa Collection</i> Overview',
        'tab.countries': 'Country distribution',
        'tab.languages': 'Languages',
        'tab.timeline': 'Collection growth',
        'tab.types': 'Type distribution',
        'tab.categories': 'Index',
        'tab.words': 'Word count',
        
        // UI elements and status messages
        'ui.loading': 'Loading database...',
        'ui.select_visualization': 'Select a visualization from the tabs above',
        'ui.toggle_language': 'Français',
        'ui.show_description': 'Show description',
        'ui.hide_description': 'Hide description',
        'ui.no_visualization_content': 'No visualization content available',
        'ui.enter_fullscreen': 'Enter fullscreen mode',
        'ui.exit_fullscreen': 'Exit fullscreen mode',
        'ui.download_visualization': 'Download visualization',
        
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
        'viz.chart_type': 'Chart Type',
        'viz.pie_chart': 'Switch to Pie Chart',
        'viz.donut_chart': 'Switch to Donut Chart',
        
        // Timeline distribution specific
        'viz.growth_since_april_title': 'Growth Since April 2024',
        'viz.growth_since_april': 'Growth of {0} items since April 2024',
        'viz.growth_since_april_description': 'This visualization shows the growth of the database since April 2024. The blue line represents monthly additions, while the green dotted line shows the cumulative total. You can filter by country and item type to explore growth patterns.',
        'viz.time_period': 'Time period',
        'viz.avg_monthly_additions': 'Average monthly additions',
        'viz.peak_growth_months': 'Peak Growth Months',
        'viz.showing_items_over_months': 'Showing {0} items over {1} months',
        'viz.months': 'months',
        'viz.monthly_additions': 'Monthly Additions',
        'viz.month': 'Month',
        'viz.new_items': 'New Items',
        'viz.percentage': 'Percentage',
        
        'viz.publication_year': 'Publication Year',
        'viz.year': 'Year',
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
        'viz.avg_words_per_item': 'Average words per Item',
        'viz.back_to_all': '← Back to All',
        'viz.total_items_with_word_count': 'Total items with word count',
        'viz.word_distribution_subtitle': 'Word Distribution by Country and Item Set ({0} items, {1} words)',
        'viz.word_distribution_description': 'This visualization shows the distribution of words across items by country and collection. The size of each block represents the word count in that country or collection.',
        'viz.words': 'words',
        'viz.items': 'items',
        'viz.percent_of_country': '% of country',
        'viz.percent_of_total': '% of total',
        'viz.item_set_summary': 'Item Set Summary',
        
        // Language translations
        'lang.Français': 'French',
        'lang.Anglais': 'English',
        'lang.Haoussa': 'Hausa',
        'lang.Allemand': 'German',
        'lang.Arabe': 'Arabic',
        'lang.Italien': 'Italian',
        'lang.Dendi': 'Dendi',
        'lang.Slovène': 'Slovenian',
        'lang.Espagnol': 'Spanish',
        
        // Country translations
        'country.all': 'All Countries',
        'country.Bénin': 'Benin',
        'country.Nigéria': 'Nigeria',
        'country.Côte d\'Ivoire': 'Côte d\'Ivoire',
        'country.Burkina Faso': 'Burkina Faso',
        'country.Togo': 'Togo',
        'country.Niger': 'Niger',
        'country.Unknown': 'Unknown',
        
        // Item type translations
        'type.Article de presse': 'Press article',
        'type.Notice d\'autorité': 'Authority record',
        'type.Périodique islamique': 'Islamic periodical',
        'type.Unknown': 'Unknown',
        'type.Article de revue': 'Journal article',
        'type.Document': 'Document',
        'type.Article de blog': 'Blog post',
        'type.Chapitre de livre': 'Book chapter',
        'type.Livre': 'Book',
        'type.Thèse de doctorat': 'Doctoral thesis',
        'type.Communication scientifique': 'Scientific communication',
        'type.Article d\'encyclopédie': 'Encyclopedia article',
        'type.Compte rendu de livre': 'Book review',
        'type.Enregistrement vidéo': 'Video recording',
        'type.Mémoire de licence': 'Bachelor\'s thesis',
        'type.Mémoire de maitrise': 'Master\'s thesis',
        'type.Photographie': 'Photograph',
        'type.Rapport': 'Report',
        'type.Working paper': 'Working paper',
        'type.all': 'All types',

        // Index distribution specific
        'viz.index_distribution_title': 'Index Distribution',
        'viz.index_distribution_items': 'Distribution of {0} index items by category',
        'viz.index_distribution_description': 'This visualization shows the distribution of index items by category. The size of each bar represents the number of items in that category. Index items are authority records that serve as reference points in the database.',
        'viz.categories': 'Categories',
        'viz.uncategorized': 'Uncategorized',
        
        // Type distribution specific
        'viz.type_distribution_title': 'Type Distribution',
        'viz.type_distribution_items': 'Distribution of {0} items by type',
        'viz.type_distribution_description': 'This visualization shows the distribution of items by type over time. You can filter by country and year range to explore how different types of items have been published over time.',
        'viz.types': 'Types',
        'viz.published_between': 'published between {0} and {1}',
        'viz.type': 'Type',
        'viz.count': 'Count',
        'viz.others': 'Others',
        
        // Category translations
        'category.Events': 'Events',
        'category.Locations': 'Locations',
        'category.Organizations': 'Organizations',
        'category.Persons': 'Persons',
        'category.Topics': 'Topics',
        'category.Authority Files': 'Authority files',
    },
    fr: {
        // App navigation
        'app.title': 'Aperçu de la <i>Collection Islam Afrique de l\'Ouest</i>',
        'tab.countries': 'Répartition par pays',
        'tab.languages': 'Langues',
        'tab.timeline': 'Croissance collection',
        'tab.types': 'Répartition par type',
        'tab.categories': 'Index',
        'tab.words': 'Nombre de mots',
        
        // UI elements and status messages
        'ui.loading': 'Chargement de la base de données...',
        'ui.select_visualization': 'Sélectionnez une visualisation dans les onglets ci-dessus',
        'ui.toggle_language': 'English',
        'ui.show_description': 'Afficher la description',
        'ui.hide_description': 'Masquer la description',
        'ui.no_visualization_content': 'Aucun contenu de visualisation disponible',
        'ui.enter_fullscreen': 'Passer en mode plein écran',
        'ui.exit_fullscreen': 'Quitter le mode plein écran',
        'ui.download_visualization': 'Télécharger la visualisation',
        
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
        'viz.chart_type': 'Type de graphique',
        'viz.pie_chart': 'Passer au graphique en secteurs',
        'viz.donut_chart': 'Passer au graphique en anneau',
        
        // Timeline distribution specific
        'viz.growth_since_april_title': 'Croissance depuis avril 2024',
        'viz.growth_since_april': 'Croissance de {0} éléments depuis avril 2024',
        'viz.growth_since_april_description': 'Cette visualisation montre la croissance de la base de données depuis avril 2024. La ligne bleue représente les ajouts mensuels, tandis que la ligne pointillée verte montre le total cumulatif. Vous pouvez filtrer par pays et par type d\'élément pour explorer les modèles de croissance.',
        'viz.time_period': 'Période',
        'viz.avg_monthly_additions': 'Ajouts mensuels moyens',
        'viz.peak_growth_months': 'Mois de croissance maximale',
        'viz.showing_items_over_months': 'Affichage de {0} éléments sur {1} mois',
        'viz.months': 'mois',
        'viz.monthly_additions': 'Ajouts mensuels',
        'viz.month': 'Mois',
        'viz.new_items': 'Nouveaux Éléments',
        'viz.percentage': 'Pourcentage',
        
        'viz.publication_year': 'Année de publication',
        'viz.year': 'Année',
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
        'viz.word_distribution_description': 'Cette visualisation montre la répartition des mots dans les éléments par pays et collection. La taille de chaque bloc représente le nombre de mots dans ce pays ou cette collection.',
        'viz.words': 'mots',
        'viz.items': 'éléments',
        'viz.percent_of_country': '% du pays',
        'viz.percent_of_total': '% du total',
        'viz.item_set_summary': 'Résumé de l\'ensemble d\'éléments',
        
        // Language translations
        'lang.Français': 'Français',
        'lang.Anglais': 'Anglais',
        'lang.Haoussa': 'Haoussa',
        'lang.Allemand': 'Allemand',
        'lang.Arabe': 'Arabe',
        'lang.Italien': 'Italien',
        'lang.Dendi': 'Dendi',
        'lang.Slovène': 'Slovène',
        'lang.Espagnol': 'Espagnol',
        
        // Country translations
        'country.all': 'Tous les pays',
        'country.Bénin': 'Bénin',
        'country.Nigéria': 'Nigéria',
        'country.Côte d\'Ivoire': 'Côte d\'Ivoire',
        'country.Burkina Faso': 'Burkina Faso',
        'country.Togo': 'Togo',
        'country.Niger': 'Niger',
        'country.Unknown': 'Inconnu',
        
        // Item type translations
        'type.Article de presse': 'Article de presse',
        'type.Notice d\'autorité': 'Notice d\'autorité',
        'type.Périodique islamique': 'Périodique islamique',
        'type.Unknown': 'Inconnu',
        'type.Article de revue': 'Article de revue',
        'type.Document': 'Document',
        'type.Article de blog': 'Article de blog',
        'type.Chapitre de livre': 'Chapitre de livre',
        'type.Livre': 'Livre',
        'type.Thèse de doctorat': 'Thèse de doctorat',
        'type.Communication scientifique': 'Communication scientifique',
        'type.Article d\'encyclopédie': 'Article d\'encyclopédie',
        'type.Compte rendu de livre': 'Compte rendu de livre',
        'type.Enregistrement vidéo': 'Enregistrement vidéo',
        'type.Mémoire de licence': 'Mémoire de licence',
        'type.Mémoire de maitrise': 'Mémoire de maitrise',
        'type.Photographie': 'Photographie',
        'type.Rapport': 'Rapport',
        'type.Working paper': 'Working paper',
        'type.all': 'Tous les types',

        // Index distribution specific
        'viz.index_distribution_title': 'Répartition des index',
        'viz.index_distribution_items': 'Répartition de {0} éléments d\'index par catégorie',
        'viz.index_distribution_description': 'Cette visualisation montre la répartition des éléments d\'index par catégorie. La taille de chaque barre représente le nombre d\'éléments dans cette catégorie. Les éléments d\'index sont des notices d\'autorité qui servent de points de référence dans la base de données.',
        'viz.categories': 'Catégories',
        'viz.uncategorized': 'Non catégorisé',
        
        // Type distribution specific
        'viz.type_distribution_title': 'Répartition par type',
        'viz.type_distribution_items': 'Répartition de {0} éléments par type',
        'viz.type_distribution_description': 'Cette visualisation montre la répartition des éléments par type au fil du temps. Vous pouvez filtrer par pays et par plage d\'années pour explorer comment différents types d\'éléments ont été publiés au fil du temps.',
        'viz.types': 'Types',
        'viz.published_between': 'publiés entre {0} et {1}',
        'viz.type': 'Type',
        'viz.count': 'Nombre',
        'viz.others': 'Autres',
        
        // Category translations
        'category.Events': 'Événements',
        'category.Locations': 'Lieux',
        'category.Organizations': 'Organisations',
        'category.Persons': 'Personnes',
        'category.Topics': 'Sujets',
        'category.Authority Files': 'Notices d\'autorité',
    }
};

// Create a store for the current language
function createTranslationStore(): TranslationStore {
    const { subscribe, set, update } = writable<Language>('en');
    
    // Check if we're in development mode (non-production build)
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    return {
        subscribe,
        setLanguage: (language: Language) => {
            // Only log language changes in development
            if (isDevelopment) {
                console.log('[Translation] Language changed to:', language);
            }
            set(language);
        },
        toggleLanguage: () => update(currentLang => {
            const newLang = currentLang === 'en' ? 'fr' : 'en';
            return newLang;
        })
    };
}

// Create and export the language store
export const languageStore = createTranslationStore();

// Process a translation string with replacements
function processTranslation(text: string, params?: TranslationParams): string {
    if (!params) return text;
    
    return text.replace(/{(\d+)}/g, (match, index) => {
        const position = parseInt(index);
        return position < Object.keys(params).length ? params[position].toString() : match;
    });
}

// Helper function to translate a key (not reactive, use with caution)
export const t: TranslationFunction = (key: string, params?: TranslationParams): string => {
    const currentLang = get(languageStore);
    const translation = translations[currentLang]?.[key] || key;
    return processTranslation(translation, params);
};

// Create a derived store for reactive translations in components
export const translate: ReactiveTranslationFunction = (key: string, params?: TranslationParams) => {
    return derived(languageStore, ($language) => {
        const translation = translations[$language]?.[key] || key;
        return processTranslation(translation, params);
    });
}; 