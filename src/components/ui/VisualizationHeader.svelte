<script lang="ts">
    import { t, translate } from '../../stores/translationStore';
    import { slide } from 'svelte/transition';
    
    // Title props
    let { title = '', description = '', descriptionTranslationKey = '', showDescription = $bindable(false), descriptionId, className = '' } = $props();

    // Create reactive translations using $derived
    let hideInfoText = $derived(translate('ui.hide_info'));
    let showInfoText = $derived(translate('ui.show_info'));
    let visualizationDescriptionText = $derived(translate('ui.visualization_description'));
    let descriptionText = $derived(descriptionTranslationKey ? translate(descriptionTranslationKey) : undefined);
    
    // References
    let infoButton: HTMLButtonElement | undefined = $state();
    let descriptionEl: HTMLDivElement | undefined = $state();

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
    
    // Set up and tear down global event listeners using $effect
    $effect(() => {
        document.addEventListener('click', handleGlobalClick);
        
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    });
</script>

<div class="mb-md relative visualization-header {className}">
    <div class="flex items-center gap-sm pb-sm bg-page relative z-above title-container modern-header">
        <h2 class="m-0 text-lg flex-1 modern-title">{@html title}</h2>
        {#if description || descriptionTranslationKey}
            <button 
                class="p-xs flex items-center justify-center rounded-full cursor-pointer modern-info-button"
                onclick={toggleDescription}
                aria-expanded={showDescription}
                aria-controls={descriptionId}
                type="button"
                bind:this={infoButton}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="sr-only">{showDescription ? $hideInfoText : $showInfoText}</span>
            </button>
        {/if}
    </div>

    {#if showDescription && (description || descriptionTranslationKey)}
        <div 
            id={descriptionId}
            class="absolute top-100 left-0 right-0 modern-description"
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
    /* Modern header styling */
    .modern-header {
        background: linear-gradient(135deg, 
            rgba(91, 110, 232, 0.08) 0%, 
            rgba(255, 107, 157, 0.08) 100%
        );
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        border: 1px solid var(--color-border-light);
        transition: all var(--transition-fast) var(--ease-out);
    }
    
    .modern-header:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
        border-color: var(--color-primary-200);
    }
    
    /* Modern title with gradient text */
    .modern-title {
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: var(--font-weight-bold);
    }
    
    /* Modern info button */
    .modern-info-button {
        background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-card-alt) 100%);
        border: 1px solid var(--color-border-light);
        box-shadow: var(--shadow-md);
        transition: all var(--transition-fast) var(--ease-out);
    }
    
    .modern-info-button:hover {
        background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%);
        transform: scale(1.05);
        box-shadow: var(--shadow-lg);
        border-color: var(--color-primary-200);
    }
    
    /* Modern description popup */
    .modern-description {
        background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-card-alt) 100%);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        margin-top: var(--spacing-xs);
        border: 1px solid var(--color-border-light);
        box-shadow: var(--shadow-lg);
        backdrop-filter: blur(8px);
        z-index: 9999;
    }
</style> 