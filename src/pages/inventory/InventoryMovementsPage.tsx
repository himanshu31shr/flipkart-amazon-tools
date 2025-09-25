import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { InventoryMovementsTable } from './components/InventoryMovementsTable';
import { InventoryMovementsToolbar } from './components/InventoryMovementsToolbar';

export const InventoryMovementsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HistoryIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Inventory Movements
        </Typography>
      </Box>

      {/* Toolbar */}
      <Paper sx={{ mb: 3 }}>
        <InventoryMovementsToolbar 
          filters={{}}
          onFilterChange={() => {}}
        />
      </Paper>

      {/* Movements Table */}
      <Paper sx={{ p: 2 }}>
        <InventoryMovementsTable />
      </Paper>
    </Box>
  );
};

export default InventoryMovementsPage;