import { Product } from '../types/product';
import { Category } from '../services/category.service';

/**
 * Configuration interface for category-based sorting
 */
export interface CategorySortConfig {
  primarySort: 'category' | 'name' | 'price' | 'sku';
  secondarySort?: 'name' | 'price' | 'sku';
  sortOrder: 'asc' | 'desc';
  groupByCategory: boolean;
  categoryOrder?: string[]; // Optional manual category ordering
  prioritizeActiveCategories: boolean;
  sortCategoriesAlphabetically: boolean;
}

/**
 * Statistics interface for category grouping
 */
export interface CategoryStats {
  id: string;
  name: string;
  count: number;
  totalValue: number;
  avgPrice: number;
}

/**
 * Extended product interface with resolved category information
 */
export interface ProductWithCategory extends Product {
  categoryName?: string;
  categoryTag?: string;
}

/**
 * Default sorting configuration
 */
export const defaultSortConfig: CategorySortConfig = {
  primarySort: 'category',
  secondarySort: 'sku',
  sortOrder: 'asc',
  groupByCategory: true,
  prioritizeActiveCategories: false,
  sortCategoriesAlphabetically: true,
};

/**
 * Main function to sort products by category with configurable options
 */
export function sortProductsByCategory(
  products: Product[], 
  categories: Category[],
  config: CategorySortConfig = defaultSortConfig
): ProductWithCategory[] {
  if (!products?.length) return [];
  
  // Create category lookup map for efficient resolution
  const categoryMap = new Map<string, Category>();
  categories.forEach(category => {
    if (category.id) {
      categoryMap.set(category.id, category);
    }
  });
  
  // Enhance products with category information
  const productsWithCategory: ProductWithCategory[] = products.map(product => {
    const category = product.categoryId ? categoryMap.get(product.categoryId) : undefined;
    return {
      ...product,
      categoryName: category?.name || 'Uncategorized',
      categoryTag: category?.tag || '',
    };
  });
  
  // If not grouping by category, use simple sorting
  if (!config.groupByCategory) {
    return sortProductsByField(productsWithCategory, config.primarySort, config.sortOrder);
  }
  
  // Group products by category
  const categoryGroups: Record<string, ProductWithCategory[]> = {};
  productsWithCategory.forEach(product => {
    const categoryKey = product.categoryName || 'Uncategorized';
    if (!categoryGroups[categoryKey]) {
      categoryGroups[categoryKey] = [];
    }
    categoryGroups[categoryKey].push(product);
  });
  
  // Determine category order
  const categoryKeys = Object.keys(categoryGroups);
  if (config.categoryOrder?.length) {
    // Use manual category order if provided
    const orderMap = new Map(config.categoryOrder.map((cat, idx) => [cat, idx]));
    categoryKeys.sort((a, b) => {
      const aIdx = orderMap.has(a) ? orderMap.get(a)! : Infinity;
      const bIdx = orderMap.has(b) ? orderMap.get(b)! : Infinity;
      if (aIdx !== bIdx) return aIdx - bIdx;
      // Fallback to alphabetical for categories not in custom order
      return a.localeCompare(b);
    });
  } else {
    // Default alphabetical order, but put "Uncategorized" last
    categoryKeys.sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return config.sortOrder === 'asc' 
        ? a.localeCompare(b) 
        : b.localeCompare(a);
    });
  }
  
  // Sort products within each category and combine
  const sortedProducts: ProductWithCategory[] = [];
  categoryKeys.forEach(categoryKey => {
    const productsInCategory = categoryGroups[categoryKey];
    if (config.secondarySort) {
      sortProductsByField(productsInCategory, config.secondarySort, config.sortOrder);
    }
    sortedProducts.push(...productsInCategory);
  });
  
  return sortedProducts;
}

/**
 * Helper function for single-field sorting
 */
function sortProductsByField(
  products: ProductWithCategory[], 
  field: 'category' | 'name' | 'price' | 'sku', 
  order: 'asc' | 'desc'
): ProductWithCategory[] {
  return products.sort((a, b) => {
    let valueA: string | number;
    let valueB: string | number;
    
    switch (field) {
      case 'category':
        valueA = a.categoryName || 'Uncategorized';
        valueB = b.categoryName || 'Uncategorized';
        break;
      case 'name':
        valueA = a.name || '';
        valueB = b.name || '';
        break;
      case 'price':
        valueA = a.sellingPrice || 0;
        valueB = b.sellingPrice || 0;
        return order === 'asc' ? valueA - valueB : valueB - valueA;
      case 'sku':
        valueA = a.sku || '';
        valueB = b.sku || '';
        break;
      default:
        valueA = '';
        valueB = '';
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return order === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    }
    
    return 0;
  });
}

/**
 * Get unique categories from product list with counts
 */
export function getUniqueCategories(
  products: Product[], 
  categories: Category[]
): { id: string; name: string; count: number }[] {
  const categoryMap = new Map<string, Category>();
  categories.forEach(category => {
    if (category.id) {
      categoryMap.set(category.id, category);
    }
  });
  
  const categoryCounts = new Map<string, number>();
  
  products.forEach(product => {
    const category = product.categoryId ? categoryMap.get(product.categoryId) : undefined;
    const categoryId = category?.id || 'uncategorized';
    
    categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
  });
  
  const result = Array.from(categoryCounts.entries()).map(([id, count]) => {
    const category = categories.find(c => c.id === id);
    return {
      id,
      name: category?.name || 'Uncategorized',
      count
    };
  });
  
  return result.sort((a, b) => {
    if (a.name === 'Uncategorized') return 1;
    if (b.name === 'Uncategorized') return -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generate comprehensive category statistics for UI display
 */
export function generateCategoryStats(
  products: Product[], 
  categories: Category[]
): CategoryStats[] {
  const categoryMap = new Map<string, Category>();
  categories.forEach(category => {
    if (category.id) {
      categoryMap.set(category.id, category);
    }
  });
  
  const categoryGroups: Record<string, ProductWithCategory[]> = {};
  
  products.forEach(product => {
    const category = product.categoryId ? categoryMap.get(product.categoryId) : undefined;
    const categoryId = category?.id || 'uncategorized';
    const categoryName = category?.name || 'Uncategorized';
    
    if (!categoryGroups[categoryId]) {
      categoryGroups[categoryId] = [];
    }
    
    categoryGroups[categoryId].push({
      ...product,
      categoryName,
      categoryTag: category?.tag || '',
    });
  });
  
  const stats = Object.entries(categoryGroups).map(([id, products]) => {
    const totalValue = products.reduce((sum, product) => {
      return sum + (product.sellingPrice || 0);
    }, 0);
    
    const avgPrice = products.length > 0 ? totalValue / products.length : 0;
    
    return {
      id,
      name: products[0]?.categoryName || 'Uncategorized',
      count: products.length,
      totalValue,
      avgPrice: Math.round(avgPrice * 100) / 100, // Round to 2 decimal places
    };
  });
  
  return stats.sort((a, b) => {
    if (a.name === 'Uncategorized') return 1;
    if (b.name === 'Uncategorized') return -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Validate sorting configuration
 */
export function validateSortConfig(config: CategorySortConfig): string[] {
  const errors: string[] = [];
  
  const validPrimarySorts = ['category', 'name', 'price', 'sku'];
  const validSecondarySorts = ['name', 'price', 'sku'];
  const validOrders = ['asc', 'desc'];
  
  if (!validPrimarySorts.includes(config.primarySort)) {
    errors.push(`Invalid primarySort: ${config.primarySort}`);
  }
  
  if (config.secondarySort && !validSecondarySorts.includes(config.secondarySort)) {
    errors.push(`Invalid secondarySort: ${config.secondarySort}`);
  }
  
  if (!validOrders.includes(config.sortOrder)) {
    errors.push(`Invalid sortOrder: ${config.sortOrder}`);
  }
  
  if (typeof config.groupByCategory !== 'boolean') {
    errors.push('groupByCategory must be a boolean');
  }
  
  if (typeof config.prioritizeActiveCategories !== 'boolean') {
    errors.push('prioritizeActiveCategories must be a boolean');
  }
  
  if (typeof config.sortCategoriesAlphabetically !== 'boolean') {
    errors.push('sortCategoriesAlphabetically must be a boolean');
  }
  
  return errors;
}

/**
 * Create a preview of how products will be organized after sorting
 */
export function createSortPreview(
  products: Product[],
  categories: Category[],
  config: CategorySortConfig
): { categoryName: string; productCount: number; sampleProducts: string[] }[] {
  const sortedProducts = sortProductsByCategory(products, categories, config);
  const categoryGroups: Record<string, ProductWithCategory[]> = {};
  
  sortedProducts.forEach(product => {
    const categoryName = product.categoryName || 'Uncategorized';
    if (!categoryGroups[categoryName]) {
      categoryGroups[categoryName] = [];
    }
    categoryGroups[categoryName].push(product);
  });
  
  return Object.entries(categoryGroups).map(([categoryName, products]) => ({
    categoryName,
    productCount: products.length,
    sampleProducts: products.slice(0, 3).map(p => p.name), // Show first 3 products as sample
  }));
} 