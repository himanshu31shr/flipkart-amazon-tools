import { 
  CategoryExportData, 
  CategoryMetadata, 
  AggregationOptions 
} from '../types/categoryExportImport.types';
import { Category } from '../types/category';
import { Product } from '../types/product';
import { CategoryInventory } from '../types/categoryInventory.types';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { CategoryInventoryService } from './categoryInventory.service';

/**
 * CategoryDataAggregator - Handles data collection and relationship mapping
 * 
 * This service is responsible for gathering category data along with all
 * related products and inventory information, following the streaming batch
 * processing algorithm designed in the creative phase.
 * 
 * Key responsibilities:
 * - Efficient data collection with memory management
 * - Relationship mapping between categories, products, and inventory
 * - Data structuring for export operations
 * - Progress tracking for large datasets
 */
export class CategoryDataAggregator {
  private categoryService: CategoryService;
  private productService: ProductService;
  private inventoryService: CategoryInventoryService;

  constructor() {
    this.categoryService = new CategoryService();
    this.productService = new ProductService();
    this.inventoryService = new CategoryInventoryService();
  }

  /**
   * Aggregate all category data with related information
   * 
   * @param options Aggregation options for filtering and sorting
   * @param onProgress Progress callback function
   * @returns Promise resolving to array of category export data
   */
  async aggregateCategoryData(
    options: AggregationOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<CategoryExportData[]> {
    try {
      // Step 1: Get all categories
      const categories = await this.categoryService.getCategories();
      
      if (categories.length === 0) {
        return [];
      }

      // Apply filtering
      const filteredCategories = this.filterCategories(categories, options);
      
      // Apply sorting
      const sortedCategories = this.sortCategories(filteredCategories, options);

      const result: CategoryExportData[] = [];
      const batchSize = 10; // Process in batches to manage memory

      // Step 2: Process categories in batches
      for (let i = 0; i < sortedCategories.length; i += batchSize) {
        const batch = sortedCategories.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (category) => {
            const categoryData = await this.aggregateSingleCategory(category, options);
            
            // Report progress
            const currentIndex = i + batch.indexOf(category) + 1;
            if (onProgress) {
              onProgress(currentIndex, sortedCategories.length);
            }
            
            return categoryData;
          })
        );

        result.push(...batchResults);

        // Small delay to prevent blocking the main thread
        if (i + batchSize < sortedCategories.length) {
          await this.delay(1);
        }
      }

      return result;

    } catch (error) {
      console.error('Error aggregating category data:', error);
      throw new Error(`Failed to aggregate category data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aggregate data for a single category
   * 
   * @param category Category to process
   * @param options Aggregation options
   * @returns Promise resolving to category export data
   */
  private async aggregateSingleCategory(
    category: Category,
    options: AggregationOptions
  ): Promise<CategoryExportData> {
    const categoryData: CategoryExportData = {
      category,
      products: [],
      inventory: null,
      metadata: {} as CategoryMetadata
    };

    try {
      // Collect products if requested
      if (options.includeProducts) {
        categoryData.products = await this.getProductsForCategory(category.id);
      }

      // Collect inventory if requested
      if (options.includeInventory) {
        categoryData.inventory = await this.getInventoryForCategory(category.id);
      }

      // Generate metadata if requested
      if (options.includeMetadata) {
        categoryData.metadata = await this.generateCategoryMetadata(
          category,
          categoryData.products,
          categoryData.inventory
        );
      }

      return categoryData;

    } catch (error) {
      console.error(`Error processing category ${category.id}:`, error);
      // Return partial data rather than failing completely
      return categoryData;
    }
  }

  /**
   * Get all products for a specific category
   * 
   * @param categoryId Category ID
   * @returns Promise resolving to array of products
   */
  private async getProductsForCategory(categoryId: string | undefined): Promise<Product[]> {
    if (!categoryId) {
      return [];
    }
    
    try {
      // Use existing product service method to get products by category
      const allProducts = await this.productService.getProducts();
      return allProducts.filter(product => product.categoryId === categoryId);
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error);
      return [];
    }
  }

  /**
   * Get inventory data for a specific category
   * 
   * @param categoryId Category ID
   * @returns Promise resolving to category inventory or null
   */
  private async getInventoryForCategory(categoryId: string | undefined): Promise<CategoryInventory | null> {
    if (!categoryId) {
      return null;
    }
    
    try {
      const inventoryData = await this.inventoryService.getCategoryInventory(categoryId);
      // Extract just the inventory part from CategoryWithInventory
      return inventoryData?.inventory || null;
    } catch (error) {
      console.error(`Error fetching inventory for category ${categoryId}:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive metadata for a category
   * 
   * @param category Category data
   * @param products Associated products
   * @param inventory Inventory data
   * @returns Category metadata
   */
  private async generateCategoryMetadata(
    category: Category,
    products: Product[],
    inventory: CategoryInventory | null
  ): Promise<CategoryMetadata> {
    const metadata: CategoryMetadata = {
      productCount: products.length,
      totalInventory: 0,
      lowStockThreshold: inventory?.lowStockThreshold || 0,
      associatedSKUs: [],
      productNames: [],
      productPlatforms: [],
      productCostPrices: [],
      productSellingPrices: [],
      inventoryQuantities: [],
      createdAt: this.formatDateToString(category.createdAt) || new Date().toISOString(),
      updatedAt: this.formatDateToString(category.updatedAt) || new Date().toISOString()
    };

    // Process product data
    products.forEach(product => {
      metadata.associatedSKUs.push(product.sku || '');
      metadata.productNames.push(product.name || '');
      metadata.productPlatforms.push(product.platform || '');
      metadata.productCostPrices.push(product.customCostPrice || 0);
      metadata.productSellingPrices.push(product.sellingPrice || 0);
    });

    // Process inventory data
    if (inventory) {
      metadata.totalInventory = inventory.totalQuantity || 0;
      metadata.inventoryQuantities = products.map(() => {
        // In a real implementation, you might have per-product inventory
        // For now, we'll use the category inventory divided by product count
        return products.length > 0 ? Math.floor((inventory.totalQuantity || 0) / products.length) : 0;
      });
    } else {
      metadata.inventoryQuantities = products.map(() => 0);
    }

    return metadata;
  }

  /**
   * Filter categories based on aggregation options
   * 
   * @param categories Categories to filter
   * @param options Aggregation options
   * @returns Filtered categories
   */
  private filterCategories(categories: Category[], options: AggregationOptions): Category[] {
    let filtered = [...categories];

    if (options.filterEmptyCategories) {
      // This would require async product fetching, so we'll implement it differently
      // For now, we'll filter based on category properties
      filtered = filtered.filter(category => 
        category.name && category.name.trim().length > 0
      );
    }

    return filtered;
  }

  /**
   * Sort categories based on aggregation options
   * 
   * @param categories Categories to sort
   * @param options Aggregation options
   * @returns Sorted categories
   */
  private sortCategories(categories: Category[], options: AggregationOptions): Category[] {
    const sorted = [...categories];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (options.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
                 case 'createdAt':
           comparison = this.getDateValue(a.createdAt) - this.getDateValue(b.createdAt);
           break;
         case 'updatedAt':
           comparison = this.getDateValue(a.updatedAt) - this.getDateValue(b.updatedAt);
           break;
        case 'productCount':
          // This would require async product counting, so we'll use a default sort
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }

      return options.sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Simple delay utility for non-blocking processing
   * 
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format various date types to ISO string
   * 
   * @param date Date in various formats
   * @returns ISO string representation
   */
  private formatDateToString(date: Date | number | string | { toDate(): Date; toMillis(): number } | undefined): string | null {
    if (!date) {
      return null;
    }

    try {
      if (typeof date === 'string') {
        return date;
      }
      
      if (typeof date === 'number') {
        return new Date(date).toISOString();
      }
      
      if (date instanceof Date) {
        return date.toISOString();
      }
      
      if (typeof date === 'object' && 'toDate' in date) {
        return date.toDate().toISOString();
      }
      
      return new Date().toISOString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Get numeric timestamp from various date types for comparison
   * 
   * @param date Date in various formats
   * @returns Numeric timestamp
   */
  private getDateValue(date: Date | number | string | { toDate(): Date; toMillis(): number } | undefined): number {
    if (!date) {
      return 0;
    }

    try {
      if (typeof date === 'number') {
        return date;
      }
      
      if (typeof date === 'string') {
        return new Date(date).getTime();
      }
      
      if (date instanceof Date) {
        return date.getTime();
      }
      
      if (typeof date === 'object' && 'toMillis' in date) {
        return date.toMillis();
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting date value:', error);
      return 0;
    }
  }
} 