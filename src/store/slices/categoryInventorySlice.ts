import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { CategoryWithInventory, LowStockAlert, InventoryOperation } from '../../types/categoryInventory.types';
import { categoryInventoryService } from '../../services/categoryInventory.service';

export interface CategoryInventoryState {
  categories: CategoryWithInventory[];
  lowStockCategories: LowStockAlert[];
  operations: InventoryOperation[];
  loading: boolean;
  error: string | null;
  migrationStatus: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  lastUpdated: string | null;
}

const initialState: CategoryInventoryState = {
  categories: [],
  lowStockCategories: [],
  operations: [],
  loading: false,
  error: null,
  migrationStatus: 'pending',
  lastUpdated: null,
};

// Async thunks with better error handling
export const fetchCategoriesWithInventory = createAsyncThunk(
  'categoryInventory/fetchCategoriesWithInventory',
  async (_, { rejectWithValue }) => {
    try {
      return await categoryInventoryService.getAllCategoriesWithInventory();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

export const updateCategoryInventory = createAsyncThunk(
  'categoryInventory/updateCategoryInventory',
  async ({ categoryId, quantity, reason, performedBy }: {
    categoryId: string;
    quantity: number;
    reason?: string;
    performedBy?: string;
  }, { rejectWithValue }) => {
    try {
      await categoryInventoryService.updateCategoryInventory(categoryId, quantity, reason, performedBy);
      const updatedCategory = await categoryInventoryService.getCategoryInventory(categoryId);
      if (!updatedCategory) {
        throw new Error('Category not found after update');
      }
      return updatedCategory;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update inventory');
    }
  }
);

export const updateCategoryThreshold = createAsyncThunk(
  'categoryInventory/updateCategoryThreshold',
  async ({ categoryId, threshold }: {
    categoryId: string;
    threshold: number;
  }, { rejectWithValue }) => {
    try {
      await categoryInventoryService.updateCategoryThreshold(categoryId, threshold);
      const updatedCategory = await categoryInventoryService.getCategoryInventory(categoryId);
      if (!updatedCategory) {
        throw new Error('Category not found after update');
      }
      return updatedCategory;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update threshold');
    }
  }
);

export const fetchLowStockCategories = createAsyncThunk(
  'categoryInventory/fetchLowStockCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await categoryInventoryService.getLowStockCategories();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch low stock categories');
    }
  }
);

export const fetchCategoryInventoryHistory = createAsyncThunk(
  'categoryInventory/fetchCategoryInventoryHistory',
  async ({ categoryId, limit }: {
    categoryId: string;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      return await categoryInventoryService.getCategoryInventoryHistory(categoryId, limit);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch inventory history');
    }
  }
);

const categoryInventorySlice = createSlice({
  name: 'categoryInventory',
  initialState,
  reducers: {
    setMigrationStatus: (state, action: PayloadAction<CategoryInventoryState['migrationStatus']>) => {
      state.migrationStatus = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchCategoriesWithInventory
      .addCase(fetchCategoriesWithInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriesWithInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.map(cat => ({
          ...cat,
          createdAt: cat.createdAt instanceof Date ? cat.createdAt.getTime() : cat.createdAt,
          updatedAt: cat.updatedAt instanceof Date ? cat.updatedAt.getTime() : cat.updatedAt,
          inventory: {
            ...cat.inventory,
            lastUpdated: cat.inventory.lastUpdated instanceof Date ? cat.inventory.lastUpdated.getTime() : cat.inventory.lastUpdated,
          }
        }));
        state.error = null;
        state.lastUpdated = new Date().getTime().toString();
      })
      .addCase(fetchCategoriesWithInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch categories';
        state.categories = [];
      })
      // updateCategoryInventory
      .addCase(updateCategoryInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategoryInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        const index = state.categories.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = {
            ...action.payload,
            createdAt: action.payload.createdAt instanceof Date ? action.payload.createdAt.getTime() : action.payload.createdAt,
            updatedAt: action.payload.updatedAt instanceof Date ? action.payload.updatedAt.getTime() : action.payload.updatedAt,
            inventory: {
              ...action.payload.inventory,
              lastUpdated: action.payload.inventory.lastUpdated instanceof Date ? action.payload.inventory.lastUpdated.getTime() : action.payload.inventory.lastUpdated,
            }
          };
        } else {
          // If category not found in current list, add it
          state.categories.push({
            ...action.payload,
            createdAt: action.payload.createdAt instanceof Date ? action.payload.createdAt.getTime() : action.payload.createdAt,
            updatedAt: action.payload.updatedAt instanceof Date ? action.payload.updatedAt.getTime() : action.payload.updatedAt,
            inventory: {
              ...action.payload.inventory,
              lastUpdated: action.payload.inventory.lastUpdated instanceof Date ? action.payload.inventory.lastUpdated.getTime() : action.payload.inventory.lastUpdated,
            }
          });
        }
        state.lastUpdated = new Date().getTime().toString();
      })
      .addCase(updateCategoryInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update inventory';
      })
      // updateCategoryThreshold
      .addCase(updateCategoryThreshold.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategoryThreshold.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        const index = state.categories.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = {
            ...action.payload,
            createdAt: action.payload.createdAt instanceof Date ? action.payload.createdAt.getTime() : action.payload.createdAt,
            updatedAt: action.payload.updatedAt instanceof Date ? action.payload.updatedAt.getTime() : action.payload.updatedAt,
            inventory: {
              ...action.payload.inventory,
              lastUpdated: action.payload.inventory.lastUpdated instanceof Date ? action.payload.inventory.lastUpdated.getTime() : action.payload.inventory.lastUpdated,
            }
          };
        } else {
          // If category not found in current list, add it
          state.categories.push({
            ...action.payload,
            createdAt: action.payload.createdAt instanceof Date ? action.payload.createdAt.getTime() : action.payload.createdAt,
            updatedAt: action.payload.updatedAt instanceof Date ? action.payload.updatedAt.getTime() : action.payload.updatedAt,
            inventory: {
              ...action.payload.inventory,
              lastUpdated: action.payload.inventory.lastUpdated instanceof Date ? action.payload.inventory.lastUpdated.getTime() : action.payload.inventory.lastUpdated,
            }
          });
        }
        state.lastUpdated = new Date().getTime().toString();
      })
      .addCase(updateCategoryThreshold.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update threshold';
      })
      // fetchLowStockCategories
      .addCase(fetchLowStockCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowStockCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.lowStockCategories = action.payload;
        state.error = null;
      })
      .addCase(fetchLowStockCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch low stock categories';
        state.lowStockCategories = [];
      })
      // fetchCategoryInventoryHistory
      .addCase(fetchCategoryInventoryHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryInventoryHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.operations = action.payload.map(op => ({
          ...op,
          timestamp: op.timestamp instanceof Date ? op.timestamp.getTime() : op.timestamp,
        }));
        state.error = null;
      })
      .addCase(fetchCategoryInventoryHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch inventory history';
        state.operations = [];
      });
  },
});

// Selectors
export const selectCategoryInventory = (state: { categoryInventory: CategoryInventoryState }) => state.categoryInventory;

export const selectCategoriesWithInventory = createSelector(
  [selectCategoryInventory],
  (categoryInventory) => categoryInventory.categories
);

export const selectLowStockCategories = createSelector(
  [selectCategoryInventory],
  (categoryInventory) => categoryInventory.lowStockCategories
);

export const selectCategoryInventoryLoading = createSelector(
  [selectCategoryInventory],
  (categoryInventory) => categoryInventory.loading
);

export const selectCategoryInventoryError = createSelector(
  [selectCategoryInventory],
  (categoryInventory) => categoryInventory.error
);

export const selectMigrationStatus = createSelector(
  [selectCategoryInventory],
  (categoryInventory) => categoryInventory.migrationStatus
);

export const selectCategoryById = createSelector(
  [selectCategoriesWithInventory, (_: unknown, categoryId: string) => categoryId],
  (categories, categoryId) => categories.find(cat => cat.id === categoryId)
);

export const selectTotalInventoryValue = createSelector(
  [selectCategoriesWithInventory],
  (categories) => categories.reduce((total, category) => total + category.inventory.totalQuantity, 0)
);

export const selectOutOfStockCategoriesCount = createSelector(
  [selectCategoriesWithInventory],
  (categories) => categories.filter(cat => cat.inventory.totalQuantity === 0).length
);

export const { setMigrationStatus, clearError, resetState } = categoryInventorySlice.actions;
export default categoryInventorySlice.reducer; 