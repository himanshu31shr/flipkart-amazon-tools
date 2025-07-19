import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Badge,
  Button,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { format } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { fetchAllOrdersForAnalytics } from "../../store/slices/allOrdersForAnalyticsSlice";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DateRangeFilter from "./components/DateRangeFilter";
import FilterPopover from "./components/FilterPopover";
import { useOrderFilters } from "./hooks/useOrderFilters";
import HistoricalDataTab from "./components/HistoricalDataTab";
import OverviewTab from "./components/OverviewTab";
import OrderMetrics from "./components/OrderMetrics";

const OrderAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: allOrders,
    loading: allOrdersLoading,
    error: allOrdersError,
  } = useSelector((state: RootState) => state.allOrdersForAnalytics);
  const {
    items: products,
    loading: productsLoading,
    error: productsError,
  } = useSelector((state: RootState) => state.products);
  const {
    items: categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useSelector((state: RootState) => state.categories);

  // State for popovers
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [dateAnchorEl, setDateAnchorEl] = useState<null | HTMLElement>(null);

  // Use custom hook for filters
  const {
    filterState,
    skuOptions,
    platformOptions,
    productOptions,
    filteredOrders,
    updateFilter,
    clearFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useOrderFilters({ allOrders: allOrders as any, categories, products });

  // Memoized loading and error states
  const isLoading = useMemo(() => 
    allOrdersLoading || productsLoading || categoriesLoading, 
    [allOrdersLoading, productsLoading, categoriesLoading]
  );
  
  const error = useMemo(() => 
    allOrdersError || productsError || categoriesError, 
    [allOrdersError, productsError, categoriesError]
  );

  // Memoized data fetching logic
  useEffect(() => {
    const fetchData = async () => {
      const promises = [];
      
      if (allOrders.length === 0 && !allOrdersLoading && !allOrdersError) {
        promises.push(dispatch(fetchAllOrdersForAnalytics()));
      }
      if (products.length === 0 && !productsLoading && !productsError) {
        promises.push(dispatch(fetchProducts({})));
      }
      if (categories.length === 0 && !categoriesLoading && !categoriesError) {
        promises.push(dispatch(fetchCategories()));
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    };

    fetchData();
  }, [
    allOrders.length, allOrdersLoading, allOrdersError,
    products.length, productsLoading, productsError,
    categories.length, categoriesLoading, categoriesError,
    dispatch
  ]);

  // Memoized popover handlers
  const handleFilterClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  const handleDateClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setDateAnchorEl(event.currentTarget);
  }, []);

  const handleDateClose = useCallback(() => {
    setDateAnchorEl(null);
  }, []);

  // Memoized active filter count
  const activeFilterCount = useMemo(() => [
    filterState.selectedCategory,
    filterState.selectedSku,
    filterState.selectedPlatform,
    filterState.selectedProduct,
  ].filter(Boolean).length, [filterState]);

  // Memoized date range summary
  const dateSummary = useMemo(() => 
    `${format(filterState.dateRange.startDate, "dd MMM yyyy")} - ${format(filterState.dateRange.endDate, "dd MMM yyyy")}`,
    [filterState.dateRange.startDate, filterState.dateRange.endDate]
  );

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error" variant="h6">
          Error: {error}
        </Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4">Order Analytics</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<CalendarTodayIcon />}
              onClick={handleDateClick}
              sx={{ textTransform: "none" }}
            >
              {dateSummary}
            </Button>
            <IconButton
              onClick={handleFilterClick}
              color={activeFilterCount > 0 ? "primary" : "default"}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={activeFilterCount} color="primary">
                <FilterListIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>

        <DateRangeFilter
          dateRange={filterState.dateRange}
          onDateRangeChange={(startDate, endDate) =>
            updateFilter("dateRange", { startDate, endDate })
          }
          anchorEl={dateAnchorEl}
          onClose={handleDateClose}
        />

        <FilterPopover
          anchorEl={filterAnchorEl}
          onClose={handleFilterClose}
          categories={categories}
          selectedCategory={filterState.selectedCategory}
          selectedSku={filterState.selectedSku}
          selectedPlatform={filterState.selectedPlatform}
          selectedProduct={filterState.selectedProduct}
          skuOptions={skuOptions}
          platformOptions={platformOptions}
          productOptions={productOptions}
          onCategoryChange={(category) =>
            updateFilter("selectedCategory", category)
          }
          onSkuChange={(sku) => updateFilter("selectedSku", sku)}
          onPlatformChange={(platform) =>
            updateFilter("selectedPlatform", platform)
          }
          onProductChange={(product) =>
            updateFilter("selectedProduct", product)
          }
          onClearFilters={clearFilters}
        />

        {/* Order Metrics Section - Moved to top */}
        <OrderMetrics
          orders={filteredOrders}
          products={products}
          categories={categories}
        />

        {/* Category Analytics Section - Top 10 Categories */}
        <HistoricalDataTab
          orders={filteredOrders}
          products={products}
          categories={categories}
          filterState={filterState}
          onFilterUpdate={updateFilter}
          isLoading={isLoading}
        />
        
        {/* Overview Section */}
        <Box mt={4}>
          <OverviewTab
            orders={filteredOrders}
            products={products}
            categories={categories}
            filterState={filterState}
            onFilterUpdate={updateFilter}
            isLoading={isLoading}
          />
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default OrderAnalytics;
