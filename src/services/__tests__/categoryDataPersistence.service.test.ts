import { CategoryDataPersistenceService } from '../categoryDataPersistence.service';
import { CategoryService, Category } from '../category.service';

// Mock the CategoryService
jest.mock('../category.service');

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;

describe('CategoryDataPersistenceService', () => {
  let persistenceService: CategoryDataPersistenceService;
  let mockGetCategories: jest.SpyInstance;
  let mockCreateCategory: jest.SpyInstance;
  let mockUpdateCategory: jest.SpyInstance;

  const mockCategories = [
    {
      id: '1',
      name: 'Electronics',
      description: 'Electronic products',
      tag: 'tech',
    },
    {
      id: '2',
      name: 'Books',
      description: 'Educational books',
      tag: 'education',
    }
  ];

  beforeEach(() => {
    mockGetCategories = jest.fn().mockResolvedValue(mockCategories);
    mockCreateCategory = jest.fn().mockResolvedValue('new-id');
    mockUpdateCategory = jest.fn().mockResolvedValue(undefined);

    mockCategoryService.mockImplementation(() => ({
      getCategories: mockGetCategories,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      addCategory: mockCreateCategory, // Alias for addCategory if used
    }) as unknown as jest.Mocked<CategoryService>);

    persistenceService = new CategoryDataPersistenceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('creates instance with CategoryService dependency', () => {
      expect(persistenceService).toBeInstanceOf(CategoryDataPersistenceService);
      expect(mockCategoryService).toHaveBeenCalled();
    });
  });

  describe('importCategories', () => {
    describe('Successful Imports', () => {
      it('imports new categories successfully', async () => {
        const categoriesToImport = [
          {
            name: 'New Category 1',
            description: 'Description 1',
            tag: 'tag1',
          },
          {
            name: 'New Category 2',
            description: 'Description 2',
            tag: 'tag2',
          }
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Successfully imported 2 categories');
        expect(result.errors).toEqual([]);
        expect(result.importedCount).toBe(2);

        expect(mockCreateCategory).toHaveBeenCalledTimes(2);
        expect(mockCreateCategory).toHaveBeenNthCalledWith(1, {
          name: 'New Category 1',
          description: 'Description 1',
          tag: 'tag1',
        });
        expect(mockCreateCategory).toHaveBeenNthCalledWith(2, {
          name: 'New Category 2',
          description: 'Description 2',
          tag: 'tag2',
        });
      });

      it('updates existing categories when they have IDs', async () => {
        const categoriesToImport = [
          {
            id: '1',
            name: 'Updated Electronics',
            description: 'Updated description',
            tag: 'tech-updated',
          }
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Successfully imported 1 categories');
        expect(result.importedCount).toBe(1);

        expect(mockUpdateCategory).toHaveBeenCalledTimes(1);
        expect(mockUpdateCategory).toHaveBeenCalledWith('1', {
          name: 'Updated Electronics',
          description: 'Updated description',
          tag: 'tech-updated',
        });
        expect(mockCreateCategory).not.toHaveBeenCalled();
      });

      it('handles mixed create and update operations', async () => {
        const categoriesToImport = [
          {
            id: '1',
            name: 'Updated Electronics',
            description: 'Updated description',
            tag: 'tech',
          },
          {
            name: 'New Category',
            description: 'New description',
            tag: 'new',
          }
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Successfully imported 2 categories');
        expect(result.importedCount).toBe(2);

        expect(mockUpdateCategory).toHaveBeenCalledTimes(1);
        expect(mockCreateCategory).toHaveBeenCalledTimes(1);
      });

      it('handles empty categories array', async () => {
        const result = await persistenceService.importCategories([]);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Successfully imported 0 categories');
        expect(result.importedCount).toBe(0);
        expect(result.errors).toEqual([]);

        expect(mockCreateCategory).not.toHaveBeenCalled();
        expect(mockUpdateCategory).not.toHaveBeenCalled();
      });
    });

    describe('Partial Failures', () => {
      it('handles individual category import failures', async () => {
        mockCreateCategory
          .mockResolvedValueOnce('success-id')
          .mockRejectedValueOnce(new Error('Create failed'));

        const categoriesToImport = [
          { name: 'Success Category'},
          { name: 'Failed Category'}
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Successfully imported 1 categories with 1 errors');
        expect(result.importedCount).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('Failed to import category Failed Category: Create failed');
      });

      it('handles update failures', async () => {
        mockUpdateCategory.mockRejectedValue(new Error('Update failed'));

        const categoriesToImport = [
          {
            id: '1',
            name: 'Updated Electronics',
          }
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Successfully imported 0 categories with 1 errors');
        expect(result.importedCount).toBe(0);
        expect(result.errors).toContain('Failed to import category Updated Electronics: Update failed');
      });

      it('handles mixed success and failure scenarios', async () => {
        mockCreateCategory
          .mockResolvedValueOnce('success-1')
          .mockRejectedValueOnce(new Error('Create failed'))
          .mockResolvedValueOnce('success-2');
        
        mockUpdateCategory
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Update failed'));

        const categoriesToImport = [
          { name: 'Success Create 1'},
          { name: 'Failed Create'},
          { name: 'Success Create 2'},
          { id: '1', name: 'Success Update'},
          { id: '2', name: 'Failed Update'}
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(false);
        expect(result.importedCount).toBe(3);
        expect(result.errors).toHaveLength(2);
        expect(result.message).toBe('Successfully imported 3 categories with 2 errors');
      });

      it('handles non-Error exceptions', async () => {
        mockCreateCategory.mockRejectedValue('String error');

        const categoriesToImport = [
          { name: 'Test Category'}
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toBe('Failed to import category Test Category: Unknown error');
      });
    });

    describe('Complete Failures', () => {
      it('handles service-level failures', async () => {
        // Mock categoryService to throw an error
        mockCreateCategory.mockRejectedValue(new Error('Service unavailable'));

        const categoriesToImport = [
          { name: 'Test Category'}
        ];

        const result = await persistenceService.importCategories(categoriesToImport);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Successfully imported 0 categories with 1 errors');
        expect(result.errors).toContain('Failed to import category Test Category: Service unavailable');
        expect(result.importedCount).toBe(0);
      });

      // Test the actual error handling path in the try-catch
      it('handles unexpected errors during import process', async () => {
        // Mock categoryService.createCategory to throw an error
        mockCreateCategory.mockImplementation(async (category) => {
          if (category.name === 'Test') {
            throw new Error('Unexpected error');
          }
          return 'test-id';
        });

        const categoriesToImport = [{ name: 'Test'}];

        const result = await persistenceService.importCategories(categoriesToImport);
        
        expect(result.success).toBe(false);
        expect(result.message).toBe('Successfully imported 0 categories with 1 errors');
        expect(result.errors).toContain('Failed to import category Test: Unexpected error');
      });
    });
  });

  describe('backupCategories', () => {
    it('returns all categories from CategoryService', async () => {
      const result = await persistenceService.backupCategories();

      expect(result).toEqual(mockCategories);
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
    });

    it('handles empty categories list', async () => {
      mockGetCategories.mockResolvedValue([]);

      const result = await persistenceService.backupCategories();

      expect(result).toEqual([]);
    });

    it('propagates errors from CategoryService', async () => {
      const errorMessage = 'Database error';
      mockGetCategories.mockRejectedValue(new Error(errorMessage));

      await expect(persistenceService.backupCategories()).rejects.toThrow(errorMessage);
    });
  });

  describe('validateCategoryData', () => {
    describe('Valid Data', () => {
      it('validates correct category data', async () => {
        const validCategories = [
          { name: 'Electronics', description: 'Tech products'},
          { name: 'Books', description: 'Educational'},
          { name: 'Free Items'}
        ];

        const errors = await persistenceService.validateCategoryData(validCategories);

        expect(errors).toEqual([]);
      });

      it('validates minimal required data', async () => {
        const minimalCategories = [
          { name: 'Test Category' }
        ];

        const errors = await persistenceService.validateCategoryData(minimalCategories);

        expect(errors).toEqual([]);
      });

    });

    describe('Invalid Data', () => {
      it('reports errors for missing names', async () => {
        const invalidCategories = [
          { name: '', description: 'Empty name' },
          { description: 'Missing name' } as Partial<Category>,
          { name: '   ', description: 'Whitespace name' }
        ];

        const errors = await persistenceService.validateCategoryData(invalidCategories as Category[]);

        expect(errors).toHaveLength(3);
        expect(errors[0]).toBe('Category at index 0 is missing a name');
        expect(errors[1]).toBe('Category at index 1 is missing a name');
        expect(errors[2]).toBe('Category at index 2 is missing a name');
      });



    });

    describe('Empty and Edge Cases', () => {
      it('handles empty array', async () => {
        const errors = await persistenceService.validateCategoryData([]);

        expect(errors).toEqual([]);
      });

      it('handles null input', async () => {
        // The current validation logic will throw when trying to forEach on null
        await expect(persistenceService.validateCategoryData(null as unknown as Category[])).rejects.toThrow();
      });

      it('handles undefined input', async () => {
        // The current validation logic will throw when trying to forEach on undefined
        await expect(persistenceService.validateCategoryData(undefined as unknown as Category[])).rejects.toThrow();
      });
    });
  });

  describe('Integration Tests', () => {
    it('imports categories after validation', async () => {
      const validCategories = [
        { name: 'Valid Category'}
      ];

      // First validate
      const errors = await persistenceService.validateCategoryData(validCategories);
      expect(errors).toEqual([]);

      // Then import
      const result = await persistenceService.importCategories(validCategories);
      expect(result.success).toBe(true);
    });

    it('can backup and then restore categories', async () => {
      // Backup current categories
      const backup = await persistenceService.backupCategories();
      expect(backup).toEqual(mockCategories);

      // Import backup should work
      const result = await persistenceService.importCategories(backup);
      expect(result.success).toBe(true);
    });

    it('validates data before attempting import', async () => {
      const invalidCategories = [
        { name: ''} // Invalid
      ];

      // Validation should catch errors
      const errors = await persistenceService.validateCategoryData(invalidCategories);
      expect(errors.length).toBeGreaterThan(0);

      // Import would still attempt and may succeed (validation is separate from import)
      const result = await persistenceService.importCategories(invalidCategories);
      expect(result.success).toBe(true); // Import logic doesn't validate data
    });
  });

  describe('Performance Tests', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Category ${i}`,
        description: `Description ${i}`,
      }));

      mockCreateCategory.mockResolvedValue('id');

      const start = Date.now();
      const result = await persistenceService.importCategories(largeDataset);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1000);
      expect(mockCreateCategory).toHaveBeenCalledTimes(1000);

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('validates large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        name: `Valid Category ${i}`,
      }));

      const start = Date.now();
      const errors = await persistenceService.validateCategoryData(largeDataset);
      const duration = Date.now() - start;

      expect(errors).toEqual([]);
      expect(duration).toBeLessThan(100); // Should be very fast for validation
    });
  });

  describe('Data Integrity', () => {
    it('preserves all category properties during import', async () => {
      const categoryWithAllProps = {
        id: 'existing-id',
        name: 'Complete Category',
        description: 'Full description',
        tag: 'complete',
      };

      await persistenceService.importCategories([categoryWithAllProps]);

      expect(mockUpdateCategory).toHaveBeenCalledWith('existing-id', {
        name: 'Complete Category',
        description: 'Full description',
        tag: 'complete',
      });
    });

    it('handles categories with special characters', async () => {
      const specialCategory = {
        name: 'Category with "quotes" & symbols!',
        description: 'Description with\nnewlines\tand\ttabs',
        tag: 'special-chars_123',
      };

      const result = await persistenceService.importCategories([specialCategory]);

      expect(result.success).toBe(true);
      expect(mockCreateCategory).toHaveBeenCalledWith(specialCategory);
    });
  });
});