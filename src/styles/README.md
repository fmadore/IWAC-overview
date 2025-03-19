# CSS Architecture Documentation

This document provides an overview of the CSS architecture for this project, including how the styles are organized, naming conventions, and best practices for implementation.

## Overview

The CSS architecture follows a utility-first approach with a focus on scalability, maintainability, and consistency. It is organized into the following categories:

1. **Theme Variables** - CSS custom properties for consistent design tokens
2. **Utility Classes** - Small, single-purpose classes that can be composed
3. **Components** - (Optional) Component-specific styles when utilities aren't sufficient

## Structure

```
src/styles/
├── main.css                  # Main entry point that imports all styles
├── index.css                 # Alternative entry point with component imports
├── base/
│   ├── reset.css             # CSS reset and normalization
│   ├── global.css            # Core global styles
│   └── typography.css        # Base typography styles
├── themes/
│   └── default-theme.css     # CSS variables defining the design system
├── utilities/
│   ├── colors.css            # Text, background, and border color utilities
│   ├── spacing.css           # Margin, padding, and gap utilities
│   ├── typography.css        # Font, text alignment, and styling utilities
│   ├── layout.css            # Display, flexbox, grid, and positioning utilities
│   └── borders.css           # Border width, style, radius, and shadow utilities
└── components/
    ├── buttons.css           # Button component styles
    ├── cards.css             # Card component styles
    ├── alerts.css            # Alert component styles
    └── badges.css            # Badge component styles
```

## Usage

### Importing Styles

You can import styles through either of the main entry points:
- `main.css` - Imports theme variables, base styles and utility classes
- `index.css` - Additionally imports component-specific styles

### Theme Variables

Theme variables are defined as CSS custom properties (variables) and are organized by category. They provide a consistent set of values to be used throughout the application.

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

### Utility Classes

Utility classes are small, single-purpose classes that can be composed together to create complex UI components. Apply these directly in your HTML.

```html
<!-- Example of using utility classes -->
<div class="flex items-center justify-between p-md bg-primary text-white rounded shadow">
  <h2 class="text-lg font-bold">Title</h2>
  <button class="bg-accent text-white p-sm rounded cursor-pointer">Button</button>
</div>
```

### Component Classes

For more complex UI elements, we provide component-specific classes that encapsulate multiple styles:

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

The utilities follow these naming patterns:

- **Colors**: `.text-{color}`, `.bg-{color}`, `.border-{color}`
- **Spacing**: `.m-{size}`, `.p-{size}`, `.gap-{size}`
- **Typography**: `.text-{size}`, `.font-{weight}`, `.text-{alignment}`
- **Layout**: `.flex`, `.grid`, `.items-{position}`, `.justify-{position}`
- **Borders**: `.border-{width}`, `.rounded-{size}`, `.shadow-{size}`
- **Cursor**: `.cursor-{type}` (auto, pointer, text, etc.)
- **List Style**: `.list-style-{type}` (none, etc.)
- **Z-index**: `.z-{level}` (base, above, dropdown, popover, etc.)

Components follow a more semantic naming approach:
- `.btn` for buttons with modifiers like `.btn-primary`, `.btn-lg`
- `.card` for cards with modifiers like `.card-hover`, `.card-flat`
- `.alert` for alerts with modifiers like `.alert-success`, `.alert-sm`
- `.badge` for badges with modifiers like `.badge-primary`, `.badge-outline`

## Best Practices

1. **Composition over inheritance** - Combine multiple utility classes rather than creating custom CSS
2. **Consistency** - Stick to the predefined variables and utilities whenever possible
3. **Limit custom CSS** - Only create custom CSS for complex components that cannot be easily created with utilities
4. **Dark Mode** - Use the theme variables with CSS variables for easier theme switching
5. **Responsive Design** - Rely on the utility classes for consistent responsive layouts
6. **Accessibility** - Use proper semantic markup and utility classes to enhance accessibility
7. **Document usage** - Include comments in components that list which utility classes are being used

## Interactive Elements

For interactive elements, we provide several utility classes to enhance usability:

- **Cursor utilities**: Use `.cursor-pointer` for clickable elements, `.cursor-text` for text inputs, etc.
- **Z-index system**: Structured z-index utilities from `.z-below` (-1) to `.z-tooltip` (1070)
- **Transition utilities**: Simple transitions for hover/focus states

Example for a button:
```html
<button class="bg-primary text-white p-sm rounded cursor-pointer transition hover:bg-primary-dark">
  Click me
</button>
```

## Component Usage

The component CSS files provide pre-styled elements for common UI patterns:

### Buttons
Multiple button variants are available including:
- `.btn-primary`, `.btn-secondary` - Colored buttons
- `.btn-outline` - Bordered button with transparent background
- `.btn-ghost` - Minimal button with no background or border
- Size variations: `.btn-sm`, `.btn-lg`
- Icon buttons: `.btn-icon`

### Cards
Cards for containing content with variants like:
- `.card-flat` - Card with border instead of shadow
- `.card-hover` - Card with hover animation
- Sections: `.card-header`, `.card-body`, `.card-footer`
- Sizes: `.card-sm`, `.card-md`, `.card-lg`

### Alerts
Notification elements with variants including:
- `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-error`
- Sizes: `.alert-sm`, `.alert-lg`
- With optional elements: `.alert-icon`, `.alert-title`, `.alert-close`

### Badges
Small labeling elements with:
- Color variants: `.badge-primary`, `.badge-success`, etc.
- Sizes: `.badge-sm`, `.badge-lg`
- Shapes: `.badge-rounded`, `.badge-square`
- Special types: `.badge-notification`, `.badge-status`

## Working with Popups and Tooltips

For elements like popups, tooltips, and dropdown menus:

- Use `.absolute` with `.top-100` and appropriate directional classes
- Apply `.z-popover` or `.z-dropdown` to ensure proper stacking
- Add a proper border with `.border`, `.border-solid`, and `.border-default`
- Apply `.shadow` or `.shadow-lg` for depth

## Contributing

When extending this system:

1. Add new utilities to the appropriate file based on their category
2. Maintain the naming convention for consistency
3. Document any additions in this README
4. Consider creating reusable components for complex UI elements that are used frequently

## Examples

For visual examples of the CSS system, see the style guide at `src/styles/docs/styleguide.html`. 