import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction } from '../../types/transaction.type';
import { TransactionService } from '../../services/transaction.service';
import { CACHE_DURATIONS, shouldFetchData } from '../config';
import { 
  InventoryDeductionItem, 
  InventoryDeductionResult, 
  InventoryMovement
} from '../../types/inventory';
import { InventoryService } from '../../services/inventory.service';

interface TransactionsState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  pendingTransactions: Record<string, Transaction>;
  
  // Inventory impact tracking
  transactionInventoryImpacts: Record<string, InventoryDeductionResult>; // transactionId -> InventoryDeductionResult
  inventoryMovements: InventoryMovement[]; // Recent inventory movements from transactions
  inventoryLoading: boolean;
  inventoryError: string | null;
  
  // Processing state for inventory deductions
  processingInventoryDeductions: Record<string, boolean>; // transactionId -> isProcessing
  inventoryDeductionErrors: Record<string, string>; // transactionId -> error message
  
  // Inventory sync status
  lastInventorySync: number | null;
  inventorySyncInProgress: boolean;
}

const initialState: TransactionsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  pendingTransactions: {},
  
  // Inventory impact initial state
  transactionInventoryImpacts: {},
  inventoryMovements: [],
  inventoryLoading: false,
  inventoryError: null,
  
  // Processing state initial values
  processingInventoryDeductions: {},
  inventoryDeductionErrors: {},
  
  // Inventory sync initial state
  lastInventorySync: null,
  inventorySyncInProgress: false,
};

const transactionService = new TransactionService();
const inventoryService = new InventoryService();

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (_, { getState }) => {
    const state = getState() as { transactions: TransactionsState; auth: { isAuthenticated: boolean } };
    const { lastFetched, items } = state.transactions;
    const { isAuthenticated } = state.auth;
    
    if (!shouldFetchData(lastFetched, items, CACHE_DURATIONS.transactions, isAuthenticated)) {
      return items;
    }
    
    const response = await transactionService.getTransactions();
    return response;
  }
);

export const saveTransactions = createAsyncThunk(
  'transactions/saveTransactions',
  async (transactions: Transaction[], { dispatch, getState }) => {
    const state = getState() as { transactions: TransactionsState };
    const currentItems = state.transactions.items;
    
    // Optimistically update the UI
    const optimisticItems = [...currentItems, ...transactions];
    dispatch(setOptimisticUpdate(optimisticItems));
    
    try {
      await transactionService.saveTransactions(transactions);
      return transactions;
    } catch (error) {
      // Revert on failure
      dispatch(setOptimisticUpdate(currentItems));
      throw error;
    }
  }
);

// Inventory-related async thunks
export const saveTransactionsWithInventoryDeduction = createAsyncThunk(
  'transactions/saveTransactionsWithInventoryDeduction',
  async (params: {
    transactions: Transaction[];
    deductInventory?: boolean;
    inventoryItems?: InventoryDeductionItem[];
  }, { dispatch, getState }) => {
    const { transactions, deductInventory = true, inventoryItems } = params;
    const state = getState() as { transactions: TransactionsState };
    const currentItems = state.transactions.items;
    
    // Optimistically update the UI
    const optimisticItems = [...currentItems, ...transactions];
    dispatch(setOptimisticUpdate(optimisticItems));
    
    try {
      // Save transactions first
      await transactionService.saveTransactions(transactions);
      
      const inventoryDeductionResults: Record<string, InventoryDeductionResult> = {};
      
      // Process inventory deductions if enabled
      if (deductInventory && inventoryItems && inventoryItems.length > 0) {
        for (const transaction of transactions) {
          // Find inventory items for this transaction
          const transactionInventoryItems = inventoryItems.filter(
            item => item.transactionReference === transaction.id
          );
          
          if (transactionInventoryItems.length > 0) {
            const deductionResult = await inventoryService.deductInventoryFromOrder(
              transactionInventoryItems
            );
            if (transaction.id) {
              inventoryDeductionResults[transaction.id] = deductionResult;
            }
          }
        }
      }
      
      return { transactions, inventoryDeductionResults };
    } catch (error) {
      // Revert on failure
      dispatch(setOptimisticUpdate(currentItems));
      throw error;
    }
  }
);

export const processTransactionInventoryDeduction = createAsyncThunk(
  'transactions/processTransactionInventoryDeduction',
  async (params: {
    transactionId: string;
    inventoryItems: InventoryDeductionItem[];
  }) => {
    const { transactionId, inventoryItems } = params;
    
    const deductionResult = await inventoryService.deductInventoryFromOrder(inventoryItems);
    
    return { transactionId, deductionResult };
  }
);

export const fetchTransactionInventoryMovements = createAsyncThunk(
  'transactions/fetchTransactionInventoryMovements',
  async (transactionId: string) => {
    const movements = await inventoryService.getInventoryMovements({
      transactionReference: transactionId
    });
    
    return { transactionId, movements };
  }
);

export const syncTransactionInventoryImpacts = createAsyncThunk(
  'transactions/syncTransactionInventoryImpacts',
  async (_, { getState }) => {
    const state = getState() as { transactions: TransactionsState };
    const { items } = state.transactions;
    
    const movementsPromises = items.map(async (transaction) => {
      const movements = await inventoryService.getInventoryMovements({
        transactionReference: transaction.id
      });
      return { transactionId: transaction.id, movements };
    });
    
    const results = await Promise.all(movementsPromises);
    
    return results;
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setOptimisticUpdate: (state, action) => {
      state.items = action.payload;
    },
    
    // Inventory impact reducers
    updateTransactionInventoryImpact: (state, action: PayloadAction<{
      transactionId: string;
      deductionResult: InventoryDeductionResult;
    }>) => {
      const { transactionId, deductionResult } = action.payload;
      state.transactionInventoryImpacts[transactionId] = deductionResult;
    },
    
    setInventoryDeductionProcessing: (state, action: PayloadAction<{
      transactionId: string;
      isProcessing: boolean;
    }>) => {
      const { transactionId, isProcessing } = action.payload;
      state.processingInventoryDeductions[transactionId] = isProcessing;
    },
    
    setInventoryDeductionError: (state, action: PayloadAction<{
      transactionId: string;
      error: string;
    }>) => {
      const { transactionId, error } = action.payload;
      state.inventoryDeductionErrors[transactionId] = error;
      state.processingInventoryDeductions[transactionId] = false;
    },
    
    clearInventoryDeductionError: (state, action: PayloadAction<string>) => {
      const transactionId = action.payload;
      delete state.inventoryDeductionErrors[transactionId];
    },
    
    clearInventoryError: (state) => {
      state.inventoryError = null;
    },
    
    updateInventoryMovements: (state, action: PayloadAction<InventoryMovement[]>) => {
      state.inventoryMovements = action.payload;
    },
    
    addInventoryMovements: (state, action: PayloadAction<InventoryMovement[]>) => {
      // Add new movements and remove duplicates
      const existingIds = new Set(state.inventoryMovements.map(m => m.id).filter(Boolean));
      const newMovements = action.payload.filter(m => m.id && !existingIds.has(m.id));
      state.inventoryMovements = [...state.inventoryMovements, ...newMovements];
    },
    
    setInventorySyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.inventorySyncInProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        if (state.items.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch transactions';
      })
      .addCase(saveTransactions.fulfilled, (state, action) => {
        state.items = [...state.items, ...action.payload];
        state.lastFetched = Date.now();
      })
      
      // Save Transactions With Inventory Deduction
      .addCase(saveTransactionsWithInventoryDeduction.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.inventoryLoading = true;
        state.inventoryError = null;
      })
      .addCase(saveTransactionsWithInventoryDeduction.fulfilled, (state, action) => {
        const { transactions, inventoryDeductionResults } = action.payload;
        state.loading = false;
        state.inventoryLoading = false;
        state.items = [...state.items, ...transactions];
        state.lastFetched = Date.now();
        
        // Update inventory impacts
        Object.entries(inventoryDeductionResults).forEach(([transactionId, result]) => {
          state.transactionInventoryImpacts[transactionId] = result;
        });
        
        // Update sync timestamp
        state.lastInventorySync = Date.now();
      })
      .addCase(saveTransactionsWithInventoryDeduction.rejected, (state, action) => {
        state.loading = false;
        state.inventoryLoading = false;
        state.error = action.error.message || 'Failed to save transactions with inventory deduction';
        state.inventoryError = action.error.message || 'Failed to process inventory deductions';
      })
      
      // Process Transaction Inventory Deduction
      .addCase(processTransactionInventoryDeduction.pending, (state, action) => {
        const transactionId = action.meta.arg.transactionId;
        state.processingInventoryDeductions[transactionId] = true;
        delete state.inventoryDeductionErrors[transactionId];
      })
      .addCase(processTransactionInventoryDeduction.fulfilled, (state, action) => {
        const { transactionId, deductionResult } = action.payload;
        state.processingInventoryDeductions[transactionId] = false;
        state.transactionInventoryImpacts[transactionId] = deductionResult;
      })
      .addCase(processTransactionInventoryDeduction.rejected, (state, action) => {
        const transactionId = action.meta.arg.transactionId;
        state.processingInventoryDeductions[transactionId] = false;
        state.inventoryDeductionErrors[transactionId] = action.error.message || 'Failed to process inventory deduction';
      })
      
      // Fetch Transaction Inventory Movements
      .addCase(fetchTransactionInventoryMovements.pending, (state) => {
        state.inventoryLoading = true;
        state.inventoryError = null;
      })
      .addCase(fetchTransactionInventoryMovements.fulfilled, (state, action) => {
        state.inventoryLoading = false;
        const { movements } = action.payload;
        
        // Add new movements to the list
        const existingIds = new Set(state.inventoryMovements.map(m => m.id).filter(Boolean));
        const newMovements = movements.filter(m => m.id && !existingIds.has(m.id));
        state.inventoryMovements = [...state.inventoryMovements, ...newMovements];
      })
      .addCase(fetchTransactionInventoryMovements.rejected, (state, action) => {
        state.inventoryLoading = false;
        state.inventoryError = action.error.message || 'Failed to fetch transaction inventory movements';
      })
      
      // Sync Transaction Inventory Impacts
      .addCase(syncTransactionInventoryImpacts.pending, (state) => {
        state.inventorySyncInProgress = true;
        state.inventoryError = null;
      })
      .addCase(syncTransactionInventoryImpacts.fulfilled, (state, action) => {
        state.inventorySyncInProgress = false;
        
        // Clear existing movements and add all fetched movements
        const allMovements: InventoryMovement[] = [];
        action.payload.forEach(({ movements }) => {
          allMovements.push(...movements);
        });
        
        state.inventoryMovements = allMovements;
        state.lastInventorySync = Date.now();
      })
      .addCase(syncTransactionInventoryImpacts.rejected, (state, action) => {
        state.inventorySyncInProgress = false;
        state.inventoryError = action.error.message || 'Failed to sync transaction inventory impacts';
      });
  },
});

export const { 
  setOptimisticUpdate,
  updateTransactionInventoryImpact,
  setInventoryDeductionProcessing,
  setInventoryDeductionError,
  clearInventoryDeductionError,
  clearInventoryError,
  updateInventoryMovements,
  addInventoryMovements,
  setInventorySyncInProgress
} = transactionsSlice.actions;
// Inventory-related selectors
export const selectTransactionInventoryImpacts = (state: { transactions: TransactionsState }) => 
  state.transactions.transactionInventoryImpacts;

export const selectTransactionInventoryMovements = (state: { transactions: TransactionsState }) => 
  state.transactions.inventoryMovements;

export const selectInventoryLoading = (state: { transactions: TransactionsState }) => 
  state.transactions.inventoryLoading;

export const selectInventoryError = (state: { transactions: TransactionsState }) => 
  state.transactions.inventoryError;

export const selectProcessingInventoryDeductions = (state: { transactions: TransactionsState }) => 
  state.transactions.processingInventoryDeductions;

export const selectInventoryDeductionErrors = (state: { transactions: TransactionsState }) => 
  state.transactions.inventoryDeductionErrors;

export const selectLastInventorySync = (state: { transactions: TransactionsState }) => 
  state.transactions.lastInventorySync;

export const selectInventorySyncInProgress = (state: { transactions: TransactionsState }) => 
  state.transactions.inventorySyncInProgress;

// Helper selector to get transaction with inventory impact
export const selectTransactionWithInventoryImpact = (state: { transactions: TransactionsState }, transactionId: string) => {
  const transaction = state.transactions.items.find(t => t.id === transactionId);
  if (!transaction) return null;
  
  const inventoryImpact = state.transactions.transactionInventoryImpacts[transactionId];
  const isProcessingInventory = state.transactions.processingInventoryDeductions[transactionId] || false;
  const inventoryError = state.transactions.inventoryDeductionErrors[transactionId];
  const relatedMovements = state.transactions.inventoryMovements.filter(
    movement => movement.transactionReference === transactionId
  );
  
  return {
    ...transaction,
    inventoryImpact,
    isProcessingInventory,
    inventoryError,
    relatedMovements
  };
};

// Helper selector to get transactions with inventory issues
export const selectTransactionsWithInventoryIssues = (state: { transactions: TransactionsState }) => {
  return state.transactions.items.filter(transaction => {
    if (!transaction.id) return false;
    const impact = state.transactions.transactionInventoryImpacts[transaction.id];
    return impact && (impact.warnings.length > 0 || impact.errors.length > 0);
  });
};

// Helper selector to get transactions by inventory processing status
export const selectTransactionsByInventoryProcessingStatus = (state: { transactions: TransactionsState }, isProcessing: boolean) => {
  return state.transactions.items.filter(transaction => {
    if (!transaction.id) return false;
    const processing = state.transactions.processingInventoryDeductions[transaction.id] || false;
    return processing === isProcessing;
  });
};

export const transactionsReducer = transactionsSlice.reducer;
export default transactionsSlice.reducer; 