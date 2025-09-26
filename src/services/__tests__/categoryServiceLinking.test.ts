import { CategoryService } from '../category.service';
import { Category, CategoryLink } from '../../types/category';
import { ValidationResult } from '../../types/categoryExportImport.types';

// Mock dependencies to focus on the CategoryService methods
jest.mock('../firebase.service');
jest.mock('../../utils/inventoryDeductionValidation', () => ({
  inventoryDeductionValidator: {
    validateDeductionQuantity: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    validateCategoryDeductionConfig: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    isCategoryReadyForDeduction: jest.fn().mockReturnValue(true),
    getValidationSummary: jest.fn().mockReturnValue('Ready for deduction'),
  },
}));
jest.mock('../../utils/circularDependencyValidator', () => ({
  circularDependencyValidator: {
    validateLink: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    checkCircularDependency: jest.fn().mockResolvedValue([]),
    validateAllCategoryLinks: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    getLinkValidationSummary: jest.fn().mockReturnValue('Valid'),
    getDependencyChains: jest.fn().mockResolvedValue([]),
  },
}));

// Mock Firebase 
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
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

describe('CategoryService - Linking Methods Unit Tests', () => {
  let service: CategoryService;

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Electronics',
      description: 'Electronic products',
      categoryGroupId: 'group-1',
      inventoryType: 'qty',
      inventoryUnit: 'pcs',
      inventoryDeductionQuantity: 5,
    },
    {
      id: 'cat-2',
      name: 'Accessories',
      description: 'Electronic accessories',
      categoryGroupId: 'group-2',
      inventoryType: 'qty',
      inventoryUnit: 'pcs',
      inventoryDeductionQuantity: 2,
    },
  ];

  const mockCategoryLinks: CategoryLink[] = [
    {
      categoryId: 'cat-2',
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService();
  });

  describe('Method existence and basic functionality', () => {
    it('should have all required linking methods', () => {
      expect(typeof service.addCategoryLink).toBe('function');
      expect(typeof service.removeCategoryLink).toBe('function');
      expect(typeof service.setCategoryLinkActive).toBe('function');
      expect(typeof service.updateCategoryLink).toBe('function');
      expect(typeof service.getLinkedCategories).toBe('function');
      expect(typeof service.getCategoriesLinkingTo).toBe('function');
      expect(typeof service.getCategoryLinkDetails).toBe('function');
      expect(typeof service.getDependencyChains).toBe('function');
      expect(typeof service.validateInventoryDeductionConfig).toBe('function');
      expect(typeof service.isCategoryReadyForDeduction).toBe('function');
      expect(typeof service.getDeductionValidationSummary).toBe('function');
      expect(typeof service.getCategoriesWithInventoryDeduction).toBe('function');
    });

    it('should validate input parameters for addCategoryLink', async () => {
      // Test self-referencing link validation - the service should handle this internally
      const result = await service.addCategoryLink('cat-1', 'cat-1', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return proper ValidationResult structure from methods', async () => {
      const linkResult = await service.addCategoryLink('source', 'target', true);
      expect(linkResult).toHaveProperty('isValid');
      expect(linkResult).toHaveProperty('errors');
      expect(linkResult).toHaveProperty('warnings');
      expect(Array.isArray(linkResult.errors)).toBe(true);
      expect(Array.isArray(linkResult.warnings)).toBe(true);

      const removeResult = await service.removeCategoryLink('source', 'target');
      expect(removeResult).toHaveProperty('isValid');
      expect(removeResult).toHaveProperty('errors');
      expect(removeResult).toHaveProperty('warnings');

      const toggleResult = await service.setCategoryLinkActive('source', 'target', false);
      expect(toggleResult).toHaveProperty('isValid');
      expect(toggleResult).toHaveProperty('errors');
      expect(toggleResult).toHaveProperty('warnings');
    });

    it('should return arrays from query methods', async () => {
      const linkedCategories = await service.getLinkedCategories('cat-1');
      expect(Array.isArray(linkedCategories)).toBe(true);

      const categoriesLinkingTo = await service.getCategoriesLinkingTo('cat-1');
      expect(Array.isArray(categoriesLinkingTo)).toBe(true);

      const linkDetails = await service.getCategoryLinkDetails('cat-1');
      expect(Array.isArray(linkDetails)).toBe(true);

      const chains = await service.getDependencyChains('cat-1');
      expect(Array.isArray(chains)).toBe(true);

      const categoriesWithDeduction = await service.getCategoriesWithInventoryDeduction();
      expect(Array.isArray(categoriesWithDeduction)).toBe(true);
    });

    it('should handle boolean parameters correctly', async () => {
      // Test that methods accept boolean parameters without errors
      await service.addCategoryLink('cat-1', 'cat-2', true);
      await service.addCategoryLink('cat-1', 'cat-2', false);
      await service.setCategoryLinkActive('cat-1', 'cat-2', true);
      await service.setCategoryLinkActive('cat-1', 'cat-2', false);
      await service.getLinkedCategories('cat-1', true);
      await service.getLinkedCategories('cat-1', false);

      // All should complete without throwing
      expect(true).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle empty or null categoryId gracefully', async () => {
      const emptyResult = await service.getLinkedCategories('');
      expect(Array.isArray(emptyResult)).toBe(true);

      const nullishResult = await service.getLinkedCategories(null as any);
      expect(Array.isArray(nullishResult)).toBe(true);
    });

    it('should handle invalid category IDs in linking operations', async () => {
      const result = await service.addCategoryLink('', 'target', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages', async () => {
      const selfLinkResult = await service.addCategoryLink('cat-1', 'cat-1', true);
      expect(selfLinkResult.isValid).toBe(false);
      expect(selfLinkResult.errors.length).toBeGreaterThan(0);
      expect(typeof selfLinkResult.errors[0]).toBe('string');
    });
  });

  describe('Integration with validation utilities', () => {
    it('should call validation methods for deduction configuration', () => {
      const mockCategory = mockCategories[0];
      
      // This should not throw and should return a validation result
      const result = service.validateInventoryDeductionConfig(mockCategory);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should handle validation method calls without throwing', async () => {
      // These methods should not throw exceptions even with mock data
      await expect(service.isCategoryReadyForDeduction('cat-1')).resolves.toBeDefined();
      await expect(service.getDeductionValidationSummary('cat-1')).resolves.toBeDefined();
      await expect(service.getDependencyChains('cat-1')).resolves.toBeDefined();
    });
  });

  describe('TypeScript interface compliance', () => {
    it('should work with proper Category interface', () => {
      const category: Category = {
        id: 'test-id',
        name: 'Test Category',
        description: 'Test description',
        categoryGroupId: 'test-group',
        inventoryType: 'qty',
        inventoryUnit: 'pcs',
        inventoryDeductionQuantity: 1,
      };

      // Should not throw type errors
      const validation = service.validateInventoryDeductionConfig(category);
      expect(validation).toBeDefined();
    });

    it('should work with proper CategoryLink interface', () => {
      const link: CategoryLink = {
        categoryId: 'target-cat',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Link structure should be valid
      expect(link).toHaveProperty('categoryId');
      expect(link).toHaveProperty('isActive');
      expect(link).toHaveProperty('createdAt');
      expect(typeof link.isActive).toBe('boolean');
    });
  });

  describe('Method parameter validation', () => {
    it('should validate required parameters for addCategoryLink', async () => {
      // Missing source ID
      const result1 = await service.addCategoryLink('', 'target', true);
      expect(result1.isValid).toBe(false);

      // Missing target ID  
      const result2 = await service.addCategoryLink('source', '', true);
      expect(result2.isValid).toBe(false);
    });

    it('should validate parameters for setCategoryLinkActive', async () => {
      const result = await service.setCategoryLinkActive('', 'target', true);
      expect(result.isValid).toBe(false);
    });

    it('should validate parameters for removeCategoryLink', async () => {
      const result = await service.removeCategoryLink('', 'target');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Async method behavior', () => {
    it('should return promises from all async methods', () => {
      const addPromise = service.addCategoryLink('cat-1', 'cat-2', true);
      const removePromise = service.removeCategoryLink('cat-1', 'cat-2');
      const togglePromise = service.setCategoryLinkActive('cat-1', 'cat-2', false);
      const updatePromise = service.updateCategoryLink('cat-1', 'cat-2', { isActive: false });
      const getLinkedPromise = service.getLinkedCategories('cat-1');
      const getLinkingToPromise = service.getCategoriesLinkingTo('cat-1');
      const getDetailsPromise = service.getCategoryLinkDetails('cat-1');
      const getChainsPromise = service.getDependencyChains('cat-1');
      const readyPromise = service.isCategoryReadyForDeduction('cat-1');
      const summaryPromise = service.getDeductionValidationSummary('cat-1');
      const withDeductionPromise = service.getCategoriesWithInventoryDeduction();

      expect(addPromise).toBeInstanceOf(Promise);
      expect(removePromise).toBeInstanceOf(Promise);
      expect(togglePromise).toBeInstanceOf(Promise);
      expect(updatePromise).toBeInstanceOf(Promise);
      expect(getLinkedPromise).toBeInstanceOf(Promise);
      expect(getLinkingToPromise).toBeInstanceOf(Promise);
      expect(getDetailsPromise).toBeInstanceOf(Promise);
      expect(getChainsPromise).toBeInstanceOf(Promise);
      expect(readyPromise).toBeInstanceOf(Promise);
      expect(summaryPromise).toBeInstanceOf(Promise);
      expect(withDeductionPromise).toBeInstanceOf(Promise);
    });
  });
});