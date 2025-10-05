import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MobileAppShell } from '../../../navigation/MobileAppShell';
import { MobileFAB } from '../../../components/mobile/MobileFAB';
import { MobileSearchInput } from '../../../components/mobile/MobileSearchInput';
import { MobileCategoryGroupCard } from './components/MobileCategoryGroupCard';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  fetchCategoryGroups,
  selectCategoryGroups,
  selectCategoryGroupsLoading,
  selectCategoryGroupsError,
} from '../../../store/slices/categoryGroupsSlice';
import { CategoryGroupWithStats } from '../../../types/categoryGroup';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';

/**
 * Mobile category groups page component
 *
 * Features:
 * - Pull-to-refresh to reload groups
 * - Search/filter by name or description
 * - Infinite scroll pagination (20 items at a time)
 * - Color-coded group cards with inventory status
 * - FAB to add new groups
 * - Empty state for no groups
 * - Error handling with retry
 * - Touch-optimized layout
 *
 * @example
 * ```tsx
 * <Route path="/category-groups" element={<MobileCategoryGroupsPage />} />
 * ```
 */
export const MobileCategoryGroupsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const categoryGroups = useAppSelector(selectCategoryGroups);
  const loading = useAppSelector(selectCategoryGroupsLoading);
  const error = useAppSelector(selectCategoryGroupsError);

  const [searchValue, setSearchValue] = useState('');
  const [displayCount, setDisplayCount] = useState(20);

  // Initial data fetch
  useEffect(() => {
    dispatch(fetchCategoryGroups());
  }, [dispatch]);

  // Pull-to-refresh handler
  const { state: pullState, containerRef } = usePullToRefresh(
    async () => {
      await dispatch(fetchCategoryGroups()).unwrap();
    },
    { threshold: 80, enabled: true }
  );

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchValue) return categoryGroups;
    const search = searchValue.toLowerCase();
    return categoryGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(search) ||
        (group.description && group.description.toLowerCase().includes(search))
    );
  }, [categoryGroups, searchValue]);

  // Paginate filtered results
  const displayedGroups = filteredGroups.slice(0, displayCount);

  // Infinite scroll handler
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => {
      if (displayCount < filteredGroups.length) {
        setDisplayCount((prev) => Math.min(prev + 20, filteredGroups.length));
      }
    },
    isLoading: loading,
    hasMore: displayCount < filteredGroups.length,
    threshold: 100,
  });

  // Handle group card tap
  const handleGroupTap = (group: CategoryGroupWithStats) => {
    // Navigate to group details or edit page
    navigate(`/category-groups/${group.id}`);
  };

  // Handle add new group
  const handleAddGroup = () => {
    navigate('/category-groups/new');
  };

  // Retry loading on error
  const handleRetry = () => {
    dispatch(fetchCategoryGroups());
  };

  return (
    <MobileAppShell>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          pb: 10, // Space for FAB and bottom nav
        }}
      >
        {/* Pull-to-refresh indicator */}
        {pullState.isRefreshing && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pt: 2,
              zIndex: 1,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Search Input */}
        <Box sx={{ p: 2, pb: 1 }}>
          <MobileSearchInput
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search category groups..."
            autoFocus={false}
          />
        </Box>

        {/* Error State */}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={
                <Typography
                  variant="button"
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={handleRetry}
                >
                  Retry
                </Typography>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* Loading State (Initial Load) */}
        {loading && categoryGroups.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Empty State */}
        {!loading && categoryGroups.length === 0 && !error && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
              px: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Category Groups
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first category group to organize categories with colors and inventory
              tracking.
            </Typography>
            <Typography
              variant="button"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleAddGroup}
            >
              Add Category Group
            </Typography>
          </Box>
        )}

        {/* No Search Results */}
        {!loading && categoryGroups.length > 0 && filteredGroups.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              px: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Results Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms
            </Typography>
          </Box>
        )}

        {/* Category Group Cards */}
        {displayedGroups.length > 0 && (
          <Box sx={{ p: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedGroups.map((group) => (
              <MobileCategoryGroupCard
                key={group.id}
                categoryGroup={group}
                onTap={handleGroupTap}
              />
            ))}

            {/* Infinite Scroll Sentinel */}
            {displayCount < filteredGroups.length && (
              <Box ref={sentinelRef} sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={32} />
              </Box>
            )}

            {/* End of List Indicator */}
            {displayCount >= filteredGroups.length && filteredGroups.length > 0 && (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {filteredGroups.length === 1
                    ? '1 group'
                    : `${filteredGroups.length} groups`}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Floating Action Button */}
      <MobileFAB onClick={handleAddGroup} color="primary">
        <AddIcon />
      </MobileFAB>
    </MobileAppShell>
  );
};

export default MobileCategoryGroupsPage;
