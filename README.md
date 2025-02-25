# IWAC Database Overview

A data visualization application for exploring the Indigenous World Arts and Cultures (IWAC) database. This application provides interactive visualizations for different aspects of the IWAC collection, including country distribution, timeline, languages, and more.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Management](#data-management)
- [Theme System](#theme-system)
- [Visualizations](#visualizations)
  - [Country Distribution](#country-distribution)
  - [Language Distribution](#language-distribution)
  - [Index Distribution](#index-distribution)
  - [Timeline Distribution](#timeline-distribution)
- [Creating New Visualizations](#creating-new-visualizations)
- [Extending Functionality](#extending-functionality)
- [Development Setup](#development-setup)
- [Deployment](#deployment)

## Overview

The IWAC Database Overview is a Svelte-based application that offers a set of interactive visualizations for exploring the IWAC database collection. The application features a tab-based interface where users can switch between different visualization types to gain insights into various aspects of the collection.

Key features:
- Interactive D3.js visualizations
- Country distribution treemap visualization
- Language distribution pie chart with faceted filtering
- Index distribution bar chart with category breakdown
- Timeline visualization showing database growth over time
- Responsive design
- Clean, modern UI
- Type-safe development with TypeScript
- Centralized theming system with CSS variables

## Project Structure

```
IWAC-overview/
├── public/               # Static assets and items.json data file
│   └── items.json        # Database items in JSON format
├── src/
│   ├── components/       # UI components
│   │   └── visualizations/  # Visualization components
│   │       ├── BaseVisualization.svelte  # Base component for visualizations
│   │       ├── CountryDistribution.svelte  # Country distribution treemap
│   │       ├── LanguageDistribution.svelte  # Language distribution pie chart
│   │       ├── IndexDistribution.svelte  # Index distribution bar chart
│   │       └── TimelineDistribution.svelte  # Timeline showing database growth
│   ├── stores/           # Svelte stores for state management
│   │   └── itemsStore.ts  # Store for database items
│   ├── types/            # TypeScript type definitions
│   │   └── OmekaItem.ts   # Types for Omeka items and visualization data
│   ├── utils/            # Utility functions
│   │   └── logger.ts      # Logging utility
│   ├── App.svelte        # Main application component
│   ├── app.css           # Global styles
│   ├── theme.css         # Centralized theme system with CSS variables
│   └── main.ts           # Application entry point
├── index.html            # HTML entry point
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

A treemap visualization that shows the distribution of items by country and sub-collection. Features include:
- Interactive zooming for hierarchical exploration
- Color coding based on item counts
- Tooltips with detailed information
- Responsive layout

### LanguageDistribution.svelte

A pie chart visualization that shows the distribution of items by language with dynamic filtering capabilities:
- Interactive pie chart with hover effects
- Filtering by country and document type
- Real-time updates as filters change
- Color-coded legend with counts and percentages
- Tooltips with detailed information

### IndexDistribution.svelte

A bar chart visualization that shows the distribution of index items (type "Notice d'autorité") by their categories:
- Interactive bar chart with hover effects and animations
- Category breakdown based on "item_set_title" field
- Detailed tooltips showing count and percentage information
- Top 5 categories summary with percentage breakdown
- Statistics panel showing total items and category count
- Responsive design that adapts to different screen sizes

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

## Data Management

### itemsStore.ts

A Svelte store that manages the loading and state of database items. It provides:
- Loading state management
- Error handling
- Asynchronous data fetching

### OmekaItem.ts

TypeScript interfaces that define the structure of database items and visualization data:
- OmekaItem: Represents an individual item from the IWAC database
- VisualizationData: Manages the state of items, loading, and errors

## Theme System

The application uses a centralized theming system implemented with CSS variables. This allows for consistent styling across all components and makes it easy to update the look and feel of the entire application by changing just a few values.

### theme.css

The theme file defines variables for:

- **Colors**: Primary, secondary, background, card, text, and status colors
- **Typography**: Font families, sizes, and weights
- **Spacing**: Consistent spacing scale for margins and padding
- **Border Radius**: Standardized corner rounding
- **Shadows**: Consistent shadow styles
- **Transitions**: Animation timing
- **Z-index Layers**: Standardized stacking contexts

Example usage:

```css
.element {
  color: var(--text-color-primary);
  background-color: var(--card-background);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--card-shadow);
  transition: all var(--transition-fast);
}
```

The theme system also includes utility classes for common styling needs:

```html
<div class="text-primary bg-card">Themed content</div>
```

## Visualizations

### Country Distribution

The Country Distribution visualization uses a treemap to show the hierarchical breakdown of items by country and sub-collection. 

Features:
- Hierarchical navigation through zooming in/out
- Color intensity representing item counts
- Interactive tooltips showing detailed information
- Responsive scaling to container size

### Language Distribution

The Language Distribution visualization uses a pie chart to show the distribution of items by language, with faceted filtering capabilities.

Features:
- Interactive pie chart with hover effects and animations
- Filtering by country and document type using dropdown menus
- Color-coded segments with corresponding legend
- Tooltips showing count and percentage information
- Summary statistics showing total items and language count
- Responsive design that adapts to container size

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
     { id: 'overview', label: 'Overview' },
     { id: 'countries', label: 'Country Distribution' },
     { id: 'languages', label: 'Languages' },
     { id: 'categories', label: 'Index Categories' },
     { id: 'timeline', label: 'Timeline' },
     { id: 'your-new-tab', label: 'Your New Visualization' },
     // ... other tabs ...
   ];
   ```

4. **Use the theme system for consistent styling**

   Make sure to use theme variables in your component styles for consistency:

   ```css
   .your-element {
     color: var(--text-color-primary);
     background-color: var(--card-background);
     padding: var(--spacing-md);
     border-radius: var(--border-radius-md);
   }
   ```

## Extending Functionality

### Adding New Data Types

If your visualization requires additional data fields:

1. Update the `OmekaItem` interface in `src/types/OmekaItem.ts`:

   ```typescript
   export interface OmekaItem {
       id: number;
       title: string;
       type: string;
       country: string;
       collection: string;
       language: string;
       keywords: string[];
       dateAdded: string;
       item_set_title: string;
       // Add your new properties here
       yourNewProperty: string;
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

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm run dev
   ```

3. **Build for production**

   ```bash
   npm run build
   ```

4. **Preview the production build**

   ```bash
   npm run preview
   ```

## Deployment

The application is configured to be deployed to GitHub Pages with a base path of `/IWAC-overview/`. 

To deploy:

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy the `dist` directory to GitHub Pages or your hosting provider of choice.

3. If deploying to a different path, update the `basePath` in your build configuration:

   ```javascript
   // vite.config.js
   export default defineConfig({
     // ...other config
     base: '/your-repo-name/',
   });
   ```

## Contributing

Contributions are welcome! Please add tests for new features and make sure existing tests pass.

## License

[License Information]