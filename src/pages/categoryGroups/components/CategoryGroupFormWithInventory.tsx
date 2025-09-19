import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Chip,
  Stack,
  Badge,
} from '@mui/material';
import {
  Inventory,
  TrendingUp,
  TrendingDown,
  Scale,
  Numbers,
  Info,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  createCategoryGroup,
  updateCategoryGroup,
  selectCategoryGroupsLoading,
  selectCategoryGroupsError,
} from '../../../store/slices/categoryGroupsSlice';
import { 
  CategoryGroupFormData, 
  CategoryGroupWithStats,
  CATEGORY_GROUP_COLORS 
} from '../../../types/categoryGroup';

interface CategoryGroupFormWithInventoryProps {
  open: boolean;
  onClose: () => void;
  editingGroup?: CategoryGroupWithStats | null;
  onSuccess?: () => void;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Group name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less'),
  description: Yup.string()
    .max(500, 'Description must be 500 characters or less'),
  color: Yup.string()
    .required('Color is required')
    .matches(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
  inventoryType: Yup.string()
    .required('Inventory type is required')
    .oneOf(['weight', 'qty'], 'Invalid inventory type'),
  inventoryUnit: Yup.string()
    .required('Inventory unit is required')
    .oneOf(['kg', 'g', 'pcs'], 'Invalid inventory unit'),
  currentInventory: Yup.number()
    .required('Current inventory is required')
    .min(0, 'Current inventory cannot be negative')
    .test('integer-for-qty', 'Quantity inventory must be a whole number', function(value) {
      const { inventoryType } = this.parent;
      if (inventoryType === 'qty' && value !== undefined) {
        return Number.isInteger(value);
      }
      return true;
    }),
  minimumThreshold: Yup.number()
    .required('Minimum threshold is required')
    .min(0, 'Minimum threshold cannot be negative')
    .test('integer-for-qty', 'Quantity threshold must be a whole number', function(value) {
      const { inventoryType } = this.parent;
      if (inventoryType === 'qty' && value !== undefined) {
        return Number.isInteger(value);
      }
      return true;
    }),
});

const CategoryGroupFormWithInventory: React.FC<CategoryGroupFormWithInventoryProps> = ({
  open,
  onClose,
  editingGroup,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectCategoryGroupsLoading);
  const error = useAppSelector(selectCategoryGroupsError);

  const [customColor, setCustomColor] = useState('');

  const formik = useFormik<CategoryGroupFormData>({
    initialValues: {
      name: '',
      description: '',
      color: CATEGORY_GROUP_COLORS[0],
      currentInventory: 0,
      inventoryUnit: 'pcs',
      inventoryType: 'qty',
      minimumThreshold: 10,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (editingGroup) {
          await dispatch(updateCategoryGroup({
            id: editingGroup.id!,
            groupData: values,
          })).unwrap();
        } else {
          await dispatch(createCategoryGroup(values)).unwrap();
        }
        
        handleClose();
        onSuccess?.();
      } catch (err) {
        // Error handling is managed by Redux state
        console.error('Failed to save category group:', err);
      }
    },
  });

  useEffect(() => {
    if (open) {
      if (editingGroup) {
        formik.setValues({
          name: editingGroup.name,
          description: editingGroup.description,
          color: editingGroup.color,
          currentInventory: editingGroup.currentInventory,
          inventoryUnit: editingGroup.inventoryUnit,
          inventoryType: editingGroup.inventoryType,
          minimumThreshold: editingGroup.minimumThreshold,
        });
        setCustomColor(editingGroup.color);
      } else {
        formik.resetForm();
        setCustomColor('');
      }
    }
  }, [open, editingGroup]);

  const handleClose = () => {
    formik.resetForm();
    setCustomColor('');
    onClose();
  };

  const handleColorSelect = (color: string) => {
    formik.setFieldValue('color', color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setCustomColor(color);
    if (color.match(/^#[0-9A-F]{6}$/i)) {
      formik.setFieldValue('color', color);
    }
  };

  const handleInventoryTypeChange = (inventoryType: 'weight' | 'qty') => {
    formik.setFieldValue('inventoryType', inventoryType);
    
    // Update default unit based on inventory type
    if (inventoryType === 'weight') {
      formik.setFieldValue('inventoryUnit', 'kg');
    } else {
      formik.setFieldValue('inventoryUnit', 'pcs');
    }

    // Convert current values to integers if switching to quantity
    if (inventoryType === 'qty') {
      formik.setFieldValue('currentInventory', Math.floor(formik.values.currentInventory));
      formik.setFieldValue('minimumThreshold', Math.floor(formik.values.minimumThreshold));
    }
  };

  const getContrastColor = (hexColor: string): string => {
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch {
      return '#000000';
    }
  };

  const getAvailableUnits = () => {
    return formik.values.inventoryType === 'weight' 
      ? [{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'g', label: 'Grams (g)' }]
      : [{ value: 'pcs', label: 'Pieces (pcs)' }];
  };

  const formatInventoryValue = (value: number, unit: string) => {
    if (formik.values.inventoryType === 'qty') {
      return `${value} ${unit}`;
    } else if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kg (${value} g)`;
    } else if (unit === 'kg' && value < 1) {
      return `${(value * 1000).toFixed(0)} g (${value} kg)`;
    }
    return `${value} ${unit}`;
  };

  const getInventoryStatus = (current: number, threshold: number): 'healthy' | 'low_stock' | 'zero_stock' | 'negative_stock' => {
    if (current < 0) return 'negative_stock';
    if (current === 0) return 'zero_stock';
    if (current <= threshold) return 'low_stock';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'low_stock': return '#FF9800';
      case 'zero_stock': return '#F44336';
      case 'negative_stock': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <TrendingUp />;
      case 'low_stock': return <TrendingDown />;
      case 'zero_stock': return <Inventory />;
      case 'negative_stock': return <TrendingDown />;
      default: return <Info />;
    }
  };

  const getUnitConversionHint = () => {
    if (formik.values.inventoryType === 'weight') {
      if (formik.values.inventoryUnit === 'kg') {
        return 'Tip: 1 kg = 1000 g';
      } else if (formik.values.inventoryUnit === 'g') {
        return 'Tip: 1000 g = 1 kg';
      }
    }
    return '';
  };

  const getValidationMessages = () => {
    const messages: string[] = [];
    
    if (formik.values.inventoryType === 'qty') {
      if (!Number.isInteger(formik.values.currentInventory)) {
        messages.push('Quantity inventory must be whole numbers');
      }
      if (!Number.isInteger(formik.values.minimumThreshold)) {
        messages.push('Quantity threshold must be whole numbers');
      }
    }
    
    if (formik.values.currentInventory < 0) {
      messages.push('Negative inventory requires immediate attention');
    }
    
    if (formik.values.minimumThreshold > formik.values.currentInventory) {
      messages.push('Current inventory is below minimum threshold');
    }
    
    return messages;
  };

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
          <Typography variant="h6" fontWeight="bold">
            {editingGroup ? 'Edit Category Group' : 'Create New Category Group'}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Basic Information Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom sx={{ color: 'primary.main' }}>
              Basic Information
            </Typography>
            
            <TextField
              fullWidth
              label="Group Name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              sx={{ mb: 3 }}
              placeholder="e.g., Electronics, Books, Fashion"
            />

            <TextField
              fullWidth
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
              sx={{ mb: 3 }}
              placeholder="Describe this category group..."
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Inventory Configuration Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom sx={{ color: 'primary.main' }}>
              Inventory Configuration
            </Typography>
            
            {/* Inventory Type Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Inventory Type
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: formik.values.inventoryType === 'qty' ? '2px solid' : '1px solid',
                      borderColor: formik.values.inventoryType === 'qty' ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                      transition: 'border-color 0.2s ease',
                    }}
                    onClick={() => handleInventoryTypeChange('qty')}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Quantity
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Track inventory in pieces/units
                        </Typography>
                      </Box>
                      {formik.values.inventoryType === 'qty' && (
                        <Chip label="Selected" color="primary" size="small" />
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: formik.values.inventoryType === 'weight' ? '2px solid' : '1px solid',
                      borderColor: formik.values.inventoryType === 'weight' ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                      transition: 'border-color 0.2s ease',
                    }}
                    onClick={() => handleInventoryTypeChange('weight')}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Weight
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Track inventory by weight (kg/g)
                        </Typography>
                      </Box>
                      {formik.values.inventoryType === 'weight' && (
                        <Chip label="Selected" color="primary" size="small" />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Unit Selection */}
            <Box sx={{ mb: 3 }}>
              <FormControl 
                fullWidth 
                error={formik.touched.inventoryUnit && Boolean(formik.errors.inventoryUnit)}
              >
                <InputLabel id="inventory-unit-label">Inventory Unit</InputLabel>
                <Select
                  labelId="inventory-unit-label"
                  name="inventoryUnit"
                  value={formik.values.inventoryUnit}
                  label="Inventory Unit"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {getAvailableUnits().map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.inventoryUnit && formik.errors.inventoryUnit}
                </FormHelperText>
              </FormControl>
            </Box>

            {/* Inventory Values */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Inventory"
                  name="currentInventory"
                  type="number"
                  value={formik.values.currentInventory}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.currentInventory && Boolean(formik.errors.currentInventory)}
                  helperText={formik.touched.currentInventory && formik.errors.currentInventory}
                  InputProps={{
                    inputProps: {
                      min: 0,
                      step: formik.values.inventoryType === 'qty' ? 1 : 0.01,
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Threshold"
                  name="minimumThreshold"
                  type="number"
                  value={formik.values.minimumThreshold}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.minimumThreshold && Boolean(formik.errors.minimumThreshold)}
                  helperText={formik.touched.minimumThreshold && formik.errors.minimumThreshold}
                  InputProps={{
                    inputProps: {
                      min: 0,
                      step: formik.values.inventoryType === 'qty' ? 1 : 0.01,
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Enhanced Real-time Preview */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" fontWeight="medium" gutterBottom sx={{ color: 'primary.main' }}>
                Real-time Preview
              </Typography>
              
              <Grid container spacing={2}>
                {/* Category Group Appearance Preview */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Category Group Appearance
                    </Typography>
                    
                    <Paper
                      sx={{
                        p: 2,
                        backgroundColor: formik.values.color,
                        color: getContrastColor(formik.values.color),
                        borderRadius: 2,
                        mb: 2,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        {formik.values.inventoryType === 'weight' ? <Scale /> : <Numbers />}
                        <Typography variant="subtitle1" fontWeight="bold">
                          {formik.values.name || 'Category Group Name'}
                        </Typography>
                      </Stack>
                      
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        {formik.values.description || 'Category group description will appear here...'}
                      </Typography>
                      
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Type: {formik.values.inventoryType === 'weight' ? 'Weight-based' : 'Quantity-based'}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={formik.values.inventoryUnit}
                          sx={{ 
                            backgroundColor: getContrastColor(formik.values.color),
                            color: formik.values.color,
                            fontWeight: 'bold',
                          }}
                        />
                      </Stack>
                    </Paper>
                  </Paper>
                </Grid>

                {/* Inventory Status Preview */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Inventory Status
                    </Typography>
                    
                    {formik.values.currentInventory >= 0 && formik.values.minimumThreshold >= 0 ? (
                      <Box>
                        {(() => {
                          const status = getInventoryStatus(formik.values.currentInventory, formik.values.minimumThreshold);
                          return (
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Badge 
                                  color={status === 'healthy' ? 'success' : status === 'low_stock' ? 'warning' : 'error'}
                                  variant="dot"
                                >
                                  {getStatusIcon(status)}
                                </Badge>
                                <Chip
                                  label={status.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  sx={{
                                    backgroundColor: getStatusColor(status),
                                    color: 'white',
                                    fontWeight: 'bold',
                                  }}
                                />
                              </Stack>
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Current Inventory
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {formatInventoryValue(formik.values.currentInventory, formik.values.inventoryUnit)}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Minimum Threshold
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                  {formatInventoryValue(formik.values.minimumThreshold, formik.values.inventoryUnit)}
                                </Typography>
                              </Box>

                              {/* Progress Bar */}
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Inventory Level
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      flex: 1,
                                      height: 8,
                                      bgcolor: 'grey.200',
                                      borderRadius: 1,
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        height: '100%',
                                        width: `${Math.min((formik.values.currentInventory / Math.max(formik.values.minimumThreshold * 2, formik.values.currentInventory)) * 100, 100)}%`,
                                        bgcolor: getStatusColor(status),
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {Math.round((formik.values.currentInventory / Math.max(formik.values.minimumThreshold, 1)) * 100)}%
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        })()}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Enter inventory values to see status preview
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Unit Conversion Hints */}
                {getUnitConversionHint() && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<Info />}>
                      <Typography variant="body2">
                        <strong>Unit Conversion:</strong> {getUnitConversionHint()}
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {/* Validation Messages */}
                {getValidationMessages().length > 0 && (
                  <Grid item xs={12}>
                    <Alert 
                      severity={formik.values.currentInventory < 0 ? 'error' : 'warning'}
                      sx={{ mt: 1 }}
                    >
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        Configuration Notices:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {getValidationMessages().map((message, index) => (
                          <Typography key={index} component="li" variant="body2">
                            {message}
                          </Typography>
                        ))}
                      </Box>
                    </Alert>
                  </Grid>
                )}

                {/* Configuration Summary */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'grey.300' }}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Configuration Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Inventory Type
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formik.values.inventoryType === 'weight' ? 'Weight-based' : 'Quantity-based'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Unit
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formik.values.inventoryUnit}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Current Stock
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formik.values.currentInventory} {formik.values.inventoryUnit}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Min. Threshold
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formik.values.minimumThreshold} {formik.values.inventoryUnit}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Color Selection Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom sx={{ color: 'primary.main' }}>
              Visual Appearance
            </Typography>
            
            {/* Predefined Colors */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Predefined Colors
              </Typography>
              <Grid container spacing={1}>
                {CATEGORY_GROUP_COLORS.map((color) => (
                  <Grid item key={color}>
                    <Paper
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: formik.values.color === color ? '3px solid #1976d2' : '1px solid #ddd',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleColorSelect(color)}
                    >
                      {formik.values.color === color && (
                        <Typography
                          sx={{
                            color: getContrastColor(color),
                            fontSize: '18px',
                            fontWeight: 'bold',
                          }}
                        >
                          ✓
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Custom Color */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Custom Color
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  label="Hex Color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  placeholder="#FF5722"
                  error={formik.touched.color && Boolean(formik.errors.color)}
                  helperText={formik.touched.color && formik.errors.color}
                  sx={{ minWidth: 120 }}
                />
                {customColor && customColor.match(/^#[0-9A-F]{6}$/i) && (
                  <Paper
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: customColor,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                    }}
                  />
                )}
              </Box>
            </Box>

          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formik.isValid}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              editingGroup ? 'Update Group' : 'Create Group'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryGroupFormWithInventory;