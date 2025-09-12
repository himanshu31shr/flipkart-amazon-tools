import React from 'react';
import {
  Box,
  Paper,
  ButtonGroup,
  Button,
  Typography,
} from '@mui/material';
import {
  ViewList as ViewListIcon,
  Category as CategoryIcon,
  FilterList as FilterListIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { PlatformFilter, Platform } from './PlatformFilter';
import { BatchFilter } from './BatchFilter';
import { BatchInfo } from '../../../types/transaction.type';

export type ViewMode = 'individual' | 'grouped';

interface UnifiedFiltersProps {
  // View mode controls
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Platform filter
  platformFilter: Platform;
  onPlatformFilterChange: (platform: Platform) => void;
  
  // Batch filter
  batchFilter: string;
  onBatchFilterChange: (batchId: string) => void;
  batches: BatchInfo[];
  batchesLoading?: boolean;
  
  // Files modal
  onFilesClick: () => void;
}

export const UnifiedFilters: React.FC<UnifiedFiltersProps> = ({
  viewMode,
  onViewModeChange,
  platformFilter,
  onPlatformFilterChange,
  batchFilter,
  onBatchFilterChange,
  batches,
  batchesLoading = false,
  onFilesClick
}) => {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      {/* View Mode & Platform Filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Left Side: View Mode & Platform Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
              View:
            </Typography>
            <ButtonGroup variant="outlined" size="small">
              <Button
                variant={viewMode === 'individual' ? 'contained' : 'outlined'}
                onClick={() => onViewModeChange('individual')}
                startIcon={<ViewListIcon fontSize="small" />}
                sx={{ minWidth: 120 }}
              >
                Individual
              </Button>
              <Button
                variant={viewMode === 'grouped' ? 'contained' : 'outlined'}
                onClick={() => onViewModeChange('grouped')}
                startIcon={<CategoryIcon fontSize="small" />}
                sx={{ minWidth: 120 }}
              >
                Category
              </Button>
            </ButtonGroup>
          </Box>
          
          {/* Platform Filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <PlatformFilter
              value={platformFilter}
              onChange={onPlatformFilterChange}
              label="Platform"
              size="small"
            />
          </Box>
          
          {/* Batch Filter */}
          <BatchFilter
            value={batchFilter}
            onChange={onBatchFilterChange}
            batches={batches}
            loading={batchesLoading}
            label="Batch"
            size="small"
          />
        </Box>
        
        {/* Right Side: Files Access */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FolderIcon fontSize="small" />}
          onClick={onFilesClick}
          sx={{ minWidth: 100 }}
        >
          Files
        </Button>
      </Box>
    </Paper>
  );
};