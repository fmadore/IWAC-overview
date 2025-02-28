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

Before deploying to GitHub Pages, you can test the build locally:

1. Open the `test-deploy.html` file in your browser
2. Or serve the `docs` directory using a local server:

```bash
npx serve docs
```

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
2. Ensure all paths in the application are relative, not absolute
3. If you see 404 errors for assets, check the `base` setting in `vite.config.js`
4. For routing issues, ensure you're using hash-based routing or configure a 404.html page

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

## Maintenance

After deployment, monitor the application for any issues and update as needed. The debug utilities can be disabled in production by setting `DEBUG = false` in `src/utils/debug.ts`. 