import React from 'react';
import { Box, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { MobileSearchInput } from '../../../../components/mobile/MobileSearchInput';
import { useAppSelector } from '../../../../store/hooks';

export interface MobileProductSearchProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  platformFilter: 'all' | 'amazon' | 'flipkart';
  onPlatformFilterChange: (platform: 'all' | 'amazon' | 'flipkart') => void;
  categoryFilter: string | null;
  onCategoryFilterChange: (categoryId: string | null) => void;
  sortBy: 'name' | 'sku' | 'stock';
  onSortChange: (sort: 'name' | 'sku' | 'stock') => void;
}

export const MobileProductSearch: React.FC<MobileProductSearchProps> = ({
  searchValue,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortChange,
}) => {
  const categories = useAppSelector(state => state.categories?.items || []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, backgroundColor: 'background.paper' }}>
      <MobileSearchInput value={searchValue} onChange={onSearchChange} placeholder="Search products..." autoFocus={false} />

      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label="All" onClick={() => onPlatformFilterChange('all')} color={platformFilter === 'all' ? 'primary' : 'default'} variant={platformFilter === 'all' ? 'filled' : 'outlined'} sx={{ minHeight: 44, px: 2 }} />
          <Chip label="Amazon" onClick={() => onPlatformFilterChange('amazon')} color={platformFilter === 'amazon' ? 'primary' : 'default'} variant={platformFilter === 'amazon' ? 'filled' : 'outlined'} sx={{ minHeight: 44, px: 2 }} />
          <Chip label="Flipkart" onClick={() => onPlatformFilterChange('flipkart')} color={platformFilter === 'flipkart' ? 'primary' : 'default'} variant={platformFilter === 'flipkart' ? 'filled' : 'outlined'} sx={{ minHeight: 44, px: 2 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter || ''} label="Category" onChange={(e) => onCategoryFilterChange(e.target.value || null)} sx={{ minHeight: 56 }}>
            <MenuItem value=""><em>All Categories</em></MenuItem>
            {categories.map((cat) => (<MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} label="Sort By" onChange={(e) => onSortChange(e.target.value as 'name' | 'sku' | 'stock')} sx={{ minHeight: 56 }}>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="sku">SKU</MenuItem>
            <MenuItem value="stock">Stock Level</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
