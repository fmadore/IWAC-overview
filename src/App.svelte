<script lang="ts">
  import { onMount, onDestroy, afterUpdate, beforeUpdate } from 'svelte';
  import itemsStore from './stores/itemsStore';
  import { t, languageStore, translate } from './stores/translationStore';
  import TranslationContext from './components/TranslationContext.svelte';
  import AppHeader from './components/ui/AppHeader.svelte';
  import CountryDistribution from './components/visualizations/CountryDistribution.svelte';
  import LanguageDistribution from './components/visualizations/LanguageDistribution.svelte';
  import IndexDistribution from './components/visualizations/IndexDistribution.svelte';
  import TimelineDistribution from './components/visualizations/TimelineDistribution.svelte';
  import TypeDistribution from './components/visualizations/TypeDistribution.svelte';
  import WordDistribution from './components/visualizations/WordDistribution.svelte';
  import { logDebug, trackMount, trackUnmount, DEBUG } from './utils/debug';
  import { parseUrlParams, updateUrl } from './utils/urlUtils';
  
  // Only import DebugPanel when DEBUG is true
  import DebugPanel from './components/DebugPanel.svelte';

  const COMPONENT_ID = 'App';
  let isMounted = false;
  let updateCount = 0;
  let unsubscribe: () => void = () => {};
  let renderCount = 0;
  
  // Component references
  let appHeader: any;

  let activeTab = 'countries';

  // Tab definitions with translation keys
  // Note: Tab labels have been updated in translationStore.ts:
  // - "Word Distribution" → "Word Count" / "Nombre de mots"
  // - "Index Categories" → "Index"
  // - "Timeline" → "Collection growth" / "Croissance collection"
  const tabs = [
    // { id: 'overview', label: 'Overview' },
    { id: 'countries', label: 'tab.countries' },
    { id: 'types', label: 'tab.types' },
    { id: 'words', label: 'tab.words' },
    { id: 'languages', label: 'tab.languages' },
    { id: 'categories', label: 'tab.categories' },
    { id: 'timeline', label: 'tab.timeline' },
  ];

  // Create reactive translations for tab labels
  $: tabLabels = tabs.map(tab => ({
    ...tab,
    translatedLabel: t(tab.label)
  }));

  // Update tab labels when language changes
  $: if ($languageStore && isMounted) {
    tabLabels = tabs.map(tab => ({
      ...tab,
      translatedLabel: t(tab.label)
    }));
  }

  // Manually track the language to avoid reactive statements
  let currentLanguage = '';
  let previousLanguage = '';
  
  // Function to handle URL parameters
  function handleUrlParams() {
    if (typeof window === 'undefined') return;
    
    const { lang, tab } = parseUrlParams();
    
    logDebug(COMPONENT_ID, `URL parameters: lang=${lang}, tab=${tab}`);
    
    // Set language if valid
    if (lang) {
      languageStore.setLanguage(lang);
      logDebug(COMPONENT_ID, `Setting language from URL: ${lang}`);
    }
    
    // Set tab if valid
    if (tab && tabs.some(t => t.id === tab)) {
      activeTab = tab;
      logDebug(COMPONENT_ID, `Setting tab from URL: ${tab}`);
    }
  }
  
  // Function to handle tab changes
  function handleTabChange(event: CustomEvent) {
    const tabId = event.detail;
    activeTab = tabId;
    if (currentLanguage) {
      updateUrl(currentLanguage as any, tabId);
    }
  }
  
  function handleLanguageChange(newLang: string) {
    if (!isMounted) {
      logDebug(COMPONENT_ID, `Language change ignored (not mounted): ${newLang}`);
      return;
    }
    
    previousLanguage = currentLanguage;
    currentLanguage = newLang;
    
    // Update URL when language changes
    updateUrl(newLang as any, activeTab);
    
    // Force refresh of tab labels
    tabLabels = tabs.map(tab => ({
      ...tab,
      translatedLabel: t(tab.label)
    }));
    
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
    
    // Re-check tabs overflow after translation update
    setTimeout(() => {
      if (appHeader) {
        appHeader.checkOverflow();
        appHeader.scrollToActive();
      }
    }, 100);
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
      
      // Parse URL parameters first
      handleUrlParams();
      
      logDebug(COMPONENT_ID, `Component mounted, initial language: ${$languageStore}`, {
        storeValue: $languageStore,
        activeTab
      });
      
      // Set initial language
      currentLanguage = $languageStore;
      
      // Initialize tab labels
      tabLabels = tabs.map(tab => ({
        ...tab,
        translatedLabel: t(tab.label)
      }));
      
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
  <main class="container mx-auto p-md">
    <AppHeader 
      bind:this={appHeader}
      {activeTab}
      {tabs}
      {tabLabels}
      on:tabChange={handleTabChange}
    />

    <div class="bg-card rounded shadow p-md min-h-500">
      {#if $itemsStore.loading}
        <div class="flex justify-center items-center text-lg h-full">
          {t('ui.loading')}
        </div>
      {:else if $itemsStore.error}
        <div class="flex justify-center items-center text-lg text-error h-full">
          {$itemsStore.error}
        </div>
      {:else}
        {#if activeTab === 'countries'}
          <CountryDistribution />
        {:else if activeTab === 'types'}
          <TypeDistribution />
        {:else if activeTab === 'words'}
          <WordDistribution />
        {:else if activeTab === 'languages'}
          <LanguageDistribution />
        {:else if activeTab === 'categories'}
          <IndexDistribution />
        {:else if activeTab === 'timeline'}
          <TimelineDistribution />
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
  /* 
   * App.svelte - Main application styles
   * 
   * This component primarily uses utility classes from our design system.
   * Custom styles here are only for complex interactions that can't be achieved with utilities.
   */

  /* Legacy variable mappings for backwards compatibility - will be phased out */
  :global(:root) {
    --primary-color: var(--color-primary);
    --secondary-color: var(--color-secondary);
    --text-color: var(--color-text-primary);
    --background-color: var(--color-bg-page);
    --card-background: var(--color-bg-card);
    --border-color: var(--color-border);
    --card-shadow: var(--shadow-md);
    --text-color-light: var(--color-text-light);
    --text-color-primary: var(--color-text-primary);
    --text-color-secondary: var(--color-text-secondary);
    --border-radius-sm: var(--radius-sm);
    --border-radius-md: var(--radius-md);
    --border-radius-lg: var(--radius-lg);
    --font-family-primary: var(--font-family-base);
    --primary-color-faded: var(--color-primary-300);
    --divider-color: var(--color-border-light);
    --font-size-xxl: var(--font-size-2xl);
  }

  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    /* Make the container more compact on mobile */
    main {
      padding: var(--spacing-sm);
    }
  }
  
  /* Extra small mobile devices */
  @media (max-width: 480px) {
    main {
      padding: var(--spacing-xs);
    }
  }

  /* 
   * Utility classes used in this component:
   * Layout: container, mx-auto, p-md, flex, justify-center, items-center
   * Typography: text-lg, text-error
   * Display: bg-card, rounded, shadow, min-h-500, h-full
   * 
   * This demonstrates the utility-first approach while maintaining necessary custom styles
   * for responsive design and legacy compatibility.
   */
</style>
