# Utility Functions (`src/utils`)

This directory contains various utility functions used throughout the IWAC-overview application.

## Files

*   **`dataTransformers.ts`**: Contains functions for transforming data structures, specifically for processing Omeka items into hierarchical data suitable for visualizations like treemaps (e.g., `createWordDistributionHierarchy`).
*   **`debug.ts`**: Provides debugging utilities, including logging component lifecycles (`trackMount`, `trackUnmount`), reactive statements (`trackReactive`), and exporting logs (`dumpLogs`, `exportLogs`). Debugging is controlled by the `DEBUG` constant.
*   **`logger.ts`**: A simple logging function (`log`) for basic console output.
*   **`urlUtils.ts`**: Includes functions for managing URL parameters, such as generating URLs with specific language and tab information (`generateUrl`), parsing parameters from the current URL (`parseUrlParams`), and updating the browser's history state (`updateUrl`). 