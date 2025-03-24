import type { OmekaItem } from '../types/OmekaItem';
import * as d3 from 'd3';
import { t } from '../stores/translationStore';

/**
 * Interface for data processing options
 */
export interface DataProcessingOptions {
    /** Whether to filter out items with missing values */
    filterMissingValues?: boolean;
    /** Fields to check for missing values when filterMissingValues is true */
    requiredFields?: string[];
    /** Custom filter function to apply to items */
    filterFn?: (item: OmekaItem) => boolean;
    /** Whether to calculate percentages for numeric values */
    calculatePercentages?: boolean;
    /** Whether to sort results by count/value */
    sortByCount?: boolean;
    /** Whether to sort in descending order */
    sortDescending?: boolean;
}

/**
 * Interface for processed data with counts and percentages
 */
export interface ProcessedDataItem {
    /** The key/category being counted */
    key: string;
    /** The original key before translation */
    originalKey?: string;
    /** The count of items */
    count: number;
    /** The percentage of total items (if calculatePercentages is true) */
    percentage?: number;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Type for hierarchical data structure
 */
type HierarchicalData = {
    name: string;
    originalName: string;
    value: number;
    itemCount: number;
    percentage?: number;
    children?: HierarchicalData[];
};

/**
 * Type for nested group maps
 */
type NestedGroupMap = d3.InternMap<string, NestedGroupMap | OmekaItem[]>;

/**
 * Hook for processing visualization data with common patterns
 */
export function useDataProcessing(options: DataProcessingOptions = {}) {
    const {
        filterMissingValues = true,
        requiredFields = [],
        filterFn,
        calculatePercentages = true,
        sortByCount = true,
        sortDescending = true
    } = options;

    /**
     * Filter items based on the provided options
     */
    function filterItems(items: OmekaItem[]): OmekaItem[] {
        if (!items || items.length === 0) return [];

        let filtered = [...items];

        // Apply custom filter function if provided
        if (filterFn) {
            filtered = filtered.filter(filterFn);
        }

        // Filter out items with missing required fields
        if (filterMissingValues && requiredFields.length > 0) {
            filtered = filtered.filter(item => 
                requiredFields.every(field => 
                    item[field as keyof OmekaItem] !== undefined && 
                    item[field as keyof OmekaItem] !== null && 
                    item[field as keyof OmekaItem] !== ''
                )
            );
        }

        return filtered;
    }

    /**
     * Group items by a key and count them
     */
    function groupAndCount(
        items: OmekaItem[],
        keyFn: (item: OmekaItem) => string,
        totalItems?: number
    ): ProcessedDataItem[] {
        const filteredItems = filterItems(items);
        const actualTotal = totalItems || filteredItems.length;

        // Group items by key
        const groups = d3.rollup(
            filteredItems,
            v => v.length,
            keyFn
        );

        // Convert to array and calculate percentages
        const results: ProcessedDataItem[] = Array.from(groups, ([key, count]) => {
            const result: ProcessedDataItem = {
                key,
                count,
                originalKey: key
            };

            if (calculatePercentages) {
                result.percentage = (count / actualTotal) * 100;
            }

            return result;
        });

        // Sort results if requested
        if (sortByCount) {
            results.sort((a, b) => 
                sortDescending ? b.count - a.count : a.count - b.count
            );
        }

        return results;
    }

    /**
     * Group items by multiple keys (hierarchical grouping)
     */
    function groupHierarchically(
        items: OmekaItem[],
        keyFns: ((item: OmekaItem) => string)[],
        totalItems?: number
    ): { name: string; children: HierarchicalData[] } {
        const filteredItems = filterItems(items);
        const actualTotal = totalItems || filteredItems.length;

        // Create nested groups
        const groups = d3.group(filteredItems, ...keyFns) as unknown as NestedGroupMap;

        // Convert to hierarchical structure
        function convertToHierarchy(
            map: NestedGroupMap,
            level: number = 0
        ): HierarchicalData[] {
            return Array.from(map, ([key, value]) => {
                const result: HierarchicalData = {
                    name: key,
                    originalName: key,
                    value: value instanceof d3.InternMap ? 0 : value.length,
                    itemCount: value instanceof d3.InternMap ? 0 : value.length
                };

                if (calculatePercentages) {
                    result.percentage = (result.value / actualTotal) * 100;
                }

                if (value instanceof d3.InternMap) {
                    result.children = convertToHierarchy(value, level + 1);
                    // Calculate total value for parent nodes
                    result.value = result.children.reduce((sum, child) => sum + child.value, 0);
                    result.itemCount = result.value;
                }

                return result;
            });
        }

        return {
            name: 'root',
            children: convertToHierarchy(groups)
        };
    }

    /**
     * Process time-based data with monthly aggregation
     */
    function processTimeData(
        items: OmekaItem[],
        dateField: keyof OmekaItem,
        options: {
            startDate?: Date;
            endDate?: Date;
            includeCumulative?: boolean;
            initialTotal?: number;
        } = {}
    ): any[] {
        try {
            const filteredItems = filterItems(items);
            const { startDate, endDate, includeCumulative = true, initialTotal = 0 } = options;

            console.log('[useDataProcessing] Processing time data for', filteredItems.length, 'items');
            console.log('[useDataProcessing] Date range:', { startDate, endDate });
            if (initialTotal > 0) {
                console.log('[useDataProcessing] Using initial total of', initialTotal);
            }

            // Parse dates and filter by date range
            const validItems = filteredItems.filter(item => {
                try {
                    const dateStr = item[dateField] as string;
                    if (!dateStr) return false;
                    
                    const date = new Date(dateStr);
                    const isValid = !isNaN(date.getTime());
                    const isAfterStart = !startDate || date >= startDate;
                    const isBeforeEnd = !endDate || date <= endDate;
                    
                    return isValid && isAfterStart && isBeforeEnd;
                } catch (e) {
                    console.warn('[useDataProcessing] Error parsing date for item:', item);
                    return false;
                }
            });

            console.log('[useDataProcessing] Valid items after date filtering:', validItems.length);
            if (validItems.length > 0) {
                console.log('[useDataProcessing] Sample dates:', 
                    validItems.slice(0, 3).map(item => item[dateField]));
            } else {
                console.warn('[useDataProcessing] No valid items with dates in the specified range');
                return [];
            }

            // Group by month
            const monthlyData = d3.rollup(
                validItems,
                v => v.length,
                d => {
                    try {
                        const date = new Date(d[dateField] as string);
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    } catch (e) {
                        console.error('[useDataProcessing] Error formatting date for grouping:', e);
                        return 'unknown';
                    }
                }
            );

            // Filter out any 'unknown' entries
            if (monthlyData.has('unknown')) {
                console.warn('[useDataProcessing] Removing unknown date entries');
                monthlyData.delete('unknown');
            }

            // Convert to array and sort by date
            const results = Array.from(monthlyData, ([month, count]) => {
                try {
                    const [year, monthNum] = month.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    
                    return {
                        date,
                        month,
                        monthFormatted: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                        count,
                        total: 0, // Will be calculated if includeCumulative is true
                        percentage: (count / validItems.length) * 100
                    };
                } catch (e) {
                    console.error('[useDataProcessing] Error parsing month data:', e);
                    return null;
                }
            })
            .filter(item => item !== null) // Filter out null entries
            .sort((a, b) => a!.date.getTime() - b!.date.getTime()) as any[];

            // Fill in missing months if needed
            if (results.length > 1) {
                const filledResults = [];
                const startMonth = results[0].date;
                const endMonth = results[results.length - 1].date;
                
                // Create date range iterator
                let currentDate = new Date(startMonth);
                while (currentDate <= endMonth) {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                    
                    // Find if this month exists in results
                    const existingMonth = results.find(r => r.month === currentMonthKey);
                    
                    if (existingMonth) {
                        filledResults.push(existingMonth);
                    } else {
                        // Add a zero entry for this month
                        filledResults.push({
                            date: new Date(year, month),
                            month: currentMonthKey,
                            monthFormatted: new Date(year, month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                            count: 0,
                            total: 0,
                            percentage: 0
                        });
                    }
                    
                    // Move to next month
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                
                // Replace results with filled version
                if (filledResults.length > results.length) {
                    console.log('[useDataProcessing] Filled in missing months:', 
                        filledResults.length - results.length);
                    results.length = 0;
                    results.push(...filledResults);
                }
            }

            // Calculate cumulative totals if requested
            if (includeCumulative) {
                let runningTotal = initialTotal; // Start with the initial total
                results.forEach(item => {
                    runningTotal += item.count;
                    item.total = runningTotal;
                });
            }

            console.log('[useDataProcessing] Processed timeline data:', results.length, 'data points');
            return results;
        } catch (error) {
            console.error('[useDataProcessing] Error processing time data:', error);
            return [];
        }
    }

    return {
        filterItems,
        groupAndCount,
        groupHierarchically,
        processTimeData
    };
} 