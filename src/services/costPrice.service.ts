import { FirebaseService } from './firebase.service';
import { Category } from './category.service';
import { where } from 'firebase/firestore';

export interface Product {
  sku: string;
  categoryId?: string;
  customCostPrice: number | null;
  // ... other product fields will be added when updating product interface
}

export interface CostPriceResolution {
  value: number;
  source: 'category' | 'product' | 'default';
  categoryId: string | null;
  sku: string;
}

export class CostPriceResolutionService extends FirebaseService {
  private readonly PRODUCTS_COLLECTION = 'products';
  private readonly CATEGORIES_COLLECTION = 'categories';
  private readonly DEFAULT_COST_PRICE = 0;
  private categoryCostPrices: Map<string, number> = new Map();

  private createDefaultResolution(sku: string, categoryId: string | null = null): CostPriceResolution {
    return {
      value: this.DEFAULT_COST_PRICE,
      source: 'default',
      categoryId,
      sku
    };
  }

  /**
   * Initialize cost prices for a set of products
   */
  async initializeCostPrices(products: Product[]): Promise<Map<string, CostPriceResolution>> {
    // Get unique category IDs and ensure they are strings
    const categoryIds = [...new Set(products.map(p => p.categoryId).filter((id): id is string => id !== undefined))];
    
    // Fetch all categories in one go
    const categoriesPromises = categoryIds.map(async (id) => {
      try {
        return await this.getDocument<Category>(this.CATEGORIES_COLMLECTION, id);
      } catch (error) {
        console.error(`Error fetching category ${id}:`, error);
        return null;
      }
    });
    
    const categories = await Promise.all(categoriesPromises);

    // Create a map of category cost prices
    this.categoryCostPrices.clear();
    categories.forEach((category, index) => {
      if (category && category.costPrice !== null && category.costPrice !== undefined) {
        this.categoryCostPrices.set(categoryIds[index], category.costPrice);
      }
    });

    // Resolve cost prices for all products
    const resolutions = new Map<string, CostPriceResolution>();
    products.forEach(product => {
      resolutions.set(product.sku, this.resolveCostPriceFromMemory(product));
    });

    return resolutions;
  }

  /**
   * Resolve cost price from in-memory data
   */
  private resolveCostPriceFromMemory(product: Product): CostPriceResolution {
    // If product has a custom cost price, use it
    if (product.customCostPrice !== null && product.customCostPrice !== undefined) {
      return {
        value: product.customCostPrice,
        source: 'product',
        categoryId: product.categoryId || null,
        sku: product.sku
      };
    }

    // If category has a cost price, use it
    if (product.categoryId && this.categoryCostPrices.has(product.categoryId)) {
      const categoryPrice = this.categoryCostPrices.get(product.categoryId)!;
      return {
        value: categoryPrice,
        source: 'category',
        categoryId: product.categoryId,
        sku: product.sku
      };
    }

    // If no valid cost price is found, use default
    return this.createDefaultResolution(product.sku, product.categoryId || null);
  }

  /**
   * Get the resolved cost price for a product
   */
  async getProductCostPrice(sku: string): Promise<CostPriceResolution> {
    try {
      const products = await this.getDocuments<Product>(
        this.PRODUCTS_COLLECTION,
        [where('sku', '==', sku)]
      );
      
      if (!products || products.length === 0) {
        return this.createDefaultResolution(sku);
      }

      const product = products[0];
      if (!product.categoryId) {
        return this.createDefaultResolution(sku);
      }

      try {
        const category = await this.getDocument<Category>(this.CATEGORIES_COLLECTION, product.categoryId);
        if (!category) {
          return this.createDefaultResolution(sku);
        }

        // If product has a custom cost price, use it
        if (product.customCostPrice !== null && product.customCostPrice !== undefined) {
          return {
            value: product.customCostPrice,
            source: 'product',
            categoryId: product.categoryId,
            sku: product.sku
          };
        }

        // If category has a cost price, use it
        if (category.costPrice !== null && category.costPrice !== undefined) {
          return {
            value: category.costPrice,
            source: 'category',
            categoryId: product.categoryId,
            sku: product.sku
          };
        }

        // If no valid cost price is found, use default
        return this.createDefaultResolution(sku, product.categoryId);
      } catch (error) {
        console.error(`Error fetching category for product ${sku}:`, error);
        return this.createDefaultResolution(sku);
      }
    } catch (error) {
      console.error(`Error fetching product ${sku}:`, error);
      return this.createDefaultResolution(sku);
    }
  }

  /**
   * Get the cost price for a category
   */
  async getCategoryCostPrice(categoryId: string): Promise<CostPriceResolution> {
    const category = await this.getDocument<Category>(this.CATEGORIES_COLLECTION, categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    return {
      value: category.costPrice ?? this.DEFAULT_COST_PRICE,
      source: category.costPrice !== null && category.costPrice !== undefined ? 'category' : 'default',
      categoryId,
      sku: ''
    };
  }

  /**
   * Update a category's cost price and handle inheritance
   */
  async updateCategoryCostPrice(categoryId: string, price: number | null): Promise<void> {
    // Update category cost price
    await this.updateDocument(this.CATEGORIES_COLLECTION, categoryId, {
      costPrice: price
    });

    // No need to update products as they dynamically inherit from category
    // This is just for logging/tracking purposes
  }

  /**
   * Migrate product cost prices to category
   */
  async migrateProductCostPrices(categoryId: string): Promise<void> {
    const products = await this.getDocuments<Product>(
      this.PRODUCTS_COLLECTION,
      [where('categoryId', '==', categoryId)]
    );

    if (products.length === 0) {
      return;
    }

    // Calculate average cost price from products
    const validPrices = products
      .map(p => p.customCostPrice)
      .filter((price): price is number => price !== null);

    if (validPrices.length === 0) {
      return;
    }

    const averagePrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

    // Update category with average price
    await this.updateDocument(this.CATEGORIES_COLLECTION, categoryId, {
      costPrice: averagePrice
    });

    // Clear custom cost prices from products using batch operation
    const productsToUpdate = products.map(product => ({
      ...product,
      customCostPrice: null
    }));

    await this.batchOperation(
      productsToUpdate,
      this.PRODUCTS_COLLECTION,
      'update',
      (product) => product.sku
    );
  }

  /**
   * Get products inheriting cost price from category
   */
  async getProductsInheritingCost(categoryId: string): Promise<Product[]> {
    return this.getDocuments<Product>(
      this.PRODUCTS_COLLECTION,
      [
        where('categoryId', '==', categoryId),
        where('customCostPrice', '==', null)
      ]
    );
  }
}