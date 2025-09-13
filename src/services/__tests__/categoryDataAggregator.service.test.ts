import { CategoryDataAggregatorService } from '../categoryDataAggregator.service';
import { CategoryService } from '../category.service';

// Mock the CategoryService
jest.mock('../category.service');

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;

describe('CategoryDataAggregatorService', () => {
  let aggregatorService: CategoryDataAggregatorService;
  let mockGetCategories: jest.SpyInstance;

  const mockCategories = [
    {
      id: '1',
      name: 'Electronics',
      description: 'Electronic products',
      tag: 'tech',
      costPrice: 100
    },
    {
      id: '2',
      name: 'Books',
      description: 'Educational books',
      tag: 'education',
      costPrice: 25
    },
    {
      id: '3',
      name: 'Clothing',
      description: 'Fashion items',
      tag: 'fashion',
      costPrice: null
    }
  ];

  beforeEach(() => {
    mockGetCategories = jest.fn().mockResolvedValue(mockCategories);

    mockCategoryService.mockImplementation(() => ({
      getCategories: mockGetCategories,
    }) as jest.Mocked<CategoryService>);

    aggregatorService = new CategoryDataAggregatorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('creates instance with CategoryService dependency', () => {
      expect(aggregatorService).toBeInstanceOf(CategoryDataAggregatorService);
      expect(mockCategoryService).toHaveBeenCalled();
    });
  });

  describe('aggregateCategories', () => {
    it('successfully aggregates categories', async () => {
      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully aggregated 3 categories');
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual(mockCategories);
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
    });

    it('handles empty categories list', async () => {
      mockGetCategories.mockResolvedValue([]);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully aggregated 0 categories');
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual([]);
    });

    it('handles service errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockGetCategories.mockRejectedValue(new Error(errorMessage));

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to aggregate categories');
      expect(result.errors).toEqual([errorMessage]);
      expect(result.data).toEqual([]);
    });

    it('handles non-Error exceptions', async () => {
      mockGetCategories.mockRejectedValue('String error');

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to aggregate categories');
      expect(result.errors).toEqual(['Unknown error']);
      expect(result.data).toEqual([]);
    });

    it('handles null/undefined error', async () => {
      mockGetCategories.mockRejectedValue(null);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to aggregate categories');
      expect(result.errors).toEqual(['Unknown error']);
    });
  });

  describe('getCategoriesForExport', () => {
    it('returns categories from CategoryService', async () => {
      const result = await aggregatorService.getCategoriesForExport();

      expect(result).toEqual(mockCategories);
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
    });

    it('handles empty categories list', async () => {
      mockGetCategories.mockResolvedValue([]);

      const result = await aggregatorService.getCategoriesForExport();

      expect(result).toEqual([]);
    });

    it('propagates errors from CategoryService', async () => {
      const errorMessage = 'Service error';
      mockGetCategories.mockRejectedValue(new Error(errorMessage));

      await expect(aggregatorService.getCategoriesForExport()).rejects.toThrow(errorMessage);
    });

    it('calls CategoryService exactly once', async () => {
      await aggregatorService.getCategoriesForExport();
      
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
      expect(mockGetCategories).toHaveBeenCalledWith();
    });
  });

  describe('Integration with CategoryService', () => {
    it('uses the same CategoryService instance for both methods', async () => {
      // Call both methods
      await aggregatorService.aggregateCategories();
      await aggregatorService.getCategoriesForExport();

      // Should use the same service instance (called constructor once)
      expect(mockCategoryService).toHaveBeenCalledTimes(1);
      expect(mockGetCategories).toHaveBeenCalledTimes(2);
    });

    it('handles different category data structures', async () => {
      const complexCategories = [
        {
          id: '1',
          name: 'Complex Category',
          description: 'A category with all fields',
          tag: 'complex',
          costPrice: 99.99,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Minimal Category',
          // Only required fields
        }
      ];

      mockGetCategories.mockResolvedValue(complexCategories);

      const aggregateResult = await aggregatorService.aggregateCategories();
      const exportResult = await aggregatorService.getCategoriesForExport();

      expect(aggregateResult.data).toEqual(complexCategories);
      expect(exportResult).toEqual(complexCategories);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('handles CategoryService returning null', async () => {
      mockGetCategories.mockResolvedValue(null);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false); // Will fail due to null.length
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles CategoryService returning undefined', async () => {
      mockGetCategories.mockResolvedValue(undefined);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false); // Will fail due to undefined.length
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles CategoryService timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockGetCategories.mockRejectedValue(timeoutError);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Request timeout');
    });
  });

  describe('Performance and Efficiency', () => {
    it('does not modify original data', async () => {
      const originalCategories = [...mockCategories];
      
      const result = await aggregatorService.aggregateCategories();

      // Original data should be unchanged
      expect(mockCategories).toEqual(originalCategories);
      
      // Result data should be the same reference (no unnecessary copying)
      expect(result.data).toBe(mockCategories);
    });

    it('handles large category lists efficiently', async () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Category ${i}`,
        description: `Description ${i}`,
        tag: `tag${i}`,
        costPrice: i * 10
      }));

      mockGetCategories.mockResolvedValue(largeList);

      const start = Date.now();
      const result = await aggregatorService.aggregateCategories();
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      expect(result.message).toBe('Successfully aggregated 1000 categories');
      
      // Should complete reasonably quickly (less than 100ms for this simple operation)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Data Validation', () => {
    it('passes through all category properties correctly', async () => {
      const categoryWithAllProps = {
        id: 'test-id',
        name: 'Test Category',
        description: 'Test Description',
        tag: 'test-tag',
        costPrice: 42.50,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      mockGetCategories.mockResolvedValue([categoryWithAllProps]);

      const result = await aggregatorService.aggregateCategories();

      expect(result.data).toEqual([categoryWithAllProps]);
      expect(result.data).toBeTruthy();
      expect(result.data![0]).toHaveProperty('id', 'test-id');
      expect(result.data![0]).toHaveProperty('name', 'Test Category');
      expect(result.data![0]).toHaveProperty('description', 'Test Description');
      expect(result.data![0]).toHaveProperty('tag', 'test-tag');
      expect(result.data![0]).toHaveProperty('costPrice', 42.50);
      expect(result.data![0]).toHaveProperty('createdAt');
      expect(result.data![0]).toHaveProperty('updatedAt');
    });

    it('handles categories with special characters', async () => {
      const specialCategories = [
        {
          id: '1',
          name: 'Category with "quotes" & symbols!',
          description: 'Description with émojis 🎉 and unicode',
          tag: 'tag-with-dashes_and_underscores',
          costPrice: 123.45
        }
      ];

      mockGetCategories.mockResolvedValue(specialCategories);

      const result = await aggregatorService.aggregateCategories();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(specialCategories);
    });
  });
});