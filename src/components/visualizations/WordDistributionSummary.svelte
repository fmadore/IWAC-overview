<script lang="ts">
    import { translate } from '../../stores/translationStore';
    import type { HierarchyNode } from 'd3-hierarchy'; // Import specific type
    import type { EChartsTreemapNode } from '../../services/treemap/index'; // Use ECharts-based type

    // Svelte 5 props using $props rune
    let { 
        totalItems = $bindable(0), 
        totalWordCount = $bindable(0), 
        zoomedNode = $bindable(null), 
        formatNumber 
    }: {
        totalItems: number;
        totalWordCount: number;
        zoomedNode: HierarchyNode<EChartsTreemapNode> | null;
        formatNumber: (num: number) => string;
    } = $props();

    // Reactive translations - translate returns derived stores, so we access them directly
    const summaryText = translate('viz.summary');
    const totalItemsWithWordCountText = translate('viz.total_items_with_word_count');
    const totalWordsText = translate('viz.total_words');
    const avgWordsPerItemText = translate('viz.avg_words_per_item');
    const currentlyViewingText = translate('viz.currently_viewing');
    const clickBackText = translate('viz.click_back_to_return');
    const clickZoomInText = translate('viz.click_zoom_in');

</script>

<div class="summary-glass">
    <div class="summary-content">
        <h3 class="summary-title">{$summaryText}</h3>
        <div class="summary-stats">
            <div class="stat-item">
                <span class="stat-label">{$totalItemsWithWordCountText}:</span>
                <span class="stat-value">{formatNumber(totalItems)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">{$totalWordsText}:</span>
                <span class="stat-value">{formatNumber(totalWordCount)}</span>
            </div>
            {#if totalItems > 0}
                <div class="stat-item">
                    <span class="stat-label">{$avgWordsPerItemText}:</span>
                    <span class="stat-value">{formatNumber(Math.round(totalWordCount / totalItems))}</span>
                </div>
            {/if}
        </div>
        <div class="summary-actions">
            {#if zoomedNode}
                <div class="action-item current-view">
                    <span class="action-label">{$currentlyViewingText}:</span>
                    <span class="action-value">{zoomedNode.data.name}</span>
                </div>
                <div class="action-hint">{$clickBackText}</div>
            {:else}
                <div class="action-hint">{$clickZoomInText}</div>
            {/if}
        </div>
    </div>
</div>

<style>
    .summary-glass {
        margin-top: var(--spacing-md);
        background: rgba(255, 255, 255, 0.85);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-lg);
        box-shadow: 
            var(--shadow-md),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
        transition: all var(--transition-normal) var(--ease-out);
    }
    
    .summary-glass::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg, 
            transparent, 
            rgba(var(--color-primary), 0.4) 50%, 
            transparent
        );
        z-index: var(--z-above);
    }
    
    .summary-glass:hover {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 
            var(--shadow-lg),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
    }
    
    .summary-content {
        padding: var(--spacing-lg);
        position: relative;
        z-index: var(--z-base);
    }
    
    .summary-title {
        margin: 0 0 var(--spacing-md) 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        position: relative;
        padding-bottom: var(--spacing-sm);
    }
    
    .summary-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 40px;
        height: 2px;
        background: linear-gradient(
            90deg, 
            var(--color-primary), 
            var(--color-primary-light)
        );
        border-radius: var(--radius-full);
    }
    
    .summary-stats {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
    }
    
    .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-xs) 0;
        border-bottom: 1px solid rgba(var(--color-border), 0.3);
        transition: all var(--transition-fast) var(--ease-out);
    }
    
    .stat-item:last-child {
        border-bottom: none;
    }
    
    .stat-item:hover {
        background: rgba(var(--color-primary-50), 0.5);
        margin: 0 calc(-1 * var(--spacing-xs));
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        border-bottom-color: transparent;
    }
    
    .stat-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: var(--font-weight-medium);
    }
    
    .stat-value {
        font-size: var(--font-size-md);
        color: var(--color-text-primary);
        font-weight: var(--font-weight-semibold);
        background: linear-gradient(
            135deg, 
            var(--color-primary), 
            var(--color-secondary)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .summary-actions {
        border-top: 1px solid rgba(var(--color-border), 0.3);
        padding-top: var(--spacing-md);
        margin-top: var(--spacing-md);
    }
    
    .action-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xs);
    }
    
    .current-view {
        padding: var(--spacing-sm);
        background: rgba(var(--color-primary-100), 0.5);
        border-radius: var(--radius-md);
        border: 1px solid rgba(var(--color-primary), 0.2);
    }
    
    .action-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: var(--font-weight-medium);
    }
    
    .action-value {
        font-size: var(--font-size-sm);
        color: var(--color-primary);
        font-weight: var(--font-weight-semibold);
    }
    
    .action-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        font-style: italic;
        text-align: center;
        margin-top: var(--spacing-xs);
        padding: var(--spacing-xs);
        background: rgba(var(--color-primary-50), 0.3);
        border-radius: var(--radius-sm);
        border: 1px dashed rgba(var(--color-primary), 0.2);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .summary-content {
            padding: var(--spacing-md);
        }
        
        .stat-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
        }
        
        .action-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
        }
    }
</style> 