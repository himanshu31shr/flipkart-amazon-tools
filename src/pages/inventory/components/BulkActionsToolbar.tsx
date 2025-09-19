import React, { useState } from 'react';
import {
  Toolbar,
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  CheckCircle as ApplyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectInventoryLoading,
  setInventoryFilters,
} from '../../../store/slices/inventorySlice';
import { InventoryLevel } from '../../../types/inventory';

export interface BulkActionsToolbarProps {
  /** Selected inventory items */
  selectedItems: InventoryLevel[];
  /** Callback when selection is cleared */
  onClearSelection?: () => void;
  /** Callback when bulk adjustment is performed */
  onBulkAdjustment?: (items: InventoryLevel[], adjustment: BulkAdjustment) => void;
  /** Callback when bulk export is requested */
  onBulkExport?: (items: InventoryLevel[]) => void;
  /** Callback when bulk threshold update is requested */
  onBulkThresholdUpdate?: (items: InventoryLevel[], threshold: number) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export interface BulkAdjustment {
  type: 'add' | 'subtract' | 'set';
  amount: number;
  reason: string;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedItems,
  onClearSelection,
  onBulkAdjustment,
  onBulkExport,
  onBulkThresholdUpdate,
  compact = false,
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const loading = useAppSelector(selectInventoryLoading);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [bulkAdjustment, setBulkAdjustment] = useState<BulkAdjustment>({
    type: 'add',
    amount: 0,
    reason: '',
  });
  const [bulkThreshold, setBulkThreshold] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  
  const selectedCount = selectedItems.length;
  const hasSelection = selectedCount > 0;
  
  // Calculate total inventory value across selected items
  const totalInventory = selectedItems.reduce((sum, item) => sum + item.currentInventory, 0);
  
  // Count items by status
  const statusCounts = selectedItems.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBulkAdjustment = async () => {
    if (!onBulkAdjustment || bulkAdjustment.amount <= 0) return;
    
    setProcessing(true);
    try {
      await onBulkAdjustment(selectedItems, bulkAdjustment);
      setAdjustmentDialogOpen(false);
      setBulkAdjustment({ type: 'add', amount: 0, reason: '' });
    } catch (error) {
      console.error('Bulk adjustment failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkThresholdUpdate = async () => {
    if (!onBulkThresholdUpdate || bulkThreshold <= 0) return;
    
    setProcessing(true);
    try {
      await onBulkThresholdUpdate(selectedItems, bulkThreshold);
      setThresholdDialogOpen(false);
      setBulkThreshold(0);
    } catch (error) {
      console.error('Bulk threshold update failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    if (onBulkExport) {
      onBulkExport(selectedItems);
    }
    handleMenuClose();
  };

  const handleFilterBySelection = () => {
    const categoryGroupIds = selectedItems.map(item => item.categoryGroupId);
    dispatch(setInventoryFilters({ categoryGroupIds }));
    handleMenuClose();
  };

  if (!hasSelection) {
    return null;
  }

  const renderStatusChips = () => (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {Object.entries(statusCounts).map(([status, count]) => (
        <Chip
          key={status}
          label={`${count} ${status.replace('_', ' ')}`}
          size="small"
          color={
            status === 'healthy' ? 'success' :
            status === 'low_stock' ? 'warning' :
            status === 'zero_stock' || status === 'negative_stock' ? 'error' :
            'default'
          }
          variant="outlined"
        />
      ))}
    </Box>
  );

  const renderActions = () => {
    const actions = [
      {
        label: 'Bulk Adjustment',
        icon: <EditIcon />,
        onClick: () => setAdjustmentDialogOpen(true),
        primary: true,
      },
      {
        label: 'Update Thresholds',
        icon: <SettingsIcon />,
        onClick: () => setThresholdDialogOpen(true),
        primary: false,
      },
    ];

    if (compact || isMobile) {
      return (
        <>
          <IconButton
            onClick={actions[0].onClick}
            color="primary"
            disabled={loading.adjustment || processing}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={selectedCount} color="secondary" max={99}>
              {actions[0].icon}
            </Badge>
          </IconButton>
          <IconButton onClick={handleMenuOpen} disabled={processing}>
            <MoreVertIcon />
          </IconButton>
        </>
      );
    }

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.primary ? 'contained' : 'outlined'}
            color={action.primary ? 'primary' : 'inherit'}
            startIcon={action.icon}
            onClick={action.onClick}
            disabled={loading.adjustment || processing}
            size={isMobile ? 'small' : 'medium'}
          >
            {action.label}
          </Button>
        ))}
        <IconButton onClick={handleMenuOpen} disabled={processing}>
          <MoreVertIcon />
        </IconButton>
      </Box>
    );
  };

  return (
    <>
      <Toolbar
        variant="dense"
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          borderRadius: 1,
          mb: 2,
          minHeight: compact ? 48 : 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            {selectedCount} selected
          </Typography>
          
          {!compact && !isMobile && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 2, bgcolor: 'primary.contrastText' }} />
              <Typography variant="body2" sx={{ mr: 2 }}>
                Total: {totalInventory.toLocaleString()} units
              </Typography>
              {renderStatusChips()}
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {renderActions()}
          
          <Tooltip title="Clear Selection">
            <IconButton 
              onClick={onClearSelection}
              sx={{ 
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleExport} disabled={!onBulkExport}>
          <ExportIcon sx={{ mr: 1 }} />
          Export Selected
        </MenuItem>
        <MenuItem onClick={handleFilterBySelection}>
          <RefreshIcon sx={{ mr: 1 }} />
          Filter by Selection
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setThresholdDialogOpen(true)}>
          <SettingsIcon sx={{ mr: 1 }} />
          Update Thresholds
        </MenuItem>
      </Menu>

      {/* Bulk Adjustment Dialog */}
      <Dialog
        open={adjustmentDialogOpen}
        onClose={() => setAdjustmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Bulk Inventory Adjustment
          <Typography variant="body2" color="text.secondary">
            Adjusting {selectedCount} items
          </Typography>
        </DialogTitle>
        <DialogContent>
          {processing && <LinearProgress sx={{ mb: 2 }} />}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This action will adjust inventory levels for all selected items. 
            Please review carefully before proceeding.
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Adjustment Type</InputLabel>
            <Select
              value={bulkAdjustment.type}
              label="Adjustment Type"
              onChange={(e) => setBulkAdjustment(prev => ({ 
                ...prev, 
                type: e.target.value as BulkAdjustment['type'] 
              }))}
            >
              <MenuItem value="add">Add to Current</MenuItem>
              <MenuItem value="subtract">Subtract from Current</MenuItem>
              <MenuItem value="set">Set to Value</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={bulkAdjustment.amount}
            onChange={(e) => setBulkAdjustment(prev => ({ 
              ...prev, 
              amount: Number(e.target.value) 
            }))}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Reason (Optional)"
            multiline
            rows={3}
            value={bulkAdjustment.reason}
            onChange={(e) => setBulkAdjustment(prev => ({ 
              ...prev, 
              reason: e.target.value 
            }))}
            placeholder="Enter reason for bulk adjustment..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAdjustmentDialogOpen(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkAdjustment}
            variant="contained"
            disabled={bulkAdjustment.amount <= 0 || processing}
            startIcon={processing ? undefined : <ApplyIcon />}
          >
            {processing ? 'Processing...' : 'Apply Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Threshold Update Dialog */}
      <Dialog
        open={thresholdDialogOpen}
        onClose={() => setThresholdDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Bulk Thresholds
          <Typography variant="body2" color="text.secondary">
            Updating thresholds for {selectedCount} items
          </Typography>
        </DialogTitle>
        <DialogContent>
          {processing && <LinearProgress sx={{ mb: 2 }} />}
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1 }} />
              This will overwrite existing threshold settings for all selected items.
            </Box>
          </Alert>

          <TextField
            fullWidth
            label="New Minimum Threshold"
            type="number"
            value={bulkThreshold}
            onChange={(e) => setBulkThreshold(Number(e.target.value))}
            inputProps={{ min: 0, step: 0.01 }}
            helperText="All selected items will be updated to this threshold value"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setThresholdDialogOpen(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkThresholdUpdate}
            variant="contained"
            color="warning"
            disabled={bulkThreshold <= 0 || processing}
            startIcon={processing ? undefined : <SettingsIcon />}
          >
            {processing ? 'Updating...' : 'Update Thresholds'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkActionsToolbar;