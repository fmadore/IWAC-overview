<script lang="ts">
    import { onMount, onDestroy, setContext } from 'svelte';
    import { languageStore, type Language } from '../stores/translationStore';

    const COMPONENT_ID = 'TranslationContext';
    let isMounted = false;
    let unsubscribe: () => void = () => {};
    
    // Track the current language
    let currentLanguage: Language = $languageStore;
    
    // Set context for child components to access
    setContext('translationContext', {
        componentId: COMPONENT_ID,
        getLanguage: () => currentLanguage
    });
    
    function handleLanguageChange(newLanguage: Language) {
        if (!isMounted) return;
        currentLanguage = newLanguage;
    }

    onMount(() => {
        isMounted = true;
        
        // Subscribe to the language store
        unsubscribe = languageStore.subscribe(value => {
            handleLanguageChange(value);
        });
    });
    
    onDestroy(() => {
        if (unsubscribe) {
            unsubscribe();
        }
        isMounted = false;
    });
</script>

<slot />