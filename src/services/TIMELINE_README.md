# Timeline Chart Service

The Timeline Chart service provides a standardized way to create and manage timeline visualizations across the application. It leverages D3.js to create dual-chart timelines showing both monthly data additions and cumulative totals over time.

## Purpose

This service addresses the need for consistent timeline visualizations by:

1. Providing a reusable component for time-based data visualization
2. Standardizing the appearance and behavior of timeline charts
3. Abstracting D3.js complexity into a manageable API
4. Supporting responsive design across different screen sizes

## Features

- Dual-chart visualization showing monthly additions and cumulative totals
- Interactive tooltips with detailed information
- Responsive design with mobile-specific adaptations
- Language localization support
- Customizable number formatting
- Automatic grid and axis generation
- Interactive data points with hover effects
- Consistent error handling

## Usage Example

```typescript
import { TimelineChart, MonthlyData } from '../../services/timelineChart';
import { useTooltip } from '../../hooks/useTooltip';

// Inside your component
const container = document.getElementById('timeline-container') as HTMLDivElement;
const { showTooltip, hideTooltip } = useTooltip();

// Create sample timeline data
const timelineData: MonthlyData[] = [
  {
    date: new Date(2023, 0, 1),
    month: '2023-01',
    monthFormatted: 'Jan 2023',
    count: 45,
    total: 45,
    percentage: 10
  },
  {
    date: new Date(2023, 1, 1),
    month: '2023-02',
    monthFormatted: 'Feb 2023',
    count: 72,
    total: 117,
    percentage: 16
  },
  // ... more data points
];

// Create timeline chart instance
const timeline = new TimelineChart({
  container,
  width: container.clientWidth,
  height: 500,
  formatNumber: (num) => num.toLocaleString(),
  currentLang: 'en',
  translations: {
    monthlyAdditions: 'Monthly Additions',
    totalItems: 'Total Items',
    newItems: 'New Items',
    percentage: 'Percentage',
    month: 'Month'
  }
});

// Set up tooltip callbacks
timeline.setTooltipCallbacks({
  showTooltip,
  hideTooltip
});

// Render the timeline
timeline.render(timelineData);

// Update the timeline when window resizes
window.addEventListener('resize', () => {
  timeline.render(timelineData);
});
```

## API Reference

### MonthlyData Interface

```typescript
interface MonthlyData {
    date: Date;          // First day of the month
    month: string;       // Formatted month (e.g., "2024-03")
    monthFormatted: string; // Display format (e.g., "Mar 2024")
    count: number;       // Number of items added in this month
    total: number;       // Cumulative total as of this month
    percentage: number;  // Percentage of total
}
```

### TimelineOptions Interface

```typescript
interface TimelineOptions {
    container: HTMLDivElement;
    width: number;
    height: number;
    isMobile?: boolean;
    isExtraSmall?: boolean;
    formatNumber?: (num: number) => string;
    currentLang?: 'en' | 'fr';
    translations?: {
        monthlyAdditions?: string;
        totalItems?: string;
        newItems?: string;
        percentage?: string;
        month?: string;
    };
}
```

### TooltipCallbacks Interface

```typescript
interface TooltipCallbacks {
    showTooltip: (event: MouseEvent, content: string) => void;
    hideTooltip: () => void;
}
```

### TimelineChart Class Methods

- `constructor(options: TimelineOptions)`: Creates a new TimelineChart instance
- `setTooltipCallbacks(callbacks: TooltipCallbacks)`: Sets the callbacks for tooltip display
- `render(timelineData: MonthlyData[])`: Renders the timeline visualization with the provided data

## Data Preparation

To prepare data for the timeline chart:

1. Transform raw date-based data into monthly aggregations
2. Calculate the cumulative total for each month
3. Calculate the percentage of each month's additions relative to the total
4. Format dates consistently using the required date format

Example data transformation:

```typescript
function prepareTimelineData(rawData: any[]): MonthlyData[] {
  // Group data by month
  const monthlyGroups = groupByMonth(rawData);
  
  // Calculate monthly counts and running total
  let runningTotal = 0;
  const monthlyData: MonthlyData[] = [];
  
  Object.entries(monthlyGroups).sort().forEach(([month, items]) => {
    const date = new Date(month.slice(0, 4), parseInt(month.slice(5, 7)) - 1, 1);
    const count = items.length;
    runningTotal += count;
    
    monthlyData.push({
      date,
      month,
      monthFormatted: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count,
      total: runningTotal,
      percentage: 0 // Will calculate after we have the grand total
    });
  });
  
  // Calculate percentages
  const grandTotal = runningTotal;
  monthlyData.forEach(item => {
    item.percentage = (item.count / grandTotal) * 100;
  });
  
  return monthlyData;
}
```

## Styling

The chart uses CSS variables for consistent styling across themes:

- `--color-primary`: Used for the monthly additions line
- `--color-secondary`: Used for the total items line
- `--color-border-default`: Used for grid lines and chart dividers
- `--color-text-primary`: Used for axis labels and titles
- `--color-text-secondary`: Used for secondary text elements

## Responsive Behavior

The timeline chart automatically adapts to different screen sizes:

- **Desktop**: Full featured with detailed axis labels and legend
- **Tablet**: Slightly simplified with fewer ticks and data points
- **Mobile**: Highly simplified with minimal labels and reduced data points
- **Extra small**: Removes legend and further simplifies the visualization

## Integration

This timeline chart integrates with:

1. **Tooltip System**: Uses the application's tooltip hooks for consistent tooltips
2. **Localization**: Supports multiple languages through the translations option
3. **Theme System**: Uses CSS variables for consistent styling 