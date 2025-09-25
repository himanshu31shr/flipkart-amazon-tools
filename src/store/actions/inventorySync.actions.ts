import { createAsyncThunk } from '@reduxjs/toolkit';
import { Product } from '../../services/product.service';
import {
  InventoryDeductionItem,
  ManualInventoryAdjustment
} from '../../types/inventory';
import { Transaction } from '../../types/transaction.type';
import type { RootState } from '../index';
import {
  fetchCategoryGroups,
  updateCategoryInventoryLevels
} from '../slices/categoriesSlice';
import {
  adjustInventoryManually,
  fetchInventoryLevels
} from '../slices/inventorySlice';
import {
  bulkUpdateProductsWithInventorySync,
  updateInventoryLevelsMapping
} from '../slices/productsSlice';
import {
  saveTransactionsWithInventoryDeduction,
  syncTransactionInventoryImpacts
} from '../slices/transactionsSlice';

/**
 * Cross-slice inventory synchronization actions
 * These actions coordinate updates across multiple slices to maintain data consistency
 */

/**
 * Initialize all inventory-related data across slices
 */
export const initializeInventoryData = createAsyncThunk(
  'inventory/initializeInventoryData',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    try {
      console.log('Initializing inventory data across all slices...');
      
      // 1. Fetch category groups first (needed for inventory level mapping)
      await dispatch(fetchCategoryGroups()).unwrap();
      
      // 2. Fetch inventory levels
      const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
      
      // 3. Sync with products slice
      dispatch(updateInventoryLevelsMapping(inventoryLevels));
      
      // 4. Sync with categories slice
      dispatch(updateCategoryInventoryLevels(inventoryLevels));
      
      // 5. Sync transaction inventory impacts
      await dispatch(syncTransactionInventoryImpacts()).unwrap();
      
      console.log('Inventory data initialization completed successfully');
      
      return {
        inventoryLevels,
        categoryGroupsCount: state.categories.categoryGroups.length,
        productsCount: state.products.items.length,
        transactionsCount: state.transactions.items.length
      };
      
    } catch (error) {
      console.error('Failed to initialize inventory data:', error);
      throw error;
    }
  }
);

/**
 * Comprehensive inventory refresh across all slices
 */
export const refreshAllInventoryData = createAsyncThunk(
  'inventory/refreshAllInventoryData',
  async (forceRefresh: boolean = true, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    try {
      console.log('Refreshing all inventory data...');
      
      // Always fetch fresh inventory levels
      const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
      
      // Update all slices with fresh data
      dispatch(updateInventoryLevelsMapping(inventoryLevels));
      dispatch(updateCategoryInventoryLevels(inventoryLevels));
      
      // Refresh transaction inventory impacts
      await dispatch(syncTransactionInventoryImpacts()).unwrap();
      
      // Refresh category groups if needed
      if (forceRefresh || state.categories.categoryGroups.length === 0) {
        await dispatch(fetchCategoryGroups()).unwrap();
      }
      
      console.log('All inventory data refreshed successfully');
      
      return {
        inventoryLevels,
        refreshTimestamp: Date.now(),
        refreshedSlices: ['inventory', 'products', 'categories', 'transactions']
      };
      
    } catch (error) {
      console.error('Failed to refresh all inventory data:', error);
      throw error;
    }
  }
);

/**
 * Process order with inventory deduction and cross-slice updates
 */
export const processOrderWithInventorySync = createAsyncThunk(
  'inventory/processOrderWithInventorySync',
  async (params: {
    transactions: Transaction[];
    inventoryItems: InventoryDeductionItem[];
    updateProducts?: boolean;
  }, { dispatch }) => {
    const { transactions, inventoryItems, updateProducts = true } = params;
    
    try {
      console.log('Processing order with inventory synchronization...');
      
      // 1. Save transactions with inventory deduction
      const result = await dispatch(saveTransactionsWithInventoryDeduction({
        transactions,
        deductInventory: true,
        inventoryItems
      })).unwrap();
      
      // 2. Refresh inventory levels after deduction
      const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
      
      // 3. Update products and categories with fresh inventory data
      dispatch(updateInventoryLevelsMapping(inventoryLevels));
      dispatch(updateCategoryInventoryLevels(inventoryLevels));
      
      // 4. Update product inventory statuses if requested
      if (updateProducts) {
        // TODO: Implement product-categoryGroup mapping logic when available
        // For now, inventory levels are already updated above
      }
      
      console.log('Order processing with inventory sync completed successfully');
      
      return {
        transactions: result.transactions,
        inventoryDeductionResults: result.inventoryDeductionResults,
        updatedInventoryLevels: inventoryLevels,
        processedAt: Date.now()
      };
      
    } catch (error) {
      console.error('Failed to process order with inventory sync:', error);
      throw error;
    }
  }
);

/**
 * Manual inventory adjustment with cross-slice synchronization
 */
export const adjustInventoryWithSync = createAsyncThunk(
  'inventory/adjustInventoryWithSync',
  async (adjustment: ManualInventoryAdjustment, { dispatch }) => {
    try {
      console.log('Processing manual inventory adjustment with synchronization...');
      
      // 1. Perform the manual adjustment
      await dispatch(adjustInventoryManually(adjustment)).unwrap();
      
      // 2. Fetch updated inventory levels
      const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
      
      // 3. Sync with all slices
      dispatch(updateInventoryLevelsMapping(inventoryLevels));
      dispatch(updateCategoryInventoryLevels(inventoryLevels));
      
      console.log('Manual inventory adjustment with sync completed successfully');
      
      return {
        adjustment,
        updatedInventoryLevels: inventoryLevels,
        adjustedAt: Date.now()
      };
      
    } catch (error) {
      console.error('Failed to adjust inventory with sync:', error);
      throw error;
    }
  }
);

/**
 * Bulk update products with inventory synchronization
 */
export const bulkUpdateProductsWithInventory = createAsyncThunk(
  'inventory/bulkUpdateProductsWithInventory',
  async (params: {
    skus: string[];
    data: Partial<Product>;
    syncInventory?: boolean;
  }, { dispatch }) => {
    const { skus, data, syncInventory = true } = params;
    
    try {
      console.log('Bulk updating products with inventory synchronization...');
      
      // 1. Update products with inventory sync
      const result = await dispatch(bulkUpdateProductsWithInventorySync({
        skus,
        data,
        syncInventory
      })).unwrap();
      
      // 2. If inventory was synced, update categories as well
      if (syncInventory && result.inventoryLevels.length > 0) {
        dispatch(updateCategoryInventoryLevels(result.inventoryLevels));
      }
      
      console.log('Bulk product update with inventory sync completed successfully');
      
      return {
        updatedSkus: skus,
        updates: data,
        inventoryLevels: result.inventoryLevels,
        updatedAt: Date.now()
      };
      
    } catch (error) {
      console.error('Failed to bulk update products with inventory sync:', error);
      throw error;
    }
  }
);

/**
 * Validate and repair inventory consistency across slices
 */
export const validateAndRepairInventoryConsistency = createAsyncThunk(
  'inventory/validateAndRepairInventoryConsistency',
  async (autoRepair: boolean = true, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    try {
      console.log('Validating inventory consistency across slices...');
      
      const issues: string[] = [];
      const repairs: string[] = [];
      
      // Check if inventory slice has data
      const inventoryLevels = state.inventory.filteredInventoryLevels;
      if (inventoryLevels.length === 0) {
        issues.push('No inventory levels found in inventory slice');
        if (autoRepair) {
          await dispatch(fetchInventoryLevels()).unwrap();
          repairs.push('Fetched fresh inventory levels');
        }
      }
      
      // Check products slice inventory mapping
      const productInventoryLevels = Object.keys(state.products.inventoryLevels);
      if (productInventoryLevels.length !== inventoryLevels.length) {
        issues.push('Inventory levels count mismatch between inventory and products slices');
        if (autoRepair) {
          const freshInventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
          dispatch(updateInventoryLevelsMapping(freshInventoryLevels));
          repairs.push('Synchronized inventory levels with products slice');
        }
      }
      
      // Check categories slice inventory mapping
      const categoryInventoryLevels = Object.keys(state.categories.categoryGroupInventoryLevels);
      if (categoryInventoryLevels.length !== inventoryLevels.length) {
        issues.push('Inventory levels count mismatch between inventory and categories slices');
        if (autoRepair) {
          const freshInventoryLevels = inventoryLevels.length > 0 ? 
            inventoryLevels : 
            await dispatch(fetchInventoryLevels()).unwrap();
          dispatch(updateCategoryInventoryLevels(freshInventoryLevels));
          repairs.push('Synchronized inventory levels with categories slice');
        }
      }
      
      // Check for stale data
      const lastFetched = state.inventory.lastFetched.inventoryLevels;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (!lastFetched || lastFetched < fiveMinutesAgo) {
        issues.push('Inventory data is stale or missing');
        if (autoRepair) {
          const freshInventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
          dispatch(updateInventoryLevelsMapping(freshInventoryLevels));
          dispatch(updateCategoryInventoryLevels(freshInventoryLevels));
          repairs.push('Refreshed stale inventory data');
        }
      }
      
      console.log(`Inventory consistency validation completed. Issues: ${issues.length}, Repairs: ${repairs.length}`);
      
      return {
        isConsistent: issues.length === 0,
        issues,
        repairs,
        autoRepair,
        validatedAt: Date.now()
      };
      
    } catch (error) {
      console.error('Failed to validate and repair inventory consistency:', error);
      throw error;
    }
  }
);

/**
 * Emergency inventory resync - forces complete refresh of all inventory data
 */
export const emergencyInventoryResync = createAsyncThunk(
  'inventory/emergencyInventoryResync',
  async (_, { dispatch }) => {
    try {
      console.log('Performing emergency inventory resync...');
      
      // Clear any existing data and force fresh fetch
      const inventoryLevels = await dispatch(fetchInventoryLevels()).unwrap();
      const categoryGroups = await dispatch(fetchCategoryGroups()).unwrap();
      
      // Force update all slices
      dispatch(updateInventoryLevelsMapping(inventoryLevels));
      dispatch(updateCategoryInventoryLevels(inventoryLevels));
      
      // Resync transaction impacts
      await dispatch(syncTransactionInventoryImpacts()).unwrap();
      
      console.log('Emergency inventory resync completed successfully');
      
      return {
        inventoryLevels,
        categoryGroups,
        resyncedAt: Date.now(),
        resyncedSlices: ['inventory', 'products', 'categories', 'transactions']
      };
      
    } catch (error) {
      console.error('Emergency inventory resync failed:', error);
      throw error;
    }
  }
);