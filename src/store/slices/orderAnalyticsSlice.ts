import { createSlice } from '@reduxjs/toolkit';

// Removed unused interfaces as components compute data from main state
// interface Metrics { ... }
// interface CategoryData { ... }
// interface SkuData { ... }
// interface ProductData { ... }

interface OrderAnalyticsState {
  // State simplified as data is computed in components from the main store slices
  metrics: null;
  categoryData: [];
  skuData: [];
  loading: boolean;
  error: string | null;
}

const initialState: OrderAnalyticsState = {
  metrics: null,
  categoryData: [],
  skuData: [],
  loading: false,
  error: null,
};

const orderAnalyticsSlice = createSlice({
  name: 'orderAnalytics',
  initialState,
  reducers: {},
});

export default orderAnalyticsSlice.reducer; 