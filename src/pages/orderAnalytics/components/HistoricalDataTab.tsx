import React from "react";
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import { ProductSummary } from "../../home/services/base.transformer";
import { Category } from "../../../services/category.service";
import { Product } from "../../../services/product.service";
import { FilterState } from "../hooks/useOrderFilters";

type FilterKey = keyof FilterState;
type FilterValue = FilterState[FilterKey];
import { useHistoricalData } from "../hooks/useHistoricalData";
import MergedCategoryTable from "./MergedCategoryTable";
import TopCategoriesSection from "./TopCategoriesSection";

interface HistoricalDataTabProps {
  orders: ProductSummary[];
  products: Product[];
  categories: Category[];
  filterState: FilterState;
  onFilterUpdate: (key: FilterKey, value: FilterValue) => void;
  isLoading: boolean;
}

const HistoricalDataTab: React.FC<HistoricalDataTabProps> = ({
  orders,
  categories,
  isLoading,
}) => {
  const {
    categoryData,
    topCategories,
    loading: historicalLoading,
  } = useHistoricalData({ orders, categories });

  if (isLoading || historicalLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!orders.length) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography variant="h6" color="text.secondary">
          No data available for historical analysis
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Top Categories Section - Moved to top */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TopCategoriesSection
          topCategories={topCategories}
          totalCategories={categoryData.length}
        />
      </Paper>

      {/* Merged Category Table - Combined All Categories & Category Distribution Details */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          All Categories & Distribution Details
        </Typography>
        <MergedCategoryTable
          historicalData={categoryData}
          orders={orders}
          categories={categories}
        />
      </Paper>
    </>
  );
};

export default HistoricalDataTab;
