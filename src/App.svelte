<script lang="ts">
  import { onMount, onDestroy, afterUpdate, beforeUpdate } from 'svelte';
  import itemsStore from './stores/itemsStore';
  import { t, languageStore, translate } from './stores/translationStore';
  import LanguageToggle from './components/LanguageToggle.svelte';
  import FullScreenToggle from './components/FullScreenToggle.svelte';
  import DownloadToggle from './components/DownloadToggle.svelte';
  import TranslationContext from './components/TranslationContext.svelte';
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
  
  // DOM References
  let tabsContainer: HTMLElement;

  // Create a reactive title
  const appTitle = translate('app.title');

  // Import visualization components here
  // They will be created in the next steps

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
  
  // Function to check if tabs need a scrollbar indicator
  function checkTabsOverflow() {
    if (!tabsContainer) return;
    
    const hasOverflow = tabsContainer.scrollWidth > tabsContainer.clientWidth;
    if (hasOverflow) {
      tabsContainer.classList.add('tab-scroll-active');
    } else {
      tabsContainer.classList.remove('tab-scroll-active');
    }
  }
  
  // Scroll to make the active tab visible
  function scrollToActiveTab() {
    if (!tabsContainer) return;
    
    const activeTabEl = tabsContainer.querySelector('.tab-item.active') as HTMLElement;
    if (!activeTabEl) return;
    
    // Calculate position to scroll
    const containerRect = tabsContainer.getBoundingClientRect();
    const tabRect = activeTabEl.getBoundingClientRect();
    
    // Check if tab is partially outside visible area
    const isTabRightVisible = tabRect.right <= containerRect.right;
    const isTabLeftVisible = tabRect.left >= containerRect.left;
    
    if (!isTabRightVisible) {
      // If tab is to the right of view, scroll it into view
      // Use scrollIntoView for better cross-browser support when available
      try {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {
        // Fallback for browsers that don't support smooth scrolling options
        tabsContainer.scrollLeft += (tabRect.right - containerRect.right + 16);
      }
    } else if (!isTabLeftVisible) {
      // If tab is to the left of view, scroll it into view
      try {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {
        // Fallback for browsers that don't support smooth scrolling options
        tabsContainer.scrollLeft += (tabRect.left - containerRect.left - 16);
      }
    }
  }
  
  // Function to handle tab changes
  function handleTabChange(tabId: string) {
    activeTab = tabId;
    if (currentLanguage) {
      updateUrl(currentLanguage as any, tabId);
    }
    
    // Schedule scroll to the selected tab after UI update
    setTimeout(() => {
      scrollToActiveTab();
    }, 50);
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
      checkTabsOverflow();
      scrollToActiveTab();
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
      
      // Set up tab container listeners
      if (tabsContainer) {
        // Check for tab overflow
        checkTabsOverflow();
        
        // Firefox-specific scrollbar hiding (since we can't use scrollbar-width CSS property)
        // This adds a Firefox-only CSS rule dynamically
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
          const style = document.createElement('style');
          style.textContent = '.tabs-container { scrollbar-width: none; }';
          style.setAttribute('data-firefox-scrollbar', 'true');
          document.head.appendChild(style);
        }
        
        // Add scroll listener to toggle indicator
        tabsContainer.addEventListener('scroll', handleScroll);
        
        // Trigger initial scroll check
        tabsContainer.dispatchEvent(new Event('scroll'));
        
        // Add window resize listener
        window.addEventListener('resize', handleResize);
        
        // Scroll to active tab
        setTimeout(() => {
          scrollToActiveTab();
        }, 100);
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
      
      // Clean up all event listeners
      if (tabsContainer) {
        // Remove scroll listener
        tabsContainer.removeEventListener('scroll', handleScroll);
        // Remove the Firefox-specific style if added
        const firefoxStyle = document.querySelector('style[data-firefox-scrollbar]');
        if (firefoxStyle) {
          firefoxStyle.remove();
        }
      }
      
      // Remove window resize listener
      window.removeEventListener('resize', handleResize);
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
    
    // Check tabs overflow after update
    setTimeout(() => {
      checkTabsOverflow();
    }, 50);
  });

  // Handle tab scroll events
  function handleScroll() {
    if (!tabsContainer) return;
    
    // Check if we're at the end of the scroll
    const isAtEnd = tabsContainer.scrollLeft + tabsContainer.clientWidth >= tabsContainer.scrollWidth - 5;
    // Check if we're at the beginning of the scroll
    const isAtStart = tabsContainer.scrollLeft <= 5;
    
    if (isAtEnd) {
      tabsContainer.classList.remove('tab-scroll-active');
    } else {
      tabsContainer.classList.add('tab-scroll-active');
    }
    
    if (isAtStart) {
      tabsContainer.classList.remove('tab-scroll-not-at-start');
    } else {
      tabsContainer.classList.add('tab-scroll-not-at-start');
    }
  }
  
  // Handle window resize events
  function handleResize() {
    checkTabsOverflow();
    scrollToActiveTab();
  }
</script>

<TranslationContext>
  <main class="container mx-auto p-md">
    <header class="mb-lg">
      <div class="flex justify-between items-center mb-md header-top">
        <h1 class="m-0 text-2xl font-bold text-primary header-title">{@html $appTitle}</h1>
        <div class="flex gap-md items-center header-actions">
          <DownloadToggle />
          <FullScreenToggle />
          <LanguageToggle />
        </div>
      </div>
      <nav>
        <ul class="flex p-0 m-0 border-b border-solid border-default list-style-none app-tabs tabs-container" bind:this={tabsContainer}>
          <div class="tab-scroll-left-indicator"></div>
          <div class="tab-scroll-indicator"></div>
          {#each tabLabels as tab}
            <li 
              class="py-sm px-md cursor-pointer transition-colors tab-item tab-flexible tabs-mobile {activeTab === tab.id ? 'active' : ''}"
              on:click={() => handleTabChange(tab.id)}
              on:keydown={(e) => e.key === 'Enter' && handleTabChange(tab.id)}
              role="tab"
              tabindex="0"
              aria-selected={activeTab === tab.id}
            >
              {tab.translatedLabel}
            </li>
          {/each}
        </ul>
      </nav>
    </header>

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

  /* Tab navigation styles - uses design system variables */
  .app-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .app-tabs::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .tab-item {
    border-bottom: var(--border-width-normal) solid transparent;
    transition: all var(--transition-fast) var(--ease-out);
    white-space: nowrap;
    flex-shrink: 0;
    position: relative;
  }

  .tab-item:hover {
    background-color: var(--color-bg-hover);
  }

  .tab-item:focus {
    outline: var(--border-width-normal) solid var(--color-primary);
    outline-offset: -2px;
  }

  .tab-item.active {
    border-bottom-color: var(--color-primary);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }

  /* Tab scroll indicators */
  .tab-scroll-indicator,
  .tab-scroll-left-indicator {
    position: absolute;
    top: 0;
    width: var(--spacing-md);
    height: 100%;
    pointer-events: none;
    z-index: 1;
    transition: opacity var(--transition-fast);
  }

  .tab-scroll-indicator {
    right: 0;
    background: linear-gradient(to left, var(--color-bg-page), transparent);
  }

  .tab-scroll-left-indicator {
    left: 0;
    background: linear-gradient(to right, var(--color-bg-page), transparent);
  }

  .tabs-container:not(.tab-scroll-active) .tab-scroll-indicator {
    opacity: 0;
  }

  .tabs-container:not(.tab-scroll-not-at-start) .tab-scroll-left-indicator {
    opacity: 0;
  }

  /* Mobile tab adjustments */
  @media (max-width: 768px) {
    .tab-item {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
    }
    
    /* Mobile header improvements */
    header {
      margin-bottom: var(--spacing-md);
    }
    
    /* Make the header more compact on mobile */
    .header-top {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: flex-start;
    }
    
    .header-title {
      font-size: var(--font-size-xl);
      line-height: var(--line-height-tight);
    }
    
    .header-actions {
      align-self: flex-end;
      gap: var(--spacing-sm);
    }
    
    /* Make the container more compact on mobile */
    main {
      padding: var(--spacing-sm);
    }
    
    /* Improve tabs container for mobile */
    .tabs-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .tabs-container::-webkit-scrollbar {
      display: none;
    }
  }
  
  /* Extra small mobile devices */
  @media (max-width: 480px) {
    .header-title {
      font-size: var(--font-size-lg);
    }
    
    .header-actions {
      gap: var(--spacing-xs);
    }
    
    main {
      padding: var(--spacing-xs);
    }
  }

  /* 
   * Utility classes used in this component:
   * Layout: container, mx-auto, p-md, mb-lg, flex, justify-between, items-center, gap-md
   * Typography: m-0, text-2xl, font-bold, text-primary, text-lg, text-error
   * Spacing: py-sm, px-md, p-0, border-b, border-solid, border-default
   * Interactive: cursor-pointer, transition-colors
   * Display: list-style-none, bg-card, rounded, shadow, min-h-500, h-full, justify-center
   * 
   * This demonstrates the utility-first approach while maintaining necessary custom styles
   * for complex tab navigation behavior and responsive design.
   */
</style>
