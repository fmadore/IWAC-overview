<script lang="ts">
    import { itemsStore } from '../../stores/itemsStore';
    import { t } from '../../stores/translationStore';
    import VisualizationHeader from './VisualizationHeader.svelte';
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';

    // Title props - make title handling more consistent
    export let title: string = '';
    export let translationKey: string = '';
    export let titleHtml: string = '';

    // Description props
    export let description: string = '';
    export let descriptionTranslationKey: string = '';
    export let showDescription: boolean = false;

    // Accessibility props
    export let ariaLabel: string = '';
    
    // Generate unique IDs for accessibility
    const descriptionId = `viz-desc-${Math.random().toString(36).slice(2, 11)}`;
    
    // Add container reference for resize handling
    export let enableResizeObserver: boolean = true;
    let contentContainer: HTMLElement;
    let resizeObserver: ResizeObserver;
    const dispatch = createEventDispatcher<{
        resize: { width: number; height: number };
    }>();
    
    // Theme and style customization
    export let theme: 'default' | 'light' | 'dark' | 'custom' = 'default';
    export let customBackground: string = '';
    export let customTextColor: string = '';
    export let minHeight: string = '400px';
    export let padding: string = 'var(--spacing-md)';
    export let className: string = '';
    
    // Tooltip configuration
    export let enableTooltip: boolean = true;
    export let tooltipBackgroundColor: string = 'rgba(0, 0, 0, 0.8)';
    export let tooltipTextColor: string = 'white';
    export let tooltipMaxWidth: string = '250px';

    // Initialize tooltip hook conditionally
    const tooltipHook = enableTooltip ? useTooltip({
        backgroundColor: tooltipBackgroundColor,
        color: tooltipTextColor,
        maxWidth: tooltipMaxWidth
    }) : null;

    // Functions to expose for child components
    function showTooltip(event: MouseEvent, content: string, width?: number, height?: number) {
        if (enableTooltip && tooltipHook) {
            tooltipHook.showTooltip(event, content, width, height);
        }
    }
    
    function hideTooltip() {
        if (enableTooltip && tooltipHook) {
            tooltipHook.hideTooltip();
        }
    }
    
    function updateTooltipContent(content: string) {
        if (enableTooltip && tooltipHook) {
            tooltipHook.updateTooltipContent(content);
        }
    }
    
    // Expose tooltip functions to child components
    export { showTooltip, hideTooltip, updateTooltipContent, createGridTooltipContent };
    
    // Computed styles for custom styling that can't be done with utility classes
    $: containerStyle = `
        min-height: ${minHeight};
        padding: ${padding};
        ${customBackground ? `background: ${customBackground};` : ''}
        ${customTextColor ? `color: ${customTextColor};` : ''}
    `;

    // Computed title - prioritize titleHtml over translated title
    $: computedTitle = titleHtml || (translationKey ? t(translationKey) : title);
    
    // Computed description - use translated description if key provided
    $: computedDescription = descriptionTranslationKey ? t(descriptionTranslationKey) : description;
    
    // Computed aria label - use title if not explicitly provided
    $: computedAriaLabel = ariaLabel || computedTitle;
    
    // Computed aria-describedby - only set if we have a description
    $: hasDescription = Boolean(description || descriptionTranslationKey);
    
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
</script>

<div 
    class="w-full flex flex-col relative visualization-wrapper {theme} {className}" 
    role="region" 
    aria-label={computedAriaLabel}
    aria-describedby={hasDescription ? descriptionId : undefined}
>
    <VisualizationHeader
        title={computedTitle}
        description={description}
        {descriptionTranslationKey}
        bind:showDescription
        {descriptionId}
        className="z-above"
    />
    
    <div class="w-full flex-1 flex flex-col relative z-base visualization-content" 
         role="presentation" 
         bind:this={contentContainer}
    >
        <slot>
            <!-- Default content if no slot is provided -->
            <div class="empty-visualization" aria-live="polite" style={containerStyle}>
                {#if $itemsStore.loading}
                    <div class="text-center text-secondary">
                        {t('ui.loading')}
                    </div>
                {:else if $itemsStore.error}
                    <div class="text-center text-error" role="alert">
                        {$itemsStore.error}
                    </div>
                {:else}
                    <div class="text-center text-secondary">
                        {t('ui.no_visualization_content')}
                    </div>
                {/if}
            </div>
        </slot>
    </div>
</div>

<style>
    /* 
     * We only include styles that can't be handled with utility classes.
     * Most visualization styles should come from our CSS architecture.
     */
    .empty-visualization {
        width: 100%;
        height: 400px;
        position: relative;
        background: var(--color-bg-card);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    /* Theme variations */
    .light {
        --color-bg-card: #ffffff;
        --color-text-primary: #333333;
        --color-text-secondary: #666666;
        --color-error: #e53935;
    }
    
    .dark {
        --color-bg-card: #2d2d2d;
        --color-text-primary: #f5f5f5;
        --color-text-secondary: #bbbbbb;
        --color-error: #ff6b6b;
    }
</style> 