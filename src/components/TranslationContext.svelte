<script lang="ts">
    import { setContext } from 'svelte';
    import { languageStore } from '../stores/translationStore';
    import type { Language, TranslationStore } from '../types/translations';

    let { children } = $props();

    const COMPONENT_ID = 'TranslationContext';
    
    // Track the current language using reactive state
    let currentLanguage = $state($languageStore);
    
    // Set context for child components to access
    setContext('translationContext', {
        componentId: COMPONENT_ID,
        getLanguage: () => currentLanguage,
        languageStore: languageStore as TranslationStore
    });
    
    // Use $effect to handle language changes
    $effect(() => {
        currentLanguage = $languageStore;
    });
</script>

{@render children()}