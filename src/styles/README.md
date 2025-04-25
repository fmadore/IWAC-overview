# CSS Architecture Documentation

This document provides an overview of the CSS architecture for this project, including how the styles are organized, naming conventions, and best practices for implementation.

## Overview

The CSS architecture follows a utility-first approach with a focus on scalability, maintainability, and consistency. It is organized into the following categories:

1. **Theme Variables** - CSS custom properties for consistent design tokens
2. **Utility Classes** - Small, single-purpose classes that can be composed
3. **Components** - Component-specific styles when utilities aren't sufficient
4. **Documentation** - Style guide for visual reference

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
│   ├── layout.css            # Display, flexbox, grid, positioning, z-index utilities (includes viz helpers)
│   └── borders.css           # Border width, style, radius, and shadow utilities
├── components/
│   ├── buttons.css           # Button component styles
│   ├── cards.css             # Card component styles
│   ├── alerts.css            # Alert component styles
│   ├── badges.css            # Badge component styles
│   └── legend.css            # Legend component styles for data visualizations
└── docs/
    ├── styleguide.html       # Style guide document
    └── styleguide.css        # Styles specific to the style guide
```

## Usage

### Importing Styles

There are two main entry points:
- `main.css`: Imports theme variables, base styles (`global.css`), and utility classes. Note: It currently contains some redundant reset/base styles.
- `index.css`: Imports everything from `main.css` **plus** component-specific styles (`components/*.css`) and the base reset/typography (`base/reset.css`, `base/typography.css`). **This is the recommended entry point for most use cases.**

### Theme Variables

Theme variables are defined as CSS custom properties (variables) in `themes/default-theme.css` and are organized by category. They provide a consistent set of values to be used throughout the application.

```css
/* Example of using theme variables */
.custom-element {
  color: var(--color-primary);
  font-size: var(--font-size-lg);
  padding: var(--spacing-md);
}
```

The theme includes variables for:
- Colors (brand, background, text, borders, status)
- Typography (font families, sizes, weights, line heights, letter spacing)
- Spacing
- Layout (container sizes)
- Borders and radius
- Shadows
- Animations and transitions
- Z-index layers

*Note:* For backwards compatibility, `base/global.css` includes mappings from older variable names (e.g., `--primary-color`) to the current theme variables.

### Utility Classes

Utility classes are small, single-purpose classes that can be composed together to create complex UI components. Apply these directly in your HTML/Svelte components.

```html
<!-- Example of using utility classes -->
<div class="flex items-center justify-between p-md bg-primary text-white rounded shadow">
  <h2 class="text-lg font-bold">Title</h2>
  <button class="bg-accent text-white p-sm rounded cursor-pointer">Button</button>
</div>
```

### Component Classes

For more complex UI elements, we provide component-specific classes in the `components/` directory that encapsulate multiple styles:

```html
<!-- Example of using component classes -->
<button class="btn btn-primary">Primary Button</button>
<div class="card card-hover">
  <div class="card-header">Card Title</div>
  <div class="card-body">Card content goes here</div>
</div>
<div class="alert alert-success">
  <div class="alert-content">Success message</div>
</div>
```

## Naming Conventions

The utilities generally follow these naming patterns:

- **Colors**: `.text-{color}`, `.bg-{color}`, `.border-{color}` (e.g., `.text-primary`, `.bg-card`, `.border-default`)
- **Spacing**: `.m-{size}`, `.p-{size}`, `.gap-{size}` (e.g., `.mt-sm`, `.px-md`, `.gap-lg`)
- **Typography**: `.text-{size}`, `.font-{weight}`, `.text-{alignment}` (e.g., `.text-lg`, `.font-bold`, `.text-center`)
- **Layout**:
    - Display: `.block`, `.flex`, `.grid`, `.hidden`
    - Flexbox: `.items-{position}`, `.justify-{position}` (e.g., `.items-center`, `.justify-between`)
    - Grid: `.grid-cols-{n}`, `.col-span-{n}`
    - Positioning: `.relative`, `.absolute`, `.fixed`, `.sticky`, `.top-0`, `.inset-center`
- **Borders**: `.border-{width}`, `.rounded-{size}`, `.shadow-{size}` (e.g., `.border`, `.rounded-md`, `.shadow-lg`)
- **Interactivity**: `.cursor-{type}`, `.pointer-events-none` (e.g., `.cursor-pointer`)
- **Lists**: `.list-style-none`
- **Z-index**: `.z-{level}` (e.g., `.z-10`, `.z-dropdown`, `.z-tooltip`)

*Note:* `utilities/layout.css` also contains helper classes specifically for chart and visualization layouts (e.g., `.chart-container`, `.visualization-container`, `.legend-desktop`, `.legend-mobile`).

## Best Practices

1. **Composition over inheritance** - Combine multiple utility classes rather than creating custom CSS.
2. **Consistency** - Stick to the predefined variables and utilities whenever possible.
3. **Limit custom CSS** - Only create custom CSS for complex components that cannot be easily created with utilities. Place these in the relevant `components/*.css` file.
4. **Dark Mode** - Use the theme variables with CSS variables for easier theme switching (currently disabled in `default-theme.css`).
5. **Responsive Design** - Rely on the utility classes for consistent responsive layouts. Add responsive prefixes (e.g., `md:flex`) if needed (requires setup with a processor like PostCSS/Tailwind if not already configured).
6. **Accessibility** - Use proper semantic markup and utility classes (like `.sr-only`) to enhance accessibility.
7. **Document usage** - Include comments in components that list which utility classes are being used, especially for complex compositions.

## Interactive Elements

For interactive elements, we provide several utility classes to enhance usability:

- **Cursor utilities**: Use `.cursor-pointer` for clickable elements, `.cursor-text` for text inputs, etc.
- **Z-index system**: Structured z-index utilities from `.z-below` (-1) to `.z-tooltip` (1070) defined in `default-theme.css` and corresponding utility classes (`.z-10`, `.z-dropdown`, etc.) in `layout.css`.
- **Transition utilities**: Simple transitions for hover/focus states (variables in `default-theme.css`, usage may require custom CSS or component styles).

Example for a button:
```html
<button class="btn btn-primary cursor-pointer transition hover:bg-primary-dark">
  Click me
</button>
```

## Component Usage

The component CSS files provide pre-styled elements for common UI patterns:

### Buttons (`components/buttons.css`)
Multiple button variants are available including:
- Base: `.btn`
- Variants: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`
- Size variations: `.btn-sm`, `.btn-lg`
- Icon buttons: `.btn-icon` (with size modifiers `.btn-icon-sm`, `.btn-icon-lg`)

### Cards (`components/cards.css`)
Cards for containing content with variants like:
- Base: `.card`
- Appearance: `.card-flat`, `.card-hover`
- Sections: `.card-header`, `.card-body`, `.card-footer`
- Media: `.card-media-top`, `.card-media-bottom`
- Sizes: `.card-sm`, `.card-md`, `.card-lg`
- Interactivity: `.card-interactive`

### Alerts (`components/alerts.css`)
Notification elements with variants including:
- Base: `.alert`
- Types: `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-error`
- Sizes: `.alert-sm`, `.alert-lg`
- Layout helpers: `.alert-icon`, `.alert-content`, `.alert-title`, `.alert-close`
- Animation: `.alert-animate`

### Badges (`components/badges.css`)
Small labeling elements with:
- Base: `.badge`
- Color variants: `.badge-primary`, `.badge-secondary`, `.badge-success`, `.badge-error`, `.badge-warning`, `.badge-info`
- Outline: `.badge-outline`
- Sizes: `.badge-sm`, `.badge-lg`
- Shapes: `.badge-rounded`, `.badge-square` (base is `.badge-full`)
- Special types: `.badge-with-icon`, `.badge-notification`, `.badge-status` (with status variants like `.badge-status-online`)

### Legends (`components/legend.css`)
Data visualization legends with extensive customization:
- Base container: `.legend`
- Positioning: `.legend-top`, `.legend-bottom`, `.legend-left`, `.legend-right` (used alongside layout utilities)
- Orientations: `.legend-horizontal`, `.legend-vertical`
- Items: `.legend-items`, `.legend-item`, `.legend-item-swatch`, `.legend-item-label`, `.legend-item-value`
- States: `.legend-item.disabled`
- Responsive variants: `.legend-mobile` (often used with layout utilities like `.legend-grid-mobile`, `.legend-color-mobile`, etc.)
- Layouts: `.legend-grid`, `.types-legend`, `.compact-legend`, `.multi-row-legend`
- Appearance: `.legend-background`, `.legend-boxed`
- Components: `.legend-title`, `.legend-heading`

## Working with Popups and Tooltips

For elements like popups, tooltips, and dropdown menus:

- Use positioning utilities like `.absolute` or `.fixed`.
- Use directional utilities like `.top-100`, `.left-0`, etc.
- Apply appropriate z-index utilities like `.z-popover` or `.z-dropdown`.
- Add borders (`.border`, `.border-solid`, `.border-default`) and shadows (`.shadow`, `.shadow-lg`).
- Style using background (`.bg-card`), padding (`.p-sm`), and border-radius (`.rounded`).

## Contributing

When extending this system:

1. Add new utilities to the appropriate file based on their category (e.g., new spacing utilities go in `utilities/spacing.css`).
2. Maintain the naming convention for consistency.
3. If creating a new reusable UI element, create a new file in `components/` (e.g., `components/modals.css`) and import it in `index.css`.
4. Document any significant additions or changes in this README.

## Style Guide

For visual examples and testing of the CSS system, see the style guide located at `src/styles/docs/styleguide.html`. Open this file in your browser. 