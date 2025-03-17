<script lang="ts">
    import { t } from '../../stores/translationStore';
    import { slide } from 'svelte/transition';
    
    // Title props
    export let title: string = '';
    
    // Description props
    export let description: string = '';
    export let descriptionTranslationKey: string = '';
    export let showDescription: boolean = false;
    export let descriptionId: string;

    // Style props
    export let className: string = '';

    // Computed description - use translated description if key provided
    $: computedDescription = descriptionTranslationKey ? t(descriptionTranslationKey) : description;

    // Toggle description visibility
    function toggleDescription() {
        showDescription = !showDescription;
    }
</script>

<div class="visualization-header {className}">
    <div class="title-container">
        <h2>{@html title}</h2>
        {#if description || descriptionTranslationKey}
            <button 
                class="info-button" 
                on:click={toggleDescription}
                aria-expanded={showDescription}
                aria-controls={descriptionId}
            >
                <span class="info-icon">ℹ️</span>
                <span class="sr-only">{showDescription ? t('ui.hide_info') : t('ui.show_info')}</span>
            </button>
        {/if}
    </div>

    {#if showDescription && (description || descriptionTranslationKey)}
        <div 
            id={descriptionId}
            class="description"
            transition:slide={{ duration: 200 }}
            role="region"
            aria-label={t('ui.visualization_description')}
        >
            <p>{computedDescription}</p>
        </div>
    {/if}
</div>

<style>
    .visualization-header {
        margin-bottom: var(--spacing-md);
        position: relative;
    }

    .title-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding-bottom: var(--spacing-sm);
        background: var(--background-color);
        position: relative;
        z-index: 2;
    }

    h2 {
        margin: 0;
        font-size: var(--font-size-lg);
        color: var(--text-color-primary);
        flex: 1;
    }

    .info-button {
        background: none;
        border: none;
        padding: var(--spacing-xs);
        cursor: pointer;
        border-radius: 50%;
        transition: background-color var(--transition-fast);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .info-button:hover {
        background-color: var(--hover-color);
    }

    .info-icon {
        font-size: var(--font-size-md);
    }

    .description {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: var(--card-background);
        border-radius: var(--border-radius-md);
        padding: var(--spacing-md);
        margin-top: var(--spacing-xs);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-md);
        z-index: 1;
    }

    .description p {
        margin: 0;
        color: var(--text-color-secondary);
        font-size: var(--font-size-sm);
        line-height: 1.5;
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
        border: 0;
    }
</style> 