import React, { useState } from 'react';
import {
  Box,
  IconButton,
  TextField,
  SwipeableDrawer,
  Button,
  Grid,
  Typography,
  Chip,
  InputAdornment,
  Paper,
  Divider
} from '@mui/material';
import {
  Sort as SortIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  DragHandle as DragHandleIcon
} from '@mui/icons-material';
import { Column } from './DataTable';
import { getSafeAreaInsets } from '../../utils/mobile';

interface MobileFiltersProps<T> {
  columns: Column<T>[];
  orderBy: keyof T;
  order: 'asc' | 'desc';
  filters: { [key in keyof T]?: string };
  onRequestSort: (property: keyof T) => void;
  onFilterChange: (column: keyof T, value: string) => void;
}

export function MobileFilters<T>(props: MobileFiltersProps<T>) {
  const { columns, orderBy, order, filters, onRequestSort, onFilterChange } = props;
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [tempOrderBy, setTempOrderBy] = useState<keyof T>(orderBy);
  const [tempOrder, setTempOrder] = useState<'asc' | 'desc'>(order);
  const safeAreaInsets = getSafeAreaInsets();

  // Update temp values when props change (e.g., applied filters)
  React.useEffect(() => {
    setTempOrderBy(orderBy);
    setTempOrder(order);
  }, [orderBy, order]);

  // Columns that have filters enabled
  const filterableColumns = columns.filter(col => col.filter);
  
  // Active filter count
  const activeFilterCount = Object.values(filters).filter(v => v && typeof v === 'string' && v.length > 0).length;

  // Apply the unified search to all filterable columns
  const applySearch = (text: string) => {
    // Clear all previous filters
    filterableColumns.forEach(column => {
      onFilterChange(column.id as keyof T, '');
    });

    // If search text exists, apply it to the first filterable column 
    // This works because the DataTable component will search across all matching fields
    if (text && filterableColumns.length > 0) {
      onFilterChange(filterableColumns[0].id as keyof T, text);
    }
  };

  // Handle the search when user types
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    applySearch(value);
  };

  // Clear search text
  const handleClearSearch = () => {
    setSearchText('');
    applySearch('');
  };

  // Handle sort selection in drawer (temp state)
  const handleSortSelect = (columnId: keyof T) => {
    if (tempOrderBy === columnId) {
      // Toggle order if same column
      setTempOrder(tempOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to asc
      setTempOrderBy(columnId);
      setTempOrder('asc');
    }
  };

  // Apply sorting and close drawer
  const handleApplySort = () => {
    if (tempOrderBy !== orderBy || tempOrder !== order) {
      onRequestSort(tempOrderBy);
    }
    setSortDrawerOpen(false);
  };

  // Clear sorting to default
  const handleClearSort = () => {
    const firstColumn = columns[0];
    setTempOrderBy(firstColumn.id as keyof T);
    setTempOrder('asc');
  };

  // Handle drawer close without applying
  const handleDrawerClose = () => {
    // Reset temp values to current values
    setTempOrderBy(orderBy);
    setTempOrder(order);
    setSortDrawerOpen(false);
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Unified search bar */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 1.5,
          display: 'flex',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <TextField
          placeholder="Search all columns..."
          fullWidth
          size="small"
          value={searchText}
          onChange={handleSearchChange}
          variant="standard"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton 
                  edge="end" 
                  onClick={handleClearSearch}
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            disableUnderline: true
          }}
        />
        <IconButton
          size="small"
          onClick={() => setSortDrawerOpen(true)}
          sx={{ ml: 1 }}
          aria-label="Sort options"
        >
          <SortIcon />
        </IconButton>
      </Paper>

      {/* Active filter indicator */}
      {activeFilterCount > 0 && (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            Showing results for &quot;{searchText}&quot;
          </Typography>
          <Chip 
            label="Clear" 
            size="small" 
            variant="outlined" 
            sx={{ ml: 1, height: 20, fontSize: 11 }}
            onClick={handleClearSearch} 
          />
        </Box>
      )}

      {/* Sort Bottom Sheet */}
      <SwipeableDrawer
        anchor="bottom"
        open={sortDrawerOpen}
        onClose={handleDrawerClose}
        onOpen={() => setSortDrawerOpen(true)}
        disableSwipeToOpen
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: safeAreaInsets.bottom, // iOS safe area
            maxHeight: '80vh'
          }
        }}
        transitionDuration={300} // Smooth 300ms animation
      >
        {/* Drag Handle */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5,
            cursor: 'grab'
          }}
        >
          <DragHandleIcon sx={{ color: 'text.disabled' }} />
        </Box>

        {/* Header */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="h6" component="h2">
            Sort By
          </Typography>
        </Box>

        <Divider />

        {/* Sort Options */}
        <Box sx={{ px: 2, py: 2, flexGrow: 1, overflow: 'auto' }}>
          <Grid container spacing={1.5}>
            {columns.map((column) => (
              <Grid item xs={12} key={String(column.id)}>
                <Button
                  fullWidth
                  variant={tempOrderBy === column.id ? 'contained' : 'outlined'}
                  onClick={() => handleSortSelect(column.id as keyof T)}
                  endIcon={tempOrderBy === column.id ? (
                    tempOrder === 'asc' ? '↑' : '↓'
                  ) : null}
                  sx={{
                    justifyContent: 'space-between',
                    minHeight: 48, // 48px touch target for Android
                    textTransform: 'none'
                  }}
                >
                  {column.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider />

        {/* Action Buttons */}
        <Box
          sx={{
            px: 2,
            py: 2,
            display: 'flex',
            gap: 1,
            justifyContent: 'space-between'
          }}
        >
          <Button
            onClick={handleClearSort}
            variant="outlined"
            color="inherit"
            sx={{ flex: 1, minHeight: 48 }}
          >
            Clear
          </Button>
          <Button
            onClick={handleApplySort}
            variant="contained"
            color="primary"
            sx={{ flex: 1, minHeight: 48 }}
          >
            Apply
          </Button>
        </Box>
      </SwipeableDrawer>

      {/* No filters message */}
      {activeFilterCount === 0 && (
        <Typography variant="body2" color="text.secondary">
          No filters are currently applied. Click &quot;Add Filter&quot; to filter the data.
        </Typography>
      )}
    </Box>
  );
}