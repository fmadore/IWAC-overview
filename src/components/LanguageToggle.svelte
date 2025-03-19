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
    class="btn btn-primary text-sm"
    on:click={toggleLanguage}
>
    {$toggleText}
</button>

<style>
    :global(.btn.btn-primary) {
        background-color: var(--color-primary);
        color: var(--color-text-light);
    }
    
    :global(.btn.btn-primary:hover) {
        background-color: var(--color-primary-dark);
    }
    
    :global(.btn.btn-primary:focus) {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-300);
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
        :global(.btn) {
            min-height: 42px;
            font-size: 14px;
        }
    }
</style> 