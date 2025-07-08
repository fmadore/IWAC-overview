<script lang="ts">
    import { languageStore, translate } from '../stores/translationStore';
    import type { TranslationFunction } from '../types/translations';

    // Create a reactive derived value for the toggle button text
    const toggleText = $derived(translate('ui.toggle_language'));

    // Toggle language when the button is clicked
    function toggleLanguage() {
        languageStore.toggleLanguage();
    }
</script>

<button 
    class="btn btn-primary text-sm px-md py-sm"
    onclick={toggleLanguage}
    aria-label={$toggleText}
>
    {$toggleText}
</button>

<style>
    /* 
     * LanguageToggle.svelte - Language toggle button component
     * 
     * This component primarily uses utility classes from our design system.
     * Mobile optimizations are now handled by the button component CSS.
     */

    /* 
     * Utility classes used in this component:
     * - btn: Base button component class
     * - btn-primary: Primary button variant
     * - text-sm: Small text size
     * - px-md: Horizontal padding medium
     * - py-sm: Vertical padding small
     */
</style> 