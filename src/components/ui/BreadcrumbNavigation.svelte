<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    // Props
    export let items: { id: string | null; label: string }[] = [];
    export let separator: string = '/';
    export let activeItemClass: string = 'text-primary font-medium';
    export let navItemClass: string = 'hover:text-primary transition-colors cursor-pointer';
    
    const dispatch = createEventDispatcher<{
        navigate: { id: string | null };
    }>();
    
    function handleNavigate(id: string | null) {
        dispatch('navigate', { id });
    }
</script>

<nav class="breadcrumb-navigation flex items-center text-sm">
    {#each items as item, index}
        {#if index > 0}
            <span class="mx-xs opacity-50">{separator}</span>
        {/if}
        <span 
            class={`${navItemClass} ${index === items.length - 1 ? activeItemClass : ''}`}
            on:click={() => handleNavigate(item.id)}
            on:keypress={(e) => e.key === 'Enter' && handleNavigate(item.id)}
            tabindex="0"
            role="link"
        >
            {item.label}
        </span>
    {/each}
</nav>

<style>
    .breadcrumb-navigation {
        padding: 4px 0;
    }
</style> 