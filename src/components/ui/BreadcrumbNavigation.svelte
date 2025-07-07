<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    // Props
    export let items: { id: string | null; label: string }[] = [];
    export let separator: string = '/';
    export let navItemClass: string = '';
    
    const dispatch = createEventDispatcher<{
        navigate: { id: string | null };
    }>();
    
    function handleNavigate(id: string | null) {
        dispatch('navigate', { id });
    }
</script>

<nav class="breadcrumb-navigation">
    {#each items as item, index}
        {#if index > 0}
            <span class="breadcrumb-separator">{separator}</span>
        {/if}
        <span 
            class={`breadcrumb-item ${index === items.length - 1 ? 'breadcrumb-item--active' : ''} ${navItemClass}`}
            class:active={index === items.length - 1}
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
        display: flex;
        align-items: center;
        padding: var(--spacing-xs) 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
    }
    
    .breadcrumb-separator {
        margin: 0 var(--spacing-xs);
        opacity: 0.5;
        color: var(--color-text-tertiary);
    }
    
    .breadcrumb-item {
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: color var(--transition-fast, 0.15s) ease;
        text-decoration: none;
        outline: none;
    }
    
    .breadcrumb-item:hover {
        color: var(--color-primary);
    }
    
    .breadcrumb-item:focus {
        outline: var(--border-width-normal) solid var(--color-border-focus);
        outline-offset: 2px;
        border-radius: var(--radius-xs);
    }
    
    .breadcrumb-item--active,
    .breadcrumb-item.active {
        color: var(--color-primary);
        font-weight: var(--font-weight-medium);
        cursor: default;
    }
    
    .breadcrumb-item--active:hover,
    .breadcrumb-item.active:hover {
        color: var(--color-primary);
    }
</style> 