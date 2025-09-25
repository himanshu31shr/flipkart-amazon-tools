import { transactionsReducer, setOptimisticUpdate, fetchTransactions, saveTransactions } from '../transactionsSlice';

describe('transactionsSlice', () => {
  const initialState = {
    items: [],
    loading: false,
    error: null,
    lastFetched: null,
    pendingTransactions: {},
    
    // Inventory impact tracking
    transactionInventoryImpacts: {},
    inventoryMovements: [],
    inventoryLoading: false,
    inventoryError: null,
    
    // Processing state for inventory deductions
    processingInventoryDeductions: {},
    inventoryDeductionErrors: {},
    
    // Inventory sync status
    lastInventorySync: null,
    inventorySyncInProgress: false,
  };

  const mockTransactions = [
    {
      transactionId: '1',
      platform: 'amazon' as const,
      orderDate: '2023-01-01',
      sku: 'TEST-SKU-1',
      quantity: 1,
      sellingPrice: 100,
      description: 'Test transaction 1',
      expenses: { shippingFee: 10, marketplaceFee: 5, otherFees: 2 },
      product: { id: '1', name: 'Test Product 1' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      metadata: { createdAt: '2023-01-01', updatedAt: '2023-01-01' },
      hash: 'hash1'
    },
    {
      transactionId: '2',
      platform: 'flipkart' as const,
      orderDate: '2023-01-02',
      sku: 'TEST-SKU-2',
      quantity: 2,
      sellingPrice: 200,
      description: 'Test transaction 2',
      expenses: { shippingFee: 15, marketplaceFee: 8, otherFees: 3 },
      product: { id: '2', name: 'Test Product 2' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      metadata: { createdAt: '2023-01-02', updatedAt: '2023-01-02' },
      hash: 'hash2'
    },
  ] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(transactionsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle setOptimisticUpdate', () => {
      const action = setOptimisticUpdate(mockTransactions);
      const state = transactionsReducer(initialState, action);
      
      expect(state.items).toEqual(mockTransactions);
    });
  });

  describe('async thunks', () => {
    it('should handle fetchTransactions.pending when items array is empty', () => {
      const action = { type: fetchTransactions.pending.type };
      const state = transactionsReducer(initialState, action);
      
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should not set loading when items exist', () => {
      const stateWithItems = {
        ...initialState,
        items: mockTransactions,
      };
      
      const action = { type: fetchTransactions.pending.type };
      const state = transactionsReducer(stateWithItems, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetchTransactions.fulfilled', () => {
      const action = { 
        type: fetchTransactions.fulfilled.type, 
        payload: mockTransactions 
      };
      const state = transactionsReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.items).toEqual(mockTransactions);
      expect(state.lastFetched).toBeGreaterThan(0);
    });

    it('should handle fetchTransactions.rejected', () => {
      const action = { 
        type: fetchTransactions.rejected.type, 
        error: { message: 'Fetch failed' } 
      };
      const state = transactionsReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Fetch failed');
    });

    it('should handle saveTransactions.fulfilled', () => {
      const existingState = {
        ...initialState,
        items: [mockTransactions[0]],
      };
      
      const newTransactions = [mockTransactions[1]];
      const action = { 
        type: saveTransactions.fulfilled.type, 
        payload: newTransactions 
      };
      const state = transactionsReducer(existingState, action);
      
      expect(state.items).toEqual([...existingState.items, ...newTransactions]);
      expect(state.lastFetched).toBeGreaterThan(0);
    });
  });

  describe('state structure', () => {
    it('should maintain correct state structure', () => {
      const state = transactionsReducer(undefined, { type: 'unknown' });
      
      expect(state).toHaveProperty('items');
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('lastFetched');
      expect(state).toHaveProperty('pendingTransactions');
    });

    it('should have correct initial values', () => {
      const state = transactionsReducer(undefined, { type: 'unknown' });
      
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetched).toBeNull();
      expect(state.pendingTransactions).toEqual({});
    });
  });
}); 