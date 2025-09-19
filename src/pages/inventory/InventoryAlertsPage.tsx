import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { InventoryAlertsPanel } from './components/InventoryAlertsPanel';

export const InventoryAlertsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <NotificationsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Inventory Alerts
        </Typography>
      </Box>

      {/* Alerts Panel */}
      <Paper sx={{ p: 2 }}>
        <InventoryAlertsPanel />
      </Paper>
    </Box>
  );
};

export default InventoryAlertsPage;