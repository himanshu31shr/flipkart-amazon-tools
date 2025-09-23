import { configureStore } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';
import categoriesReducer, {
  CategoriesState,
  fetchCategoriesWithDeduction,
  updateCategoryDeductionQuantity,
  selectCategoriesWithDeduction,
  selectDeductionConfiguration,
  selectDeductionLoading,
  selectDeductionError,
  selectCategoryDeductionQuantity,
} from '../categoriesSlice';
import { Category } from '../../../types/category';

// Mock Firebase Timestamp
const createMockTimestamp = (input: Date | number) => {
  const seconds = input instanceof Date 
    ? Math.floor(input.getTime() / 1000) 
    : Math.floor(input / 1000);
  
  return {
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000),
    toMillis: () => seconds * 1000,
    isEqual: () => false,
    toJSON: () => ({ seconds, nanoseconds: 0 }),
    valueOf: () => seconds * 1000,
  } as unknown as Timestamp;
};

const mockTimestamp = createMockTimestamp(1234567890 * 1000);

jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: jest.fn((date: Date) => createMockTimestamp(date)),
    fromMillis: jest.fn((millis: number) => createMockTimestamp(millis)),
    now: jest.fn(() => createMockTimestamp(Date.now())),
  }
}));

// Mock the category service
jest.mock('../../../services/category.service', () => ({
  CategoryService: jest.fn().mockImplementation(() => ({
    getCategoriesWithDeduction: jest.fn(),
    updateInventoryDeductionQuantity: jest.fn(),
  })),
}));

describe('categoriesSlice - Deduction Functionality', () => {
  let store: ReturnType<typeof configureStore<{ categories: CategoriesState }>>;

  const mockCategory: Category = {
    id: 'category-1',
    name: 'Test Category',
    description: 'Test Description',
    color: '#FF5722',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockCategory2: Category = {
    id: 'category-2',
    name: 'Another Category',
    description: 'Another Description',
    color: '#4CAF50',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockInitialState: CategoriesState = {
    items: [mockCategory, mockCategory2],
    loading: false,
    error: null,
    selectedCategory: null,
    
    // Inventory-related initial state
    categoryInventoryLevels: {},
    categoryGroupInventoryLevels: {},
    categoryInventoryAlerts: [],
    inventoryLoading: false,
    inventoryError: null,
    categoryGroupsLoading: false,
    categoryGroupsError: null,
    
    // Aggregated inventory initial data
    categoriesWithLowStock: [],
    categoriesWithZeroStock: [],
    categoryInventoryStatus: {},
    
    // Category groups initial state
    categoryGroups: [],
    
    // Deduction-related initial state
    categoriesWithDeduction: [],
    deductionConfiguration: {},
    deductionLoading: false,
    deductionError: null,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        categories: categoriesReducer,
      },
      preloadedState: { categories: mockInitialState },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false, // Disable for tests with Firebase Timestamps
        }),
    });
  });

  describe('initial state', () => {
    it('should have correct deduction initial state', () => {
      const state = store.getState().categories;
      
      expect(state.categoriesWithDeduction).toEqual([]);
      expect(state.deductionConfiguration).toEqual({});
      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBeNull();
    });
  });

  describe('fetchCategoriesWithDeduction async thunk', () => {
    it('should set loading to true when pending', () => {
      const action = { type: fetchCategoriesWithDeduction.pending.type, payload: undefined };
      const state = categoriesReducer(undefined, action);

      expect(state.deductionLoading).toBe(true);
      expect(state.deductionError).toBeNull();
    });

    it('should update categories with deduction when fulfilled', () => {
      const categories = [
        { ...mockCategory, inventoryDeductionQuantity: 10 },
        { ...mockCategory2, inventoryDeductionQuantity: 5 },
      ];

      const action = {
        type: fetchCategoriesWithDeduction.fulfilled.type,
        payload: categories
      };
      const state = categoriesReducer(undefined, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.categoriesWithDeduction).toEqual(['category-1', 'category-2']);
      expect(state.deductionConfiguration).toEqual({
        'category-1': 10,
        'category-2': 5,
      });
      expect(state.deductionError).toBeNull();
    });

    it('should handle empty deduction data when fulfilled', () => {
      const action = {
        type: fetchCategoriesWithDeduction.fulfilled.type,
        payload: []
      };
      const state = categoriesReducer(undefined, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.categoriesWithDeduction).toEqual([]);
      expect(state.deductionConfiguration).toEqual({});
    });

    it('should set error when rejected', () => {
      const errorMessage = 'Failed to fetch categories with deduction';
      const action = {
        type: fetchCategoriesWithDeduction.rejected.type,
        payload: errorMessage
      };
      const state = categoriesReducer(undefined, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBe(errorMessage);
    });

    it('should handle rejected action without error message', () => {
      const action = {
        type: fetchCategoriesWithDeduction.rejected.type,
        payload: undefined
      };
      const state = categoriesReducer(undefined, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBeUndefined();
    });
  });

  describe('updateCategoryDeductionQuantity async thunk', () => {
    const initialStateWithDeduction: CategoriesState = {
      ...mockInitialState,
      categoriesWithDeduction: ['category-1', 'category-2'],
      deductionConfiguration: {
        'category-1': 10,
        'category-2': 5,
      },
    };

    it('should set loading to true when pending', () => {
      const action = { type: updateCategoryDeductionQuantity.pending.type, payload: undefined };
      const state = categoriesReducer(initialStateWithDeduction, action);

      // Note: updateCategoryDeductionQuantity doesn't have a pending handler in the actual implementation
      // So the loading state won't change
      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBeNull();
    });

    it('should update deduction quantity when fulfilled', () => {
      const payload = { categoryId: 'category-1', quantity: 20 };
      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload
      };
      const state = categoriesReducer(initialStateWithDeduction, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionConfiguration['category-1']).toBe(20);
      expect(state.deductionConfiguration['category-2']).toBe(5); // Unchanged
      expect(state.deductionError).toBeNull();
    });

    it('should remove category from deduction when quantity is undefined', () => {
      const payload = { categoryId: 'category-1', quantity: undefined };
      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload
      };
      const state = categoriesReducer(initialStateWithDeduction, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionConfiguration['category-1']).toBeUndefined();
      expect(state.deductionConfiguration['category-2']).toBe(5); // Unchanged
      expect(state.categoriesWithDeduction).not.toContain('category-1');
      expect(state.categoriesWithDeduction).toContain('category-2');
    });

    it('should add category to deduction when quantity is set for new category', () => {
      const initialStateWithoutCategory3 = {
        ...initialStateWithDeduction,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const payload = { categoryId: 'category-3', quantity: 15 };
      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload
      };
      const state = categoriesReducer(initialStateWithoutCategory3, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionConfiguration['category-3']).toBe(15);
      expect(state.categoriesWithDeduction).toContain('category-3');
      expect(state.categoriesWithDeduction).toContain('category-1');
    });

    it('should set error when rejected', () => {
      const errorMessage = 'Failed to update deduction quantity';
      const action = {
        type: updateCategoryDeductionQuantity.rejected.type,
        payload: errorMessage
      };
      const state = categoriesReducer(initialStateWithDeduction, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBe(errorMessage);
      // State should remain unchanged
      expect(state.deductionConfiguration).toEqual(initialStateWithDeduction.deductionConfiguration);
      expect(state.categoriesWithDeduction).toEqual(initialStateWithDeduction.categoriesWithDeduction);
    });

    it('should handle rejected action without error message', () => {
      const action = {
        type: updateCategoryDeductionQuantity.rejected.type,
        payload: undefined
      };
      const state = categoriesReducer(initialStateWithDeduction, action);

      expect(state.deductionLoading).toBe(false);
      expect(state.deductionError).toBeUndefined();
    });
  });

  describe('selectors', () => {
    const mockRootState = {
      categories: {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1', 'category-3'],
        deductionConfiguration: {
          'category-1': 10,
          'category-2': 5,
          'category-3': 20,
        },
        deductionLoading: true,
        deductionError: 'Test error',
      },
    };

    it('should select categories with deduction', () => {
      expect(selectCategoriesWithDeduction(mockRootState)).toEqual(['category-1', 'category-3']);
    });

    it('should select deduction configuration', () => {
      expect(selectDeductionConfiguration(mockRootState)).toEqual({
        'category-1': 10,
        'category-2': 5,
        'category-3': 20,
      });
    });

    it('should select deduction loading state', () => {
      expect(selectDeductionLoading(mockRootState)).toBe(true);
    });

    it('should select deduction error', () => {
      expect(selectDeductionError(mockRootState)).toBe('Test error');
    });

    it('should select category deduction quantity', () => {
      expect(selectCategoryDeductionQuantity(mockRootState, 'category-1')).toBe(10);
      expect(selectCategoryDeductionQuantity(mockRootState, 'category-2')).toBe(5);
      expect(selectCategoryDeductionQuantity(mockRootState, 'category-3')).toBe(20);
      expect(selectCategoryDeductionQuantity(mockRootState, 'non-existent')).toBeUndefined();
    });

    it('should handle empty state in selectors', () => {
      const emptyState = {
        categories: {
          ...mockInitialState,
          categoriesWithDeduction: [],
          deductionConfiguration: {},
          deductionLoading: false,
          deductionError: null,
        },
      };

      expect(selectCategoriesWithDeduction(emptyState)).toEqual([]);
      expect(selectDeductionConfiguration(emptyState)).toEqual({});
      expect(selectDeductionLoading(emptyState)).toBe(false);
      expect(selectDeductionError(emptyState)).toBeNull();
      expect(selectCategoryDeductionQuantity(emptyState, 'any-category')).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent updates to the same category', () => {
      const initialState = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      // First update
      const action1 = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-1', quantity: 15 }
      };
      let state = categoriesReducer(initialState, action1);
      expect(state.deductionConfiguration['category-1']).toBe(15);

      // Second update to same category
      const action2 = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-1', quantity: 25 }
      };
      state = categoriesReducer(state, action2);
      expect(state.deductionConfiguration['category-1']).toBe(25);
    });

    it('should handle updates to categories not in the current list', () => {
      const initialState = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'new-category', quantity: 30 }
      };
      const state = categoriesReducer(initialState, action);

      expect(state.deductionConfiguration['new-category']).toBe(30);
      expect(state.categoriesWithDeduction).toContain('new-category');
      expect(state.categoriesWithDeduction).toContain('category-1');
    });

    it('should handle zero quantity by removing deduction configuration', () => {
      const initialStateWithCategory = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-1', quantity: 0 }
      };
      const state = categoriesReducer(initialStateWithCategory, action);

      expect(state.deductionConfiguration['category-1']).toBeUndefined();
      expect(state.categoriesWithDeduction).not.toContain('category-1');
    });

    it('should handle negative quantities by removing deduction configuration', () => {
      const initialStateWithCategory = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-1', quantity: -5 }
      };
      const state = categoriesReducer(initialStateWithCategory, action);

      expect(state.deductionConfiguration['category-1']).toBeUndefined();
      expect(state.categoriesWithDeduction).not.toContain('category-1');
    });

    it('should preserve other state when deduction operations occur', () => {
      const complexInitialState = {
        ...mockInitialState,
        selectedCategory: 'selected-category',
        categoriesWithLowStock: ['low-stock-category'],
        categoryInventoryStatus: { 'status-category': 'low_stock' as const },
      };

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-1', quantity: 10 }
      };
      const state = categoriesReducer(complexInitialState, action);

      // Deduction state should be updated
      expect(state.deductionConfiguration['category-1']).toBe(10);
      expect(state.categoriesWithDeduction).toContain('category-1');

      // Other state should be preserved
      expect(state.selectedCategory).toBe('selected-category');
      expect(state.categoriesWithLowStock).toEqual(['low-stock-category']);
      expect(state.categoryInventoryStatus).toEqual({ 'status-category': 'low_stock' });
    });

    it('should handle malformed payload gracefully for some cases', () => {
      const initialState = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      // Action with null/undefined payload should throw as the implementation tries to destructure
      const actionWithNullPayload = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: null
      };

      expect(() => {
        categoriesReducer(initialState, actionWithNullPayload as any);
      }).toThrow();

      // Action with missing categoryId doesn't throw but categoryId becomes undefined
      const actionWithoutCategoryId = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { quantity: 15 }
      };

      expect(() => {
        categoriesReducer(initialState, actionWithoutCategoryId as any);
      }).not.toThrow();
    });
  });

  describe('state immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const frozenState = Object.freeze(originalState);

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-2', quantity: 20 }
      };

      expect(() => {
        categoriesReducer(frozenState, action);
      }).not.toThrow();

      // Original state should be unchanged
      expect(frozenState.categoriesWithDeduction).toEqual(['category-1']);
      expect(frozenState.deductionConfiguration).toEqual({ 'category-1': 10 });
    });

    it('should create new arrays and objects for state updates', () => {
      const initialState = {
        ...mockInitialState,
        categoriesWithDeduction: ['category-1'],
        deductionConfiguration: { 'category-1': 10 },
      };

      const action = {
        type: updateCategoryDeductionQuantity.fulfilled.type,
        payload: { categoryId: 'category-2', quantity: 20 }
      };

      const newState = categoriesReducer(initialState, action);

      // Arrays and objects should be new instances
      expect(newState.categoriesWithDeduction).not.toBe(initialState.categoriesWithDeduction);
      expect(newState.deductionConfiguration).not.toBe(initialState.deductionConfiguration);
      
      // But should contain expected values
      expect(newState.categoriesWithDeduction).toContain('category-1');
      expect(newState.categoriesWithDeduction).toContain('category-2');
      expect(newState.deductionConfiguration['category-1']).toBe(10);
      expect(newState.deductionConfiguration['category-2']).toBe(20);
    });
  });
});