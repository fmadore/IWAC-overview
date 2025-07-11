<script lang="ts">
    import itemsStore from '../../stores/itemsStore';
    import { t } from '../../stores/translationStore';
    import VisualizationHeader from '../ui/VisualizationHeader.svelte';
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { useTooltip, createGridTooltipContent } from '../../hooks/useTooltip';

    // Title props - make title handling more consistent
    let { 
        title = '',
        translationKey = '',
        titleHtml = '',
        
        // Description props
        description = '',
        descriptionTranslationKey = '',
        showDescription = $bindable(false),
        
        // Accessibility props
        ariaLabel = '',
        
        // Container reference for resize handling
        enableResizeObserver = true,
        
        // Theme and style customization
        theme = 'default' as 'default' | 'light' | 'dark' | 'custom',
        customBackground = '',
        customTextColor = '',
        minHeight = 'var(--spacing-3xl)', // Use global spacing instead of hardcoded 400px
        padding = 'var(--spacing-lg)',
        className = '',
        modernStyle = true, // Enable modern styling by default
        
        // Tooltip configuration
        enableTooltip = true,
        tooltipBackgroundColor = 'var(--color-text-primary)', // Use global color instead of hardcoded
        tooltipTextColor = 'var(--color-text-light)',
        tooltipMaxWidth = '250px',
        
        // Snippet/children content
        children
    }: {
        title?: string;
        translationKey?: string;
        titleHtml?: string;
        description?: string;
        descriptionTranslationKey?: string;
        showDescription?: boolean;
        ariaLabel?: string;
        enableResizeObserver?: boolean;
        theme?: 'default' | 'light' | 'dark' | 'custom';
        customBackground?: string;
        customTextColor?: string;
        minHeight?: string;
        padding?: string;
        className?: string;
        modernStyle?: boolean;
        enableTooltip?: boolean;
        tooltipBackgroundColor?: string;
        tooltipTextColor?: string;
        tooltipMaxWidth?: string;
        children?: import('svelte').Snippet;
    } = $props();
    
    // Generate unique IDs for accessibility
    const descriptionId = `viz-desc-${Math.random().toString(36).slice(2, 11)}`;
    
    let contentContainer: HTMLElement;
    let resizeObserver: ResizeObserver;
    const dispatch = createEventDispatcher<{
        resize: { width: number; height: number };
    }>();

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
    let containerStyle = $derived(`
        min-height: ${minHeight};
        padding: ${padding};
        ${customBackground ? `background: ${customBackground};` : ''}
        ${customTextColor ? `color: ${customTextColor};` : ''}
    `);

    // Computed title - prioritize titleHtml over translated title
    let computedTitle = $derived(titleHtml || (translationKey ? t(translationKey) : title));
    
    // Computed description - use translated description if key provided
    let computedDescription = $derived(descriptionTranslationKey ? t(descriptionTranslationKey) : description);
    
    // Computed aria label - use title if not explicitly provided
    let computedAriaLabel = $derived(ariaLabel || computedTitle);
    
    // Computed aria-describedby - only set if we have a description
    let hasDescription = $derived(Boolean(description || descriptionTranslationKey));
    
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
        {description}
        {descriptionTranslationKey}
        bind:showDescription
        {descriptionId}
        className="z-above"
    />
    
    <div class="w-full flex-1 flex flex-col relative z-base visualization-content {modernStyle ? 'chart-modern' : ''}" 
         role="presentation" 
         bind:this={contentContainer}
    >
        {#if children}
            {@render children()}
        {:else}
            <!-- Default content if no slot is provided -->
            <div class="empty-visualization {modernStyle ? 'chart-skeleton' : ''}" aria-live="polite" style={containerStyle}>
                {#if $itemsStore.loading}
                    <div class="flex items-center justify-center text-secondary">
                        {t('ui.loading')}
                    </div>
                {:else if $itemsStore.error}
                    <div class="flex items-center justify-center text-error" role="alert">
                        {$itemsStore.error}
                    </div>
                {:else}
                    <div class="flex items-center justify-center text-secondary">
                        {t('ui.no_visualization_content')}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    /* 
     * We only include styles that can't be handled with utility classes.
     * Most visualization styles should come from our CSS architecture.
     */
    .empty-visualization {
        width: 100%;
        height: var(--spacing-3xl); /* Use global spacing instead of hardcoded 400px */
        position: relative;
        background: var(--color-bg-card);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-lg);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    /* Theme variations - use global color variables */
    .light {
        --color-bg-card: var(--color-bg-card);
        --color-text-primary: var(--color-text-primary);
        --color-text-secondary: var(--color-text-secondary);
        --color-error: var(--color-error);
    }
    
    .dark {
        --color-bg-card: #2d2d2d; /* Keep as fallback until dark mode CSS variables are implemented */
        --color-text-primary: #f5f5f5;
        --color-text-secondary: #bbbbbb;
        --color-error: #ff6b6b;
    }
</style> 