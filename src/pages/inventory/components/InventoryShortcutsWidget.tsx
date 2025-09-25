import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Chip,
  Box,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  LocalShipping as MovementsIcon,
  Notifications as AlertsIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import {
  selectInventoryLevels,
  selectInventoryAlerts,
  selectInventoryLoading,
} from '../../../store/slices/inventorySlice';

export interface InventoryShortcutsWidgetProps {
  /** Whether to show the widget in compact mode */
  compact?: boolean;
  /** Custom action handlers */
  onManualAdjustment?: () => void;
  onBulkOperations?: () => void;
  onViewReports?: () => void;
  onExportData?: () => void;
  onImportData?: () => void;
  onConfigureThresholds?: () => void;
  onViewMovements?: () => void;
  onViewAlerts?: () => void;
  onSearchInventory?: () => void;
  onViewTrends?: () => void;
  /** Whether to show action labels */
  showLabels?: boolean;
  /** Maximum number of shortcuts to display */
  maxShortcuts?: number;
}

export const InventoryShortcutsWidget: React.FC<InventoryShortcutsWidgetProps> = ({
  compact = false,
  onManualAdjustment,
  onBulkOperations,
  onViewReports,
  onExportData,
  onImportData,
  onConfigureThresholds,
  onViewMovements,
  onViewAlerts,
  onSearchInventory,
  onViewTrends,
  showLabels = true,
  maxShortcuts,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const inventoryLevels = useAppSelector(selectInventoryLevels);
  const alerts = useAppSelector(selectInventoryAlerts);
  const loading = useAppSelector(selectInventoryLoading);
  
  // Calculate metrics for badges and priority
  const totalItems = inventoryLevels.length;
  const criticalAlerts = alerts.filter(alert => 
    alert.isActive && alert.severity === 'critical'
  ).length;
  const lowStockItems = inventoryLevels.filter(level => 
    level.status === 'low_stock'
  ).length;
  const outOfStockItems = inventoryLevels.filter(level => 
    level.status === 'zero_stock' || level.status === 'negative_stock'
  ).length;
  
  // Define all available shortcuts
  const allShortcuts = [
    {
      id: 'manual-adjustment',
      label: 'Manual Adjustment',
      icon: <EditIcon />,
      color: 'primary' as const,
      handler: onManualAdjustment,
      badge: 0,
      priority: 1,
      description: 'Adjust inventory levels manually',
    },
    {
      id: 'view-alerts',
      label: 'View Alerts',
      icon: <AlertsIcon />,
      color: criticalAlerts > 0 ? 'error' as const : 'inherit' as const,
      handler: onViewAlerts,
      badge: criticalAlerts,
      priority: criticalAlerts > 0 ? 1 : 3,
      description: 'Check critical inventory alerts',
    },
    {
      id: 'search-inventory',
      label: 'Search Items',
      icon: <SearchIcon />,
      color: 'inherit' as const,
      handler: onSearchInventory,
      badge: 0,
      priority: 2,
      description: 'Search inventory items',
    },
    {
      id: 'bulk-operations',
      label: 'Bulk Operations',
      icon: <InventoryIcon />,
      color: 'secondary' as const,
      handler: onBulkOperations,
      badge: 0,
      priority: 2,
      description: 'Perform bulk inventory operations',
    },
    {
      id: 'view-movements',
      label: 'View Movements',
      icon: <MovementsIcon />,
      color: 'inherit' as const,
      handler: onViewMovements,
      badge: 0,
      priority: 3,
      description: 'View inventory movement history',
    },
    {
      id: 'export-data',
      label: 'Export Data',
      icon: <ExportIcon />,
      color: 'inherit' as const,
      handler: onExportData,
      badge: 0,
      priority: 3,
      description: 'Export inventory data',
    },
    {
      id: 'import-data',
      label: 'Import Data',
      icon: <ImportIcon />,
      color: 'inherit' as const,
      handler: onImportData,
      badge: 0,
      priority: 4,
      description: 'Import inventory data',
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      icon: <ReportsIcon />,
      color: 'inherit' as const,
      handler: onViewReports,
      badge: 0,
      priority: 3,
      description: 'View inventory reports',
    },
    {
      id: 'view-trends',
      label: 'View Trends',
      icon: <TrendingUpIcon />,
      color: 'inherit' as const,
      handler: onViewTrends,
      badge: 0,
      priority: 4,
      description: 'View inventory trends and analytics',
    },
    {
      id: 'configure-thresholds',
      label: 'Configure Thresholds',
      icon: <SettingsIcon />,
      color: 'inherit' as const,
      handler: onConfigureThresholds,
      badge: 0,
      priority: 4,
      description: 'Configure inventory thresholds',
    },
  ];
  
  // Filter and sort shortcuts
  const availableShortcuts = allShortcuts
    .filter(shortcut => shortcut.handler) // Only show shortcuts with handlers
    .sort((a, b) => a.priority - b.priority); // Sort by priority
  
  // Apply maxShortcuts limit if specified
  const displayShortcuts = maxShortcuts 
    ? availableShortcuts.slice(0, maxShortcuts)
    : availableShortcuts;
  
  const renderShortcut = (shortcut: typeof allShortcuts[0]) => {
    const ShortcutButton = (
      <Button
        key={shortcut.id}
        variant={compact ? 'text' : 'outlined'}
        color={shortcut.color}
        size={isMobile || compact ? 'small' : 'medium'}
        disabled={loading.inventoryLevels}
        onClick={shortcut.handler}
        startIcon={compact && !showLabels ? undefined : shortcut.icon}
        sx={{
          minWidth: compact && !showLabels ? 40 : undefined,
          px: compact && !showLabels ? 1 : undefined,
          height: compact ? 36 : 48,
          ...(compact && !showLabels && {
            '& .MuiButton-startIcon': { margin: 0 }
          }),
        }}
        fullWidth={!compact}
      >
        {compact && !showLabels ? shortcut.icon : shortcut.label}
      </Button>
    );
    
    // Wrap with badge if count > 0
    if (shortcut.badge > 0) {
      return (
        <Badge 
          key={shortcut.id}
          badgeContent={shortcut.badge} 
          color="error"
          max={99}
        >
          {ShortcutButton}
        </Badge>
      );
    }
    
    // Wrap with tooltip if compact and no labels
    if (compact && !showLabels) {
      return (
        <Tooltip key={shortcut.id} title={shortcut.description} placement="top">
          {ShortcutButton}
        </Tooltip>
      );
    }
    
    return ShortcutButton;
  };
  
  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {displayShortcuts.map(renderShortcut)}
      </Box>
    );
  }
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="Quick Actions"
        titleTypographyProps={{ variant: 'h6' }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {criticalAlerts > 0 && (
              <Chip
                label={`${criticalAlerts} alert${criticalAlerts > 1 ? 's' : ''}`}
                color="error"
                size="small"
                icon={<WarningIcon fontSize="small" />}
              />
            )}
            {totalItems > 0 && (
              <Chip
                label={`${totalItems} items`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Grid container spacing={2}>
          {displayShortcuts.map((shortcut) => (
            <Grid 
              item 
              xs={6} 
              sm={4} 
              md={isMobile ? 6 : 3}
              key={shortcut.id}
            >
              {renderShortcut(shortcut)}
            </Grid>
          ))}
        </Grid>
        
        {/* Status Summary */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Inventory Status Summary
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={`${totalItems} Total Items`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {lowStockItems > 0 && (
              <Chip
                label={`${lowStockItems} Low Stock`}
                size="small"
                color="warning"
              />
            )}
            {outOfStockItems > 0 && (
              <Chip
                label={`${outOfStockItems} Out of Stock`}
                size="small"
                color="error"
              />
            )}
            {criticalAlerts === 0 && lowStockItems === 0 && outOfStockItems === 0 && (
              <Chip
                label="All Good"
                size="small"
                color="success"
                icon={<TrendingUpIcon fontSize="small" />}
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InventoryShortcutsWidget;