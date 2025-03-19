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
    class="px-md py-xs rounded flex items-center cursor-pointer text-sm language-button"
    on:click={toggleLanguage}
>
    {$toggleText}
</button>

<style>
    .language-button {
        background-color: var(--color-primary);
        color: var(--color-text-light);
        transition: background-color var(--transition-fast);
    }
    
    .language-button:hover {
        background-color: var(--color-primary-dark);
    }
    
    .language-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-300);
    }
</style> 