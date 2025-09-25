# Inventory Components

This directory contains the inventory management components for the Sacred Sutra Tools application.

## Components

### InventoryLevelsList

A comprehensive table component for displaying and managing inventory levels.

**Features:**
- **Data Display**: Shows inventory levels with formatted values and status indicators
- **Advanced Filtering**: Filter by status (healthy, low stock, zero stock, negative), unit type, and inventory type
- **Search**: Search by category group name
- **Responsive Design**: Adapts to mobile/tablet screens with priority columns
- **Actions**: Edit and manual adjustment buttons for each inventory level
- **Export**: CSV export functionality for data analysis
- **Error Handling**: Displays errors via snackbar notifications
- **Loading States**: Shows loading indicators during data fetch
- **Empty States**: Handles scenarios with no data gracefully

**Props:**
```typescript
interface Props {
  onEdit?: (inventoryLevel: InventoryLevel) => void;
  onManualAdjustment?: (inventoryLevel: InventoryLevel) => void;
}
```

**Usage:**
```tsx
import { InventoryLevelsList } from './components/InventoryLevelsList';

// Basic usage
<InventoryLevelsList />

// With callback handlers
<InventoryLevelsList
  onEdit={handleEditInventoryLevel}
  onManualAdjustment={handleManualAdjustment}
/>
```

### InventoryLevelsToolbar

A filtering and action toolbar for the inventory levels table.

**Features:**
- **Search**: Filter by category group name
- **Status Filter**: Multi-select filter for inventory status
- **Unit Filter**: Filter by inventory unit (kg, g, pcs)
- **Type Filter**: Filter by inventory type (weight, quantity)
- **Export**: CSV export functionality
- **Refresh**: Reload data
- **Clear Filters**: Reset all filters

**Props:**
```typescript
interface Props {
  filters: InventoryFilters;
  onFilterChange: (filters: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
  inventoryLevels: InventoryLevel[];
}
```

### InventoryLevelsExample

A demonstration component showing how to integrate and use the InventoryLevelsList component.

## Integration Requirements

### Redux State
The components require the following Redux state structure:
```typescript
// inventorySlice state
{
  inventoryLevels: InventoryLevel[];
  filteredInventoryLevels: InventoryLevel[];
  loading: {
    inventoryLevels: boolean;
    // ... other loading states
  };
  error: {
    inventoryLevels: string | null;
    // ... other error states
  };
  filters: {
    inventory: InventoryFilters;
    // ... other filters
  };
}
```

### Services
- **InventoryService**: For fetching and managing inventory data
- **DataTable**: Reusable table component for consistent table behavior

### Material-UI Theme
Components use Material-UI components and require a Material-UI theme provider.

## Data Flow

1. **Data Fetching**: `InventoryLevelsList` dispatches `fetchInventoryLevels` on mount
2. **Filtering**: `InventoryLevelsToolbar` updates filters in Redux state
3. **Data Display**: Filtered data is displayed in the table with formatted values
4. **Actions**: User interactions trigger callbacks passed to the component
5. **Error Handling**: Errors are displayed via snackbar notifications

## Status Indicators

The component displays inventory status with color-coded chips:
- **Healthy** (Green): Current inventory > minimum threshold
- **Low Stock** (Orange): Current inventory ≤ minimum threshold but > 0
- **Zero Stock** (Red): Current inventory = 0
- **Negative Stock** (Purple): Current inventory < 0

## Formatting

### Inventory Values
- Values ≥ 1000g are displayed as kg (e.g., "1.50 kg" instead of "1500.00 g")
- All values show 2 decimal places for consistency
- Units are displayed with proper labels (kg, g, pcs)

### Dates
- Last updated timestamps are formatted as "MMM DD, YYYY, HH:MM"
- Missing timestamps show "Never"
- Invalid timestamps show "Invalid Date"

## Mobile Responsiveness

The component adapts to mobile screens by:
- Using `DataTable`'s mobile view with card-based layout
- Prioritizing important columns (name, status) on mobile
- Reducing pagination options on mobile (5, 10 instead of 10, 25, 50, 100)
- Stacking filter controls vertically on small screens

## CSV Export

The toolbar includes CSV export functionality that exports:
- Category Group Name
- Current Inventory (with units)
- Unit Type
- Inventory Type
- Minimum Threshold
- Status
- Last Updated (ISO format)

Exported files are named: `inventory-levels-YYYY-MM-DD.csv`

## Error Handling

Errors are handled at multiple levels:
- **Network Errors**: Displayed via snackbar from Redux error state
- **Data Formatting Errors**: Graceful fallbacks (e.g., "Invalid Date")
- **Missing Data**: Empty states and loading indicators
- **User Input Errors**: Validated before dispatch to Redux

## Performance Considerations

- **Memoization**: Uses React Redux selectors for efficient re-renders
- **Pagination**: Large datasets are paginated to maintain performance
- **Debounced Search**: Search filtering is debounced to avoid excessive API calls
- **Optimistic Updates**: UI updates immediately while background sync occurs

## Testing

The components can be tested by:
1. Mocking the Redux store with appropriate inventory state
2. Providing mock callback functions for user interactions
3. Testing responsive behavior with different screen sizes
4. Verifying error handling with various error states
5. Testing filtering and search functionality

See `InventoryLevelsExample.tsx` for a complete usage example.