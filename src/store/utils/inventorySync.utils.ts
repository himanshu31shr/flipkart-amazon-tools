import { InventoryLevel } from '../../types/inventory';
import type { AppDispatch, RootState } from '../index';
import {
  selectCategoryInventoryLevels,
  updateCategoryInventoryLevels
} from '../slices/categoriesSlice';
import {
  fetchInventoryLevels,
  selectInventoryLevels,
  selectInventoryLoading
} from '../slices/inventorySlice';
import {
  selectProductInventoryLevels,
  updateInventoryLevelsMapping
} from '../slices/productsSlice';
import {
  syncTransactionInventoryImpacts
} from '../slices/transactionsSlice';

/**
 * Cross-slice inventory synchronization utilities
 */

export interface InventorySyncOptions {
  forceRefresh?: boolean;
  includeTransactions?: boolean;
  includeProducts?: boolean;
  includeCategories?: boolean;
}

export interface InventorySyncResult {
  success: boolean;
  inventoryLevels: InventoryLevel[];
  errors: string[];
  warnings: string[];
  syncedSlices: string[];
}

/**
 * Comprehensive inventory synchronization across all slices
 */
export const syncInventoryAcrossSlices = async (
  dispatch: AppDispatch,
  getState: () => RootState,
  options: InventorySyncOptions = {}
): Promise<InventorySyncResult> => {
  const {
    forceRefresh = false,
    includeTransactions = true,
    includeProducts = true,
    includeCategories = true
  } = options;

  const result: InventorySyncResult = {
    success: false,
    inventoryLevels: [],
    errors: [],
    warnings: [],
    syncedSlices: []
  };

  try {
    const state = getState();
    
    // Check if we need to fetch fresh data
    const shouldFetch = forceRefresh || 
      !state.inventory.lastFetched.inventoryLevels ||
      Date.now() - state.inventory.lastFetched.inventoryLevels > 60000; // 1 minute cache

    let inventoryLevels: InventoryLevel[];

    if (shouldFetch) {
      console.log('Fetching fresh inventory levels...');
      inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
    } else {
      inventoryLevels = selectInventoryLevels(state);
    }

    result.inventoryLevels = inventoryLevels;

    // Sync with products slice
    if (includeProducts) {
      try {
        dispatch(updateInventoryLevelsMapping(inventoryLevels));
        result.syncedSlices.push('products');
        console.log('Successfully synced with products slice');
      } catch (error) {
        const errorMsg = `Failed to sync with products slice: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Sync with categories slice
    if (includeCategories) {
      try {
        dispatch(updateCategoryInventoryLevels(inventoryLevels));
        result.syncedSlices.push('categories');
        console.log('Successfully synced with categories slice');
      } catch (error) {
        const errorMsg = `Failed to sync with categories slice: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Sync with transactions slice
    if (includeTransactions) {
      try {
        await dispatch(syncTransactionInventoryImpacts()).unwrap();
        result.syncedSlices.push('transactions');
        console.log('Successfully synced with transactions slice');
      } catch (error) {
        const errorMsg = `Failed to sync with transactions slice: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    
    if (result.success) {
      console.log(`Inventory synchronization completed successfully. Synced slices: ${result.syncedSlices.join(', ')}`);
    } else {
      console.warn(`Inventory synchronization completed with errors: ${result.errors.join('; ')}`);
    }

    return result;

  } catch (error) {
    const errorMsg = `Critical error during inventory synchronization: ${(error as Error).message}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
    return result;
  }
};

/**
 * Validate inventory data consistency across slices
 */
export const validateInventoryConsistency = (state: RootState): {
  isConsistent: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const inventoryLevels = selectInventoryLevels(state);
  const productInventoryLevels = selectProductInventoryLevels(state);
  const categoryInventoryLevels = selectCategoryInventoryLevels(state);

  // Check if inventory slice has data
  if (inventoryLevels.length === 0) {
    issues.push('No inventory levels found in inventory slice');
    recommendations.push('Fetch inventory levels using fetchInventoryLevels action');
  }

  // Check consistency between inventory and products
  const inventoryLevelIds = new Set(inventoryLevels.map(level => level.categoryGroupId));
  const productLevelIds = new Set(Object.keys(productInventoryLevels));

  if (inventoryLevelIds.size !== productLevelIds.size) {
    issues.push('Mismatch in inventory levels count between inventory and products slices');
    recommendations.push('Sync inventory levels using updateInventoryLevelsMapping action');
  }

  // Check for missing category group mappings
  inventoryLevelIds.forEach(id => {
    if (!productLevelIds.has(id)) {
      issues.push(`Category group ${id} missing from products inventory mapping`);
    }
  });

  // Check consistency between inventory and categories
  const categoryLevelIds = new Set(Object.keys(categoryInventoryLevels));

  if (inventoryLevelIds.size !== categoryLevelIds.size) {
    issues.push('Mismatch in inventory levels count between inventory and categories slices');
    recommendations.push('Sync inventory levels using updateCategoryInventoryLevels action');
  }

  // Check for stale data (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  if (state.inventory.lastFetched.inventoryLevels && 
      state.inventory.lastFetched.inventoryLevels < fiveMinutesAgo) {
    issues.push('Inventory levels data is stale (older than 5 minutes)');
    recommendations.push('Refresh inventory levels to ensure data accuracy');
  }

  // Check for loading states that might indicate sync issues
  if (selectInventoryLoading(state).inventoryLevels) {
    issues.push('Inventory levels are currently loading');
    recommendations.push('Wait for inventory loading to complete before validating consistency');
  }

  return {
    isConsistent: issues.length === 0,
    issues,
    recommendations
  };
};

/**
 * Get aggregated inventory status across all slices
 */
export const getAggregatedInventoryStatus = (state: RootState): {
  totalProducts: number;
  totalCategories: number;
  totalCategoryGroups: number;
  lowStockCount: number;
  zeroStockCount: number;
  healthyCount: number;
  lastSyncTime: number | null;
  isLoadingAny: boolean;
} => {
  const inventoryLevels = selectInventoryLevels(state);
  const productInventoryStatus = state.products.productInventoryStatus;
  const categoryInventoryStatus = state.categories.categoryInventoryStatus;

  // Count inventory statuses
  const statusCounts = inventoryLevels.reduce(
    (acc, level) => {
      switch (level.status) {
        case 'low_stock':
          acc.lowStockCount++;
          break;
        case 'zero_stock':
        case 'negative_stock':
          acc.zeroStockCount++;
          break;
        case 'healthy':
          acc.healthyCount++;
          break;
      }
      return acc;
    },
    { lowStockCount: 0, zeroStockCount: 0, healthyCount: 0 }
  );

  // Check if any slice is loading
  const isLoadingAny = 
    selectInventoryLoading(state).inventoryLevels ||
    state.products.inventoryLoading ||
    state.categories.inventoryLoading ||
    state.transactions.inventoryLoading;

  // Get the most recent sync time
  const syncTimes = [
    state.inventory.lastFetched.inventoryLevels,
    state.transactions.lastInventorySync
  ].filter((time): time is number => typeof time === 'number');

  const lastSyncTime = syncTimes.length > 0 ? Math.max(...syncTimes) : null;

  return {
    totalProducts: Object.keys(productInventoryStatus).length,
    totalCategories: Object.keys(categoryInventoryStatus).length,
    totalCategoryGroups: inventoryLevels.length,
    ...statusCounts,
    lastSyncTime,
    isLoadingAny
  };
};

/**
 * Helper to trigger inventory refresh for specific category groups
 */
export const refreshInventoryForCategoryGroups = async (
  dispatch: AppDispatch,
  categoryGroupIds: string[]
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Fetch fresh inventory levels
    const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
    
    // Filter for requested category groups
    const filteredLevels = inventoryLevels.filter(level => 
      categoryGroupIds.includes(level.categoryGroupId)
    );

    if (filteredLevels.length !== categoryGroupIds.length) {
      const foundIds = filteredLevels.map(level => level.categoryGroupId);
      const missingIds = categoryGroupIds.filter(id => !foundIds.includes(id));
      errors.push(`Category groups not found: ${missingIds.join(', ')}`);
    }

    // Update all slices with fresh data
    dispatch(updateInventoryLevelsMapping(inventoryLevels));
    dispatch(updateCategoryInventoryLevels(inventoryLevels));

    console.log(`Refreshed inventory for category groups: ${categoryGroupIds.join(', ')}`);

    return { success: errors.length === 0, errors };

  } catch (error) {
    const errorMsg = `Failed to refresh inventory for category groups: ${(error as Error).message}`;
    errors.push(errorMsg);
    console.error(errorMsg);
    return { success: false, errors };
  }
};

/**
 * Batch update inventory levels across slices
 */
export const batchUpdateInventoryLevels = (
  dispatch: AppDispatch,
  inventoryLevels: InventoryLevel[]
): void => {
  // Update all slices atomically
  dispatch(updateInventoryLevelsMapping(inventoryLevels));
  dispatch(updateCategoryInventoryLevels(inventoryLevels));
  
  console.log(`Batch updated ${inventoryLevels.length} inventory levels across slices`);
};

/**
 * Check if inventory sync is needed based on last fetch times
 */
export const isInventorySyncNeeded = (
  state: RootState,
  maxAgeMinutes: number = 5
): boolean => {
  const maxAge = maxAgeMinutes * 60 * 1000;
  const now = Date.now();

  const lastFetched = state.inventory.lastFetched.inventoryLevels;
  
  return !lastFetched || (now - lastFetched) > maxAge;
};