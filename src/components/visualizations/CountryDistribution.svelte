<script lang="ts">
    import { onMount, tick } from 'svelte';
    import * as d3 from 'd3';
    import { itemsStore } from '../../stores/itemsStore';
    import { log } from '../../utils/logger';
    import type { OmekaItem } from '../../types/OmekaItem';
    import { t, translate, languageStore } from '../../stores/translationStore';
    import BaseVisualization from './BaseVisualization.svelte';
    import { subcollectionCategories, subcollectionMapping, getCategoryForSubcollection, getTranslatedCategoryName } from '../../types/SubcollectionCategories';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';
    import { useD3Resize } from '../../hooks/useD3Resize';
    import { useDataProcessing } from '../../hooks/useDataProcessing';

    // Move all the interface definitions to the top
    interface Item {
        country: string;
        item_set_title: string;
        // add other properties if needed
    }
    
    interface HierarchyDatum {
        name: string;
        children?: HierarchyDatum[];
        value?: number;
        itemCount?: number;
        originalName?: string; // Store original name for data lookups
        categoryId?: string;   // Store category ID for subcollection grouping
        isCategory?: boolean;  // Flag to identify if this is a category node
    }

    // Initialize essential variables first
    let container: HTMLDivElement;
    let hierarchyData: HierarchyDatum = { name: 'root', children: [] };
    let root: d3.HierarchyNode<HierarchyDatum> | null = null;
    let currentLang: 'en' | 'fr' = 'en';
    let titleHtml = '';
    let totalItems = 0;
    let countryCount = 0;
    let subCollectionCount = 0;
    let categoryCount = 0;
    let searchResults: d3.HierarchyRectangularNode<HierarchyDatum>[] = [];
    let selectedNode: d3.HierarchyRectangularNode<HierarchyDatum> | null = null;
    let zoomedNode: d3.HierarchyRectangularNode<HierarchyDatum> | null = null;
    let searchQuery = '';
    let showLabels = true;
    
    // Store country colors to maintain consistency when zooming
    let countryColors: Map<string, string> = new Map();
    // Store category colors to maintain consistency
    let categoryColors: Map<string, string> = new Map();
    
    // Define translation keys
    const countryDescriptionKey = 'viz.country_distribution_description';
    
    // Create reactive translations
    const noDataText = translate('viz.no_data');
    const itemsText = translate('viz.items');
    const percentParentText = translate('viz.percent_of_country');
    const percentTotalText = translate('viz.percent_of_total');
    const clickZoomInText = translate('viz.click_zoom_in');
    const backToAllText = translate('viz.back_to_all');
    const unknownText = translate('viz.unknown');
    const noSetText = translate('viz.no_set');
    const summaryText = translate('viz.summary');
    const totalItemsText = translate('viz.total_items');
    const countriesText = translate('viz.countries');
    const categoriesText = translate('viz.categories');
    const subCollectionsText = translate('viz.sub_collections');
    const currentlyViewingText = translate('viz.currently_viewing');
    const clickBackText = translate('viz.click_back_to_return');
    
    // Initialize tooltip hook
    const { showTooltip, hideTooltip } = useTooltip({
        maxWidth: '250px',
        whiteSpace: 'nowrap'
    });
    
    // Initialize resize hook after container is bound
    let resizeHook: ReturnType<typeof useD3Resize>;
    let width = 0;
    let height = 0;
    
    // Store unsubscribe functions
    let languageUnsubscribe: () => void;
    
    // Initialize data processing hook with custom filter function
    const { filterItems, groupHierarchically } = useDataProcessing({
        filterMissingValues: true,
        requiredFields: ['country'],
        calculatePercentages: true,
        sortByCount: true,
        sortDescending: true
    });
    
    // Function to format numbers with spaces as thousands separator
    function formatNumber(num: number): string {
        // Use locale-specific formatting - in French/many European countries spaces are used
        return num.toLocaleString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
    }
    
    // Function to get the title with current count and proper formatting
    function updateTitleHtml() {
        if (!isMounted) return;
        
        try {
            if (totalItems > 0) {
                // Format the number with spaces as thousands separator
                const formattedCount = formatNumber(totalItems);
                // Use the current language's translation with the formatted count
                titleHtml = t('viz.distribution_items', { '0': formattedCount });
            } else {
                titleHtml = t('viz.country_distribution_title');
            }
        } catch (error) {
            console.error("Error updating title HTML:", error);
            // Set a fallback title
            titleHtml = "Country Distribution";
        }
    }

    // React to changes in the itemsStore
    $: if (isMounted && $itemsStore.items && $itemsStore.items.length > 0 && !totalItems) {
        // Force a reprocess of data when items change
        hierarchyData = processData($itemsStore.items as Item[]);
    }

    // Track if component is mounted
    let isMounted = false;

    // Initialize visualization when data changes
    $: if (isMounted && $itemsStore.items && container) {
        updateVisualization();
    }

    let initializationPromise: Promise<void>;

    onMount(() => {
        // Set mounted flag first
        isMounted = true;

        // Create initialization promise
        initializationPromise = (async () => {
            try {
                // Wait for the next tick to ensure container is bound
                await tick();
                
                // Double check container after tick
                if (!container) {
                    console.error('Container element not found in onMount');
                    return;
                }

                // Initialize resize hook
                resizeHook = useD3Resize({
                    container,
                    onResize: () => {
                        if (isMounted && container) {
                            // Get the latest dimensions from the resize hook
                            const { width: newWidth, height: newHeight } = resizeHook.dimensions;
                            width = newWidth;
                            height = newHeight;
                            
                            // Debug the new dimensions
                            console.log(`Resizing to ${width}x${height}`);
                            
                            // Force the visualization to redraw with new dimensions
                            if (width > 0 && height > 0) {
                                updateVisualization();
                            }
                        }
                    },
                    // Use shorter debounce delay for smoother resizing
                    debounceDelay: 50
                });
                
                // Subscribe to language changes
                languageUnsubscribe = languageStore.subscribe(value => {
                    if (!isMounted) return;
                    console.log("Language changed to:", value);
                    currentLang = value;
                    
                    if (container) {
                        updateTitleHtml();
                        
                        if ($itemsStore.items && $itemsStore.items.length > 0) {
                            const currentZoomedNode = zoomedNode;
                            const currentZoomedCountry = currentZoomedNode?.data.originalName;
                            
                            zoomedNode = null;
                            hierarchyData = processData($itemsStore.items as Item[]);
                            
                            if (currentZoomedNode && currentZoomedCountry) {
                                const newRoot = d3.hierarchy<HierarchyDatum>(hierarchyData);
                                const matchingNode = newRoot.children?.find(node => 
                                    node.data.originalName === currentZoomedCountry
                                );
                                
                                if (matchingNode) {
                                    zoomToNode(matchingNode);
                                    return;
                                }
                            }
                            
                            updateVisualization();
                        }
                    }
                });
                
                // Initialize data
                if ($itemsStore.items && $itemsStore.items.length > 0) {
                    hierarchyData = processData($itemsStore.items as Item[]);
                    
                    if (hierarchyData.children && hierarchyData.children.length > 0) {
                        const colorScale = d3.scaleOrdinal<string>()
                            .domain(hierarchyData.children.map(d => d.originalName || d.name))
                            .range(d3.schemeCategory10);
                            
                        hierarchyData.children.forEach(country => {
                            const originalName = country.originalName || country.name;
                            if (!countryColors.has(originalName)) {
                                countryColors.set(originalName, colorScale(originalName));
                            }
                        });
                    }
                    
                    // Get initial dimensions
                    const { width: initialWidth, height: initialHeight } = resizeHook.dimensions;
                    width = initialWidth;
                    height = initialHeight;
                    
                    // Wait for next tick before updating visualization
                    await tick();
                    if (container) {
                        updateVisualization();
                    }
                } else {
                    itemsStore.loadItems();
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        })();

        // Return cleanup function
        return () => {
            try {
                isMounted = false;
                
                if (resizeHook) {
                    resizeHook.cleanup();
                }
                
                if (languageUnsubscribe) {
                    languageUnsubscribe();
                }
                
                if (container) {
                    d3.select(container).selectAll('*').remove();
                }
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };
    });

    // Function to process data into hierarchical structure
    function processData(items: Item[]): HierarchyDatum {
        // Filter and group items hierarchically
        const hierarchicalData = groupHierarchically(
            items as unknown as OmekaItem[],
            [
                item => item.country || '',
                item => item.item_set_title || $noSetText
            ]
        );
        
        // Transform the hierarchical data to match our component's needs
        const root: HierarchyDatum = {
            name: "root",
            children: hierarchicalData.children.map(countryNode => {
                // Translate country name
                const translatedCountry = t(`country.${countryNode.name}`) || countryNode.name;
                
                // Group item sets by category
                const categoryMap = new Map<string, HierarchyDatum>();
                
                // Create category nodes
                Object.values(subcollectionCategories).forEach(category => {
                    categoryMap.set(category.id, {
                        name: getTranslatedCategoryName(category.id, currentLang),
                        children: [],
                        itemCount: 0,
                        originalName: category.id,
                        categoryId: category.id,
                        isCategory: true
                    });
                });
                
                // Assign item sets to categories
                if (countryNode.children) {
                    countryNode.children.forEach(itemSetNode => {
                        const categoryId = subcollectionMapping[itemSetNode.name] || 'other';
                        const category = categoryMap.get(categoryId);
                        
                        if (category?.children) {
                            category.children.push({
                                name: itemSetNode.name,
                                value: itemSetNode.value,
                                itemCount: itemSetNode.value,
                                originalName: itemSetNode.name,
                                categoryId
                            });
                            category.itemCount = (category.itemCount || 0) + itemSetNode.value;
                        }
                    });
                }
                
                // Filter and sort categories
                const nonEmptyCategories = Array.from(categoryMap.values())
                    .filter(category => category.children && category.children.length > 0)
                    .sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0));
                
                // Sort item sets within categories
                nonEmptyCategories.forEach(category => {
                    if (category.children) {
                        category.children.sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0));
                    }
                });
                
                return {
                    name: translatedCountry,
                    children: nonEmptyCategories,
                    itemCount: countryNode.value,
                    originalName: countryNode.name
                };
            })
        };

        // Update statistics
        totalItems = hierarchicalData.children.reduce((sum, country) => sum + country.value, 0);
        countryCount = hierarchicalData.children.length;
        categoryCount = Object.keys(subcollectionCategories).length;
        
        // Count total subcollections across all countries and categories
        subCollectionCount = 0;
        if (root.children) {
            root.children.forEach(country => {
                if (country.children) {
                    country.children.forEach(category => {
                        if (category.children) {
                            subCollectionCount += category.children.length;
                        }
                    });
                }
            });
        }
        
        updateTitleHtml();
        return root;
    }

    // Zoom to a node
    function zoomToNode(node: d3.HierarchyNode<HierarchyDatum> | null) {
        zoomedNode = node as d3.HierarchyRectangularNode<HierarchyDatum> | null;
        
        // When zooming to a node, ensure it has proper hierarchy data
        if (zoomedNode) {
            // Check if the node has children to zoom into
            if (!zoomedNode.children || zoomedNode.children.length === 0) {
                console.warn('Cannot zoom to node without children');
                return;
            }
            
            // Log the zoomed node for debugging
            console.log('Zooming to node:', zoomedNode.data.name, 'Original name:', zoomedNode.data.originalName, 'Is category:', zoomedNode.data.isCategory);
            
            // Update statistics for the zoomed node
            totalItems = zoomedNode.data.itemCount || 0;
            
            // If zooming to a country, count its categories
            if (!zoomedNode.data.isCategory) {
                // Count categories
                const categoryNodes = zoomedNode.children?.filter(child => child.data.isCategory) || [];
                categoryCount = categoryNodes.length;
                
                // Count subcollections across all categories
                subCollectionCount = 0;
                categoryNodes.forEach(category => {
                    if (category.children) {
                        subCollectionCount += category.children.length;
                    }
                });
            } 
            // If zooming to a category, count its subcollections
            else if (zoomedNode.data.isCategory) {
                subCollectionCount = zoomedNode.children?.length || 0;
                categoryCount = 1; // We're zoomed into a single category
            }
        } else {
            // Reset to global statistics when zooming out
            if ($itemsStore.items && $itemsStore.items.length > 0) {
                // Reprocess data to get fresh statistics
                hierarchyData = processData($itemsStore.items as Item[]);
                
                // Update counts from the processed data
                const validItems = ($itemsStore.items as Item[]).filter(item => item.country && item.country.trim() !== '');
                totalItems = validItems.length;
                
                // Recalculate country count
                const countryGroups = d3.group(validItems, (d) => d.country);
                countryCount = countryGroups.size;
                
                // Category count is fixed based on our defined categories
                categoryCount = Object.keys(subcollectionCategories).length;
                
                // Count total subcollections across all countries and categories
                subCollectionCount = 0;
                hierarchyData.children?.forEach(country => {
                    country.children?.forEach(category => {
                        if (category.children) {
                            subCollectionCount += category.children.length;
                        }
                    });
                });
            }
        }
        
        // Update the title to reflect the current view
        updateTitleHtml();
        
        updateVisualization();
    }

    // Create or update the visualization
    function updateVisualization() {
        try {
            if (!container) {
                console.error('Container element not found');
                return;
            }
            
            // Set margins first - reduce top margin to decrease space
            const margin = { top: 10, right: 10, bottom: 10, left: 10 };
            
            // Get fresh data if not zoomed
            if (!zoomedNode) {
                hierarchyData = processData($itemsStore.items as Item[]);
            }
            
            if (!hierarchyData.children || hierarchyData.children.length === 0) {
                d3.select(container).select('svg').remove();
                d3.select(container).append('div')
                    .attr('class', 'no-data')
                    .style('position', 'absolute')
                    .style('top', '50%')
                    .style('left', '50%')
                    .style('transform', 'translate(-50%, -50%)')
                    .style('text-align', 'center')
                    .style('color', 'var(--color-text-secondary)')
                    .text($noDataText);
                return;
            }
            
            // Remove previous visualization and messages
            d3.select(container).select('svg').remove();
            d3.select(container).select('.no-data').remove();
            
            // Get the latest container dimensions
            const containerRect = container.getBoundingClientRect();
            const chartWidth = containerRect.width - margin.left - margin.right;
            const chartHeight = containerRect.height - margin.top - margin.bottom;
            
            // Create responsive SVG with viewBox
            const svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');
            
            // Create chart group directly
            const chart = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
                
            // If zoomed in, add a button to zoom out but outside the title area
            if (zoomedNode) {
                const button = chart.append('g')
                    .attr('class', 'zoom-out-button cursor-pointer')
                    .attr('transform', `translate(0, 0)`)
                    .on('click', () => zoomToNode(null));
                    
                button.append('rect')
                    .attr('width', 100)
                    .attr('height', 20)
                    .attr('rx', 4)
                    .attr('fill', 'var(--color-primary)')
                    .attr('opacity', 0.8);
                    
                button.append('text')
                    .attr('x', 50)
                    .attr('y', 14)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', 'var(--font-size-sm)')
                    .text($backToAllText);
            }
            
            // Create treemap layout
            const treemap = d3.treemap<HierarchyDatum>()
                .size([chartWidth, chartHeight])
                .paddingOuter(4)
                .paddingTop(20)
                .paddingInner(2)
                .round(true);
            
            // Create hierarchy
            let localRoot: d3.HierarchyNode<HierarchyDatum>;
            
            if (zoomedNode) {
                // When zoomed in, create a new hierarchy from the zoomed node's children
                const zoomedData: HierarchyDatum = {
                    name: zoomedNode.data.name,
                    children: zoomedNode.data.children,
                    originalName: zoomedNode.data.originalName, // Preserve original name
                    isCategory: zoomedNode.data.isCategory,
                    categoryId: zoomedNode.data.categoryId
                };
                
                localRoot = d3.hierarchy<HierarchyDatum>(zoomedData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
            } else {
                localRoot = d3.hierarchy<HierarchyDatum>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
            }
            
            // Update the global root variable
            root = localRoot;
            
            // Apply treemap layout
            try {
                treemap(localRoot as d3.HierarchyRectangularNode<HierarchyDatum>);
            } catch (e) {
                console.error('Error applying treemap layout:', e);
                // If treemap fails, revert to full data view
                zoomedNode = null;
                hierarchyData = processData($itemsStore.items as Item[]);
                localRoot = d3.hierarchy<HierarchyDatum>(hierarchyData)
                    .sum(d => d.value || 0)
                    .sort((a, b) => (b.value || 0) - (a.value || 0));
                root = localRoot;
                treemap(localRoot as d3.HierarchyRectangularNode<HierarchyDatum>);
            }
            
            // Use the same color scheme as WordDistribution
            const countryColorScale = d3.scaleOrdinal<string>()
                .domain(localRoot.children ? localRoot.children.map(d => d.data.originalName || d.data.name) : [localRoot.data.originalName || localRoot.data.name])
                .range(d3.schemeCategory10);
                
            // Use a consistent color scheme for categories based on their ID
            const categoryColorScale = d3.scaleOrdinal<string>()
                .domain(Object.keys(subcollectionCategories))
                .range(d3.schemeSet3);
            
            // Determine what level we're at based on zoomed node
            const isCountryLevel = !zoomedNode;
            const isCategoryLevel = zoomedNode && !zoomedNode.data.isCategory;
            const isSubcollectionLevel = zoomedNode && zoomedNode.data.isCategory;
            
            // Create cells for countries (first level) - only if not zoomed
            if (isCountryLevel) {
                // Get all countries and their categories
                const countryNodes = localRoot.children || [];
                
                // Create a group for each country
                const countries = chart.selectAll('.country')
                    .data(countryNodes)
                    .enter()
                    .append('g')
                    .attr('class', 'country');
                
                // For each country, create category cells
                countries.each(function(countryNode) {
                    const countryGroup = d3.select(this);
                    const countryName = countryNode.data.name;
                    const countryOriginalName = countryNode.data.originalName || countryName;
                    
                    // Store country color for consistency
                    let countryColor: string;
                    if (countryColors.has(countryOriginalName)) {
                        countryColor = countryColors.get(countryOriginalName) || countryColorScale(countryOriginalName);
                    } else {
                        countryColor = countryColorScale(countryOriginalName);
                        countryColors.set(countryOriginalName, countryColor);
                    }
                    
                    // Get all category nodes for this country
                    const categoryNodes = countryNode.children || [];
                    
                    // Create category cells
                    const categories = countryGroup.selectAll('.category')
                        .data(categoryNodes)
                        .enter()
                        .append('g')
                        .attr('class', 'category')
                        .attr('transform', d => {
                            const x = (d as any).x0 || 0;
                            const y = (d as any).y0 || 0;
                            return `translate(${x},${y})`;
                        });
                    
                    // Add category background
                    categories.append('rect')
                        .attr('width', d => {
                            const x0 = (d as any).x0 || 0;
                            const x1 = (d as any).x1 || 0;
                            return Math.max(0, x1 - x0);
                        })
                        .attr('height', d => {
                            const y0 = (d as any).y0 || 0;
                            const y1 = (d as any).y1 || 0;
                            return Math.max(0, y1 - y0);
                        })
                        .attr('fill', d => {
                            // Use a color derived from the country color but influenced by category
                            const categoryId = d.data.categoryId || 'other';
                            const baseColor = d3.rgb(countryColor);
                            
                            // Store category color for this country-category combination
                            const categoryKey = `${countryOriginalName}-${categoryId}`;
                            let categoryColor: string;
                            
                            if (categoryColors.has(categoryKey)) {
                                categoryColor = categoryColors.get(categoryKey) || baseColor.toString();
                            } else {
                                // Create a variation of the country color based on the category
                                const categoryBaseColor = d3.rgb(categoryColorScale(categoryId));
                                // Blend the country color with the category color
                                const blendedColor = d3.rgb(
                                    (baseColor.r * 0.7) + (categoryBaseColor.r * 0.3),
                                    (baseColor.g * 0.7) + (categoryBaseColor.g * 0.3),
                                    (baseColor.b * 0.7) + (categoryBaseColor.b * 0.3)
                                );
                                categoryColor = blendedColor.toString();
                                categoryColors.set(categoryKey, categoryColor);
                            }
                            
                            return categoryColor;
                        })
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1.5)
                        .style('opacity', 0.8)
                        .attr('class', 'cursor-pointer')
                        .on('click', (event, d) => {
                            // When clicking on a category in the country view, zoom to the country
                            zoomToNode(countryNode);
                        })
                        .on('mouseover', function(event, d) {
                            // Show tooltip for categories
                            handleShowTooltip(event, d as any);
                        })
                        .on('mousemove', function(event, d) {
                            handleShowTooltip(event, d as any);
                        })
                        .on('mouseout', function() {
                            hideTooltip();
                        });
                    
                    // Add category labels
                    categories.append('text')
                        .attr('x', 5)
                        .attr('y', 15)
                        .attr('font-size', 'var(--font-size-xs)')
                        .attr('font-weight', 'bold')
                        .attr('fill', 'white')
                        .text(d => {
                            const width = (d as any).x1 - (d as any).x0;
                            // If width is too small, just show the name without item count
                            if (width < 100) return d.data.name;
                            // Otherwise show name with item count
                            return `${d.data.name} (${d.data.itemCount || 0})`;
                        })
                        .style('pointer-events', 'none')
                        .each(function(d) {
                            const self = d3.select(this);
                            const textLength = (this as SVGTextElement).getComputedTextLength();
                            const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                            
                            if (textLength > availableWidth) {
                                let text = d.data.name;
                                self.text(text);
                                
                                // Check if text fits and truncate if necessary
                                let currentTextLength = (this as SVGTextElement).getComputedTextLength();
                                let ellipsis = false;
                                
                                while (currentTextLength > availableWidth && text.length > 3) {
                                    text = text.slice(0, -1);
                                    self.text(text);
                                    currentTextLength = (this as SVGTextElement).getComputedTextLength();
                                    ellipsis = true;
                                }
                                
                                if (ellipsis) {
                                    self.text(text + '...');
                                }
                                
                                // Add tooltip with full name and item count
                                self.append('title')
                                    .text(`${countryName} > ${d.data.name} (${d.data.itemCount || 0} ${$itemsText})`);
                            }
                        });
                    
                    // Add country label at the top of the country group
                    // Find the bounding box of all categories in this country
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    categoryNodes.forEach(node => {
                        const x0 = (node as any).x0 || 0;
                        const y0 = (node as any).y0 || 0;
                        const x1 = (node as any).x1 || 0;
                        const y1 = (node as any).y1 || 0;
                        
                        minX = Math.min(minX, x0);
                        minY = Math.min(minY, y0);
                        maxX = Math.max(maxX, x1);
                        maxY = Math.max(maxY, y1);
                    });
                    
                    // Add a semi-transparent overlay for the country name
                    countryGroup.append('rect')
                        .attr('x', minX)
                        .attr('y', minY - 20) // Position above the categories
                        .attr('width', maxX - minX)
                        .attr('height', 20)
                        .attr('fill', countryColor)
                        .attr('opacity', 0.9)
                        .attr('class', 'cursor-pointer')
                        .on('click', (event) => {
                            zoomToNode(countryNode);
                        });
                    
                    // Add country name
                    countryGroup.append('text')
                        .attr('x', minX + 5)
                        .attr('y', minY - 6)
                        .attr('font-size', 'var(--font-size-sm)')
                        .attr('font-weight', 'bold')
                        .attr('fill', 'white')
                        .text(`${countryName} (${countryNode.data.itemCount || 0} ${$itemsText})`)
                        .style('pointer-events', 'none');
                });
            } else if (isCategoryLevel) {
                // When zoomed to a country, show its categories
                const categories = chart.selectAll('.category')
                    .data(localRoot.children || [])
                    .enter()
                    .append('g')
                    .attr('class', 'category')
                    .attr('transform', d => {
                        const x = (d as any).x0 || 0;
                        const y = (d as any).y0 || 0;
                        return `translate(${x},${y})`;
                    });
                
                // Get country color
                const countryOriginalName = zoomedNode?.data.originalName || zoomedNode?.data.name || '';
                const countryColor = countryColors.get(countryOriginalName) || countryColorScale(countryOriginalName);
                
                // Add category background
                categories.append('rect')
                    .attr('width', d => {
                        const x0 = (d as any).x0 || 0;
                        const x1 = (d as any).x1 || 0;
                        return Math.max(0, x1 - x0);
                    })
                    .attr('height', d => {
                        const y0 = (d as any).y0 || 0;
                        const y1 = (d as any).y1 || 0;
                        return Math.max(0, y1 - y0);
                    })
                    .attr('fill', d => {
                        // Use a color derived from the country color but influenced by category
                        const categoryId = d.data.categoryId || 'other';
                        const categoryKey = `${countryOriginalName}-${categoryId}`;
                        
                        if (categoryColors.has(categoryKey)) {
                            return categoryColors.get(categoryKey) || countryColor;
                        } else {
                            // Create a variation of the country color based on the category
                            const baseColor = d3.rgb(countryColor);
                            const categoryBaseColor = d3.rgb(categoryColorScale(categoryId));
                            // Blend the country color with the category color
                            const blendedColor = d3.rgb(
                                (baseColor.r * 0.7) + (categoryBaseColor.r * 0.3),
                                (baseColor.g * 0.7) + (categoryBaseColor.g * 0.3),
                                (baseColor.b * 0.7) + (categoryBaseColor.b * 0.3)
                            );
                            const categoryColor = blendedColor.toString();
                            categoryColors.set(categoryKey, categoryColor);
                            return categoryColor;
                        }
                    })
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .style('opacity', 0.8)
                    .attr('class', 'cursor-pointer')
                    .on('click', (event, d) => {
                        zoomToNode(d);
                    })
                    .on('mouseover', function(event, d) {
                        // Show tooltip for categories
                        handleShowTooltip(event, d as any);
                    })
                    .on('mousemove', function(event, d) {
                        handleShowTooltip(event, d as any);
                    })
                    .on('mouseout', function() {
                        hideTooltip();
                    });
                
                // Add category labels
                categories.append('text')
                    .attr('x', 5)
                    .attr('y', 15)
                    .attr('font-size', 'var(--font-size-sm)')
                    .attr('font-weight', 'bold')
                    .attr('fill', 'white')
                    .text(d => `${d.data.name} (${d.data.itemCount || 0} ${$itemsText})`)
                    .style('pointer-events', 'none')
                    .each(function(d) {
                        const self = d3.select(this);
                        const textLength = (this as SVGTextElement).getComputedTextLength();
                        const availableWidth = (d as any).x1 - (d as any).x0 - 10;
                        
                        if (textLength > availableWidth) {
                            self.text(d.data.name)
                                .append('title')
                                .text(`${d.data.name} (${d.data.itemCount || 0} ${$itemsText})`);
                        }
                    });
            } else if (isSubcollectionLevel && zoomedNode) {
                // When zoomed to a category, show its subcollections
                const subcollections = chart.selectAll('.subcollection')
                    .data(localRoot.children || [])
                    .enter()
                    .append('g')
                    .attr('class', 'subcollection')
                    .attr('transform', d => {
                        const x = (d as any).x0 || 0;
                        const y = (d as any).y0 || 0;
                        return `translate(${x},${y})`;
                    });
                
                // Get category color
                const categoryId = zoomedNode.data.categoryId || 'other';
                const countryNode = zoomedNode.parent;
                let categoryColor: string;
                
                if (countryNode) {
                    const countryOriginalName = countryNode.data.originalName || countryNode.data.name;
                    const categoryKey = `${countryOriginalName}-${categoryId}`;
                    categoryColor = categoryColors.get(categoryKey) || categoryColorScale(categoryId);
                } else {
                    categoryColor = categoryColorScale(categoryId);
                }
                
                // Add subcollection rectangles
                subcollections.append('rect')
                    .attr('width', d => {
                        const x0 = (d as any).x0 || 0;
                        const x1 = (d as any).x1 || 0;
                        return Math.max(0, x1 - x0);
                    })
                    .attr('height', d => {
                        const y0 = (d as any).y0 || 0;
                        const y1 = (d as any).y1 || 0;
                        return Math.max(0, y1 - y0);
                    })
                    .attr('fill', d => {
                        // Use a lighter shade of the category color
                        const baseColor = d3.rgb(categoryColor);
                        return d3.rgb(baseColor).brighter(0.5).toString();
                    })
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5)
                    .attr('class', 'cursor-pointer')
                    .on('mouseover', function(event, d) {
                        // Highlight on hover
                        d3.select(this)
                            .attr('stroke', 'var(--color-primary)')
                            .attr('stroke-width', 2);
                        
                        // Show tooltip
                        handleShowTooltip(event, d as any);
                    })
                    .on('mousemove', function(event, d) {
                        // Update tooltip position
                        handleShowTooltip(event, d as any);
                    })
                    .on('mouseout', function() {
                        // Remove highlight
                        d3.select(this)
                            .attr('stroke', 'white')
                            .attr('stroke-width', 0.5);
                        
                        // Hide tooltip
                        hideTooltip();
                    });
                
                // Add subcollection labels
                subcollections.append('text')
                    .attr('x', 3)
                    .attr('y', 13)
                    .attr('font-size', 'var(--font-size-xs)')
                    .attr('fill', 'var(--color-text-primary)')
                    .style('pointer-events', 'none')
                    .each(function(d) {
                        const self = d3.select(this);
                        const width = (d as any).x1 - (d as any).x0;
                        const height = (d as any).y1 - (d as any).y0;
                        
                        // Only add text if rectangle is big enough
                        if (width < 30 || height < 20) {
                            return;
                        }
                        
                        let text = d.data.name;
                        // Truncate text if too long
                        const availableWidth = width - 6;
                        
                        // Get the parent info for the tooltip
                        const country = countryNode ? countryNode.data.name : '';
                        const category = zoomedNode ? zoomedNode.data.name : '';
                        
                        let tooltipText = '';
                        if (country && category) {
                            tooltipText = `${country} > ${category} > ${d.data.name}: ${d.data.itemCount || d.value || 0} ${$itemsText}`;
                        } else if (category) {
                            tooltipText = `${category} > ${d.data.name}: ${d.data.itemCount || d.value || 0} ${$itemsText}`;
                        } else {
                            tooltipText = `${d.data.name}: ${d.data.itemCount || d.value || 0} ${$itemsText}`;
                        }
                        
                        self.text(text)
                            .append('title')
                            .text(tooltipText);
                        
                        // Check if text fits and truncate if necessary
                        const node = this as SVGTextElement;
                        let textLength = node.getComputedTextLength();
                        let ellipsis = false;
                        
                        while (textLength > availableWidth && text.length > 3) {
                            text = text.slice(0, -1);
                            self.text(text);
                            textLength = node.getComputedTextLength();
                            ellipsis = true;
                        }
                        
                        if (ellipsis) {
                            self.text(text + '...');
                            // Re-add the tooltip since it was lost when changing the text
                            self.append('title')
                                .text(tooltipText);
                        }
                    });
            }
        } catch (e) {
            console.error('Error in updateVisualization:', e);
        }
    }

    // Show tooltip with data - add error handling
    function handleShowTooltip(event: MouseEvent, d: d3.HierarchyRectangularNode<HierarchyDatum>) {
        try {
            // Determine the node type
            const isCountry = d.parent === root; // If parent is root, it's a country
            const isCategory = d.data.isCategory === true;
            const isSubcollection = !isCountry && !isCategory;
            
            if (isCountry) {
                // Country tooltip
                const countryName = d.data.name; // Already translated in processData
                const countryItems = d.data.itemCount || d.value || 0;
                const categories = d.children?.length || 0;
                const percentOfTotal = totalItems > 0 ? ((countryItems / totalItems) * 100).toFixed(1) + '%' : 'N/A';
                
                const content = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${countryName}
                    </div>
                    <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                        <span>${$itemsText}:</span>
                        <span class="text-right font-medium">${countryItems}</span>
                        <span>${$categoriesText}:</span>
                        <span class="text-right">${categories}</span>
                        <span>${$percentTotalText}:</span>
                        <span class="text-right">${percentOfTotal}</span>
                    </div>
                    <div style="margin-top:4px;font-style:italic;font-size:10px;">
                        ${$clickZoomInText}
                    </div>
                `;
                
                showTooltip(event, content, 250, 150);
            } else if (isCategory) {
                // Category tooltip
                const categoryName = d.data.name;
                const categoryItems = d.data.itemCount || d.value || 0;
                const subcollections = d.children?.length || 0;
                
                // Get parent country name
                const countryNode = d.parent;
                const countryName = countryNode ? countryNode.data.name : '';
                const countryItems = countryNode ? (countryNode.data.itemCount || countryNode.value || 0) : 0;
                
                // Calculate percentages
                const percentOfCountry = countryItems > 0 ? ((categoryItems / countryItems) * 100).toFixed(1) + '%' : 'N/A';
                const percentOfTotal = totalItems > 0 ? ((categoryItems / totalItems) * 100).toFixed(1) + '%' : 'N/A';
                
                const content = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${countryName} > ${categoryName}
                    </div>
                    <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                        <span>${$itemsText}:</span>
                        <span class="text-right font-medium">${categoryItems}</span>
                        <span>${$subCollectionsText}:</span>
                        <span class="text-right">${subcollections}</span>
                        <span>${$percentParentText}:</span>
                        <span class="text-right">${percentOfCountry}</span>
                        <span>${$percentTotalText}:</span>
                        <span class="text-right">${percentOfTotal}</span>
                    </div>
                    <div style="margin-top:4px;font-style:italic;font-size:10px;">
                        ${$clickZoomInText}
                    </div>
                `;
                
                showTooltip(event, content, 250, 150);
            } else {
                // Subcollection tooltip
                const subcollectionName = d.data.name;
                const itemCount = d.data.itemCount || d.value || 0;
                
                // Get parent category and country
                const categoryNode = d.parent;
                const countryNode = categoryNode?.parent;
                
                const categoryName = categoryNode ? categoryNode.data.name : '';
                const countryName = countryNode ? countryNode.data.name : '';
                
                const categoryItems = categoryNode ? (categoryNode.data.itemCount || categoryNode.value || 0) : 0;
                const countryItems = countryNode ? (countryNode.data.itemCount || countryNode.value || 0) : 0;
                
                // Calculate percentages
                const percentOfCategory = categoryItems > 0 ? ((itemCount / categoryItems) * 100).toFixed(1) + '%' : 'N/A';
                const percentOfCountry = countryItems > 0 ? ((itemCount / countryItems) * 100).toFixed(1) + '%' : 'N/A';
                const percentOfTotal = totalItems > 0 ? ((itemCount / totalItems) * 100).toFixed(1) + '%' : 'N/A';
                
                // Determine title based on available context
                let title = subcollectionName;
                if (categoryName && countryName) {
                    title = `${countryName} > ${categoryName} > ${subcollectionName}`;
                } else if (categoryName) {
                    title = `${categoryName} > ${subcollectionName}`;
                } else if (countryName) {
                    title = `${countryName} > ${subcollectionName}`;
                }
                
                // Determine which context to show
                const category = categoryName ? categoryName : null;
                const country = countryName ? countryName : null;
                
                const content = `
                    <div style="font-weight:bold;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:2px;">
                        ${title}
                    </div>
                    <div style="display:grid;grid-template-columns:auto auto;gap:4px;">
                        <span>${$itemsText}:</span>
                        <span class="text-right font-medium">${itemCount}</span>
                        ${category ? `<span>% of ${category}:</span>
                        <span class="text-right">${percentOfCategory}</span>` : ''}
                        ${country ? `<span>${$percentParentText}:</span>
                        <span class="text-right">${percentOfCountry}</span>` : ''}
                        <span>${$percentTotalText}:</span>
                        <span class="text-right">${percentOfTotal}</span>
                    </div>
                `;
                
                showTooltip(event, content, 250, 150);
            }
        } catch (e) {
            console.error('Error showing tooltip:', e);
        }
    }
</script>

<div class="flex flex-col gap-sm w-full h-full country-distribution-container">
    <BaseVisualization
        titleHtml={titleHtml}
        descriptionTranslationKey="viz.country_distribution_description"
        theme="default"
        className="country-distribution"
    >
        <div class="chart-container relative flex-1" bind:this={container}>
            {#if $itemsStore.loading}
                <div class="loading absolute inset-center text-secondary">{t('ui.loading')}</div>
            {:else if $itemsStore.error}
                <div class="error absolute inset-center text-error">{$itemsStore.error}</div>
            {:else if !$itemsStore.items || $itemsStore.items.length === 0}
                <div class="no-data absolute inset-center text-secondary">{$noDataText}</div>
            {:else if !container}
                <div class="loading absolute inset-center text-secondary">Initializing visualization...</div>
            {/if}
        </div>
        
        <div class="stats bg-card shadow rounded p-md">
            <div class="stat-summary">
                <h3 class="text-primary font-medium border-b pb-xs mb-sm">{$summaryText}</h3>
                <p class="text-sm text-secondary mb-xs">{$totalItemsText}: <strong class="font-medium">{formatNumber(totalItems)}</strong></p>
                {#if !zoomedNode}
                    <p class="text-sm text-secondary mb-xs">{$countriesText}: <strong class="font-medium">{formatNumber(countryCount)}</strong></p>
                {/if}
                <p class="text-sm text-secondary mb-xs">{$categoriesText}: <strong class="font-medium">{formatNumber(categoryCount)}</strong></p>
                <p class="text-sm text-secondary mb-xs">{$subCollectionsText}: <strong class="font-medium">{formatNumber(subCollectionCount)}</strong></p>
                {#if zoomedNode}
                    <p class="text-sm text-secondary mb-xs">{$currentlyViewingText}: <strong class="font-medium">{zoomedNode.data.name}</strong></p>
                    <p class="text-sm text-secondary mb-xs">{$clickBackText}</p>
                {:else}
                    <p class="text-sm text-secondary mb-xs">{$clickZoomInText}</p>
                {/if}
            </div>
        </div>
    </BaseVisualization>
</div>

<style>
    /* Only keep styles that can't be achieved with utility classes */
    
    /* Chart container minimum height */
    .chart-container {
        min-height: 450px;
        overflow: hidden;
    }
    
    /* Center positioning utility */
    :global(.inset-center) {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    
    /* Search highlight animation */
    :global(.search-highlight rect) {
        stroke: var(--color-primary) !important;
        stroke-width: 2px !important;
        stroke-dasharray: 5, 2;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { stroke-opacity: 0.6; }
        50% { stroke-opacity: 1; }
        100% { stroke-opacity: 0.6; }
    }
</style> 