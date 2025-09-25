import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  adjustInventoryManually,
  selectInventoryLoading,
  selectInventoryErrors,
  clearAdjustmentError,
  selectInventoryLevels,
} from '../../../store/slices/inventorySlice';
import {
  fetchCategoryGroups,
  selectCategoryGroups,
  selectCategoryGroupsLoading,
} from '../../../store/slices/categoryGroupsSlice';
import { selectUser } from '../../../store/slices/authSlice';
import {
  ManualInventoryAdjustment,
  INVENTORY_ADJUSTMENT_REASONS,
  InventoryAdjustmentReason,
} from '../../../types/inventory';
import { CategoryGroupWithStats } from '../../../types/categoryGroup';

interface ManualAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedCategoryGroupId?: string; // Pre-select a category group
  initialData?: {
    categoryGroupId?: string;
    movementType?: 'addition' | 'adjustment';
    quantity?: number;
    reason?: string;
    notes?: string;
  };
}

interface FormData {
  categoryGroupId: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: InventoryAdjustmentReason;
  notes: string;
}

const validationSchema = Yup.object({
  categoryGroupId: Yup.string()
    .required('Category Group is required'),
  adjustmentType: Yup.string()
    .oneOf(['increase', 'decrease', 'set'], 'Invalid adjustment type')
    .required('Adjustment type is required'),
  quantity: Yup.number()
    .required('Quantity is required')
    .min(0, 'Quantity must be non-negative')
    .test('positive-for-increase-decrease', 'Quantity must be positive for increase/decrease operations', function(value) {
      const { adjustmentType } = this.parent;
      if (adjustmentType === 'increase' || adjustmentType === 'decrease') {
        return value > 0;
      }
      return true;
    }),
  reason: Yup.string()
    .oneOf(INVENTORY_ADJUSTMENT_REASONS as readonly string[], 'Invalid reason')
    .required('Reason is required'),
  notes: Yup.string()
    .max(500, 'Notes must be 500 characters or less'),
});

// Helper function to format reason for display
const formatReason = (reason: string): string => {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to get adjustment type label
const getAdjustmentTypeLabel = (type: string): string => {
  switch (type) {
    case 'increase':
      return 'Increase Inventory';
    case 'decrease':
      return 'Decrease Inventory';
    case 'set':
      return 'Set Inventory Level';
    default:
      return type;
  }
};

const ManualAdjustmentModal: React.FC<ManualAdjustmentModalProps> = ({
  open,
  onClose,
  onSuccess,
  selectedCategoryGroupId,
  initialData,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const loading = useAppSelector(selectInventoryLoading);
  const errors = useAppSelector(selectInventoryErrors);
  const categoryGroups = useAppSelector(selectCategoryGroups);
  const categoryGroupsLoading = useAppSelector(selectCategoryGroupsLoading);
  const inventoryLevels = useAppSelector(selectInventoryLevels);

  const formik = useFormik<FormData>({
    initialValues: {
      categoryGroupId: initialData?.categoryGroupId || selectedCategoryGroupId || '',
      adjustmentType: initialData?.movementType === 'adjustment' ? 'set' : 'increase',
      quantity: initialData?.quantity || 0,
      reason: (initialData?.reason || 'correction') as InventoryAdjustmentReason,
      notes: initialData?.notes || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const adjustmentData: ManualInventoryAdjustment = {
          categoryGroupId: values.categoryGroupId,
          adjustmentType: values.adjustmentType,
          quantity: values.quantity,
          reason: values.reason,
          notes: values.notes || undefined,
          adjustedBy: currentUser?.uid || currentUser?.email || 'unknown',
        };

        await dispatch(adjustInventoryManually(adjustmentData)).unwrap();
        
        handleClose();
        onSuccess?.();
      } catch (err) {
        // Error handling is managed by Redux state
        console.error('Failed to adjust inventory:', err);
      }
    },
  });

  // Fetch category groups when modal opens
  useEffect(() => {
    if (open && categoryGroups.length === 0 && !categoryGroupsLoading) {
      dispatch(fetchCategoryGroups());
    }
  }, [open, categoryGroups.length, categoryGroupsLoading, dispatch]);

  // Set initial category group if provided
  useEffect(() => {
    if (selectedCategoryGroupId && formik.values.categoryGroupId !== selectedCategoryGroupId) {
      formik.setFieldValue('categoryGroupId', selectedCategoryGroupId);
    }
  }, [selectedCategoryGroupId]);

  // Clear adjustment errors when modal opens
  useEffect(() => {
    if (open) {
      dispatch(clearAdjustmentError());
    }
  }, [open, dispatch]);

  const handleClose = () => {
    formik.resetForm();
    dispatch(clearAdjustmentError());
    onClose();
  };

  // Find current inventory level for selected category group
  const selectedCategoryGroup = categoryGroups.find(
    group => group.id === formik.values.categoryGroupId
  );
  const currentInventoryLevel = inventoryLevels.find(
    level => level.categoryGroupId === formik.values.categoryGroupId
  );

  // Calculate new inventory level based on adjustment
  const calculateNewLevel = (): number | null => {
    if (!currentInventoryLevel || !formik.values.quantity) return null;

    switch (formik.values.adjustmentType) {
      case 'increase':
        return currentInventoryLevel.currentInventory + formik.values.quantity;
      case 'decrease':
        return currentInventoryLevel.currentInventory - formik.values.quantity;
      case 'set':
        return formik.values.quantity;
      default:
        return null;
    }
  };

  const newLevel = calculateNewLevel();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Manual Inventory Adjustment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adjust inventory levels manually with proper tracking and audit trail
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {errors.adjustment && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                bgcolor: '#d32f2f', // Error main - high contrast background
                color: '#ffffff', // White text for maximum contrast
                border: '2px solid #b71c1c', // Even darker border for definition
                fontWeight: 'bold',
                '& .MuiAlert-icon': {
                  color: '#ffffff', // White icon
                },
              }}
            >
              {errors.adjustment}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Category Group Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth error={formik.touched.categoryGroupId && Boolean(formik.errors.categoryGroupId)}>
                <InputLabel>Category Group *</InputLabel>
                <Select
                  name="categoryGroupId"
                  value={formik.values.categoryGroupId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Category Group *"
                  disabled={categoryGroupsLoading || !!selectedCategoryGroupId}
                >
                  {categoryGroups.map((group: CategoryGroupWithStats) => (
                    <MenuItem key={group.id} value={group.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: group.color,
                            borderRadius: '50%',
                          }}
                        />
                        <Typography>{group.name}</Typography>
                        <Chip
                          label={`${group.currentInventory} ${group.inventoryUnit}`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.categoryGroupId && formik.errors.categoryGroupId && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {formik.errors.categoryGroupId}
                  </Typography>
                )}
                {selectedCategoryGroupId && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                    Category is pre-selected for this inventory item
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Current Inventory Display */}
            {selectedCategoryGroup && currentInventoryLevel && (
              <Grid item xs={12}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: '#2e3440', // Dark background for high contrast (8.5:1 with white text)
                  border: '2px solid #434c5e', // Darker border for definition
                  borderRadius: 2
                }}>
                  <Typography 
                    variant="subtitle2" 
                    gutterBottom 
                    sx={{ 
                      color: '#ffffff', // White text for maximum contrast
                      fontWeight: 'bold' 
                    }}
                  >
                    Current Inventory Information
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#d8dee9', // Light gray for labels (7.2:1 contrast)
                          fontWeight: 'medium'
                        }}
                      >
                        Current Level
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#ffffff', // White for values
                          fontWeight: 'bold'
                        }}
                      >
                        {currentInventoryLevel.currentInventory} {currentInventoryLevel.inventoryUnit}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#d8dee9', // Light gray for labels (7.2:1 contrast)
                          fontWeight: 'medium'
                        }}
                      >
                        Minimum Threshold
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#ffffff', // White for values
                          fontWeight: 'bold'
                        }}
                      >
                        {currentInventoryLevel.minimumThreshold} {currentInventoryLevel.inventoryUnit}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#d8dee9', // Light gray for labels (7.2:1 contrast)
                          fontWeight: 'medium'
                        }}
                      >
                        Status
                      </Typography>
                      <Chip
                        label={currentInventoryLevel.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: 
                            currentInventoryLevel.status === 'healthy' ? '#2e7d32' : // Dark green
                            currentInventoryLevel.status === 'low_stock' ? '#f57c00' : // Dark orange
                            '#d32f2f', // Dark red
                          color: '#ffffff', // White text
                          fontWeight: 'bold',
                          border: '1px solid #ffffff' // White border for extra definition
                        }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Adjustment Type Selection */}
            <Grid item xs={12}>
              <FormControl component="fieldset" error={formik.touched.adjustmentType && Boolean(formik.errors.adjustmentType)}>
                <FormLabel component="legend">Adjustment Type *</FormLabel>
                <RadioGroup
                  name="adjustmentType"
                  value={formik.values.adjustmentType}
                  onChange={formik.handleChange}
                  row
                >
                  <FormControlLabel
                    value="increase"
                    control={<Radio />}
                    label="Increase"
                  />
                  <FormControlLabel
                    value="decrease"
                    control={<Radio />}
                    label="Decrease"
                  />
                  <FormControlLabel
                    value="set"
                    control={<Radio />}
                    label="Set Level"
                  />
                </RadioGroup>
                {formik.touched.adjustmentType && formik.errors.adjustmentType && (
                  <Typography variant="caption" color="error">
                    {formik.errors.adjustmentType}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Quantity Input */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={`Quantity ${formik.values.adjustmentType === 'set' ? 'to Set' : `to ${getAdjustmentTypeLabel(formik.values.adjustmentType).toLowerCase()}`}`}
                name="quantity"
                type="number"
                value={formik.values.quantity}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.quantity && Boolean(formik.errors.quantity)}
                helperText={formik.touched.quantity && formik.errors.quantity}
                inputProps={{ 
                  min: 0,
                  step: formik.values.adjustmentType === 'set' ? 'any' : 1,
                }}
                InputProps={{
                  endAdornment: selectedCategoryGroup && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {selectedCategoryGroup.inventoryUnit}
                    </Typography>
                  )
                }}
              />
            </Grid>

            {/* New Level Preview */}
            {newLevel !== null && selectedCategoryGroup && (
              <Grid item xs={12} sm={6}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: newLevel < 0 ? '#d32f2f' : '#2e7d32', // error.main : success.main - darker colors
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  border: newLevel < 0 ? '2px solid #b71c1c' : '2px solid #1b5e20' // Even darker borders
                }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                    New Inventory Level
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ color: '#ffffff', fontWeight: 'bold' }}
                  >
                    {newLevel} {selectedCategoryGroup.inventoryUnit}
                  </Typography>
                  {newLevel < 0 && (
                    <Typography variant="caption" sx={{ color: '#ffebee', fontWeight: 'bold' }}>
                      ⚠️ Warning: Negative inventory level
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Reason Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.reason && Boolean(formik.errors.reason)}>
                <InputLabel>Reason *</InputLabel>
                <Select
                  name="reason"
                  value={formik.values.reason}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Reason *"
                >
                  {INVENTORY_ADJUSTMENT_REASONS.map((reason) => (
                    <MenuItem key={reason} value={reason}>
                      {formatReason(reason)}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.reason && formik.errors.reason && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {formik.errors.reason}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Adjusted By (Display Only) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Adjusted By"
                value={currentUser?.email || currentUser?.uid || 'Current User'}
                disabled
                helperText="Automatically filled from current user session"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                name="notes"
                multiline
                rows={3}
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                placeholder="Add any additional details about this adjustment..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleClose}
            disabled={loading.adjustment}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading.adjustment || !formik.isValid || !formik.dirty}
          >
            {loading.adjustment ? (
              <CircularProgress size={20} />
            ) : (
              'Apply Adjustment'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ManualAdjustmentModal;