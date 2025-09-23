import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Category, CategoryService } from '../../services/category.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import { InventoryService } from '../../services/inventory.service';
import { CategoryGroup } from '../../types/categoryGroup';
import { InventoryAlert, InventoryLevel, InventoryStatus } from '../../types/inventory';

export interface CategoriesState {
  items: Category[];
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
  
  // Inventory-related state
  categoryInventoryLevels: Record<string, InventoryLevel>; // categoryId -> InventoryLevel
  categoryGroupInventoryLevels: Record<string, InventoryLevel>; // categoryGroupId -> InventoryLevel
  categoryInventoryAlerts: InventoryAlert[];
  inventoryLoading: boolean;
  inventoryError: string | null;
  categoryGroupsLoading: boolean;
  categoryGroupsError: string | null;
  
  // Aggregated inventory data
  categoriesWithLowStock: string[]; // categoryIds
  categoriesWithZeroStock: string[]; // categoryIds
  categoryInventoryStatus: Record<string, InventoryStatus>; // categoryId -> InventoryStatus
  
  // Category groups for inventory management
  categoryGroups: CategoryGroup[];
  
  // Deduction-related state
  categoriesWithDeduction: string[]; // categoryIds with deduction enabled
  deductionConfiguration: Record<string, number>; // categoryId -> deduction quantity
  deductionLoading: boolean;
  deductionError: string | null;
}

const initialState: CategoriesState = {
  items: [],
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

const categoryService = new CategoryService();
const inventoryService = new InventoryService();
const categoryGroupService = new CategoryGroupService();

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async () => {
    return await categoryService.getCategories();
  }
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async (category: Omit<Category, 'id'>, { rejectWithValue }) => {
    try {
      const categoryId = await categoryService.createCategory(category);
      return { id: categoryId, ...category };
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, ...updates }: { id: string } & Partial<Omit<Category, 'id'>>, { rejectWithValue }) => {
    try {
      await categoryService.updateCategory(id, updates);
      return { id, ...updates };
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoryService.deleteCategory(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to delete category');
    }
  }
);

// Inventory-related async thunks
export const fetchCategoryInventoryLevels = createAsyncThunk(
  'categories/fetchCategoryInventoryLevels',
  async (_, { rejectWithValue }) => {
    try {
      const inventoryLevels = await inventoryService.getInventoryLevels();
      return inventoryLevels;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to fetch category inventory levels');
    }
  }
);

export const fetchCategoryGroups = createAsyncThunk(
  'categories/fetchCategoryGroups',
  async (_, { rejectWithValue }) => {
    try {
      return await categoryGroupService.getCategoryGroups();
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to fetch category groups');
    }
  }
);

export const updateCategoryWithInventorySync = createAsyncThunk(
  'categories/updateCategoryWithInventorySync',
  async ({ 
    id, 
    updates, 
    syncInventory = true 
  }: { 
    id: string; 
    updates: Partial<Omit<Category, 'id'>>; 
    syncInventory?: boolean;
  }, { rejectWithValue }) => {
    try {
      await categoryService.updateCategory(id, updates);
      
      let inventoryLevels: InventoryLevel[] = [];
      if (syncInventory) {
        inventoryLevels = await inventoryService.getInventoryLevels();
      }
      
      return { id, updates, inventoryLevels };
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to update category with inventory sync');
    }
  }
);

export const deleteCategoryWithInventorySync = createAsyncThunk(
  'categories/deleteCategoryWithInventorySync',
  async ({ 
    id, 
    syncInventory = true 
  }: { 
    id: string; 
    syncInventory?: boolean;
  }, { rejectWithValue }) => {
    try {
      await categoryService.deleteCategory(id);
      
      let inventoryLevels: InventoryLevel[] = [];
      if (syncInventory) {
        inventoryLevels = await inventoryService.getInventoryLevels();
      }
      
      return { id, inventoryLevels };
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to delete category with inventory sync');
    }
  }
);

// Deduction-related async thunks
export const fetchCategoriesWithDeduction = createAsyncThunk(
  'categories/fetchCategoriesWithDeduction',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await categoryService.getCategoriesWithInventoryDeduction();
      return categories;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to fetch categories with deduction');
    }
  }
);

export const updateCategoryDeductionQuantity = createAsyncThunk(
  'categories/updateCategoryDeductionQuantity',
  async ({ 
    categoryId, 
    quantity 
  }: { 
    categoryId: string; 
    quantity: number | undefined;
  }, { rejectWithValue }) => {
    try {
      await categoryService.updateInventoryDeductionQuantity(categoryId, quantity ?? null);
      return { categoryId, quantity };
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to update category deduction quantity');
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    selectCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    clearCategoriesError: (state) => {
      state.error = null;
    },
    
    // Inventory-related reducers
    updateCategoryInventoryLevels: (state, action: PayloadAction<InventoryLevel[]>) => {
      // Map inventory levels by categoryGroupId
      if (!action.payload || !Array.isArray(action.payload)) {
        state.categoryGroupInventoryLevels = {};
        return;
      }
      state.categoryGroupInventoryLevels = action.payload.reduce((acc, level) => {
        acc[level.categoryGroupId] = level;
        return acc;
      }, {} as Record<string, InventoryLevel>);
      
      // Update category inventory status and aggregations
      const lowStockCategories: string[] = [];
      const zeroStockCategories: string[] = [];
      
      state.items.forEach(category => {
        // Find related category groups
        const relatedGroups = state.categoryGroups.filter(group => 
          group.id && category.categoryGroupId === group.id
        );
        
        if (relatedGroups.length > 0) {
          // Determine overall category status based on related groups
          let hasLowStock = false;
          let hasZeroStock = false;
          
          relatedGroups.forEach(group => {
            const level = group.id ? state.categoryGroupInventoryLevels[group.id] : null;
            if (level) {
              if (level.status === 'low_stock') {
                hasLowStock = true;
              } else if (level.status === 'zero_stock' || level.status === 'negative_stock') {
                hasZeroStock = true;
              }
            }
          });
          
          // Set category status (zero stock takes priority)
          if (hasZeroStock) {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'zero_stock';
              zeroStockCategories.push(category.id);
            }
          } else if (hasLowStock) {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'low_stock';
              lowStockCategories.push(category.id);
            }
          } else {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'healthy';
            }
          }
        } else {
          if (category.id) {
            state.categoryInventoryStatus[category.id] = 'healthy';
          }
        }
      });
      
      state.categoriesWithLowStock = lowStockCategories;
      state.categoriesWithZeroStock = zeroStockCategories;
    },
    
    updateCategoryInventoryAlerts: (state, action: PayloadAction<InventoryAlert[]>) => {
      state.categoryInventoryAlerts = action.payload;
    },
    
    clearInventoryError: (state) => {
      state.inventoryError = null;
    },
    
    clearCategoryGroupsError: (state) => {
      state.categoryGroupsError = null;
    },
    
    updateCategoryGroups: (state, action: PayloadAction<CategoryGroup[]>) => {
      state.categoryGroups = action.payload;
    },
    
    // Deduction-related reducers
    updateCategoriesWithDeduction: (state, action: PayloadAction<Category[]>) => {
      const categoriesWithDeduction = action.payload
        .filter(category => category.inventoryDeductionQuantity && category.inventoryDeductionQuantity > 0)
        .map(category => category.id!)
        .filter(Boolean);
      
      state.categoriesWithDeduction = categoriesWithDeduction;
      
      // Update deduction configuration mapping
      const deductionConfig: Record<string, number> = {};
      action.payload.forEach(category => {
        if (category.id && category.inventoryDeductionQuantity && category.inventoryDeductionQuantity > 0) {
          deductionConfig[category.id] = category.inventoryDeductionQuantity;
        }
      });
      state.deductionConfiguration = deductionConfig;
    },
    
    updateCategoryDeductionConfig: (state, action: PayloadAction<{categoryId: string; quantity: number | undefined}>) => {
      const { categoryId, quantity } = action.payload;
      
      if (quantity && quantity > 0) {
        // Add or update deduction configuration
        state.deductionConfiguration[categoryId] = quantity;
        if (!state.categoriesWithDeduction.includes(categoryId)) {
          state.categoriesWithDeduction.push(categoryId);
        }
      } else {
        // Remove deduction configuration
        delete state.deductionConfiguration[categoryId];
        state.categoriesWithDeduction = state.categoriesWithDeduction.filter(id => id !== categoryId);
      }
    },
    
    clearDeductionError: (state) => {
      state.deductionError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Categories
    builder.addCase(fetchCategories.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchCategories.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch categories';
    });

    // Create Category
    builder.addCase(createCategory.fulfilled, (state, action) => {
      state.items.push(action.payload);
    });
    builder.addCase(createCategory.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Update Category
    builder.addCase(updateCategory.fulfilled, (state, action) => {
      const index = state.items.findIndex(cat => cat.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    });
    builder.addCase(updateCategory.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Delete Category
    builder.addCase(deleteCategory.fulfilled, (state, action) => {
      state.items = state.items.filter(cat => cat.id !== action.payload);
      if (state.selectedCategory === action.payload) {
        state.selectedCategory = null;
      }
    });
    builder.addCase(deleteCategory.rejected, (state, action) => {
      state.error = action.payload as string;
    });
    
    // Fetch Category Inventory Levels
    builder.addCase(fetchCategoryInventoryLevels.pending, (state) => {
      state.inventoryLoading = true;
      state.inventoryError = null;
    });
    builder.addCase(fetchCategoryInventoryLevels.fulfilled, (state, action) => {
      state.inventoryLoading = false;
      
      // Map inventory levels by categoryGroupId
      if (!action.payload || !Array.isArray(action.payload)) {
        state.categoryGroupInventoryLevels = {};
        return;
      }
      state.categoryGroupInventoryLevels = action.payload.reduce((acc, level) => {
        acc[level.categoryGroupId] = level;
        return acc;
      }, {} as Record<string, InventoryLevel>);
      
      // Update category inventory status and aggregations
      const lowStockCategories: string[] = [];
      const zeroStockCategories: string[] = [];
      
      state.items.forEach(category => {
        // Find related category groups
        const relatedGroups = state.categoryGroups.filter(group => 
          group.id && category.categoryGroupId === group.id
        );
        
        if (relatedGroups.length > 0) {
          // Determine overall category status based on related groups
          let hasLowStock = false;
          let hasZeroStock = false;
          
          relatedGroups.forEach(group => {
            const level = group.id ? state.categoryGroupInventoryLevels[group.id] : null;
            if (level) {
              if (level.status === 'low_stock') {
                hasLowStock = true;
              } else if (level.status === 'zero_stock' || level.status === 'negative_stock') {
                hasZeroStock = true;
              }
            }
          });
          
          // Set category status (zero stock takes priority)
          if (hasZeroStock) {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'zero_stock';
              zeroStockCategories.push(category.id);
            }
          } else if (hasLowStock) {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'low_stock';
              lowStockCategories.push(category.id);
            }
          } else {
            if (category.id) {
              state.categoryInventoryStatus[category.id] = 'healthy';
            }
          }
        } else {
          if (category.id) {
            state.categoryInventoryStatus[category.id] = 'healthy';
          }
        }
      });
      
      state.categoriesWithLowStock = lowStockCategories;
      state.categoriesWithZeroStock = zeroStockCategories;
    });
    builder.addCase(fetchCategoryInventoryLevels.rejected, (state, action) => {
      state.inventoryLoading = false;
      state.inventoryError = action.payload as string;
    });
    
    // Fetch Category Groups
    builder.addCase(fetchCategoryGroups.pending, (state) => {
      state.categoryGroupsLoading = true;
      state.categoryGroupsError = null;
    });
    builder.addCase(fetchCategoryGroups.fulfilled, (state, action) => {
      state.categoryGroupsLoading = false;
      state.categoryGroups = action.payload;
    });
    builder.addCase(fetchCategoryGroups.rejected, (state, action) => {
      state.categoryGroupsLoading = false;
      state.categoryGroupsError = action.payload as string;
    });
    
    // Update Category With Inventory Sync
    builder.addCase(updateCategoryWithInventorySync.fulfilled, (state, action) => {
      const { id, updates, inventoryLevels } = action.payload;
      const index = state.items.findIndex(cat => cat.id === id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...updates };
      }
      
      // Update inventory levels if provided
      if (inventoryLevels.length > 0) {
        state.categoryGroupInventoryLevels = inventoryLevels.reduce((acc, level) => {
          acc[level.categoryGroupId] = level;
          return acc;
        }, {} as Record<string, InventoryLevel>);
      }
    });
    builder.addCase(updateCategoryWithInventorySync.rejected, (state, action) => {
      state.error = action.payload as string;
    });
    
    // Delete Category With Inventory Sync
    builder.addCase(deleteCategoryWithInventorySync.fulfilled, (state, action) => {
      const { id, inventoryLevels } = action.payload;
      state.items = state.items.filter(cat => cat.id !== id);
      if (state.selectedCategory === id) {
        state.selectedCategory = null;
      }
      
      // Update inventory levels if provided
      if (inventoryLevels.length > 0) {
        state.categoryGroupInventoryLevels = inventoryLevels.reduce((acc, level) => {
          acc[level.categoryGroupId] = level;
          return acc;
        }, {} as Record<string, InventoryLevel>);
      }
      
      // Clear category from inventory status tracking
      delete state.categoryInventoryStatus[id];
      state.categoriesWithLowStock = state.categoriesWithLowStock.filter(catId => catId !== id);
      state.categoriesWithZeroStock = state.categoriesWithZeroStock.filter(catId => catId !== id);
    });
    builder.addCase(deleteCategoryWithInventorySync.rejected, (state, action) => {
      state.error = action.payload as string;
    });
    
    // Fetch Categories With Deduction
    builder.addCase(fetchCategoriesWithDeduction.pending, (state) => {
      state.deductionLoading = true;
      state.deductionError = null;
    });
    builder.addCase(fetchCategoriesWithDeduction.fulfilled, (state, action) => {
      state.deductionLoading = false;
      
      const categoriesWithDeduction = action.payload
        .filter(category => category.inventoryDeductionQuantity && category.inventoryDeductionQuantity > 0)
        .map(category => category.id!)
        .filter(Boolean);
      
      state.categoriesWithDeduction = categoriesWithDeduction;
      
      // Update deduction configuration mapping
      const deductionConfig: Record<string, number> = {};
      action.payload.forEach(category => {
        if (category.id && category.inventoryDeductionQuantity && category.inventoryDeductionQuantity > 0) {
          deductionConfig[category.id] = category.inventoryDeductionQuantity;
        }
      });
      state.deductionConfiguration = deductionConfig;
    });
    builder.addCase(fetchCategoriesWithDeduction.rejected, (state, action) => {
      state.deductionLoading = false;
      state.deductionError = action.payload as string;
    });
    
    // Update Category Deduction Quantity
    builder.addCase(updateCategoryDeductionQuantity.fulfilled, (state, action) => {
      const { categoryId, quantity } = action.payload;
      
      // Update the category in the items array
      const categoryIndex = state.items.findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        state.items[categoryIndex] = {
          ...state.items[categoryIndex],
          inventoryDeductionQuantity: quantity
        };
      }
      
      // Update deduction state
      if (quantity && quantity > 0) {
        state.deductionConfiguration[categoryId] = quantity;
        if (!state.categoriesWithDeduction.includes(categoryId)) {
          state.categoriesWithDeduction.push(categoryId);
        }
      } else {
        delete state.deductionConfiguration[categoryId];
        state.categoriesWithDeduction = state.categoriesWithDeduction.filter(id => id !== categoryId);
      }
    });
    builder.addCase(updateCategoryDeductionQuantity.rejected, (state, action) => {
      state.deductionError = action.payload as string;
    });
  },
});

export const { 
  selectCategory, 
  clearCategoriesError,
  updateCategoryInventoryLevels,
  updateCategoryInventoryAlerts,
  clearInventoryError,
  clearCategoryGroupsError,
  updateCategoryGroups,
  updateCategoriesWithDeduction,
  updateCategoryDeductionConfig,
  clearDeductionError
} = categoriesSlice.actions;

// Inventory-related selectors
export const selectCategoryInventoryLevels = (state: { categories: CategoriesState }) => 
  state.categories.categoryGroupInventoryLevels;

export const selectCategoryInventoryAlerts = (state: { categories: CategoriesState }) => 
  state.categories.categoryInventoryAlerts;

export const selectCategoriesWithLowStock = (state: { categories: CategoriesState }) => 
  state.categories.categoriesWithLowStock;

export const selectCategoriesWithZeroStock = (state: { categories: CategoriesState }) => 
  state.categories.categoriesWithZeroStock;

export const selectCategoryInventoryStatus = (state: { categories: CategoriesState }) => 
  state.categories.categoryInventoryStatus;

export const selectCategoryGroups = (state: { categories: CategoriesState }) => 
  state.categories.categoryGroups;

export const selectInventoryLoading = (state: { categories: CategoriesState }) => 
  state.categories.inventoryLoading;

export const selectInventoryError = (state: { categories: CategoriesState }) => 
  state.categories.inventoryError;

export const selectCategoryGroupsLoading = (state: { categories: CategoriesState }) => 
  state.categories.categoryGroupsLoading;

export const selectCategoryGroupsError = (state: { categories: CategoriesState }) => 
  state.categories.categoryGroupsError;

// Helper selector to get category with inventory data
export const selectCategoryWithInventory = (state: { categories: CategoriesState }, categoryId: string) => {
  const category = state.categories.items.find(cat => cat.id === categoryId);
  if (!category) return null;
  
  const inventoryStatus = state.categories.categoryInventoryStatus[categoryId];
  const relatedGroups = state.categories.categoryGroups.filter(() => 
    false // TODO: Fix relationship - CategoryGroup doesn't have categoryIds property
  );
  
  const inventoryLevels = relatedGroups.map(group => 
    group.id ? state.categories.categoryGroupInventoryLevels[group.id] : null
  ).filter(Boolean);
  
  return {
    ...category,
    inventoryStatus,
    relatedGroups,
    inventoryLevels
  };
};

// Helper selector to get categories by inventory status
export const selectCategoriesByInventoryStatus = (state: { categories: CategoriesState }, status: InventoryStatus) => {
  return state.categories.items.filter(category => 
    category.id && state.categories.categoryInventoryStatus[category.id] === status
  );
};

// Deduction-related selectors
export const selectCategoriesWithDeduction = (state: { categories: CategoriesState }) => 
  state.categories.categoriesWithDeduction;

export const selectDeductionConfiguration = (state: { categories: CategoriesState }) => 
  state.categories.deductionConfiguration;

export const selectDeductionLoading = (state: { categories: CategoriesState }) => 
  state.categories.deductionLoading;

export const selectDeductionError = (state: { categories: CategoriesState }) => 
  state.categories.deductionError;

// Helper selector to get category deduction quantity
export const selectCategoryDeductionQuantity = (state: { categories: CategoriesState }, categoryId: string) => 
  state.categories.deductionConfiguration[categoryId] || undefined;

// Helper selector to check if category has deduction enabled
export const selectIsCategoryDeductionEnabled = (state: { categories: CategoriesState }, categoryId: string) => 
  state.categories.categoriesWithDeduction.includes(categoryId);

// Helper selector to get categories with deduction details
export const selectCategoriesWithDeductionDetails = (state: { categories: CategoriesState }) => {
  return state.categories.items.filter(category => 
    category.id && state.categories.categoriesWithDeduction.includes(category.id)
  ).map(category => ({
    ...category,
    deductionQuantity: category.id ? state.categories.deductionConfiguration[category.id] : undefined
  }));
};

export default categoriesSlice.reducer;
