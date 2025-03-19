<script lang="ts">
    import { languageStore, translate } from '../stores/translationStore';
    import type { TranslationFunction } from '../types/translations';

    // Create a derived store for the toggle button text
    const toggleText = translate('ui.toggle_language');

    // Toggle language when the button is clicked
    function toggleLanguage() {
        languageStore.toggleLanguage();
    }
</script>

<button 
    class="px-md py-xs rounded flex items-center justify-center cursor-pointer text-sm language-button"
    on:click={toggleLanguage}
>
    {$toggleText}
</button>

<style>
    .language-button {
        background-color: var(--color-primary);
        color: var(--color-text-light);
        transition: background-color var(--transition-fast);
        min-height: 36px;
    }
    
    .language-button:hover {
        background-color: var(--color-primary-dark);
    }
    
    .language-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-300);
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
        .language-button {
            min-height: 42px;
            padding: var(--spacing-xs) var(--spacing-md);
            font-size: 14px;
        }
    }
</style> 