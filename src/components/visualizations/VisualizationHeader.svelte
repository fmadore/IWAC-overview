<script lang="ts">
    import { t } from '../../stores/translationStore';
    import { slide } from 'svelte/transition';
    
    export let title: string;
    export let translationKey: string = '';
    export let description: string = '';
    export let showDescription: boolean = false;
    export let descriptionTranslationKey: string = '';
    export let titleHtml: string = '';
    
    // Toggle the description visibility when the accordion is clicked
    function toggleDescription() {
        showDescription = !showDescription;
    }
    
    // Get the actual title text to display (either from translation key or direct title)
    $: displayTitle = translationKey ? t(translationKey) : title;
    
    // Get the actual description to display (either from translation key or direct description)
    $: displayDescription = descriptionTranslationKey ? t(descriptionTranslationKey) : description;
</script>

<div class="visualization-header" class:has-description={showDescription}>
    <div class="title-container">
        <!-- If titleHtml is provided, use that, otherwise display the text title -->
        <h2 class="visualization-title">
            {#if titleHtml}
                {@html titleHtml}
            {:else if translationKey || title}
                {displayTitle}
            {/if}
        </h2>
        
        {#if description || descriptionTranslationKey}
            <button 
                class="accordion-toggle" 
                on:click={toggleDescription}
                aria-expanded={showDescription}
                aria-controls="description-panel"
            >
                <span class="sr-only">{showDescription ? t('ui.hide_description') : t('ui.show_description')}</span>
                <svg 
                    class="accordion-icon" 
                    class:open={showDescription}
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M5 7.5L10 12.5L15 7.5" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        stroke-linecap="round" 
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        {/if}
    </div>
    
    <!-- Change to a regular non-absolute div that slides in/out -->
    {#if description || descriptionTranslationKey}
        <div class="description-panel-wrapper">
            {#if showDescription}
                <div 
                    id="description-panel"
                    class="description-panel"
                    transition:slide={{ duration: 300 }}
                >
                    <p>{displayDescription}</p>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .visualization-header {
        margin-bottom: var(--spacing-md);
        width: 100%;
        position: relative;
        /* Add min-height to prevent jumps */
        min-height: 40px;
    }
    
    /* Add extra margin-bottom when description is showing */
    .visualization-header.has-description {
        margin-bottom: calc(var(--spacing-md) + var(--spacing-xl));
    }
    
    .title-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-sm);
        padding-bottom: var(--spacing-xs);
        border-bottom: 1px solid var(--divider-color);
    }
    
    .visualization-title {
        margin: 0;
        font-size: var(--font-size-xl);
        color: var(--text-color-primary);
        flex: 1;
        line-height: 1.3;
        
        /* Make title responsive */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .accordion-toggle {
        background: transparent;
        border: none;
        padding: var(--spacing-xs);
        cursor: pointer;
        color: var(--text-color-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius-sm);
        transition: background-color var(--transition-fast);
    }
    
    .accordion-toggle:hover {
        background-color: var(--divider-color);
        color: var(--text-color-primary);
    }
    
    .accordion-icon {
        transition: transform var(--transition-fast);
    }
    
    .accordion-icon.open {
        transform: rotate(180deg);
    }
    
    /* New approach for the description panel */
    .description-panel-wrapper {
        position: absolute;
        left: 0;
        right: 0;
        top: 100%;
        z-index: 10;
    }
    
    .description-panel {
        padding: var(--spacing-md);
        margin-top: var(--spacing-xs);
        background-color: var(--background-color);
        border-radius: var(--border-radius-md);
        color: var(--text-color-secondary);
        font-size: var(--font-size-sm);
        line-height: 1.5;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border-color);
    }
    
    .description-panel p {
        margin: 0;
    }
    
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .visualization-title {
            font-size: var(--font-size-lg);
        }
        
        .description-panel {
            padding: var(--spacing-sm);
        }
    }
    
    @media (max-width: 480px) {
        .visualization-title {
            font-size: var(--font-size-md);
        }
    }
</style> 