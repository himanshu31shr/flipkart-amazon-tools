import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Product, ProductFilter, ProductService } from '../../services/product.service';
import { Category, CategoryService } from '../../services/category.service';

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
};

const productService = new ProductService();
const categoryService = new CategoryService();

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
      });
  },
});

export const { setFilters, clearFilters, setOptimisticUpdate, clearCategoryProducts } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;
export const selectCategories = (state: { products: ProductsState }) => state.products.categories;
export const selectCategoryProducts = (state: { products: ProductsState }) => state.products.categoryProducts;
export const selectCategoryProductsLoading = (state: { products: ProductsState }) => state.products.categoryProductsLoading;
export const selectCategoryProductsError = (state: { products: ProductsState }) => state.products.categoryProductsError; 