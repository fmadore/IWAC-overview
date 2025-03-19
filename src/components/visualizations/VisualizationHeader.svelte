<script lang="ts">
    import { t, translate } from '../../stores/translationStore';
    import { slide } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    
    // Title props
    export let title: string = '';
    
    // Description props
    export let description: string = '';
    export let descriptionTranslationKey: string = '';
    export let showDescription: boolean = false;
    export let descriptionId: string;

    // Style props
    export let className: string = '';

    // Create reactive translations
    $: hideInfoText = translate('ui.hide_info');
    $: showInfoText = translate('ui.show_info');
    $: visualizationDescriptionText = translate('ui.visualization_description');
    $: descriptionText = descriptionTranslationKey ? translate(descriptionTranslationKey) : undefined;
    
    // References
    let infoButton: HTMLButtonElement;
    let descriptionEl: HTMLDivElement;

    // Toggle description visibility with event handling
    function toggleDescription(event: MouseEvent) {
        // Stop the event from propagating to prevent other handlers from interfering
        event.stopPropagation();
        event.preventDefault();
        showDescription = !showDescription;
    }
    
    // Close the description when clicking outside
    function handleGlobalClick(event: MouseEvent) {
        if (!showDescription) return;
        
        // Check if the click is outside both the button and description
        const target = event.target as Node;
        const clickedOutsideButton = infoButton && !infoButton.contains(target);
        const clickedOutsideDescription = descriptionEl && !descriptionEl.contains(target);
        
        if (clickedOutsideButton && clickedOutsideDescription) {
            showDescription = false;
        }
    }
    
    // Set up and tear down global event listeners
    onMount(() => {
        document.addEventListener('click', handleGlobalClick);
    });
    
    onDestroy(() => {
        document.removeEventListener('click', handleGlobalClick);
    });
</script>

<div class="mb-md relative visualization-header {className}">
    <div class="flex items-center gap-sm pb-sm bg-page relative z-above title-container">
        <h2 class="m-0 text-lg text-primary flex-1">{@html title}</h2>
        {#if description || descriptionTranslationKey}
            <button 
                class="info-button"
                on:click={toggleDescription}
                aria-expanded={showDescription}
                aria-controls={descriptionId}
                type="button"
                bind:this={infoButton}
            >
                <span class="info-icon">ℹ️</span>
                <span class="sr-only">{showDescription ? $hideInfoText : $showInfoText}</span>
            </button>
        {/if}
    </div>

    {#if showDescription && (description || descriptionTranslationKey)}
        <div 
            id={descriptionId}
            class="absolute top-100 left-0 right-0 bg-card rounded p-md mt-xs border border-solid border-default shadow-lg z-popover description"
            transition:slide={{ duration: 150, easing: t => t }}
            role="region"
            aria-label={$visualizationDescriptionText}
            bind:this={descriptionEl}
        >
            <p class="m-0 text-secondary text-sm">{descriptionTranslationKey ? $descriptionText : description}</p>
        </div>
    {/if}
</div>

<style>
    /* Custom styles that can't be replaced with utility classes */
    
    .info-button {
        background: none;
        border: none;
        padding: var(--spacing-xs);
        cursor: pointer;
        border-radius: var(--radius-full);
        transition: background-color var(--transition-fast);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .info-button:hover {
        background-color: var(--color-bg-hover);
    }

    .info-icon {
        font-size: var(--font-size-md);
    }
    
    /* Add a stronger position for the description to prevent it from being hidden */
    .description {
        display: block;
        z-index: 9999 !important;
    }

    /* Utility classes used in this component:
     * - mb-md: margin-bottom medium
     * - relative: position relative
     * - flex: display flex
     * - items-center: align-items center
     * - gap-sm: gap small
     * - pb-sm: padding-bottom small
     * - bg-page: background color page
     * - z-above: z-index above
     * - m-0: margin 0
     * - text-lg: font-size large
     * - text-primary: text color primary
     * - flex-1: flex 1
     * - absolute: position absolute
     * - top-100: top 100%
     * - left-0: left 0
     * - right-0: right 0
     * - bg-card: background color card
     * - rounded: border-radius medium
     * - p-md: padding medium
     * - mt-xs: margin-top extra small
     * - border: border width 1px
     * - border-solid: border style solid
     * - border-default: border color default
     * - shadow-lg: larger box-shadow
     * - z-popover: z-index for popover elements (higher than z-above)
     * - text-secondary: text color secondary
     * - text-sm: font-size small
     * - sr-only: screen reader only text (for accessibility)
     */
</style> 