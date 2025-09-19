# Inventory Dashboard Component

## Overview
The InventoryDashboard component provides a comprehensive overview of inventory status and management capabilities for the Sacred Sutra Tools application.

## Features Implemented

### Overview Metrics Cards
- **Total Inventory Items**: Shows total count of inventory items
- **Low Stock Items**: Displays items below minimum threshold
- **Critical Stock Issues**: Highlights zero and negative stock items  
- **Active Alerts**: Shows count of active inventory alerts

### Quick Actions Section
- **Manual Adjustment**: Quick access to manual inventory adjustment
- **View Movements**: Navigate to inventory movement history
- **Manage Alerts**: Access to alert management interface
- **Full Inventory View**: Navigate to complete inventory levels view

### Critical Alerts Panel
- Displays high and critical severity alerts
- Shows alert type (low_stock, zero_stock, negative_stock)
- Severity indicators with color coding
- Quick navigation to full alerts management

### Low Stock Items Panel
- Lists items requiring immediate attention
- Status chips with color coding (healthy, low_stock, zero_stock, negative_stock)
- Quick access to adjustment actions for each item
- Current vs minimum threshold display

### Additional Status Cards
- **Healthy Stock**: Count of items with adequate inventory
- **Recent Activity**: Link to recent inventory movements
- **Quick Adjustment**: Direct access to manual adjustment tools

## Technical Implementation

### Redux Integration
- Uses `inventorySlice` selectors for data retrieval
- Integrates with `fetchInventoryLevels` action for data loading
- Connects to authentication state for conditional data fetching

### Material-UI Components
- Responsive Grid layout for mobile and desktop
- Paper containers for section organization
- Alert components for error states and notifications
- Chips for status indicators with appropriate color schemes
- IconButton components for actions

### Navigation Integration
- Router integration for navigation to detailed views
- Placeholder navigation to inventory management sections
- Consistent with existing application navigation patterns

### Error Handling
- Loading states with CircularProgress indicators
- Error display with Alert components
- Empty state handling with appropriate messaging

## File Structure
```
src/pages/inventory/
├── InventoryDashboard.tsx          # Main dashboard component
├── __tests__/
│   ├── InventoryDashboard.test.tsx      # Comprehensive test suite (complex)
│   └── InventoryDashboard.basic.test.tsx # Basic functionality tests (passing)
└── README.md                       # This documentation
```

## Testing
- Basic functionality tests are implemented and passing
- Tests cover component rendering, UI elements, and empty states
- Mock Redux store configuration for isolated testing

## Future Enhancements
- Implement navigation targets for quick action buttons
- Add real-time data updates
- Enhance mobile responsiveness
- Add data export capabilities
- Implement advanced filtering options

## Dependencies
- React 18+
- Material-UI v5
- Redux Toolkit
- React Router
- Existing Redux slices (inventory, auth)

## Usage
```tsx
import { InventoryDashboard } from './pages/inventory/InventoryDashboard';

// Use in routing
<Route path="/inventory" element={<InventoryDashboard />} />
```