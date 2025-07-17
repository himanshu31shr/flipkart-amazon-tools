import React, { useState, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { CategoryInventoryService } from '../../services/categoryInventory.service';
import { CostPriceResolutionService } from '../../services/costPrice.service';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../store/slices/categoriesSlice';
import {
  updateCategoryInventory,
  updateCategoryThreshold,
  fetchCategoriesWithInventory,
} from '../../store/slices/categoryInventorySlice';
import { CategoryWithInventory } from '../../types/categoryInventory.types';
import { DataTable, Column } from '../../components/DataTable/DataTable';
import { ProductSidesheet } from './ProductSidesheet';
import { CategoryForm } from './CategoryForm';
import CategoryInventoryEditModal from '../inventory/components/CategoryInventoryEditModal';
import { CostPriceUpdateModal } from './CostPriceUpdateModal';

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
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  LocalOffer as TagIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

interface UnifiedCategory extends CategoryWithInventory {
  tag?: string;
  costPrice: number | null;
  productsInheritingCost: number;
}

interface CategoryFormData {
  name: string;
  description?: string;
  tag?: string;
  costPrice?: number | null;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UnifiedCategoryTableProps {
  refreshTrigger?: number;
}

export const UnifiedCategoryTable: React.FC<UnifiedCategoryTableProps> = ({ refreshTrigger }) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const costPriceService = useMemo(() => new CostPriceResolutionService(), []);

  // Form and dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UnifiedCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<UnifiedCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<UnifiedCategory | null>(null);

  // Bulk operations states
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<(string | number)[]>([]);
  const [tagToApply, setTagToApply] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);

  // UI states
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [sidesheetOpen, setSidesheetOpen] = useState(false);
  const [categories, setCategories] = useState<UnifiedCategory[]>([]);
  
  // Cost price modal state
  const [costPriceModalOpen, setCostPriceModalOpen] = useState(false);
  const [selectedCategoryForCostPrice, setSelectedCategoryForCostPrice] = useState<UnifiedCategory | null>(null);
  const [isUpdatingCostPrice, setIsUpdatingCostPrice] = useState(false);

  // Derived states
  const existingTags = useMemo(() => {
    const tags = categories
      .map(category => category.tag)
      .filter(tag => tag !== undefined && tag !== '');
    return Array.from(new Set(tags));
  }, [categories]);

  // Stock status utilities
  const getStockStatus = (category: UnifiedCategory): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    const { totalQuantity, lowStockThreshold } = category.inventory;
    if (totalQuantity === 0) return 'out-of-stock';
    if (totalQuantity <= lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStatusLabel = (status: 'in-stock' | 'low-stock' | 'out-of-stock'): string => {
    switch (status) {
      case 'in-stock': return 'In Stock';
      case 'low-stock': return 'Low Stock';
      case 'out-of-stock': return 'Out of Stock';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: 'in-stock' | 'low-stock' | 'out-of-stock'): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'in-stock': return 'success';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'error';
      default: return 'default';
    }
  };

  // Utility function to format price in Rupees
  const formatRupeePrice = (price: number | null): string => {
    if (price === null) return '—';
    return `₹${price.toFixed(2)}`;
  };

  // Data loading
  useEffect(() => {
    const loadCategories = async () => {
      if (!isAuthenticated) return;
      try {
        const service = new CategoryInventoryService();
        const result = await service.getAllCategoriesWithInventory();
        
        // Load categories with cost price information
        const categoriesWithCost = await Promise.all(
          result
            .filter(cat => !!cat.id)
            .map(async cat => {
              const productsInheriting = await costPriceService.getProductsInheritingCost(cat.id!);
              const costPriceInfo = await costPriceService.getCategoryCostPrice(cat.id!);
              return {
                ...cat,
                id: String(cat.id),
                inventory: cat.inventory || { 
                  totalQuantity: 0,
                  lowStockThreshold: 0,
                  productCount: 0 
                },
                costPrice: costPriceInfo.value,
                productsInheritingCost: productsInheriting.length
              };
            })
        );

        setCategories(categoriesWithCost);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load categories',
          severity: 'error',
        });
      }
    };
    loadCategories();
  }, [isAuthenticated, costPriceService, refreshTrigger]);

  // Cost price handlers
  const handleCostPriceUpdate = async (newPrice: number | null) => {
    if (!selectedCategoryForCostPrice?.id) return;
    
    setIsUpdatingCostPrice(true);
    try {
      await costPriceService.updateCategoryCostPrice(selectedCategoryForCostPrice.id, newPrice);
      
      // Update the local state immediately
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === selectedCategoryForCostPrice.id 
            ? { ...cat, costPrice: newPrice }
            : cat
        )
      );

      setSnackbar({
        open: true,
        message: 'Cost price updated successfully',
        severity: 'success',
      });

      // Close the modal
      setCostPriceModalOpen(false);
      setSelectedCategoryForCostPrice(null);

      // Refresh the data in the background
      dispatch(fetchCategoriesWithInventory());
    } catch (error) {
      console.error('Failed to update cost price:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update cost price',
        severity: 'error',
      });
    } finally {
      setIsUpdatingCostPrice(false);
    }
  };

  // Handler for opening cost price modal
  const handleOpenCostPriceModal = (category: UnifiedCategory) => {
    setSelectedCategoryForCostPrice(category);
    setCostPriceModalOpen(true);
  };

  // Event handlers
  const handleFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory?.id) {
        const updateData = {
          id: editingCategory.id,
          name: data.name,
          description: data.description || '',
          tag: data.tag || '',
          costPrice: data.costPrice ?? null,
        };
        await dispatch(updateCategory(updateData)).unwrap();
        setSnackbar({
          open: true,
          message: 'Category updated successfully',
          severity: 'success',
        });
      } else {
        await dispatch(createCategory({
          ...data,
          costPrice: data.costPrice ?? null,
        })).unwrap();
        setSnackbar({
          open: true,
          message: 'Category created successfully',
          severity: 'success',
        });
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      dispatch(fetchCategoriesWithInventory());
    } catch {
      setSnackbar({
        open: true,
        message: 'An error occurred',
        severity: 'error',
      });
    }
    setIsSubmitting(false);
  };

  const handleSaveInventory = async (data: {
    categoryId: string;
    quantityAdjustment: number;
    newLowStockThreshold: number;
    reason: string;
    performedBy: string;
  }) => {
    try {
      if (data.quantityAdjustment !== 0) {
        await dispatch(updateCategoryInventory({
          categoryId: data.categoryId,
          quantity: data.quantityAdjustment,
          reason: data.reason,
          performedBy: data.performedBy,
        }));
      }
      
      if (data.newLowStockThreshold > 0) {
        await dispatch(updateCategoryThreshold({
          categoryId: data.categoryId,
          threshold: data.newLowStockThreshold,
        }));
      }
      
      setEditModalOpen(false);
      setSelectedCategory(null);
      dispatch(fetchCategoriesWithInventory());
      setSnackbar({
        open: true,
        message: 'Inventory updated successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to update inventory',
        severity: 'error',
      });
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
      dispatch(fetchCategoriesWithInventory());
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to delete category',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
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
      setSelectedCategoryIds(prev => prev.filter(id => !visibleIds.map(String).includes(String(id))));
    }
  };

  const handleBulkTagApply = async () => {
    if (!tagToApply || selectedCategoryIds.length === 0) return;
    setIsBulkTagging(true);
    try {
      await Promise.all(
        selectedCategoryIds.map(id =>
          dispatch(updateCategory({ id: String(id), tag: tagToApply })).unwrap()
        )
      );
      setSnackbar({
        open: true,
        message: `Tag applied to ${selectedCategoryIds.length} categories`,
        severity: 'success',
      });
      setTagToApply('');
      setSelectedCategoryIds([]);
      dispatch(fetchCategoriesWithInventory());
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to apply tags',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
      setIsBulkTagging(false);
    }
  };

  // Table columns configuration
  const columns: Column<UnifiedCategory>[] = [
    {
      id: 'name',
      label: 'Name',
      format: (_: unknown, row: UnifiedCategory | undefined) => row && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography>{row.name}</Typography>
          {row.tag && (
            <Chip
              label={row.tag}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20 }}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'description',
      label: 'Description',
      format: (_: unknown, row: UnifiedCategory | undefined) => row ? (row.description || '—') : '—',
    },
    {
      id: 'inventory',
      label: 'Stock Status',
      format: (_: unknown, row: UnifiedCategory | undefined) => row && (
        <Chip
          label={getStatusLabel(getStockStatus(row))}
          color={getStatusColor(getStockStatus(row))}
          size="small"
          sx={{ minWidth: 80 }}
        />
      ),
    },
    {
      id: 'inventory.totalQuantity',
      label: 'Total Quantity',
    },
    {
      id: 'inventory.lowStockThreshold',
      label: 'Low Stock Threshold',
    },
    {
      id: 'inventory.productCount',
      label: 'Product Count',
    },
    {
      id: 'costPrice',
      label: 'Cost Price (₹)',
      format: (_: unknown, row: UnifiedCategory | undefined) => row && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography>
            {row.costPrice === null ? '(Inherited)' : formatRupeePrice(row.costPrice)}
          </Typography>
          <Tooltip title="Update cost price">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCostPriceModal(row);
              }}
            >
              <MoneyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.productsInheritingCost > 0 && (
            <Tooltip title={`${row.productsInheritingCost} product(s) inherit this cost price`}>
              <Chip
                size="small"
                label={row.productsInheritingCost}
                color="info"
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      format: (_: unknown, row: UnifiedCategory | undefined) => row && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit category">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCategory(row);
                setIsFormOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete category">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setCategoryToDelete(row);
                setDeleteDialogOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit inventory">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCategory(row);
                setEditModalOpen(true);
              }}
            >
              <InventoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Bulk Actions and Controls */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingCategory(null);
            setIsFormOpen(true);
          }}
        >
          Add Category
        </Button>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => dispatch(fetchCategoriesWithInventory())}
        >
          Refresh
        </Button>

        {selectedCategoryIds.length > 0 && (
          <Box display="flex" gap={2} flex={1}>
            <Autocomplete
              freeSolo
              size="small"
              options={existingTags}
              value={tagToApply}
              onChange={(_, newValue) => setTagToApply(newValue || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tag to apply"
                  variant="outlined"
                  size="small"
                />
              )}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              startIcon={<TagIcon />}
              onClick={handleBulkTagApply}
              disabled={!tagToApply || isBulkTagging}
            >
              Apply Tag to Selected
            </Button>
          </Box>
        )}
      </Box>

      {/* DataTable */}
      <DataTable<UnifiedCategory>
        columns={columns}
        data={categories}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        onRowClick={(row) => {
          setSelectedCategory(row);
          setSidesheetOpen(true);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        defaultRowsPerPage={25}
        id="unified-category-table"
        enableSelection
        selected={selectedCategoryIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        getRowId={(row) => row.id}
      />

      {/* Category Form Dialog */}
      <CategoryForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editingCategory || undefined}
        existingTags={existingTags.filter((tag): tag is string => Boolean(tag))}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && handleCloseDeleteDialog()}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category &quot;{categoryToDelete?.name}&quot;?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => !isDeleting && handleCloseDeleteDialog()}
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
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inventory Edit Modal */}
      {editModalOpen && selectedCategory && (
        <CategoryInventoryEditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCategory(null);
          }}
          category={selectedCategory}
          onSave={handleSaveInventory}
        />
      )}

      {/* Product Sidesheet */}
      {selectedCategory && (
        <ProductSidesheet
          open={sidesheetOpen}
          onClose={() => {
            setSidesheetOpen(false);
            setSelectedCategory(null);
          }}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CostPriceUpdateModal
        open={costPriceModalOpen}
        onClose={() => {
          setCostPriceModalOpen(false);
          setSelectedCategoryForCostPrice(null);
        }}
        onSubmit={handleCostPriceUpdate}
        categoryName={selectedCategoryForCostPrice?.name || ''}
        currentPrice={selectedCategoryForCostPrice?.costPrice || null}
        productsInheritingCount={selectedCategoryForCostPrice?.productsInheritingCost || 0}
        isSubmitting={isUpdatingCostPrice}
      />
    </Box>
  );
};

export default UnifiedCategoryTable;