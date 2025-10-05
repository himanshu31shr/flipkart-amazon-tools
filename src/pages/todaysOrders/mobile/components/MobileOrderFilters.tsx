import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  SwipeableDrawer,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import {
  setPlatformFilter,
  setBatchFilter,
  setCompletionFilter,
  clearAllFilters,
} from '../../../../store/slices/ordersSlice';
import { getSafeAreaInsets } from '../../../../utils/mobile';

/**
 * Props for MobileOrderFilters component
 */
export interface MobileOrderFiltersProps {
  /** Whether the filter sheet is open */
  open: boolean;

  /** Callback when filter sheet is closed */
  onClose: () => void;

  /** Callback when filter sheet is opened */
  onOpen: () => void;
}

/**
 * Mobile-optimized order filter component using bottom sheet pattern
 *
 * Features:
 * - Bottom sheet presentation with SwipeableDrawer
 * - Platform filter (All/Amazon/Flipkart) with chip toggles
 * - Batch selector dropdown
 * - Completion status filter (All/Pending/Completed) with chip toggles
 * - Apply and Clear buttons
 * - Maintains temporary state until Apply clicked
 * - Respects iOS safe areas
 *
 * @example
 * <MobileOrderFilters
 *   open={filterOpen}
 *   onClose={() => setFilterOpen(false)}
 *   onOpen={() => setFilterOpen(true)}
 * />
 */
export const MobileOrderFilters: React.FC<MobileOrderFiltersProps> = ({
  open,
  onClose,
  onOpen,
}) => {
  const dispatch = useAppDispatch();
  const safeAreaInsets = getSafeAreaInsets();

  // Get current filter state from Redux
  const currentPlatformFilter = useAppSelector(state => state.orders.platformFilter);
  const currentBatchFilter = useAppSelector(state => state.orders.batchFilter);
  const currentCompletionFilter = useAppSelector(state => state.orders.completionFilter);
  const batches = useAppSelector(state => state.orders.batches);

  // Temporary filter state (applied on "Apply" button click)
  const [tempPlatformFilter, setTempPlatformFilter] = useState<'all' | 'amazon' | 'flipkart'>(currentPlatformFilter);
  const [tempBatchFilter, setTempBatchFilter] = useState<string | null>(currentBatchFilter);
  const [tempCompletionFilter, setTempCompletionFilter] = useState<'all' | 'completed' | 'pending'>(currentCompletionFilter);

  // Sync temporary state with Redux when filters change externally
  useEffect(() => {
    setTempPlatformFilter(currentPlatformFilter);
    setTempBatchFilter(currentBatchFilter);
    setTempCompletionFilter(currentCompletionFilter);
  }, [currentPlatformFilter, currentBatchFilter, currentCompletionFilter]);

  const handleApply = () => {
    dispatch(setPlatformFilter(tempPlatformFilter));
    dispatch(setBatchFilter(tempBatchFilter));
    dispatch(setCompletionFilter(tempCompletionFilter));
    onClose();
  };

  const handleClear = () => {
    setTempPlatformFilter('all');
    setTempBatchFilter(null);
    setTempCompletionFilter('all');
    dispatch(clearAllFilters());
  };

  const handlePlatformChipClick = (platform: 'all' | 'amazon' | 'flipkart') => {
    setTempPlatformFilter(platform);
  };

  const handleCompletionChipClick = (status: 'all' | 'completed' | 'pending') => {
    setTempCompletionFilter(status);
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      swipeAreaWidth={20}
      disableSwipeToOpen={false}
      transitionDuration={300}
      sx={{
        '& .MuiDrawer-paper': {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingBottom: safeAreaInsets.bottom,
          maxHeight: '80vh',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 400,
          maxHeight: '80vh',
        }}
      >
        {/* Drag handle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5,
          }}
        >
          <DragHandleIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
        </Box>

        {/* Header */}
        <Box sx={{ px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="h6">Filter Orders</Typography>
          </Box>
        </Box>

        <Divider />

        {/* Filter content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* Platform filter */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Platform
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="All"
                onClick={() => handlePlatformChipClick('all')}
                color={tempPlatformFilter === 'all' ? 'primary' : 'default'}
                variant={tempPlatformFilter === 'all' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
              <Chip
                label="Amazon"
                onClick={() => handlePlatformChipClick('amazon')}
                color={tempPlatformFilter === 'amazon' ? 'primary' : 'default'}
                variant={tempPlatformFilter === 'amazon' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
              <Chip
                label="Flipkart"
                onClick={() => handlePlatformChipClick('flipkart')}
                color={tempPlatformFilter === 'flipkart' ? 'primary' : 'default'}
                variant={tempPlatformFilter === 'flipkart' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
            </Box>
          </Box>

          {/* Batch filter */}
          <Box>
            <FormControl fullWidth>
              <InputLabel id="batch-filter-label">Batch</InputLabel>
              <Select
                labelId="batch-filter-label"
                value={tempBatchFilter || ''}
                label="Batch"
                onChange={(e) => setTempBatchFilter(e.target.value || null)}
                sx={{ minHeight: 56 }}
              >
                <MenuItem value="">
                  <em>All Batches</em>
                </MenuItem>
                {batches.map((batch) => (
                  <MenuItem key={batch.batchId} value={batch.batchId}>
                    {batch.fileName} ({new Date(batch.uploadedAt).toLocaleDateString()})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Completion status filter */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="All"
                onClick={() => handleCompletionChipClick('all')}
                color={tempCompletionFilter === 'all' ? 'primary' : 'default'}
                variant={tempCompletionFilter === 'all' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
              <Chip
                label="Pending"
                onClick={() => handleCompletionChipClick('pending')}
                color={tempCompletionFilter === 'pending' ? 'warning' : 'default'}
                variant={tempCompletionFilter === 'pending' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
              <Chip
                label="Completed"
                onClick={() => handleCompletionChipClick('completed')}
                color={tempCompletionFilter === 'completed' ? 'success' : 'default'}
                variant={tempCompletionFilter === 'completed' ? 'filled' : 'outlined'}
                sx={{ minHeight: 44, px: 2, fontSize: '14px' }}
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClear}
            fullWidth
            sx={{ minHeight: 48, fontSize: '16px' }}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            fullWidth
            sx={{ minHeight: 48, fontSize: '16px' }}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default MobileOrderFilters;
