import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Divider,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { MobileModal } from '../../../../components/mobile/MobileModal';
import { Category } from '../../../../types/category';
import CategoryGroupSelector from '../../../categoryGroups/components/CategoryGroupSelector';
import CategoryLinkManager from '../../components/CategoryLinkManager';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tag: z.string().optional(),
  categoryGroupId: z.string().optional().nullable(),
  inventoryUnit: z.enum(['pcs', 'kg', 'g']).optional(),
  inventoryDeductionQuantity: z.number().min(0, 'Deduction quantity must be 0 or greater').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export interface MobileCategoryFormProps {
  /** Whether the modal is open */
  open: boolean;

  /** Callback when modal should be closed */
  onClose: () => void;

  /** Callback when form is submitted */
  onSubmit: (data: CategoryFormData) => Promise<void>;

  /** Default values for editing existing category */
  defaultValues?: Category;

  /** Whether the form is currently submitting */
  isSubmitting: boolean;

  /** Existing tags for autocomplete */
  existingTags: string[];
}

/**
 * Mobile-optimized category form component
 *
 * Features:
 * - Full-screen modal with AppBar header
 * - Touch-friendly 48px input heights
 * - Category group selector integration
 * - Inventory settings with unit selection
 * - Category link manager for cascade deductions
 * - Form validation with react-hook-form + zod
 * - Auto-save action in header
 * - Real-time inventory deduction examples
 *
 * @example
 * ```tsx
 * <MobileCategoryForm
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={handleSubmit}
 *   isSubmitting={false}
 *   existingTags={['tag1', 'tag2']}
 * />
 * ```
 */
export const MobileCategoryForm: React.FC<MobileCategoryFormProps> = ({
  open,
  onClose,
  onSubmit,
  defaultValues,
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

  // Watch inventory unit and deduction quantity for dynamic UI updates
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
    <MobileModal
      open={open}
      onClose={onClose}
      title={defaultValues?.id ? 'Edit Category' : 'New Category'}
      headerAction={{
        label: defaultValues?.id ? 'Update' : 'Create',
        onClick: handleSubmit(handleFormSubmit),
        disabled: isSubmitting,
        color: 'primary',
      }}
      disableBackdropClick={isSubmitting}
      disableEscapeKeyDown={isSubmitting}
    >
      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basic Information Section */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontSize: '18px', fontWeight: 600 }}>
            Basic Information
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              {...register('name')}
              label="Category Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isSubmitting}
              autoComplete="off"
              InputProps={{
                sx: { minHeight: 48 },
              }}
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
              autoComplete="off"
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
                      helperText={
                        errors.tag?.message ||
                        'Legacy tag field - consider using Category Groups instead'
                      }
                      disabled={isSubmitting}
                      InputProps={{
                        ...params.InputProps,
                        sx: { minHeight: 48 },
                      }}
                    />
                  )}
                  onChange={(event, newValue) => {
                    const sanitizedValue =
                      typeof newValue === 'string' ? newValue : newValue || '';
                    field.onChange(sanitizedValue);
                  }}
                  value={field.value || ''}
                  disabled={isSubmitting}
                />
              )}
            />
          </Box>
        </Box>

        <Divider />

        {/* Inventory Settings Section */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontSize: '18px', fontWeight: 600 }}>
            Inventory Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure how inventory is managed for products in this category
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="inventoryUnit"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.inventoryUnit}>
                  <InputLabel>Inventory Unit</InputLabel>
                  <Select
                    {...field}
                    label="Inventory Unit"
                    disabled={isSubmitting}
                    sx={{ minHeight: 48 }}
                  >
                    <MenuItem value="pcs" sx={{ minHeight: 48 }}>
                      Pieces (pcs)
                    </MenuItem>
                    <MenuItem value="kg" sx={{ minHeight: 48 }}>
                      Kilograms (kg)
                    </MenuItem>
                    <MenuItem value="g" sx={{ minHeight: 48 }}>
                      Grams (g)
                    </MenuItem>
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
              fullWidth
              error={!!errors.inventoryDeductionQuantity}
              helperText={
                errors.inventoryDeductionQuantity?.message ||
                `How much inventory to deduct when an order is placed for a product in this category`
              }
              disabled={isSubmitting}
              inputProps={{
                min: 0,
                step: inventoryUnit === 'pcs' ? 1 : 0.01,
              }}
              InputProps={{
                sx: { minHeight: 48 },
              }}
            />

            {/* Deduction Example Alert */}
            {inventoryDeductionQuantity && inventoryDeductionQuantity > 0 ? (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>Example:</strong> When an order is placed for a product in this
                  category, <strong>{inventoryDeductionQuantity} {inventoryUnit || 'pcs'}</strong>{' '}
                  will be automatically deducted from the associated category group&apos;s inventory.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>No automatic deduction:</strong> Orders for products in this category
                  will not automatically reduce category group inventory. You can manually adjust
                  inventory levels as needed.
                </Typography>
              </Alert>
            )}
          </Box>
        </Box>

        {/* Category Links Section - only show for existing categories */}
        {defaultValues?.id && (
          <>
            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontSize: '18px', fontWeight: 600 }}>
                Category Links & Cascade Deductions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure which categories should also have inventory deducted when orders are
                placed for products in this category
              </Typography>

              <CategoryLinkManager
                categoryId={defaultValues.id}
                categoryName={defaultValues.name}
                disabled={isSubmitting}
              />
            </Box>
          </>
        )}

        {/* Loading Overlay */}
        {isSubmitting && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </Box>
    </MobileModal>
  );
};

export default MobileCategoryForm;
