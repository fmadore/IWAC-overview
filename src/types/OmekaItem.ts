export interface OmekaItem {
    id: number;
    title: string;
    description?: string;
    type?: string;
    country?: string;
    language?: string;
    publication_date?: string;
    created_date?: string;
    item_set_title?: string;
    word_count?: number;
    [key: string]: any; // Allow for additional properties
}

export interface VisualizationData {
    items: OmekaItem[];
    loading: boolean;
    error: string | null;
} 