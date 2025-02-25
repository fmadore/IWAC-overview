# IWAC Database Overview

A data visualization application for exploring the Indigenous World Arts and Cultures (IWAC) database. This application provides interactive visualizations for different aspects of the IWAC collection, including country distribution, timeline, languages, and more.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Management](#data-management)
- [Creating New Visualizations](#creating-new-visualizations)
- [Extending Functionality](#extending-functionality)
- [Development Setup](#development-setup)
- [Deployment](#deployment)

## Overview

The IWAC Database Overview is a Svelte-based application that offers a set of interactive visualizations for exploring the IWAC database collection. The application features a tab-based interface where users can switch between different visualization types to gain insights into various aspects of the collection.

Key features:
- Interactive D3.js visualizations
- Country distribution treemap visualization
- Responsive design
- Clean, modern UI
- Type-safe development with TypeScript

## Project Structure

```
IWAC-overview/
├── public/               # Static assets and items.json data file
│   └── items.json        # Database items in JSON format
├── src/
│   ├── components/       # UI components
│   │   └── visualizations/  # Visualization components
│   │       ├── BaseVisualization.svelte  # Base component for visualizations
│   │       └── CountryDistribution.svelte  # Country distribution treemap
│   ├── stores/           # Svelte stores for state management
│   │   └── itemsStore.ts  # Store for database items
│   ├── types/            # TypeScript type definitions
│   │   └── OmekaItem.ts   # Types for Omeka items and visualization data
│   ├── utils/            # Utility functions
│   │   └── logger.ts      # Logging utility
│   ├── App.svelte        # Main application component
│   ├── app.css           # Global styles
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
           background: white;
           border-radius: 8px;
           box-shadow: 0 2px 4px rgba(0,0,0,0.1);
           overflow: hidden;
       }

       .loading, .error {
           position: absolute;
           top: 50%;
           left: 50%;
           transform: translate(-50%, -50%);
       }

       .error {
           color: red;
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