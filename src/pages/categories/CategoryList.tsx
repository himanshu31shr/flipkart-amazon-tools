import React, { useState, useMemo, useEffect, ReactElement } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { CategoryInventoryService } from '../../services/categoryInventory.service';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import { 
  createCategory, 
  updateCategory, 
  deleteCategory,
} from '../../store/slices/categoriesSlice';
import { Timestamp } from 'firebase/firestore';
import { DataTable, Column } from '../../components/DataTable/DataTable';
import { ProductSidesheet } from './ProductSidesheet';
import { CategoryForm } from './CategoryForm';

import {
  Box,
  Button,
  IconButton,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  TextField,
  Autocomplete,
  Paper,
  Fade,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

type CategoryFormData = {
  name: string;
  description?: string;
  tag?: string;
  costPrice?: number | null;
}

type CategoryListProps = Record<string, never>;

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface Category {
  id: string;
  name: string;
  description?: string;
  tag?: string;
  costPrice?: number | null;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  inventory: { productCount: number };
}

const CategoryList: React.FC<CategoryListProps> = (): ReactElement => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [categoriesWithInventory, setCategoriesWithInventory] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [tagToApply, setTagToApply] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [sidesheetOpen, setSidesheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const existingTags = useMemo(() => {
    const tags = categoriesWithInventory
      .map(category => category.tag)
      .filter(tag => tag !== undefined && tag !== '');
    return Array.from(new Set(tags as string[]));
  }, [categoriesWithInventory]);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const service = new CategoryInventoryService();
        const result = (await service.getAllCategoriesWithInventory()) || [];
        setCategoriesWithInventory(
          result
            .filter(cat => !!cat.id)
            .map(cat => ({
              ...cat,
              id: String(cat.id),
              costPrice: cat.costPrice ?? null,
              inventory: cat.inventory || { productCount: 0 },
            }) as Category)
        );
      } catch (error) {
        console.error('Error loading categories:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load categories',
          severity: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, [isAuthenticated]);

  const handleFormSubmit = async (data: CategoryFormData) => {
    try {
      const categoryData = {
        name: data.name,
        description: data.description || '',
        tag: data.tag || '',
        costPrice: data.costPrice ?? null
      };
      
      if (editingCategory?.id) {
        await dispatch(updateCategory({ id: editingCategory.id, ...categoryData })).unwrap();
        setSnackbar({
          open: true,
          message: 'Category updated successfully',
          severity: 'success',
        });
      } else {
        await dispatch(createCategory(categoryData)).unwrap();
        setSnackbar({
          open: true,
          message: 'Category created successfully',
          severity: 'success',
        });
      }
      setIsFormOpen(false);
      setEditingCategory(null);
    } catch {
      setSnackbar({
        open: true,
        message: 'An error occurred',
        severity: 'error',
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleEditClick = (category: Category) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (category: Category) => (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (category.id) {
      setCategoryToDelete(category);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete?.id) return;
    
    setIsDeleting(true);
    try {
      await dispatch(deleteCategory(categoryToDelete.id)).unwrap();
      setSnackbar({
        open: true,
        message: 'Category deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete category',
        severity: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleSelect = (id: string | number, checked: boolean) => {
    setSelectedCategoryIds(prev => {
      const strId = String(id);
      if (checked) return [...prev, strId];
      return prev.filter(cid => cid !== strId);
    });
  };

  const handleSelectAll = (checked: boolean, visibleIds: (string | number)[]) => {
    if (checked) {
      setSelectedCategoryIds(prev => Array.from(new Set([...prev, ...visibleIds.map(String)])));
    } else {
      setSelectedCategoryIds(prev => prev.filter(id => !visibleIds.map(String).includes(id)));
    }
  };

  const handleBulkTagApply = async () => {
    if (!tagToApply || selectedCategoryIds.length === 0) return;
    setIsBulkTagging(true);
    try {
      await Promise.all(
        selectedCategoryIds.map(id =>
          dispatch(updateCategory({ id, tag: tagToApply })).unwrap()
        )
      );
      setSnackbar({
        open: true,
        message: `Tag applied to ${selectedCategoryIds.length} categories`,
        severity: 'success',
      });
      setTagToApply('');
      setSelectedCategoryIds([]);
      // Refresh categories
      const service = new CategoryInventoryService();
      const result = await service.getAllCategoriesWithInventory();
      setCategoriesWithInventory(
        result
          .filter(cat => !!cat.id)
          .map(cat => ({
            ...cat,
            id: String(cat.id),
            costPrice: cat.costPrice ?? null,
            inventory: cat.inventory || { productCount: 0 },
          }) as Category)
      );
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to apply tag to all selected categories',
        severity: 'error',
      });
    } finally {
      setIsBulkTagging(false);
    }
  };

  const handleRowClick = (category: Category) => {
    setSelectedCategory(category);
    setSidesheetOpen(true);
  };

  const columns: Column<Category>[] = [
    { id: 'id', label: 'ID', filter: true },
    { id: 'name', label: 'Name', filter: true },
    { id: 'tag', label: 'Tag', filter: true },
    { id: 'productCount', label: 'Product Count', filter: false, format: (v, row) => row?.inventory?.productCount ?? 0 },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center',
      format: (_, row) => {
        if (!row) return null;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleEditClick(row)}
              aria-label="edit"
              disabled={isDeleting}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDeleteClick(row)}
              aria-label="delete"
              disabled={isDeleting}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (isDeleting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Category Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
          disabled={isDeleting}
          sx={{ px: 3, py: 1 }}
        >
          Add Category
        </Button>
      </Box>

      {/* Bulk Tag Application - Inline */}
      <Fade in={selectedCategoryIds.length > 0}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
              {selectedCategoryIds.length} categories selected
            </Typography>
            <Autocomplete
              freeSolo
              options={existingTags}
              value={tagToApply}
              onInputChange={(event, newValue) => setTagToApply(newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Apply Tag"
                  size="small"
                  sx={{ minWidth: 200 }}
                  disabled={isBulkTagging}
                />
              )}
              sx={{ flex: 1, maxWidth: 300 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleBulkTagApply}
              disabled={!tagToApply || isBulkTagging || selectedCategoryIds.length === 0}
              sx={{ px: 3 }}
            >
              {isBulkTagging ? 'Applying...' : 'Apply Tag'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setSelectedCategoryIds([]);
                setTagToApply('');
              }}
              disabled={isBulkTagging}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Data Table */}
      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={categoriesWithInventory}
          defaultSortColumn="name"
          defaultSortDirection="asc"
          rowsPerPageOptions={[10, 25, 50]}
          defaultRowsPerPage={10}
          enableSelection
          selected={selectedCategoryIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          getRowId={row => row.id}
          onRowClick={handleRowClick}
        />
      </Paper>

      {/* Forms and Dialogs */}
      <CategoryForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        defaultValues={editingCategory || undefined}
        isSubmitting={isDeleting}
        existingTags={existingTags}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this category? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDeleteDialog} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ProductSidesheet
        open={sidesheetOpen}
        onClose={() => setSidesheetOpen(false)}
        categoryId={selectedCategory?.id || null}
        categoryName={selectedCategory?.name || ''}
      />
    </Box>
  );
};

export default CategoryList;
