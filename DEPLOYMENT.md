# IWAC Overview Deployment Guide

This document provides instructions for deploying the IWAC Overview application to GitHub Pages.

## Prerequisites

- Node.js and npm installed
- Git installed
- Access to the GitHub repository

## Build Process

The application is built using Vite and outputs to the `docs` directory, which is the default directory for GitHub Pages.

To build the application:

```bash
npm run build
```

This will create or update the `docs` directory with the latest build.

## Testing Locally

Before deploying to GitHub Pages, you should test the build locally using a proper web server to avoid CORS issues:

### Using a Local Server (Recommended)

Due to CORS restrictions, you should use a local server to test the application:

```bash
# Install serve globally if you haven't already
npm install -g serve

# Serve the current directory
serve .

# Or serve just the docs directory
serve docs
```

Alternatively, you can use http-server:

```bash
# Install http-server globally if you haven't already
npm install -g http-server

# Serve the current directory
http-server .

# Or serve just the docs directory
http-server docs
```

Then open the URL provided by the server (usually http://localhost:3000 or http://localhost:8080).

### Using test-deploy.html

You can also use the included `test-deploy.html` file, but you'll still need to serve it through a local server to avoid CORS errors:

1. Run `serve .` or `http-server .` from the project root
2. Navigate to the test-deploy.html file through the server URL (e.g., http://localhost:3000/test-deploy.html)

### Common CORS Errors

If you see errors like these in the console, you're experiencing CORS issues:

```
Failed to load resource: net::ERR_FILE_NOT_FOUND
Access to script has been blocked by CORS policy
```

These occur when you try to open the HTML files directly from the file system (using the `file://` protocol). Always use a local server for testing.

## Debugging Tools

The application includes enhanced debugging tools to help identify and fix issues:

### Debug Panel

A visual debug panel is available in the application:

- Click the 🐞 button in the bottom-right corner to open the debug panel
- Or press `Ctrl+Shift+D` to toggle the panel
- The panel shows detailed logs of component lifecycles and events
- You can filter logs by text or component name
- Use the download button to save logs for further analysis

### Browser Console Commands

You can also access debugging tools through the browser console:

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

### Troubleshooting Orphaned Effects

If you encounter "orphaned effect" errors:

1. Open the debug panel and look for components that remain mounted after they should be unmounted
2. Check for missing cleanup in store subscriptions
3. Look for errors in component lifecycle hooks
4. Examine the component hierarchy to ensure parent-child relationships are correct

## Deploying to GitHub Pages

1. Commit and push your changes to GitHub:

```bash
git add .
git commit -m "Build for deployment"
git push origin main
```

2. Configure GitHub Pages:

   a. Go to your repository on GitHub
   b. Click on "Settings"
   c. Scroll down to the "GitHub Pages" section
   d. Select the "main" branch and "/docs" folder as the source
   e. Click "Save"

3. Your site will be published at: `https://[username].github.io/IWAC-overview/`

## Troubleshooting

If you encounter issues with the deployment:

1. Check the browser console for errors
2. Use the debug panel to identify component lifecycle issues
3. Ensure all paths in the application are relative, not absolute
4. If you see 404 errors for assets, check the `base` setting in `vite.config.js`
5. For routing issues, ensure you're using hash-based routing or configure a 404.html page

## Common Issues and Solutions

### Orphaned Effect Errors

If you encounter "orphaned effect" errors in Svelte:

1. Ensure all components properly clean up subscriptions in `onDestroy` hooks
2. Use the debug utilities to track component lifecycles
3. Avoid using reactive statements (`$:`) with store subscriptions
4. Manually subscribe to stores and clean up subscriptions

### Asset Loading Issues

If assets fail to load:

1. Check the `base` path in `vite.config.js`
2. Ensure all asset paths are relative
3. For GitHub Pages, the base path should be set to your repository name:

```js
// vite.config.js
export default defineConfig({
  base: '/IWAC-overview/',
  // other config...
})
```

### CORS Issues

CORS (Cross-Origin Resource Sharing) issues are common when testing locally:

1. **Never** open the HTML files directly from the file system (using `file://` protocol)
2. Always use a local server like `serve` or `http-server`
3. If you still see CORS errors on GitHub Pages, check that your `base` path is correctly set in `vite.config.js`
4. For local development, you can also use `npm run dev` which starts Vite's development server with proper CORS handling

## Production Configuration

Before deploying to production, consider:

1. Disabling debug tools by setting `DEBUG = false` in `src/utils/debug.ts`
2. Or keeping them enabled but hidden by default for easier troubleshooting
3. Ensuring all console.log statements are removed or disabled
4. Optimizing assets for production

## Maintenance

After deployment, monitor the application for any issues and update as needed. The debug utilities can be disabled in production by setting `DEBUG = false` in `src/utils/debug.ts`. 