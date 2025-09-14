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
  Autocomplete, // Import Autocomplete
} from '@mui/material';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tag: z.string().optional(),
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
    control, // Get control from useForm
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues, // Use defaultValues directly
  });

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
              name="tag"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={existingTags}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tag"
                      fullWidth
                      error={!!errors.tag}
                      helperText={errors.tag?.message}
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
