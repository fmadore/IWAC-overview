# IWAC Database Overview

A data visualization application for exploring the Indigenous World Arts and Cultures (IWAC) database. This application provides interactive visualizations for different aspects of the IWAC collection, including country distribution, timeline, languages, and more.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Subcollection Categories](#subcollection-categories)
- [Data Management](#data-management)
- [UI Elements](#ui-elements)
- [Theme System](#theme-system)
- [Translation System](#translation-system)
- [URL Parameters](#url-parameters)
- [Embedding in iframes](#embedding-in-iframes)
- [Visualizations](#visualizations)
  - [Country Distribution](#country-distribution)
  - [Language Distribution](#language-distribution)
  - [Index Distribution](#index-distribution)
  - [Timeline Distribution](#timeline-distribution)
  - [Type Distribution](#type-distribution)
  - [Word Distribution](#word-distribution)
- [Creating New Visualizations](#creating-new-visualizations)
- [Extending Functionality](#extending-functionality)
- [Development Setup](#development-setup)
- [Local Testing](#local-testing)
- [Debugging Tools](#debugging-tools)
- [TypeScript Configuration](#typescript-configuration)
- [Deployment](#deployment)

## Overview

The IWAC Database Overview is a Svelte-based application that offers a set of interactive visualizations for exploring the IWAC database collection. The application features a tab-based interface where users can switch between different visualization types to gain insights into various aspects of the collection.

Key features:
- Interactive D3.js visualizations
- Multilingual support with English and French translations
- Fullscreen mode for immersive data exploration
- Country distribution treemap visualization
- Language distribution pie chart with faceted filtering
- Index distribution bar chart with category breakdown
- Timeline visualization showing database growth over time
- Type distribution stacked bar chart showing items by type across years
- Responsive design
- Clean, modern UI
- Type-safe development with TypeScript
- Centralized theming system with CSS variables
- URL parameter support for direct access to specific views

## Project Structure

```
IWAC-overview/
├── public/               # Static assets and items.json data file
│   └── items.json        # Database items in JSON format
├── src/
│   ├── components/       # UI components
│   │   ├── DebugPanel.svelte    # Debug panel component (hidden in production)
│   │   ├── LanguageToggle.svelte    # Language switching component
│   │   ├── FullScreenToggle.svelte  # Fullscreen mode toggle component
│   │   ├── TranslationContext.svelte # Translation context provider
│   │   └── visualizations/  # Visualization components
│   │       ├── BaseVisualization.svelte  # Base component for visualizations
│   │       ├── CountryDistribution.svelte  # Country distribution treemap
│   │       ├── LanguageDistribution.svelte  # Language distribution pie chart
│   │       ├── IndexDistribution.svelte  # Index distribution bar chart
│   │       ├── TimelineDistribution.svelte  # Timeline showing database growth
│   │       └── TypeDistribution.svelte  # Type distribution stacked bar chart
│   ├── stores/           # Svelte stores for state management
│   │   ├── itemsStore.ts  # Store for database items
│   │   └── translationStore.ts # Store for translations and language state
│   ├── types/            # TypeScript type definitions
│   │   ├── OmekaItem.ts   # Types for Omeka items and visualization data
│   │   ├── SubcollectionCategories.ts # Subcollection category definitions and mappings
│   │   ├── global.d.ts    # Global type declarations
│   │   ├── svelte-components.d.ts # Component type definitions
│   │   └── svelte-store.d.ts # Store type definitions
│   ├── utils/            # Utility functions
│   │   ├── debug.ts      # Debug utility with production/development toggle
│   │   └── logger.ts      # Logging utility
│   ├── App.svelte        # Main application component
│   ├── app.css           # Global styles
│   ├── theme.css         # Centralized theme system with CSS variables
│   └── main.ts           # Application entry point
├── index.html            # HTML entry point
├── tsconfig.json         # TypeScript configuration
└── README.md             # This documentation file
```

## Core Components

### App.svelte

The main application component that defines the tab-based interface and renders the active visualization. It manages the tab state and initializes the data loading process.

### BaseVisualization.svelte

A base component that provides common functionality for all visualization components:
- Responsive container with loading/error states
- Title and description properties
- SVG setup with D3.js
- ResizeObserver for responsive rendering

### CountryDistribution.svelte

A treemap visualization that shows the distribution of items by country, category, and sub-collection. Features include:
- Three-level hierarchical structure (Country > Category > Subcollection)
- Interactive zooming for hierarchical exploration
- Consistent color scheme matching the Word Distribution visualization
- Categories shown directly in the first-level view for better context
- Color consistency between parent and child elements for easier tracking
- Tooltips with detailed information on item counts and percentages
- Country headers with total item counts
- Responsive layout that adapts to container size
- Summary statistics panel showing total items, countries, categories, and subcollections

### LanguageDistribution.svelte

A pie chart visualization that shows the distribution of items by language with dynamic filtering capabilities:
- Interactive pie chart with hover effects
- Filtering by country and document type
- Real-time updates as filters change
- Color-coded legend with counts and percentages
- Tooltips with detailed information

### IndexDistribution.svelte

A bar chart visualization that shows the distribution of index items (type "Notice d'autorité") by their categories.

Features:
- Interactive bar chart with hover effects and animations
- Filtering for items of type "Notice d'autorité"
- Categories determined by the "item_set_title" field
- Color-coded bars for easy distinction between categories
- Tooltips showing detailed information on hover
- Rotated x-axis labels for better readability of category names
- Top 5 categories summary with percentage breakdown
- Statistics panel showing total index items and number of categories
- Responsive design that adapts to different screen sizes
- Multilingual support with translations for common categories (Events, Locations, Organizations, Persons, Topics)

### TimelineDistribution.svelte

A dual-axis line chart visualization that shows the growth of the database over time.

Features:
- Tracks monthly additions and cumulative totals using the "created_date" field
- Filters display to show only data from April 2024 onward, while maintaining the total count from March 2024 backup data
- Visual divider line between charts to clearly separate monthly additions from cumulative growth
- Optimized spacing between charts for better readability
- Interactive visualization with hover effects and tooltips
- Faceted filtering by country and document type
- Blue line with dots representing monthly additions
- Green dotted line representing the cumulative total items
- Detailed tooltips showing monthly counts and percentages
- Summary statistics showing total items, time period, and average monthly additions
- List of peak growth months with their contribution percentages
- Responsive design that adapts to different screen sizes
- Color-coded legend for clarity

### TypeDistribution.svelte

A stacked bar chart visualization that shows the distribution of items by type across publication years.

Features:
- Stacked bar chart showing item types distributed by publication year
- Extract years from various date formats (YYYY, YYYY-MM, YYYY-MM-DD)
- Multi-select country filtering with checkbox facets
- Year range slider to adjust the time period displayed
- Interactive visualization with hover effects and detailed tooltips
- Color-coded stacks for different item types with legend
- Detailed tooltips showing count and percentage breakdown by type for each year
- Summary statistics showing total items and publication years range
- Responsive design that adapts to different screen sizes

### Word Distribution

The Word Distribution visualization uses a treemap to show the distribution of word counts across items, organized by country and item set.

Features:
- Interactive treemap visualization with hover effects and detailed tooltips
- Hierarchical organization of data by country and item_set_title
- Rectangle sizes proportional to word counts
- Zoom functionality to focus on specific countries with a "Back to All" option
- Detailed tooltips showing word count, item count, average words per item, and percentage statistics
- Color-coding by country with lighter shades for item sets
- Summary statistics showing total items with word count, total words, and average words per item
- Responsive design that adapts to different screen sizes

### LanguageToggle.svelte

A component that allows users to switch between English and French language modes. The toggle button updates the language store, which triggers reactive updates throughout the application.

### FullScreenToggle.svelte

A component that provides fullscreen functionality for a more immersive data exploration experience:
- Toggle between normal and fullscreen modes
- Responsive SVG icons that change based on the current state
- Multilingual tooltips for accessibility
- Keyboard event handling for fullscreen changes
- Clean integration with the application header

#### Fullscreen Toggle
- Enables fullscreen mode for a more immersive visualization experience
- Shows different icons based on the current fullscreen state
- Provides localized tooltips in the current language
- Automatically updates its state when the user exits fullscreen using browser controls

#### DownloadToggle
- Allows users to download the current visualization as an SVG file
- Includes the visualization title in the downloaded file
- File is named based on the current visualization title and tab name
- Properly handles styling and preserves the visual appearance of the graph
- SVG format ensures high-quality, resolution-independent images suitable for publications and presentations
- Exports the visualization in the current language state

### Tab Navigation
- Provides easy access to different visualization types
- Highlights the currently active tab
- Updates the URL for direct linking to specific visualizations
- Supports keyboard navigation

### Visualization Header
- Displays the title of the current visualization
- Includes an expandable description panel with detailed information
- Supports HTML content in titles for rich formatting

## Translation System

The application includes a comprehensive translation system that supports multiple languages (currently English and French) with easy extensibility for additional languages.

### Core Components

#### TranslationContext.svelte
A context provider component that wraps the application and provides translation functionality to all child components:

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import { languageStore } from '../stores/translationStore';

    onMount(() => {
        console.log('[TranslationContext] Component mounted, initial language:', $languageStore);
    });
</script>

<slot />
```

#### LanguageToggle.svelte
A reusable component that provides language switching functionality:

```svelte
<script lang="ts">
    import { languageStore, translate } from '../stores/translationStore';
    const toggleText = translate('ui.toggle_language');
</script>

<button class="language-toggle" on:click={() => languageStore.toggleLanguage()}>
    {$toggleText}
</button>
```

#### DownloadToggle.svelte
A reusable component that allows users to download the current visualization as an SVG file:

```svelte
<script lang="ts">
    import { t } from '../stores/translationStore';
    
    function downloadVisualization() {
        // Get SVG element and prepare for download
        const svg = document.querySelector('.visualization-content svg');
        if (svg) {
            // Clone and enhance SVG with proper styling and title
            const clonedSvg = svg.cloneNode(true) as SVGElement;
            // ... process SVG for download ...
            
            // Create download link with the visualization name
            const downloadLink = document.createElement('a');
            downloadLink.download = `iwac-visualization.svg`;
            downloadLink.click();
        }
    }
</script>

<button class="btn btn-primary btn-icon" on:click={downloadVisualization} title={t('ui.download_visualization')}>
    <!-- Download icon SVG -->
</button>
```

### Translation Store

The translation system is implemented in `translationStore.ts` using Svelte stores:

```typescript
// Language type definition
export type Language = 'en' | 'fr';

// Translation store creation
function createTranslationStore() {
    const { subscribe, set, update } = writable<Language>('en');
    
    return {
        subscribe,
        setLanguage: (language: Language) => set(language),
        toggleLanguage: () => update(currentLang => {
            // Add new language to the rotation
            const languages: Language[] = ['en', 'fr', 'your_new_language'];
            const currentIndex = languages.indexOf(currentLang);
            const nextIndex = (currentIndex + 1) % languages.length;
            return languages[nextIndex];
        })
    };
}

export const languageStore = createTranslationStore();

// Translation helpers
export function t(key: string, replacements: string[] = []): string {
    const currentLang = get(languageStore);
    const translation = translations[currentLang]?.[key] || key;
    return processTranslation(translation, replacements);
}

export function translate(key: string, replacements: string[] = []) {
    return derived(languageStore, ($language) => {
        const translation = translations[$language]?.[key] || key;
        return processTranslation(translation, replacements);
    });
}
```

### Translation Structure

Translations are organized in a structured object with namespaced keys:

```typescript
export const translations: Translations = {
    en: {
        // App navigation
        'app.title': 'IWAC Database Overview',
        'tab.countries': 'Country Distribution',
        
        // Visualization components
        'viz.distribution_items': 'Distribution of {0} items by country and sub-collection',
        'viz.country.items': 'Items',
        'viz.country.percent_parent': '% of Parent',
        
        // UI elements
        'ui.loading': 'Loading database...',
        'ui.toggle_language': 'Changer en français',
        
        // Category translations
        'category.Events': 'Events',
        'category.Locations': 'Locations',
        'category.Organizations': 'Organizations',
        'category.Persons': 'Persons',
        'category.Topics': 'Topics',
    },
    fr: {
        // App navigation
        'app.title': 'Aperçu de la base de données IWAC',
        'tab.countries': 'Répartition par pays',
        
        // Visualization components
        'viz.distribution_items': 'Répartition de {0} éléments par pays et sous-collection',
        'viz.country.items': 'Éléments',
        'viz.country.percent_parent': '% du parent',
        
        // UI elements
        'ui.loading': 'Chargement de la base de données...',
        'ui.toggle_language': 'Switch to English',
        
        // Category translations
        'category.Events': 'Événements',
        'category.Locations': 'Lieux',
        'category.Organizations': 'Organisations',
        'category.Persons': 'Personnes',
        'category.Topics': 'Sujets',
    }
};
```

### Using Translations in Components

There are two ways to use translations in components:

1. **Reactive Translations** (preferred for dynamic content):
```svelte
<script>
    import { translate } from '../stores/translationStore';
    
    // Create reactive translations
    const titleText = translate('viz.title');
    const itemsText = translate('viz.items');
    const distributionText = translate('viz.distribution_items');
    
    // With parameters
    $: itemCount = items.length;
    $: title = $distributionText([itemCount.toString()]);
</script>

<div class="visualization-title">{title}</div>
<div class="items-count">{$itemsText}: {itemCount}</div>
```

2. **Direct Translations** (for static content or one-time use):
```svelte
<script>
    import { t } from '../stores/translationStore';
</script>

<div class="error">{t('ui.error_message')}</div>
```

### Best Practices

1. **Structured Keys**
   - Use namespaced keys (e.g., 'viz.country.items')
   - Group related translations together
   - Use consistent naming conventions

2. **Dynamic Content**
   - Use parameters instead of string concatenation
   - Always provide fallback values for parameters
   - Use reactive translations for content that changes

3. **Maintenance**
   - Keep translations organized by feature/component
   - Document all translation keys
   - Ensure all strings are translated in all supported languages

4. **Performance**
   - Use `translate()` for reactive content that needs to update with language changes
   - Use `t()` for static content that only needs translation once
   - Avoid creating unnecessary reactive translations

### Adding New Languages

To add support for a new language:

1. Update the Language type:
```typescript
export type Language = 'en' | 'fr' | 'your_new_language';
```

2. Add translations for the new language:
```typescript
export const translations: Translations = {
    en: { /* existing English translations */ },
    fr: { /* existing French translations */ },
    your_new_language: {
        'app.title': 'Title in your language',
        // Add all required translations
    }
};
```

3. Update the language toggle logic in `translationStore.ts`:
```typescript
function createTranslationStore() {
    // ... existing code ...
    
    return {
        subscribe,
        setLanguage: (language: Language) => set(language),
        toggleLanguage: () => update(currentLang => {
            // Add new language to the rotation
            const languages: Language[] = ['en', 'fr', 'your_new_language'];
            const currentIndex = languages.indexOf(currentLang);
            const nextIndex = (currentIndex + 1) % languages.length;
            return languages[nextIndex];
        })
    };
}
```

## URL Parameters

The application supports URL parameters for direct access to specific language versions and visualization tabs. This allows you to create links that open the application in a specific language and with a specific visualization tab active.

### Available Parameters

- `lang`: Language code (`en` for English, `fr` for French)
- `tab`: Visualization tab ID (`countries`, `languages`, `timeline`, `types`, `categories`, `words`)

### Example URLs

- English with Country Distribution: `https://fmadore.github.io/IWAC-overview/index.html?lang=en&tab=countries`
- French with Type Distribution: `https://fmadore.github.io/IWAC-overview/index.html?lang=fr&tab=types`
- English with Timeline: `https://fmadore.github.io/IWAC-overview/index.html?lang=en&tab=timeline`

### Examples Page

An examples page is available at `https://fmadore.github.io/IWAC-overview/examples.html` that provides links to all available language and tab combinations.

## Embedding in iframes

The IWAC Database Overview application can be embedded in other websites using an iframe. To ensure that all functionality works correctly, especially the fullscreen toggle, you need to include specific attributes in your iframe element.

### Basic Embedding

Here's the basic HTML code to embed the application:

```html
<iframe 
  src="https://fmadore.github.io/IWAC-overview/index.html" 
  width="100%" 
  height="600" 
  allowfullscreen="true"
  allow="fullscreen"
  title="IWAC Database Overview"
  frameborder="0">
</iframe>
```

### Important Attributes

To ensure fullscreen functionality works correctly, make sure to include these attributes:

- `allowfullscreen="true"` - The standard attribute that enables fullscreen capability
- `allow="fullscreen"` - For newer browsers that use the Feature Policy specification

### Responsive Embedding

For a responsive iframe that maintains its aspect ratio, wrap it in a container:

```html
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
  <iframe 
    src="https://fmadore.github.io/IWAC-overview/index.html" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    allowfullscreen="true"
    allow="fullscreen"
    title="IWAC Database Overview"
    frameborder="0">
  </iframe>
</div>
```

### URL Parameters

You can combine iframe embedding with URL parameters to control the initial state:

```html
<iframe 
  src="https://fmadore.github.io/IWAC-overview/index.html?lang=fr&tab=timeline" 
  width="100%" 
  height="600" 
  allowfullscreen="true"
  allow="fullscreen"
  title="IWAC Database Overview - Timeline (French)"
  frameborder="0">
</iframe>
```

### Troubleshooting

If fullscreen doesn't work, check that:

1. Both `allowfullscreen` and `allow="fullscreen"` attributes are present
2. The iframe is not nested inside another iframe without fullscreen permissions
3. The browser supports the Fullscreen API
4. The page is served over HTTPS (required for some browsers)

For a complete example of embedding, see the `iframe-embed-example.html` file in the repository.

## Visualizations

### Country Distribution

The Country Distribution visualization uses a treemap to show the hierarchical breakdown of items by country, category, and sub-collection. 

Features:
- Three-level hierarchical structure (Country > Category > Subcollection)
- Consistent color scheme matching the Word Distribution visualization
- Categories shown directly in the first-level view for better context
- Color consistency between parent and child elements for easier tracking
- Interactive zooming to explore the hierarchy at different levels
- Detailed tooltips showing item counts and percentage information
- Country headers with total item counts
- Support for multiple subcollection categories:
  - News articles (from Benin, Burkina Faso, Côte d'Ivoire, Niger, and Togo)
  - Islamic periodicals
  - Documents
  - Photographs (properly categorized as 'photographs' for all countries)
  - Video recordings
  - References
  - Other
- Responsive scaling to container size
- Summary statistics panel showing total items, countries, categories, and subcollections
- Proper handling of null values and edge cases for stability

### Language Distribution

The Language Distribution visualization uses a pie chart to show the distribution of items by language, with faceted filtering capabilities.

Features:
- Interactive pie chart with hover effects and animations
- Filtering by country and document type using dropdown menus
- Color-coded segments with corresponding legend
- Tooltips showing count and percentage information
- Summary statistics showing total items and language count
- Responsive design that adapts to container size
- Dynamic title that updates with the total number of items
- Properly formats numbers according to the current language
- Robust translation support for all UI elements

### Index Distribution

The Index Distribution visualization uses a bar chart to show how index items (with type "Notice d'autorité") are distributed across different categories.

Features:
- Interactive bar chart with hover effects and animations
- Filtering for items of type "Notice d'autorité"
- Categories determined by the "item_set_title" field
- Color-coded bars for easy distinction between categories
- Tooltips showing detailed information on hover
- Rotated x-axis labels for better readability of category names
- Top 5 categories summary with percentage breakdown
- Statistics panel showing total index items and number of categories
- Responsive design that adapts to different screen sizes
- Multilingual support with translations for common categories (Events, Locations, Organizations, Persons, Topics)

### Timeline Distribution

The Timeline Distribution visualization uses a dual-axis line chart to show the growth of the database over time.

Features:
- Tracks monthly additions and cumulative totals using the "created_date" field
- Filters display to show only data from April 2024 onward, while maintaining the total count from March 2024 backup data
- Visual divider line between charts to clearly separate monthly additions from cumulative growth
- Optimized spacing between charts for better readability
- Interactive visualization with hover effects and tooltips
- Faceted filtering by country and document type
- Blue line with dots representing monthly additions
- Green dotted line representing the cumulative total items
- Detailed tooltips showing monthly counts and percentages
- Summary statistics showing total items, time period, and average monthly additions
- List of peak growth months with their contribution percentages
- Responsive design that adapts to different screen sizes
- Color-coded legend for clarity

### Type Distribution

The Type Distribution visualization uses a stacked bar chart to show the distribution of items by type across publication years.

Features:
- Stacked bar chart showing item types distributed by publication year
- Extract years from various date formats (YYYY, YYYY-MM, YYYY-MM-DD)
- Multi-select country filtering with checkbox facets
- Year range slider to adjust the time period displayed
- Interactive visualization with hover effects and detailed tooltips
- Color-coded stacks for different item types with legend
- Detailed tooltips showing count and percentage breakdown by type for each year
- Summary statistics showing total items and publication years range
- Responsive design that adapts to different screen sizes

### Word Distribution

The Word Distribution visualization uses a treemap to show the distribution of word counts across items, organized by country and item set.

Features:
- Interactive treemap visualization with hover effects and detailed tooltips
- Hierarchical organization of data by country and item_set_title
- Rectangle sizes proportional to word counts
- Zoom functionality to focus on specific countries with a "Back to All" option
- Detailed tooltips showing word count, item count, average words per item, and percentage statistics
- Color-coding by country with lighter shades for item sets
- Summary statistics showing total items with word count, total words, and average words per item
- Responsive design that adapts to different screen sizes

## Creating New Visualizations

To add a new visualization to the application:

1. **Create a new component file**

   Create a new `.svelte` file in the `src/components/visualizations/` directory. Start by extending the BaseVisualization component:

   ```svelte
   <script lang="ts">
       import { onMount, tick } from 'svelte';
       import * as d3 from 'd3';
       import { itemsStore } from '../../stores/itemsStore';
       import BaseVisualization from './BaseVisualization.svelte';
       
       // Define interfaces for your data
       interface YourDataType {
           // Properties specific to your visualization
       }
       
       // Configuration options
       let yourOptions = {
           // Visualization-specific options
       };
       
       // Variable to hold the container element
       let container: HTMLDivElement;
       
       // Process data for your visualization
       function processData(items) {
           // Transform the raw data into the format needed for your visualization
           return transformedData;
       }
       
       // Create the visualization
       function createVisualization() {
           if (!container || !$itemsStore.items.length) return;
           
           // Clear previous content
           d3.select(container).select('svg').remove();
           
           // Get container dimensions
           const rect = container.getBoundingClientRect();
           const width = rect.width;
           const height = rect.height;
           
           // Create SVG container
           const svg = d3.select(container)
               .append('svg')
               .attr('width', width)
               .attr('height', height);
           
           // Process data
           const data = processData($itemsStore.items);
           
           // Implement your D3 visualization here
           // ...
       }
       
       // Update visualization when data changes
       $: if ($itemsStore.items) createVisualization();
       
       onMount(async () => {
           // Wait for initial tick to ensure the component is mounted
           await tick();
           
           // Create the visualization when data is available
           if ($itemsStore.items && $itemsStore.items.length > 0) {
               createVisualization();
           }
           
           // Set up resize observer for responsive behavior
           const resizeObserver = new ResizeObserver(() => {
               if (container) {
                   createVisualization();
               }
           });
           
           resizeObserver.observe(container);
           
           return () => {
               resizeObserver.disconnect();
               // Clean up any other resources
           };
       });
   </script>

   <div class="visualization-container" bind:this={container}>
       {#if $itemsStore.loading}
           <div class="loading">Loading...</div>
       {:else if $itemsStore.error}
           <div class="error">{$itemsStore.error}</div>
       {/if}
   </div>

   <style>
       .visualization-container {
           width: 100%;
           height: 600px;
           position: relative;
           background: var(--card-background);
           border-radius: var(--border-radius-md);
           box-shadow: var(--card-shadow);
           overflow: hidden;
       }

       .loading, .error {
           position: absolute;
           top: 50%;
           left: 50%;
           transform: translate(-50%, -50%);
           color: var(--text-color-secondary);
       }

       .error {
           color: var(--error-color);
       }
   </style>
   ```

2. **Add the visualization to App.svelte**

   Import your new visualization component in App.svelte and add it to the appropriate tab:

   ```svelte
   <script lang="ts">
     import { onMount } from 'svelte';
     import { itemsStore } from './stores/itemsStore';
     import CountryDistribution from './components/visualizations/CountryDistribution.svelte';
     import LanguageDistribution from './components/visualizations/LanguageDistribution.svelte';
     import IndexDistribution from './components/visualizations/IndexDistribution.svelte';
     import TimelineDistribution from './components/visualizations/TimelineDistribution.svelte';
     import TypeDistribution from './components/visualizations/TypeDistribution.svelte';
     import YourNewVisualization from './components/visualizations/YourNewVisualization.svelte';
     
     // ...existing code...
   </script>

   <!-- Add the new visualization to the appropriate tab condition -->
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
       {:else if activeTab === 'your-new-tab'}
         <YourNewVisualization />
       {:else}
         <div class="visualization-grid">
           <p>Select a visualization from the tabs above</p>
         </div>
       {/if}
     {/if}
   </div>
   ```

3. **Update the tabs array in App.svelte**

   Add your new visualization to the tabs array:

   ```javascript
   const tabs = [
     { id: 'countries', label: 'Country Distribution' },
     { id: 'languages', label: 'Languages' },
     { id: 'timeline', label: 'Timeline' },
     { id: 'types', label: 'Type Distribution' },
     { id: 'categories', label: 'Index Categories' },
     { id: 'your-new-tab', label: 'Your New Visualization' },
     // ... other tabs ...
   ];
   ```

## Extending Functionality

### Adding New Data Types

If your visualization requires additional data fields:

1. Update the `OmekaItem` interface in `src/types/OmekaItem.ts`:

   ```typescript
   export interface OmekaItem {
       id: number;
       title: string;
       description?: string;
       type?: string;
       country?: string;
       language?: string;
       // ...other properties
   }
   ```

2. Make sure the data in `items.json` includes these new properties.

### Adding New Utility Functions

Create new utility files in the `src/utils/` directory:

```typescript
// src/utils/yourNewUtility.ts
export function yourNewFunction(param1: string, param2: number): ReturnType {
    // Implementation
    return result;
}
```

### Extending the Store

If you need additional state management:

1. Create a new store file in `src/stores/`:

   ```typescript
   // src/stores/yourNewStore.ts
   import { writable } from 'svelte/store';

   export interface YourStoreData {
       // Define your store data structure
   }

   const createYourStore = () => {
       const { subscribe, set, update } = writable<YourStoreData>({
           // Initial state
       });

       return {
           subscribe,
           yourAction: (param) => {
               update(state => ({
                   // Update logic
               }));
           },
           reset: () => {
               set({
                   // Reset to initial state
               });
           }
       };
   };

   export const yourStore = createYourStore();
   ```

2. Import and use it in your components:

   ```svelte
   <script>
       import { yourStore } from '../../stores/yourNewStore';
       
       // Use the store
       function handleSomething() {
           yourStore.yourAction(params);
       }
   </script>
   ```

## Development Setup

To set up the project for development:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL shown in the terminal (usually http://localhost:5173)

## Local Testing

### Running a Local Server

To test the built application locally, you need to use a local server to avoid CORS issues. We've included helper scripts to make this easy:

#### Option 1: Using Vite Preview (Recommended)
```bash
# Run the Vite preview server
npm run preview
```

#### Option 2: Using the Vite Server Script
```bash
# Windows:
start-vite-server.bat

# macOS/Linux or Windows with Node.js:
node vite-server.mjs
```

These scripts will:
1. Start a properly configured server that handles MIME types correctly
2. Let you choose which directory to serve (root or docs/)
3. Provide URLs for accessing the application

### CORS Issues

When testing locally, you may encounter CORS (Cross-Origin Resource Sharing) errors if you open HTML files directly from the file system. These errors occur because browsers block requests to load resources when using the `file://` protocol.

Common error messages include:
- `Failed to load resource: net::ERR_FILE_NOT_FOUND`
- `Access to script has been blocked by CORS policy`
- `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "video/mp2t"`

**Solution:** Always use a local server as described above instead of opening files directly.

### Test Deployment Page

The repository includes a `test-deploy.html` file that provides a convenient way to test the built application. To use it:

1. Run one of the local server options above
2. Navigate to the URL provided by the server (e.g., `http://localhost:3000/test-deploy.html` or `http://localhost:4173/test-deploy.html`)

The test page includes:
- An iframe showing the application
- Debugging tools information
- Instructions for accessing the debug panel

## Debugging Tools

The application includes enhanced debugging tools to help identify and fix issues:

### Debug Panel

A visual debug panel is available in the application during development:

- Click the 🐞 button in the bottom-right corner to open the debug panel
- Or press `Ctrl+Shift+D` to toggle the panel
- The panel shows detailed logs of component lifecycles and events
- You can filter logs by text or component name
- Use the download button to save logs for further analysis

### Production vs Development Mode

The debug panel and related features are automatically disabled in production builds:

- In `src/utils/debug.ts`, the `DEBUG` constant controls whether debugging is enabled:
  ```typescript
  // Set to true for development, false for production
  export const DEBUG = false;
  ```

- The `App.svelte` component conditionally renders the debug panel based on this constant:
  ```svelte
  <!-- Only render the debug panel when DEBUG is true -->
  {#if DEBUG}
    <DebugPanel />
  {/if}
  ```

- To enable debugging during development:
  1. Change `DEBUG = false` to `DEBUG = true` in `src/utils/debug.ts`
  2. Rebuild the application or run in development mode

### Browser Console Commands

You can also access debugging tools through the browser console when debug mode is enabled:

```javascript
// View all logs in a readable format
window.__IWAC_DEBUG.dumpLogs()

// Get logs as a JSON string for saving
window.__IWAC_DEBUG.exportLogs()

// See currently mounted components
window.__IWAC_DEBUG.mountedComponents()

// Check component hierarchy
window.__IWAC_DEBUG.hierarchy

// Check current language in TranslationContext
window.__TRANSLATION_DEBUG.currentLanguage()

// Check if TranslationContext is mounted
window.__TRANSLATION_DEBUG.isMounted()
```

For more detailed information about deployment and debugging, see the [DEPLOYMENT.md](DEPLOYMENT.md) file.

## Deployment

For detailed deployment instructions, including GitHub Pages configuration and troubleshooting, see the [DEPLOYMENT.md](DEPLOYMENT.md) file.

## Contributing

Contributions are welcome! Please add tests for new features and make sure existing tests pass.

## License

[License Information]

## TypeScript Configuration

The project uses TypeScript for type safety and better developer experience. The configuration is defined in `tsconfig.json` and includes several important features:

### Basic Configuration

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "sourceMap": true,
    "skipLibCheck": true
  }
}
```

### Type Definitions

The project includes several type definition files to improve type safety:

1. **OmekaItem.ts**: Defines the structure of database items and visualization data
   ```typescript
   export interface OmekaItem {
       id: number;
       title: string;
       description?: string;
       type?: string;
       country?: string;
       language?: string;
       // ...other properties
   }
   ```

2. **svelte-components.d.ts**: Provides type definitions for Svelte components
   ```typescript
   declare module 'src/components/visualizations/BaseVisualization.svelte' {
     export default class BaseVisualization extends SvelteComponentTyped<{
       title?: string;
       translationKey?: string;
       // ...other props
     }, {}, {}> {}
   }
   ```

3. **svelte-store.d.ts**: Defines types for Svelte stores
   ```typescript
   declare module '../stores/itemsStore' {
     export const itemsStore: {
       subscribe: (callback: (value: VisualizationData) => void) => () => void;
       loadItems: () => Promise<void>;
     };
   }
   ```

4. **global.d.ts**: Provides global type declarations
   ```typescript
   declare global {
     var $itemsStore: VisualizationData;
     var $language: string;
     
     interface Window {
       __IWAC_DEBUG?: {
         // Debug properties
       }
     }
   }
   ```

These type definitions help catch errors during development and provide better code completion in IDEs.