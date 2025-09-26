import { InventoryOrderProcessor, ProductSummary } from '../inventoryOrderProcessor.service';
import { InventoryService } from '../inventory.service';
import { CategoryService } from '../category.service';
import { ProductService } from '../product.service';
import { Category, CategoryLink } from '../../types/category';
import { Product } from '../product.service';
import { InventoryDeductionResult } from '../../types/inventory';

// Mock all service dependencies
jest.mock('../inventory.service');
jest.mock('../category.service');
jest.mock('../product.service');

describe('Category Linking Integration Tests', () => {
  let inventoryOrderProcessor: InventoryOrderProcessor;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let mockProductService: jest.Mocked<ProductService>;

  // Test data setup representing a realistic e-commerce scenario
  const phoneProduct: Product = {
    name: 'iPhone 15 Pro',
    sku: 'IPHONE-15-PRO',
    categoryId: 'smartphones',
    categoryGroupId: 'devices-group',
    description: 'Latest iPhone model',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 999.99,
    metadata: {},
  };

  const smartphoneCategory: Category = {
    id: 'smartphones',
    name: 'Smartphones',
    description: 'Mobile phones and smartphones',
    categoryGroupId: 'devices-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 1,
  };

  const accessoryCategory: Category = {
    id: 'accessories',
    name: 'Phone Accessories',
    description: 'Phone cases, chargers, screen protectors',
    categoryGroupId: 'accessories-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 1,
  };

  const batteryCategory: Category = {
    id: 'batteries',
    name: 'Phone Batteries',
    description: 'Replacement phone batteries',
    categoryGroupId: 'battery-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 2, // 2 batteries per phone
  };

  const chargerCategory: Category = {
    id: 'chargers',
    name: 'Phone Chargers',
    description: 'USB-C and Lightning chargers',
    categoryGroupId: 'charger-group',
    inventoryType: 'qty',
    inventoryUnit: 'pcs',
    inventoryDeductionQuantity: 1,
  };

  const orderItem: ProductSummary = {
    name: 'iPhone 15 Pro',
    quantity: '3', // Ordering 3 phones
    SKU: 'IPHONE-15-PRO',
    type: 'amazon',
    orderId: 'AMZ-ORDER-123',
    batchInfo: {
      batchId: 'BATCH-789',
      fileName: 'amazon_orders.pdf',
      uploadedAt: new Date().toISOString(),
      platform: 'amazon',
      orderCount: 1,
      metadata: {
        userId: 'test-user',
        selectedDate: '2025-01-15',
        processedAt: new Date().toISOString(),
      },
    },
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

    inventoryOrderProcessor = new InventoryOrderProcessor();

    // Setup basic data
    mockProductService.getProducts.mockResolvedValue([phoneProduct]);
    mockCategoryService.getCategories.mockResolvedValue([
      smartphoneCategory,
      accessoryCategory,
      batteryCategory,
      chargerCategory,
    ]);
    mockCategoryService.getCategory.mockImplementation((id: string) => {
      const categories = [smartphoneCategory, accessoryCategory, batteryCategory, chargerCategory];
      return Promise.resolve(categories.find(cat => cat.id === id));
    });
  });

  describe('Complete Category Linking Workflow', () => {
    it('should handle complete workflow: link creation → validation → order processing with cascades', async () => {
      // Step 1: Setup initial state with no links
      mockCategoryService.getCategoryLinkDetails.mockResolvedValue([]);
      mockCategoryService.getLinkedCategories.mockResolvedValue([]);

      // Step 2: Create category links (simulating UI interactions)
      mockCategoryService.addCategoryLink
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] }) // accessories link
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] }) // batteries link
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] }); // chargers link

      // Create links from smartphones to accessories, batteries, and chargers
      const addAccessoryResult = await mockCategoryService.addCategoryLink('smartphones', 'accessories', true);
      expect(addAccessoryResult.isValid).toBe(true);

      const addBatteryResult = await mockCategoryService.addCategoryLink('smartphones', 'batteries', true);
      expect(addBatteryResult.isValid).toBe(true);

      const addChargerResult = await mockCategoryService.addCategoryLink('smartphones', 'chargers', true);
      expect(addChargerResult.isValid).toBe(true);

      // Step 3: Verify link validation
      mockCategoryService.validateInventoryDeductionConfig.mockReturnValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });

      const validationResult = mockCategoryService.validateInventoryDeductionConfig(smartphoneCategory);
      expect(validationResult.isValid).toBe(true);

      // Step 4: Setup linked categories for order processing
      mockCategoryService.getLinkedCategories.mockResolvedValue([
        accessoryCategory,
        batteryCategory, 
        chargerCategory,
      ]);

      // Step 5: Setup inventory deduction result
      const expectedInventoryResult: InventoryDeductionResult = {
        deductions: [
          {
            categoryGroupId: 'devices-group',
            requestedQuantity: 3, // 3 phones
            deductedQuantity: 3,
            newInventoryLevel: 47,
            movementId: 'movement-1',
          },
          {
            categoryGroupId: 'accessories-group',
            requestedQuantity: 3, // 3 accessories (1 per phone)
            deductedQuantity: 3,
            newInventoryLevel: 57,
            movementId: 'movement-2',
          },
          {
            categoryGroupId: 'battery-group',
            requestedQuantity: 6, // 6 batteries (2 per phone)
            deductedQuantity: 6,
            newInventoryLevel: 94,
            movementId: 'movement-3',
          },
          {
            categoryGroupId: 'charger-group',
            requestedQuantity: 3, // 3 chargers (1 per phone)
            deductedQuantity: 3,
            newInventoryLevel: 27,
            movementId: 'movement-4',
          },
        ],
        warnings: [],
        errors: [],
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValue(expectedInventoryResult);

      // Step 6: Process order with cascade deductions
      const result = await inventoryOrderProcessor.processOrderWithCategoryDeduction([orderItem], 'AMZ-ORDER-123');

      // Step 7: Verify complete workflow results
      expect(result.orderItems).toHaveLength(1);
      expect(result.orderItems[0]).toMatchObject({
        ...orderItem,
        categoryId: 'smartphones',
        category: 'Smartphones',
        product: phoneProduct,
        categoryDeductionQuantity: 1,
        inventoryDeductionRequired: true,
      });

      // Verify inventory service was called with primary + cascade deductions
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        // Primary deduction
        {
          categoryGroupId: 'devices-group',
          quantity: 3,
          unit: 'pcs',
          productSku: 'IPHONE-15-PRO',
          orderReference: 'AMZ-ORDER-123',
          transactionReference: 'BATCH-789',
          platform: 'amazon',
        },
        // Cascade deductions
        {
          categoryGroupId: 'accessories-group',
          quantity: 3,
          unit: 'pcs',
          productSku: 'IPHONE-15-PRO',
          orderReference: 'AMZ-ORDER-123',
          transactionReference: 'BATCH-789',
          platform: 'amazon',
        },
        {
          categoryGroupId: 'battery-group',
          quantity: 6, // 3 phones * 2 batteries each
          unit: 'pcs',
          productSku: 'IPHONE-15-PRO',
          orderReference: 'AMZ-ORDER-123',
          transactionReference: 'BATCH-789',
          platform: 'amazon',
        },
        {
          categoryGroupId: 'charger-group',
          quantity: 3,
          unit: 'pcs',
          productSku: 'IPHONE-15-PRO',
          orderReference: 'AMZ-ORDER-123',
          transactionReference: 'BATCH-789',
          platform: 'amazon',
        },
      ]);

      expect(result.inventoryResult).toEqual(expectedInventoryResult);
    });

    it('should handle workflow with validation errors during link creation', async () => {
      // Step 1: Attempt to create invalid link (circular dependency)
      mockCategoryService.addCategoryLink.mockResolvedValue({
        isValid: false,
        errors: ['Cannot create link: would create circular dependency'],
        warnings: [],
      });

      const result = await mockCategoryService.addCategoryLink('smartphones', 'smartphones', true);

      // Step 2: Verify validation error handling
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot create link: would create circular dependency');

      // Step 3: Verify no links are created when validation fails
      mockCategoryService.getCategoryLinkDetails.mockResolvedValue([]);
      const links = await mockCategoryService.getCategoryLinkDetails('smartphones');
      expect(links).toHaveLength(0);
    });

    it('should handle order processing with some inactive cascade links', async () => {
      // Step 1: Setup mixed active/inactive links
      mockCategoryService.getLinkedCategories.mockResolvedValue([
        accessoryCategory, // Active
        // Battery link is inactive (not included)
        chargerCategory,   // Active
      ]);

      const partialInventoryResult: InventoryDeductionResult = {
        deductions: [
          {
            categoryGroupId: 'devices-group',
            requestedQuantity: 2,
            deductedQuantity: 2,
            newInventoryLevel: 48,
            movementId: 'movement-1',
          },
          {
            categoryGroupId: 'accessories-group',
            requestedQuantity: 2,
            deductedQuantity: 2,
            newInventoryLevel: 58,
            movementId: 'movement-2',
          },
          {
            categoryGroupId: 'charger-group',
            requestedQuantity: 2,
            deductedQuantity: 2,
            newInventoryLevel: 28,
            movementId: 'movement-3',
          },
        ],
        warnings: [],
        errors: [],
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValue(partialInventoryResult);

      // Step 2: Process order with partial cascade links
      const twoPhoneOrder = { ...orderItem, quantity: '2' };
      const result = await inventoryOrderProcessor.processOrderWithCategoryDeduction([twoPhoneOrder], 'ORDER-456');

      // Step 3: Verify only active links trigger cascade deductions
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith([
        // Primary deduction
        expect.objectContaining({ categoryGroupId: 'devices-group', quantity: 2 }),
        // Only active cascade deductions
        expect.objectContaining({ categoryGroupId: 'accessories-group', quantity: 2 }),
        expect.objectContaining({ categoryGroupId: 'charger-group', quantity: 2 }),
        // Battery deduction should NOT be present (inactive link)
      ]);

      // Verify no battery deduction occurred
      const batteryDeduction = mockInventoryService.deductInventoryFromOrder.mock.calls[0][0]
        .find((deduction: any) => deduction.categoryGroupId === 'battery-group');
      expect(batteryDeduction).toBeUndefined();
    });

    it('should handle dependency chain analysis for complex linking scenarios', async () => {
      // Step 1: Create a complex chain: Smartphones → Accessories → Cases → Materials
      const casesCategory: Category = {
        id: 'cases',
        name: 'Phone Cases',
        description: 'Protective phone cases',
        categoryGroupId: 'cases-group',
        inventoryType: 'qty',
        inventoryUnit: 'pcs',
        inventoryDeductionQuantity: 1,
      };

      const materialsCategory: Category = {
        id: 'materials',
        name: 'Case Materials',
        description: 'Raw materials for cases',
        categoryGroupId: 'materials-group',
        inventoryType: 'qty',
        inventoryUnit: 'pcs',
        inventoryDeductionQuantity: 3,
      };

      mockCategoryService.getDependencyChains.mockResolvedValue([
        'Smartphones → Phone Accessories',
        'Phone Accessories → Phone Cases',
        'Phone Cases → Case Materials',
        'Smartphones → Phone Batteries',
      ]);

      // Step 2: Analyze dependency chains
      const chains = await mockCategoryService.getDependencyChains('smartphones');

      // Step 3: Verify complex dependency chain structure
      expect(chains).toHaveLength(4);
      expect(chains).toContain('Smartphones → Phone Accessories');
      expect(chains).toContain('Phone Accessories → Phone Cases');
      expect(chains).toContain('Phone Cases → Case Materials');
      expect(chains).toContain('Smartphones → Phone Batteries');
    });

    it('should handle preview functionality for cascade deductions', async () => {
      // Step 1: Setup cascading links
      mockCategoryService.getLinkedCategories.mockResolvedValue([
        accessoryCategory,
        batteryCategory,
      ]);

      // Step 2: Generate preview
      const preview = await inventoryOrderProcessor.previewCategoryDeductions([orderItem]);

      // Step 3: Verify preview includes both primary and cascade items
      expect(preview.items).toHaveLength(3); // 1 primary + 2 cascade
      
      // Primary deduction
      const primaryItem = preview.items.find(item => !item.isCascade);
      expect(primaryItem).toMatchObject({
        productSku: 'IPHONE-15-PRO',
        productName: 'iPhone 15 Pro',
        categoryName: 'Smartphones',
        categoryGroupId: 'devices-group',
        orderQuantity: 3,
        deductionQuantity: 1,
        totalDeduction: 3,
        inventoryUnit: 'pcs',
        isCascade: false,
      });

      // Cascade deductions
      const cascadeItems = preview.items.filter(item => item.isCascade);
      expect(cascadeItems).toHaveLength(2);
      
      expect(cascadeItems.find(item => item.categoryName === 'Phone Accessories')).toMatchObject({
        productSku: 'IPHONE-15-PRO',
        categoryGroupId: 'accessories-group',
        totalDeduction: 3,
        isCascade: true,
        cascadeSource: {
          sourceCategoryName: 'Smartphones',
          targetCategoryName: 'Phone Accessories',
        },
      });

      expect(cascadeItems.find(item => item.categoryName === 'Phone Batteries')).toMatchObject({
        productSku: 'IPHONE-15-PRO',
        categoryGroupId: 'battery-group',
        totalDeduction: 6, // 3 phones * 2 batteries each
        isCascade: true,
        cascadeSource: {
          sourceCategoryName: 'Smartphones',
          targetCategoryName: 'Phone Batteries',
        },
      });

      // Step 4: Verify total deductions aggregation
      expect(preview.totalDeductions.size).toBe(3);
      expect(preview.totalDeductions.get('devices-group')).toMatchObject({
        categoryGroupName: 'Group devices-group',
        totalQuantity: 3,
        unit: 'pcs',
      });
      expect(preview.totalDeductions.get('accessories-group')).toMatchObject({
        categoryGroupName: 'Group accessories-group',
        totalQuantity: 3,
        unit: 'pcs',
      });
      expect(preview.totalDeductions.get('battery-group')).toMatchObject({
        categoryGroupName: 'Group battery-group',
        totalQuantity: 6,
        unit: 'pcs',
      });

      // Step 5: Verify cascade warnings
      expect(preview.warnings).toContain('2 additional cascade deductions will be processed from linked categories');
    });

    it('should handle error recovery during order processing with cascade links', async () => {
      // Step 1: Setup cascade links
      mockCategoryService.getLinkedCategories.mockResolvedValue([accessoryCategory, batteryCategory]);

      // Step 2: Simulate inventory service error
      mockInventoryService.deductInventoryFromOrder.mockRejectedValue(
        new Error('Insufficient inventory for battery-group')
      );

      // Step 3: Process order and verify error handling
      const result = await inventoryOrderProcessor.processOrderWithCategoryDeduction([orderItem], 'ORDER-ERROR');

      // Verify error is captured in result structure (not thrown)
      expect(result.inventoryResult.errors).toHaveLength(1);
      expect(result.inventoryResult.errors[0].error).toContain('Insufficient inventory for battery-group');

      // Step 4: Verify inventory service was still called with correct deductions
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ categoryGroupId: 'devices-group' }),
          expect.objectContaining({ categoryGroupId: 'accessories-group' }),
          expect.objectContaining({ categoryGroupId: 'battery-group' }),
        ])
      );
    });
  });

  describe('Link Management Integration', () => {
    it('should handle bulk link operations with validation', async () => {
      // Step 1: Setup bulk link creation scenario
      const linkOperations = [
        { sourceCategoryId: 'smartphones', targetCategoryId: 'accessories', isActive: true },
        { sourceCategoryId: 'smartphones', targetCategoryId: 'batteries', isActive: true },
        { sourceCategoryId: 'smartphones', targetCategoryId: 'chargers', isActive: false },
      ];

      // Setup individual link creation responses
      mockCategoryService.addCategoryLink
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] })
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: [] })
        .mockResolvedValueOnce({ isValid: true, errors: [], warnings: ['Target category has no inventory configuration'] });

      // Step 2: Execute bulk operations
      const results = await Promise.all(
        linkOperations.map(op => 
          mockCategoryService.addCategoryLink(op.sourceCategoryId, op.targetCategoryId, op.isActive)
        )
      );

      // Step 3: Verify results
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(true);
      expect(results[2].warnings).toContain('Target category has no inventory configuration');

      // Step 4: Verify final link state
      mockCategoryService.getCategoryLinkDetails.mockResolvedValue([
        { categoryId: 'accessories', isActive: true, createdAt: new Date().toISOString() },
        { categoryId: 'batteries', isActive: true, createdAt: new Date().toISOString() },
        { categoryId: 'chargers', isActive: false, createdAt: new Date().toISOString() },
      ]);

      const finalLinks = await mockCategoryService.getCategoryLinkDetails('smartphones');
      expect(finalLinks).toHaveLength(3);
      expect(finalLinks.filter(link => link.isActive)).toHaveLength(2);
    });

    it('should handle link state changes and their impact on processing', async () => {
      // Step 1: Start with active links
      mockCategoryService.getLinkedCategories.mockResolvedValue([accessoryCategory, batteryCategory]);

      const initialResult: InventoryDeductionResult = {
        deductions: [
          { categoryGroupId: 'devices-group', requestedQuantity: 1, deductedQuantity: 1, newInventoryLevel: 49, movementId: 'move-1' },
          { categoryGroupId: 'accessories-group', requestedQuantity: 1, deductedQuantity: 1, newInventoryLevel: 59, movementId: 'move-2' },
          { categoryGroupId: 'battery-group', requestedQuantity: 2, deductedQuantity: 2, newInventoryLevel: 98, movementId: 'move-3' },
        ],
        warnings: [],
        errors: [],
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValueOnce(initialResult);

      // Process order with both active links
      const singlePhoneOrder = { ...orderItem, quantity: '1' };
      const result1 = await inventoryOrderProcessor.processOrderWithCategoryDeduction([singlePhoneOrder], 'ORDER-1');

      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ categoryGroupId: 'devices-group' }),
          expect.objectContaining({ categoryGroupId: 'accessories-group' }),
          expect.objectContaining({ categoryGroupId: 'battery-group' }),
        ])
      );

      // Step 2: Disable one link
      mockCategoryService.setCategoryLinkActive.mockResolvedValue({ isValid: true, errors: [], warnings: [] });
      
      await mockCategoryService.setCategoryLinkActive('smartphones', 'batteries', false);

      // Step 3: Update linked categories to reflect disabled link
      mockCategoryService.getLinkedCategories.mockResolvedValue([accessoryCategory]); // Only accessories now active

      const partialResult: InventoryDeductionResult = {
        deductions: [
          { categoryGroupId: 'devices-group', requestedQuantity: 1, deductedQuantity: 1, newInventoryLevel: 48, movementId: 'move-4' },
          { categoryGroupId: 'accessories-group', requestedQuantity: 1, deductedQuantity: 1, newInventoryLevel: 58, movementId: 'move-5' },
        ],
        warnings: [],
        errors: [],
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValueOnce(partialResult);

      // Step 4: Process order again with one disabled link
      const result2 = await inventoryOrderProcessor.processOrderWithCategoryDeduction([singlePhoneOrder], 'ORDER-2');

      // Verify only active links are processed
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ categoryGroupId: 'devices-group' }),
          expect.objectContaining({ categoryGroupId: 'accessories-group' }),
        ])
      );

      // Verify no battery deduction in second call
      const lastCall = mockInventoryService.deductInventoryFromOrder.mock.calls[1][0];
      const batteryDeduction = lastCall.find((ded: any) => ded.categoryGroupId === 'battery-group');
      expect(batteryDeduction).toBeUndefined();
    });
  });
});