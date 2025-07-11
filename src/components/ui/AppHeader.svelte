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

<header class="app-header">
  <div class="header-container">
    <div class="header-top">
      <h1 class="header-title">{@html $appTitle}</h1>
      <div class="header-actions">
        <DownloadToggle />
        <FullScreenToggle />
        <LanguageToggle />
      </div>
    </div>
    <nav class="header-nav">
      <ul 
        class="tabs-container" 
        bind:this={tabsContainer}
        onscroll={handleScroll}
      >
        <div class="tab-scroll-left-indicator"></div>
        <div class="tab-scroll-indicator"></div>
        {#each tabLabels as tab}
          <li 
            class="tab-item {activeTab === tab.id ? 'active' : ''}"
            onclick={() => handleTabChange(tab.id)}
            onkeydown={(e) => e.key === 'Enter' && handleTabChange(tab.id)}
            role="tab"
            tabindex="0"
            aria-selected={activeTab === tab.id}
          >
            <span class="tab-label">{tab.translatedLabel}</span>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</header>

<style>
  /* Modern Header Design */
  .app-header {
    background: linear-gradient(135deg, var(--color-bg-page) 0%, var(--color-bg-card) 100%);
    border-bottom: var(--border-width-thin) solid var(--color-border);
    margin-bottom: var(--spacing-xl);
    box-shadow: var(--shadow-sm);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
  }

  /* Fix any text decoration inheritance issues */
  .app-header,
  .app-header *,
  .app-header *::before,
  .app-header *::after {
    text-decoration: none;
  }

  .header-container {
    max-width: var(--container-xl);
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg) 0;
    border-bottom: var(--border-width-thin) solid var(--color-border-light);
  }

  .header-title {
    margin: 0;
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: var(--letter-spacing-tight);
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
  }

  .header-nav {
    padding: var(--spacing-sm) 0;
    position: relative;
    overflow: visible;
  }

  .tabs-container {
    display: flex;
    padding: 0;
    margin: 0;
    list-style: none;
    overflow-x: auto;
    scroll-behavior: smooth;
    position: relative;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    gap: var(--spacing-xs);
    padding-bottom: var(--spacing-sm); /* Add space for the active indicator */
  }

  .tabs-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  .tab-item {
    position: relative;
    cursor: pointer;
    transition: all var(--transition-fast) var(--ease-out);
    white-space: nowrap;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    overflow: hidden;
    /* Fix double underline issue */
    text-decoration: none;
  }

  .tab-label {
    display: block;
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast) var(--ease-out);
    /* Ensure no text decoration */
    text-decoration: none;
    border: none;
    background: transparent;
    position: relative;
    z-index: 1;
  }

  .tab-item:hover .tab-label {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-xs);
  }

  /* Prevent hover effects on active tab */
  .tab-item.active:hover .tab-label {
    color: var(--color-primary);
    background: var(--color-primary-50);
    transform: none;
    box-shadow: var(--shadow-sm);
    border-color: var(--color-primary-100);
  }

  .tab-item.active .tab-label {
    color: var(--color-primary);
    background: var(--color-primary-50);
    font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-sm);
    border: var(--border-width-thin) solid var(--color-primary-100);
    position: relative;
  }

  /* Modern active indicator - more prominent */
  .tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10%;
    width: 80%;
    height: var(--border-width-thick);
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-full);
    animation: slideIn var(--transition-normal) var(--ease-out);
    z-index: var(--z-above);
  }

  /* Add a subtle shadow to the active indicator */
  .tab-item.active::before {
    content: '';
    position: absolute;
    bottom: calc(-1 * var(--spacing-2xs));
    left: 10%;
    width: 80%;
    height: var(--border-width-thick);
    background: var(--color-primary-200);
    border-radius: var(--radius-full);
    filter: blur(2px);
    z-index: var(--z-base);
  }

  @keyframes slideIn {
    from {
      width: 0;
      opacity: 0;
      left: 50%;
    }
    to {
      width: 80%;
      opacity: 1;
      left: 10%;
    }
  }

  .tab-item:focus {
    outline: var(--border-width-normal) solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-lg);
  }

  /* Scroll indicators with modern glassmorphism */
  .tab-scroll-left-indicator,
  .tab-scroll-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: var(--spacing-xl);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast) var(--ease-out);
    z-index: var(--z-above);
    backdrop-filter: blur(8px);
  }

  .tab-scroll-left-indicator {
    left: 0;
    background: linear-gradient(to right, 
      var(--color-bg-page) 0%, 
      transparent 100%);
  }

  .tab-scroll-indicator {
    right: 0;
    background: linear-gradient(to left, 
      var(--color-bg-page) 0%, 
      transparent 100%);
  }

  /* Show/hide indicators based on scroll state */
  :global(.tabs-container.tab-scroll-active .tab-scroll-indicator) {
    opacity: 1;
  }

  :global(.tabs-container.tab-scroll-not-at-start .tab-scroll-left-indicator) {
    opacity: 1;
  }

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .app-header {
      background: var(--color-bg-card);
      border-bottom: var(--border-width-thin) solid var(--color-border-light);
      margin-bottom: var(--spacing-lg);
      box-shadow: var(--shadow-xs);
    }

    .header-container {
      padding: 0 var(--spacing-sm);
    }

    .header-top {
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: center;
      padding: var(--spacing-md) 0;
      border-bottom: none;
    }

    .header-title {
      font-size: var(--font-size-xl);
      text-align: center;
      /* Remove gradient on mobile for better readability */
      background: none;
      -webkit-background-clip: unset;
      -webkit-text-fill-color: unset;
      background-clip: unset;
      color: var(--color-text-primary);
      letter-spacing: var(--letter-spacing-normal);
    }

    .header-actions {
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .header-nav {
      padding: var(--spacing-xs) 0;
      border-top: var(--border-width-thin) solid var(--color-border-light);
    }

    .tabs-container {
      gap: var(--spacing-2xs);
      padding-bottom: var(--spacing-xs);
    }

    .tab-item {
      border-radius: var(--radius-md);
    }

    .tab-label {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }

    .tab-item.active .tab-label {
      font-weight: var(--font-weight-semibold);
      background: var(--color-primary-100);
      color: var(--color-primary);
      border: var(--border-width-thin) solid var(--color-primary-200);
    }

    .tab-item.active::after {
      height: var(--spacing-2xs);
      bottom: calc(-1 * var(--spacing-2xs));
      left: 15%;
      width: 70%;
    }

    .tab-item.active::before {
      display: none; /* Remove shadow on mobile */
    }
  }

  /* Extra small mobile devices */
  @media (max-width: 480px) {
    .header-container {
      padding: 0 var(--spacing-xs);
    }

    .header-top {
      padding: var(--spacing-sm) 0;
      gap: var(--spacing-xs);
    }

    .header-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .header-actions {
      gap: var(--spacing-xs);
    }

    .tabs-container {
      gap: 0;
    }

    .tab-item {
      border-radius: var(--radius-sm);
    }

    .tab-label {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-xs);
    }

    .tab-item.active::after {
      height: var(--spacing-2xs);
      left: 20%;
      width: 60%;
    }
  }

  /* Dark mode compatibility */
  @media (prefers-color-scheme: dark) {
    .tab-scroll-left-indicator {
      background: linear-gradient(to right, 
        var(--color-bg-page) 0%, 
        transparent 100%);
    }

    .tab-scroll-indicator {
      background: linear-gradient(to left, 
        var(--color-bg-page) 0%, 
        transparent 100%);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .tab-item,
    .tab-label {
      transition: none;
    }
    
    .tabs-container {
      scroll-behavior: auto;
    }
    
    .tab-item.active::after {
      animation: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .tab-item.active .tab-label {
      background: var(--color-primary);
      color: var(--color-text-light);
    }
    
    .tab-item.active::after {
      background: var(--color-text-primary);
      height: var(--border-width-thick);
    }
  }
</style>
