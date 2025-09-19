import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Warning,
  CheckCircle,
  Error,
  History as HistoryIcon,
  Storage as StorageIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchInventoryLevels,
  selectInventoryLevels,
  exportInventoryData,
} from '../../store/slices/inventorySlice';
import { InventoryLevelsList } from './components/InventoryLevelsList';
import { InventoryMovementsTable } from './components/InventoryMovementsTable';
import ManualAdjustmentModal from './components/ManualAdjustmentModal';
import InventoryImportModal from './components/InventoryImportModal';
import MobileInventoryCards from './components/MobileInventoryCards';
import { InventoryLevel, InventoryStatus } from '../../types/inventory';

export const InventoryDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const inventoryLevels = useAppSelector(selectInventoryLevels);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [manualAdjustmentOpen, setManualAdjustmentOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryLevel | undefined>();
  const [currentTab, setCurrentTab] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchInventoryLevels());
  }, [dispatch]);

  const handleOpenManualAdjustment = (inventory?: InventoryLevel) => {
    setSelectedInventory(inventory);
    setManualAdjustmentOpen(true);
  };

  const handleCloseManualAdjustment = () => {
    setManualAdjustmentOpen(false);
    setSelectedInventory(undefined);
  };

  const handleManualAdjustmentSuccess = () => {
    // Refresh inventory data after successful adjustment
    dispatch(fetchInventoryLevels());
    setManualAdjustmentOpen(false);
    setSelectedInventory(undefined);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleExportInventory = async () => {
    try {
      const result = await dispatch(exportInventoryData({ 
        includeMovements: true 
      })).unwrap();
      
      // Create a downloadable CSV file
      const blob = new Blob([result], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // Could add toast notification here
    }
  };

  const handleImportInventory = () => {
    setImportModalOpen(true);
  };

  const handleCloseImport = () => {
    setImportModalOpen(false);
  };

  const handleImportSuccess = () => {
    // Refresh inventory data after successful import
    dispatch(fetchInventoryLevels());
    setImportModalOpen(false);
  };

  // Calculate inventory statistics
  const totalItems = inventoryLevels.length;
  const healthyItems = inventoryLevels.filter(item => item.status === 'healthy');
  const lowStockItems = inventoryLevels.filter(item => item.status === 'low_stock');
  const zeroStockItems = inventoryLevels.filter(item => item.status === 'zero_stock');
  const negativeStockItems = inventoryLevels.filter(item => item.status === 'negative_stock');

  const getStatusIcon = (status: InventoryStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'low_stock': return <Warning sx={{ color: '#ff9800' }} />;
      case 'zero_stock': return <Error sx={{ color: '#f44336' }} />;
      case 'negative_stock': return <Error sx={{ color: '#9c27b0' }} />;
      default: return <CheckCircle sx={{ color: '#757575' }} />;
    }
  };

  const alertItems = [...lowStockItems, ...zeroStockItems, ...negativeStockItems];

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: isMobile ? 2 : 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InventoryIcon sx={{ mr: 2, color: 'primary.main', fontSize: isMobile ? 28 : 32 }} />
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            sx={{ fontWeight: 'bold', color: 'primary.dark' }}
          >
            Inventory Management
          </Typography>
        </Box>
        <Stack 
          direction={isMobile ? "column" : "row"} 
          spacing={1}
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportInventory}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              minWidth: isMobile ? 'auto' : undefined,
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleImportInventory}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              minWidth: isMobile ? 'auto' : undefined,
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenManualAdjustment()}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              minWidth: isMobile ? 'auto' : undefined,
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Manual Adjustment
          </Button>
        </Stack>
      </Box>

      {/* Inventory Statistics Cards - Hidden on mobile as cards have status indicators */}
      {!isMobile && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                    {healthyItems.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Healthy Stock
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #ff9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
                    {lowStockItems.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #f44336' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                    {zeroStockItems.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zero Stock
                  </Typography>
                </Box>
                <Error sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #9c27b0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.dark' }}>
                    {negativeStockItems.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Negative Stock
                  </Typography>
                </Box>
                <Error sx={{ fontSize: 40, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      )}

      {/* Inventory Alerts */}
      {alertItems.length > 0 && (
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: '#f57c00', // Orange 700 - high contrast background
          borderRadius: 2,
          border: '2px solid #e65100' // Orange 900 border for extra definition
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: '#ffffff', // White text for maximum contrast
            fontWeight: 'bold'
          }}>
            <Warning sx={{ mr: 1, color: '#ffffff' }} />
            Inventory Alerts ({alertItems.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {alertItems.slice(0, 6).map((item) => (
              <Chip
                key={item.categoryGroupId}
                label={`${item.name}: ${item.currentInventory} ${item.inventoryUnit}`}
                color={item.status === 'low_stock' ? 'warning' : 'error'}
                size="small"
                icon={getStatusIcon(item.status)}
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
            {alertItems.length > 6 && (
              <Chip
                label={`+${alertItems.length - 6} more`}
                color="default"
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Tabbed Interface for Inventory Data */}
      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="inventory sections">
            <Tab 
              icon={<StorageIcon />} 
              label="Inventory Levels" 
              iconPosition="start"
              sx={{ fontWeight: 'medium' }}
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="Activity History" 
              iconPosition="start"
              sx={{ fontWeight: 'medium' }}
            />
          </Tabs>
        </Box>

        {/* Tab Panel: Inventory Levels */}
        {currentTab === 0 && (
          <Box sx={{ p: isMobile ? 0 : 2 }}>
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  All Inventory Levels
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalItems} category groups
                </Typography>
              </Box>
            )}
            
            {isMobile ? (
              <MobileInventoryCards
                inventoryLevels={inventoryLevels}
                onManualAdjustment={handleOpenManualAdjustment}
              />
            ) : (
              <InventoryLevelsList
                onManualAdjustment={handleOpenManualAdjustment}
              />
            )}
          </Box>
        )}

        {/* Tab Panel: Activity History */}
        {currentTab === 1 && (
          <Box sx={{ p: 2 }}>
            <InventoryMovementsTable />
          </Box>
        )}
      </Paper>

      {/* Manual Adjustment Modal */}
      <ManualAdjustmentModal
        open={manualAdjustmentOpen}
        onClose={handleCloseManualAdjustment}
        onSuccess={handleManualAdjustmentSuccess}
        selectedCategoryGroupId={selectedInventory?.categoryGroupId}
        initialData={selectedInventory ? {
          categoryGroupId: selectedInventory.categoryGroupId,
          movementType: 'adjustment' as const,
          quantity: selectedInventory.currentInventory,
          reason: 'correction',
          notes: `Adjusting inventory for ${selectedInventory.name}`
        } : undefined}
      />

      {/* Import Modal */}
      <InventoryImportModal
        open={importModalOpen}
        onClose={handleCloseImport}
        onSuccess={handleImportSuccess}
      />
    </Box>
  );
};

export default InventoryDashboard;