import { 
  sortProductsByCategory, 
  generateCategoryStats, 
  getUniqueCategories,
  validateSortConfig,
  createSortPreview,
  defaultSortConfig,
  CategorySortConfig 
} from '../pdfSorting';
import { Product } from '../../types/product';
import { Category } from '../../services/category.service';
import { Timestamp } from 'firebase/firestore';

// Mock Timestamp for testing
const mockTimestamp = { seconds: 1640995200, nanoseconds: 0 } as Timestamp;

// Mock data for testing
const mockCategories: Category[] = [
  {
    id: 'cat1',
    name: 'Electronics',
    description: 'Electronic items',
    tag: 'electronics',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'cat2',
    name: 'Books',
    description: 'Books and literature',
    tag: 'books',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'cat3',
    name: 'Clothing',
    description: 'Apparel and clothing',
    tag: 'clothing',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
];

const mockProducts: Product[] = [
  {
    sku: 'ELE001',
    name: 'Smartphone',
    description: 'High-end smartphone',
    categoryId: 'cat1',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 15000,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    sku: 'BOO001',
    name: 'Programming Book',
    description: 'Learn programming',
    categoryId: 'cat2',
    platform: 'flipkart',
    visibility: 'visible',
    sellingPrice: 800,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    sku: 'ELE002',
    name: 'Laptop',
    description: 'Gaming laptop',
    categoryId: 'cat1',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 50000,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    sku: 'CLO001',
    name: 'T-Shirt',
    description: 'Cotton t-shirt',
    categoryId: 'cat3',
    platform: 'flipkart',
    visibility: 'visible',
    sellingPrice: 500,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    sku: 'UNC001',
    name: 'Uncategorized Item',
    description: 'Item without category',
    categoryId: 'nonexistent',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 1000,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

describe('pdfSorting', () => {
  describe('sortProductsByCategory', () => {
    it('should sort products by category in ascending order', () => {
      const config: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: true,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };

      const result = sortProductsByCategory(mockProducts, mockCategories, config);
      
      expect(result).toHaveLength(5);
      
      // Should be grouped by category: Books, Clothing, Electronics, Uncategorized
      expect(result[0].categoryName).toBe('Books');
      expect(result[1].categoryName).toBe('Clothing');
      expect(result[2].categoryName).toBe('Electronics');
      expect(result[3].categoryName).toBe('Electronics');
      expect(result[4].categoryName).toBe('Uncategorized');
      
      // Within Electronics category, should be sorted by name (Laptop, Smartphone)
      expect(result[2].name).toBe('Laptop');
      expect(result[3].name).toBe('Smartphone');
    });

    it('should sort products by category in descending order', () => {
      const config: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'desc',
        groupByCategory: true,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };

      const result = sortProductsByCategory(mockProducts, mockCategories, config);
      
      // Should be grouped by category in reverse order
      expect(result[0].categoryName).toBe('Electronics');
      expect(result[1].categoryName).toBe('Electronics');
      expect(result[2].categoryName).toBe('Clothing');
      expect(result[3].categoryName).toBe('Books');
      expect(result[4].categoryName).toBe('Uncategorized');
    });

    it('should sort products by price when groupByCategory is false', () => {
      const config: CategorySortConfig = {
        primarySort: 'price',
        sortOrder: 'asc',
        groupByCategory: false,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };

      const result = sortProductsByCategory(mockProducts, mockCategories, config);
      
      // Should be sorted by price: T-Shirt (500), Book (800), Uncategorized (1000), Smartphone (15000), Laptop (50000)
      expect(result[0].sellingPrice).toBe(500);
      expect(result[1].sellingPrice).toBe(800);
      expect(result[2].sellingPrice).toBe(1000);
      expect(result[3].sellingPrice).toBe(15000);
      expect(result[4].sellingPrice).toBe(50000);
    });

    it('should sort products by name', () => {
      const config: CategorySortConfig = {
        primarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: false,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };

      const result = sortProductsByCategory(mockProducts, mockCategories, config);
      
      // Should be sorted alphabetically by name
      expect(result[0].name).toBe('Laptop');
      expect(result[1].name).toBe('Programming Book');
      expect(result[2].name).toBe('Smartphone');
      expect(result[3].name).toBe('T-Shirt');
      expect(result[4].name).toBe('Uncategorized Item');
    });

    it('should handle custom category order', () => {
      const config: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: true,
        categoryOrder: ['Electronics', 'Clothing', 'Books', 'Uncategorized'],
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };

      const result = sortProductsByCategory(mockProducts, mockCategories, config);
      
      // Should follow custom order: Electronics, Clothing, Books, Uncategorized
      expect(result[0].categoryName).toBe('Electronics');
      expect(result[1].categoryName).toBe('Electronics');
      expect(result[2].categoryName).toBe('Clothing');
      expect(result[3].categoryName).toBe('Books');
      expect(result[4].categoryName).toBe('Uncategorized');
    });

    it('should handle empty product array', () => {
      const result = sortProductsByCategory([], mockCategories, defaultSortConfig);
      expect(result).toEqual([]);
    });

    it('should handle products with missing category information', () => {
      const result = sortProductsByCategory(mockProducts, [], defaultSortConfig);
      
      // All products should be categorized as "Uncategorized"
      result.forEach(product => {
        expect(product.categoryName).toBe('Uncategorized');
      });
    });
  });

  describe('generateCategoryStats', () => {
    it('should generate correct statistics for each category', () => {
      const stats = generateCategoryStats(mockProducts, mockCategories);
      
      expect(stats).toHaveLength(4); // Books, Clothing, Electronics, Uncategorized
      
      // Find Electronics category stats
      const electronicsStats = stats.find(s => s.name === 'Electronics');
      expect(electronicsStats).toBeDefined();
      expect(electronicsStats!.count).toBe(2);
      expect(electronicsStats!.totalValue).toBe(65000); // 15000 + 50000
      expect(electronicsStats!.avgPrice).toBe(32500);
      
      // Find Books category stats
      const booksStats = stats.find(s => s.name === 'Books');
      expect(booksStats).toBeDefined();
      expect(booksStats!.count).toBe(1);
      expect(booksStats!.totalValue).toBe(800);
      expect(booksStats!.avgPrice).toBe(800);
      
      // Find Uncategorized stats
      const uncategorizedStats = stats.find(s => s.name === 'Uncategorized');
      expect(uncategorizedStats).toBeDefined();
      expect(uncategorizedStats!.count).toBe(1);
    });

    it('should handle empty arrays', () => {
      const stats = generateCategoryStats([], mockCategories);
      expect(stats).toEqual([]);
    });
  });

  describe('getUniqueCategories', () => {
    it('should return unique categories with product counts', () => {
      const result = getUniqueCategories(mockProducts, mockCategories);
      
      expect(result).toHaveLength(4);
      
      // Should include all categories that have products
      const categoryNames = result.map(c => c.name);
      expect(categoryNames).toContain('Electronics');
      expect(categoryNames).toContain('Books');
      expect(categoryNames).toContain('Clothing');
      expect(categoryNames).toContain('Uncategorized');
      
      // Check counts
      const electronicsCategory = result.find(c => c.name === 'Electronics');
      expect(electronicsCategory!.count).toBe(2);
      
      const booksCategory = result.find(c => c.name === 'Books');
      expect(booksCategory!.count).toBe(1);
    });

    it('should handle products without valid categories', () => {
      const productsWithInvalidCategories: Product[] = [
        {
          ...mockProducts[0],
          categoryId: 'invalid-id',
        },
      ];
      
      const result = getUniqueCategories(productsWithInvalidCategories, mockCategories);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Uncategorized');
      expect(result[0].count).toBe(1);
    });
  });

  describe('validateSortConfig', () => {
    it('should return no errors for valid configuration', () => {
      const validConfig: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: true,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };
      
      const errors = validateSortConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid primarySort', () => {
      const invalidConfig = {
        primarySort: 'invalid',
        sortOrder: 'asc',
        groupByCategory: true,
      } as unknown as CategorySortConfig;
      
      const errors = validateSortConfig(invalidConfig);
      expect(errors).toContain('Invalid primarySort: invalid');
    });

    it('should return errors for invalid secondarySort', () => {
      const invalidConfig = {
        primarySort: 'category',
        secondarySort: 'invalid',
        sortOrder: 'asc',
        groupByCategory: true,
      } as unknown as CategorySortConfig;
      
      const errors = validateSortConfig(invalidConfig);
      expect(errors).toContain('Invalid secondarySort: invalid');
    });

    it('should return errors for invalid sortOrder', () => {
      const invalidConfig = {
        primarySort: 'category',
        sortOrder: 'invalid',
        groupByCategory: true,
      } as unknown as CategorySortConfig;
      
      const errors = validateSortConfig(invalidConfig);
      expect(errors).toContain('Invalid sortOrder: invalid');
    });

    it('should return errors for invalid groupByCategory', () => {
      const invalidConfig = {
        primarySort: 'category',
        sortOrder: 'asc',
        groupByCategory: 'invalid',
      } as unknown as CategorySortConfig;
      
      const errors = validateSortConfig(invalidConfig);
      expect(errors).toContain('groupByCategory must be a boolean');
    });
  });

  describe('createSortPreview', () => {
    it('should create correct preview of sorted products', () => {
      const config: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: true,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };
      
      const preview = createSortPreview(mockProducts, mockCategories, config);
      
      expect(preview).toHaveLength(4); // Books, Clothing, Electronics, Uncategorized
      
      // Check Electronics category preview
      const electronicsPreview = preview.find(p => p.categoryName === 'Electronics');
      expect(electronicsPreview).toBeDefined();
      expect(electronicsPreview!.productCount).toBe(2);
      expect(electronicsPreview!.sampleProducts).toHaveLength(2);
      expect(electronicsPreview!.sampleProducts).toContain('Laptop');
      expect(electronicsPreview!.sampleProducts).toContain('Smartphone');
    });

    it('should limit sample products to 3 items', () => {
      // Create a category with more than 3 products
      const manyProducts: Product[] = [
        ...mockProducts,
        {
          sku: 'ELE003',
          name: 'Tablet',
          description: 'Android tablet',
          categoryId: 'cat1',
          platform: 'amazon',
          visibility: 'visible',
          sellingPrice: 20000,
          metadata: { createdAt: new Date(), updatedAt: new Date() },
        },
        {
          sku: 'ELE004',
          name: 'Smartwatch',
          description: 'Fitness smartwatch',
          categoryId: 'cat1',
          platform: 'flipkart',
          visibility: 'visible',
          sellingPrice: 8000,
          metadata: { createdAt: new Date(), updatedAt: new Date() },
        },
      ];
      
      const config: CategorySortConfig = {
        primarySort: 'category',
        secondarySort: 'name',
        sortOrder: 'asc',
        groupByCategory: true,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };
      
      const preview = createSortPreview(manyProducts, mockCategories, config);
      const electronicsPreview = preview.find(p => p.categoryName === 'Electronics');
      
      expect(electronicsPreview!.productCount).toBe(4);
      expect(electronicsPreview!.sampleProducts).toHaveLength(3); // Limited to 3
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create a large dataset
      const largeProductSet: Product[] = [];
      for (let i = 0; i < 1000; i++) {
        largeProductSet.push({
          sku: `PROD${i}`,
          name: `Product ${i}`,
          description: `Description ${i}`,
          categoryId: mockCategories[i % 3].id!,
          platform: i % 2 === 0 ? 'amazon' : 'flipkart',
          visibility: 'visible',
          sellingPrice: Math.floor(Math.random() * 10000),
          metadata: { createdAt: new Date(), updatedAt: new Date() },
        });
      }
      
      const startTime = performance.now();
      const result = sortProductsByCategory(largeProductSet, mockCategories, defaultSortConfig);
      const endTime = performance.now();
      
      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle null and undefined values gracefully', () => {
      const problematicProducts: Product[] = [
        {
          sku: '',
          name: '',
          description: '',
          categoryId: '',
          platform: 'amazon',
          visibility: 'visible',
          sellingPrice: 0,
          metadata: {},
        },
      ];
      
      const result = sortProductsByCategory(problematicProducts, mockCategories, defaultSortConfig);
      expect(result).toHaveLength(1);
      expect(result[0].categoryName).toBe('Uncategorized');
    });
  });
}); 