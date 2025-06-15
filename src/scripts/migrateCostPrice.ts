import { where } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';
import { Category } from '../services/category.service';
import { Product } from '../services/product.service';

class CostPriceMigrationService extends FirebaseService {
  private readonly CATEGORIES_COLLECTION = 'categories';
  private readonly PRODUCTS_COLLECTION = 'products';

  /**
   * Migrate cost price data from products to categories
   */
  async migrateCostPriceData(): Promise<void> {
    try {
      console.log('Starting cost price migration...');

      // Get all categories
      const categories = await this.getDocuments<Category>(this.CATEGORIES_COLLECTION);
      console.log(`Found ${categories.length} categories to process`);

      // Get all products
      const products = await this.getDocuments<Product>(this.PRODUCTS_COLLECTION);
      console.log(`Found ${products.length} products to process`);

      // Group products by category
      const productsByCategory = products.reduce((acc, product) => {
        if (product.categoryId) {
          if (!acc[product.categoryId]) {
            acc[product.categoryId] = [];
          }
          acc[product.categoryId].push(product);
        }
        return acc;
      }, {} as Record<string, Product[]>);

      // Process each category
      let processed = 0;
      for (const category of categories) {
        if (!category.id) continue;

        const categoryProducts = productsByCategory[category.id] || [];
        if (categoryProducts.length === 0) {
          console.log(`Category ${category.id} has no products, skipping...`);
          continue;
        }

        // Calculate average cost price from products
        const validCostPrices = categoryProducts
          .map(p => p.customCostPrice)
          .filter((price): price is number => 
            price !== null && 
            price !== undefined && 
            !isNaN(price) &&
            typeof price === 'number'
          );

        if (validCostPrices.length > 0) {
          const avgCostPrice = validCostPrices.reduce((a, b) => a + b) / validCostPrices.length;
          
          // Update category with average cost price
          await this.updateDocument(
            this.CATEGORIES_COLLECTION,
            category.id,
            { costPrice: avgCostPrice }
          );

          // Update products to use null cost price (inherit from category)
          await Promise.all(
            categoryProducts.map(product =>
              this.updateDocument(
                this.PRODUCTS_COLLECTION,
                product.sku,
                { customCostPrice: null }
              )
            )
          );

          console.log(`Migrated category ${category.id} with ${categoryProducts.length} products`);
          processed++;
        }
      }

      console.log(`Migration complete! Processed ${processed} categories`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback migration if needed
   */
  async rollbackMigration(): Promise<void> {
    try {
      console.log('Starting migration rollback...');

      // Get all categories with cost price
      const categories = await this.getDocuments<Category>(
        this.CATEGORIES_COLLECTION,
        [where('costPrice', '!=', null)]
      );

      console.log(`Found ${categories.length} categories to rollback`);

      // Process each category
      for (const category of categories) {
        if (!category.id) continue;

        // Remove cost price from category
        await this.updateDocument(
          this.CATEGORIES_COLLECTION,
          category.id,
          { costPrice: null }
        );

        // Get all products in this category
        const products = await this.getDocuments<Product>(
          this.PRODUCTS_COLLECTION,
          [where('categoryId', '==', category.id)]
        );

        // Restore original cost prices to products
        await Promise.all(
          products.map(product =>
            this.updateDocument(
              this.PRODUCTS_COLLECTION,
              product.sku,
              { customCostPrice: product.customCostPrice || 0 }
            )
          )
        );

        console.log(`Rolled back category ${category.id} with ${products.length} products`);
      }

      console.log('Rollback complete!');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
}

// Create an instance
const migrationService = new CostPriceMigrationService();

// Main function to run the migration
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'rollback') {
      await migrationService.rollbackMigration();
    } else {
      await migrationService.migrateCostPriceData();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 