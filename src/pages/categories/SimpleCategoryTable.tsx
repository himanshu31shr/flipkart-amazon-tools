import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { CategoryService, Category } from '../../services/category.service';
import CategoryGroupSelector from '../categoryGroups/components/CategoryGroupSelector';
import { CategoryForm } from './CategoryForm';
import { DataTable, Column } from '../../components/DataTable/DataTable';

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

interface SimpleCategoryTableProps {
  refreshTrigger?: number;
  onDataChange?: () => void;
}

type CategoryTableData = Category & { 
  categoryGroup?: { id: string; name: string; color: string } 
};

const SimpleCategoryTable: React.FC<SimpleCategoryTableProps> = ({ 
  refreshTrigger = 0,
  onDataChange 
}) => {
  const [categories, setCategories] = useState<CategoryTableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [groupAssignmentOpen, setGroupAssignmentOpen] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<(string | number)[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [bulkGroupAssignmentOpen, setBulkGroupAssignmentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const categoryService = new CategoryService();

  // Define DataTable columns
  const columns: Column<CategoryTableData>[] = [
    {
      id: 'name',
      label: 'Name',
      filter: true,
      priorityOnMobile: true,
      format: (value) => (
        <Typography variant="body2" fontWeight="medium">
          {String(value)}
        </Typography>
      )
    },
    {
      id: 'categoryGroup',
      label: 'Category Group',
      filter: true,
      filterValue: (row) => row.categoryGroup?.name || 'Unassigned',
      format: (value, row) => {
        if (row?.categoryGroup) {
          return (
            <Chip
              label={row.categoryGroup.name}
              size="small"
              sx={{
                backgroundColor: row.categoryGroup.color,
                color: getContrastColor(row.categoryGroup.color),
                fontWeight: 'medium',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setGroupAssignmentOpen(row.id!);
              }}
            />
          );
        } else {
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<GroupIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setGroupAssignmentOpen(row!.id!);
              }}
              sx={{ minWidth: 120 }}
            >
              Assign Group
            </Button>
          );
        }
      }
    },
    {
      id: 'tag',
      label: 'Tag (Legacy)',
      filter: true,
      format: (value) => 
        value ? (
          <Chip label={String(value)} size="small" color="default" />
        ) : (
          <Typography variant="body2" color="text.secondary">-</Typography>
        )
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center' as const,
      format: (_, row) => (
        <Box>
          <Tooltip title="Edit category">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog(row!);
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
                handleDelete(row!.id!);
              }}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const categoriesData = await categoryService.getCategoriesWithGroups();
      setCategories(categoriesData);
      
      // Extract existing tags for CategoryForm
      const tags = categoriesData
        .map(cat => cat.tag)
        .filter((tag): tag is string => Boolean(tag))
        .filter((tag, index, array) => array.indexOf(tag) === index); // unique tags
      setExistingTags(tags);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshTrigger]);

  const handleOpenDialog = (category?: Category) => {
    setEditingCategory(category || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleFormSubmit = async (formData: {
    name: string;
    description?: string;
    tag?: string;
    categoryGroupId?: string | null;
    inventoryUnit?: 'kg' | 'g' | 'pcs';
    inventoryDeductionQuantity?: number;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingCategory?.id) {
        const updateData = {
          ...formData,
          categoryGroupId: formData.categoryGroupId === null ? undefined : formData.categoryGroupId,
        };
        await categoryService.updateCategory(editingCategory.id!, updateData);
      } else {
        // Ensure we have the required fields for createCategory
        const categoryData = {
          name: formData.name,
          description: formData.description || '',
          tag: formData.tag || '',
          categoryGroupId: formData.categoryGroupId === null ? undefined : formData.categoryGroupId,
          inventoryUnit: formData.inventoryUnit,
          inventoryDeductionQuantity: formData.inventoryDeductionQuantity,
        };
        await categoryService.createCategory(categoryData);
      }

      handleCloseDialog();
      await fetchCategories();
      onDataChange?.();
    } catch (error) {
      console.error('Error saving category:', error);
      throw error; // Let CategoryForm handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryService.deleteCategory(categoryId);
        await fetchCategories();
        onDataChange?.();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleSelectAll = (checked: boolean, visibleIds: (string | number)[]) => {
    if (checked) {
      setSelectedCategories(visibleIds);
    } else {
      setSelectedCategories([]);
    }
  };

  const handleSelectCategory = (categoryId: string | number, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  const handleBulkGroupAssignment = async (groupId: string | null) => {
    try {
      await categoryService.assignMultipleCategoriesToGroup(
        selectedCategories.map(id => String(id)), 
        groupId
      );
      await fetchCategories();
      onDataChange?.();
      setSelectedCategories([]);
      setBulkGroupAssignmentOpen(false);
      setBulkMenuAnchor(null);
    } catch (error) {
      console.error('Error assigning groups:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h2">
            Categories ({categories.length})
          </Typography>
          {selectedCategories.length > 0 && (
            <Typography variant="body2" color="primary">
              {selectedCategories.length} selected
            </Typography>
          )}
        </Box>
        <Box>
          {selectedCategories.length > 0 && (
            <Button
              variant="outlined"
              onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
              startIcon={<AssignmentIcon />}
              sx={{ mr: 1 }}
            >
              Bulk Actions
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={fetchCategories}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => handleOpenDialog()}
            startIcon={<AddIcon />}
          >
            Add Category
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          defaultSortColumn="name"
          defaultSortDirection="asc"
          enableSelection={true}
          selected={selectedCategories}
          onSelect={handleSelectCategory}
          onSelectAll={handleSelectAll}
          getRowId={(row) => row.id!}
          rowsPerPageOptions={[10, 25, 50]}
          defaultRowsPerPage={25}
        />
      )}

      {/* Enhanced Category Form */}
      <CategoryForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        defaultValues={editingCategory ? {
          id: editingCategory.id,
          name: editingCategory.name,
          description: editingCategory.description,
          tag: editingCategory.tag,
          categoryGroupId: editingCategory.categoryGroupId,
          inventoryUnit: editingCategory.inventoryUnit,
          inventoryDeductionQuantity: editingCategory.inventoryDeductionQuantity,
        } : undefined}
        isSubmitting={isSubmitting}
        existingTags={existingTags}
      />

      {/* Group Assignment Dialog */}
      <Dialog 
        open={!!groupAssignmentOpen} 
        onClose={() => setGroupAssignmentOpen(null)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Assign Category Group
        </DialogTitle>
        <DialogContent>
          <CategoryGroupSelector
            value={null}
            onChange={async (groupId) => {
              if (groupAssignmentOpen) {
                try {
                  await categoryService.assignCategoryToGroup(groupAssignmentOpen, groupId);
                  await fetchCategories();
                  onDataChange?.();
                  setGroupAssignmentOpen(null);
                } catch (error) {
                  console.error('Error assigning group:', error);
                }
              }
            }}
            label="Select Category Group"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupAssignmentOpen(null)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkMenuAnchor}
        open={Boolean(bulkMenuAnchor)}
        onClose={() => setBulkMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setBulkGroupAssignmentOpen(true);
          setBulkMenuAnchor(null);
        }}>
          <GroupIcon sx={{ mr: 1 }} />
          Assign to Group
        </MenuItem>
      </Menu>

      {/* Bulk Group Assignment Dialog */}
      <Dialog 
        open={bulkGroupAssignmentOpen} 
        onClose={() => setBulkGroupAssignmentOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Assign {selectedCategories.length} Categories to Group
        </DialogTitle>
        <DialogContent>
          <CategoryGroupSelector
            value={null}
            onChange={handleBulkGroupAssignment}
            label="Select Category Group"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkGroupAssignmentOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimpleCategoryTable;