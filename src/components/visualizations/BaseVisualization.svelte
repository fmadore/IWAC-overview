<script lang="ts">
    import { itemsStore } from '../../stores/itemsStore';
    import { t } from '../../stores/translationStore';
    import VisualizationHeader from './VisualizationHeader.svelte';

    export let title: string;
    export let translationKey: string = '';
    export let description: string = '';
    export let descriptionTranslationKey: string = '';
    export let showDescription: boolean = false;
    
    // New prop for handling HTML content in titles
    export let titleHtml: string = '';

    // We no longer need container, SVG, width, height, or updateVisualization
    // as these are handled by the child visualization components
</script>

<div class="visualization-wrapper">
    <VisualizationHeader
        {title}
        {translationKey}
        {description}
        {descriptionTranslationKey}
        bind:showDescription={showDescription}
        {titleHtml}
    />
    
    <div class="visualization-content">
        <slot>
            <!-- Default content if no slot is provided -->
            <div class="empty-visualization">
                {#if $itemsStore.loading}
                    <div class="loading">{t('ui.loading')}</div>
                {:else if $itemsStore.error}
                    <div class="error">{$itemsStore.error}</div>
                {:else}
                    <div class="no-content">{t('ui.no_visualization_content')}</div>
                {/if}
            </div>
        </slot>
    </div>
</div>

<style>
    .visualization-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
    }
    
    .visualization-content {
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    
    .empty-visualization {
        width: 100%;
        height: 400px;
        position: relative;
        background: var(--card-background);
        border-radius: var(--border-radius-md);
        box-shadow: var(--card-shadow);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .loading, .error, .no-content {
        color: var(--text-color-secondary);
        text-align: center;
    }

    .error {
        color: var(--error-color);
    }
</style> 