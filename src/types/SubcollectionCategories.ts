export interface SubcollectionCategory {
    id: string;
    nameEn: string;
    nameFr: string;
    description?: string;
}

export interface SubcollectionMapping {
    [subcollectionName: string]: string; // Maps subcollection name to category ID
}

// Define the categories
export const subcollectionCategories: Record<string, SubcollectionCategory> = {
    'news_article': {
        id: 'news_article',
        nameEn: 'News article',
        nameFr: 'Article de presse',
        description: 'Newspaper and magazine articles'
    },
    'islamic_periodical': {
        id: 'islamic_periodical',
        nameEn: 'Islamic periodical',
        nameFr: 'Périodique islamique',
        description: 'Islamic magazines and periodicals'
    },
    'documents': {
        id: 'documents',
        nameEn: 'Documents',
        nameFr: 'Documents divers',
        description: 'Various documents'
    },
    'photographs': {
        id: 'photographs',
        nameEn: 'Photographs',
        nameFr: 'Photographies',
        description: 'Photographs and images'
    },
    'video_recording': {
        id: 'video_recording',
        nameEn: 'Video recording',
        nameFr: 'Enregistrement vidéo',
        description: 'Video recordings and footage'
    },
    'references': {
        id: 'references',
        nameEn: 'References',
        nameFr: 'Références',
        description: 'Reference materials'
    },
    'other': {
        id: 'other',
        nameEn: 'Other',
        nameFr: 'Autre',
        description: 'Uncategorized items'
    }
};

// Define the mapping of subcollections to categories
export const subcollectionMapping: SubcollectionMapping = {
    // News articles - Benin
    '24h au Bénin': 'news_article',
    'Agence Bénin Presse': 'news_article',
    'Banouto': 'news_article',
    'Bénin Intelligent': 'news_article',
    'Boulevard des Infos': 'news_article',
    'Daho-Express': 'news_article',
    'Ehuzu': 'news_article',
    'Fraternité': 'news_article',
    'L\'Evénement Précis': 'news_article',
    'La Nation': 'news_article',
    'La Nouvelle Tribune': 'news_article',
    'Le Matinal': 'news_article',
    'Les Pharaons': 'news_article',
    'Matin Libre': 'news_article',
    
    // News articles - Burkina Faso
    'Burkina 24': 'news_article',
    'Carrefour africain': 'news_article',
    'FasoZine': 'news_article',
    'L\'Evénement': 'news_article',
    'L\'Observateur': 'news_article',
    'L\'Observateur Paalga': 'news_article',
    'Le Pays': 'news_article',
    'LeFaso.net': 'news_article',
    'Mutations': 'news_article',
    'San Finna': 'news_article',
    'Sidwaya': 'news_article',
    
    // News articles - Ivory Coast
    'Agence Ivoirienne de Presse': 'news_article',
    'Fraternité Hebdo': 'news_article',
    'Fraternité Matin': 'news_article',
    'Ivoire Dimanche': 'news_article',
    'L\'Alternative': 'news_article',
    'L\'Intelligent d\'Abidjan': 'news_article',
    'La Voie': 'news_article',
    'Le Jour': 'news_article',
    'Le Jour Plus': 'news_article',
    'Le Nouvel Horizon': 'news_article',
    'Le Patriote': 'news_article',
    'Notre Temps': 'news_article',
    'Notre Voie': 'news_article',
    
    // News articles - Niger
    'Le Sahel': 'news_article',
    
    // News articles - Togo
    'Agence Togolaise de Presse': 'news_article',
    'Atopani Express': 'news_article',
    'Courrier du Golfe': 'news_article',
    'Forum Hebdo': 'news_article',
    'La Lettre de Tchaoudjo': 'news_article',
    'La Nouvelle Marche': 'news_article',
    'Le Démocrate': 'news_article',
    'L\'éveil du Peuple': 'news_article',
    'Togo-Presse': 'news_article',
    
    // Islamic periodicals
    'ASSALAM': 'islamic_periodical',
    'Islam Hebdo': 'islamic_periodical',
    'Al Mawadda': 'islamic_periodical',
    'An-Nasr Trimestriel': 'islamic_periodical',
    'An-Nasr Vendredi': 'islamic_periodical',
    'L\'Appel': 'islamic_periodical',
    'L\'Autre Regard': 'islamic_periodical',
    'La Preuve': 'islamic_periodical',
    'Le CERFIste': 'islamic_periodical',
    'Le vrai visage de l\'islam': 'islamic_periodical',
    'AJMCI Infos': 'islamic_periodical',
    'Al Minbar': 'islamic_periodical',
    'Al Muwassat Info': 'islamic_periodical',
    'Al-Azan': 'islamic_periodical',
    'Alif': 'islamic_periodical',
    'Allahou Akbar': 'islamic_periodical',
    'Bulletin d\'information du CNI': 'islamic_periodical',
    'Islam Info': 'islamic_periodical',
    'Les Échos de l\'AEEMCI': 'islamic_periodical',
    'Plume Libre': 'islamic_periodical',
    'Al Maoulid Info': 'islamic_periodical',
    'Al Maoulid Magazine': 'islamic_periodical',
    'Al Maoulid Magazine (arabe)': 'islamic_periodical',
    'Le Pacific': 'islamic_periodical',
    'Le Rendez-Vous': 'islamic_periodical',
    
    // Documents - using a pattern that includes the country name
    'Documents divers (Burkina Faso)': 'documents',
    'Documents divers (Bénin)': 'documents',
    'Documents divers (Côte d\'Ivoire)': 'documents',
    'Documents divers (Niger)': 'documents',
    'Documents divers (Togo)': 'documents',
    
    // Photographs
    'Photographies (Burkina Faso)': 'photographs',
    'Photographies (Bénin)': 'photographs',
    'Photographies (Côte d\'Ivoire)': 'photographs',
    'Photographies (Niger)': 'photographs',
    'Photographies (Togo)': 'photographs',
    
    // Video recordings
    'Collection de sermons islamiques sur vidéo': 'video_recording',
    
    // References
    'Références (Bénin)': 'references',
    'Références (Burkina Faso)': 'references',
    'Références (Côte d\'Ivoire)': 'references',
    'Références (Niger)': 'references',
    'Références (Nigéria)': 'references',
    'Références (Togo)': 'references',
};

// Helper function to get category for a subcollection
export function getCategoryForSubcollection(subcollectionName: string): SubcollectionCategory {
    const categoryId = subcollectionMapping[subcollectionName] || 'other';
    return subcollectionCategories[categoryId];
}

// Helper function to get translated category name based on language
export function getTranslatedCategoryName(categoryId: string, language: 'en' | 'fr'): string {
    const category = subcollectionCategories[categoryId] || subcollectionCategories['other'];
    return language === 'fr' ? category.nameFr : category.nameEn;
} 