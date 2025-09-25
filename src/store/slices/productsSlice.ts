import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Product, ProductFilter, ProductService } from '../../services/product.service';
import { Category, CategoryService } from '../../services/category.service';
import { InventoryLevel, InventoryStatus } from '../../types/inventory';
import { InventoryService } from '../../services/inventory.service';

export interface ProductsState {
  items: Product[];
  filteredItems: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilter;
  lastFetched: number | null;
  detailsCache: Record<string, Product>;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  categoryProducts: Product[];
  categoryProductsLoading: boolean;
  categoryProductsError: string | null;
  
  // Inventory-related state
  inventoryLevels: Record<string, InventoryLevel>; // categoryGroupId -> InventoryLevel
  inventoryLoading: boolean;
  inventoryError: string | null;
  productInventoryStatus: Record<string, InventoryStatus>; // productSku -> InventoryStatus
  lowStockProducts: Product[];
  zeroStockProducts: Product[];
}

const initialState: ProductsState = {
  items: [],
  filteredItems: [],
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
  
  // Inventory-related initial state
  inventoryLevels: {},
  inventoryLoading: false,
  inventoryError: null,
  productInventoryStatus: {},
  lowStockProducts: [],
  zeroStockProducts: [],
};

const productService = new ProductService();
const categoryService = new CategoryService();
const inventoryService = new InventoryService();

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (filters: ProductFilter) => {
    return await productService.getProducts(filters);
  }
);

export const fetchProductDetails = createAsyncThunk(
  'products/fetchDetails',
  async (sku: string, { getState }) => {
    const state = getState() as { products: ProductsState };
    const { detailsCache } = state.products;
    
    if (detailsCache[sku]) {
      return { sku, details: detailsCache[sku] };
    }
    
    const details = await productService.getProductDetails(sku);
    return { sku, details };
  }
);

export const importProducts = createAsyncThunk(
  'products/importProducts',
  async ({ file, updateExisting = false }: { file: File; updateExisting?: boolean }) => {
    const importedProducts = await productService.parseProducts(file);
    const result = await productService.saveOrUpdateProducts(importedProducts, updateExisting);
    return { 
      products: importedProducts, 
      summary: result,
      updateExisting 
    };
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ sku, data }: { sku: string; data: Partial<Product> }) => {
    await productService.updateProduct(sku, data);
    return { sku, data };
  }
);

export const bulkUpdateProducts = createAsyncThunk(
  'products/bulkUpdateProducts',
  async ({ skus, data }: { skus: string[]; data: Partial<Product> }) => {
    const updates = skus.map(sku => productService.updateProduct(sku, data));
    await Promise.all(updates);
    return { skus, data };
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async () => {
    return await categoryService.getCategories();
  }
);

export const addCategory = createAsyncThunk(
  'products/addCategory',
  async (categoryData: { name: string; description?: string; tag?: string }) => {
    const newCategoryId = await categoryService.createCategory({ 
      name: categoryData.name,
      description: categoryData.description || '',
      tag: categoryData.tag || ''
    });
    return newCategoryId;
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  'products/fetchProductsByCategory',
  async (categoryId: string) => {
    return await productService.getProducts({ categoryId });
  }
);

// Inventory-related async thunks
export const fetchProductInventoryLevels = createAsyncThunk(
  'products/fetchProductInventoryLevels',
  async () => {
    const inventoryLevels = await inventoryService.getInventoryLevels();
    return inventoryLevels;
  }
);

export const updateProductWithInventorySync = createAsyncThunk(
  'products/updateProductWithInventorySync',
  async ({ sku, data, syncInventory = true }: { 
    sku: string; 
    data: Partial<Product>; 
    syncInventory?: boolean;
  }) => {
    await productService.updateProduct(sku, data);
    
    let inventoryLevels: InventoryLevel[] = [];
    if (syncInventory) {
      inventoryLevels = await inventoryService.getInventoryLevels();
    }
    
    return { sku, data, inventoryLevels };
  }
);

export const bulkUpdateProductsWithInventorySync = createAsyncThunk(
  'products/bulkUpdateProductsWithInventorySync',
  async ({ skus, data, syncInventory = true }: { 
    skus: string[]; 
    data: Partial<Product>; 
    syncInventory?: boolean;
  }) => {
    const updates = skus.map(sku => productService.updateProduct(sku, data));
    await Promise.all(updates);
    
    let inventoryLevels: InventoryLevel[] = [];
    if (syncInventory) {
      inventoryLevels = await inventoryService.getInventoryLevels();
    }
    
    return { skus, data, inventoryLevels };
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredItems = state.items.filter(product => {
        if (state.filters.platform && product.platform !== state.filters.platform) {
          return false;
        }
        if (state.filters.search) {
          const searchLower = state.filters.search.toLowerCase();
          return (
            product.sku.toLowerCase().includes(searchLower) ||
            product.name.toLowerCase().includes(searchLower) ||
            (product.description && product.description.toLowerCase().includes(searchLower))
          );
        }
        const currentFilters = state.filters as ProductFilter;
        if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) {
           return false;
        }
        return true;
      });
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredItems = state.items;
    },
    setOptimisticUpdate: (state, action) => {
      state.items = action.payload;
      state.filteredItems = action.payload;
    },
    clearCategoryProducts: (state) => {
      state.categoryProducts = [];
      state.categoryProductsError = null;
    },
    
    // Inventory-related reducers
    updateProductInventoryStatus: (state, action) => {
      const { productSku, status } = action.payload;
      state.productInventoryStatus[productSku] = status;
      
      // Update filtered items with inventory status
      state.filteredItems = state.filteredItems.map(product => {
        if (product.sku === productSku) {
          return { ...product, inventoryStatus: status };
        }
        return product;
      });
    },
    
    updateInventoryLevelsMapping: (state, action) => {
      const inventoryLevels: InventoryLevel[] = action.payload;
      if (!inventoryLevels || !Array.isArray(inventoryLevels)) {
        state.inventoryLevels = {};
        return;
      }
      state.inventoryLevels = inventoryLevels.reduce((acc, level) => {
        acc[level.categoryGroupId] = level;
        return acc;
      }, {} as Record<string, InventoryLevel>);
      
      // Update product inventory statuses based on category group mappings
      state.items.forEach(product => {
        if (product.categoryGroupId && state.inventoryLevels[product.categoryGroupId]) {
          const level = state.inventoryLevels[product.categoryGroupId];
          state.productInventoryStatus[product.sku] = level.status;
        }
      });
      
      // Update low stock and zero stock products
      const lowStock: Product[] = [];
      const zeroStock: Product[] = [];
      
      state.items.forEach(product => {
        const status = state.productInventoryStatus[product.sku];
        if (status === 'low_stock') {
          lowStock.push(product);
        } else if (status === 'zero_stock' || status === 'negative_stock') {
          zeroStock.push(product);
        }
      });
      
      state.lowStockProducts = lowStock;
      state.zeroStockProducts = zeroStock;
    },
    
    clearInventoryError: (state) => {
      state.inventoryError = null;
    },
    
    filterProductsByInventoryStatus: (state, action) => {
      const { status } = action.payload;
      if (status === 'all') {
        state.filteredItems = state.items;
      } else {
        state.filteredItems = state.items.filter(product => 
          state.productInventoryStatus[product.sku] === status
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.filteredItems = action.payload.filter(product => {
          if (state.filters.platform && product.platform !== state.filters.platform) return false;
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
          }
          const currentFilters = state.filters as ProductFilter;
          if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
          return true;
        });
        state.lastFetched = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch products';
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        const { sku, details } = action.payload;
        state.detailsCache[sku] = details;
      })
      .addCase(importProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importProducts.fulfilled, (state, action) => {
        state.loading = false;
        const { products, updateExisting } = action.payload;
        
        if (updateExisting) {
          // If updating existing products, refresh the entire products list to get updated data
          // For now, we'll add the new products and the existing ones will be updated in the background
          const newProductSkus = new Set(products.map(p => `${p.sku}-${p.platform}`));
          const existingProducts = state.items.filter(p => !newProductSkus.has(`${p.sku}-${p.platform}`));
          state.items = [...existingProducts, ...products];
        } else {
          // Original behavior: just add new products
          state.items = [...state.items, ...products];
        }
        
        state.filteredItems = state.items.filter(product => {
          if (state.filters.platform && product.platform !== state.filters.platform) return false;
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
          }
          const currentFilters = state.filters as ProductFilter;
          if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
          return true;
        });
      })
      .addCase(importProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to import products';
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const { sku, data } = action.payload;
        const index = state.items.findIndex(p => p.sku === sku);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...data };
          state.filteredItems = state.items.filter(product => {
            if (state.filters.platform && product.platform !== state.filters.platform) return false;
            if (state.filters.search) {
              const searchLower = state.filters.search.toLowerCase();
              if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
            }
            const currentFilters = state.filters as ProductFilter;
            if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
            return true;
          });
        }
      })
      .addCase(bulkUpdateProducts.fulfilled, (state, action) => {
        const { skus, data } = action.payload;
        state.items = state.items.map(product => {
          if (skus.includes(product.sku)) {
            return { ...product, ...data };
          }
          return product;
        });
        state.filteredItems = state.items.filter(product => {
          if (state.filters.platform && product.platform !== state.filters.platform) return false;
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
          }
          const currentFilters = state.filters as ProductFilter;
          if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
          return true;
        });
      })
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.error.message || 'Failed to fetch categories';
      })
      .addCase(addCategory.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(addCategory.fulfilled, (state) => {
        state.categoriesLoading = false;
        // The payload is now the new category ID (string)
        // We need to refetch categories to get the updated list
        // A more sophisticated approach could optimistically add the category,
        // but refetching is simpler given the current structure.
        // We don't need to update state.categories directly with the ID.
        // The fetchCategories thunk should be dispatched after adding.
        // The toolbar handles the assignment using the ID returned by the thunk.
        // This reducer case primarily handles updating loading state and potentially errors.
        // A separate logic in the component or another thunk should trigger fetchCategories.
        // For now, we just clear loading state and rely on the component
        // to potentially trigger a fetch or the assignment logic to handle it.
        // No state update for categories is done here as the payload is not Category[].
        // The component (ProductTableToolbar) will use the ID for assignment
        // and likely trigger a fetchCategories after successful addition.
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.error.message || 'Failed to add category';
      })
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.categoryProductsLoading = true;
        state.categoryProductsError = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.categoryProductsLoading = false;
        state.categoryProducts = action.payload;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.categoryProductsLoading = false;
        state.categoryProductsError = action.error.message || 'Failed to fetch products for category';
      })
      
      // Fetch Product Inventory Levels
      .addCase(fetchProductInventoryLevels.pending, (state) => {
        state.inventoryLoading = true;
        state.inventoryError = null;
      })
      .addCase(fetchProductInventoryLevels.fulfilled, (state, action) => {
        state.inventoryLoading = false;
        
        // Map inventory levels by categoryGroupId
        state.inventoryLevels = action.payload.reduce((acc, level) => {
          acc[level.categoryGroupId] = level;
          return acc;
        }, {} as Record<string, InventoryLevel>);
        
        // Update product inventory statuses
        state.items.forEach(product => {
          if (product.categoryGroupId && state.inventoryLevels[product.categoryGroupId]) {
            const level = state.inventoryLevels[product.categoryGroupId];
            state.productInventoryStatus[product.sku] = level.status;
          }
        });
        
        // Update filtered items with inventory status
        state.filteredItems = state.items.filter(product => {
          if (state.filters.platform && product.platform !== state.filters.platform) return false;
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
          }
          const currentFilters = state.filters as ProductFilter;
          if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
          return true;
        });
        
        // Update low stock and zero stock products
        const lowStock: Product[] = [];
        const zeroStock: Product[] = [];
        
        state.items.forEach(product => {
          const status = state.productInventoryStatus[product.sku];
          if (status === 'low_stock') {
            lowStock.push(product);
          } else if (status === 'zero_stock' || status === 'negative_stock') {
            zeroStock.push(product);
          }
        });
        
        state.lowStockProducts = lowStock;
        state.zeroStockProducts = zeroStock;
      })
      .addCase(fetchProductInventoryLevels.rejected, (state, action) => {
        state.inventoryLoading = false;
        state.inventoryError = action.error.message || 'Failed to fetch product inventory levels';
      })
      
      // Update Product With Inventory Sync
      .addCase(updateProductWithInventorySync.fulfilled, (state, action) => {
        const { sku, data, inventoryLevels } = action.payload;
        const index = state.items.findIndex(p => p.sku === sku);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...data };
          
          // Update inventory levels if provided
          if (inventoryLevels.length > 0) {
            state.inventoryLevels = inventoryLevels.reduce((acc, level) => {
              acc[level.categoryGroupId] = level;
              return acc;
            }, {} as Record<string, InventoryLevel>);
            
            // Update inventory status for the updated product
            const product = state.items[index];
            if (product.categoryGroupId && state.inventoryLevels[product.categoryGroupId]) {
              const level = state.inventoryLevels[product.categoryGroupId];
              state.productInventoryStatus[product.sku] = level.status;
            }
          }
          
          // Update filtered items
          state.filteredItems = state.items.filter(product => {
            if (state.filters.platform && product.platform !== state.filters.platform) return false;
            if (state.filters.search) {
              const searchLower = state.filters.search.toLowerCase();
              if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
            }
            const currentFilters = state.filters as ProductFilter;
            if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
            return true;
          });
        }
      })
      
      // Bulk Update Products With Inventory Sync
      .addCase(bulkUpdateProductsWithInventorySync.fulfilled, (state, action) => {
        const { skus, data, inventoryLevels } = action.payload;
        state.items = state.items.map(product => {
          if (skus.includes(product.sku)) {
            return { ...product, ...data };
          }
          return product;
        });
        
        // Update inventory levels if provided
        if (inventoryLevels.length > 0) {
          state.inventoryLevels = inventoryLevels.reduce((acc, level) => {
            acc[level.categoryGroupId] = level;
            return acc;
          }, {} as Record<string, InventoryLevel>);
          
          // Update inventory statuses for updated products
          state.items.forEach(product => {
            if (skus.includes(product.sku) && product.categoryGroupId && state.inventoryLevels[product.categoryGroupId]) {
              const level = state.inventoryLevels[product.categoryGroupId];
              state.productInventoryStatus[product.sku] = level.status;
            }
          });
        }
        
        // Update filtered items
        state.filteredItems = state.items.filter(product => {
          if (state.filters.platform && product.platform !== state.filters.platform) return false;
          if (state.filters.search) {
            const searchLower = state.filters.search.toLowerCase();
            if (!product.sku.toLowerCase().includes(searchLower) && !product.name.toLowerCase().includes(searchLower) && !(product.description && product.description.toLowerCase().includes(searchLower))) return false;
          }
          const currentFilters = state.filters as ProductFilter;
          if (currentFilters.categoryId && product.categoryId !== currentFilters.categoryId) return false;
          return true;
        });
      });
  },
});

export const { 
  setFilters, 
  clearFilters, 
  setOptimisticUpdate, 
  clearCategoryProducts,
  updateProductInventoryStatus,
  updateInventoryLevelsMapping,
  clearInventoryError,
  filterProductsByInventoryStatus
} = productsSlice.actions;
export const productsReducer = productsSlice.reducer;
export default productsSlice.reducer;
export const selectCategories = (state: { products: ProductsState }) => state.products.categories;
export const selectCategoryProducts = (state: { products: ProductsState }) => state.products.categoryProducts;
export const selectCategoryProductsLoading = (state: { products: ProductsState }) => state.products.categoryProductsLoading;
export const selectCategoryProductsError = (state: { products: ProductsState }) => state.products.categoryProductsError;

// Inventory-related selectors
export const selectProductInventoryLevels = (state: { products: ProductsState }) => state.products.inventoryLevels;
export const selectProductInventoryStatus = (state: { products: ProductsState }) => state.products.productInventoryStatus;
export const selectLowStockProducts = (state: { products: ProductsState }) => state.products.lowStockProducts;
export const selectZeroStockProducts = (state: { products: ProductsState }) => state.products.zeroStockProducts;
export const selectInventoryLoading = (state: { products: ProductsState }) => state.products.inventoryLoading;
export const selectInventoryError = (state: { products: ProductsState }) => state.products.inventoryError;

// Helper selector to get product with inventory status
export const selectProductWithInventoryStatus = (state: { products: ProductsState }, sku: string) => {
  const product = state.products.items.find(p => p.sku === sku);
  if (!product) return null;
  
  const inventoryStatus = state.products.productInventoryStatus[sku];
  const categoryGroupLevel = product.categoryGroupId ? state.products.inventoryLevels[product.categoryGroupId] : null;
  
  return {
    ...product,
    inventoryStatus,
    categoryGroupLevel
  };
};

// Helper selector to get products by inventory status
export const selectProductsByInventoryStatus = (state: { products: ProductsState }, status: InventoryStatus) => {
  return state.products.items.filter(product => 
    state.products.productInventoryStatus[product.sku] === status
  );
}; 