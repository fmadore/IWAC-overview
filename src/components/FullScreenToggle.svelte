<script lang="ts">
    import { onMount } from 'svelte';
    import { t } from '../stores/translationStore';
    
    // Track fullscreen state
    let isFullScreen = false;
    
    // Function to toggle fullscreen
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen - always use document.documentElement
            // The iframe permission is handled by the allowfullscreen attribute
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                
                // If we failed, it might be because we're in an iframe without allowfullscreen
                if (isInIframe()) {
                    console.warn('This application is in an iframe. Make sure the iframe has the "allowfullscreen" attribute.');
                }
            });
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Helper function to check if we're in an iframe
    function isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // If we can't access window.top due to same-origin policy, we're in an iframe
            return true;
        }
    }
    
    // Update fullscreen state when it changes
    function handleFullscreenChange() {
        isFullScreen = !!document.fullscreenElement;
    }
    
    onMount(() => {
        // Add event listener for fullscreen changes
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        // Cleanup on component destroy
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    });
</script>

<button 
    class="px-xs py-xs flex items-center justify-center cursor-pointer fullscreen-button rounded text-sm"
    on:click={toggleFullScreen} 
    title={isFullScreen ? t('ui.exit_fullscreen') : t('ui.enter_fullscreen')}
    aria-label={isFullScreen ? t('ui.exit_fullscreen') : t('ui.enter_fullscreen')}
>
    {#if isFullScreen}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
            <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
            <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
            <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
        </svg>
    {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
            <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
            <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
    {/if}
</button>

<style>
    .fullscreen-button {
        background-color: var(--color-primary);
        color: var(--color-text-light);
        transition: background-color var(--transition-fast);
    }
    
    .fullscreen-button:hover {
        background-color: var(--color-primary-dark);
    }
    
    .fullscreen-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary-300);
    }
    
    svg {
        display: block;
    }
</style> 