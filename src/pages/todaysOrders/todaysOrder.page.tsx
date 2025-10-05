import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Typography
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  clearAllFilters,
  completeOrderByBarcode,
  fetchBatchesForDate,
  fetchBatchesForToday,
  fetchOrders,
  fetchOrdersForDate,
  selectFilteredOrders,
  setBatchFilter,
  setCompletionFilter,
  setPlatformFilter,
} from "../../store/slices/ordersSlice";
import { ScanningResult } from "../../types/barcode";
import { SummaryTable } from "../home/components/SummaryTable";
import { CategoryGroupedTable } from "./components/CategoryGroupedTable";
import { EnhancedBarcodeScanner } from "./components/EnhancedBarcodeScanner";
import { FilesModal } from "./components/FilesModal";
import {
  CompletionFilter,
  ModernFilters,
  ViewMode,
} from "./components/ModernFilters";
import { Platform } from "./components/PlatformFilter";
import { groupOrdersByCategory } from "./utils/groupingUtils";
import { useIsMobile } from "../../utils/mobile";

// Lazy load mobile component
const MobileTodaysOrdersPage = lazy(() =>
  import("./mobile/MobileTodaysOrdersPage").then(m => ({ default: m.MobileTodaysOrdersPage }))
);

// Desktop component
const DesktopTodaysOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    items: orders,
    loading,
    batches,
    batchesLoading,
    batchFilter,
    platformFilter,
    completionFilter,
  } = useAppSelector((state) => state.orders);

  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [_, setScanFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");

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

  const handleScanSuccess = async (result: ScanningResult) => {
    if (result.success && result.barcodeId) {
      try {
        // Complete the order using the barcode thunk
        const completionResult = await dispatch(
          completeOrderByBarcode({
            barcodeId: result.barcodeId,
          })
        ).unwrap();

        setScanFeedback({
          type: "success",
          message: `Order completed: ${completionResult.orderData.productName}`,
        });
        setScannerModalOpen(false);

        // Orders will be automatically updated by the thunk
      } catch (error) {
        setScanFeedback({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to complete order",
        });
      }
    }
  };

  const handleScanError = (error: string) => {
    setScanFeedback({
      type: "error",
      message: error,
    });
  };

  const filteredOrders = useAppSelector(selectFilteredOrders);

  // Memoized data for different view modes
  const groupedData = useMemo(() => {
    return groupOrdersByCategory(filteredOrders);
  }, [filteredOrders]);

  // Calculate filter status
  const isFiltered =
    platformFilter !== "all" ||
    (batchFilter && batchFilter !== "all") ||
    completionFilter !== "all";
  const totalOrdersCount = orders.length;
  const filteredOrdersCount = filteredOrders.length;

  return (
    <Container
      maxWidth="xl"
      sx={{ py: { xs: 1, sm: 2, md: 3 }, px: { xs: 1, sm: 2 } }}
    >
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 2 }}>
        {/* Mobile-first Header Layout */}
        <Box sx={{ mb: 3 }}>
          {/* Title Row */}
          <Box
            sx={{ display: "flex", alignItems: "center", mb: { xs: 2, md: 0 } }}
          >
            <ShoppingCartIcon
              sx={{
                fontSize: { xs: 24, md: 32 },
                mr: { xs: 1, md: 2 },
                color: "primary.main",
              }}
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: "bold",
                color: "primary.dark",
                flexGrow: 1,
                fontSize: { xs: "1.5rem", md: "2.125rem" },
              }}
            >
              {format(selectedDate, "yyyy-MM-dd") ===
              format(new Date(), "yyyy-MM-dd")
                ? "Today's Orders"
                : "Orders"}
            </Typography>
          </Box>

          {/* Date Navigation - Full width on mobile */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, md: 1 },
              flexWrap: "wrap",
              justifyContent: { xs: "center", md: "flex-end" },
            }}
          >
            <IconButton
              onClick={handlePreviousDay}
              color="primary"
              size="small"
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: "0.875rem",
                    minWidth: { xs: "140px", md: "160px" },
                  },
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    variant: "outlined",
                  },
                }}
              />
            </LocalizationProvider>

            <IconButton onClick={handleNextDay} color="primary" size="small">
              <ArrowForwardIcon fontSize="small" />
            </IconButton>

            <Button
              variant={
                format(selectedDate, "yyyy-MM-dd") ===
                format(new Date(), "yyyy-MM-dd")
                  ? "contained"
                  : "outlined"
              }
              size="small"
              onClick={handleTodayButton}
              sx={{ minWidth: "auto", px: { xs: 1.5, md: 2 } }}
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
          batchFilter={batchFilter || "all"}
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
        <EnhancedBarcodeScanner
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
       

        <Box sx={{ mb: 2 }}>
          {/* Section Header */}
          <Typography
            variant="h6"
            sx={{ fontWeight: "bold", color: "primary.dark", mb: 2 }}
          >
            {viewMode === "individual"
              ? "Current Orders"
              : "Orders by Category"}
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
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                border: "1px dashed",
                borderColor: "divider",
              }}
            >
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
              {viewMode === "individual" && (
                <SummaryTable summary={filteredOrders} />
              )}
              {viewMode === "grouped" && (
                <CategoryGroupedTable groupedData={groupedData} />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

// Main wrapper component with mobile detection
export const TodaysOrderPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }
      >
        <MobileTodaysOrdersPage />
      </Suspense>
    );
  }

  return <DesktopTodaysOrderPage />;
};
