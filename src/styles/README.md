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
├── themes/
│   └── default-theme.css     # CSS variables defining the design system
└── utilities/
    ├── colors.css            # Text, background, and border color utilities
    ├── spacing.css           # Margin, padding, and gap utilities
    ├── typography.css        # Font, text alignment, and styling utilities
    ├── layout.css            # Display, flexbox, grid, and positioning utilities
    └── borders.css           # Border width, style, radius, and shadow utilities
```

## Usage

### Importing Styles

All styles are imported through `main.css`, which should be imported in your main application file.

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

### Utility Classes

Utility classes are small, single-purpose classes that can be composed together to create complex UI components. Apply these directly in your HTML.

```html
<!-- Example of using utility classes -->
<div class="flex items-center justify-between p-md bg-primary text-white rounded shadow">
  <h2 class="text-lg font-bold">Title</h2>
  <button class="bg-accent text-white p-sm rounded cursor-pointer">Button</button>
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

Check the component examples to see how to effectively use the utility classes to build common UI elements. 