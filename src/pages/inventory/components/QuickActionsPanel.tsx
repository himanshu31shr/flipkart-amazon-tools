import {
  Edit as AdjustIcon,
  NotificationsActive as AlertsIcon,
  SelectAll as BulkIcon,
  Close as CloseIcon,
  FileDownload as ExportIcon,
  History as MovementsIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  Backdrop,
  Badge,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchInventoryAlerts,
  fetchInventoryLevels,
  selectInventoryAlerts,
  selectInventoryLoading,
} from '../../../store/slices/inventorySlice';

export type QuickActionsPanelMode = 'floating' | 'embedded' | 'compact';
export type QuickActionsPanelOrientation = 'horizontal' | 'vertical';

export interface QuickActionsPanelProps {
  /** Display mode for the component */
  mode?: QuickActionsPanelMode;
  /** Orientation for embedded mode */
  orientation?: QuickActionsPanelOrientation;
  /** Whether to show action labels */
  showLabels?: boolean;
  /** Whether to show badge indicators */
  showBadges?: boolean;
  /** Callback for manual adjustment action */
  onManualAdjustment?: () => void;
  /** Callback for bulk operations */
  onBulkOperations?: () => void;
  /** Callback for export data */
  onExportData?: () => void;
  /** Callback for view alerts */
  onViewAlerts?: () => void;
  /** Callback for configure thresholds */
  onConfigureThresholds?: () => void;
  /** Callback for view movements */
  onViewMovements?: () => void;
  /** Custom actions to include */
  customActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: number;
    disabled?: boolean;
  }>;
  /** Position for floating mode */
  position?: {
    bottom?: number;
    right?: number;
    top?: number;
    left?: number;
  };
  /** Custom styling */
  sx?: object;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  mode = 'floating',
  orientation = 'horizontal',
  showLabels = false,
  showBadges = true,
  onManualAdjustment,
  onBulkOperations,
  onExportData,
  onViewAlerts,
  onConfigureThresholds,
  onViewMovements,
  customActions = [],
  position = { bottom: 24, right: 24 },
  sx = {},
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const loading = useAppSelector(selectInventoryLoading);
  const alerts = useAppSelector(selectInventoryAlerts);
  
  // Calculate badge counts
  const criticalAlertsCount = alerts.filter(alert => 
    alert.isActive && alert.severity === 'critical'
  ).length;
  

  const handleRefreshData = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchInventoryLevels()).unwrap(),
        dispatch(fetchInventoryAlerts()).unwrap(),
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refreshing]);

  const actions = [
    {
      icon: <AdjustIcon />,
      name: 'Manual Adjustment',
      handler: onManualAdjustment,
      badge: 0,
      color: 'primary' as const,
    },
    {
      icon: <BulkIcon />,
      name: 'Bulk Operations',
      handler: onBulkOperations,
      badge: 0,
      color: 'secondary' as const,
    },
    {
      icon: refreshing ? <CircularProgress size={20} /> : <RefreshIcon />,
      name: 'Refresh Data',
      handler: handleRefreshData,
      badge: 0,
      color: 'inherit' as const,
      disabled: refreshing,
    },
    {
      icon: <ExportIcon />,
      name: 'Export Report',
      handler: onExportData,
      badge: 0,
      color: 'inherit' as const,
    },
    {
      icon: <AlertsIcon />,
      name: 'View Alerts',
      handler: onViewAlerts,
      badge: showBadges ? criticalAlertsCount : 0,
      color: criticalAlertsCount > 0 ? 'error' as const : 'inherit' as const,
    },
    {
      icon: <SettingsIcon />,
      name: 'Configure Thresholds',
      handler: onConfigureThresholds,
      badge: 0,
      color: 'inherit' as const,
    },
    {
      icon: <MovementsIcon />,
      name: 'View Movements',
      handler: onViewMovements,
      badge: 0,
      color: 'inherit' as const,
    },
    ...customActions.map(action => ({
      icon: action.icon,
      name: action.label,
      handler: action.onClick,
      badge: showBadges ? (action.badge || 0) : 0,
      color: 'inherit' as const,
      disabled: action.disabled,
    })),
  ];

  const renderAction = (action: typeof actions[0], index: number) => {
    const ActionButton = (
      <Button
        key={index}
        variant={mode === 'compact' ? 'text' : 'outlined'}
        color={action.color}
        disabled={action.disabled || loading.inventoryLevels}
        onClick={action.handler}
        size={isMobile ? 'small' : 'medium'}
        startIcon={mode !== 'compact' && showLabels ? action.icon : undefined}
        sx={{
          minWidth: mode === 'compact' ? 40 : undefined,
          px: mode === 'compact' ? 1 : undefined,
          ...(mode === 'compact' && !showLabels && { 
            '& .MuiButton-startIcon': { margin: 0 }
          }),
        }}
      >
        {mode === 'compact' && !showLabels ? action.icon : action.name}
      </Button>
    );

    if (action.badge > 0) {
      return (
        <Badge 
          key={index}
          badgeContent={action.badge} 
          color="error"
          max={99}
        >
          {ActionButton}
        </Badge>
      );
    }

    if (mode === 'compact' && !showLabels) {
      return (
        <Tooltip key={index} title={action.name} placement="top">
          {ActionButton}
        </Tooltip>
      );
    }

    return ActionButton;
  };

  if (mode === 'floating') {
    return (
      <>
        <SpeedDial
          ariaLabel="Quick inventory actions"
          sx={{
            position: 'fixed',
            ...position,
            '& .MuiFab-primary': {
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            },
            ...sx,
          }}
          icon={<SpeedDialIcon openIcon={<CloseIcon />} />}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
          direction="up"
          FabProps={{
            size: isMobile ? 'medium' : 'large',
            disabled: loading.inventoryLevels,
          }}
        >
          {actions.map((action, index) => (
            <SpeedDialAction
              key={index}
              icon={
                action.badge > 0 ? (
                  <Badge badgeContent={action.badge} color="error" max={99}>
                    {action.icon}
                  </Badge>
                ) : (
                  action.icon
                )
              }
              tooltipTitle={action.name}
              tooltipOpen
              onClick={() => {
                if (action.disabled || loading.inventoryLevels) return;
                setSpeedDialOpen(false);
                action.handler?.();
              }}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  ...(action.color !== 'inherit' && {
                    backgroundColor: theme.palette[action.color].main,
                    color: theme.palette[action.color].contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette[action.color].dark,
                    },
                  }),
                },
              }}
            />
          ))}
        </SpeedDial>
        
        {/* Backdrop for mobile to close SpeedDial */}
        {isMobile && (
          <Backdrop
            open={speedDialOpen}
            onClick={() => setSpeedDialOpen(false)}
            sx={{ zIndex: theme.zIndex.speedDial - 1 }}
          />
        )}
      </>
    );
  }

  // Embedded mode
  return (
    <Box sx={{ ...sx }}>
      <ButtonGroup
        orientation={orientation}
        variant="outlined"
        size={isMobile ? 'small' : 'medium'}
        disabled={loading.inventoryLevels}
        sx={{
          ...(orientation === 'vertical' && {
            '& .MuiButtonGroup-grouped:not(:last-of-type)': {
              borderBottomColor: 'transparent',
            },
          }),
          ...(orientation === 'horizontal' && {
            flexWrap: 'wrap',
          }),
        }}
      >
        {actions.map((action, index) => renderAction(action, index))}
      </ButtonGroup>
    </Box>
  );
};

export default QuickActionsPanel;