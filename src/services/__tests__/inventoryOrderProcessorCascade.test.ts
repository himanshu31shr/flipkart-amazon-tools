import { InventoryOrderProcessor, ProductSummary } from '../inventoryOrderProcessor.service';
import { InventoryService } from '../inventory.service';
import { CategoryService } from '../category.service';
import { ProductService } from '../product.service';
import { Category } from '../../types/category';
import { Product } from '../product.service';
import { InventoryDeductionResult } from '../../types/inventory';

// Mock all service dependencies
jest.mock('../inventory.service');
jest.mock('../category.service');
jest.mock('../product.service');

describe('InventoryOrderProcessor - Cascade Deduction Tests', () => {
  let processor: InventoryOrderProcessor;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let mockProductService: jest.Mocked<ProductService>;

  // Test data setup
  const mockMainProduct: Product = {
    name: 'Smartphone',
    sku: 'PHONE-001',
    categoryId: 'electronics-cat',
    categoryGroupId: 'electronics-group',
    description: 'Latest smartphone',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 599.99,
    metadata: {},
  };

  const mockMainCategory: Category = {
    id: 'electronics-cat',
    name: 'Electronics',
    description: 'Electronic devices',
    categoryGroupId: 'electronics-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 1, // 1 piece per order
  };

  const mockLinkedCategory1: Category = {
    id: 'battery-cat',
    name: 'Batteries',
    description: 'Device batteries',
    categoryGroupId: 'battery-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 2, // 2 batteries per phone
  };

  const mockLinkedCategory2: Category = {
    id: 'charger-cat',
    name: 'Chargers',
    description: 'Device chargers',
    categoryGroupId: 'charger-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 1, // 1 charger per phone
  };

  const mockInactiveLinkedCategory: Category = {
    id: 'accessories-cat',
    name: 'Accessories',
    description: 'Device accessories',
    categoryGroupId: 'accessories-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 3, // Should be ignored when inactive
  };

  const mockOrderItem: ProductSummary = {
    name: 'Smartphone',
    quantity: '2', // Ordering 2 phones
    SKU: 'PHONE-001',
    type: 'amazon',
    orderId: 'ORDER-123',
    batchInfo: {
      batchId: 'BATCH-456',
      fileName: 'orders.pdf',
      uploadedAt: new Date().toISOString(),
      platform: 'amazon',
      orderCount: 1,
      metadata: {
        userId: 'user-123',
        selectedDate: '2025-01-15',
        processedAt: new Date().toISOString(),
      },
    },
  };

  const mockInventoryResult: InventoryDeductionResult = {
    deductions: [
      {
        categoryGroupId: 'electronics-group',
        requestedQuantity: 2, // 2 phones
        deductedQuantity: 2,
        newInventoryLevel: 48,
        movementId: 'movement-1',
      },
      {
        categoryGroupId: 'battery-group',
        requestedQuantity: 4, // 2 phones * 2 batteries each
        deductedQuantity: 4,
        newInventoryLevel: 96,
        movementId: 'movement-2',
      },
      {
        categoryGroupId: 'charger-group',
        requestedQuantity: 2, // 2 phones * 1 charger each
        deductedQuantity: 2,
        newInventoryLevel: 28,
        movementId: 'movement-3',
      },
    ],
    warnings: [],
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocked service instances
    mockInventoryService = new InventoryService() as jest.Mocked<InventoryService>;
    mockCategoryService = new CategoryService() as jest.Mocked<CategoryService>;
    mockProductService = new ProductService() as jest.Mocked<ProductService>;

    // Setup constructor mocks
    (InventoryService as jest.MockedClass<typeof InventoryService>).mockImplementation(() => mockInventoryService);
    (CategoryService as jest.MockedClass<typeof CategoryService>).mockImplementation(() => mockCategoryService);
    (ProductService as jest.MockedClass<typeof ProductService>).mockImplementation(() => mockProductService);

    processor = new InventoryOrderProcessor();

    // Setup default mock returns
    mockProductService.getProducts.mockResolvedValue([mockMainProduct]);
    mockCategoryService.getCategories.mockResolvedValue([
      mockMainCategory,
      mockLinkedCategory1,
      mockLinkedCategory2,
      mockInactiveLinkedCategory,
    ]);
    mockCategoryService.getCategory.mockImplementation((id: string) => {
      const categories = [mockMainCategory, mockLinkedCategory1, mockLinkedCategory2, mockInactiveLinkedCategory];
      return Promise.resolve(categories.find(cat => cat.id === id));
    });
    
    // Setup cascade deduction mocks - active linked categories
    mockCategoryService.getLinkedCategories.mockResolvedValue([
      mockLinkedCategory1, // Active battery link
      mockLinkedCategory2, // Active charger link
      // mockInactiveLinkedCategory not included (inactive)
    ]);
    
    mockInventoryService.deductInventoryFromOrder.mockResolvedValue(mockInventoryResult);
  });

  describe('Cascade Deduction Processing', () => {
    it('should process primary and cascade deductions together', async () => {
      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem], 'ORDER-123');

      // Verify order items are enhanced correctly
      expect(result.orderItems).toHaveLength(1);
      expect(result.orderItems[0]).toMatchObject({
        ...mockOrderItem,
        categoryId: 'electronics-cat',
        category: 'Electronics',
        product: mockMainProduct,
        categoryDeductionQuantity: 1,
        inventoryDeductionRequired: true,
      });

      // Verify inventory deduction was called with both primary and cascade deductions
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        // Primary deduction (Electronics category)
        {
          categoryGroupId: 'electronics-group',
          quantity: 2, // 2 phones * 1 each
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
        // Cascade deduction 1 (Batteries)
        {
          categoryGroupId: 'battery-group',
          quantity: 4, // 2 phones * 2 batteries each
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
        // Cascade deduction 2 (Chargers)
        {
          categoryGroupId: 'charger-group',
          quantity: 2, // 2 phones * 1 charger each
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);

      expect(result.inventoryResult).toEqual(mockInventoryResult);
    });

    it('should handle products without linked categories', async () => {
      // Setup - no linked categories
      mockCategoryService.getLinkedCategories.mockResolvedValue([]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem], 'ORDER-123');

      // Verify only primary deduction occurs
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        {
          categoryGroupId: 'electronics-group',
          quantity: 2,
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);
    });

    it('should skip cascade deductions for linked categories without deduction config', async () => {
      // Setup - linked category without deduction quantity
      const categoryWithoutDeduction = {
        ...mockLinkedCategory1,
        inventoryDeductionQuantity: undefined,
      };
      mockCategoryService.getLinkedCategories.mockResolvedValue([categoryWithoutDeduction]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem]);

      // Verify only primary deduction occurs
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        {
          categoryGroupId: 'electronics-group',
          quantity: 2,
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);
    });

    it('should skip cascade deductions for linked categories without category groups', async () => {
      // Setup - linked category without categoryGroupId
      const categoryWithoutGroup = {
        ...mockLinkedCategory1,
        categoryGroupId: undefined,
      };
      mockCategoryService.getLinkedCategories.mockResolvedValue([categoryWithoutGroup]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem]);

      // Verify only primary deduction occurs (no cascade)
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        {
          categoryGroupId: 'electronics-group',
          quantity: 2,
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);
    });

    it('should handle cascade deduction calculation errors gracefully', async () => {
      // Setup - getLinkedCategories throws error
      mockCategoryService.getLinkedCategories.mockRejectedValue(new Error('Database error'));

      // Execute - should not throw and should continue with primary deduction
      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem]);

      // Verify primary deduction still occurs despite cascade error
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        {
          categoryGroupId: 'electronics-group',
          quantity: 2,
          unit: 'pcs',
          productSku: 'PHONE-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);

      expect(result.inventoryResult).toEqual(mockInventoryResult);
    });
  });

  describe('Cascade Deduction Preview', () => {
    it('should preview both primary and cascade deductions', async () => {
      // Execute
      const preview = await processor.previewCategoryDeductions([mockOrderItem]);

      // Verify preview includes both primary and cascade deductions
      expect(preview.items).toHaveLength(3); // 1 primary + 2 cascade
      
      // Primary deduction
      expect(preview.items.find(item => !item.isCascade)).toMatchObject({
        productSku: 'PHONE-001',
        productName: 'Smartphone',
        categoryName: 'Electronics',
        categoryGroupId: 'electronics-group',
        orderQuantity: 2,
        deductionQuantity: 1,
        totalDeduction: 2,
        inventoryUnit: 'pcs',
        isCascade: false,
      });

      // Cascade deductions
      const cascadeItems = preview.items.filter(item => item.isCascade);
      expect(cascadeItems).toHaveLength(2);
      
      expect(cascadeItems.find(item => item.categoryName === 'Batteries')).toMatchObject({
        productSku: 'PHONE-001',
        productName: 'Smartphone',
        categoryName: 'Batteries',
        categoryGroupId: 'battery-group',
        orderQuantity: 2,
        deductionQuantity: 2,
        totalDeduction: 4,
        inventoryUnit: 'pcs',
        isCascade: true,
        cascadeSource: {
          sourceCategoryName: 'Electronics',
          targetCategoryName: 'Batteries',
        },
      });

      expect(cascadeItems.find(item => item.categoryName === 'Chargers')).toMatchObject({
        productSku: 'PHONE-001',
        productName: 'Smartphone',
        categoryName: 'Chargers',
        categoryGroupId: 'charger-group',
        orderQuantity: 2,
        deductionQuantity: 1,
        totalDeduction: 2,
        inventoryUnit: 'pcs',
        isCascade: true,
        cascadeSource: {
          sourceCategoryName: 'Electronics',
          targetCategoryName: 'Chargers',
        },
      });
    });

    it('should include cascade deduction warning in preview', async () => {
      // Execute
      const preview = await processor.previewCategoryDeductions([mockOrderItem]);

      // Verify warning about cascade deductions
      expect(preview.warnings).toContain('2 additional cascade deductions will be processed from linked categories');
    });

    it('should aggregate cascade deductions in total deductions', async () => {
      // Execute
      const preview = await processor.previewCategoryDeductions([mockOrderItem]);

      // Verify total deductions include all category groups
      expect(preview.totalDeductions.size).toBe(3);
      expect(preview.totalDeductions.get('electronics-group')).toMatchObject({
        categoryGroupName: 'Group electronics-group',
        totalQuantity: 2,
        unit: 'pcs',
      });
      expect(preview.totalDeductions.get('battery-group')).toMatchObject({
        categoryGroupName: 'Group battery-group',
        totalQuantity: 4,
        unit: 'pcs',
      });
      expect(preview.totalDeductions.get('charger-group')).toMatchObject({
        categoryGroupName: 'Group charger-group',
        totalQuantity: 2,
        unit: 'pcs',
      });
    });

    it('should handle cascade preview calculation errors gracefully', async () => {
      // Setup - error in cascade calculation
      mockCategoryService.getLinkedCategories.mockRejectedValue(new Error('Preview error'));

      // Execute
      const preview = await processor.previewCategoryDeductions([mockOrderItem]);

      // Verify preview includes primary deduction and warning about cascade failure
      expect(preview.items).toHaveLength(1); // Only primary deduction
      expect(preview.items[0].isCascade).toBe(false);
      expect(preview.warnings).toContain('Could not calculate cascade deductions for Electronics category');
    });

    it('should handle mixed scenarios with some products having cascade links', async () => {
      // Setup - additional product without cascade links
      const productWithoutLinks = {
        ...mockMainProduct,
        sku: 'SIMPLE-001',
        categoryId: 'simple-cat',
        categoryGroupId: 'simple-group',
      };
      const simpleCategory = {
        id: 'simple-cat',
        name: 'Simple Products',
        categoryGroupId: 'simple-group',
        inventoryDeductionQuantity: 1,
      };
      const orderItem2 = {
        ...mockOrderItem,
        SKU: 'SIMPLE-001',
        name: 'Simple Product',
        quantity: '1',
      };

      mockProductService.getProducts.mockResolvedValue([mockMainProduct, productWithoutLinks]);
      mockCategoryService.getCategories.mockResolvedValue([
        mockMainCategory,
        mockLinkedCategory1,
        mockLinkedCategory2,
        simpleCategory,
      ]);
      mockCategoryService.getLinkedCategories
        .mockResolvedValueOnce([mockLinkedCategory1, mockLinkedCategory2]) // For electronics
        .mockResolvedValueOnce([]); // For simple product

      // Execute
      const preview = await processor.previewCategoryDeductions([mockOrderItem, orderItem2]);

      // Verify preview shows cascade for first product, none for second
      expect(preview.items).toHaveLength(4); // 3 from first product + 1 from second
      const cascadeItems = preview.items.filter(item => item.isCascade);
      expect(cascadeItems).toHaveLength(2); // Only from first product
      
      const primaryItems = preview.items.filter(item => !item.isCascade);
      expect(primaryItems).toHaveLength(2); // Both products
    });
  });

  describe('Integration with existing functionality', () => {
    it('should maintain compatibility with existing order processing flow', async () => {
      // Execute without cascade links to ensure existing behavior unchanged
      mockCategoryService.getLinkedCategories.mockResolvedValue([]);

      const result = await processor.processOrderWithCategoryDeduction([mockOrderItem]);

      // Verify result structure matches existing interface
      expect(result).toHaveProperty('orderItems');
      expect(result).toHaveProperty('inventoryResult');
      expect(result.orderItems[0]).toHaveProperty('inventoryDeductionRequired');
      expect(result.orderItems[0]).toHaveProperty('categoryDeductionQuantity');
    });

    it('should work with all existing helper methods', async () => {
      // Test that new cascade functionality doesn't break existing methods
      // Setup mocks for these specific methods
      mockCategoryService.getCategoriesWithInventoryDeduction = jest.fn().mockResolvedValue([mockMainCategory]);
      mockCategoryService.isCategoryReadyForDeduction = jest.fn().mockResolvedValue(true);
      mockCategoryService.getDeductionValidationSummary = jest.fn().mockResolvedValue('Ready for deduction');
      
      const categories = await processor.getCategoriesWithDeductionEnabled();
      expect(Array.isArray(categories)).toBe(true);

      const isEnabled = await processor.isAutomaticDeductionEnabled('PHONE-001');
      expect(typeof isEnabled).toBe('boolean');

      const summary = await processor.getDeductionConfigurationSummary();
      expect(Array.isArray(summary)).toBe(true);
    });
  });
});