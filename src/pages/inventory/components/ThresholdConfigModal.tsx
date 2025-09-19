import React, { useEffect, useState } from 'react';
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
  FormControlLabel,
  Checkbox,
  Grid,
  Paper,
  Chip,
  Autocomplete,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchCategoryGroups,
  selectCategoryGroups,
  selectCategoryGroupsLoading,
  updateCategoryGroup,
} from '../../../store/slices/categoryGroupsSlice';
import {
  fetchInventoryLevels,
  selectInventoryLevels,
  selectInventoryLoading,
} from '../../../store/slices/inventorySlice';
import { CategoryGroupWithStats } from '../../../types/categoryGroup';
import { InventoryLevel, InventoryStatus } from '../../../types/inventory';
import InventoryStatusChip from '../../../components/InventoryStatusChip';

interface ThresholdConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedCategoryGroupId?: string; // Pre-select a category group
}

interface FormData {
  categoryGroupId: string;
  newThreshold: number;
  bulkMode: boolean;
  selectedCategoryGroups: string[];
}

interface ThresholdImpact {
  categoryGroupId: string;
  categoryGroupName: string;
  currentLevel: number;
  currentThreshold: number;
  newThreshold: number;
  unit: string;
  currentStatus: string;
  newStatus: string;
  wouldTriggerAlert: boolean;
  alertSeverity: 'low' | 'medium' | 'high';
}

const validationSchema = Yup.object({
  categoryGroupId: Yup.string().when('bulkMode', {
    is: false,
    then: (schema) => schema.required('Category Group is required'),
    otherwise: (schema) => schema,
  }),
  newThreshold: Yup.number()
    .required('Threshold is required')
    .min(0, 'Threshold must be non-negative')
    .test('reasonable-threshold', 'Threshold seems unreasonably high', function(value) {
      if (value && value > 10000) {
        return this.createError({
          message: 'Threshold above 10,000 units seems excessive. Please verify.',
        });
      }
      return true;
    }),
  bulkMode: Yup.boolean(),
  selectedCategoryGroups: Yup.array().when('bulkMode', {
    is: true,
    then: (schema) => schema.min(1, 'Select at least one category group for bulk update'),
    otherwise: (schema) => schema,
  }),
});

// Helper function to determine inventory status based on current level and threshold
const getInventoryStatus = (currentLevel: number, threshold: number): string => {
  if (currentLevel <= 0) return 'zero_stock';
  if (currentLevel < 0) return 'negative_stock';
  if (currentLevel <= threshold) return 'low_stock';
  return 'healthy';
};

// Helper function to determine alert severity
const getAlertSeverity = (currentLevel: number, threshold: number): 'low' | 'medium' | 'high' => {
  const ratio = currentLevel / threshold;
  if (ratio <= 0) return 'high';
  if (ratio <= 0.5) return 'medium';
  return 'low';
};

const ThresholdConfigModal: React.FC<ThresholdConfigModalProps> = ({
  open,
  onClose,
  onSuccess,
  selectedCategoryGroupId,
}) => {
  const dispatch = useAppDispatch();
  const categoryGroups = useAppSelector(selectCategoryGroups);
  const categoryGroupsLoading = useAppSelector(selectCategoryGroupsLoading);
  const inventoryLevels = useAppSelector(selectInventoryLevels);
  const inventoryLoading = useAppSelector(selectInventoryLoading);
  
  const [showPreview, setShowPreview] = useState(false);
  const [thresholdImpacts, setThresholdImpacts] = useState<ThresholdImpact[]>([]);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const formik = useFormik<FormData>({
    initialValues: {
      categoryGroupId: selectedCategoryGroupId || '',
      newThreshold: 0,
      bulkMode: false,
      selectedCategoryGroups: [],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (confirmationRequired && !showConfirmation) {
          setShowConfirmation(true);
          return;
        }

        const groupsToUpdate = values.bulkMode 
          ? values.selectedCategoryGroups 
          : [values.categoryGroupId];

        // Update thresholds for all selected groups
        const updatePromises = groupsToUpdate.map(groupId =>
          dispatch(updateCategoryGroup({
            id: groupId,
            groupData: { minimumThreshold: values.newThreshold },
          })).unwrap()
        );

        await Promise.all(updatePromises);
        
        // Refresh inventory levels to reflect threshold changes
        dispatch(fetchInventoryLevels());
        
        handleClose();
        onSuccess?.();
      } catch (err) {
        console.error('Failed to update thresholds:', err);
      }
    },
  });

  // Fetch category groups and inventory levels when modal opens
  useEffect(() => {
    if (open) {
      if (categoryGroups.length === 0 && !categoryGroupsLoading) {
        dispatch(fetchCategoryGroups());
      }
      if (inventoryLevels.length === 0 && !inventoryLoading.inventoryLevels) {
        dispatch(fetchInventoryLevels());
      }
    }
  }, [open, categoryGroups.length, categoryGroupsLoading, inventoryLevels.length, inventoryLoading.inventoryLevels, dispatch]);

  // Set initial category group if provided
  useEffect(() => {
    if (selectedCategoryGroupId && formik.values.categoryGroupId !== selectedCategoryGroupId) {
      formik.setFieldValue('categoryGroupId', selectedCategoryGroupId);
    }
  }, [selectedCategoryGroupId]);

  // Calculate threshold impacts when form values change
  useEffect(() => {
    if (formik.values.newThreshold > 0) {
      calculateThresholdImpacts();
    }
  }, [formik.values.newThreshold, formik.values.categoryGroupId, formik.values.selectedCategoryGroups, formik.values.bulkMode]);

  const calculateThresholdImpacts = () => {
    const groupsToAnalyze = formik.values.bulkMode 
      ? formik.values.selectedCategoryGroups 
      : [formik.values.categoryGroupId].filter(Boolean);

    const impacts: ThresholdImpact[] = groupsToAnalyze.map(groupId => {
      const group = categoryGroups.find(g => g.id === groupId);
      const inventoryLevel = inventoryLevels.find(l => l.categoryGroupId === groupId);
      
      if (!group || !inventoryLevel) {
        return null;
      }

      const currentStatus = getInventoryStatus(inventoryLevel.currentInventory, inventoryLevel.minimumThreshold);
      const newStatus = getInventoryStatus(inventoryLevel.currentInventory, formik.values.newThreshold);
      const wouldTriggerAlert = formik.values.newThreshold > inventoryLevel.currentInventory;
      const alertSeverity = getAlertSeverity(inventoryLevel.currentInventory, formik.values.newThreshold);

      return {
        categoryGroupId: groupId,
        categoryGroupName: group.name,
        currentLevel: inventoryLevel.currentInventory,
        currentThreshold: inventoryLevel.minimumThreshold,
        newThreshold: formik.values.newThreshold,
        unit: inventoryLevel.inventoryUnit,
        currentStatus,
        newStatus,
        wouldTriggerAlert,
        alertSeverity,
      };
    }).filter(Boolean) as ThresholdImpact[];

    setThresholdImpacts(impacts);
    
    // Check if confirmation is required (if any threshold would trigger immediate alerts)
    const requiresConfirmation = impacts.some(impact => impact.wouldTriggerAlert);
    setConfirmationRequired(requiresConfirmation);
    setShowConfirmation(false);
  };

  const handleClose = () => {
    formik.resetForm();
    setShowPreview(false);
    setThresholdImpacts([]);
    setConfirmationRequired(false);
    setShowConfirmation(false);
    onClose();
  };

  const handleBulkModeChange = (checked: boolean) => {
    formik.setFieldValue('bulkMode', checked);
    if (!checked) {
      formik.setFieldValue('selectedCategoryGroups', []);
    } else {
      formik.setFieldValue('categoryGroupId', '');
    }
  };

  const getCurrentThreshold = (): number | null => {
    if (formik.values.bulkMode) return null;
    
    const selectedGroup = categoryGroups.find(g => g.id === formik.values.categoryGroupId);
    return selectedGroup?.minimumThreshold || null;
  };

  const getCurrentInventoryLevel = (): InventoryLevel | null => {
    if (formik.values.bulkMode) return null;
    
    return inventoryLevels.find(l => l.categoryGroupId === formik.values.categoryGroupId) || null;
  };

  const alertsCount = thresholdImpacts.filter(impact => impact.wouldTriggerAlert).length;
  const currentThreshold = getCurrentThreshold();
  const currentInventoryLevel = getCurrentInventoryLevel();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Configure Inventory Thresholds
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set minimum inventory thresholds that trigger automatic alerts when stock levels are low
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Bulk Mode Toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.bulkMode}
                    onChange={(e) => handleBulkModeChange(e.target.checked)}
                  />
                }
                label="Bulk Update Mode"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Enable to set the same threshold for multiple category groups
              </Typography>
            </Grid>

            {/* Single Category Group Selection */}
            {!formik.values.bulkMode && (
              <Grid item xs={12}>
                <FormControl fullWidth error={formik.touched.categoryGroupId && Boolean(formik.errors.categoryGroupId)}>
                  <InputLabel>Category Group *</InputLabel>
                  <Select
                    name="categoryGroupId"
                    value={formik.values.categoryGroupId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Category Group *"
                    disabled={categoryGroupsLoading}
                  >
                    {categoryGroups.map((group: CategoryGroupWithStats) => {
                      const inventoryLevel = inventoryLevels.find(l => l.categoryGroupId === group.id);
                      return (
                        <MenuItem key={group.id} value={group.id}>
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                backgroundColor: group.color,
                                borderRadius: '50%',
                              }}
                            />
                            <Typography>{group.name}</Typography>
                            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                              <Chip
                                label={`${group.currentInventory} ${group.inventoryUnit}`}
                                size="small"
                                variant="outlined"
                              />
                              {inventoryLevel && (
                                <InventoryStatusChip status={inventoryLevel.status} size="small" />
                              )}
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {formik.touched.categoryGroupId && formik.errors.categoryGroupId && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {formik.errors.categoryGroupId}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Multiple Category Groups Selection (Bulk Mode) */}
            {formik.values.bulkMode && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={categoryGroups}
                  getOptionLabel={(group) => group.name}
                  value={categoryGroups.filter(group => formik.values.selectedCategoryGroups.includes(group.id || ''))}
                  onChange={(_, selectedGroups) => {
                    formik.setFieldValue('selectedCategoryGroups', selectedGroups.map(g => g.id).filter(Boolean));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Category Groups *"
                      error={formik.touched.selectedCategoryGroups && Boolean(formik.errors.selectedCategoryGroups)}
                      helperText={formik.touched.selectedCategoryGroups && formik.errors.selectedCategoryGroups}
                    />
                  )}
                  renderOption={(props, group) => {
                    const inventoryLevel = inventoryLevels.find(l => l.categoryGroupId === group.id);
                    return (
                      <li {...props}>
                        <Box display="flex" alignItems="center" gap={1} width="100%">
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: group.color,
                              borderRadius: '50%',
                            }}
                          />
                          <Typography>{group.name}</Typography>
                          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                            <Chip
                              label={`${group.currentInventory} ${group.inventoryUnit}`}
                              size="small"
                              variant="outlined"
                            />
                            {inventoryLevel && (
                              <InventoryStatusChip status={inventoryLevel.status} size="small" />
                            )}
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                  disabled={categoryGroupsLoading}
                />
              </Grid>
            )}

            {/* Current Threshold Display (Single Mode) */}
            {!formik.values.bulkMode && currentThreshold !== null && currentInventoryLevel && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Configuration
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Inventory
                      </Typography>
                      <Typography variant="h6">
                        {currentInventoryLevel.currentInventory} {currentInventoryLevel.inventoryUnit}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Threshold
                      </Typography>
                      <Typography variant="body1">
                        {currentThreshold} {currentInventoryLevel.inventoryUnit}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Status
                      </Typography>
                      <InventoryStatusChip status={currentInventoryLevel.status} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* New Threshold Input */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Minimum Threshold"
                name="newThreshold"
                type="number"
                value={formik.values.newThreshold}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.newThreshold && Boolean(formik.errors.newThreshold)}
                helperText={formik.touched.newThreshold && formik.errors.newThreshold}
                inputProps={{ min: 0, step: 'any' }}
                InputProps={{
                  endAdornment: !formik.values.bulkMode && currentInventoryLevel && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {currentInventoryLevel.inventoryUnit}
                    </Typography>
                  )
                }}
              />
            </Grid>

            {/* Preview Button */}
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" height="100%">
                <Button
                  variant="outlined"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!formik.values.newThreshold || thresholdImpacts.length === 0}
                  startIcon={showPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  {showPreview ? 'Hide Preview' : 'Preview Impact'}
                </Button>
              </Box>
            </Grid>

            {/* Threshold Impact Preview */}
            <Grid item xs={12}>
              <Collapse in={showPreview}>
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Threshold Impact Analysis
                    </Typography>
                    
                    {alertsCount > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <WarningIcon />
                          <Typography>
                            This threshold will trigger immediate alerts for {alertsCount} category group{alertsCount > 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </Alert>
                    )}

                    <List>
                      {thresholdImpacts.map((impact, index) => (
                        <React.Fragment key={impact.categoryGroupId}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="subtitle2">
                                    {impact.categoryGroupName}
                                  </Typography>
                                  {impact.wouldTriggerAlert && (
                                    <Tooltip title={`Would trigger ${impact.alertSeverity} severity alert`}>
                                      <WarningIcon 
                                        color={
                                          impact.alertSeverity === 'high' ? 'error' :
                                          impact.alertSeverity === 'medium' ? 'warning' : 'info'
                                        }
                                        fontSize="small"
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
                              }
                              secondary={
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      Current Level
                                    </Typography>
                                    <Typography variant="body2">
                                      {impact.currentLevel} {impact.unit}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      Threshold Change
                                    </Typography>
                                    <Typography variant="body2">
                                      {impact.currentThreshold} → {impact.newThreshold} {impact.unit}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      Status Change
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <InventoryStatusChip status={impact.currentStatus as InventoryStatus} size="small" />
                                      <Typography variant="caption">→</Typography>
                                      <InventoryStatusChip status={impact.newStatus as InventoryStatus} size="small" />
                                    </Box>
                                  </Grid>
                                </Grid>
                              }
                            />
                          </ListItem>
                          {index < thresholdImpacts.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Collapse>
            </Grid>

            {/* Confirmation Dialog Content */}
            {showConfirmation && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <Typography variant="subtitle2" gutterBottom>
                    Confirmation Required
                  </Typography>
                  <Typography variant="body2">
                    The new threshold will trigger immediate alerts for {alertsCount} category group{alertsCount > 1 ? 's' : ''}. 
                    This means the current inventory levels are below the new threshold you&apos;re setting.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Are you sure you want to proceed? These alerts will be created immediately.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleClose}
            disabled={categoryGroupsLoading}
          >
            Cancel
          </Button>
          
          {showConfirmation ? (
            <>
              <Button 
                onClick={() => setShowConfirmation(false)}
                color="inherit"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="warning"
                disabled={categoryGroupsLoading}
              >
                {categoryGroupsLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  'Confirm & Update Thresholds'
                )}
              </Button>
            </>
          ) : (
            <Button 
              type="submit" 
              variant="contained" 
              disabled={categoryGroupsLoading || !formik.isValid || !formik.dirty}
            >
              {categoryGroupsLoading ? (
                <CircularProgress size={20} />
              ) : (
                'Update Threshold' + (formik.values.bulkMode && formik.values.selectedCategoryGroups.length > 1 ? 's' : '')
              )}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ThresholdConfigModal;