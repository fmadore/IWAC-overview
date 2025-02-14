export interface OmekaItem {
    id: number;
    title: string;
    type: string;
    country: string;
    collection: string;
    language: string;
    keywords: string[];
    dateAdded: string;
    // Add more specific fields based on your items.json structure
}

export interface VisualizationData {
    items: OmekaItem[];
    loading: boolean;
    error: string | null;
} 