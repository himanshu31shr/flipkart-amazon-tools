import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ProductSummary } from '../../home/services/base.transformer';
import { Category } from '../../../services/category.service';
import { Product } from '../../../services/product.service';
import { FilterState } from '../hooks/useOrderFilters';

type FilterKey = keyof FilterState;
type FilterValue = FilterState[FilterKey];
import CategoryOrdersChart from './CategoryOrdersChart';

interface OverviewTabProps {
  orders: ProductSummary[];
  products: Product[];
  categories: Category[];
  filterState: FilterState;
  onFilterUpdate: (key: FilterKey, value: FilterValue) => void;
  isLoading: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  orders,
  categories,
  isLoading,
}) => {
  if (isLoading) {
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

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Orders by Category
          </Typography>
          <CategoryOrdersChart
            orders={orders}
            categories={categories}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default OverviewTab; 