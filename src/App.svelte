<script lang="ts">
  import { onMount, onDestroy, afterUpdate, beforeUpdate } from 'svelte';
  import { itemsStore } from './stores/itemsStore';
  import { t, languageStore } from './stores/translationStore';
  import LanguageToggle from './components/LanguageToggle.svelte';
  import TranslationContext from './components/TranslationContext.svelte';
  import CountryDistribution from './components/visualizations/CountryDistribution.svelte';
  import LanguageDistribution from './components/visualizations/LanguageDistribution.svelte';
  import IndexDistribution from './components/visualizations/IndexDistribution.svelte';
  import TimelineDistribution from './components/visualizations/TimelineDistribution.svelte';
  import TypeDistribution from './components/visualizations/TypeDistribution.svelte';
  import WordDistribution from './components/visualizations/WordDistribution.svelte';
  import { logDebug, trackMount, trackUnmount, DEBUG } from './utils/debug';
  
  // Only import DebugPanel when DEBUG is true
  import DebugPanel from './components/DebugPanel.svelte';

  const COMPONENT_ID = 'App';
  let isMounted = false;
  let updateCount = 0;
  let unsubscribe: () => void = () => {};
  let renderCount = 0;

  // Import visualization components here
  // They will be created in the next steps

  let activeTab = 'countries';

  const tabs = [
    // { id: 'overview', label: 'Overview' },
    { id: 'countries', label: 'tab.countries' },
    { id: 'languages', label: 'tab.languages' },
    { id: 'timeline', label: 'tab.timeline' },
    { id: 'types', label: 'tab.types' },
    { id: 'categories', label: 'tab.categories' },
    { id: 'words', label: 'tab.words' },
  ];

  // Manually track the language to avoid reactive statements
  let currentLanguage = '';
  let previousLanguage = '';
  
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
    
    logDebug(COMPONENT_ID, 'Current translations:', {
      title: t('app.title'),
      loading: t('ui.loading'),
      activeTab: t(tabs.find(tab => tab.id === activeTab)?.label || '')
    });
  }

  beforeUpdate(() => {
    renderCount++;
    logDebug(COMPONENT_ID, `Before update (render #${renderCount})`, {
      isMounted,
      currentLanguage,
      activeTab
    });
  });

  onMount(() => {
    try {
      isMounted = true;
      trackMount(COMPONENT_ID);
      logDebug(COMPONENT_ID, `Component mounted, initial language: ${$languageStore}`, {
        storeValue: $languageStore,
        activeTab
      });
      
      // Set initial language
      currentLanguage = $languageStore;
      
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
      
      // Load items if not already loaded
      if (!$itemsStore.items || $itemsStore.items.length === 0) {
        itemsStore.loadItems();
      }
    } catch (e) {
      console.error('[App] Error in onMount:', e);
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
      console.error('[App] Error in onDestroy:', e);
    }
  });
  
  afterUpdate(() => {
    updateCount++;
    logDebug(COMPONENT_ID, `Component updated (${updateCount})`, {
      isMounted,
      currentLanguage,
      storeValue: $languageStore,
      activeTab
    });
  });
</script>

<TranslationContext>
  <main>
    <header>
      <div class="header-top">
        <h1>{t('app.title')}</h1>
        <LanguageToggle />
      </div>
      <nav>
        <ul class="tabs">
          {#each tabs as tab}
            <li 
              class:active={activeTab === tab.id}
              on:click={() => activeTab = tab.id}
              on:keydown={(e) => e.key === 'Enter' && (activeTab = tab.id)}
              role="tab"
              tabindex="0"
              aria-selected={activeTab === tab.id}
            >
              {t(tab.label)}
            </li>
          {/each}
        </ul>
      </nav>
    </header>

    <div class="content">
      {#if $itemsStore.loading}
        <div class="loading">{t('ui.loading')}</div>
      {:else if $itemsStore.error}
        <div class="error">{$itemsStore.error}</div>
      {:else}
        {#if activeTab === 'countries'}
          <CountryDistribution />
        {:else if activeTab === 'languages'}
          <LanguageDistribution />
        {:else if activeTab === 'timeline'}
          <TimelineDistribution />
        {:else if activeTab === 'types'}
          <TypeDistribution />
        {:else if activeTab === 'categories'}
          <IndexDistribution />
        {:else if activeTab === 'words'}
          <WordDistribution />
        {/if}
      {/if}
    </div>
  </main>
  
  <!-- Only render the debug panel when DEBUG is true -->
  {#if DEBUG}
    <DebugPanel />
  {/if}
</TranslationContext>

<style>
  :global(:root) {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --text-color: #333;
    --background-color: #f5f5f5;
    --card-background: #fff;
    --border-color: #ddd;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --card-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    color: var(--text-color);
    background-color: var(--background-color);
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-md);
  }

  header {
    margin-bottom: var(--spacing-lg);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  h1 {
    margin: 0;
    font-size: 24px;
    color: var(--primary-color);
  }

  .tabs {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .tabs li {
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .tabs li:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .tabs li.active {
    border-bottom: 2px solid var(--primary-color);
    font-weight: bold;
  }

  .content {
    background-color: var(--card-background);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    box-shadow: var(--card-shadow);
    min-height: 500px;
  }

  .loading, .error {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 500px;
    font-size: 18px;
  }

  .error {
    color: red;
  }
</style>
