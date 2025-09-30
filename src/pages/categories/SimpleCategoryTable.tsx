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
import LinkIcon from '@mui/icons-material/Link';
import { CategoryService, Category } from '../../services/category.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import CategoryGroupSelector from '../categoryGroups/components/CategoryGroupSelector';
import { CategoryForm } from './CategoryForm';
import { DataTable, Column } from '../../components/DataTable/DataTable';
import CategoryLinkManager from './components/CategoryLinkManager';

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
  const [linkDialogOpen, setLinkDialogOpen] = useState<string | null>(null);
  const [bulkLinkDialogOpen, setBulkLinkDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const categoryService = new CategoryService();
  const categoryGroupService = new CategoryGroupService();

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
      id: 'inventoryInfo',
      label: 'Unit & Deduction',
      filter: true,
      filterValue: (row) => {
        if (!row?.inventoryUnit && !row?.inventoryDeductionQuantity) return 'Not Set';
        if (row.inventoryUnit && row.inventoryDeductionQuantity) return 'Configured';
        return 'Partial';
      },
      format: (value, row) => {
        const unit = row?.inventoryUnit || 'pcs';
        const deduction = row?.inventoryDeductionQuantity;
        
        if (!deduction || deduction === 0) {
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Unit: {unit}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No auto-deduction
              </Typography>
            </Box>
          );
        }
        
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" fontWeight="medium">
              Unit: {unit}
            </Typography>
            <Typography variant="body2" color="primary.main">
              Deducts: {deduction} {unit}/order
            </Typography>
          </Box>
        );
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center' as const,
      format: (_, row) => (
        <Box>
          <Tooltip title="Manage category links">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setLinkDialogOpen(row!.id!);
              }}
              color="primary"
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
        // Update existing category
        const updateData = {
          ...formData,
          categoryGroupId: formData.categoryGroupId === null ? undefined : formData.categoryGroupId,
        };
        await categoryService.updateCategory(editingCategory.id!, updateData);
        
        // Get current category data including categoryGroup
        const currentCategory = categories.find(cat => cat.id === editingCategory.id);
        
        // If categoryGroupId changed, get the new group details first
        let groupDetails = currentCategory?.categoryGroup;
        if (updateData.categoryGroupId !== editingCategory.categoryGroupId) {
          if (updateData.categoryGroupId) {
            const group = await categoryGroupService.getCategoryGroup(updateData.categoryGroupId);
            groupDetails = group ? {
              id: group.id!,
              name: group.name,
              color: group.color
            } : undefined;
          } else {
            groupDetails = undefined;
          }
        }
        
        // Optimistically update the local state instead of full refresh
        setCategories(prevCategories => 
          prevCategories.map(cat => 
            cat.id === editingCategory.id 
              ? { 
                  ...cat, 
                  ...updateData,
                  categoryGroup: groupDetails,
                  updatedAt: new Date()
                }
              : cat
          )
        );
      } else {
        // Create new category - need to fetch to get server-generated ID
        const categoryData = {
          name: formData.name,
          description: formData.description || '',
          tag: formData.tag || '',
          categoryGroupId: formData.categoryGroupId === null ? undefined : formData.categoryGroupId,
          inventoryUnit: formData.inventoryUnit,
          inventoryDeductionQuantity: formData.inventoryDeductionQuantity,
        };
        await categoryService.createCategory(categoryData);
        
        // Only refresh data for new category creation to get the server-generated ID
        await fetchCategories();
        onDataChange?.(); // Only call onDataChange when we actually fetch new data
      }

      handleCloseDialog();
      // Don't call onDataChange for optimistic updates - it triggers unnecessary refresh
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
        
        // Optimistically remove the category from local state
        setCategories(prevCategories => 
          prevCategories.filter(cat => cat.id !== categoryId)
        );
        
        // Also remove from selected categories if it was selected
        setSelectedCategories(prev => prev.filter(id => id !== categoryId));
        
        // Don't call onDataChange for optimistic updates - it triggers unnecessary refresh
      } catch (error) {
        console.error('Error deleting category:', error);
        // On error, refresh data to ensure consistency
        await fetchCategories();
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
      
      // Get the group details for optimistic update
      let groupDetails = null;
      if (groupId) {
        groupDetails = await categoryGroupService.getCategoryGroup(groupId);
      }
      
      // Optimistically update local state
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          selectedCategories.includes(cat.id!)
            ? {
                ...cat,
                categoryGroupId: groupId || undefined, // Convert null to undefined
                categoryGroup: groupDetails ? {
                  id: groupDetails.id!,
                  name: groupDetails.name,
                  color: groupDetails.color
                } : undefined
              }
            : cat
        )
      );
      
      // Don't call onDataChange for optimistic updates - it triggers unnecessary refresh
      setSelectedCategories([]);
      setBulkGroupAssignmentOpen(false);
      setBulkMenuAnchor(null);
    } catch (error) {
      console.error('Error assigning groups:', error);
      // On error, refresh data to ensure consistency
      await fetchCategories();
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
                  
                  // Get the group details for optimistic update
                  let groupDetails = null;
                  if (groupId) {
                    groupDetails = await categoryGroupService.getCategoryGroup(groupId);
                  }
                  
                  // Optimistically update local state
                  setCategories(prevCategories => 
                    prevCategories.map(cat => 
                      cat.id === groupAssignmentOpen
                        ? {
                            ...cat,
                            categoryGroupId: groupId || undefined, // Convert null to undefined
                            categoryGroup: groupDetails ? {
                              id: groupDetails.id!,
                              name: groupDetails.name,
                              color: groupDetails.color
                            } : undefined
                          }
                        : cat
                    )
                  );
                  
                  // Don't call onDataChange for optimistic updates - it triggers unnecessary refresh
                  setGroupAssignmentOpen(null);
                } catch (error) {
                  console.error('Error assigning group:', error);
                  // On error, refresh data to ensure consistency
                  await fetchCategories();
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
        <MenuItem onClick={() => {
          setBulkLinkDialogOpen(true);
          setBulkMenuAnchor(null);
        }}>
          <LinkIcon sx={{ mr: 1 }} />
          Manage Links
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

      {/* Category Link Management Dialog */}
      <Dialog 
        open={!!linkDialogOpen} 
        onClose={() => setLinkDialogOpen(null)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Manage Category Links - {categories.find(c => c.id === linkDialogOpen)?.name}
        </DialogTitle>
        <DialogContent>
          {linkDialogOpen && (
            <CategoryLinkManager
              categoryId={linkDialogOpen}
              categoryName={categories.find(c => c.id === linkDialogOpen)?.name}
              onLinksChanged={() => {
                // For link changes, we could implement optimistic updates here too,
                // but given the complexity of link data and the fact that CategoryLinkManager
                // handles its own state, we'll just refresh the categories data.
                // This is less disruptive than a full page refresh.
                fetchCategories();
                onDataChange?.();
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Link Management Dialog */}
      <Dialog 
        open={bulkLinkDialogOpen} 
        onClose={() => setBulkLinkDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Bulk Link Management ({selectedCategories.length} categories selected)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage links for multiple categories. Changes will be applied to all selected categories.
            </Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>Selected Categories:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {selectedCategories.map((id) => {
                const category = categories.find(c => c.id === id);
                return (
                  <Chip 
                    key={id} 
                    label={category?.name || 'Unknown'} 
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Box>
            
            {selectedCategories.length > 0 && (
              <Box>
                {selectedCategories.map((id) => {
                  const category = categories.find(c => c.id === id);
                  if (!category) return null;
                  
                  return (
                    <Box key={id} sx={{ mb: 4, p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                        {category.name}
                      </Typography>
                      <CategoryLinkManager
                        categoryId={String(id)}
                        categoryName={category.name}
                        onLinksChanged={() => {
                          // For link changes, refresh categories data but preserve table state
                          fetchCategories();
                          onDataChange?.();
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkLinkDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimpleCategoryTable;