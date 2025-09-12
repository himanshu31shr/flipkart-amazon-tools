import { createAsyncThunk, createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { ActiveOrder, TodaysOrder } from '../../services/todaysOrder.service';
import { CACHE_DURATIONS, shouldFetchData } from '../config';
import { batchService } from '../../services/batch.service';
import { BatchInfo } from '../../types/transaction.type';

interface OrdersState {
  items: ActiveOrder[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  pendingUpdates: Record<string, ProductSummary[]>;
  // Filtering state
  batchFilter: string | null; // null means show all, string means filter by batch ID
  platformFilter: 'all' | 'amazon' | 'flipkart'; // platform filter
  batches: BatchInfo[];
  batchesLoading: boolean;
  selectedDate: string | null; // For fetching batches for a specific date
}

const initialState: OrdersState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  pendingUpdates: {},
  batchFilter: null,
  platformFilter: 'all',
  batches: [],
  batchesLoading: false,
  selectedDate: null,
};

const orderService = new TodaysOrder();

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { getState }) => {
    const state = getState() as { orders: OrdersState; auth: { isAuthenticated: boolean } };
    const { lastFetched, items } = state.orders;
    const { isAuthenticated } = state.auth;
    
    if (!shouldFetchData(lastFetched, items, CACHE_DURATIONS.orders, isAuthenticated)) {
      return items;
    }
    
    const response = await orderService.getTodaysOrders();
    return response?.orders || [];
  }
);

export const fetchOrdersForDate = createAsyncThunk(
  'orders/fetchOrdersForDate',
  async (date: string) => {
    const response = await orderService.getOrdersForDate(date);
    return response?.orders || [];
  }
);

export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAllOrders',
  async (_, { getState }) => {
    const state = getState() as { orders: OrdersState; auth: { isAuthenticated: boolean } };
    const { lastFetched, items } = state.orders;
    const { isAuthenticated } = state.auth;
    
    if (!shouldFetchData(lastFetched, items, CACHE_DURATIONS.orders, isAuthenticated)) {
      return items;
    }
    
    const orders = await orderService.getLastThirtyDaysOrders();
    const allOrders = orders.reduce((acc, day) => {
      return [...acc, ...day.orders.map(order => ({
        ...order,
        createdAt: day.date
      }))]
    }, [] as (ActiveOrder & { createdAt: string })[]);
    
    return allOrders;
  }
);

export const updateOrders = createAsyncThunk(
  'orders/updateOrders',
  async ({ orders, date }: { orders: ProductSummary[]; date: string }, { dispatch }) => {
    
    // Optimistically update the UI
    dispatch(setPendingUpdate({ date, orders }));
    
    try {
      await orderService.updateTodaysOrder({
        orders,
        date,
        id: date,
      });
      return { orders, date };
    } catch (error) {
      // Revert on failure
      dispatch(clearPendingUpdate(date));
      throw error;
    }
  }
);

// Batch-related async thunks
export const fetchBatchesForDate = createAsyncThunk(
  'orders/fetchBatchesForDate',
  async (date: string) => {
    const response = await batchService.getBatchesForDate(date);
    if (response.success) {
      return response.batches || [];
    }
    throw new Error(response.error || 'Failed to fetch batches');
  }
);

export const fetchBatchesForToday = createAsyncThunk(
  'orders/fetchBatchesForToday',
  async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await batchService.getBatchesForDate(today);
    if (response.success) {
      return response.batches || [];
    }
    throw new Error(response.error || 'Failed to fetch batches for today');
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setPendingUpdate: (state, action) => {
      const { date, orders } = action.payload;
      state.pendingUpdates[date] = orders;
    },
    clearPendingUpdate: (state, action) => {
      const date = action.payload;
      delete state.pendingUpdates[date];
    },
    // Filtering reducers
    setBatchFilter: (state, action: PayloadAction<string | null>) => {
      state.batchFilter = action.payload;
    },
    clearBatchFilter: (state) => {
      state.batchFilter = null;
    },
    setPlatformFilter: (state, action: PayloadAction<'all' | 'amazon' | 'flipkart'>) => {
      state.platformFilter = action.payload;
    },
    clearPlatformFilter: (state) => {
      state.platformFilter = 'all';
    },
    clearAllFilters: (state) => {
      state.batchFilter = null;
      state.platformFilter = 'all';
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        if (state.items.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      .addCase(fetchOrdersForDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdersForDate.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchOrdersForDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders for date';
      })
      .addCase(updateOrders.fulfilled, (state, action) => {
        const { date } = action.payload;
        delete state.pendingUpdates[date];
        state.lastFetched = null; // Force refresh on next fetch
      })
      // Batch thunk reducers
      .addCase(fetchBatchesForDate.pending, (state) => {
        state.batchesLoading = true;
        state.error = null;
      })
      .addCase(fetchBatchesForDate.fulfilled, (state, action) => {
        state.batchesLoading = false;
        state.batches = action.payload;
      })
      .addCase(fetchBatchesForDate.rejected, (state, action) => {
        state.batchesLoading = false;
        state.error = action.error.message || 'Failed to fetch batches for date';
      })
      .addCase(fetchBatchesForToday.pending, (state) => {
        state.batchesLoading = true;
        state.error = null;
      })
      .addCase(fetchBatchesForToday.fulfilled, (state, action) => {
        state.batchesLoading = false;
        state.batches = action.payload;
      })
      .addCase(fetchBatchesForToday.rejected, (state, action) => {
        state.batchesLoading = false;
        state.error = action.error.message || 'Failed to fetch batches for today';
      });
  },
});

export const { 
  setPendingUpdate, 
  clearPendingUpdate, 
  setBatchFilter, 
  clearBatchFilter,
  setPlatformFilter,
  clearPlatformFilter,
  clearAllFilters,
  setSelectedDate 
} = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;

// Comprehensive selector that handles both platform and batch filtering
export const selectFilteredOrders = createSelector(
  [
    (state: { orders: OrdersState }) => state.orders.items, 
    (state: { orders: OrdersState }) => state.orders.batchFilter,
    (state: { orders: OrdersState }) => state.orders.platformFilter
  ],
  (items, batchFilter, platformFilter) => {
    let filteredItems = items;
    
    // Apply platform filter first
    if (platformFilter && platformFilter !== 'all') {
      filteredItems = filteredItems.filter(order => order.type === platformFilter);
    }
    
    // Apply batch filter
    if (batchFilter && batchFilter !== 'all') {
      filteredItems = filteredItems.filter(order => 
        order.batchInfo?.batchId === batchFilter
      );
    }
    
    return filteredItems;
  }
);

export const selectOrdersByBatch = createSelector(
  [selectFilteredOrders],
  (filteredOrders) => {
    // Group the already filtered orders by batch ID
    const grouped: Record<string, ActiveOrder[]> = {};
    
    filteredOrders.forEach(order => {
      const batchId = order.batchInfo?.batchId || 'no-batch';
      
      if (!grouped[batchId]) {
        grouped[batchId] = [];
      }
      grouped[batchId].push(order);
    });
    
    return grouped;
  }
); 