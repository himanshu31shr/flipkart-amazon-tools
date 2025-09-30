import { configureStore } from '@reduxjs/toolkit';
import { ordersReducer, selectFilteredOrders, setPlatformFilter, setBatchFilter } from '../ordersSlice';
import { ActiveOrder } from '../../../services/todaysOrder.service';
import type { OrdersState } from '../ordersSlice';

// Test state type
type TestState = { orders: OrdersState };

// Mock orders for testing
const mockOrders: ActiveOrder[] = [
  {
    name: 'Amazon Product 1',
    quantity: '2',
    type: 'amazon',
    SKU: 'AMZ001',
    batchInfo: {
      batchId: 'batch-1',
      uploadedAt: '2024-01-15T10:00:00Z',
      fileName: 'amazon-orders.pdf',
      platform: 'amazon',
      orderCount: 2,
      metadata: {
        userId: 'user1',
        selectedDate: '2024-01-15',
        processedAt: '2024-01-15T10:00:00Z',
      },
    },
  },
  {
    name: 'Flipkart Product 1',
    quantity: '1',
    type: 'flipkart',
    SKU: 'FLK001',
    batchInfo: {
      batchId: 'batch-2',
      uploadedAt: '2024-01-15T11:00:00Z',
      fileName: 'flipkart-orders.pdf',
      platform: 'flipkart',
      orderCount: 1,
      metadata: {
        userId: 'user1',
        selectedDate: '2024-01-15',
        processedAt: '2024-01-15T11:00:00Z',
      },
    },
  },
  {
    name: 'Amazon Product 2',
    quantity: '3',
    type: 'amazon',
    SKU: 'AMZ002',
    batchInfo: {
      batchId: 'batch-3',
      uploadedAt: '2024-01-15T12:00:00Z',
      fileName: 'more-amazon-orders.pdf',
      platform: 'amazon',
      orderCount: 1,
      metadata: {
        userId: 'user1',
        selectedDate: '2024-01-15',
        processedAt: '2024-01-15T12:00:00Z',
      },
    },
  },
];

describe('ordersSlice unified filtering', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        orders: ordersReducer,
      },
      preloadedState: {
        orders: {
          items: mockOrders,
          loading: false,
          error: null,
          lastFetched: null,
          pendingUpdates: {},
          batchFilter: null,
          platformFilter: 'all' as const,
          completionFilter: 'all' as const,
          batches: [],
          batchesLoading: false,
          selectedDate: null,
        },
      },
    });
  });

  it('should return all orders when no filters are applied', () => {
    const state = store.getState() as TestState;
    const filteredOrders = selectFilteredOrders(state);
    
    expect(filteredOrders).toHaveLength(3);
    expect(filteredOrders).toEqual(mockOrders);
  });

  it('should filter by platform only', () => {
    store.dispatch(setPlatformFilter('amazon'));
    
    const state = store.getState() as TestState;
    const filteredOrders = selectFilteredOrders(state);
    
    expect(filteredOrders).toHaveLength(2);
    expect(filteredOrders.every(order => order.type === 'amazon')).toBe(true);
  });

  it('should filter by batch only', () => {
    store.dispatch(setBatchFilter('batch-1'));
    
    const state = store.getState() as TestState;
    const filteredOrders = selectFilteredOrders(state);
    
    expect(filteredOrders).toHaveLength(1);
    expect(filteredOrders[0].batchInfo?.batchId).toBe('batch-1');
  });

  it('should filter by both platform and batch', () => {
    store.dispatch(setPlatformFilter('amazon'));
    store.dispatch(setBatchFilter('batch-3'));
    
    const state = store.getState() as TestState;
    const filteredOrders = selectFilteredOrders(state);
    
    expect(filteredOrders).toHaveLength(1);
    expect(filteredOrders[0].type).toBe('amazon');
    expect(filteredOrders[0].batchInfo?.batchId).toBe('batch-3');
  });

  it('should return no orders when filters do not match', () => {
    store.dispatch(setPlatformFilter('flipkart'));
    store.dispatch(setBatchFilter('batch-1')); // batch-1 is amazon only
    
    const state = store.getState() as TestState;
    const filteredOrders = selectFilteredOrders(state);
    
    expect(filteredOrders).toHaveLength(0);
  });

  it('should handle "all" values as no filtering', () => {
    // Set specific filters first
    store.dispatch(setPlatformFilter('amazon'));
    store.dispatch(setBatchFilter('batch-1'));
    
    let state = store.getState() as TestState;
    let filteredOrders = selectFilteredOrders(state);
    expect(filteredOrders).toHaveLength(1);

    // Now set back to "all"
    store.dispatch(setPlatformFilter('all'));
    store.dispatch(setBatchFilter('all'));
    
    state = store.getState() as TestState;
    filteredOrders = selectFilteredOrders(state);
    expect(filteredOrders).toHaveLength(3);
  });
});