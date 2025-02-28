<script lang="ts">
    import { onMount } from 'svelte';
    import { language } from '../stores/translationStore';

    // Log when the component mounts
    onMount(() => {
        console.log('[TranslationContext] Component mounted, initial language:', $language);
        
        // Return a cleanup function that will be called when the component is unmounted
        return () => {
            console.log('[TranslationContext] Component unmounted');
        };
    });

    // Use a safer pattern for reactive statements
    // Track the language in a local variable that we can safely reference
    let currentLanguage = $language;
    
    $: if ($language !== currentLanguage) {
        currentLanguage = $language;
        console.log('[TranslationContext] Language changed to:', currentLanguage);
    }

    // This component doesn't render anything visible
    // It just creates a context for translations and subscribes to language changes
</script>

<slot /> 