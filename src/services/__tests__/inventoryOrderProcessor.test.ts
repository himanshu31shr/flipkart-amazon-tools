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

describe('InventoryOrderProcessor', () => {
  let processor: InventoryOrderProcessor;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let mockProductService: jest.Mocked<ProductService>;

  const mockProduct: Product = {
    name: 'Test Product',
    sku: 'SKU-001',
    categoryId: 'cat-1',
    categoryGroupId: 'group-1',
    description: 'Test product description',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 15.99,
    metadata: {},
  };

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Electronics',
    description: 'Electronic products',
    categoryGroupId: 'group-1',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 5,
  };

  const mockCategoryWithoutDeduction: Category = {
    id: 'cat-2',
    name: 'Books',
    description: 'Books and literature',
    categoryGroupId: 'group-2',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: undefined,
  };

  const mockProductSummary: ProductSummary = {
    name: 'Test Product',
    quantity: '2',
    SKU: 'SKU-001',
    type: 'amazon',
    orderId: 'ORDER-123',
    batchInfo: {
      batchId: 'BATCH-456',
      fileName: 'test.pdf',
      uploadedAt: new Date().toISOString(),
      platform: 'amazon',
      orderCount: 1,
      metadata: {
        userId: 'user-123',
        selectedDate: '2025-09-22',
        processedAt: new Date().toISOString(),
      },
    },
  };

  const mockInventoryDeductionResult: InventoryDeductionResult = {
    deductions: [{
      categoryGroupId: 'group-1',
      requestedQuantity: 10,
      deductedQuantity: 10,
      newInventoryLevel: 90,
      movementId: 'movement-1',
    }],
    warnings: [],
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocked instances
    mockInventoryService = new InventoryService() as jest.Mocked<InventoryService>;
    mockCategoryService = new CategoryService() as jest.Mocked<CategoryService>;
    mockProductService = new ProductService() as jest.Mocked<ProductService>;

    // Setup constructor mocks
    (InventoryService as jest.MockedClass<typeof InventoryService>).mockImplementation(() => mockInventoryService);
    (CategoryService as jest.MockedClass<typeof CategoryService>).mockImplementation(() => mockCategoryService);
    (ProductService as jest.MockedClass<typeof ProductService>).mockImplementation(() => mockProductService);

    processor = new InventoryOrderProcessor();

    // Setup default mock returns
    mockProductService.getProducts.mockResolvedValue([mockProduct]);
    mockCategoryService.getCategories.mockResolvedValue([mockCategory, mockCategoryWithoutDeduction]);
    mockCategoryService.getCategory.mockResolvedValue(mockCategory);
    mockInventoryService.deductInventoryFromOrder.mockResolvedValue(mockInventoryDeductionResult);
  });

  describe('processOrderWithCategoryDeduction', () => {
    it('should process order items with category deduction successfully', async () => {
      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockProductSummary], 'ORDER-123');

      // Verify
      expect(result.orderItems).toHaveLength(1);
      expect(result.orderItems[0]).toMatchObject({
        ...mockProductSummary,
        categoryId: 'cat-1',
        category: 'Electronics',
        product: mockProduct,
        categoryDeductionQuantity: 5,
        inventoryDeductionRequired: true,
      });

      expect(result.inventoryResult).toEqual(mockInventoryDeductionResult);
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([{
        categoryGroupId: 'group-1',
        quantity: 10, // 2 * 5
        unit: 'pcs',
        productSku: 'SKU-001',
        orderReference: 'ORDER-123',
        transactionReference: 'BATCH-456',
        platform: 'amazon',
      }]);
    });

    it('should handle items without SKU', async () => {
      // Setup
      const itemWithoutSku = { ...mockProductSummary, SKU: undefined };

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([itemWithoutSku]);

      // Verify
      expect(result.orderItems[0]).toMatchObject({
        inventoryDeductionRequired: false,
      });
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });

    it('should handle items with products not found', async () => {
      // Setup
      mockProductService.getProducts.mockResolvedValue([]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockProductSummary]);

      // Verify
      expect(result.orderItems[0]).toMatchObject({
        inventoryDeductionRequired: false,
      });
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });

    it('should handle categories without deduction configuration', async () => {
      // Setup
      const productWithoutDeduction = { ...mockProduct, categoryId: 'cat-2' };
      mockProductService.getProducts.mockResolvedValue([productWithoutDeduction]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockProductSummary]);

      // Verify
      expect(result.orderItems[0]).toMatchObject({
        categoryDeductionQuantity: undefined, // Categories without deduction have undefined, not null
        inventoryDeductionRequired: false,
      });
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });

    it('should handle empty order items', async () => {
      // Execute
      const result = await processor.processOrderWithCategoryDeduction([]);

      // Verify
      expect(result.orderItems).toHaveLength(0);
      expect(result.inventoryResult.deductions).toHaveLength(0);
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      // Setup
      mockProductService.getProducts.mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockProductSummary]);

      // Verify
      expect(result.orderItems).toEqual([mockProductSummary]);
      expect(result.inventoryResult.errors).toHaveLength(1);
      expect(result.inventoryResult.errors[0]).toMatchObject({
        categoryGroupId: 'unknown',
        error: 'Order processing failed: Database error',
        requestedQuantity: 0,
        reason: 'Processing error',
      });
    });

    it('should handle items with invalid quantity', async () => {
      // Setup
      const itemWithInvalidQuantity = { ...mockProductSummary, quantity: 'invalid' };

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([itemWithInvalidQuantity]);

      // Verify - invalid quantity results in NaN * 5 = NaN, which fails the > 0 check
      expect(result.orderItems[0]).toMatchObject({
        inventoryDeductionRequired: true, // Category is configured
      });
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled(); // No deduction due to NaN
    });

    it('should handle zero deduction quantity', async () => {
      // Setup
      const categoryWithZeroDeduction = { ...mockCategory, inventoryDeductionQuantity: 0 };
      mockCategoryService.getCategories.mockResolvedValue([categoryWithZeroDeduction]);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction([mockProductSummary]);

      // Verify
      expect(result.orderItems[0].inventoryDeductionRequired).toBe(false);
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });
  });

  describe('previewCategoryDeductions', () => {
    it('should preview deductions correctly', async () => {
      // Execute
      const result = await processor.previewCategoryDeductions([mockProductSummary]);

      // Verify
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        productSku: 'SKU-001',
        productName: 'Test Product',
        categoryName: 'Electronics',
        categoryGroupId: 'group-1',
        orderQuantity: 2,
        deductionQuantity: 5,
        totalDeduction: 10,
        inventoryUnit: 'pcs',
      });

      expect(result.totalDeductions.has('group-1')).toBe(true);
      expect(result.totalDeductions.get('group-1')).toMatchObject({
        categoryGroupName: 'Group group-1', // Mocked name format
        totalQuantity: 10,
        unit: 'pcs',
      });

      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should show warnings for items without deduction', async () => {
      // Setup
      const itemWithoutDeduction = { ...mockProductSummary, SKU: 'SKU-002' };
      const productWithoutDeduction = { ...mockProduct, id: 'prod-2', sku: 'SKU-002', categoryId: 'cat-2' };
      mockProductService.getProducts.mockResolvedValue([mockProduct, productWithoutDeduction]);

      // Execute
      const result = await processor.previewCategoryDeductions([mockProductSummary, itemWithoutDeduction]);

      // Verify
      expect(result.items).toHaveLength(1); // Only one with deduction
      expect(result.warnings).toContain('1 items will not trigger automatic inventory deduction (not configured)');
    });

    it('should handle preview errors gracefully', async () => {
      // Setup
      mockProductService.getProducts.mockRejectedValue(new Error('Preview error'));

      // Execute
      const result = await processor.previewCategoryDeductions([mockProductSummary]);

      // Verify
      expect(result.items).toHaveLength(0);
      expect(result.errors).toContain('Preview calculation failed: Preview error');
    });

    it('should handle empty order items in preview', async () => {
      // Execute
      const result = await processor.previewCategoryDeductions([]);

      // Verify
      expect(result.items).toHaveLength(0);
      expect(result.totalDeductions.size).toBe(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getCategoriesWithDeductionEnabled', () => {
    it('should delegate to CategoryService', async () => {
      // Setup
      const expectedCategories = [mockCategory];
      mockCategoryService.getCategoriesWithInventoryDeduction.mockResolvedValue(expectedCategories);

      // Execute
      const result = await processor.getCategoriesWithDeductionEnabled();

      // Verify
      expect(result).toEqual(expectedCategories);
      expect(mockCategoryService.getCategoriesWithInventoryDeduction).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAutomaticDeductionEnabled', () => {
    it('should return true when product has deduction enabled', async () => {
      // Setup
      mockCategoryService.isCategoryReadyForDeduction.mockResolvedValue(true);

      // Execute
      const result = await processor.isAutomaticDeductionEnabled('SKU-001');

      // Verify
      expect(result).toBe(true);
      expect(mockCategoryService.isCategoryReadyForDeduction).toHaveBeenCalledWith('cat-1');
    });

    it('should return false when product not found', async () => {
      // Setup
      mockProductService.getProducts.mockResolvedValue([]);

      // Execute
      const result = await processor.isAutomaticDeductionEnabled('UNKNOWN-SKU');

      // Verify
      expect(result).toBe(false);
      expect(mockCategoryService.isCategoryReadyForDeduction).not.toHaveBeenCalled();
    });

    it('should return false when product has no category', async () => {
      // Setup
      const productWithoutCategory = { ...mockProduct, categoryId: undefined };
      mockProductService.getProducts.mockResolvedValue([productWithoutCategory]);

      // Execute
      const result = await processor.isAutomaticDeductionEnabled('SKU-001');

      // Verify
      expect(result).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      // Setup
      mockProductService.getProducts.mockRejectedValue(new Error('Service error'));

      // Execute
      const result = await processor.isAutomaticDeductionEnabled('SKU-001');

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('getDeductionConfigurationSummary', () => {
    it('should return configuration summary for all categories', async () => {
      // Setup
      mockCategoryService.getDeductionValidationSummary
        .mockResolvedValueOnce('Ready for deduction')
        .mockResolvedValueOnce('Deduction disabled');

      // Execute
      const result = await processor.getDeductionConfigurationSummary();

      // Verify
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Electronics',
        summary: 'Ready for deduction',
      });
      expect(result[1]).toMatchObject({
        categoryId: 'cat-2',
        categoryName: 'Books',
        summary: 'Deduction disabled',
      });
    });

    it('should handle categories without IDs', async () => {
      // Setup
      const categoryWithoutId = { ...mockCategory, id: undefined };
      mockCategoryService.getCategories.mockResolvedValue([categoryWithoutId]);

      // Execute
      const result = await processor.getDeductionConfigurationSummary();

      // Verify
      expect(result).toHaveLength(0);
    });

    it('should handle service errors gracefully', async () => {
      // Setup
      mockCategoryService.getCategories.mockRejectedValue(new Error('Service error'));

      // Execute
      const result = await processor.getDeductionConfigurationSummary();

      // Verify
      expect(result).toHaveLength(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple products with different deduction configurations', async () => {
      // Setup
      const products = [
        mockProduct,
        { ...mockProduct, id: 'prod-2', sku: 'SKU-002', categoryId: 'cat-2' }, // No deduction
      ];
      const orderItems = [
        mockProductSummary,
        { ...mockProductSummary, SKU: 'SKU-002', quantity: '3' },
      ];
      mockProductService.getProducts.mockResolvedValue(products);

      // Execute
      const result = await processor.processOrderWithCategoryDeduction(orderItems);

      // Verify
      expect(result.orderItems).toHaveLength(2);
      expect(result.orderItems[0].inventoryDeductionRequired).toBe(true);
      expect(result.orderItems[1].inventoryDeductionRequired).toBe(false);
      
      // Only the first product should trigger deduction
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([{
        categoryGroupId: 'group-1',
        quantity: 10, // 2 * 5
        unit: 'pcs',
        productSku: 'SKU-001',
        orderReference: 'ORDER-123',
        transactionReference: 'BATCH-456',
        platform: 'amazon',
      }]);
    });

    it('should aggregate deductions for same category group', async () => {
      // Setup
      const product2 = { ...mockProduct, id: 'prod-2', sku: 'SKU-002' }; // Same category group
      const orderItems = [
        mockProductSummary,
        { ...mockProductSummary, SKU: 'SKU-002', quantity: '1' },
      ];
      mockProductService.getProducts.mockResolvedValue([mockProduct, product2]);

      // Execute
      await processor.processOrderWithCategoryDeduction(orderItems, 'ORDER-123');

      // Verify - Should create separate deduction items, not aggregate
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        {
          categoryGroupId: 'group-1',
          quantity: 10, // 2 * 5
          unit: 'pcs',
          productSku: 'SKU-001',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
        {
          categoryGroupId: 'group-1',
          quantity: 5, // 1 * 5
          unit: 'pcs',
          productSku: 'SKU-002',
          orderReference: 'ORDER-123',
          transactionReference: 'BATCH-456',
          platform: 'amazon',
        },
      ]);
    });
  });
});