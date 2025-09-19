import { configureStore } from '@reduxjs/toolkit';
import { 
  productsReducer, 
  updateInventoryLevelsMapping,
  updateProductInventoryStatus,
  selectProductInventoryLevels,
  selectLowStockProducts,
  selectZeroStockProducts
} from '../productsSlice';
import categoriesReducer, { 
  updateCategoryInventoryLevels,
  selectCategoryInventoryLevels,
  selectCategoriesWithLowStock,
  selectCategoriesWithZeroStock
} from '../categoriesSlice';
import transactionsReducer, { 
  updateTransactionInventoryImpact,
  selectTransactionInventoryImpacts,
  selectTransactionWithInventoryImpact
} from '../transactionsSlice';
import { InventoryLevel, InventoryDeductionResult } from '../../../types/inventory';
import { Product } from '../../../services/product.service';
import { Category } from '../../../services/category.service';
import { Transaction } from '../../../types/transaction.type';
import { CategoryGroup } from '../../../types/categoryGroup';

describe('Inventory Slice Enhancements', () => {
  const mockInventoryLevels: InventoryLevel[] = [
    {
      categoryGroupId: 'cg1',
      name: 'Category Group 1',
      currentInventory: 50,
      inventoryUnit: 'kg',
      inventoryType: 'weight',
      minimumThreshold: 10,
      status: 'healthy'
    },
    {
      categoryGroupId: 'cg2',
      name: 'Category Group 2',
      currentInventory: 5,
      inventoryUnit: 'kg',
      inventoryType: 'weight',
      minimumThreshold: 10,
      status: 'low_stock'
    },
    {
      categoryGroupId: 'cg3',
      name: 'Category Group 3',
      currentInventory: 0,
      inventoryUnit: 'pcs',
      inventoryType: 'qty',
      minimumThreshold: 5,
      status: 'zero_stock'
    }
  ];

  const mockProducts: Product[] = [
    {
      sku: 'PROD1',
      name: 'Product 1',
      platform: 'amazon',
      categoryId: 'cat1',
      categoryGroupId: 'cg1',
      description: 'Test product 1',
      costPrice: 10,
      sellingPrice: 15
    },
    {
      sku: 'PROD2',
      name: 'Product 2',
      platform: 'flipkart',
      categoryId: 'cat2',
      categoryGroupId: 'cg2',
      description: 'Test product 2',
      costPrice: 20,
      sellingPrice: 30
    },
    {
      sku: 'PROD3',
      name: 'Product 3',
      platform: 'amazon',
      categoryId: 'cat3',
      categoryGroupId: 'cg3',
      description: 'Test product 3',
      costPrice: 15,
      sellingPrice: 25
    }
  ];

  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Category 1', description: 'Test category 1', tag: 'tag1', categoryGroupId: 'cg1' },
    { id: 'cat2', name: 'Category 2', description: 'Test category 2', tag: 'tag2', categoryGroupId: 'cg2' },
    { id: 'cat3', name: 'Category 3', description: 'Test category 3', tag: 'tag3', categoryGroupId: 'cg3' }
  ];

  const mockCategoryGroups: CategoryGroup[] = [
    {
      id: 'cg1',
      name: 'Category Group 1',
      description: 'Test category group 1',
      color: '#4CAF50',
      inventoryType: 'weight',
      inventoryUnit: 'kg',
      currentInventory: 50,
      minimumThreshold: 10
    },
    {
      id: 'cg2',
      name: 'Category Group 2',
      description: 'Test category group 2',
      color: '#FF9800',
      inventoryType: 'weight',
      inventoryUnit: 'kg',
      currentInventory: 5,
      minimumThreshold: 10
    },
    {
      id: 'cg3',
      name: 'Category Group 3',
      description: 'Test category group 3',
      color: '#F44336',
      inventoryType: 'qty',
      inventoryUnit: 'pcs',
      currentInventory: 0,
      minimumThreshold: 5
    }
  ];

  describe('ProductsSlice Inventory Enhancement', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          products: productsReducer
        },
        preloadedState: {
          products: {
            items: mockProducts,
            filteredItems: mockProducts,
            loading: false,
            error: null,
            filters: {},
            lastFetched: null,
            detailsCache: {},
            categories: [],
            categoriesLoading: false,
            categoriesError: null,
            categoryProducts: [],
            categoryProductsLoading: false,
            categoryProductsError: null,
            inventoryLevels: {},
            inventoryLoading: false,
            inventoryError: null,
            productInventoryStatus: {},
            lowStockProducts: [],
            zeroStockProducts: []
          }
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware({ serializableCheck: false })
      });
    });

    it('should update inventory levels mapping correctly', () => {
      store.dispatch(updateInventoryLevelsMapping(mockInventoryLevels));
      
      const state = store.getState();
      const inventoryLevels = selectProductInventoryLevels(state);
      
      expect(Object.keys(inventoryLevels)).toHaveLength(3);
      expect(inventoryLevels['cg1']).toEqual(mockInventoryLevels[0]);
      expect(inventoryLevels['cg2']).toEqual(mockInventoryLevels[1]);
      expect(inventoryLevels['cg3']).toEqual(mockInventoryLevels[2]);
    });

    it('should update product inventory status based on category group mapping', () => {
      store.dispatch(updateInventoryLevelsMapping(mockInventoryLevels));
      
      const state = store.getState();
      
      expect(state.products.productInventoryStatus['PROD1']).toBe('healthy');
      expect(state.products.productInventoryStatus['PROD2']).toBe('low_stock');
      expect(state.products.productInventoryStatus['PROD3']).toBe('zero_stock');
    });

    it('should categorize products by inventory status', () => {
      store.dispatch(updateInventoryLevelsMapping(mockInventoryLevels));
      
      const state = store.getState();
      const lowStockProducts = selectLowStockProducts(state);
      const zeroStockProducts = selectZeroStockProducts(state);
      
      expect(lowStockProducts).toHaveLength(1);
      expect(lowStockProducts[0].sku).toBe('PROD2');
      
      expect(zeroStockProducts).toHaveLength(1);
      expect(zeroStockProducts[0].sku).toBe('PROD3');
    });

    it('should update individual product inventory status', () => {
      store.dispatch(updateProductInventoryStatus({ 
        productSku: 'PROD1', 
        status: 'low_stock' 
      }));
      
      const state = store.getState();
      
      expect(state.products.productInventoryStatus['PROD1']).toBe('low_stock');
    });
  });

  describe('CategoriesSlice Inventory Enhancement', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          categories: categoriesReducer
        },
        preloadedState: {
          categories: {
            items: mockCategories,
            loading: false,
            error: null,
            selectedCategory: null,
            categoryInventoryLevels: {},
            categoryGroupInventoryLevels: {},
            categoryInventoryAlerts: [],
            inventoryLoading: false,
            inventoryError: null,
            categoryGroupsLoading: false,
            categoryGroupsError: null,
            categoriesWithLowStock: [],
            categoriesWithZeroStock: [],
            categoryInventoryStatus: {},
            categoryGroups: mockCategoryGroups
          }
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware({ serializableCheck: false })
      });
    });

    it('should update category group inventory levels correctly', () => {
      store.dispatch(updateCategoryInventoryLevels(mockInventoryLevels));
      
      const state = store.getState();
      const inventoryLevels = selectCategoryInventoryLevels(state);
      
      expect(Object.keys(inventoryLevels)).toHaveLength(3);
      expect(inventoryLevels['cg1']).toEqual(mockInventoryLevels[0]);
      expect(inventoryLevels['cg2']).toEqual(mockInventoryLevels[1]);
      expect(inventoryLevels['cg3']).toEqual(mockInventoryLevels[2]);
    });

    it('should update category inventory status based on related groups', () => {
      store.dispatch(updateCategoryInventoryLevels(mockInventoryLevels));
      
      const state = store.getState();
      
      expect(state.categories.categoryInventoryStatus['cat1']).toBe('healthy');
      expect(state.categories.categoryInventoryStatus['cat2']).toBe('low_stock');
      expect(state.categories.categoryInventoryStatus['cat3']).toBe('zero_stock');
    });

    it('should categorize categories by inventory status', () => {
      store.dispatch(updateCategoryInventoryLevels(mockInventoryLevels));
      
      const state = store.getState();
      const lowStockCategories = selectCategoriesWithLowStock(state);
      const zeroStockCategories = selectCategoriesWithZeroStock(state);
      
      expect(lowStockCategories).toContain('cat2');
      expect(zeroStockCategories).toContain('cat3');
    });
  });

  describe('TransactionsSlice Inventory Enhancement', () => {
    let store: ReturnType<typeof configureStore>;

    const mockTransaction: Transaction = {
      id: 'txn1',
      orderNumber: 'ORDER1',
      platform: 'amazon',
      customerName: 'John Doe',
      items: [],
      totalAmount: 100,
      createdAt: '2025-09-16T10:00:00.000Z',
      status: 'completed'
    };

    const mockInventoryDeductionResult: InventoryDeductionResult = {
      deductions: [
        {
          categoryGroupId: 'cg1',
          requestedQuantity: 10,
          deductedQuantity: 10,
          newInventoryLevel: 40,
          movementId: 'mov1'
        }
      ],
      warnings: [],
      errors: []
    };

    beforeEach(() => {
      store = configureStore({
        reducer: {
          transactions: transactionsReducer
        },
        preloadedState: {
          transactions: {
            items: [mockTransaction],
            loading: false,
            error: null,
            lastFetched: null,
            pendingTransactions: {},
            transactionInventoryImpacts: {},
            inventoryMovements: [],
            inventoryLoading: false,
            inventoryError: null,
            processingInventoryDeductions: {},
            inventoryDeductionErrors: {},
            lastInventorySync: null,
            inventorySyncInProgress: false
          }
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware({ serializableCheck: false })
      });
    });

    it('should update transaction inventory impact correctly', () => {
      store.dispatch(updateTransactionInventoryImpact({
        transactionId: 'txn1',
        deductionResult: mockInventoryDeductionResult
      }));
      
      const state = store.getState();
      const impacts = selectTransactionInventoryImpacts(state);
      
      expect(impacts['txn1']).toEqual(mockInventoryDeductionResult);
    });

    it('should get transaction with inventory impact', () => {
      store.dispatch(updateTransactionInventoryImpact({
        transactionId: 'txn1',
        deductionResult: mockInventoryDeductionResult
      }));
      
      const state = store.getState();
      const transactionWithImpact = selectTransactionWithInventoryImpact(state, 'txn1');
      
      expect(transactionWithImpact).toBeTruthy();
      expect(transactionWithImpact?.id).toBe('txn1');
      expect(transactionWithImpact?.inventoryImpact).toEqual(mockInventoryDeductionResult);
      expect(transactionWithImpact?.isProcessingInventory).toBe(false);
    });

    it('should handle inventory deduction processing state', () => {
      store.dispatch({
        type: 'transactions/setInventoryDeductionProcessing',
        payload: { transactionId: 'txn1', isProcessing: true }
      });
      
      const state = store.getState();
      const transactionWithImpact = selectTransactionWithInventoryImpact(state, 'txn1');
      
      expect(transactionWithImpact?.isProcessingInventory).toBe(true);
    });

    it('should handle inventory deduction errors', () => {
      const errorMessage = 'Insufficient inventory';
      
      store.dispatch({
        type: 'transactions/setInventoryDeductionError',
        payload: { transactionId: 'txn1', error: errorMessage }
      });
      
      const state = store.getState();
      const transactionWithImpact = selectTransactionWithInventoryImpact(state, 'txn1');
      
      expect(transactionWithImpact?.inventoryError).toBe(errorMessage);
      expect(transactionWithImpact?.isProcessingInventory).toBe(false);
    });
  });

  describe('Cross-Slice Data Consistency', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          products: productsReducer,
          categories: categoriesReducer,
          transactions: transactionsReducer
        },
        preloadedState: {
          products: {
            items: mockProducts,
            filteredItems: mockProducts,
            loading: false,
            error: null,
            filters: {},
            lastFetched: null,
            detailsCache: {},
            categories: [],
            categoriesLoading: false,
            categoriesError: null,
            categoryProducts: [],
            categoryProductsLoading: false,
            categoryProductsError: null,
            inventoryLevels: {},
            inventoryLoading: false,
            inventoryError: null,
            productInventoryStatus: {},
            lowStockProducts: [],
            zeroStockProducts: []
          },
          categories: {
            items: mockCategories,
            loading: false,
            error: null,
            selectedCategory: null,
            categoryInventoryLevels: {},
            categoryGroupInventoryLevels: {},
            categoryInventoryAlerts: [],
            inventoryLoading: false,
            inventoryError: null,
            categoryGroupsLoading: false,
            categoryGroupsError: null,
            categoriesWithLowStock: [],
            categoriesWithZeroStock: [],
            categoryInventoryStatus: {},
            categoryGroups: mockCategoryGroups
          },
          transactions: {
            items: [],
            loading: false,
            error: null,
            lastFetched: null,
            pendingTransactions: {},
            transactionInventoryImpacts: {},
            inventoryMovements: [],
            inventoryLoading: false,
            inventoryError: null,
            processingInventoryDeductions: {},
            inventoryDeductionErrors: {},
            lastInventorySync: null,
            inventorySyncInProgress: false
          }
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware({ serializableCheck: false })
      });
    });

    it('should maintain consistent inventory data across products and categories slices', () => {
      // Update both slices with the same inventory data
      store.dispatch(updateInventoryLevelsMapping(mockInventoryLevels));
      store.dispatch(updateCategoryInventoryLevels(mockInventoryLevels));
      
      const state = store.getState();
      const productInventoryLevels = selectProductInventoryLevels(state);
      const categoryInventoryLevels = selectCategoryInventoryLevels(state);
      
      // Both slices should have the same inventory level data
      expect(Object.keys(productInventoryLevels)).toEqual(Object.keys(categoryInventoryLevels));
      
      Object.keys(productInventoryLevels).forEach(categoryGroupId => {
        expect(productInventoryLevels[categoryGroupId]).toEqual(
          categoryInventoryLevels[categoryGroupId]
        );
      });
    });

    it('should reflect consistent inventory status across slices', () => {
      store.dispatch(updateInventoryLevelsMapping(mockInventoryLevels));
      store.dispatch(updateCategoryInventoryLevels(mockInventoryLevels));
      
      const state = store.getState();
      
      // Product with category group 'cg2' should have low_stock status
      expect(state.products.productInventoryStatus['PROD2']).toBe('low_stock');
      // Category 'cat2' (mapped to 'cg2') should also have low_stock status
      expect(state.categories.categoryInventoryStatus['cat2']).toBe('low_stock');
      
      // Product with category group 'cg3' should have zero_stock status
      expect(state.products.productInventoryStatus['PROD3']).toBe('zero_stock');
      // Category 'cat3' (mapped to 'cg3') should also have zero_stock status
      expect(state.categories.categoryInventoryStatus['cat3']).toBe('zero_stock');
    });
  });
});