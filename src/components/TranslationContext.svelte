<script lang="ts">
    import { onMount, onDestroy, afterUpdate, beforeUpdate, setContext } from 'svelte';
    import { language } from '../stores/translationStore';
    import { logDebug, trackMount, trackUnmount, dumpLogs, exportLogs } from '../utils/debug';

    const COMPONENT_ID = 'TranslationContext';
    let isMounted = false;
    let unsubscribe: () => void;
    let updateCount = 0;
    
    // Manually track the language to avoid reactive statements
    let currentLanguage = $language;
    let previousLanguage = '';
    
    // Set context for child components to access
    setContext('translationContext', {
        componentId: COMPONENT_ID,
        getLanguage: () => currentLanguage
    });
    
    function handleLanguageChange(newLang: string) {
        if (!isMounted) {
            logDebug(COMPONENT_ID, `Language change ignored (not mounted): ${newLang}`);
            return;
        }
        
        previousLanguage = currentLanguage;
        currentLanguage = newLang;
        
        logDebug(COMPONENT_ID, `Language changed from ${previousLanguage} to ${newLang}`, {
            isMounted,
            updateCount,
            subscriptionActive: !!unsubscribe
        });
    }

    beforeUpdate(() => {
        logDebug(COMPONENT_ID, 'Before update', { 
            isMounted, 
            currentLanguage,
            updateCount 
        });
    });

    onMount(() => {
        isMounted = true;
        trackMount(COMPONENT_ID);
        logDebug(COMPONENT_ID, `Component mounted, initial language: ${$language}`, {
            storeValue: $language,
            currentLanguage
        });
        
        // Manually subscribe to the language store
        try {
            unsubscribe = language.subscribe(value => {
                handleLanguageChange(value);
            });
            logDebug(COMPONENT_ID, 'Subscribed to language store');
        } catch (error) {
            logDebug(COMPONENT_ID, 'Error subscribing to language store', error);
        }
        
        // Add debug commands to window for easy access
        if (typeof window !== 'undefined') {
            (window as any).__TRANSLATION_DEBUG = {
                dumpLogs,
                exportLogs,
                currentLanguage: () => currentLanguage,
                isMounted: () => isMounted
            };
        }
    });
    
    onDestroy(() => {
        logDebug(COMPONENT_ID, 'Component being destroyed', {
            isMounted,
            currentLanguage,
            hasUnsubscribe: !!unsubscribe
        });
        
        isMounted = false;
        trackUnmount(COMPONENT_ID);
        
        if (unsubscribe) {
            try {
                unsubscribe();
                logDebug(COMPONENT_ID, 'Unsubscribed from language store');
                unsubscribe = undefined;
            } catch (error) {
                logDebug(COMPONENT_ID, 'Error unsubscribing from language store', error);
            }
        }
    });
    
    afterUpdate(() => {
        updateCount++;
        logDebug(COMPONENT_ID, `Component updated (${updateCount})`, {
            isMounted,
            currentLanguage,
            storeValue: $language
        });
    });
</script>

<slot /> 