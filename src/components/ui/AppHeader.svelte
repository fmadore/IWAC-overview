<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t, translate } from '../../stores/translationStore';
  import LanguageToggle from '../LanguageToggle.svelte';
  import FullScreenToggle from '../FullScreenToggle.svelte';
  import DownloadToggle from '../DownloadToggle.svelte';

  // Props - Svelte 5 syntax
  let { activeTab, tabs, tabLabels } = $props();

  // Create event dispatcher
  const dispatch = createEventDispatcher();

  // DOM References
  let tabsContainer: HTMLUListElement;

  // Create a reactive title
  const appTitle = translate('app.title');

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
    
    const activeTabEl = tabsContainer.querySelector('.tab-item.active');
    if (!activeTabEl) return;
    
    // Calculate position to scroll
    const containerRect = tabsContainer.getBoundingClientRect();
    const tabRect = activeTabEl.getBoundingClientRect();
    
    // Check if tab is partially outside visible area
    const isTabRightVisible = tabRect.right <= containerRect.right;
    const isTabLeftVisible = tabRect.left >= containerRect.left;
    
    if (!isTabRightVisible) {
      // If tab is to the right of view, scroll it into view
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
    dispatch('tabChange', tabId);
    
    // Schedule scroll to the selected tab after UI update
    setTimeout(() => {
      scrollToActiveTab();
    }, 50);
  }

  // Handle scroll events
  function handleScroll() {
    if (!tabsContainer) return;
    
    const scrollLeft = tabsContainer.scrollLeft;
    const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
    
    // Update scroll indicators based on scroll position
    const isAtEnd = scrollLeft + tabsContainer.clientWidth >= tabsContainer.scrollWidth - 5;
    const isAtStart = scrollLeft <= 5;
    
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

  // Export methods that parent can call
  export function checkOverflow() {
    checkTabsOverflow();
  }

  export function scrollToActive() {
    scrollToActiveTab();
  }
</script>

<svelte:window onresize={handleResize} />

<header class="app-header mb-lg">
  <div class="flex justify-between items-center mb-md header-top">
    <h1 class="m-0 text-2xl font-bold text-primary header-title">{@html $appTitle}</h1>
    <div class="flex gap-md items-center header-actions">
      <DownloadToggle />
      <FullScreenToggle />
      <LanguageToggle />
    </div>
  </div>
  <nav class="header-nav">
    <ul 
      class="flex p-0 m-0 border-b border-solid border-default list-style-none app-tabs tabs-container" 
      bind:this={tabsContainer}
      onscroll={handleScroll}
    >
      <div class="tab-scroll-left-indicator"></div>
      <div class="tab-scroll-indicator"></div>
      {#each tabLabels as tab}
        <li 
          class="py-sm px-md cursor-pointer transition-colors tab-item tab-flexible tabs-mobile {activeTab === tab.id ? 'active' : ''}"
          onclick={() => handleTabChange(tab.id)}
          onkeydown={(e) => e.key === 'Enter' && handleTabChange(tab.id)}
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

<style>
  /* Use global CSS variables for consistency */
  .app-header {
    margin-bottom: var(--spacing-lg);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .header-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
  }

  .header-nav .tabs-container {
    display: flex;
    padding: 0;
    margin: 0;
    border-bottom: var(--border-width-thin) solid var(--color-border);
    list-style: none;
    overflow-x: auto;
    scroll-behavior: smooth;
    position: relative;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }

  .header-nav .tabs-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .tab-item {
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    transition: all var(--transition-fast) var(--ease-out);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    flex-shrink: 0;
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    position: relative;
  }

  .tab-item:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .tab-item.active {
    border-bottom-color: var(--color-primary);
    color: var(--color-primary);
    background-color: var(--color-primary-50);
    font-weight: var(--font-weight-bold);
  }

  .tab-item:focus {
    outline: var(--border-width-normal) solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Scroll indicators - Updated logic */
  .tab-scroll-left-indicator,
  .tab-scroll-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--spacing-md);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: 1;
  }

  .tab-scroll-left-indicator {
    left: 0;
    background: linear-gradient(to right, var(--color-bg-page), transparent);
  }

  .tab-scroll-indicator {
    right: 0;
    background: linear-gradient(to left, var(--color-bg-page), transparent);
  }

  /* Show/hide indicators based on scroll state */
  .tabs-container:not(.tab-scroll-active) .tab-scroll-indicator {
    opacity: 0;
  }

  .tabs-container:not(.tab-scroll-not-at-start) .tab-scroll-left-indicator {
    opacity: 0;
  }

  /* These selectors are applied dynamically via JavaScript */
  :global(.tabs-container.tab-scroll-active .tab-scroll-indicator) {
    opacity: 1;
  }

  :global(.tabs-container.tab-scroll-not-at-start .tab-scroll-left-indicator) {
    opacity: 1;
  }

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .header-top {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: stretch;
    }

    .header-title {
      font-size: var(--font-size-xl);
      text-align: center;
    }

    .header-actions {
      justify-content: center;
    }

    .tab-item {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
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
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .tab-item {
      transition: none;
    }
    
    .tabs-container {
      scroll-behavior: auto;
    }
  }
</style>
