import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Alert,
  Snackbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Badge,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as ResolveIcon,
  Visibility as AcknowledgeIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchInventoryAlerts,
  acknowledgeInventoryAlert,
  resolveInventoryAlert,
  selectInventoryAlerts,
  selectActiveInventoryAlerts,
  selectInventoryLoading,
  selectInventoryErrors,
  clearAlertAcknowledgmentError,
  clearAlertResolutionError,
} from '../../../store/slices/inventorySlice';
import {
  fetchCategoryGroups,
  selectCategoryGroups,
} from '../../../store/slices/categoryGroupsSlice';
import { selectUser } from '../../../store/slices/authSlice';
import { InventoryAlert } from '../../../types/inventory';
import { CategoryGroup } from '../../../types/categoryGroup';

interface InventoryAlertsPanelProps {
  // Option to show as a widget or full panel
  variant?: 'widget' | 'full';
  // Maximum number of alerts to show in widget mode
  maxAlertsInWidget?: number;
  // Callback when user requests manual adjustment
  onManualAdjustment?: (categoryGroupId: string) => void;
  // Callback when user navigates to category group details
  onViewCategoryGroup?: (categoryGroupId: string) => void;
}

// Severity color mapping
const severityColors = {
  low: '#4caf50',      // Green
  medium: '#ff9800',   // Orange
  high: '#f44336',     // Red
  critical: '#d32f2f', // Dark Red
} as const;

// Alert type icons
const alertTypeIcons = {
  low_stock: <WarningIcon />,
  zero_stock: <ErrorIcon />,
  negative_stock: <ErrorIcon color="error" />,
} as const;

// Alert type labels
const alertTypeLabels = {
  low_stock: 'Low Stock',
  zero_stock: 'Zero Stock',
  negative_stock: 'Negative Stock',
} as const;

interface AlertFilters {
  severity: string;
  alertType: string;
  categoryGroupId: string;
  status: 'all' | 'active' | 'acknowledged' | 'resolved';
  search: string;
}

export const InventoryAlertsPanel: React.FC<InventoryAlertsPanelProps> = ({
  variant = 'full',
  maxAlertsInWidget = 5,
  onManualAdjustment,
  onViewCategoryGroup,
}) => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const alerts = useAppSelector(selectInventoryAlerts);
  const activeAlerts = useAppSelector(selectActiveInventoryAlerts);
  const loading = useAppSelector(selectInventoryLoading);
  const errors = useAppSelector(selectInventoryErrors);
  const categoryGroups = useAppSelector(selectCategoryGroups);
  const user = useAppSelector(selectUser);
  
  // Local state
  const [filters, setFilters] = useState<AlertFilters>({
    severity: 'all',
    alertType: 'all',
    categoryGroupId: 'all',
    status: 'active',
    search: '',
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    alertId: '',
    action: '' as 'acknowledge' | 'resolve',
    alertInfo: '' as string,
  });
  
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout>();
  
  // Category groups lookup for efficient access
  const categoryGroupsMap = useMemo(() => {
    return categoryGroups.reduce((acc, group) => {
      if (group.id) {
        acc[group.id] = group;
      }
      return acc;
    }, {} as Record<string, CategoryGroup>);
  }, [categoryGroups]);
  
  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filteredData = alerts;
    
    // Filter by status
    if (filters.status === 'active') {
      filteredData = filteredData.filter(alert => alert.isActive);
    } else if (filters.status === 'acknowledged') {
      filteredData = filteredData.filter(alert => alert.acknowledgedBy && alert.isActive);
    } else if (filters.status === 'resolved') {
      filteredData = filteredData.filter(alert => !alert.isActive);
    }
    
    // Filter by severity
    if (filters.severity !== 'all') {
      filteredData = filteredData.filter(alert => alert.severity === filters.severity);
    }
    
    // Filter by alert type
    if (filters.alertType !== 'all') {
      filteredData = filteredData.filter(alert => alert.alertType === filters.alertType);
    }
    
    // Filter by category group
    if (filters.categoryGroupId !== 'all') {
      filteredData = filteredData.filter(alert => alert.categoryGroupId === filters.categoryGroupId);
    }
    
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(alert => {
        const categoryGroup = categoryGroupsMap[alert.categoryGroupId];
        return categoryGroup?.name.toLowerCase().includes(searchLower) ||
               categoryGroup?.description.toLowerCase().includes(searchLower) ||
               alertTypeLabels[alert.alertType].toLowerCase().includes(searchLower);
      });
    }
    
    // Sort by severity and creation time
    return filteredData.sort((a, b) => {
      // First sort by severity (critical -> high -> medium -> low)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then sort by creation time (newest first)
      const aTime = a.createdAt?.toDate().getTime() || 0;
      const bTime = b.createdAt?.toDate().getTime() || 0;
      return bTime - aTime;
    });
  }, [alerts, filters, categoryGroupsMap]);
  
  // Display alerts (limited for widget mode)
  const displayAlerts = useMemo(() => {
    if (variant === 'widget') {
      return filteredAlerts.slice(0, maxAlertsInWidget);
    }
    return filteredAlerts;
  }, [filteredAlerts, variant, maxAlertsInWidget]);
  
  // Load data on component mount
  useEffect(() => {
    dispatch(fetchInventoryAlerts());
    dispatch(fetchCategoryGroups());
  }, [dispatch]);
  
  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        dispatch(fetchInventoryAlerts());
      }, 30000); // Refresh every 30 seconds
      setAutoRefreshInterval(interval);
    } else {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(undefined);
      }
    }
    
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefresh, dispatch]);
  
  // Handle error snackbars
  useEffect(() => {
    if (errors.alertAcknowledgment) {
      setSnackbar({
        open: true,
        message: errors.alertAcknowledgment,
        severity: 'error',
      });
      dispatch(clearAlertAcknowledgmentError());
    }
    
    if (errors.alertResolution) {
      setSnackbar({
        open: true,
        message: errors.alertResolution,
        severity: 'error',
      });
      dispatch(clearAlertResolutionError());
    }
  }, [errors.alertAcknowledgment, errors.alertResolution, dispatch]);
  
  const handleRefresh = () => {
    dispatch(fetchInventoryAlerts());
  };
  
  const handleFilterChange = (field: keyof AlertFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleClearFilters = () => {
    setFilters({
      severity: 'all',
      alertType: 'all',
      categoryGroupId: 'all',
      status: 'active',
      search: '',
    });
  };
  
  const handleConfirmAction = (alertId: string, action: 'acknowledge' | 'resolve', alertInfo: string) => {
    setConfirmDialog({
      open: true,
      alertId,
      action,
      alertInfo,
    });
  };
  
  const handleExecuteAction = async () => {
    if (!user?.uid) {
      setSnackbar({
        open: true,
        message: 'User not authenticated',
        severity: 'error',
      });
      return;
    }
    
    const { alertId, action } = confirmDialog;
    
    try {
      if (action === 'acknowledge') {
        await dispatch(acknowledgeInventoryAlert({
          alertId,
          acknowledgedBy: user.uid,
        })).unwrap();
        
        setSnackbar({
          open: true,
          message: 'Alert acknowledged successfully',
          severity: 'success',
        });
      } else if (action === 'resolve') {
        await dispatch(resolveInventoryAlert({
          alertId,
          acknowledgedBy: user.uid,
        })).unwrap();
        
        setSnackbar({
          open: true,
          message: 'Alert resolved successfully',
          severity: 'success',
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} alert: ${error}`,
        severity: 'error',
      });
    }
    
    setConfirmDialog({ open: false, alertId: '', action: 'acknowledge', alertInfo: '' });
  };
  
  const formatTimestamp = (timestamp?: { toDate?: () => Date } | Date | number | string) => {
    if (!timestamp) return 'Unknown';
    
    let date: Date;
    if (typeof timestamp === 'object' && timestamp && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp as string | number | Date);
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const renderAlertCard = (alert: InventoryAlert) => {
    const categoryGroup = categoryGroupsMap[alert.categoryGroupId];
    const isAcknowledged = !!alert.acknowledgedBy;
    const isResolved = !alert.isActive;
    
    return (
      <Card
        key={alert.id}
        sx={{
          mb: 2,
          border: `2px solid ${severityColors[alert.severity]}`,
          opacity: isResolved ? 0.6 : 1,
          '&:hover': {
            boxShadow: 4,
          },
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Alert Icon and Type */}
            <Grid item xs={12} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    color: severityColors[alert.severity],
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {alertTypeIcons[alert.alertType]}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {alertTypeLabels[alert.alertType]}
                  </Typography>
                  <Chip
                    label={alert.severity.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: severityColors[alert.severity],
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </Box>
            </Grid>
            
            {/* Category Group Info */}
            <Grid item xs={12} sm={4}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {categoryGroup && (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: categoryGroup.color,
                        borderRadius: '50%',
                      }}
                    />
                  )}
                  <Typography variant="body1" fontWeight="medium">
                    {categoryGroup?.name || 'Unknown Category'}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Current: <strong>{alert.currentLevel} {alert.unit}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Threshold: <strong>{alert.thresholdLevel} {alert.unit}</strong>
                </Typography>
              </Box>
            </Grid>
            
            {/* Alert Status and Timing */}
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                  <ScheduleIcon fontSize="small" />
                  Created: {formatTimestamp(alert.createdAt)}
                </Typography>
                
                {isAcknowledged && (
                  <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                    <PersonIcon fontSize="small" />
                    Acknowledged: {formatTimestamp(alert.acknowledgedAt)}
                  </Typography>
                )}
                
                {isResolved && (
                  <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                    <ResolveIcon fontSize="small" />
                    Resolved: {formatTimestamp(alert.resolvedAt)}
                  </Typography>
                )}
              </Box>
            </Grid>
            
            {/* Actions */}
            <Grid item xs={12} sm={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {alert.isActive && !isAcknowledged && (
                  <Tooltip title="Acknowledge Alert">
                    <IconButton
                      size="small"
                      onClick={() => handleConfirmAction(
                        alert.id!,
                        'acknowledge',
                        `${categoryGroup?.name} - ${alertTypeLabels[alert.alertType]}`
                      )}
                      disabled={loading.alertAcknowledgment}
                    >
                      <AcknowledgeIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {alert.isActive && (
                  <Tooltip title="Resolve Alert">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleConfirmAction(
                        alert.id!,
                        'resolve',
                        `${categoryGroup?.name} - ${alertTypeLabels[alert.alertType]}`
                      )}
                      disabled={loading.alertResolution}
                    >
                      <ResolveIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {onManualAdjustment && alert.isActive && (
                  <Tooltip title="Manual Adjustment">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onManualAdjustment(alert.categoryGroupId)}
                    >
                      Adjust
                    </Button>
                  </Tooltip>
                )}
                
                {onViewCategoryGroup && (
                  <Tooltip title="View Category Group">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => onViewCategoryGroup(alert.categoryGroupId)}
                    >
                      View
                    </Button>
                  </Tooltip>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };
  
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search alerts..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={6} sm={3} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="acknowledged">Acknowledged</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={3} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Severity</InputLabel>
            <Select
              value={filters.severity}
              label="Severity"
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={3} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Alert Type</InputLabel>
            <Select
              value={filters.alertType}
              label="Alert Type"
              onChange={(e) => handleFilterChange('alertType', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="low_stock">Low Stock</MenuItem>
              <MenuItem value="zero_stock">Zero Stock</MenuItem>
              <MenuItem value="negative_stock">Negative Stock</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={3} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category Group</InputLabel>
            <Select
              value={filters.categoryGroupId}
              label="Category Group"
              onChange={(e) => handleFilterChange('categoryGroupId', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {categoryGroups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6} sm={3} md={2}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
  
  const renderHeader = () => (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant={variant === 'widget' ? 'h6' : 'h5'} component="h2">
        Inventory Alerts
        <Badge
          badgeContent={activeAlerts.length}
          color="error"
          sx={{ ml: 1 }}
        >
          <Box />
        </Badge>
      </Typography>
      
      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh Alerts">
          <IconButton onClick={handleRefresh} disabled={loading.inventoryAlerts}>
            {loading.inventoryAlerts ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
        
        {variant === 'full' && (
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={<RefreshIcon />}
          >
            Auto Refresh
          </Button>
        )}
      </Stack>
    </Box>
  );
  
  if (loading.inventoryAlerts && alerts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading alerts...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {renderHeader()}
      
      {variant === 'full' && renderFilters()}
      
      {errors.inventoryAlerts && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.inventoryAlerts}
        </Alert>
      )}
      
      {displayAlerts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No alerts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filters.status === 'active' ? 'All inventory levels are above their thresholds!' : 'Try adjusting your filters to see more alerts.'}
          </Typography>
        </Paper>
      ) : (
        <Box>
          {displayAlerts.map(renderAlertCard)}
          
          {variant === 'widget' && filteredAlerts.length > maxAlertsInWidget && (
            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Showing {maxAlertsInWidget} of {filteredAlerts.length} alerts
              </Typography>
            </Box>
          )}
        </Box>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, alertId: '', action: 'acknowledge', alertInfo: '' })}
      >
        <DialogTitle>
          {confirmDialog.action === 'acknowledge' ? 'Acknowledge Alert' : 'Resolve Alert'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmDialog.action} this alert?
            <br />
            <strong>{confirmDialog.alertInfo}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, alertId: '', action: 'acknowledge', alertInfo: '' })}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecuteAction}
            color="primary"
            variant="contained"
            disabled={loading.alertAcknowledgment || loading.alertResolution}
          >
            {loading.alertAcknowledgment || loading.alertResolution ? (
              <CircularProgress size={20} />
            ) : (
              confirmDialog.action === 'acknowledge' ? 'Acknowledge' : 'Resolve'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryAlertsPanel;