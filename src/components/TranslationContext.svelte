<script lang="ts">
    import { onMount, onDestroy, afterUpdate } from 'svelte';
    import { language } from '../stores/translationStore';
    import { logDebug, trackMount, trackUnmount } from '../utils/debug';

    const COMPONENT_ID = 'TranslationContext';
    let isMounted = false;
    let unsubscribe: () => void;
    
    // Manually track the language to avoid reactive statements
    let currentLanguage = $language;
    
    function handleLanguageChange(newLang: string) {
        if (!isMounted) return;
        
        logDebug(COMPONENT_ID, `Language changed to: ${newLang}`);
        currentLanguage = newLang;
    }

    onMount(() => {
        isMounted = true;
        trackMount(COMPONENT_ID);
        logDebug(COMPONENT_ID, `Component mounted, initial language: ${$language}`);
        
        // Manually subscribe to the language store
        unsubscribe = language.subscribe(value => {
            handleLanguageChange(value);
        });
    });
    
    onDestroy(() => {
        isMounted = false;
        trackUnmount(COMPONENT_ID);
        logDebug(COMPONENT_ID, 'Component destroyed');
        
        if (unsubscribe) {
            unsubscribe();
            logDebug(COMPONENT_ID, 'Unsubscribed from language store');
        }
    });
    
    afterUpdate(() => {
        logDebug(COMPONENT_ID, 'Component updated');
    });
</script>

<slot /> 