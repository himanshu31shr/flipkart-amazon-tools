import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import { 
  fetchInventoryLevels,
  processInventoryDeductions,
  adjustInventoryManually 
} from '../slices/inventorySlice';
import { 
  fetchProductInventoryLevels,
  updateInventoryLevelsMapping 
} from '../slices/productsSlice';
import { 
  fetchCategoryInventoryLevels,
  updateCategoryInventoryLevels 
} from '../slices/categoriesSlice';
import { 
  saveTransactionsWithInventoryDeduction,
  syncTransactionInventoryImpacts,
  updateInventoryMovements 
} from '../slices/transactionsSlice';

/**
 * Inventory Synchronization Middleware
 * 
 * This middleware listens for inventory-related actions and ensures
 * data consistency across products, categories, and transactions slices.
 */
export const inventorySyncMiddleware = createListenerMiddleware();

// Listen for inventory level changes and sync across slices (without re-fetching)
inventorySyncMiddleware.startListening({
  matcher: isAnyOf(
    fetchInventoryLevels.fulfilled,
    adjustInventoryManually.fulfilled,
    processInventoryDeductions.fulfilled
  ),
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    
    try {
      // Use the payload from the fulfilled action instead of re-fetching
      const inventoryLevelsResult = action.payload;
      
      // Only sync if we have valid inventory data
      if (inventoryLevelsResult && Array.isArray(inventoryLevelsResult)) {
        // Sync with products slice
        dispatch(updateInventoryLevelsMapping(inventoryLevelsResult));
        
        // Sync with categories slice
        dispatch(updateCategoryInventoryLevels(inventoryLevelsResult));
        
        console.log('Inventory levels synchronized across slices');
      }
    } catch (error) {
      console.error('Failed to synchronize inventory levels:', error);
    }
  },
});

// Listen for product updates and sync inventory if needed
inventorySyncMiddleware.startListening({
  actionCreator: fetchProductInventoryLevels.fulfilled,
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    
    try {
      // Update categories with the same inventory data
      dispatch(updateCategoryInventoryLevels(action.payload));
      
      console.log('Product inventory levels synchronized with categories');
    } catch (error) {
      console.error('Failed to synchronize product inventory levels:', error);
    }
  },
});

// Listen for category inventory updates and sync with products
inventorySyncMiddleware.startListening({
  actionCreator: fetchCategoryInventoryLevels.fulfilled,
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    
    try {
      // Update products with the same inventory data
      dispatch(updateInventoryLevelsMapping(action.payload));
      
      console.log('Category inventory levels synchronized with products');
    } catch (error) {
      console.error('Failed to synchronize category inventory levels:', error);
    }
  },
});

// Listen for transaction inventory deductions and sync inventory movements
inventorySyncMiddleware.startListening({
  actionCreator: saveTransactionsWithInventoryDeduction.fulfilled,
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    
    try {
      // Sync transaction inventory impacts
      await dispatch(syncTransactionInventoryImpacts()).unwrap();
      
      // Only fetch inventory levels if the transaction had inventory deduction results
      if (action.payload?.inventoryDeductionResults && Object.keys(action.payload.inventoryDeductionResults).length > 0) {
        // Schedule inventory refresh to avoid immediate circular calls
        setTimeout(async () => {
          try {
            const inventoryLevelsResult = await dispatch(fetchInventoryLevels()).unwrap();
            dispatch(updateInventoryLevelsMapping(inventoryLevelsResult));
            dispatch(updateCategoryInventoryLevels(inventoryLevelsResult));
          } catch (error) {
            console.error('Failed to refresh inventory after transaction:', error);
          }
        }, 100); // Small delay to break immediate circular calls
      }
      
      console.log('Transaction inventory impacts synchronized');
    } catch (error) {
      console.error('Failed to synchronize transaction inventory impacts:', error);
    }
  },
});

// Listen for inventory movements and update related slices
inventorySyncMiddleware.startListening({
  actionCreator: updateInventoryMovements,
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    const state = listenerApi.getState() as RootState;
    
    try {
      // Check if inventory levels need to be refreshed based on movements
      const movements = action.payload;
      const hasRecentMovements = movements.some(movement => {
        const createdAt = movement.createdAt?.toDate();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return createdAt && createdAt > fiveMinutesAgo;
      });
      
      if (hasRecentMovements && !state.inventory?.loading.inventoryLevels) {
        // Schedule inventory refresh to avoid circular calls
        setTimeout(async () => {
          try {
            const inventoryLevelsResult = await dispatch(fetchInventoryLevels()).unwrap();
            dispatch(updateInventoryLevelsMapping(inventoryLevelsResult));
            dispatch(updateCategoryInventoryLevels(inventoryLevelsResult));
            console.log('Inventory levels refreshed due to recent movements');
          } catch (error) {
            console.error('Failed to refresh inventory after movements:', error);
          }
        }, 200); // Delay to break circular calls
      }
    } catch (error) {
      console.error('Failed to process inventory movements update:', error);
    }
  },
});

// Auto-sync on application startup or authentication change
inventorySyncMiddleware.startListening({
  predicate: (action, currentState, previousState) => {
    const current = currentState as RootState;
    const previous = previousState as RootState;
    
    // Trigger sync when user becomes authenticated
    return current.auth?.isAuthenticated && !previous.auth?.isAuthenticated;
  },
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch as AppDispatch;
    
    try {
      console.log('Starting inventory synchronization on authentication...');
      
      // Fetch fresh inventory levels
      const inventoryLevelsResult = await dispatch(fetchInventoryLevels()).unwrap();
      
      // Sync with all slices
      dispatch(updateInventoryLevelsMapping(inventoryLevelsResult));
      dispatch(updateCategoryInventoryLevels(inventoryLevelsResult));
      
      // Sync transaction inventory impacts
      await dispatch(syncTransactionInventoryImpacts()).unwrap();
      
      console.log('Initial inventory synchronization completed');
    } catch (error) {
      console.error('Failed to perform initial inventory synchronization:', error);
    }
  },
});

// Periodic inventory synchronization (every 5 minutes)
let syncInterval: NodeJS.Timeout | null = null;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 30000; // Minimum 30 seconds between syncs

inventorySyncMiddleware.startListening({
  predicate: (action, currentState) => {
    const state = currentState as RootState;
    return state.auth?.isAuthenticated || false;
  },
  effect: async (action, listenerApi) => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    syncInterval = setInterval(async () => {
      const dispatch = listenerApi.dispatch as AppDispatch;
      const state = listenerApi.getState() as RootState;
      const now = Date.now();
      
      // Only sync if user is still authenticated, not already syncing, and enough time has passed
      if (state.auth?.isAuthenticated && 
          !state.inventory?.loading.inventoryLevels && 
          (now - lastSyncTime) > MIN_SYNC_INTERVAL) {
        try {
          console.log('Performing periodic inventory synchronization...');
          lastSyncTime = now;
          
          const inventoryLevelsResult = await dispatch(fetchInventoryLevels()).unwrap();
          dispatch(updateInventoryLevelsMapping(inventoryLevelsResult));
          dispatch(updateCategoryInventoryLevels(inventoryLevelsResult));
          
          console.log('Periodic inventory synchronization completed');
        } catch (error) {
          console.error('Failed to perform periodic inventory synchronization:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  },
});

// Clean up interval on logout
inventorySyncMiddleware.startListening({
  predicate: (action, currentState, previousState) => {
    const current = currentState as RootState;
    const previous = previousState as RootState;
    
    // Trigger cleanup when user becomes unauthenticated
    return !current.auth?.isAuthenticated && previous.auth?.isAuthenticated;
  },
  effect: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('Inventory synchronization interval cleared');
    }
  },
});

export default inventorySyncMiddleware;