<script lang="ts">
    import { onMount } from 'svelte';
    import { language } from '../stores/translationStore';

    // Log when the component mounts
    onMount(() => {
        console.log('[TranslationContext] Component mounted, initial language:', $language);
    });

    // Log language changes
    $: {
        console.log('[TranslationContext] Language changed to:', $language);
    }

    // This component doesn't render anything visible
    // It just creates a context for translations and subscribes to language changes
</script>

<slot /> 