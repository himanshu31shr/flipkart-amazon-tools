import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { ActiveOrder, TodaysOrder } from '../../services/todaysOrder.service';
import { CACHE_DURATIONS, shouldFetchData } from '../config';

interface OrdersState {
  items: ActiveOrder[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  pendingUpdates: Record<string, ProductSummary[]>;
}

const initialState: OrdersState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  pendingUpdates: {},
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
      });
  },
});

export const { setPendingUpdate, clearPendingUpdate } = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer; 