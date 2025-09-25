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

interface CategoryGroupSelectorProps {
  value?: string | null;
  onChange: (groupId: string | null) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const CategoryGroupSelector: React.FC<CategoryGroupSelectorProps> = ({
  value = null,
  onChange,
  error = false,
  helperText,
  label = 'Category Group',
  required = false,
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

  const selectedGroup = groups.find(group => group.id === value) || null;

  const handleChange = (_: unknown, selectedGroup: CategoryGroupWithStats | null) => {
    onChange(selectedGroup?.id || null);
  };

  return (
    <Autocomplete
      fullWidth={fullWidth}
      size={size}
      value={selectedGroup}
      onChange={handleChange}
      options={groups}
      getOptionLabel={(group) => group.name}
      loading={loading}
      disabled={disabled || loading}
      isOptionEqualToValue={(option, val) => option.id === val?.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={`${label}${required ? ' *' : ''}`}
          error={error}
          helperText={helperText}
          placeholder="Search and select a group..."
        />
      )}
      renderOption={(props, group) => (
        <Box component="li" {...props} key={group.id}>
          <Box display="flex" alignItems="center" gap={1} width="100%">
            <Chip
              label={group.name}
              size="small"
              sx={{
                backgroundColor: group.color,
                color: getContrastColor(group.color),
                fontWeight: 'medium',
              }}
            />
            <Box sx={{ 
              color: 'text.secondary', 
              fontSize: '0.875rem',
              ml: 'auto' 
            }}>
              {group.categoryCount} {group.categoryCount === 1 ? 'category' : 'categories'}
            </Box>
          </Box>
        </Box>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={option.name}
            size="small"
            sx={{
              backgroundColor: option.color,
              color: getContrastColor(option.color),
              fontWeight: 'medium',
            }}
          />
        ))
      }
      noOptionsText="No category groups found"
      clearText="Clear selection"
      openText="Open options"
      closeText="Close options"
    />
  );
};

export default CategoryGroupSelector;