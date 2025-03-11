<script lang="ts">
    import { onMount, onDestroy, afterUpdate, beforeUpdate, setContext } from 'svelte';
    import { languageStore, type Language } from '../stores/translationStore';
    import { logDebug, trackMount, trackUnmount, dumpLogs, exportLogs } from '../utils/debug';

    const COMPONENT_ID = 'TranslationContext';
    let isMounted = false;
    let unsubscribe: () => void = () => {};
    let updateCount = 0;
    
    // Manually track the language to avoid reactive statements
    let currentLanguage: Language = $languageStore;
    let previousLanguage: Language = 'en';
    
    // Set context for child components to access
    setContext('translationContext', {
        componentId: COMPONENT_ID,
        getLanguage: () => currentLanguage
    });
    
    function handleLanguageChange(newLanguage: Language) {
        if (!isMounted) {
            logDebug(COMPONENT_ID, `Language change ignored (not mounted): ${newLanguage}`);
            return;
        }
        
        previousLanguage = currentLanguage;
        currentLanguage = newLanguage;
        
        logDebug(COMPONENT_ID, `Language changed from ${previousLanguage} to ${newLanguage}`, {
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
        try {
            isMounted = true;
            trackMount(COMPONENT_ID);
            logDebug(COMPONENT_ID, `Component mounted, initial language: ${$languageStore}`, {
                storeValue: $languageStore,
                currentLanguage
            });
            
            // Manually subscribe to the language store
            try {
                const unsub = languageStore.subscribe(value => {
                    handleLanguageChange(value);
                });
                
                // Assign the unsubscribe function
                unsubscribe = unsub;
                
                logDebug(COMPONENT_ID, 'Successfully subscribed to language store');
            } catch (error) {
                logDebug(COMPONENT_ID, `Error subscribing to language store: ${error}`);
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
        } catch (e) {
            console.error('[TranslationContext] Error in onMount:', e);
        }
    });
    
    onDestroy(() => {
        try {
            if (unsubscribe) {
                unsubscribe();
            }
            isMounted = false;
            trackUnmount(COMPONENT_ID);
            logDebug(COMPONENT_ID, 'Component unmounted');
        } catch (e) {
            console.error('[TranslationContext] Error in onDestroy:', e);
        }
    });
    
    afterUpdate(() => {
        updateCount++;
        logDebug(COMPONENT_ID, `Component updated (${updateCount})`, {
            isMounted,
            currentLanguage,
            storeValue: $languageStore
        });
    });
</script>

<slot />