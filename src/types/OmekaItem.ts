export interface OmekaItem {
    id: number;
    title: string;
    type: string;
    country: string;
    collection: string;
    language: string;
    keywords: string[];
    dateAdded: string;
    created_date: string; // Date when the item was created in the database
    item_set_title: string;
    publication_date?: string; // Date when the item was published (YYYY, YYYY-MM, or YYYY-MM-DD format)
    word_count?: number; // Count of words in the item
    // Add more specific fields based on your items.json structure
}

export interface VisualizationData {
    items: OmekaItem[];
    loading: boolean;
    error: string | null;
} 