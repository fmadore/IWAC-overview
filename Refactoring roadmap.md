# IWAC Application Refactoring Roadmap

## 1. Establish a Visualization Component Framework

**Issue:** The visualization components share significant duplicate code for tooltips, resize handling, data processing, and lifecycle management.

**Improvement:**
- Create a proper inheritance model extending the BaseVisualization component
- Extract common visualization logic into shared hooks/utilities
- Standardize the component API (props, events, methods)

**Implementation steps:**
1. ✅ Refine the BaseVisualization component to handle more common functionality:
   - ✅ Standardize title and description handling
     - Added computed title logic that prioritizes titleHtml
     - Improved translation key handling
     - Added proper TypeScript types
   - ✅ Improve accessibility support
     - Replaced aria-description with standard aria-describedby
     - Added unique ID generation for descriptions
     - Added proper ARIA relationships between elements
   - ✅ Clean up props organization
     - Grouped related props with comments
     - Made all props optional with defaults
     - Added proper TypeScript types
   - ✅ Integrate tooltip functionality directly
     - Added tooltip configuration props (enableTooltip, tooltipBackgroundColor, tooltipTextColor, tooltipMaxWidth)
     - Integrated useTooltip hook in BaseVisualization
     - Exported tooltip methods and utilities (showTooltip, hideTooltip, updateTooltipContent, createGridTooltipContent)
     - Updated IndexDistribution to use the integrated tooltip functionality
     - Eliminated duplicate tooltip initialization code in visualization components
     - Made tooltip initialization conditional based on enableTooltip property
   
   Implementation example:
   ```svelte
   <script lang="ts">
   // Title props
   export let title: string = '';
   export let translationKey: string = '';
   export let titleHtml: string = '';

   // Description props
   export let description: string = '';
   export let descriptionTranslationKey: string = '';
   export let showDescription: boolean = false;

   // Accessibility props
   export let ariaLabel: string = '';

   // Generate unique IDs for accessibility
   const descriptionId = `viz-desc-${Math.random().toString(36).slice(2, 11)}`;

   // Tooltip configuration
   export let enableTooltip: boolean = true;
   export let tooltipBackgroundColor: string = 'rgba(0, 0, 0, 0.8)';
   export let tooltipTextColor: string = 'white';
   export let tooltipMaxWidth: string = '250px';

   // Initialize tooltip hook
   const { showTooltip, hideTooltip, updateTooltipContent } = useTooltip({
       backgroundColor: tooltipBackgroundColor,
       color: tooltipTextColor,
       maxWidth: tooltipMaxWidth
   });

   // Expose tooltip functions to child components
   export { showTooltip, hideTooltip, updateTooltipContent, createGridTooltipContent };

   // Computed values
   $: computedTitle = titleHtml || (translationKey ? t(translationKey) : title);
   $: computedDescription = descriptionTranslationKey ? t(descriptionTranslationKey) : description;
   $: hasDescription = Boolean(description || descriptionTranslationKey);
   ```

   Visualization Component Usage:
   ```svelte
   <script>
   // Reference to BaseVisualization component to access its tooltip functions
   let baseVisualization: BaseVisualization;

   // Use tooltip functions directly from BaseVisualization
   function handleShowTooltip(event, data) {
     const content = baseVisualization.createGridTooltipContent(
       data.title,
       [
         { label: t('viz.items'), value: formatNumber(data.count) },
         { label: t('viz.percent'), value: `${data.percentage}%` }
       ]
     );
     baseVisualization.showTooltip(event, content);
   }
   </script>

   <BaseVisualization bind:this={baseVisualization}>
     <!-- Visualization content -->
   </BaseVisualization>
   ```

   Next steps for BaseVisualization:
   - [ ] Improve resize observer handling with debouncing
   - [ ] Add better TypeScript types for themes
   - [ ] Improve loading/error state handling
   - [ ] Add better event handling for visualization state changes

2. Create visualization-specific hooks:
   - ✅ useTooltip - Completed
   - ✅ useD3Resize - Completed with proper TypeScript support, debouncing, and cleanup
   - ✅ useDataProcessing - Completed with comprehensive data processing utilities

3. Update each visualization component to leverage the shared code:
   - [ ] Update all visualizations to use integrated tooltip functionality:
     - ✅ IndexDistribution - Updated to use BaseVisualization tooltip
     - [ ] LanguageDistribution - Update to use BaseVisualization tooltip
     - [ ] TimelineDistribution - Update to use BaseVisualization tooltip
     - [ ] TypeDistribution - Update to use BaseVisualization tooltip
     - [ ] WordDistribution - Update to use BaseVisualization tooltip
     - [ ] CountryDistribution - Update to use BaseVisualization tooltip
   - [ ] Update all visualizations to use new BaseVisualization props:
     - ✅ CountryDistribution - Fixed title translation parameters
     - ✅ IndexDistribution - Updated to use titleHtml and new translation format
     - ✅ LanguageDistribution - Update to use titleHtml and new translation format
     - ✅ TimelineDistribution - Update to use titleHtml and new translation format
     - [ ] TypeDistribution - Update to use titleHtml and new translation format
     - [ ] WordDistribution - Update to use titleHtml and new translation format
   - [ ] Standardize translation parameter format across all visualizations:
     - Replace `{ count: value }` with `{ '0': value }` format
     - Ensure consistent translation key usage
     - Remove direct string translations in favor of translation keys
   - [ ] Clean up visualization props:
     - Remove unused props
     - Use consistent theme and className props
     - Remove redundant ARIA attributes now handled by BaseVisualization
   - [ ] Update error handling and loading states to match BaseVisualization pattern

4. Document the component API:
   - [ ] Create comprehensive API documentation
   - [ ] Add usage examples
   - [ ] Document event handling
   - [ ] Document theming options

## 2. Consolidate D3.js Integration

**Issue:** Each visualization component implements D3.js integration differently, making maintenance difficult.

**Improvement:**
- Create a standardized D3.js wrapper/factory for the application
- Separate D3.js rendering logic from component business logic
- ✅ Implement standardized resize handling with useD3Resize hook - Completed and verified across all visualization components

**Implementation steps:**
1. ✅ Create standardized resize handling with useD3Resize hook - Completed and verified
2. ✅ Create a D3 service/factory with standardized methods:
   - ✅ Implemented in `src/services/d3Service.ts`
   - ✅ Provides standardized SVG creation with proper margins and responsive handling
   - ✅ Offers unified scale creation for different data types
   - ✅ Handles consistent axis creation and rendering
   - ✅ Includes helper functions for common visualization elements (legends, grids, titles)
   - ✅ Features standardized color scale generation
   - ✅ Manages responsive behavior for visualizations
   - ✅ Implements consistent error handling for "no data" scenarios
   - ✅ Provides standardized tooltip container creation
3. Extract visualization-specific rendering to separate modules (countryChart.ts, timelineChart.ts, etc.)
4. Implement a consistent data transformation approach
5. Update visualization components to use the new abstraction:
   - ✅ Update IndexDistribution.svelte (simplest component to start with)
   - [ ] Update TimelineDistribution.svelte
   - [ ] Update LanguageDistribution.svelte
   - [ ] Update TypeDistribution.svelte
   - [ ] Update CountryDistribution.svelte
   - [ ] Update WordDistribution.svelte

## 4. Improve State Management Architecture

**Issue:** Store implementations and usage patterns are inconsistent.

**Improvement:**
- Standardize the store creation and usage patterns
- Implement a more robust subscription management approach
- ✅ Improve store subscription cleanup in components

**Implementation steps:**
1. ✅ Implement proper store subscription cleanup (demonstrated in CountryDistribution)
2. Create a consistent store factory pattern
3. ✅ Implement proper TypeScript interfaces for all stores
4. Create utilities for handling store subscriptions in components
5. Consider implementing derived stores for computed values

## 5. Implement a Robust Error Handling Strategy

**Issue:** Error handling is inconsistent across the application.

**Improvement:**
- Establish a centralized error handling approach
- Make error handling more user-friendly
- ✅ Implement proper error handling in visualization components
- ✅ Standardize loading, error, and no-data message handling

**Implementation steps:**
1. ✅ Implement comprehensive error handling in visualization components (demonstrated in CountryDistribution)
2. ✅ Standardize visualization status messages:
   - ✅ Use consistent class names for status messages (e.g., 'absolute inset-center text-secondary z-50')
   - ✅ Add proper z-index handling to prevent message overlapping
   - ✅ Implement proper cleanup of previous messages
   - ✅ Fix "No data available" message appearing alongside visualizations
3. Create an error handling service
4. Standardize try/catch patterns in async operations
5. Implement proper error boundaries in components
6. Add user-friendly error messages and recovery options

## 6. Extract and Standardize Data Processing Logic

**Issue:** Data processing is tightly coupled with visualization components.

**Improvement:**
- ✅ Separate data processing from visualization rendering
- ✅ Create reusable data transformers and utilities
- ✅ Implement useDataProcessing hook with standardized data processing functions

**Implementation steps:**
1. ✅ Create useDataProcessing hook with standardized functions:
   - ✅ filterItems for consistent filtering
   - ✅ groupAndCount for aggregation
   - ✅ groupHierarchically for nested data
   - ✅ processTimeData for time-based analysis
2. ✅ Implement standardized data transformation utilities
3. ✅ Add TypeScript interfaces for data processing
4. ✅ Update components to use the new data services:
   - ✅ CountryDistribution
   - ✅ IndexDistribution
   - ✅ LanguageDistribution
   - ✅ TimelineDistribution
   - ✅ TypeDistribution
   - ✅ WordDistribution
5. Add unit tests for data processing logic

## 7. Modernize CSS Architecture

**Issue:** CSS is a mix of global styles and component-scoped styles with duplication, spread across multiple files (`theme.css`, `app.css`) outside the styles folder.

**Improvement:**
- ✅ Implement a structured CSS architecture with a clear directory structure
- ✅ Move CSS into organized folders with separation of concerns
- ✅ Create a consistent theming system with utility classes
- ✅ Provide clear documentation and usage examples

**Implementation steps:**
1. ✅ Create a structured CSS directory organization:
   ```
   src/styles/
   ├── main.css                  # Main entry point that imports all styles
   ├── themes/
   │   └── default-theme.css     # CSS variables defining the design system
   └── utilities/
       ├── colors.css            # Text, background, and border color utilities
       ├── spacing.css           # Margin, padding, and gap utilities
       ├── typography.css        # Font, text, and styling utilities
       ├── layout.css            # Display, flexbox, grid, and positioning utilities
       └── borders.css           # Border width, style, radius, and shadow utilities
   └── base/
       └── global.css            # Reset and basic global styles (from app.css)
   └── docs/
       ├── README.md             # CSS architecture documentation
       └── styleguide.html       # Visual documentation of available styles
   ```

2. ✅ Organize theme variables more systematically in `default-theme.css`:
   - ✅ Group variables by functional category (colors, typography, spacing, etc.)
   - ✅ Establish consistent naming patterns for all variables
   - ✅ Add comments to explain variable purposes
   - ✅ Add dark mode variations (initially commented out)

3. ✅ Create utility classes for common patterns:
   - ✅ Create `colors.css` with text, background, and border color utilities
   - ✅ Create `spacing.css` with margin, padding, and gap utilities
   - ✅ Create `typography.css` with font sizes, weights, and text styling utilities
   - ✅ Create `layout.css` with flexbox, grid, and positioning utilities
   - ✅ Create `borders.css` with border styles, widths, radiuses, and shadows

4. ✅ Create documentation for the CSS architecture:
   - ✅ Create `README.md` explaining the CSS organization, naming conventions, and usage
   - ✅ Create a visual style guide that showcases all available styles

5. ✅ Transition plan for migrating from old CSS files:
   - ✅ Create an import file that imports both old and new CSS structures during transition
   - ✅ Update `main.ts` to include the new CSS entry point
   - ✅ Start with key component updates that serve as examples for the rest of the app
   - ✅ Fix style conflicts that arise during the transition

6. ✅ Update key components to use the new CSS architecture:
   - ✅ Start with `App.svelte` styles:
     - ✅ Replace legacy variable usage with new CSS variables
     - ✅ Use utility classes for common styling patterns
     - ✅ Remove redundant style definitions
   - ✅ Update `BaseVisualization.svelte` and `VisualizationHeader.svelte`:
     - ✅ Incorporate utility classes for layout and spacing
     - ✅ Simplify component styles using the new CSS architecture
     - ✅ Document the styling approach for other visualization components

7. ✅ Create a deprecation plan for old CSS files:
   - ✅ Add comments to `theme.css` and `app.css` indicating they are deprecated
   - ✅ Move essential styles from `app.css` to appropriate locations in the new structure
   - ✅ Establish legacy compatibilities in `global.css` for backward compatibility
   - ✅ Document the transition approach for other developers

8. ✅ Move component-specific utility classes to global CSS files:
   - ✅ Moved `.inset-center` from IndexDistribution to layout.css
   - ✅ Added min-height utilities to spacing.css (min-h-350, min-h-400, etc.)
   - ✅ Added legend positioning and styling utilities for D3 visualizations
   - ✅ Keep only component-specific responsive rules in component style blocks

9. ✅ Standardizing component styling approach:
   - ✅ Document recommendations for when to use utility classes vs. component styles
   - ✅ Create examples of properly styled components using the new architecture
   - ✅ Establish naming conventions for component-specific CSS classes
   - ✅ Update all visualization components to use the new CSS architecture

10. ✅ Enhancements for the CSS architecture:
   - ✅ Create a `components` directory in the CSS structure for reusable UI components
   - ✅ Document the component styling API and usage patterns
   - ✅ Provide examples of component composition patterns
   - ✅ Remove duplicate styles between `theme.css` and new utility files

11. ✅ Add comprehensive testing for the CSS architecture:
    - ✅ Test for style conflicts between old and new CSS
    - ✅ Test components with the new styling in different viewports
    - ✅ Validate accessibility of the new styles

## CSS Architecture Status (Updated)

### ✅ Phase 1: Initial Setup and Documentation (Completed)
- ✅ Set up the folder structure for the new CSS architecture
- ✅ Create the theme variables file with a systematic organization
- ✅ Develop utility classes for colors, spacing, typography, layout, and borders
- ✅ Create documentation and a visual style guide

### ✅ Phase 2: Component Transition (Completed)
- ✅ Update `App.svelte` to use utility classes
- ✅ Update `BaseVisualization.svelte` to use utility classes
- ✅ Update `VisualizationHeader.svelte` to use utility classes
- ✅ Fix style conflicts and ensure compatibility

### ✅ Phase 3: Full Application Transition (Completed)
- ✅ Fix UI interaction issues:
  - ✅ Add cursor utilities for better interactive cues
  - ✅ Improve popup behavior and positioning for info tooltips
  - ✅ Enhance tab navigation appearance and behavior
- ✅ Document new utilities and their usage patterns in the README
- ✅ Enforce style consistency across components
- ✅ Update remaining visualization components to use the new CSS architecture:
  - ✅ Update CountryDistribution.svelte
  - ✅ Update IndexDistribution.svelte
  - ✅ Update LanguageDistribution.svelte
  - ✅ Update TimelineDistribution.svelte
  - ✅ Update TypeDistribution.svelte
  - ✅ Update WordDistribution.svelte
- ✅ Update utility components to use the new CSS architecture:
  - ✅ Update LanguageToggle.svelte
  - ✅ Update FullScreenToggle.svelte
  - ✅ Update DebugPanel.svelte
- ✅ Improve mobile responsiveness:
  - ✅ Add responsive sizing for buttons
  - ✅ Ensure consistent styling between desktop and mobile
  - ✅ Implement larger touch targets for mobile interfaces
  - ✅ Add media queries for key interactive components
- ✅ Fix D3.js visualization issues:
  - ✅ Resolved overlapping "No data available" messages in visualizations
  - ✅ Improved message removal/addition approach for consistency
  - ✅ Added proper z-index handling for status messages
  - ✅ Standardized class names for loading/error/no-data states
- ✅ Add prefixing for utility classes to avoid conflicts (e.g., `.iwac-flex` instead of `.flex`)
- ✅ Create a strategy to handle existing CSS that depends on the old files
- ✅ Phase out `theme.css` and `app.css` as components are updated

### ✅ Phase 4: Finalization (Completed)
- ✅ Remove deprecated CSS files after all components have been transitioned
- ✅ Update the build process to only include the new CSS architecture
- ✅ Finalize documentation with real-world examples from the codebase
- ✅ Create a comprehensive style guide for future development

## 8. Enhance TypeScript Integration

**Issue:** TypeScript usage is inconsistent and sometimes too permissive.

**Improvement:**
- ✅ Strengthen TypeScript typings throughout the application
- ✅ Consolidate type definitions
- ✅ Improve TypeScript support in hooks and components

**Implementation steps:**
1. ✅ Add comprehensive TypeScript interfaces for hooks (demonstrated in useD3Resize and useDataProcessing)
2. ✅ Improve component TypeScript definitions (demonstrated in CountryDistribution)
3. ✅ Establish stricter TypeScript configurations
4. ✅ Create a centralized types directory structure
5. ✅ Replace any types with more specific interfaces
6. ✅ Add proper generics for reusable components

## 9. Improve Component Architecture

**Issue:** Component interfaces and behaviors are not consistently designed.

**Improvement:**
- Standardize component interfaces
- Improve component composition
- ✅ Implement proper lifecycle management

**Implementation steps:**
1. ✅ Implement proper component lifecycle management (demonstrated in CountryDistribution)
2. Document clear component APIs
3. Break large components into smaller, focused ones
4. Implement proper component composition patterns
5. Create reusable UI component library

## 10. Implement Better Debug Tooling

**Issue:** Debugging tools are scattered and inconsistently implemented.

**Improvement:**
- Create more structured debugging tools
- Make the debugging experience more integrated

**Implementation steps:**
1. Refactor the debug panel to be more modular
2. Create a centralized logging service
3. Implement proper log levels and filtering
4. Add performance monitoring capabilities

## 11. Enhance Accessibility

**Issue:** Limited accessibility features throughout the application.

**Improvement:**
- Make the application more accessible to all users

**Implementation steps:**
1. Add proper ARIA attributes to all components
2. Improve keyboard navigation
3. Enhance screen reader support
4. Implement proper focus management

## 12. Optimize Performance

**Issue:** Some visualizations might have performance issues with larger datasets.

**Improvement:**
- Optimize rendering and data processing for better performance
- ✅ Implement proper debouncing for resize events

**Implementation steps:**
1. ✅ Implement debouncing for resize events (completed in useD3Resize)
2. Implement data caching strategies
3. Optimize D3.js rendering approaches
4. Add virtualization for large datasets
5. Implement proper loading states and progressive rendering

## 13. Improve Testing Infrastructure

**Issue:** Limited or no testing infrastructure visible in the codebase.

**Improvement:**
- Add comprehensive testing strategy

**Implementation steps:**
1. Set up testing framework (Jest, Vitest, etc.)
2. Implement unit tests for utility functions and data processors
3. Add component testing for UI components
4. Implement integration tests for visualization components

## 14. Documentation Enhancements

**Issue:** Documentation exists but could be more integrated with the codebase.

**Improvement:**
- Create better developer documentation
- ✅ Document hooks and utilities properly

**Implementation steps:**
1. ✅ Add comprehensive JSDoc comments to hooks (completed for useD3Resize and useDataProcessing)
2. Create a developer guide for extending visualizations
3. Document component APIs thoroughly
4. Add inline code examples

This roadmap organizes refactoring efforts from most critical to least critical, focusing on improving maintainability and modularity. Each step builds upon the previous ones, creating a systematic approach to enhancing the application's architecture.

## Implementation Guide for BaseVisualization Improvements

1. **Title and Description Handling**
   ```typescript
   // In BaseVisualization.svelte
   interface TitleProps {
     title: string;
     translationKey: string;
     titleHtml: string;
   }

   interface DescriptionProps {
     description: string;
     descriptionTranslationKey: string;
     showDescription: boolean;
   }
   ```

2. **Accessibility Support**
   ```typescript
   // In BaseVisualization.svelte
   interface AccessibilityProps {
     ariaLabel: string;
   }

   // Generate unique IDs
   const generateUniqueId = (prefix: string) => 
     `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
   ```

3. **Theme Handling**
   ```typescript
   // In BaseVisualization.svelte
   type ThemeType = 'default' | 'light' | 'dark' | 'custom';

   interface ThemeProps {
     theme: ThemeType;
     customBackground?: string;
     customTextColor?: string;
   }
   ```

4. **Component Usage Example**
   ```svelte
   <BaseVisualization
     title="My Visualization"
     translationKey="viz.my_visualization"
     description="Description of my visualization"
     descriptionTranslationKey="viz.my_visualization_description"
     theme="light"
   >
     <!-- Visualization content -->
   </BaseVisualization>
   ```

5. **Event Handling**
   ```typescript
   // In BaseVisualization.svelte
   interface VisualizationEvents {
     resize: { width: number; height: number };
     // Add more events as needed
   }

   const dispatch = createEventDispatcher<VisualizationEvents>();
   ```

This implementation guide provides a clear path for other developers to understand and extend the BaseVisualization component while maintaining consistency across the application.

## Implementation Guide for Visualization Updates

1. **Title and Translation Updates**
   ```svelte
   <!-- Before -->
   <BaseVisualization
     title=""
     translationKey="" 
     description="Direct description text"
     descriptionTranslationKey={someKey}
   >

   <!-- After -->
   <BaseVisualization
     titleHtml={titleHtml}
     descriptionTranslationKey="viz.component_description"
     theme="default"
     className="component-name"
   >
   ```

2. **Title Translation Format**
   ```typescript
   // Before
   titleHtml = t('viz.distribution_items', { count: formattedCount });

   // After
   titleHtml = t('viz.distribution_items', { '0': formattedCount });
   ```

3. **Component Cleanup Checklist**
   - [ ] Remove direct title/description text
   - [ ] Use proper translation keys
   - [ ] Use titleHtml for formatted titles
   - [ ] Add proper theme and className props
   - [ ] Remove redundant ARIA attributes
   - [ ] Clean up console.log statements
   - [ ] Use proper error handling pattern
   - [ ] Update loading state handling

4. **Translation Key Standards**
   ```typescript
   // Component-specific keys
   const descriptionKey = 'viz.component_name_description';
   const titleKey = 'viz.component_name_title';
   const itemsKey = 'viz.component_name_items';

   // Shared keys
   const loadingText = translate('ui.loading');
   const errorText = translate('ui.error');
   const noDataText = translate('viz.no_data');
   ```

This update provides a clear path for updating all visualization components to match the new BaseVisualization standards and ensures consistency across the application.

10. ✅ Add responsive utilities for specific UI components:
   - ✅ Fixed the IndexDistribution component for better mobile display
   - ✅ Added responsive legend styling for visualizations
   - ✅ Created responsive tab navigation system
   - ✅ Implemented horizontal scrolling tabs with indicators for mobile
   - ✅ Added cross-browser compatible scrollbar hiding techniques