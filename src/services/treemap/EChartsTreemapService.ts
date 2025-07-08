import * as echarts from 'echarts';

export interface EChartsTreemapNode {
    name: string;
    value?: number;
    children?: EChartsTreemapNode[];
    wordCount?: number;
    itemCount?: number;
    [key: string]: any;
}

export interface EChartsTreemapOptions {
    width?: number;
    height?: number;
    colors?: string[];
    enableZoom?: boolean;
    showBreadcrumb?: boolean;
    roam?: boolean | string;
    onNodeClick?: (params: any) => void;
    onTooltip?: (params: any) => string;
    labelOptions?: {
        show?: boolean;
        fontSize?: number;
        fontWeight?: string | number;
        color?: string;
    };
    responsive?: boolean;
}

export class EChartsTreemapService {
    private chart: echarts.ECharts | null = null;
    private container: HTMLElement;
    private currentOptions: EChartsTreemapOptions;
    private resizeObserver: ResizeObserver | null = null;
    private isInitialized: boolean = false;
    private isDisposed: boolean = false;

    constructor(container: HTMLElement, options: EChartsTreemapOptions = {}) {
        this.container = container;
        this.currentOptions = {
            width: 800,
            height: 500,
            enableZoom: true,
            showBreadcrumb: true,
            roam: false,
            labelOptions: {
                show: true,
                fontSize: 12,
                fontWeight: 'normal',
                color: '#333'
            },
            responsive: true,
            ...options
        };
    }

    /**
     * Crée ou met à jour la visualisation treemap
     */
    render(data: EChartsTreemapNode): echarts.ECharts {
        if (this.isDisposed) {
            console.warn('Cannot render on disposed service');
            throw new Error('Service has been disposed');
        }

        // Vérifier que le conteneur est valide et visible
        if (!this.container || !this.container.isConnected) {
            console.warn('Container is not connected to DOM');
            throw new Error('Container is not connected to DOM');
        }

        // Vérifier les dimensions du conteneur
        const containerRect = this.container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.warn('Container has zero dimensions, cannot render chart');
            // Ne pas essayer de re-rendre automatiquement pour éviter les boucles infinies
            return this.chart || ({} as echarts.ECharts);
        }

        try {
            // Nettoyer le graphique existant seulement si nécessaire
            if (this.chart && this.isInitialized) {
                this.chart.clear();
            } else if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }

            // Initialiser le graphique ECharts seulement si pas encore fait
            if (!this.chart) {
                this.chart = echarts.init(this.container, null, {
                    width: this.currentOptions.width || containerRect.width,
                    height: this.currentOptions.height || containerRect.height,
                    renderer: 'svg', // Utiliser SVG pour de meilleures performances en production
                    devicePixelRatio: window.devicePixelRatio || 1
                });
            }

            // Configuration des options ECharts
            const option: any = this.buildChartOptions(data);

            // Définir les options avec gestion d'erreur
            this.chart.setOption(option, !this.isInitialized);

            // Gérer les événements de clic seulement si pas encore attachés
            if (!this.isInitialized && this.currentOptions.onNodeClick) {
                this.chart.on('click', this.currentOptions.onNodeClick);
            }

            // Gérer le redimensionnement responsive seulement lors de la première initialisation
            if (!this.isInitialized && this.currentOptions.responsive) {
                this.setupResponsive();
            }

            this.isInitialized = true;
            return this.chart;

        } catch (error) {
            console.error('Error rendering treemap:', error);
            // En cas d'erreur, nettoyer et re-essayer une seule fois
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
                this.isInitialized = false;
            }
            throw error;
        }
    }

    /**
     * Met à jour les données sans recréer le graphique
     */
    updateData(data: EChartsTreemapNode): void {
        if (!this.chart || this.isDisposed) {
            console.warn('Chart not initialized or disposed, call render() first');
            return;
        }

        try {
            this.chart.setOption({
                series: [{
                    data: data.children || [data]
                }]
            }, false); // Merge the data instead of replacing
        } catch (error) {
            console.error('Error updating chart data:', error);
            // En cas d'erreur, essayer de re-rendre complètement
            this.render(data);
        }
    }

    /**
     * Met à jour les options
     */
    updateOptions(options: Partial<EChartsTreemapOptions>): void {
        this.currentOptions = { ...this.currentOptions, ...options };
        
        if (this.chart) {
            // Redimensionner si nécessaire
            if (options.width || options.height) {
                this.chart.resize({
                    width: this.currentOptions.width,
                    height: this.currentOptions.height
                });
            }
        }
    }

    /**
     * Zoom vers un noeud spécifique
     */
    zoomToNode(nodeId: string): void {
        if (!this.chart) return;
        
        this.chart.dispatchAction({
            type: 'treemapZoomToNode',
            seriesId: 'treemap-visualization',
            targetNodeId: nodeId
        });
    }

    /**
     * Revenir à la vue racine
     */
    zoomOut(): void {
        if (!this.chart) return;
        
        this.chart.dispatchAction({
            type: 'treemapRootToNode',
            seriesId: 'treemap-visualization'
        });
    }

    /**
     * Redimensionne le graphique
     */
    resize(): void {
        if (this.chart && !this.isDisposed) {
            try {
                // Vérifier que le conteneur est toujours connecté
                if (!this.container.isConnected) {
                    console.warn('Cannot resize: container is not connected to DOM');
                    return;
                }
                
                this.chart.resize();
            } catch (error) {
                console.warn('Error during chart resize:', error);
            }
        }
    }

    /**
     * Détruit le graphique et nettoie les ressources
     */
    destroy(): void {
        if (this.isDisposed) return;
        
        this.isDisposed = true;
        
        // Nettoyer le ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Nettoyer le graphique ECharts
        if (this.chart) {
            try {
                this.chart.dispose();
            } catch (error) {
                console.warn('Error disposing chart:', error);
            }
            this.chart = null;
        }
        
        this.isInitialized = false;
    }

    /**
     * Obtient l'instance ECharts
     */
    getChart(): echarts.ECharts | null {
        return this.chart;
    }

    /**
     * Formatter de tooltip par défaut
     */
    private defaultTooltipFormatter = (params: any): string => {
        const data = params.data;
        if (!data) return '';

        let tooltip = `<strong>${data.name}</strong><br/>`;
        
        if (data.wordCount !== undefined) {
            tooltip += `Mots: ${data.wordCount.toLocaleString()}<br/>`;
        }
        
        if (data.itemCount !== undefined) {
            tooltip += `Éléments: ${data.itemCount.toLocaleString()}<br/>`;
        }
        
        if (data.value !== undefined) {
            tooltip += `Valeur: ${data.value.toLocaleString()}`;
        }

        return tooltip;
    };

    /**
     * Configuration du redimensionnement responsive
     */
    private setupResponsive(): void {
        if (!this.chart || this.resizeObserver) return;

        let lastWidth = 0;
        let lastHeight = 0;
        let resizeTimeout: number | null = null;

        this.resizeObserver = new ResizeObserver((entries) => {
            if (this.isDisposed || !this.chart) return;

            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                
                // Seulement redimensionner si les dimensions ont vraiment changé
                if (Math.abs(width - lastWidth) > 5 || Math.abs(height - lastHeight) > 5) {
                    lastWidth = width;
                    lastHeight = height;
                    
                    // Débouncer les événements de redimensionnement
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    
                    resizeTimeout = setTimeout(() => {
                        if (!this.isDisposed && this.chart) {
                            try {
                                this.chart.resize();
                            } catch (error) {
                                console.warn('Error during chart resize:', error);
                            }
                        }
                    }, 150);
                }
            }
        });

        this.resizeObserver.observe(this.container);
    }

    /**
     * Construit les options de configuration pour ECharts
     */
    private buildChartOptions(data: EChartsTreemapNode): any {
        const option: any = {
            tooltip: {
                trigger: 'item',
                formatter: this.currentOptions.onTooltip || this.defaultTooltipFormatter
            },
            series: [{
                type: 'treemap',
                id: 'treemap-visualization',
                data: data.children || [data],
                
                // Configuration de base
                roam: this.currentOptions.roam,
                nodeClick: this.currentOptions.enableZoom ? 'zoomToNode' : false,
                
                // Assurer que les labels des parents sont visibles
                leafDepth: null, // Permet d'afficher tous les niveaux
                drillDownIcon: '▶',
                
                // Breadcrumb navigation
                breadcrumb: {
                    show: this.currentOptions.showBreadcrumb,
                    top: 'top',
                    left: 'left',
                    height: 25,
                    textStyle: {
                        fontSize: 12,
                        color: '#666'
                    }
                },

                // Configuration des niveaux pour un style moderne
                levels: [
                    // Niveau racine - caché
                    {
                        itemStyle: {
                            borderColor: '#fff',
                            borderWidth: 0,
                            gapWidth: 2
                        },
                        upperLabel: {
                            show: false
                        },
                        label: {
                            show: false
                        }
                    },
                    // Premier niveau (pays) - Labels visibles et proéminents
                    {
                        itemStyle: {
                            borderColor: '#fff',
                            borderWidth: 3,
                            gapWidth: 2
                        },
                        emphasis: {
                            itemStyle: {
                                borderColor: '#ddd'
                            }
                        },
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#ffffff',
                            position: 'insideTopLeft',
                            offset: [5, 5],
                            textShadowColor: 'rgba(0, 0, 0, 0.5)',
                            textShadowBlur: 2,
                            textShadowOffsetX: 1,
                            textShadowOffsetY: 1
                        },
                        upperLabel: {
                            show: true,
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#ffffff',
                            textShadowColor: 'rgba(0, 0, 0, 0.7)',
                            textShadowBlur: 3
                        }
                    },
                    // Deuxième niveau (collections) - Labels plus petits
                    {
                        itemStyle: {
                            borderColor: '#fff',
                            borderWidth: 1,
                            gapWidth: 1
                        },
                        label: {
                            show: true,
                            fontSize: 11,
                            fontWeight: 'normal',
                            color: '#333',
                            position: 'inside',
                            overflow: 'truncate'
                        }
                    }
                ],

                // Animation réduite pour améliorer la performance
                animationDurationUpdate: 300,
                animationEasing: 'cubicInOut'
            }],

            // Configuration responsive
            ...(this.currentOptions.responsive && {
                grid: {
                    containLabel: true
                }
            })
        };

        // Appliquer les couleurs personnalisées si fournies
        if (this.currentOptions.colors && this.currentOptions.colors.length > 0) {
            option.color = this.currentOptions.colors;
        }

        return option;
    }
}

/**
 * API de compatibilité avec l'ancienne interface
 */
export default class TreemapService {
    static createTreemap(
        data: EChartsTreemapNode,
        options: any
    ): { chart: echarts.ECharts | null; svg: null } {
        const echartsOptions: EChartsTreemapOptions = {
            width: options.width,
            height: options.height,
            enableZoom: true,
            showBreadcrumb: options.useBreadcrumbs !== false,
            onNodeClick: options.zoomCallback,
            onTooltip: options.tooltipCallback,
            responsive: true
        };

        if (options.colors) {
            // Convertir D3 color scale vers array de couleurs
            echartsOptions.colors = options.colors.range();
        }

        const service = new EChartsTreemapService(options.container, echartsOptions);
        const chart = service.render(data);

        return { chart, svg: null };
    }
}
