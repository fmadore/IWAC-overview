<script lang="ts">
    import { itemsStore } from '../../stores/itemsStore';
    import { t } from '../../stores/translationStore';
    import VisualizationHeader from './VisualizationHeader.svelte';
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';

    export let title: string;
    export let translationKey: string = '';
    export let description: string = '';
    export let descriptionTranslationKey: string = '';
    export let showDescription: boolean = false;
    
    // New prop for handling HTML content in titles
    export let titleHtml: string = '';

    // Add a role and aria-label for better accessibility
    export let ariaLabel: string = '';
    
    // Add container reference for resize handling
    export let enableResizeObserver: boolean = true;
    let contentContainer: HTMLElement;
    let resizeObserver: ResizeObserver;
    const dispatch = createEventDispatcher();
    
    // Theme and style customization
    export let theme: 'default' | 'light' | 'dark' | 'custom' = 'default';
    export let customBackground: string = '';
    export let customTextColor: string = '';
    export let minHeight: string = '400px';
    export let padding: string = 'var(--spacing-md)';
    export let className: string = '';
    
    // Computed styles
    $: containerStyle = `
        min-height: ${minHeight};
        padding: ${padding};
        ${customBackground ? `background: ${customBackground};` : ''}
        ${customTextColor ? `color: ${customTextColor};` : ''}
    `;
    
    // Setup resize observer
    onMount(() => {
        if (enableResizeObserver && contentContainer) {
            resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (entry) {
                    const { width, height } = entry.contentRect;
                    dispatch('resize', { width, height });
                }
            });
            
            resizeObserver.observe(contentContainer);
        }
    });
    
    onDestroy(() => {
        if (resizeObserver && contentContainer) {
            resizeObserver.unobserve(contentContainer);
            resizeObserver.disconnect();
        }
    });
    
    // We no longer need container, SVG, width, height, or updateVisualization
    // as these are handled by the child visualization components
</script>

<div class="visualization-wrapper {theme} {className}" role="region" aria-label={ariaLabel || title}>
    <VisualizationHeader
        {title}
        {translationKey}
        {description}
        {descriptionTranslationKey}
        bind:showDescription={showDescription}
        {titleHtml}
    />
    
    <div class="visualization-content" role="presentation" bind:this={contentContainer}>
        <slot>
            <!-- Default content if no slot is provided -->
            <div class="empty-visualization" aria-live="polite" style={containerStyle}>
                {#if $itemsStore.loading}
                    <div class="loading">{t('ui.loading')}</div>
                {:else if $itemsStore.error}
                    <div class="error" role="alert">{$itemsStore.error}</div>
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
    
    /* Theme variations */
    .light {
        --card-background: #ffffff;
        --text-color-primary: #333333;
        --text-color-secondary: #666666;
        --error-color: #e53935;
    }
    
    .dark {
        --card-background: #2d2d2d;
        --text-color-primary: #f5f5f5;
        --text-color-secondary: #bbbbbb;
        --error-color: #ff6b6b;
    }
</style> 