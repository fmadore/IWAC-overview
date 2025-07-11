<script lang="ts">
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
  import { parseUrlParams, updateUrl } from './utils/urlUtils';

  let isMounted = $state(false);
  
  // Component references
  let appHeader: any;

  let activeTab = $state('countries');

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
  let tabLabels = $state(tabs.map(tab => ({
    ...tab,
    translatedLabel: t(tab.label)
  })));

  // Force reactivity by watching the language store
  $effect(() => {
    const lang = $languageStore;
    // This will trigger a re-evaluation of tabLabels when language changes
    tabLabels = tabs.map(tab => ({
      ...tab,
      translatedLabel: t(tab.label) // Use t() which gets current language
    }));
  });

  // Manually track the language to avoid reactive statements
  let currentLanguage = $state('');
  let previousLanguage = $state('');
  
  // Function to handle URL parameters
  function handleUrlParams() {
    if (typeof window === 'undefined') return;
    
    const { lang, tab } = parseUrlParams();
    
    // Set language if valid
    if (lang) {
      languageStore.setLanguage(lang);
    }
    
    // Set tab if valid
    if (tab && tabs.some(t => t.id === tab)) {
      activeTab = tab;
    }
  }
  
  // Function to handle tab changes
  function handleTabChange(tabId: string) {
    activeTab = tabId;
    if (currentLanguage) {
      updateUrl(currentLanguage as any, tabId);
    }
  }
  
  function handleLanguageChange(newLang: string) {
    if (!isMounted) {
      return;
    }
    
    previousLanguage = currentLanguage;
    currentLanguage = newLang;
    
    // Update URL when language changes
    updateUrl(newLang as any, activeTab);
    
    // Re-check tabs overflow after translation update
    setTimeout(() => {
      if (appHeader) {
        appHeader.checkOverflow();
        appHeader.scrollToActive();
      }
    }, 100);
  }

  // Use $effect to handle component initialization and language changes
  $effect(() => {
    if (!isMounted) {
      try {
        isMounted = true;
        
        // Parse URL parameters first
        handleUrlParams();
        
        // Set initial language
        currentLanguage = $languageStore;
        
        // Load items if not already loaded
        if (!$itemsStore.items || $itemsStore.items.length === 0) {
          itemsStore.loadItems();
        }
      } catch (e) {
        console.error('[App] Error in initialization:', e);
      }
    }
  });
  
  // Use $effect to watch for language changes
  $effect(() => {
    const newLang = $languageStore;
    if (isMounted && newLang !== currentLanguage) {
      handleLanguageChange(newLang);
    }
  });
</script>

<TranslationContext>
  {#snippet children()}
    <main class="container mx-auto p-md">
      <AppHeader 
        bind:this={appHeader}
        {activeTab}
        {tabs}
        {tabLabels}
        ontabChange={handleTabChange}
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
  {/snippet}
</TranslationContext>

<style>
  /* 
   * App.svelte - Main application styles
   * 
   * This component primarily uses utility classes from our design system.
   * Custom styles here are only for complex interactions that can't be achieved with utilities.
   */

  /* Legacy variable mappings - minimal set for backwards compatibility */
  :global(:root) {
    --border-radius-sm: var(--radius-sm);
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
