import type { OmekaItem } from '../types/OmekaItem';
import type { EChartsTreemapNode } from '../services/treemap/index';

// Function to process Omeka items into a hierarchical structure for the word distribution treemap
export function createWordDistributionHierarchy(items: OmekaItem[]): EChartsTreemapNode {
    if (!items || items.length === 0) {
        return { name: 'root', children: [] };
    }

    // Filter items: must have word_count > 0 and a country
    const filteredItems = items.filter(item => 
        item.word_count !== undefined && 
        item.word_count > 0 && 
        item.country
    );

    // Create hierarchical structure: Country -> Item Set -> Word Count / Item Count
    const countryMap = new Map<string, {
        words: number;
        items: number;
        sets: Map<string, { words: number; items: number }>;
    }>();

    filteredItems.forEach(item => {
        const country = item.country || 'Unknown'; // Use default if missing
        const set = item.item_set_title || 'No Set'; // Use default if missing
        const wordCount = item.word_count || 0;

        if (!countryMap.has(country)) {
            countryMap.set(country, { words: 0, items: 0, sets: new Map() });
        }
        const countryData = countryMap.get(country)!;
        countryData.words += wordCount;
        countryData.items += 1;

        if (!countryData.sets.has(set)) {
            countryData.sets.set(set, { words: 0, items: 0 });
        }
        const setData = countryData.sets.get(set)!;
        setData.words += wordCount;
        setData.items += 1;
    });

    // Convert map to TreemapNode structure
    const root: EChartsTreemapNode = {
        name: 'Word Distribution', // Root node name
        children: Array.from(countryMap.entries()).map(([countryName, countryData]) => ({
            name: countryName,
            value: countryData.words, // Add value for ECharts sizing
            wordCount: countryData.words,
            itemCount: countryData.items,
            children: Array.from(countryData.sets.entries()).map(([setName, setData]) => ({
                name: setName,
                value: setData.words, // Value used for treemap sizing
                wordCount: setData.words,
                itemCount: setData.items
            }))
        }))
    };

    // Sort countries and sets by word count (descending)
    if (root.children) {
        root.children.sort((a: EChartsTreemapNode, b: EChartsTreemapNode) => (b.wordCount || 0) - (a.wordCount || 0));
        root.children.forEach((country: EChartsTreemapNode) => {
            if (country.children) {
                country.children.sort((a: EChartsTreemapNode, b: EChartsTreemapNode) => (b.wordCount || 0) - (a.wordCount || 0));
            }
        });
    }

    return root;
}

// Add other data transformation functions here as needed... 