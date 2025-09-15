import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import {
  fetchCategoryGroups,
  selectCategoryGroups,
  clearError,
} from '../../store/slices/categoryGroupsSlice';
import { CategoryGroupWithStats } from '../../types/categoryGroup';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import CategoryGroupList from './CategoryGroupList';
import CategoryGroupForm from './CategoryGroupForm';

const CategoryGroupsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const groups = useAppSelector(selectCategoryGroups);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroupWithStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupWithStats | null>(null);
  const [groupCategories, setGroupCategories] = useState<Array<{id: string; name: string}>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const categoryGroupService = new CategoryGroupService();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCategoryGroups());
    }
  }, [dispatch, isAuthenticated]);

  const handleRefresh = () => {
    dispatch(fetchCategoryGroups());
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const handleEditGroup = (group: CategoryGroupWithStats) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingGroup(null);
    dispatch(clearError());
  };

  const handleFormSuccess = () => {
    setSnackbarMessage(
      editingGroup ? 'Category group updated successfully!' : 'Category group created successfully!'
    );
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    handleRefresh();
  };

  const handleViewGroupDetails = async (group: CategoryGroupWithStats) => {
    setSelectedGroup(group);
    try {
      const categories = await categoryGroupService.getCategoriesByGroup(group.id!);
      setGroupCategories(categories);
      setDetailsOpen(true);
    } catch (err) {
      setSnackbarMessage('Failed to load group details');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      console.error('Failed to load group details:', err);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedGroup(null);
    setGroupCategories([]);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

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

  if (!isAuthenticated) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="warning">
          Please log in to manage category groups.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <GroupIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            Category Groups
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Action Buttons */}
          <Button
            variant="outlined"
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
            sx={{ mr: 2, fontWeight: 'medium' }}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            startIcon={<AddIcon />}
            sx={{ fontWeight: 'medium' }}
          >
            Create Group
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Summary Stats */}
        <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, minWidth: 200, borderRadius: 2 }}>
            <Box display="flex" alignItems="center">
              <GroupIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {groups.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Groups
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 200, borderRadius: 2 }}>
            <Box display="flex" alignItems="center">
              <CategoryIcon sx={{ color: 'success.main', mr: 1 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {groups.reduce((sum, group) => sum + group.categoryCount, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assigned Categories
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Category Groups List */}
        <CategoryGroupList
          onEditGroup={handleEditGroup}
          onViewGroupDetails={handleViewGroupDetails}
          refreshTrigger={refreshTrigger}
        />
      </Paper>

      {/* Create/Edit Form Dialog */}
      <CategoryGroupForm
        open={formOpen}
        onClose={handleCloseForm}
        editingGroup={editingGroup}
        onSuccess={handleFormSuccess}
      />

      {/* Group Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            {selectedGroup && (
              <Chip
                label={selectedGroup.name}
                sx={{
                  backgroundColor: selectedGroup.color,
                  color: getContrastColor(selectedGroup.color),
                  fontWeight: 'bold',
                }}
              />
            )}
            <Typography variant="h6">
              Group Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedGroup && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Description:</strong> {selectedGroup.description || 'No description'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Color:</strong> {selectedGroup.color}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Categories:</strong> {selectedGroup.categoryCount}
              </Typography>
            </Box>
          )}

          <Typography variant="h6" gutterBottom>
            Associated Categories
          </Typography>
          
          {groupCategories.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
              <CategoryIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No categories assigned to this group yet.
              </Typography>
            </Box>
          ) : (
            <List dense>
              {groupCategories.map((category) => (
                <ListItem key={category.id}>
                  <ListItemIcon>
                    <CategoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={category.name} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CategoryGroupsPage;