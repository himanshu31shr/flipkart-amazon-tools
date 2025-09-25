import { Inventory as InventoryIcon } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';
import React from 'react';
import { InventoryLevelsList } from './components/InventoryLevelsList';

export const InventoryLevelsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <InventoryIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Inventory Levels
        </Typography>
      </Box>
      
      {/* Inventory Levels List */}
      <Paper sx={{ p: 2 }}>
        <InventoryLevelsList />
      </Paper>
    </Box>
  );
};

export default InventoryLevelsPage;