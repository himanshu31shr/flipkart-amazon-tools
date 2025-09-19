import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import { ManualAdjustmentModal } from './components';

export const ManualAdjustmentPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AddIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Manual Inventory Adjustment
        </Typography>
      </Box>

      {/* Quick Actions Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <QuickActionsPanel />
      </Paper>

      {/* Manual Adjustment Interface */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Adjust Inventory Levels
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a category group and adjust inventory levels manually. All adjustments will be tracked and logged.
        </Typography>
        <ManualAdjustmentModal open={true} onClose={() => {}} />
      </Paper>
    </Box>
  );
};

export default ManualAdjustmentPage;