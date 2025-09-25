import allOrdersForAnalyticsReducer, { fetchAllOrdersForAnalytics } from '../allOrdersForAnalyticsSlice';

describe('allOrdersForAnalyticsSlice', () => {
  const initialState = {
    items: [],
    loading: false,
    error: null,
  };

  const mockOrderItems = [
    {
      sku: 'TEST-SKU-1',
      name: 'Test Product 1',
      quantity: 5,
      type: 'amazon',
      date: '2023-01-01',
    },
    {
      sku: 'TEST-SKU-2',
      name: 'Test Product 2',
      quantity: 3,
      type: 'flipkart',
      date: '2023-01-02',
    },
  ] as any;  

  it('should return the initial state', () => {
    expect(allOrdersForAnalyticsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle fetchAllOrdersForAnalytics.pending', () => {
    const action = { type: fetchAllOrdersForAnalytics.pending.type };
    const state = allOrdersForAnalyticsReducer(initialState, action);
    
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle fetchAllOrdersForAnalytics.fulfilled', () => {
    const action = { 
      type: fetchAllOrdersForAnalytics.fulfilled.type, 
      payload: mockOrderItems 
    };
    const state = allOrdersForAnalyticsReducer(initialState, action);
    
    expect(state.loading).toBe(false);
    expect(state.items).toEqual(mockOrderItems);
  });

  it('should handle fetchAllOrdersForAnalytics.rejected with payload', () => {
    const action = { 
      type: fetchAllOrdersForAnalytics.rejected.type, 
      payload: 'Fetch failed',
      error: { message: 'Error message' }
    };
    const state = allOrdersForAnalyticsReducer(initialState, action);
    
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Fetch failed');
  });

  it('should handle fetchAllOrdersForAnalytics.rejected without payload', () => {
    const action = { 
      type: fetchAllOrdersForAnalytics.rejected.type, 
      error: { message: 'Error message' }
    };
    const state = allOrdersForAnalyticsReducer(initialState, action);
    
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Error message');
  });

  it('should maintain state structure', () => {
    const state = allOrdersForAnalyticsReducer(undefined, { type: 'unknown' });
    
    expect(state).toHaveProperty('items');
    expect(state).toHaveProperty('loading');
    expect(state).toHaveProperty('error');
  });

  it('should have correct initial values', () => {
    const state = allOrdersForAnalyticsReducer(undefined, { type: 'unknown' });
    
    expect(state.items).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
}); 