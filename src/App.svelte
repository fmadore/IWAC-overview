<script lang="ts">
  import { onMount } from 'svelte';
  import { itemsStore } from './stores/itemsStore';
  import CountryDistribution from './components/visualizations/CountryDistribution.svelte';

  // Import visualization components here
  // They will be created in the next steps

  let activeTab = 'countries';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'countries', label: 'Country Distribution' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'types', label: 'Type Distribution' },
    { id: 'words', label: 'Word Distribution' },
    { id: 'languages', label: 'Languages' },
    { id: 'categories', label: 'Categories' },
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    background-color: #f5f5f5;
  }

  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    margin-bottom: 2rem;
  }

  h1 {
    color: #333;
    margin-bottom: 1rem;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    background: white;
    padding: 0.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: #666;
    transition: all 0.2s;
  }

  button:hover {
    background: #f0f0f0;
    color: #333;
  }

  button.active {
    background: #333;
    color: white;
  }

  .content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    min-height: 500px;
  }

  .visualization-grid {
    display: grid;
    gap: 2rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    font-size: 1.2em;
  }

  .error {
    color: red;
  }
</style>
