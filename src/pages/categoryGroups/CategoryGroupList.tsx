import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCategoryGroups,
  deleteCategoryGroup,
  selectCategoryGroups,
  selectCategoryGroupsLoading,
  selectCategoryGroupsError,
  clearError,
} from '../../store/slices/categoryGroupsSlice';
import { CategoryGroupWithStats } from '../../types/categoryGroup';
import { DataTable, Column } from '../../components/DataTable/DataTable';

interface CategoryGroupListProps {
  onEditGroup: (group: CategoryGroupWithStats) => void;
  onViewGroupDetails: (group: CategoryGroupWithStats) => void;
  refreshTrigger?: number;
}

const CategoryGroupList: React.FC<CategoryGroupListProps> = ({
  onEditGroup,
  onViewGroupDetails,
  refreshTrigger = 0
}) => {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectCategoryGroups);
  const loading = useAppSelector(selectCategoryGroupsLoading);
  const error = useAppSelector(selectCategoryGroupsError);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<CategoryGroupWithStats | null>(null);

  // Define DataTable columns (removed description column)
  const columns: Column<CategoryGroupWithStats>[] = [
    {
      id: 'name',
      label: 'Group Name',
      filter: true,
      priorityOnMobile: true,
      format: (value) => (
        <Box display="flex" alignItems="center">
          <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle1" fontWeight="medium">
            {String(value)}
          </Typography>
        </Box>
      )
    },
    {
      id: 'color',
      label: 'Color',
      align: 'center' as const,
      filter: true,
      filterValue: (row) => row.color,
      format: (value) => (
        <Chip
          label={String(value)}
          size="small"
          sx={{
            backgroundColor: String(value),
            color: getContrastColor(String(value)),
            fontWeight: 'medium',
            minWidth: 80,
          }}
        />
      )
    },
    {
      id: 'categoryCount',
      label: 'Categories',
      align: 'center' as const,
      format: (value, row) => (
        <Box display="flex" alignItems="center" justifyContent="center">
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onViewGroupDetails(row!);
            }}
            startIcon={<CategoryIcon sx={{ fontSize: 20 }} />}
            sx={{ minWidth: 80 }}
          >
            {String(value)}
          </Button>
        </Box>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center' as const,
      format: (_, row) => (
        <Box display="flex" justifyContent="center" gap={1}>
          <Tooltip title="Edit Group">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditGroup(row!);
              }}
              color="primary"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={row!.categoryCount > 0 ? "Cannot delete group with categories" : "Delete Group"}>
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(row!);
                }}
                color="error"
                disabled={row!.categoryCount > 0}
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    }
  ];

  useEffect(() => {
    dispatch(fetchCategoryGroups());
  }, [dispatch, refreshTrigger]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleDeleteClick = (group: CategoryGroupWithStats) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (groupToDelete) {
      try {
        await dispatch(deleteCategoryGroup(groupToDelete.id!)).unwrap();
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Error is handled by Redux state
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setGroupToDelete(null);
  };

  const getContrastColor = (hexColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && groups.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Category Groups Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first category group to organize your categories with colors and descriptions.
          </Typography>
        </Paper>
      ) : (
        <DataTable
          columns={columns}
          data={groups}
          defaultSortColumn="name"
          defaultSortDirection="asc"
          rowsPerPageOptions={[10, 25, 50]}
          defaultRowsPerPage={25}
          getRowId={(row) => row.id!}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Category Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{groupToDelete?.name}&quot;? This action cannot be undone.
          </Typography>
          {groupToDelete?.categoryCount === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This group has no categories assigned and can be safely deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryGroupList;