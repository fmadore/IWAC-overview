<script lang="ts">
    import { itemsStore } from '../../stores/itemsStore';
    import { t } from '../../stores/translationStore';
    import VisualizationHeader from './VisualizationHeader.svelte';
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';

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
     * We keep only the styles that can't be replaced with utility classes
     */
    /* The base styles for these components are now handled by utility classes */
    /* If component-specific styles are needed in the future, add them here */
    
    .empty-visualization {
        width: 100%;
        height: 400px;
        position: relative;
        background: var(--color-bg-card);
        border-radius: var(--border-radius-md);
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

    /* Utility classes used in this component:
     * - w-full: width 100%
     * - flex: display flex
     * - flex-col: flex-direction column
     * - relative: position relative
     * - z-above: z-index above
     * - flex-1: flex 1
     * - z-base: z-index base
     * - text-center: text-align center
     * - text-secondary: text color secondary
     * - text-error: text color error
     */
</style> 