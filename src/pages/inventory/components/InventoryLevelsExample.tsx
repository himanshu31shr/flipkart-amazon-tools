import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { InventoryLevelsList } from './InventoryLevelsList';
import { InventoryLevel } from '../../../types/inventory';

/**
 * Example component demonstrating how to use InventoryLevelsList
 * This shows the basic integration with Redux state and callback handlers
 */
export const InventoryLevelsExample: React.FC = () => {
  

  const handleManualAdjustment = (inventoryLevel: InventoryLevel) => {
    console.log('Manual adjustment for inventory level:', inventoryLevel);
    // In a real application, this would open a manual adjustment dialog/modal
    // Example: setAdjustmentDialogOpen(true); setSelectedInventoryLevel(inventoryLevel);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Levels Management
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This component provides a comprehensive table view for managing inventory levels 
        with filtering, sorting, and action capabilities.
      </Typography>

      <Paper sx={{ p: 2 }}>
        <InventoryLevelsList
          onManualAdjustment={handleManualAdjustment}
        />
      </Paper>
    </Box>
  );
};

/**
 * Features of InventoryLevelsList:
 * 
 * 1. **Data Display**: Shows inventory levels with formatted values and status indicators
 * 2. **Filtering**: Advanced filtering by status, unit type, inventory type, and search
 * 3. **Responsive Design**: Adapts to mobile/tablet screens with priority columns
 * 4. **Actions**: Edit and manual adjustment buttons for each inventory level
 * 5. **Export**: CSV export functionality for data analysis
 * 6. **Error Handling**: Displays errors via snackbar notifications
 * 7. **Loading States**: Shows loading indicators during data fetch
 * 8. **Empty States**: Handles scenarios with no data gracefully
 * 
 * **Integration Requirements**:
 * - Requires Redux store with inventorySlice
 * - Uses Material-UI theme for consistent styling
 * - Connects to InventoryService for data operations
 * 
 * **Usage in parent components**:
 * ```tsx
 * import { InventoryLevelsList } from './components/InventoryLevelsList';
 * 
 * // Basic usage
 * <InventoryLevelsList />
 * 
 * // With callback handlers
 * <InventoryLevelsList
 *   onEdit={handleEditInventoryLevel}
 *   onManualAdjustment={handleManualAdjustment}
 * />
 * ```
 */