import { groupOrdersByCategory, calculateOrderRevenue, getCategoryStatistics, filterGroupsBySearch } from '../utils/groupingUtils';
import { ProductSummary } from '../../home/services/base.transformer';

// Mock Timestamp for tests
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  }
}));

// Mock data for testing
const mockOrders: ProductSummary[] = [
  {
    SKU: 'SKU001',
    name: 'Test Product 1',
    quantity: '2',
    category: 'Electronics',
    type: 'amazon',
    product: {
      sku: 'SKU001',
      name: 'Test Product 1',
      description: 'Test description 1',
      sellingPrice: 100,
      categoryId: 'cat1',
      platform: 'amazon',
      visibility: 'visible',
      metadata: { 
        amazonSerialNumber: 'AMZ001'
      }
    }
  },
  {
    SKU: 'SKU002',
    name: 'Test Product 2',
    quantity: '1',
    category: 'Electronics',
    type: 'flipkart',
    product: {
      sku: 'SKU002',
      name: 'Test Product 2',
      description: 'Test description 2',
      sellingPrice: 150,
      categoryId: 'cat1',
      platform: 'flipkart',
      visibility: 'visible',
      metadata: { 
        flipkartSerialNumber: 'FLK001'
      }
    }
  },
  {
    SKU: 'SKU003',
    name: 'Test Product 3',
    quantity: '3',
    category: 'Books',
    type: 'amazon',
    product: {
      sku: 'SKU003',
      name: 'Test Product 3',
      description: 'Test description 3',
      sellingPrice: 50,
      categoryId: 'cat2',
      platform: 'amazon',
      visibility: 'visible',
      metadata: { 
        amazonSerialNumber: 'AMZ002'
      }
    }
  },
  {
    SKU: 'SKU004',
    name: 'Test Product 4',
    quantity: '1',
    category: '',
    type: 'amazon',
    product: {
      sku: 'SKU004',
      name: 'Test Product 4',
      description: 'Test description 4',
      sellingPrice: 75,
      categoryId: '',
      platform: 'amazon',
      visibility: 'visible',
      metadata: { 
        amazonSerialNumber: 'AMZ003'
      }
    }
  }
];

describe('groupingUtils', () => {
  describe('calculateOrderRevenue', () => {
    it('should calculate revenue correctly', () => {
      const order = mockOrders[0];
      const revenue = calculateOrderRevenue(order);
      expect(revenue).toBe(200); // 100 * 2
    });

    it('should handle missing product data', () => {
      const order = { ...mockOrders[0], product: undefined };
      const revenue = calculateOrderRevenue(order);
      expect(revenue).toBe(0);
    });

    it('should handle invalid quantity', () => {
      const order = { ...mockOrders[0], quantity: 'invalid' };
      const revenue = calculateOrderRevenue(order);
      expect(revenue).toBe(0);
    });
  });

  describe('groupOrdersByCategory', () => {
    it('should group orders by category correctly', () => {
      const result = groupOrdersByCategory(mockOrders);
      
      expect(result.categorizedGroups).toHaveLength(2);
      expect(result.categorizedGroups[0].categoryName).toBe('Books');
      expect(result.categorizedGroups[1].categoryName).toBe('Electronics');
      
      expect(result.categorizedGroups[1].orders).toHaveLength(2);
      expect(result.uncategorizedGroup.orders).toHaveLength(1);
    });

    it('should calculate category totals correctly', () => {
      const result = groupOrdersByCategory(mockOrders);
      const electronicsGroup = result.categorizedGroups.find(g => g.categoryName === 'Electronics');
      
      expect(electronicsGroup).toBeDefined();
      expect(electronicsGroup!.totalQuantity).toBe(3); // 2 + 1
      expect(electronicsGroup!.totalRevenue).toBe(350); // 200 + 150
      expect(electronicsGroup!.totalItems).toBe(2);
      expect(electronicsGroup!.platforms).toContain('amazon');
      expect(electronicsGroup!.platforms).toContain('flipkart');
    });

    it('should handle uncategorized items', () => {
      const result = groupOrdersByCategory(mockOrders);
      
      expect(result.uncategorizedGroup.categoryName).toBe('Uncategorized');
      expect(result.uncategorizedGroup.totalItems).toBe(1);
      expect(result.uncategorizedGroup.totalRevenue).toBe(75);
    });

    it('should calculate summary correctly', () => {
      const result = groupOrdersByCategory(mockOrders);
      
      expect(result.summary.totalCategories).toBe(3); // 2 categorized + 1 uncategorized
      expect(result.summary.totalOrders).toBe(4);
      expect(result.summary.totalRevenue).toBe(575); // 200 + 150 + 150 + 75
    });

    it('should handle empty orders array', () => {
      const result = groupOrdersByCategory([]);
      
      expect(result.categorizedGroups).toHaveLength(0);
      expect(result.uncategorizedGroup.orders).toHaveLength(0);
      expect(result.summary.totalCategories).toBe(0);
      expect(result.summary.totalOrders).toBe(0);
      expect(result.summary.totalRevenue).toBe(0);
    });
  });

  describe('getCategoryStatistics', () => {
    it('should calculate statistics correctly', () => {
      const result = groupOrdersByCategory(mockOrders);
      const electronicsGroup = result.categorizedGroups.find(g => g.categoryName === 'Electronics');
      const stats = getCategoryStatistics(electronicsGroup!);
      
      expect(stats.itemCount).toBe(2);
      expect(stats.totalQuantity).toBe(3);
      expect(stats.totalRevenue).toBe(350);
      expect(stats.averageQuantity).toBe(1.5);
      expect(stats.averageRevenue).toBe(175);
      expect(stats.platforms).toBe('amazon, flipkart');
    });

    it('should handle empty group', () => {
      const emptyGroup = {
        categoryName: 'Empty',
        orders: [],
        totalQuantity: 0,
        totalRevenue: 0,
        totalItems: 0,
        platforms: []
      };
      
      const stats = getCategoryStatistics(emptyGroup);
      expect(stats.averageQuantity).toBe(0);
      expect(stats.averageRevenue).toBe(0);
    });
  });

  describe('filterGroupsBySearch', () => {
    it('should filter by product name', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, 'Test Product 1');
      
      expect(result.summary.totalOrders).toBe(1);
      expect(result.categorizedGroups[0].orders[0].name).toBe('Test Product 1');
    });

    it('should filter by SKU', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, 'SKU003');
      
      expect(result.summary.totalOrders).toBe(1);
      expect(result.categorizedGroups[0].orders[0].SKU).toBe('SKU003');
    });

    it('should filter by category name', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, 'Electronics');
      
      expect(result.categorizedGroups).toHaveLength(1);
      expect(result.categorizedGroups[0].categoryName).toBe('Electronics');
      expect(result.summary.totalOrders).toBe(2);
    });

    it('should return all data for empty search term', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, '');
      
      expect(result).toEqual(groupedData);
    });

    it('should return empty results for non-matching search', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, 'NonExistent');
      
      expect(result.categorizedGroups).toHaveLength(0);
      expect(result.uncategorizedGroup.orders).toHaveLength(0);
      expect(result.summary.totalOrders).toBe(0);
    });

    it('should be case insensitive', () => {
      const groupedData = groupOrdersByCategory(mockOrders);
      const result = filterGroupsBySearch(groupedData, 'electronics');
      
      expect(result.categorizedGroups).toHaveLength(1);
      expect(result.categorizedGroups[0].categoryName).toBe('Electronics');
    });
  });
}); 