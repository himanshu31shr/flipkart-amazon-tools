import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Define a simplified Category interface for the form, aligning with service model
interface Category {
  id?: string;
  name: string;
  description?: string;
  tag?: string;
  categoryGroupId?: string;
  inventoryType?: 'weight' | 'qty';
  inventoryUnit?: 'kg' | 'g' | 'pcs';
  unitConversionRate?: number;
  inventoryDeductionQuantity?: number; // Quantity to deduct per product order
  createdAt?: Timestamp | Date | string; // Use more specific types
  updatedAt?: Timestamp | Date | string; // Use more specific types
}

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Autocomplete,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import CategoryGroupSelector from '../categoryGroups/components/CategoryGroupSelector';
import CategoryLinkManager from './components/CategoryLinkManager';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tag: z.string().optional(),
  categoryGroupId: z.string().optional().nullable(),
  inventoryUnit: z.enum(['pcs', 'kg', 'g']).optional(),
  inventoryDeductionQuantity: z.number().min(0, 'Deduction quantity must be 0 or greater').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  // Align defaultValues type with the expected structure
  defaultValues?: Category; 
  isSubmitting: boolean;
  existingTags: string[]; // Add the existingTags prop
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  open,
  onClose,
  onSubmit,
  defaultValues, // No longer asserting 'as any'
  isSubmitting,
  existingTags,
}) => {

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      inventoryUnit: 'pcs',
      ...defaultValues,
    },
  });

  // Watch inventory unit and deduction quantity to show appropriate labels and examples
  const inventoryUnit = watch('inventoryUnit');
  const inventoryDeductionQuantity = watch('inventoryDeductionQuantity');

  const handleFormSubmit = async (data: CategoryFormData) => {
    await onSubmit(data);
  };

  // Reset form when defaultValues or open state changes
  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, open, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {defaultValues?.id ? 'Edit Category' : 'Add New Category'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              {...register('name')}
              label="Category Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isSubmitting}
            />
            <TextField
              {...register('description')}
              label="Description"
              fullWidth
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
              disabled={isSubmitting}
            />
            <Controller
              name="categoryGroupId"
              control={control}
              render={({ field }) => (
                <CategoryGroupSelector
                  value={field.value}
                  onChange={(groupId) => field.onChange(groupId)}
                  error={!!errors.categoryGroupId}
                  helperText={errors.categoryGroupId?.message}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name="tag"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={existingTags}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tag (Legacy)"
                      fullWidth
                      error={!!errors.tag}
                      helperText={errors.tag?.message || 'Legacy tag field - consider using Category Groups instead'}
                      disabled={isSubmitting}
                    />
                  )}
                  onChange={(event, newValue) => {
                    // Ensure we always pass a string or null to Firestore
                    const sanitizedValue = typeof newValue === 'string' ? newValue : (newValue || '');
                    field.onChange(sanitizedValue);
                  }}
                  value={field.value || ''}
                />
              )}
            />

            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Category Inventory Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure how inventory is managed for products in this category
              </Typography>
              
              <Stack spacing={3}>
                <Controller
                  name="inventoryUnit"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth sx={{ maxWidth: 300 }}>
                      <InputLabel>Inventory Unit</InputLabel>
                      <Select
                        {...field}
                        label="Inventory Unit"
                        disabled={isSubmitting}
                        error={!!errors.inventoryUnit}
                      >
                        <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                        <MenuItem value="kg">Kilograms (kg)</MenuItem>
                        <MenuItem value="g">Grams (g)</MenuItem>
                      </Select>
                      {errors.inventoryUnit && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {errors.inventoryUnit.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                <TextField
                  {...register('inventoryDeductionQuantity', { valueAsNumber: true })}
                  label={`Deduction Quantity per Order (${inventoryUnit || 'pcs'})`}
                  type="number"
                  error={!!errors.inventoryDeductionQuantity}
                  helperText={
                    errors.inventoryDeductionQuantity?.message || 
                    `How much inventory to deduct from the category group when an order is placed for a product in this category`
                  }
                  disabled={isSubmitting}
                  inputProps={{ 
                    min: 0, 
                    step: inventoryUnit === 'pcs' ? 1 : 0.01 
                  }}
                  sx={{ maxWidth: 400 }}
                />

                {inventoryDeductionQuantity && inventoryDeductionQuantity > 0 && (
                  <Alert severity="success" sx={{ maxWidth: 500 }}>
                    <Typography variant="body2">
                      <strong>Example:</strong> When an order is placed for a product in this category, 
                      <strong> {inventoryDeductionQuantity} {inventoryUnit || 'pcs'}</strong> will be 
                      automatically deducted from the associated category group&apos;s inventory.
                    </Typography>
                  </Alert>
                )}

                {(!inventoryDeductionQuantity || inventoryDeductionQuantity === 0) && (
                  <Alert severity="info" sx={{ maxWidth: 500 }}>
                    <Typography variant="body2">
                      <strong>No automatic deduction:</strong> Orders for products in this category will not 
                      automatically reduce category group inventory. You can manually adjust inventory levels as needed.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Box>

            {/* Category Links Section - only show for existing categories */}
            {defaultValues?.id && (
              <>
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Category Links & Cascade Deductions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Configure which categories should also have inventory deducted when orders are placed for products in this category
                  </Typography>
                  
                  <CategoryLinkManager
                    categoryId={defaultValues.id}
                    categoryName={defaultValues.name}
                    disabled={isSubmitting}
                  />
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {defaultValues?.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
