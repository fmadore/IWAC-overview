<script lang="ts">
    import { onMount } from 'svelte';
    import { t } from '../stores/translationStore';
    
    // Track fullscreen state
    let isFullScreen = false;
    
    // Function to toggle fullscreen
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
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

<button class="fullscreen-toggle" on:click={toggleFullScreen} title={isFullScreen ? t('ui.exit_fullscreen') : t('ui.enter_fullscreen')}>
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
    .fullscreen-toggle {
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
        justify-content: center;
    }

    .fullscreen-toggle:hover {
        background: var(--primary-color);
        color: var(--text-color-light);
    }

    .fullscreen-toggle:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color-faded);
    }
    
    svg {
        display: block;
    }
</style> 