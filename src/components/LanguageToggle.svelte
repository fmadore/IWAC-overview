<script lang="ts">
    import { languageStore, translate } from '../stores/translationStore';

    // Create a derived store for the toggle button text
    const toggleText = translate('ui.toggle_language');

    // Toggle language when the button is clicked
    function toggleLanguage() {
        languageStore.toggleLanguage();
    }
</script>

<button class="language-toggle" on:click={toggleLanguage}>
    {$toggleText}
</button>

<style>
    .language-toggle {
        padding: var(--spacing-xs) var(--spacing-md);
        border: 1px solid var(--primary-color);
        background: transparent;
        color: var(--primary-color);
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
        font-size: var(--font-size-sm);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }

    .language-toggle:hover {
        background: var(--primary-color);
        color: var(--text-color-light);
    }

    .language-toggle:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color-faded);
    }
</style> 