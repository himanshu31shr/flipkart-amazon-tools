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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import CategoryGroupSelector from '../categoryGroups/components/CategoryGroupSelector';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tag: z.string().optional(),
  categoryGroupId: z.string().optional().nullable(),
  inventoryType: z.enum(['weight', 'qty']).optional(),
  inventoryUnit: z.enum(['kg', 'g', 'pcs']).optional(),
  unitConversionRate: z.number().positive().optional(),
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
      inventoryType: 'qty',
      inventoryUnit: 'pcs',
      ...defaultValues,
    },
  });

  // Watch inventory type to show appropriate units
  const inventoryType = watch('inventoryType');

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
                Inventory Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure how inventory is tracked for products in this category
              </Typography>
              
              <Stack spacing={3}>
                <Controller
                  name="inventoryType"
                  control={control}
                  render={({ field }) => (
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Inventory Type</FormLabel>
                      <RadioGroup
                        row
                        {...field}
                        aria-labelledby="inventory-type-label"
                      >
                        <FormControlLabel
                          value="qty"
                          control={<Radio />}
                          label="Quantity (pieces)"
                          disabled={isSubmitting}
                        />
                        <FormControlLabel
                          value="weight"
                          control={<Radio />}
                          label="Weight (kg/g)"
                          disabled={isSubmitting}
                        />
                      </RadioGroup>
                    </FormControl>
                  )}
                />

                <Controller
                  name="inventoryUnit"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Inventory Unit</InputLabel>
                      <Select
                        {...field}
                        label="Inventory Unit"
                        disabled={isSubmitting}
                        error={!!errors.inventoryUnit}
                      >
                        {inventoryType === 'weight' ? (
                          <>
                            <MenuItem value="kg">Kilograms (kg)</MenuItem>
                            <MenuItem value="g">Grams (g)</MenuItem>
                          </>
                        ) : (
                          <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                        )}
                      </Select>
                      {errors.inventoryUnit && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {errors.inventoryUnit.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                {inventoryType === 'weight' && (
                  <TextField
                    {...register('unitConversionRate', { valueAsNumber: true })}
                    label="Unit Conversion Rate"
                    type="number"
                    fullWidth
                    error={!!errors.unitConversionRate}
                    helperText={
                      errors.unitConversionRate?.message || 
                      'Conversion rate to base unit (e.g., 1000 for g to kg conversion)'
                    }
                    disabled={isSubmitting}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                )}
              </Stack>
            </Box>
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
