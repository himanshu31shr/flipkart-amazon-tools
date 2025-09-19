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
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createCategoryGroup,
  updateCategoryGroup,
  selectCategoryGroupsLoading,
  selectCategoryGroupsError,
} from '../../store/slices/categoryGroupsSlice';
import { 
  CategoryGroupFormData, 
  CategoryGroupWithStats,
  CATEGORY_GROUP_COLORS 
} from '../../types/categoryGroup';

interface CategoryGroupFormProps {
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
});

const CategoryGroupForm: React.FC<CategoryGroupFormProps> = ({
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

          <Box sx={{ mb: 3 }}>
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

          {/* Color Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Select Color
            </Typography>
            
            {/* Predefined Colors */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
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
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
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

            {/* Color Preview */}
            {formik.values.color && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Preview
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: formik.values.color,
                    color: getContrastColor(formik.values.color),
                    borderRadius: 2,
                    maxWidth: 200,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formik.values.name || 'Sample Group'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {formik.values.description || 'Group description'}
                  </Typography>
                </Paper>
              </Box>
            )}
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

export default CategoryGroupForm;