import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Checkbox,
  Menu,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { CategoryService, Category } from '../../services/category.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import CategoryGroupSelector from '../categoryGroups/components/CategoryGroupSelector';
import { CategoryForm } from './CategoryForm';

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

const SimpleCategoryTable: React.FC<SimpleCategoryTableProps> = ({ 
  refreshTrigger = 0,
  onDataChange 
}) => {
  const [categories, setCategories] = useState<Array<Category & { categoryGroup?: { id: string; name: string; color: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [groupAssignmentOpen, setGroupAssignmentOpen] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [bulkGroupAssignmentOpen, setBulkGroupAssignmentOpen] = useState(false);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | 'all' | 'assigned' | 'unassigned'>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const categoryService = new CategoryService();
  const categoryGroupService = new CategoryGroupService();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [categoriesData, groupsData] = await Promise.all([
        categoryService.getCategoriesWithGroups(),
        categoryGroupService.getCategoryGroups()
      ]);
      setCategories(categoriesData);
      setAvailableGroups(groupsData.filter(group => group.id) as Array<{ id: string; name: string; color: string }>);
      
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(filteredCategories.map(cat => cat.id!));
    } else {
      setSelectedCategories([]);
    }
  };

  const handleSelectCategory = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  const handleBulkGroupAssignment = async (groupId: string | null) => {
    try {
      await categoryService.assignMultipleCategoriesToGroup(selectedCategories, groupId);
      await fetchCategories();
      onDataChange?.();
      setSelectedCategories([]);
      setBulkGroupAssignmentOpen(false);
      setBulkMenuAnchor(null);
    } catch (error) {
      console.error('Error assigning groups:', error);
    }
  };

  // Filter and search logic
  const filteredCategories = React.useMemo(() => {
    return categories.filter(category => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = category.name.toLowerCase().includes(searchLower);
        const matchesDescription = category.description?.toLowerCase().includes(searchLower) || false;
        const matchesTag = category.tag?.toLowerCase().includes(searchLower) || false;
        const matchesGroup = category.categoryGroup?.name.toLowerCase().includes(searchLower) || false;
        
        if (!matchesName && !matchesDescription && !matchesTag && !matchesGroup) {
          return false;
        }
      }
      
      // Group filter
      if (groupFilter !== 'all') {
        if (groupFilter === 'assigned') {
          return !!category.categoryGroup;
        } else if (groupFilter === 'unassigned') {
          return !category.categoryGroup;
        } else {
          // Specific group ID
          return category.categoryGroup?.id === groupFilter;
        }
      }
      
      return true;
    });
  }, [categories, searchTerm, groupFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setGroupFilter('all');
    setSelectedCategories([]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" component="h2">
            Categories ({filteredCategories.length} of {categories.length})
          </Typography>
          {selectedCategories.length > 0 && (
            <Typography variant="body2" color="primary">
              {selectedCategories.length} selected
            </Typography>
          )}
          {(searchTerm || groupFilter !== 'all') && (
            <Typography variant="body2" color="text.secondary">
              Filters active
            </Typography>
          )}
        </Box>
        <Box>
          <Button
            variant="outlined"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            startIcon={<FilterListIcon />}
            sx={{ mr: 1 }}
          >
            Filters
          </Button>
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

      {/* Filters Section */}
      <Collapse in={filtersExpanded}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Search categories"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by name, description, tag, or group..."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Group</InputLabel>
                <Select
                  value={groupFilter}
                  label="Filter by Group"
                  onChange={(e) => setGroupFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="assigned">With Groups</MenuItem>
                  <MenuItem value="unassigned">Without Groups</MenuItem>
                  {availableGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={group.name}
                          size="small"
                          sx={{
                            backgroundColor: group.color,
                            color: getContrastColor(group.color),
                            fontWeight: 'medium',
                          }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
                disabled={!searchTerm && groupFilter === 'all'}
              >
                Clear All
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedCategories.length > 0 && selectedCategories.length < filteredCategories.length}
                  checked={filteredCategories.length > 0 && selectedCategories.length === filteredCategories.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category Group</TableCell>
              <TableCell>Tag (Legacy)</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {categories.length === 0 ? 'No categories found' : 'No categories match the current filters'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedCategories.includes(category.id!)}
                      onChange={(e) => handleSelectCategory(category.id!, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {category.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {category.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {category.categoryGroup ? (
                      <Chip
                        label={category.categoryGroup.name}
                        size="small"
                        sx={{
                          backgroundColor: category.categoryGroup.color,
                          color: getContrastColor(category.categoryGroup.color),
                          fontWeight: 'medium',
                        }}
                        onClick={() => setGroupAssignmentOpen(category.id!)}
                      />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<GroupIcon />}
                        onClick={() => setGroupAssignmentOpen(category.id!)}
                        sx={{ minWidth: 120 }}
                      >
                        Assign Group
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {category.tag ? (
                      <Chip label={category.tag} size="small" color="default" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit category">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete category">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(category.id!)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Enhanced Category Form */}
      <CategoryForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        defaultValues={editingCategory as any || undefined}
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
            placeholder="Choose a group or leave unassigned"
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
            placeholder="Choose a group or leave unassigned"
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