<script lang="ts">
  import { onMount } from 'svelte';
  import { itemsStore } from './stores/itemsStore';
  import CountryDistribution from './components/visualizations/CountryDistribution.svelte';
  import LanguageDistribution from './components/visualizations/LanguageDistribution.svelte';
  import IndexDistribution from './components/visualizations/IndexDistribution.svelte';
  import TimelineDistribution from './components/visualizations/TimelineDistribution.svelte';
  import TypeDistribution from './components/visualizations/TypeDistribution.svelte';

  // Import visualization components here
  // They will be created in the next steps

  let activeTab = 'countries';

  const tabs = [
    // { id: 'overview', label: 'Overview' },
    { id: 'countries', label: 'Country Distribution' },
    { id: 'languages', label: 'Languages' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'types', label: 'Type Distribution' },
    { id: 'categories', label: 'Index Categories' },
    { id: 'words', label: 'Word Distribution' },
  ];

  onMount(() => {
    itemsStore.loadItems();
  });
</script>

<main>
  <header>
    <h1>IWAC Database Overview</h1>
    <nav>
      {#each tabs as tab}
        <button 
          class:active={activeTab === tab.id}
          on:click={() => activeTab = tab.id}
        >
          {tab.label}
        </button>
      {/each}
    </nav>
  </header>

  <div class="content">
    {#if $itemsStore.loading}
      <div class="loading">Loading database...</div>
    {:else if $itemsStore.error}
      <div class="error">{$itemsStore.error}</div>
    {:else}
      {#if activeTab === 'countries'}
        <CountryDistribution />
      {:else if activeTab === 'languages'}
        <LanguageDistribution />
      {:else if activeTab === 'categories'}
        <IndexDistribution />
      {:else if activeTab === 'timeline'}
        <TimelineDistribution />
      {:else if activeTab === 'types'}
        <TypeDistribution />
      {:else}
        <div class="visualization-grid">
          <p>Select a visualization from the tabs above</p>
        </div>
      {/if}
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: var(--font-family-primary);
    background-color: var(--background-color);
  }

  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-xl);
  }

  header {
    margin-bottom: var(--spacing-xl);
  }

  h1 {
    color: var(--text-color-primary);
    margin-bottom: var(--spacing-md);
  }

  nav {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
    background: var(--card-background);
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-md);
    box-shadow: var(--card-shadow);
  }

  button {
    padding: var(--spacing-xs) var(--spacing-md);
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: var(--border-radius-sm);
    color: var(--text-color-secondary);
    transition: all var(--transition-fast);
  }

  button:hover {
    background: var(--divider-color);
    color: var(--text-color-primary);
  }

  button.active {
    background: var(--primary-color);
    color: var(--text-color-light);
  }

  .content {
    background: var(--card-background);
    padding: var(--spacing-xl);
    border-radius: var(--border-radius-md);
    box-shadow: var(--card-shadow);
    min-height: 500px;
  }

  .visualization-grid {
    display: grid;
    gap: var(--spacing-xl);
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .loading, .error {
    text-align: center;
    padding: var(--spacing-xl);
    font-size: var(--font-size-lg);
    color: var(--text-color-secondary);
  }

  .error {
    color: var(--error-color);
  }
</style>
