 
import { CategoryService } from '../category.service';
import { Category } from '../../types/category';
import { ValidationResult } from '../../types/categoryExportImport.types';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('../firebase.service');
jest.mock('../firebase.config', () => ({ db: {} }));
jest.mock('../../utils/inventoryDeductionValidation');

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  orderBy: jest.fn(() => ({ _type: 'orderBy' })),
  where: jest.fn(() => ({ _type: 'where' })),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(),
}));

// Mock the inventoryDeductionValidator
jest.mock('../../utils/inventoryDeductionValidation', () => ({
  inventoryDeductionValidator: {
    validateDeductionQuantity: jest.fn(),
    validateCategoryDeductionConfig: jest.fn(),
    isCategoryReadyForDeduction: jest.fn(),
    getValidationSummary: jest.fn(),
  },
}));

// Import the mocked validator
import { inventoryDeductionValidator } from '../../utils/inventoryDeductionValidation';
const mockInventoryDeductionValidator = inventoryDeductionValidator as jest.Mocked<typeof inventoryDeductionValidator>;

describe('CategoryService - Inventory Deduction Methods', () => {
  let service: CategoryService;
  let mockFirebaseService: any;

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Electronics',
    description: 'Electronic products',
    categoryGroupId: 'group-1',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 5,
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
  };

  const mockCategoryWithoutDeduction: Category = {
    id: 'cat-2',
    name: 'Books',
    description: 'Books and literature',
    categoryGroupId: 'group-2',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: undefined,
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService();
    
    // Mock the parent FirebaseService methods
    mockFirebaseService = {
      getDocuments: jest.fn(),
      getDocument: jest.fn(),
      addDocument: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
    };

    // Assign mocks to service
    Object.assign(service, mockFirebaseService);

    // Setup default mock returns
    mockInventoryDeductionValidator.validateDeductionQuantity.mockReturnValue(mockValidationResult);
    mockInventoryDeductionValidator.validateCategoryDeductionConfig.mockReturnValue(mockValidationResult);
    mockInventoryDeductionValidator.isCategoryReadyForDeduction.mockReturnValue(true);
    mockInventoryDeductionValidator.getValidationSummary.mockReturnValue('Ready for automatic deduction');
  });

  describe('getCategoriesWithInventoryDeduction', () => {
    it('should return categories with deduction configured', async () => {
      // Setup
      const categories = [mockCategory, mockCategoryWithoutDeduction];
      jest.spyOn(service, 'getCategories').mockResolvedValue(categories);

      // Execute
      const result = await service.getCategoriesWithInventoryDeduction();

      // Verify
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCategory);
      expect(service.getCategories).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no categories have deduction configured', async () => {
      // Setup
      const categories = [mockCategoryWithoutDeduction];
      jest.spyOn(service, 'getCategories').mockResolvedValue(categories);

      // Execute
      const result = await service.getCategoriesWithInventoryDeduction();

      // Verify
      expect(result).toHaveLength(0);
    });

    it('should handle categories with undefined deduction quantity', async () => {
      // Setup
      const categoryWithUndefined = { ...mockCategory, inventoryDeductionQuantity: undefined };
      const categories = [categoryWithUndefined];
      jest.spyOn(service, 'getCategories').mockResolvedValue(categories);

      // Execute
      const result = await service.getCategoriesWithInventoryDeduction();

      // Verify
      expect(result).toHaveLength(0);
    });

    it('should handle categories with zero deduction quantity', async () => {
      // Setup
      const categoryWithZero = { ...mockCategory, inventoryDeductionQuantity: 0 };
      const categories = [categoryWithZero];
      jest.spyOn(service, 'getCategories').mockResolvedValue(categories);

      // Execute
      const result = await service.getCategoriesWithInventoryDeduction();

      // Verify
      expect(result).toHaveLength(0);
    });
  });

  describe('validateInventoryDeductionConfig', () => {
    it('should delegate to inventoryDeductionValidator', () => {
      // Execute
      const result = service.validateInventoryDeductionConfig(mockCategory);

      // Verify
      expect(result).toEqual(mockValidationResult);
      expect(mockInventoryDeductionValidator.validateCategoryDeductionConfig).toHaveBeenCalledWith(mockCategory);
    });
  });

  describe('updateInventoryDeductionQuantity', () => {
    it('should update category with valid quantity', async () => {
      // Setup
      jest.spyOn(service, 'updateCategory').mockResolvedValue();

      // Execute
      await service.updateInventoryDeductionQuantity('cat-1', 10);

      // Verify
      expect(mockInventoryDeductionValidator.validateDeductionQuantity).toHaveBeenCalledWith(10);
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', {
        inventoryDeductionQuantity: 10,
        updatedAt: expect.any(Object),
      });
    });

    it('should update category with null to disable deduction', async () => {
      // Setup
      jest.spyOn(service, 'updateCategory').mockResolvedValue();

      // Execute
      await service.updateInventoryDeductionQuantity('cat-1', null);

      // Verify
      expect(mockInventoryDeductionValidator.validateDeductionQuantity).not.toHaveBeenCalled();
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', {
        inventoryDeductionQuantity: undefined,
        updatedAt: expect.any(Object),
      });
    });

    it('should throw error for invalid quantity', async () => {
      // Setup
      const invalidValidationResult = {
        isValid: false,
        errors: ['Quantity must be positive'],
        warnings: [],
      };
      mockInventoryDeductionValidator.validateDeductionQuantity.mockReturnValue(invalidValidationResult);

      // Execute & Verify
      await expect(service.updateInventoryDeductionQuantity('cat-1', -5))
        .rejects.toThrow('Invalid deduction quantity: Quantity must be positive');
      
      expect(mockInventoryDeductionValidator.validateDeductionQuantity).toHaveBeenCalledWith(-5);
    });
  });

  describe('getCategoriesWithDeductionByGroup', () => {
    it('should return categories in group with deduction configured', async () => {
      // Setup
      const groupCategories = [mockCategory, mockCategoryWithoutDeduction];
      jest.spyOn(service, 'getCategoriesByGroup').mockResolvedValue(groupCategories);

      // Execute
      const result = await service.getCategoriesWithDeductionByGroup('group-1');

      // Verify
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCategory);
      expect(service.getCategoriesByGroup).toHaveBeenCalledWith('group-1');
    });

    it('should return empty array when no categories in group have deduction', async () => {
      // Setup
      const groupCategories = [mockCategoryWithoutDeduction];
      jest.spyOn(service, 'getCategoriesByGroup').mockResolvedValue(groupCategories);

      // Execute
      const result = await service.getCategoriesWithDeductionByGroup('group-1');

      // Verify
      expect(result).toHaveLength(0);
    });
  });

  describe('isCategoryReadyForDeduction', () => {
    it('should return true when category is ready', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      mockInventoryDeductionValidator.isCategoryReadyForDeduction.mockReturnValue(true);

      // Execute
      const result = await service.isCategoryReadyForDeduction('cat-1');

      // Verify
      expect(result).toBe(true);
      expect(service.getCategory).toHaveBeenCalledWith('cat-1');
      expect(mockInventoryDeductionValidator.isCategoryReadyForDeduction).toHaveBeenCalledWith(mockCategory);
    });

    it('should return false when category not found', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(undefined);

      // Execute
      const result = await service.isCategoryReadyForDeduction('nonexistent');

      // Verify
      expect(result).toBe(false);
      expect(mockInventoryDeductionValidator.isCategoryReadyForDeduction).not.toHaveBeenCalled();
    });

    it('should return false when category is not ready', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      mockInventoryDeductionValidator.isCategoryReadyForDeduction.mockReturnValue(false);

      // Execute
      const result = await service.isCategoryReadyForDeduction('cat-1');

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('bulkUpdateDeductionQuantities', () => {
    it('should update multiple categories successfully', async () => {
      // Setup
      const updates = [
        { categoryId: 'cat-1', quantity: 10 },
        { categoryId: 'cat-2', quantity: 5 },
        { categoryId: 'cat-3', quantity: null },
      ];
      jest.spyOn(service, 'updateCategory').mockResolvedValue();

      // Execute
      await service.bulkUpdateDeductionQuantities(updates);

      // Verify
      expect(mockInventoryDeductionValidator.validateDeductionQuantity).toHaveBeenCalledTimes(2); // Only for non-null values
      expect(service.updateCategory).toHaveBeenCalledTimes(3);
      expect(service.updateCategory).toHaveBeenNthCalledWith(1, 'cat-1', {
        inventoryDeductionQuantity: 10,
        updatedAt: expect.any(Object),
      });
      expect(service.updateCategory).toHaveBeenNthCalledWith(2, 'cat-2', {
        inventoryDeductionQuantity: 5,
        updatedAt: expect.any(Object),
      });
      expect(service.updateCategory).toHaveBeenNthCalledWith(3, 'cat-3', {
        inventoryDeductionQuantity: undefined,
        updatedAt: expect.any(Object),
      });
    });

    it('should throw error if any quantity is invalid', async () => {
      // Setup
      const updates = [
        { categoryId: 'cat-1', quantity: 10 },
        { categoryId: 'cat-2', quantity: -5 }, // Invalid
      ];
      
      mockInventoryDeductionValidator.validateDeductionQuantity
        .mockReturnValueOnce(mockValidationResult)
        .mockReturnValueOnce({
          isValid: false,
          errors: ['Quantity must be positive'],
          warnings: [],
        });

      // Execute & Verify
      await expect(service.bulkUpdateDeductionQuantities(updates))
        .rejects.toThrow('Invalid deduction quantity for category cat-2: Quantity must be positive');
    });

    it('should handle empty updates array', async () => {
      // Setup
      const updateCategorySpy = jest.spyOn(service, 'updateCategory').mockResolvedValue();

      // Execute
      await service.bulkUpdateDeductionQuantities([]);

      // Verify
      expect(mockInventoryDeductionValidator.validateDeductionQuantity).not.toHaveBeenCalled();
      expect(updateCategorySpy).not.toHaveBeenCalled();
    });
  });

  describe('getDeductionValidationSummary', () => {
    it('should return validation summary for existing category', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      mockInventoryDeductionValidator.getValidationSummary.mockReturnValue('Ready for deduction');

      // Execute
      const result = await service.getDeductionValidationSummary('cat-1');

      // Verify
      expect(result).toBe('Ready for deduction');
      expect(service.getCategory).toHaveBeenCalledWith('cat-1');
      expect(mockInventoryDeductionValidator.getValidationSummary).toHaveBeenCalledWith(mockCategory);
    });

    it('should return error message for nonexistent category', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(undefined);

      // Execute
      const result = await service.getDeductionValidationSummary('nonexistent');

      // Verify
      expect(result).toBe('Category not found');
      expect(mockInventoryDeductionValidator.getValidationSummary).not.toHaveBeenCalled();
    });
  });

  describe('enableInventoryDeduction', () => {
    it('should enable deduction with valid configuration', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      jest.spyOn(service, 'updateCategory').mockResolvedValue();
      mockInventoryDeductionValidator.validateCategoryDeductionConfig.mockReturnValue(mockValidationResult);

      // Execute
      const result = await service.enableInventoryDeduction('cat-1', 10, 'qty', 'pcs');

      // Verify
      expect(result).toEqual(mockValidationResult);
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', {
        inventoryDeductionQuantity: 10,
        inventoryType: 'qty',
        inventoryUnit: 'pcs',
      });
    });

    it('should not update category if validation fails', async () => {
      // Setup
      const invalidResult = {
        isValid: false,
        errors: ['Invalid configuration'],
        warnings: [],
      };
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      jest.spyOn(service, 'updateCategory').mockResolvedValue();
      mockInventoryDeductionValidator.validateCategoryDeductionConfig.mockReturnValue(invalidResult);

      // Execute
      const result = await service.enableInventoryDeduction('cat-1', 10);

      // Verify
      expect(result).toEqual(invalidResult);
      expect(service.updateCategory).not.toHaveBeenCalled();
    });

    it('should return error for nonexistent category', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(undefined);
      const updateCategorySpy = jest.spyOn(service, 'updateCategory').mockResolvedValue();

      // Execute
      const result = await service.enableInventoryDeduction('nonexistent', 10);

      // Verify
      expect(result).toEqual({
        isValid: false,
        errors: ['Category not found'],
        warnings: [],
      });
      expect(updateCategorySpy).not.toHaveBeenCalled();
    });

    it('should use existing inventory settings when not provided', async () => {
      // Setup
      jest.spyOn(service, 'getCategory').mockResolvedValue(mockCategory);
      jest.spyOn(service, 'updateCategory').mockResolvedValue();
      mockInventoryDeductionValidator.validateCategoryDeductionConfig.mockReturnValue(mockValidationResult);

      // Execute
      await service.enableInventoryDeduction('cat-1', 15);

      // Verify
      expect(mockInventoryDeductionValidator.validateCategoryDeductionConfig).toHaveBeenCalledWith({
        ...mockCategory,
        inventoryDeductionQuantity: 15,
        inventoryType: 'qty', // Existing value
        inventoryUnit: 'pcs', // Existing value
      });
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', {
        inventoryDeductionQuantity: 15,
      });
    });
  });

  describe('disableInventoryDeduction', () => {
    it('should call updateInventoryDeductionQuantity with null', async () => {
      // Setup
      jest.spyOn(service, 'updateInventoryDeductionQuantity').mockResolvedValue();

      // Execute
      await service.disableInventoryDeduction('cat-1');

      // Verify
      expect(service.updateInventoryDeductionQuantity).toHaveBeenCalledWith('cat-1', null);
    });
  });

  describe('Error handling', () => {
    it('should handle Firebase errors gracefully', async () => {
      // Setup
      jest.spyOn(service, 'getCategories').mockRejectedValue(new Error('Firebase error'));

      // Execute & Verify
      await expect(service.getCategoriesWithInventoryDeduction())
        .rejects.toThrow('Firebase error');
    });

    it('should handle validation service errors', () => {
      // Setup
      mockInventoryDeductionValidator.validateCategoryDeductionConfig.mockImplementation(() => {
        throw new Error('Validation service error');
      });

      // Execute & Verify
      expect(() => service.validateInventoryDeductionConfig(mockCategory))
        .toThrow('Validation service error');
    });
  });
});