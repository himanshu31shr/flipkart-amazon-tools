import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  useTheme,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  QrCodeScanner as ScannerIcon,
  ExpandMore as ExpandIcon,
  Refresh as RefreshIcon,
  ArrowDownward as PullIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MobileAppShell } from '../../../navigation/MobileAppShell';
import { MobileDatePicker } from '../../../components/mobile/MobileDatePicker';
import { MobileFAB } from '../../../components/mobile/MobileFAB';
import { MobileOrderCard } from './components/MobileOrderCard';
import { MobileOrderFilters } from './components/MobileOrderFilters';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  fetchOrders,
  fetchOrdersForDate,
  fetchBatchesForDate,
  selectFilteredOrders,
  selectOrdersByBatch,
} from '../../../store/slices/ordersSlice';
import { usePullToRefresh, getPullToRefreshIndicatorStyle, getPullToRefreshRotation } from '../../../hooks/usePullToRefresh';
import { getSafeAreaInsets } from '../../../utils/mobile';
import { ActiveOrder } from '../../../services/todaysOrder.service';

/**
 * Mobile-optimized Today's Orders page
 *
 * Features:
 * - Date picker for selecting order date
 * - Filter button opens bottom sheet with platform/batch/status filters
 * - Order count summary
 * - Pull-to-refresh to reload orders
 * - Infinite scroll for large order lists
 * - Orders grouped by batch with collapsible sections
 * - Order completion via checkbox
 * - FAB for barcode scanner
 *
 * @example
 * <Route path="/todays-orders" element={<MobileTodaysOrdersPage />} />
 */
export const MobileTodaysOrdersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const safeAreaInsets = getSafeAreaInsets();

  // Redux state
  const filteredOrders = useAppSelector(selectFilteredOrders);
  const ordersByBatch = useAppSelector(selectOrdersByBatch);
  const loading = useAppSelector(state => state.orders.loading);
  const error = useAppSelector(state => state.orders.error);
  const batches = useAppSelector(state => state.orders.batches);
  const platformFilter = useAppSelector(state => state.orders.platformFilter);
  const completionFilter = useAppSelector(state => state.orders.completionFilter);
  const batchFilter = useAppSelector(state => state.orders.batchFilter);

  // Local state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<string[]>([]);

  // Pull-to-refresh
  const { state: pullState, containerRef } = usePullToRefresh(
    async () => {
      await handleRefreshOrders();
    },
    { threshold: 80, enabled: true }
  );

  // Calculate active filter count
  const activeFilters = [
    platformFilter !== 'all' ? 1 : 0,
    batchFilter !== null ? 1 : 0,
    completionFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Fetch orders on mount and when date changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      dispatch(fetchOrdersForDate(dateStr));
      dispatch(fetchBatchesForDate(dateStr));
    } else {
      dispatch(fetchOrders());
      dispatch(fetchBatchesForDate(format(new Date(), 'yyyy-MM-dd')));
    }
  }, [dispatch, selectedDate]);

  // Expand all batches by default when data loads
  useEffect(() => {
    if (ordersByBatch && Object.keys(ordersByBatch).length > 0) {
      setExpandedBatches(Object.keys(ordersByBatch));
    }
  }, [ordersByBatch]);

  const handleRefreshOrders = async () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await Promise.all([
        dispatch(fetchOrdersForDate(dateStr)).unwrap(),
        dispatch(fetchBatchesForDate(dateStr)).unwrap(),
      ]);
    } else {
      await dispatch(fetchOrders()).unwrap();
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleOrderComplete = (order: ActiveOrder) => {
    // TODO: Implement order completion logic
    console.log('Complete order:', order);
  };

  const handleOrderTap = (order: ActiveOrder) => {
    // TODO: Navigate to order details
    console.log('Tap order:', order);
  };

  const handleScannerOpen = () => {
    navigate('/todays-orders/scanner');
  };

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatches(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  // Get badge label for batch
  const getBatchLabel = (batchId: string) => {
    if (batchId === 'no-batch') return 'No Batch';
    const batch = batches.find(b => b.batchId === batchId);
    return batch ? batch.fileName : `Batch ${batchId.slice(0, 8)}`;
  };

  // Get order count for batch
  const getBatchOrderCount = (batchId: string) => {
    return ordersByBatch[batchId]?.length || 0;
  };

  const pullIndicatorStyle = getPullToRefreshIndicatorStyle(pullState.pullDistance);
  const pullRotation = getPullToRefreshRotation(pullState.progress, pullState.shouldRefresh);

  return (
    <MobileAppShell pageTitle="Today's Orders">
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'background.default',
        }}
      >
        {/* Pull-to-refresh indicator */}
        {pullState.isPulling && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              paddingTop: safeAreaInsets.top,
              zIndex: 1,
              pointerEvents: 'none',
            }}
            style={pullIndicatorStyle}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                boxShadow: 2,
              }}
            >
              {pullState.shouldRefresh ? (
                <>
                  <RefreshIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="body2" color="primary">
                    Release to refresh
                  </Typography>
                </>
              ) : (
                <>
                  <PullIcon
                    sx={{
                      color: 'text.secondary',
                      transform: `rotate(${pullRotation}deg)`,
                      transition: 'transform 0.2s',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Pull to refresh
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}

        {pullState.isRefreshing && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              backgroundColor: 'background.paper',
              zIndex: 1,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Header with date picker and filter */}
        <Box
          sx={{
            position: 'sticky',
            top: pullState.isRefreshing ? 56 : 0,
            zIndex: 1,
            backgroundColor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 2,
          }}
        >
          {/* Date picker */}
          <Box sx={{ mb: 2 }}>
            <MobileDatePicker
              value={selectedDate}
              onChange={handleDateChange}
              label="Order Date"
              showTodayButton
            />
          </Box>

          {/* Order count and filter button */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </Typography>

            <IconButton
              onClick={() => setFilterOpen(true)}
              sx={{
                minWidth: 44,
                minHeight: 44,
              }}
              aria-label="Open filters"
            >
              <Badge badgeContent={activeFilters} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading && !pullState.isRefreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No orders found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeFilters > 0
                ? 'Try adjusting your filters'
                : `No orders for ${format(selectedDate, 'MMM dd, yyyy')}`}
            </Typography>
          </Box>
        )}

        {/* Orders list grouped by batch */}
        {!loading && filteredOrders.length > 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            {Object.entries(ordersByBatch).map(([batchId, batchOrders]) => (
              <Accordion
                key={batchId}
                expanded={expandedBatches.includes(batchId)}
                onChange={() => toggleBatchExpanded(batchId)}
                elevation={0}
                sx={{
                  mb: 2,
                  '&:before': {
                    display: 'none',
                  },
                  backgroundColor: 'transparent',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandIcon />}
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    minHeight: 56,
                    '&.Mui-expanded': {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      pr: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {getBatchLabel(batchId)}
                    </Typography>
                    <Badge badgeContent={getBatchOrderCount(batchId)} color="primary" />
                  </Box>
                </AccordionSummary>

                <AccordionDetails
                  sx={{
                    backgroundColor: 'background.paper',
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    pt: 0,
                    pb: 2,
                    px: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      px: 2,
                    }}
                  >
                    {batchOrders.map((order, index) => (
                      <MobileOrderCard
                        key={`${order.name}-${order.SKU}-${index}`}
                        order={order}
                        onComplete={handleOrderComplete}
                        onTap={handleOrderTap}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Filter sheet */}
        <MobileOrderFilters
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onOpen={() => setFilterOpen(true)}
        />

        {/* Barcode scanner FAB */}
        <MobileFAB
          onClick={handleScannerOpen}
          position="bottom-right"
          bottomOffset={80}
          aria-label="Open barcode scanner"
        >
          <ScannerIcon />
        </MobileFAB>
      </Box>
    </MobileAppShell>
  );
};

export default MobileTodaysOrdersPage;
