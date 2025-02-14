# IWAC Database Overview

An interactive visualization dashboard for the IWAC Omeka S database, built with Svelte and D3.js.

## Features

- Country Distribution: View elements by country and sub-collection
- Timeline View: Elements by type over time
- Type Distribution: Distribution of elements by type and country
- Word Distribution: Distribution of words by country and element set
- Language Distribution: Overview of language distribution
- Category Index: Browse elements by category
- Timeline Additions: Track database growth over time

## Project Structure

```
src/
├── components/
│   └── visualizations/
│       ├── BaseVisualization.svelte
│       ├── CountryDistribution.svelte
│       ├── TimelineVisualization.svelte
│       ├── TypeDistribution.svelte
│       ├── WordDistribution.svelte
│       ├── LanguageDistribution.svelte
│       └── CategoryIndex.svelte
├── lib/
│   └── utils/
├── stores/
│   └── itemsStore.ts
└── types/
    └── OmekaItem.ts
```

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/IWAC-overview.git
cd IWAC-overview
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Development

- The project uses TypeScript for type safety
- Visualizations are built using D3.js
- State management is handled through Svelte stores
- The base visualization component provides common functionality for all charts

## Deployment

The project is configured for GitHub Pages deployment. After building, the contents of the `docs` directory will be served at `https://yourusername.github.io/IWAC-overview/`.

To deploy:

1. Build the project:
```bash
npm run build
```

2. Commit and push the changes:
```bash
git add docs
git commit -m "Update build"
git push
```

3. Enable GitHub Pages in your repository settings, selecting the `docs` folder as the source.

## Data Structure

The visualization expects a `items.json` file in the root directory with the following structure:

```typescript
interface OmekaItem {
    id: number;
    title: string;
    type: string;
    country: string;
    collection: string;
    language: string;
    keywords: string[];
    dateAdded: string;
    // Additional fields as per your data structure
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
