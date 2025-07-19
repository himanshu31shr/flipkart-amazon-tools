import orderAnalyticsReducer from '../orderAnalyticsSlice';

describe('orderAnalyticsSlice', () => {
  const initialState = {
    metrics: null,
    categoryData: [],
    skuData: [],
    loading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(orderAnalyticsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle empty action and return current state', () => {
    const currentState = {
      metrics: null,
      categoryData: [] as [],
      skuData: [] as [],
      loading: true,
      error: 'Some error',
    };

    expect(orderAnalyticsReducer(currentState, { type: 'unknown' })).toEqual(currentState);
  });

  it('should maintain state structure', () => {
    const state = orderAnalyticsReducer(undefined, { type: 'unknown' });
    
    expect(state).toHaveProperty('metrics');
    expect(state).toHaveProperty('categoryData');
    expect(state).toHaveProperty('skuData');
    expect(state).toHaveProperty('loading');
    expect(state).toHaveProperty('error');
  });

  it('should have correct initial values', () => {
    const state = orderAnalyticsReducer(undefined, { type: 'unknown' });
    
    expect(state.metrics).toBeNull();
    expect(state.categoryData).toEqual([]);
    expect(state.skuData).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should be immutable', () => {
    const state1 = orderAnalyticsReducer(undefined, { type: 'unknown' });
    const state2 = orderAnalyticsReducer(state1, { type: 'unknown' });
    
    expect(state1).toEqual(state2);
    // Redux Toolkit uses Immer which returns the same reference if no changes
    expect(state1).toBe(state2); // Same object reference when no mutations
  });
}); 