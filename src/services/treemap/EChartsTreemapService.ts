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
        // Nettoyer le conteneur existant
        if (this.chart) {
            this.chart.dispose();
        }

        // Initialiser le graphique ECharts
        this.chart = echarts.init(this.container, null, {
            width: this.currentOptions.width,
            height: this.currentOptions.height,
            renderer: 'canvas'
        });

        // Configuration des options ECharts
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

                // Animation
                animationDurationUpdate: 750,
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

        // Définir les options
        this.chart.setOption(option);

        // Gérer les événements de clic
        if (this.currentOptions.onNodeClick) {
            this.chart.on('click', this.currentOptions.onNodeClick);
        }

        // Gérer le redimensionnement responsive
        if (this.currentOptions.responsive) {
            this.setupResponsive();
        }

        return this.chart;
    }

    /**
     * Met à jour les données sans recréer le graphique
     */
    updateData(data: EChartsTreemapNode): void {
        if (!this.chart) {
            console.warn('Chart not initialized, call render() first');
            return;
        }

        this.chart.setOption({
            series: [{
                data: data.children || [data]
            }]
        });
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
        if (this.chart) {
            this.chart.resize();
        }
    }

    /**
     * Détruit le graphique et nettoie les ressources
     */
    destroy(): void {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
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
        if (!this.chart) return;

        const resizeObserver = new ResizeObserver(() => {
            this.resize();
        });

        resizeObserver.observe(this.container);

        // Nettoyer l'observer lors de la destruction
        const originalDispose = this.chart.dispose.bind(this.chart);
        this.chart.dispose = () => {
            resizeObserver.disconnect();
            originalDispose();
        };
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
