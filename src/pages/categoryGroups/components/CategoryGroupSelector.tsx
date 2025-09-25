import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { CategoryGroupService } from '../../../services/categoryGroup.service';
import { CategoryGroupWithStats } from '../../../types/categoryGroup';

interface CategoryGroupSelectorProps {
  value?: string | null;
  onChange: (groupId: string | null) => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const CategoryGroupSelector: React.FC<CategoryGroupSelectorProps> = ({
  value = null,
  onChange,
  error = false,
  helperText,
  label = 'Category Group',
  placeholder = 'Select a category group',
  required = false,
  disabled = false,
  fullWidth = true,
}) => {
  const [groups, setGroups] = useState<CategoryGroupWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryGroupService = new CategoryGroupService();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const fetchedGroups = await categoryGroupService.getCategoryGroupsWithStats();
        setGroups(fetchedGroups);
      } catch (error) {
        console.error('Failed to fetch category groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleChange = (event: { target: { value: string } }) => {
    const selectedValue = event.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
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

  const selectedGroup = groups?.find(group => group.id === value);

  return (
    <FormControl fullWidth={fullWidth} error={error} disabled={disabled}>
      <InputLabel id="category-group-select-label">
        {label}{required && ' *'}
      </InputLabel>
      <Select
        labelId="category-group-select-label"
        value={value || ''}
        label={`${label}${required ? ' *' : ''}`}
        onChange={handleChange}
        disabled={loading || disabled}
        displayEmpty
        renderValue={(selected) => {
          if (loading) {
            return (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                Loading groups...
              </Box>
            );
          }
          
          if (!selected) {
            return <Box sx={{ color: 'text.secondary' }}>{placeholder}</Box>;
          }

          if (selectedGroup) {
            return (
              <Chip
                label={selectedGroup.name}
                size="small"
                sx={{
                  backgroundColor: selectedGroup.color,
                  color: getContrastColor(selectedGroup.color),
                  fontWeight: 'medium',
                }}
              />
            );
          }

          return selected;
        }}
      >
        <MenuItem value="">
          <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            No group assigned
          </Box>
        </MenuItem>
        {groups?.map((group) => (
          <MenuItem key={group.id} value={group.id}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <Chip
                label={group.name}
                size="small"
                sx={{
                  backgroundColor: group.color,
                  color: getContrastColor(group.color),
                  fontWeight: 'medium',
                  minWidth: 100,
                }}
              />
              <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                {group.categoryCount} {group.categoryCount === 1 ? 'category' : 'categories'}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default CategoryGroupSelector;