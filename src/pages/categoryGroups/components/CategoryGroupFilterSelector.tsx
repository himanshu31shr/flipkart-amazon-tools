import React, { useEffect } from 'react';
import {
  Chip,
  Box,
  TextField,
  Autocomplete,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  selectCategoryGroups,
  selectCategoryGroupsLoading,
  selectCategoryGroupsLastUpdated,
  fetchCategoryGroups,
} from '../../../store/slices/categoryGroupsSlice';
import { CategoryGroupWithStats } from '../../../types/categoryGroup';

interface CategoryGroupFilterSelectorProps {
  value: string | 'all' | 'assigned' | 'unassigned';
  onChange: (value: string | 'all' | 'assigned' | 'unassigned') => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

// Special filter options
const FILTER_OPTIONS = [
  { id: 'all', name: 'All Categories', isSpecial: true as const },
  { id: 'assigned', name: 'With Groups', isSpecial: true as const },
  { id: 'unassigned', name: 'Without Groups', isSpecial: true as const },
];

type FilterOption = CategoryGroupWithStats | { id: string; name: string; isSpecial: true };

const CategoryGroupFilterSelector: React.FC<CategoryGroupFilterSelectorProps> = ({
  value = 'all',
  onChange,
  error = false,
  helperText,
  label = 'Filter by Group',
  disabled = false,
  fullWidth = true,
  size = 'medium',
}) => {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectCategoryGroups);
  const loading = useAppSelector(selectCategoryGroupsLoading);
  const lastUpdated = useAppSelector(selectCategoryGroupsLastUpdated);

  useEffect(() => {
    // Only fetch if data is stale or not yet loaded
    const shouldFetch = !groups.length || 
      !lastUpdated || 
      (Date.now() - new Date(lastUpdated).getTime() > 5 * 60 * 1000); // 5 minutes cache

    if (shouldFetch) {
      dispatch(fetchCategoryGroups());
    }
  }, [dispatch, groups.length, lastUpdated]);

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

  // Combine special filter options with category groups
  const allOptions: FilterOption[] = [...FILTER_OPTIONS, ...groups];

  const selectedOption = allOptions.find(option => option.id === value) || FILTER_OPTIONS[0];

  const handleChange = (_: unknown, selectedOption: FilterOption | null) => {
    const selectedValue = selectedOption?.id || 'all';
    onChange(selectedValue as string | 'all' | 'assigned' | 'unassigned');
  };

  const getOptionLabel = (option: FilterOption) => option.name;

  const renderOption = (props: React.HTMLAttributes<HTMLLIElement>, option: FilterOption) => (
    <Box component="li" {...props} key={option.id}>
      <Box display="flex" alignItems="center" gap={1} width="100%">
        {'isSpecial' in option ? (
          // Render special filter options
          <Box sx={{ fontWeight: 'medium' }}>
            {option.name}
          </Box>
        ) : (
          // Render category group options
          <>
            <Chip
              label={option.name}
              size="small"
              sx={{
                backgroundColor: (option as CategoryGroupWithStats).color,
                color: getContrastColor((option as CategoryGroupWithStats).color),
                fontWeight: 'medium',
              }}
            />
            <Box sx={{ 
              color: 'text.secondary', 
              fontSize: '0.875rem',
              ml: 'auto' 
            }}>
              {(option as CategoryGroupWithStats).categoryCount} {(option as CategoryGroupWithStats).categoryCount === 1 ? 'category' : 'categories'}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );

  const renderInput = (params: unknown) => (
    <TextField
      {...(params as Record<string, unknown>)}
      label={label}
      error={error}
      helperText={helperText}
      placeholder="Search filter options..."
    />
  );

  return (
    <Autocomplete
      fullWidth={fullWidth}
      size={size}
      value={selectedOption}
      onChange={handleChange}
      options={allOptions}
      getOptionLabel={getOptionLabel}
      loading={loading}
      disabled={disabled || loading}
      isOptionEqualToValue={(option, val) => option.id === val?.id}
      renderInput={renderInput}
      renderOption={renderOption}
      noOptionsText="No filter options found"
      clearText="Clear filter"
      openText="Open filter options"
      closeText="Close filter options"
      disableClearable
    />
  );
};

export default CategoryGroupFilterSelector;