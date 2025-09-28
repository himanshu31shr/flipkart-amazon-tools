import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import React, { useEffect, useState, useMemo } from "react";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchOrders, 
  fetchOrdersForDate, 
  fetchBatchesForDate, 
  fetchBatchesForToday,
  selectFilteredOrders,
  setBatchFilter,
  setPlatformFilter,
  setCompletionFilter,
  clearAllFilters
} from "../../store/slices/ordersSlice";
import { SummaryTable } from "../home/components/SummaryTable";
import { CategoryGroupedTable } from "./components/CategoryGroupedTable";
import { groupOrdersByCategory } from "./utils/groupingUtils";
import { Platform } from "./components/PlatformFilter";
import { FilesModal } from "./components/FilesModal";
import { BarcodeScanner } from "./components/BarcodeScanner";
import { ModernFilters, ViewMode, CompletionFilter } from "./components/ModernFilters";
import { ScanningResult } from "../../types/barcode";


export const TodaysOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    items: orders, 
    loading, 
    batches, 
    batchesLoading,
    batchFilter,
    platformFilter,
    completionFilter
  } = useAppSelector(state => state.orders);
  
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (dateString === today) {
      dispatch(fetchOrders());
      dispatch(fetchBatchesForToday());
    } else {
      dispatch(fetchOrdersForDate(dateString));
      dispatch(fetchBatchesForDate(dateString));
    }
  }, [dispatch, selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const handleTodayButton = () => {
    setSelectedDate(new Date());
  };

  const handlePlatformFilterChange = (platform: Platform) => {
    dispatch(setPlatformFilter(platform));
  };

  const handleBatchFilterChange = (batchId: string) => {
    dispatch(setBatchFilter(batchId));
  };

  const handleCompletionFilterChange = (status: CompletionFilter) => {
    dispatch(setCompletionFilter(status));
  };

  const handleScanSuccess = (result: ScanningResult) => {
    if (result.success && result.orderData) {
      setScanFeedback({
        type: 'success',
        message: `Order completed: ${result.orderData.productName}`
      });
      setScannerModalOpen(false);
      
      // Refresh orders to show updated completion status
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (dateString === today) {
        dispatch(fetchOrders());
      } else {
        dispatch(fetchOrdersForDate(dateString));
      }
    }
  };

  const handleScanError = (error: string) => {
    setScanFeedback({
      type: 'error',
      message: error
    });
  };

  const filteredOrders = useAppSelector(selectFilteredOrders);

  // Memoized data for different view modes
  const groupedData = useMemo(() => {
    return groupOrdersByCategory(filteredOrders);
  }, [filteredOrders]);

  // Calculate filter status
  const isFiltered = platformFilter !== 'all' || (batchFilter && batchFilter !== 'all') || completionFilter !== 'all';
  const totalOrdersCount = orders.length;
  const filteredOrdersCount = filteredOrders.length;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1, sm: 2, md: 3 }, px: { xs: 1, sm: 2 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 2 }}>
        {/* Mobile-first Header Layout */}
        <Box sx={{ mb: 3 }}>
          {/* Title Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
            <ShoppingCartIcon sx={{ fontSize: { xs: 24, md: 32 }, mr: { xs: 1, md: 2 }, color: 'primary.main' }} />
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold', 
                color: 'primary.dark', 
                flexGrow: 1,
                fontSize: { xs: '1.5rem', md: '2.125rem' }
              }}
            >
              {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "Today's Orders" : "Orders"}
            </Typography>
          </Box>
          
          {/* Date Navigation - Full width on mobile */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, md: 1 },
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', md: 'flex-end' }
          }}>
            <IconButton onClick={handlePreviousDay} color="primary" size="small">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontSize: '0.875rem',
                    minWidth: { xs: '140px', md: '160px' }
                  }
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
            
            <IconButton onClick={handleNextDay} color="primary" size="small">
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
            
            <Button 
              variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "contained" : "outlined"}
              size="small" 
              onClick={handleTodayButton}
              sx={{ minWidth: 'auto', px: { xs: 1.5, md: 2 } }}
            >
              Today
            </Button>
          </Box>
        </Box>


        {/* Modern Filters */}
        <ModernFilters
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          platformFilter={platformFilter}
          onPlatformFilterChange={handlePlatformFilterChange}
          batchFilter={batchFilter || 'all'}
          onBatchFilterChange={handleBatchFilterChange}
          batches={batches}
          batchesLoading={batchesLoading}
          completionFilter={completionFilter}
          onCompletionFilterChange={handleCompletionFilterChange}
          onFilesClick={() => setFilesModalOpen(true)}
          onScannerClick={() => setScannerModalOpen(true)}
          onClearAllFilters={() => dispatch(clearAllFilters())}
          totalCount={totalOrdersCount}
          filteredCount={filteredOrdersCount}
        />


        {/* Files Modal */}
        <FilesModal
          open={filesModalOpen}
          onClose={() => setFilesModalOpen(false)}
          selectedDate={selectedDate}
        />

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          open={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          options={{
            enableManualEntry: true,
            cameraTimeout: 30000,
          }}
        />

        {/* Scan Feedback Snackbar */}
        <Snackbar
          open={!!scanFeedback}
          autoHideDuration={6000}
          onClose={() => setScanFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setScanFeedback(null)}
            severity={scanFeedback?.type || 'info'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {scanFeedback?.message}
          </Alert>
        </Snackbar>

        <Box sx={{ mb: 2 }}>
          {/* Section Header */}
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
            {viewMode === 'individual' 
              ? 'Current Orders' 
              : 'Orders by Category'
            }
          </Typography>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems={"center"}
              m={4}
            >
              <CircularProgress color="primary" size={40} thickness={4} />
            </Box>
          ) : filteredOrdersCount === 0 && isFiltered ? (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No orders match your current filters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try adjusting your platform or batch filters to see more results
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  dispatch(clearAllFilters());
                }}
              >
                Clear All Filters
              </Button>
            </Paper>
          ) : (
            <>
              {viewMode === 'individual' && (
                <SummaryTable summary={filteredOrders} />
              )}
              {viewMode === 'grouped' && (
                <CategoryGroupedTable groupedData={groupedData} />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};
