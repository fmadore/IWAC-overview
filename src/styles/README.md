# CSS Architecture Documentation

This document provides an overview of the CSS architecture for the **IWAC Database Overview** application, including how the styles are organized, naming conventions, and best practices for developing data visualization components.

## Overview

The CSS architecture follows a utility-first approach with a focus on scalability, maintainability, and consistency. It is specifically designed to support data visualization components for the Islam West Africa Collection (IWAC) database. The architecture is organized into the following categories:

1. **Theme Variables** - CSS custom properties for consistent design tokens and color palettes
2. **Utility Classes** - Small, single-purpose classes that can be composed together
3. **Component Styles** - Specialized styles for visualizations, UI components, and interactive elements
4. **Data Visualization Support** - Enhanced styling for charts, legends, tooltips, and responsive layouts

## Structure

```
src/styles/
├── main.css                  # Minimal entry point (theme, base, utilities)
├── index.css                 # Recommended entry point (imports everything)
├── base/
│   ├── reset.css             # CSS reset and normalization
│   ├── global.css            # Core global styles (includes legacy variables)
│   └── typography.css        # Base typography styles
├── themes/
│   └── default-theme.css     # CSS variables defining the design system
├── utilities/
│   ├── colors.css            # Text, background, and border color utilities
│   ├── spacing.css           # Margin, padding, and gap utilities
│   ├── typography.css        # Font, text alignment, and styling utilities
│   ├── layout.css            # Display, flexbox, grid, positioning utilities
│   └── borders.css           # Border width, style, radius, and shadow utilities
├── components/
│   ├── buttons.css           # Button component styles
│   ├── cards.css             # Card component styles
│   ├── alerts.css            # Alert component styles
│   ├── badges.css            # Badge component styles
│   ├── legend.css            # Legend component styles for data visualizations
│   └── visualizations.css    # Modern chart and visualization styling
└── README.md                 # This documentation file
```

## Key Features for Data Visualization

### Color System
- **Modern Color Palettes**: Designed specifically for data visualization with accessible color combinations
- **Themed Variables**: Consistent color tokens for charts, legends, and interactive elements
- **Visualization-Specific Colors**: Predefined color scales for different chart types (bar charts, pie charts, treemaps, timelines)

### Responsive Design
- **Adaptive Layouts**: Components that work across desktop and mobile devices
- **Flexible Containers**: Chart containers that resize based on screen size
- **Mobile-First**: Optimized for mobile viewing with touch-friendly interactions

### Interactive Elements
- **Hover Effects**: Smooth transitions and visual feedback for chart elements
- **Tooltips**: Styled tooltip components for displaying data details
- **Legend Interactions**: Interactive legends with hover states and disable/enable functionality

## Usage

### Importing Styles

There are two main entry points for different use cases:

- **`index.css`** (Recommended): Imports all styles including component-specific styles, base styles, and visualizations. Use this for the full application.
- **`main.css`** (Minimal): Imports only theme variables, base styles, and utility classes. Use this for lightweight implementations.

In your main Svelte component or entry point:
```javascript
import './styles/index.css';
```

### Working with Data Visualizations

This CSS system is specifically designed to support the IWAC visualization components:

#### Chart Containers
```html
<div class="chart-modern">
  <!-- Your D3.js or visualization content -->
</div>
```

#### Responsive Legends
```html
<div class="legend legend-horizontal">
  <div class="legend-items">
    <div class="legend-item">
      <div class="legend-item-swatch" style="background-color: #5B6EE8;"></div>
      <span class="legend-item-label">Category Name</span>
    </div>
  </div>
</div>
```

#### Tooltips
```html
<div class="tooltip-modern">
  <div class="tooltip-content">
    <strong>Value:</strong> 42
  </div>
</div>
```

### Theme Variables

Theme variables are defined as CSS custom properties in `themes/default-theme.css` and are organized by category. They provide a consistent design system optimized for data visualization.

#### Color System
The theme includes specialized color palettes for different visualization types:

```css
/* Brand colors */
--color-primary: #5B6EE8;
--color-secondary: #FF6B9D;

/* Visualization accent colors (10 color palette) */
--color-accent-1: #5B6EE8;  /* Primary blue */
--color-accent-2: #FF6B9D;  /* Pink */
--color-accent-3: #4ECDC4;  /* Teal */
--color-accent-4: #FFD93D;  /* Yellow */
/* ... and more */

/* Background colors for charts and cards */
--color-bg-card: #FFFFFF;
--color-bg-page: #FAFBFD;
```

#### Typography for Data Display
```css
/* Font sizes optimized for data labels */
--font-size-xs: 0.75rem;   /* Chart labels */
--font-size-sm: 0.875rem;  /* Legend text */
--font-size-md: 1rem;      /* Default */
--font-size-lg: 1.125rem;  /* Chart titles */
```

#### Spacing System
```css
/* Consistent spacing for charts and UI elements */
--spacing-xs: 0.5rem;   /* Tight spacing */
--spacing-sm: 0.75rem;  /* Small spacing */
--spacing-md: 1rem;     /* Default spacing */
--spacing-lg: 1.5rem;   /* Large spacing */
```

### Using Colors in JavaScript/TypeScript

For programmatic color usage (e.g., in D3.js visualizations), colors are also available through the `colorPalette.ts` utility:

```typescript
import { getColorPalette, modernColorScale } from '../utils/colorPalette';

// Get a specific palette
const colors = getColorPalette('primary', 5);

// Use the default modern color scale
const chartColors = modernColorScale;
```

### Utility Classes

Utility classes are small, single-purpose classes that can be composed together to create complex UI components. They are especially useful for styling visualization containers and interactive elements.

#### Layout Utilities for Visualizations
```html
<!-- Responsive chart container -->
<div class="flex flex-col items-center p-lg bg-card rounded-lg shadow-md">
  <h3 class="text-lg font-bold mb-sm">Chart Title</h3>
  <div class="w-full min-h-500">
    <!-- D3.js chart content -->
  </div>
</div>

<!-- Side-by-side layout with legend -->
<div class="flex flex-row items-start gap-md">
  <div class="flex-1">
    <!-- Chart -->
  </div>
  <div class="legend legend-vertical">
    <!-- Legend items -->
  </div>
</div>
```

#### Color Utilities
```html
<!-- Text colors -->
<span class="text-primary">Primary text</span>
<span class="text-secondary">Secondary text</span>

<!-- Background colors -->
<div class="bg-primary text-light p-sm rounded">Primary background</div>
<div class="bg-card border border-default p-md rounded">Card background</div>
```

#### Interactive States
```html
<!-- Hover effects -->
<button class="bg-primary text-light p-sm rounded cursor-pointer hover:bg-primary-dark">
  Interactive Button
</button>

<!-- Focus states -->
<div class="border border-default rounded focusable">
  Focusable element
</div>
```

### Component Classes

For complex UI elements, we provide component-specific classes that encapsulate multiple styles and are optimized for the IWAC visualization interface.

#### Visualization Components (`components/visualizations.css`)
```html
<!-- Modern chart container with hover effects -->
<div class="chart-modern">
  <svg class="w-full h-full">
    <!-- Chart content -->
  </svg>
</div>

<!-- Tooltip styling -->
<div class="tooltip-modern visible">
  <div class="tooltip-content">
    <strong>Country:</strong> Canada<br>
    <strong>Items:</strong> 42
  </div>
</div>

<!-- Loading skeleton -->
<div class="chart-skeleton"></div>
```

#### Legend Components (`components/legend.css`)
```html
<!-- Horizontal legend for desktop -->
<div class="legend legend-horizontal">
  <div class="legend-title">Categories</div>
  <div class="legend-items">
    <div class="legend-item">
      <div class="legend-item-swatch" style="background-color: #5B6EE8;"></div>
      <span class="legend-item-label">Audio</span>
      <span class="legend-item-value">(42)</span>
    </div>
  </div>
</div>

<!-- Compact legend for mobile -->
<div class="legend legend-mobile compact-legend">
  <div class="legend-items">
    <!-- Legend items -->
  </div>
</div>
```

#### UI Components
```html
<!-- Navigation buttons -->
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-outline">Secondary Action</button>

<!-- Information cards -->
<div class="card card-hover">
  <div class="card-header">
    <h3>Visualization Title</h3>
  </div>
  <div class="card-body">
    <!-- Chart content -->
  </div>
</div>

<!-- Status indicators -->
<div class="alert alert-info">
  <div class="alert-content">Loading data...</div>
</div>

<!-- Data badges -->
<span class="badge badge-primary">New</span>
<span class="badge badge-success">Active</span>
```

## Naming Conventions

The utilities follow consistent naming patterns optimized for data visualization development:

### Color Classes
- **Text Colors**: `.text-{color}` (e.g., `.text-primary`, `.text-secondary`)
- **Background Colors**: `.bg-{color}` (e.g., `.bg-card`, `.bg-primary-light`)
- **Border Colors**: `.border-{color}` (e.g., `.border-default`, `.border-primary`)

### Spacing Classes
- **Margin**: `.m-{size}`, `.mt-{size}`, `.mr-{size}`, `.mb-{size}`, `.ml-{size}`, `.mx-{size}`, `.my-{size}`
- **Padding**: `.p-{size}`, `.pt-{size}`, `.pr-{size}`, `.pb-{size}`, `.pl-{size}`, `.px-{size}`, `.py-{size}`
- **Gap**: `.gap-{size}` (for flexbox and grid)

Sizes: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`

### Typography Classes
- **Font Sizes**: `.text-{size}` (e.g., `.text-lg`, `.text-xl`)
- **Font Weights**: `.font-{weight}` (e.g., `.font-bold`, `.font-medium`)
- **Text Alignment**: `.text-{alignment}` (e.g., `.text-center`, `.text-left`)

### Layout Classes
- **Display**: `.block`, `.flex`, `.grid`, `.hidden`
- **Flexbox**: `.items-{position}`, `.justify-{position}`, `.flex-{direction}`
- **Grid**: `.grid-cols-{n}`, `.col-span-{n}`
- **Positioning**: `.relative`, `.absolute`, `.fixed`, `.sticky`

### Border and Visual Classes
- **Border Width**: `.border-{width}` (e.g., `.border`, `.border-2`)
- **Border Radius**: `.rounded-{size}` (e.g., `.rounded`, `.rounded-lg`)
- **Box Shadow**: `.shadow-{size}` (e.g., `.shadow-md`, `.shadow-lg`)

### Interactive Classes
- **Cursor**: `.cursor-{type}` (e.g., `.cursor-pointer`, `.cursor-not-allowed`)
- **Hover States**: Use with CSS or component classes for interactive feedback

## Best Practices for IWAC Development

### 1. **Composition Over Custom CSS**
Use utility classes and component classes together rather than writing custom CSS:

```html
<!-- Good: Using utilities and components -->
<div class="chart-modern p-lg">
  <div class="flex items-center justify-between mb-md">
    <h3 class="text-lg font-bold">Country Distribution</h3>
    <button class="btn btn-outline btn-sm">Export</button>
  </div>
  <div class="min-h-500">
    <!-- Chart content -->
  </div>
</div>

<!-- Avoid: Custom CSS when utilities exist -->
<div class="custom-chart-container">
  <!-- Custom styles in separate CSS file -->
</div>
```

### 2. **Consistent Color Usage**
Use the predefined color palette for data visualization:

```typescript
// In D3.js visualizations
import { getColorPalette } from '../utils/colorPalette';

const colors = getColorPalette('primary', dataCategories.length);
```

### 3. **Responsive Design Patterns**
Design for mobile-first, then enhance for desktop:

```html
<!-- Mobile-first responsive chart -->
<div class="chart-modern">
  <!-- Mobile legend -->
  <div class="legend legend-mobile compact-legend">
    <!-- Legend items -->
  </div>
  
  <!-- Chart area -->
  <div class="min-h-500">
    <!-- Chart content -->
  </div>
</div>
```

### 4. **Accessibility Considerations**
- Use semantic HTML elements
- Provide proper ARIA labels for interactive elements
- Ensure sufficient color contrast
- Include `.sr-only` text for screen readers

```html
<button class="btn btn-primary" aria-label="Export chart data">
  <span class="sr-only">Export chart data</span>
  <span aria-hidden="true">📊</span>
</button>
```

### 5. **Interactive State Management**
Use CSS classes for different interaction states:

```html
<!-- Interactive legend items -->
<div class="legend-item cursor-pointer">
  <div class="legend-item-swatch"></div>
  <span class="legend-item-label">Category Name</span>
</div>

<!-- Disabled state -->
<div class="legend-item legend-item.disabled">
  <div class="legend-item-swatch"></div>
  <span class="legend-item-label">Disabled Category</span>
</div>
```

### 6. **Performance Optimization**
- Use the minimal `main.css` entry point if you don't need all component styles
- Leverage CSS variables for dynamic color changes
- Minimize custom CSS by using existing utilities

### 7. **Documentation and Comments**
Document complex utility combinations in your Svelte components:

```html
<!-- 
  Chart container with modern styling:
  - chart-modern: Modern chart appearance with hover effects
  - p-lg: Large padding for breathing room
  - bg-card: Card background color
  - shadow-md: Medium shadow for depth
-->
<div class="chart-modern p-lg bg-card shadow-md">
  <!-- Chart content -->
</div>
```

## Working with Data Visualizations

### Chart Types and Styling

The IWAC application includes several visualization types, each with specific styling considerations:

#### 1. **Treemap (Country Distribution)**
```html
<div class="chart-modern">
  <svg class="w-full h-full">
    <g class="treemap-container">
      <rect class="treemap-rect-modern" 
            fill="#5B6EE8" 
            stroke="#ffffff" 
            stroke-width="2">
      </rect>
    </g>
  </svg>
</div>
```

#### 2. **Pie Chart (Language Distribution)**
```html
<div class="chart-modern">
  <svg class="w-full h-full">
    <g class="pie-chart-container">
      <path class="pie-slice-modern" 
            fill="#FF6B9D" 
            d="M0,0 L50,0 A50,50 0 0,1 35.36,35.36 Z">
      </path>
    </g>
  </svg>
</div>
```

#### 3. **Bar Chart (Index Distribution)**
```html
<div class="chart-modern">
  <svg class="w-full h-full">
    <g class="bar-chart-container">
      <rect class="bar-modern" 
            fill="#4ECDC4" 
            x="0" y="0" 
            width="50" height="100">
      </rect>
    </g>
  </svg>
</div>
```

#### 4. **Timeline (Time Distribution)**
```html
<div class="chart-modern">
  <svg class="w-full h-full">
    <g class="timeline-container">
      <rect class="timeline-bar timeline-modern" 
            fill="#FFD93D" 
            x="0" y="0" 
            width="10" height="80">
      </rect>
    </g>
  </svg>
</div>
```

### Responsive Chart Containers

Use these container patterns for responsive charts:

```html
<!-- Desktop layout with side legend -->
<div class="flex flex-row gap-lg">
  <div class="flex-1">
    <div class="chart-modern min-h-500">
      <!-- Chart content -->
    </div>
  </div>
  <div class="legend legend-vertical">
    <!-- Legend items -->
  </div>
</div>

<!-- Mobile layout with bottom legend -->
<div class="flex flex-col gap-md">
  <div class="chart-modern min-h-500">
    <!-- Chart content -->
  </div>
  <div class="legend legend-horizontal legend-mobile">
    <!-- Legend items -->
  </div>
</div>
```

### Tooltip Implementation

```html
<div class="tooltip-modern" id="chart-tooltip">
  <div class="tooltip-content">
    <div class="text-sm font-medium">Country: <span id="tooltip-country"></span></div>
    <div class="text-sm">Items: <span id="tooltip-count"></span></div>
  </div>
</div>
```

### Loading States

```html
<!-- Loading skeleton -->
<div class="chart-skeleton"></div>

<!-- Loading with message -->
<div class="chart-modern">
  <div class="flex items-center justify-center min-h-500">
    <div class="alert alert-info">
      <div class="alert-content">Loading visualization data...</div>
    </div>
  </div>
</div>
```

## Component Reference

### Visualization Components (`components/visualizations.css`)

This file contains modern styling for data visualization components:

- **`.chart-modern`**: Modern chart container with hover effects and shadows
- **`.tooltip-modern`**: Styled tooltips with backdrop blur and smooth animations
- **`.bar-modern`**, **`.pie-slice-modern`**, **`.timeline-modern`**, **`.treemap-rect-modern`**: Enhanced styling for different chart types
- **`.chart-skeleton`**: Loading skeleton with animated gradient
- **`.data-point`**: Animated data points with staggered entrance animations
- **`.gradient-bg-animated`**: Animated gradient backgrounds
- **`.glow-effect`**: Subtle glow effects for interactive elements

### Legend Components (`components/legend.css`)

Comprehensive legend styling for data visualizations:

- **Base**: `.legend`, `.legend-items`, `.legend-item`
- **Positioning**: `.legend-top`, `.legend-bottom`, `.legend-left`, `.legend-right`
- **Orientations**: `.legend-horizontal`, `.legend-vertical`
- **Layouts**: `.legend-grid`, `.compact-legend`, `.multi-row-legend`, `.types-legend`
- **Elements**: `.legend-item-swatch`, `.legend-item-label`, `.legend-item-value`
- **States**: `.legend-item.disabled`
- **Responsive**: `.legend-mobile`, `.legend-grid-mobile`

### UI Components

#### Buttons (`components/buttons.css`)
- **Base**: `.btn`
- **Variants**: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`
- **Sizes**: `.btn-sm`, `.btn-lg`
- **Special**: `.btn-icon`, `.btn-disabled`

#### Cards (`components/cards.css`)
- **Base**: `.card`
- **Variants**: `.card-flat`, `.card-hover`, `.card-interactive`
- **Sections**: `.card-header`, `.card-body`, `.card-footer`
- **Sizes**: `.card-sm`, `.card-md`, `.card-lg`

#### Alerts (`components/alerts.css`)
- **Base**: `.alert`
- **Types**: `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-error`
- **Sizes**: `.alert-sm`, `.alert-lg`
- **Elements**: `.alert-icon`, `.alert-content`, `.alert-title`, `.alert-close`

#### Badges (`components/badges.css`)
- **Base**: `.badge`
- **Variants**: `.badge-primary`, `.badge-secondary`, `.badge-success`, `.badge-error`
- **Sizes**: `.badge-sm`, `.badge-lg`
- **Shapes**: `.badge-rounded`, `.badge-square`
- **Special**: `.badge-with-icon`, `.badge-notification`, `.badge-status`

## Development Workflow

### Creating New Visualizations

When adding new visualization components to the IWAC application:

1. **Use the existing color palette**:
   ```typescript
   import { getColorPalette } from '../utils/colorPalette';
   const colors = getColorPalette('primary', dataLength);
   ```

2. **Follow the chart container pattern**:
   ```html
   <div class="chart-modern p-lg">
     <div class="flex items-center justify-between mb-md">
       <h3 class="text-lg font-bold">{title}</h3>
       <div class="flex gap-sm">
         <!-- Controls -->
       </div>
     </div>
     <div class="min-h-500">
       <!-- Chart content -->
     </div>
   </div>
   ```

3. **Include responsive legends**:
   ```html
   <div class="legend legend-horizontal">
     <div class="legend-items">
       <!-- Legend items -->
     </div>
   </div>
   ```

### Extending Component Styles

When you need to add new component styles:

1. **Create a new CSS file in `components/`** (e.g., `components/modals.css`)
2. **Add the import to `index.css`**:
   ```css
   @import './components/modals.css';
   ```
3. **Follow the existing naming patterns**
4. **Use theme variables for consistency**

### Testing Visual Changes

1. **Test responsive behavior** across different screen sizes
2. **Check color contrast** for accessibility
3. **Verify interactive states** (hover, focus, active)
4. **Test with real data** from the IWAC database

### Performance Considerations

- **Use CSS variables** for dynamic color changes instead of inline styles
- **Leverage existing utilities** instead of creating custom CSS
- **Minimize the number of unique classes** by composing utilities
- **Use the minimal `main.css`** entry point if you don't need all component styles

## Troubleshooting

### Common Issues

1. **Colors not displaying correctly**:
   - Check that you're importing the correct CSS entry point (`index.css` or `main.css`)
   - Verify theme variables are loaded before component styles

2. **Layout issues on mobile**:
   - Use responsive utilities and mobile-first design patterns
   - Test with the `.legend-mobile` classes for legends

3. **Tooltips not positioning correctly**:
   - Ensure proper z-index with `.z-tooltip` or similar
   - Use absolute positioning with appropriate parent containers

4. **Chart animations not working**:
   - Check that `.data-point` classes are applied correctly
   - Verify CSS transitions are not being overridden

### Debugging CSS

1. **Use browser developer tools** to inspect applied styles
2. **Check for CSS specificity conflicts**
3. **Verify theme variables** are resolving to expected values
4. **Test utility class combinations** in isolation

## Migration Guide

If you're migrating from older CSS patterns:

1. **Replace custom color values** with theme variables:
   ```css
   /* Before */
   color: #5B6EE8;
   
   /* After */
   color: var(--color-primary);
   ```

2. **Use utility classes** instead of custom CSS:
   ```css
   /* Before */
   .custom-spacing { padding: 16px; margin-bottom: 24px; }
   
   /* After */
   <!-- Use: p-md mb-lg -->
   ```

3. **Adopt component classes** for complex elements:
   ```css
   /* Before */
   .my-button { /* lots of custom styles */ }
   
   /* After */
   <!-- Use: btn btn-primary -->
   ```

## Contributing

When extending the CSS system for the IWAC application:

### Adding New Utilities

1. **Identify the appropriate category** (colors, spacing, typography, layout, borders)
2. **Add to the relevant utility file** (e.g., new color utilities go in `utilities/colors.css`)
3. **Follow the existing naming convention**
4. **Update theme variables** if needed in `themes/default-theme.css`
5. **Test across different visualization types**

### Creating New Components

1. **Create a new CSS file** in `components/` (e.g., `components/modals.css`)
2. **Import it in `index.css`**:
   ```css
   @import './components/modals.css';
   ```
3. **Use theme variables** for consistency
4. **Follow the component naming pattern**: `.component-name`, `.component-name-variant`
5. **Include responsive considerations**

### Documentation Requirements

1. **Update this README** with new components or significant changes
2. **Add code examples** for new patterns
3. **Document any breaking changes**
4. **Include accessibility considerations**

### Testing Guidelines

1. **Test all visualization types**: Country Distribution, Language Distribution, Index Distribution, Timeline, Type Distribution, Word Distribution
2. **Verify responsive behavior** on mobile and desktop
3. **Check accessibility** with screen readers and keyboard navigation
4. **Test with actual IWAC data** to ensure realistic scenarios

## Resources

### External Libraries Used
- **D3.js**: For data visualization rendering
- **Svelte**: Component framework
- **TypeScript**: Type safety

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for various screen sizes

### Related Documentation
- **Main Application README**: `../../README.md`
- **Color Palette Utility**: `../utils/colorPalette.ts`
- **Visualization Components**: `../components/visualizations/`
- **Theme Configuration**: `./themes/default-theme.css`

---

*This documentation is specific to the IWAC Database Overview application. For questions or contributions, please refer to the main project documentation.* 