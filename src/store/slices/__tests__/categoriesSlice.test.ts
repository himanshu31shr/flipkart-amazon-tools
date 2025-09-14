import { configureStore } from '@reduxjs/toolkit';
import categoriesReducer, {
  selectCategory,
  clearCategoriesError,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../categoriesSlice';
import { Category } from '../../../services/category.service';
import { Timestamp } from 'firebase/firestore';
import { RootState } from '../../types';

// Mock the category service
jest.mock('../../../services/category.service', () => ({
  CategoryService: jest.fn().mockImplementation(() => ({
    getCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    isCategoryInUse: jest.fn(),
  })),
}));

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Electronics',
  description: 'Electronic devices and accessories',
  createdAt: { seconds: 1672531200, nanoseconds: 0 } as Timestamp,
  updatedAt: { seconds: 1672531200, nanoseconds: 0 } as Timestamp,
};

const mockCategory2: Category = {
  id: 'cat-2',
  name: 'Clothing',
  description: 'Apparel and fashion items',
  createdAt: { seconds: 1672617600, nanoseconds: 0 } as Timestamp,
  updatedAt: { seconds: 1672617600, nanoseconds: 0 } as Timestamp,
};

describe('categoriesSlice', () => {
  let store: ReturnType<typeof configureStore<{ categories: RootState['categories'] }>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        categories: categoriesReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().categories;
      
      expect(state).toEqual({
        items: [],
        loading: false,
        error: null,
        selectedCategory: null,
      });
    });
  });

  describe('selectCategory', () => {
    it('should set selected category', () => {
      store.dispatch(selectCategory('cat-1'));
      const state = store.getState().categories;

      expect(state.selectedCategory).toBe('cat-1');
    });

    it('should clear selected category when null is passed', () => {
      // First set a category
      store.dispatch(selectCategory('cat-1'));
      expect(store.getState().categories.selectedCategory).toBe('cat-1');

      // Then clear it
      store.dispatch(selectCategory(null));
      const state = store.getState().categories;

      expect(state.selectedCategory).toBeNull();
    });

    it('should update selected category', () => {
      store.dispatch(selectCategory('cat-1'));
      store.dispatch(selectCategory('cat-2'));
      const state = store.getState().categories;

      expect(state.selectedCategory).toBe('cat-2');
    });
  });

  describe('clearCategoriesError', () => {
    it('should clear error when error exists', () => {
      // Manually set an error state
      const storeWithError = configureStore({
        reducer: { categories: categoriesReducer },
        preloadedState: {
          categories: {
            items: [],
            loading: false,
            error: 'Some error',
            selectedCategory: null,
          },
        },
      });

      storeWithError.dispatch(clearCategoriesError());
      const state = storeWithError.getState().categories;

      expect(state.error).toBeNull();
    });

    it('should work when no error exists', () => {
      store.dispatch(clearCategoriesError());
      const state = store.getState().categories;

      expect(state.error).toBeNull();
    });
  });

  describe('async thunks', () => {
    describe('fetchCategories', () => {
      it('should set loading to true when pending', () => {
        const action = { type: fetchCategories.pending.type };
        const state = categoriesReducer(undefined, action);

        expect(state.loading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set items when fulfilled', () => {
        const categories = [mockCategory, mockCategory2];
        const action = { 
          type: fetchCategories.fulfilled.type, 
          payload: categories 
        };
        const state = categoriesReducer(undefined, action);

        expect(state.loading).toBe(false);
        expect(state.items).toEqual(categories);
      });

      it('should set error when rejected', () => {
        const action = { 
          type: fetchCategories.rejected.type, 
          error: { message: 'Failed to fetch' }
        };
        const state = categoriesReducer(undefined, action);

        expect(state.loading).toBe(false);
        expect(state.error).toBe('Failed to fetch');
      });
    });

    describe('createCategory', () => {
      it('should add new category when fulfilled', () => {
        const initialState = {
          items: [mockCategory],
          loading: false,
          error: null,
          selectedCategory: null,
        };
        
        const action = { 
          type: createCategory.fulfilled.type, 
          payload: mockCategory2 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items).toHaveLength(2);
        expect(state.items[1]).toEqual(mockCategory2);
      });

      it('should set error when rejected', () => {
        const action = { 
          type: createCategory.rejected.type, 
          payload: 'Failed to create category'
        };
        const state = categoriesReducer(undefined, action);

        expect(state.error).toBe('Failed to create category');
      });
    });

    describe('updateCategory', () => {
      it('should update existing category when fulfilled', () => {
        const initialState = {
          items: [mockCategory, mockCategory2],
          loading: false,
          error: null,
          selectedCategory: null,
        };
        
        const updatedCategory = { id: 'cat-1', name: 'Updated Electronics' };
        const action = { 
          type: updateCategory.fulfilled.type, 
          payload: updatedCategory 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items[0].name).toBe('Updated Electronics');
        expect(state.items[1]).toEqual(mockCategory2); // Should remain unchanged
      });

      it('should not update if category not found', () => {
        const initialState = {
          items: [mockCategory],
          loading: false,
          error: null,
          selectedCategory: null,
        };
        
        const updatedCategory = { id: 'non-existent', name: 'Updated' };
        const action = { 
          type: updateCategory.fulfilled.type, 
          payload: updatedCategory 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items).toEqual([mockCategory]); // Should remain unchanged
      });

      it('should set error when rejected', () => {
        const action = { 
          type: updateCategory.rejected.type, 
          payload: 'Failed to update category'
        };
        const state = categoriesReducer(undefined, action);

        expect(state.error).toBe('Failed to update category');
      });
    });

    describe('deleteCategory', () => {
      it('should remove category when fulfilled', () => {
        const initialState = {
          items: [mockCategory, mockCategory2],
          loading: false,
          error: null,
          selectedCategory: null,
        };
        
        const action = { 
          type: deleteCategory.fulfilled.type, 
          payload: 'cat-1' 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items).toHaveLength(1);
        expect(state.items[0]).toEqual(mockCategory2);
      });

      it('should clear selected category if deleted', () => {
        const initialState = {
          items: [mockCategory],
          loading: false,
          error: null,
          selectedCategory: 'cat-1',
        };
        
        const action = { 
          type: deleteCategory.fulfilled.type, 
          payload: 'cat-1' 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items).toHaveLength(0);
        expect(state.selectedCategory).toBeNull();
      });

      it('should not affect selected category if different category deleted', () => {
        const initialState = {
          items: [mockCategory, mockCategory2],
          loading: false,
          error: null,
          selectedCategory: 'cat-1',
        };
        
        const action = { 
          type: deleteCategory.fulfilled.type, 
          payload: 'cat-2' 
        };
        const state = categoriesReducer(initialState, action);

        expect(state.items).toHaveLength(1);
        expect(state.selectedCategory).toBe('cat-1');
      });

      it('should set error when rejected', () => {
        const action = { 
          type: deleteCategory.rejected.type, 
          payload: 'Failed to delete category'
        };
        const state = categoriesReducer(undefined, action);

        expect(state.error).toBe('Failed to delete category');
      });
    });
  });

  describe('combined operations', () => {
    it('should handle selection and async operations together', () => {
      // Select a category
      store.dispatch(selectCategory('cat-1'));
      expect(store.getState().categories.selectedCategory).toBe('cat-1');

      // Clear error
      store.dispatch(clearCategoriesError());
      expect(store.getState().categories.error).toBeNull();

      // Test that state is maintained correctly
      const state = store.getState().categories;
      expect(state.selectedCategory).toBe('cat-1');
      expect(state.error).toBeNull();
    });
  });
}); 