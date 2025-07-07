# Utility Functions (`src/utils`)

This directory contains various utility functions used throughout the IWAC Database Overview application.

## Files

### Core Utilities

*   **`dataTransformers.ts`**: Contains functions for transforming data structures, specifically for processing Omeka items into hierarchical data suitable for visualizations like treemaps (e.g., `createWordDistributionHierarchy`).

*   **`urlUtils.ts`**: Includes functions for managing URL parameters, such as generating URLs with specific language and tab information (`generateUrl`), parsing parameters from the current URL (`parseUrlParams`), and updating the browser's history state (`updateUrl`).

### Development and Debugging

*   **`debug.ts`**: Provides debugging utilities, including logging component lifecycles (`trackMount`, `trackUnmount`), reactive statements (`trackReactive`), and exporting logs (`dumpLogs`, `exportLogs`). Debugging is controlled by the `DEBUG` constant.

*   **`logger.ts`**: A simple logging function (`log`) for basic console output.

### Color and Styling

*   **`colorPalette.ts`**: Provides color palette utilities for data visualizations, including predefined color schemes (`primary`, `pastel`, `monochrome`, `earth`, `contrast`) and helper functions (`getColorPalette`, `modernColorScale`) for programmatic color usage in D3.js visualizations.

## Integration with CSS Architecture

These utilities work closely with the CSS architecture defined in `src/styles/`:

- **Color Palettes**: The `colorPalette.ts` utility provides JavaScript access to colors that complement the CSS variables defined in `themes/default-theme.css`
- **Data Transformations**: Functions in `dataTransformers.ts` prepare data for visualizations that use the styling classes from `components/visualizations.css`
- **URL Management**: The `urlUtils.ts` functions support the responsive navigation system styled with utility classes

## Usage Examples

```typescript
// Using color palettes for D3.js visualizations
import { getColorPalette } from './colorPalette';
const colors = getColorPalette('primary', 5);

// Data transformation for chart components
import { createWordDistributionHierarchy } from './dataTransformers';
const hierarchyData = createWordDistributionHierarchy(items);

// URL parameter management
import { parseUrlParams, updateUrl } from './urlUtils';
const { lang, tab } = parseUrlParams();
updateUrl('en', 'countries');
```

For detailed CSS architecture information, see `src/styles/README.md`. 