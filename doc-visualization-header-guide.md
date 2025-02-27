# Guide: Updating Visualizations with the New Header System

This guide explains how to update existing visualizations to use the new visualization header system, which provides a consistent and responsive title layout with an accordion for showing/hiding descriptions.

## Overview

The new system introduces:

1. A `VisualizationHeader` component that provides responsive titles and an accordion for descriptions
2. Enhanced `BaseVisualization` component that supports custom content via slots
3. Consistent translation keys for titles and descriptions
4. Mobile-friendly responsive design for all visualizations
5. Support for dynamic titles with counts or other reactive content

## Step 1: Add Translation Keys

First, add translation keys for your visualization's title and description in `src/stores/translationStore.ts`:

```typescript
export const translations: Translations = {
    en: {
        // ...existing translations...
        
        // Your visualization specific translations
        'viz.your_visualization_title': 'Your Visualization Title',
        'viz.your_visualization_description': 'Description explaining how your visualization works and how to interact with it.',
        
        // ...other translations...
    },
    fr: {
        // ...existing translations...
        
        // Your visualization specific translations
        'viz.your_visualization_title': 'Votre Titre de Visualisation',
        'viz.your_visualization_description': 'Description expliquant comment votre visualisation fonctionne et comment interagir avec elle.',
        
        // ...other translations...
    }
};
```

## Step 2: Update Your Visualization Component

### Simple Title (Static Text)

For static titles, you can use the basic approach:

```svelte
<BaseVisualization
    title="Your Visualization"
    translationKey="viz.your_visualization_title" 
    descriptionTranslationKey="viz.your_visualization_description"
    description="Fallback description text..."
>
    <!-- Your visualization content -->
</BaseVisualization>
```

### Dynamic Title (with Count or Other Reactive Content)

For titles that need to include dynamic content like item counts, use the title slot:

```svelte
<script>
    // Create a reactive translation that includes parameters
    const dynamicTitleText = translate('viz.distribution_items');
    let totalItems = 0; // This would be updated by your data processing
</script>

<BaseVisualization
    title=""  <!-- Leave these empty when using a slot -->
    translationKey="" 
    descriptionTranslationKey="viz.your_visualization_description"
    description="Fallback description text..."
>
    <svelte:fragment slot="title">
        {#if totalItems > 0}
            <!-- Pass the count as a parameter to the translation -->
            {$dynamicTitleText([totalItems.toString()])}
        {:else}
            <!-- Fallback when count is not available -->
            {t('viz.your_visualization_title')}
        {/if}
    </svelte:fragment>
    
    <!-- Your visualization content -->
</BaseVisualization>
```

Make sure your translation has placeholders for the dynamic content:

```typescript
'viz.distribution_items': 'Distribution of {0} items by country and sub-collection',
```

## Step 3: Remove Any Existing Title Rendering

If your visualization previously rendered a title directly in the SVG or in HTML, you should remove that code since the title is now handled by the `VisualizationHeader` component.

For example, if you had code like this in your visualization creation function:

```javascript
// Remove this code:
svg.append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', 'var(--font-size-lg)')
    .attr('font-weight', 'bold')
    .attr('fill', 'var(--text-color-primary)')
    .text('Visualization Title');
```

## Step 4: Fix ResizeObserver Implementation

Update the onMount function to safely handle the container element binding:

```svelte
onMount(async () => {
    // Wait for the component to render
    await tick();
    
    // Check if container exists after rendering
    if (!container) {
        console.error('Container element not found in onMount');
        return;
    }
    
    // Your existing initialization code...
    
    // Add resize observer with safety checks
    const resizeObserver = new ResizeObserver(() => {
        if (container) {
            updateVisualization();
        }
    });
    
    // Only observe if container exists
    if (container) {
        resizeObserver.observe(container);
    } else {
        console.error('Container element still not available for ResizeObserver');
    }
    
    return () => {
        // Safely disconnect observer
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        
        // Other cleanup code...
    };
});
```

## Example: CountryDistribution Component with Dynamic Title

Here's how the CountryDistribution component was updated with a dynamic title including the total item count:

```svelte
<script lang="ts">
    // ...existing imports and code...
    
    // Create reactive translations with dynamic value for item count
    const distributionTitleText = translate('viz.distribution_items');
    
    // Description translation key
    const countryDescriptionKey = 'viz.country_distribution_description';
    
    // ...rest of the code...
</script>

<div class="country-distribution-container">
    <BaseVisualization
        title=""
        translationKey="" 
        descriptionTranslationKey={countryDescriptionKey}
        description="This visualization shows the distribution of items by country and sub-collection..."
    >
        <svelte:fragment slot="title">
            {#if totalItems > 0}
                {$distributionTitleText([totalItems.toString()])}
            {:else}
                {t('viz.country_distribution_title')}
            {/if}
        </svelte:fragment>
        
        <!-- Visualization content -->
    </BaseVisualization>
</div>
```

## Benefits of the New System

- Consistent title styling and positioning across all visualizations
- Support for both static and dynamic titles (with counts or other reactive content)
- Responsive title handling for different screen sizes
- Toggleable descriptions that don't take up space when not needed
- Cleaner separation of concerns: visualization data vs. UI elements
- Easier maintenance: header updates only needed in one place
- Better accessibility with proper headings, ARIA attributes, and keyboard support

## Additional Customization

If you need to customize the header behavior beyond what's provided, you can:

1. Pass additional props to the VisualizationHeader component
2. Create a derived component that extends the basic functionality
3. Add additional CSS styles to target specific aspects of the header 