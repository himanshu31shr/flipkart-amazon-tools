import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  TextField,
  Switch,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { Category, CategoryLink } from '../../../types/category';
import { CategoryService } from '../../../services/category.service';

interface CategoryLinkManagerProps {
  categoryId: string;
  categoryName?: string;
  onLinksChanged?: () => void;
  disabled?: boolean;
}

interface LinkWithDetails extends CategoryLink {
  targetCategory?: Category;
  validationSummary?: string;
  hasWarnings?: boolean;
}

const CategoryLinkManager: React.FC<CategoryLinkManagerProps> = ({
  categoryId,
  categoryName,
  onLinksChanged,
  disabled = false
}) => {
  const [links, setLinks] = useState<LinkWithDetails[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Add link dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<Category | null>(null);
  const [isActive, setIsActive] = useState(true);
  
  // Dependency chains dialog state
  const [chainsDialogOpen, setChainsDialogOpen] = useState(false);
  const [dependencyChains, setDependencyChains] = useState<string[]>([]);

  const categoryService = new CategoryService();

  // Load category links and available categories
  useEffect(() => {
    if (categoryId) {
      loadData();
    }
  }, [categoryId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [linkDetails, categories] = await Promise.all([
        categoryService.getCategoryLinkDetails(categoryId),
        categoryService.getCategories()
      ]);

      // Filter out the current category from available options
      const availableOptions = categories.filter(cat => cat.id !== categoryId);
      setAvailableCategories(availableOptions);

      // Add validation summaries to links
      const linksWithValidation = await Promise.all(
        linkDetails.map(async (link) => {
          let validationSummary = '';
          let hasWarnings = false;
          
          if (link.targetCategory) {
            // Check if target category has proper configuration
            const validation = categoryService.validateInventoryDeductionConfig(link.targetCategory);
            if (!validation.isValid || validation.warnings.length > 0) {
              validationSummary = validation.errors.concat(validation.warnings).join(', ');
              hasWarnings = true;
            } else {
              validationSummary = 'Ready for cascade deduction';
            }
          } else {
            validationSummary = 'Target category not found';
            hasWarnings = true;
          }

          return {
            ...link,
            validationSummary,
            hasWarnings
          };
        })
      );

      setLinks(linksWithValidation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category links');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!selectedTargetCategory) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await categoryService.addCategoryLink(
        categoryId,
        selectedTargetCategory.id!,
        isActive
      );
      
      if (result.isValid) {
        setSuccess(`Link added successfully${result.warnings.length > 0 ? ' with warnings' : ''}`);
        setAddDialogOpen(false);
        setSelectedTargetCategory(null);
        setIsActive(true);
        await loadData();
        onLinksChanged?.();
        
        // Show warnings if any
        if (result.warnings.length > 0) {
          setError(`Warnings: ${result.warnings.join(', ')}`);
        }
      } else {
        setError(`Failed to add link: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category link');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLink = async (targetCategoryId: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await categoryService.removeCategoryLink(categoryId, targetCategoryId);
      
      if (result.isValid) {
        setSuccess('Link removed successfully');
        await loadData();
        onLinksChanged?.();
      } else {
        setError(`Failed to remove link: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove category link');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (targetCategoryId: string, newActiveState: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await categoryService.setCategoryLinkActive(
        categoryId,
        targetCategoryId,
        newActiveState
      );
      
      if (result.isValid) {
        setSuccess(`Link ${newActiveState ? 'enabled' : 'disabled'} successfully`);
        await loadData();
        onLinksChanged?.();
      } else {
        setError(`Failed to update link: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category link');
    } finally {
      setSaving(false);
    }
  };

  const handleShowDependencyChains = async () => {
    try {
      const chains = await categoryService.getDependencyChains(categoryId);
      setDependencyChains(chains);
      setChainsDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dependency chains');
    }
  };

  const getFilteredCategories = () => {
    // Filter out categories that are already linked
    const linkedCategoryIds = links.map(link => link.categoryId);
    return availableCategories.filter(cat => !linkedCategoryIds.includes(cat.id!));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <LinkIcon color="primary" />
          <Typography variant="h6">
            Category Links {categoryName && `for ${categoryName}`}
          </Typography>
          {links.length > 0 && (
            <Chip 
              label={`${links.length} link${links.length !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          {links.length > 0 && (
            <Tooltip title="View dependency chains">
              <span>
                <IconButton
                  onClick={handleShowDependencyChains}
                  disabled={disabled}
                  size="small"
                >
                  <AccountTreeIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={() => setAddDialogOpen(true)}
            disabled={disabled || getFilteredCategories().length === 0}
          >
            Add Link
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {links.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No category links configured. Add a link to enable cascade deductions.
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Target Category</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Deduction Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.categoryId}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {link.targetCategory?.name || 'Unknown Category'}
                      </Typography>
                      {link.hasWarnings && (
                        <Tooltip title={link.validationSummary}>
                          <WarningIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={link.isActive !== false}
                      onChange={(e) => handleToggleActive(link.categoryId, e.target.checked)}
                      disabled={disabled || saving}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {link.targetCategory?.inventoryDeductionQuantity || 0} {link.targetCategory?.inventoryUnit || 'pcs'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={link.hasWarnings ? 'Needs Setup' : 'Ready'}
                      color={link.hasWarnings ? 'warning' : 'success'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove link">
                      <span>
                        <IconButton
                          onClick={() => handleRemoveLink(link.categoryId)}
                          disabled={disabled || saving}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Link Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Category Link</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a category to link for cascade deduction. When orders are processed for this category,
              the linked category will also have inventory deducted.
            </Typography>
            
            <Autocomplete
              value={selectedTargetCategory}
              onChange={(_, newValue) => setSelectedTargetCategory(newValue)}
              options={getFilteredCategories()}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Target Category"
                  placeholder="Select category to link"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.inventoryDeductionQuantity
                        ? `Deducts: ${option.inventoryDeductionQuantity} ${option.inventoryUnit || 'pcs'}`
                        : 'No deduction configured'
                      }
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ mb: 3 }}
            />

            <Box display="flex" alignItems="center" gap={2}>
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <Typography variant="body2">
                Active (enable immediate cascade deduction)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLink}
            variant="contained"
            disabled={!selectedTargetCategory || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <LinkIcon />}
          >
            {saving ? 'Adding...' : 'Add Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependency Chains Dialog */}
      <Dialog open={chainsDialogOpen} onClose={() => setChainsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Dependency Chains</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This shows how cascade deductions flow from this category through linked categories.
            </Typography>
            
            {dependencyChains.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No dependency chains found.
              </Typography>
            ) : (
              <Box>
                {dependencyChains.map((chain, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {chain}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChainsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CategoryLinkManager;