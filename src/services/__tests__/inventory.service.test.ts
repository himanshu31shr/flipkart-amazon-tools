import { InventoryService } from '../inventory.service';
import { CategoryGroupService } from '../categoryGroup.service';
import { InventoryDeductionItem } from '../../types/inventory';

// Mock CategoryGroupService
jest.mock('../categoryGroup.service');
const MockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let mockCategoryGroupService: jest.Mocked<CategoryGroupService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a properly mocked instance
    mockCategoryGroupService = {
      getCategoryGroup: jest.fn(),
      getCategoryGroups: jest.fn(),
      getCategoryGroupsWithStats: jest.fn(),
      createCategoryGroup: jest.fn(),
      updateCategoryGroup: jest.fn(),
      deleteCategoryGroup: jest.fn(),
      addCategoryToCategoryGroup: jest.fn(),
      removeCategoryFromCategoryGroup: jest.fn(),
      updateCategoryGroupWithStats: jest.fn(),
      getCategoryGroupById: jest.fn(),
      getCategoryGroupByName: jest.fn(),
      searchCategoryGroups: jest.fn(),
      getCategoryGroupCategories: jest.fn(),
      bulkUpdateCategoryGroups: jest.fn(),
      updateInventory: jest.fn(),
      checkThresholdAlerts: jest.fn(),
      exportCategoryGroups: jest.fn(),
      importCategoryGroups: jest.fn(),
    } as unknown as jest.Mocked<InstanceType<typeof CategoryGroupService>>;

    MockCategoryGroupService.mockImplementation(() => mockCategoryGroupService);
    
    inventoryService = new InventoryService();
  });

  describe('deductInventoryFromOrder', () => {
    it('should return empty result for empty order items', async () => {
      const result = await inventoryService.deductInventoryFromOrder([]);
      
      expect(result).toEqual({
        deductions: [],
        warnings: [],
        errors: []
      });
    });

    it('should add error for items without categoryGroupId', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: '',
          quantity: 5,
          unit: 'pcs',
          productSku: 'TEST-001'
        }
      ];

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        categoryGroupId: 'unknown',
        error: 'Missing category group mapping',
        requestedQuantity: 5,
        reason: 'Product SKU must be mapped to a category group before inventory deduction'
      });
      expect(result.deductions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should successfully deduct inventory for valid items', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'group-1',
          quantity: 10,
          unit: 'pcs',
          productSku: 'TEST-001',
          orderReference: 'ORDER-123',
          transactionReference: 'TXN-456',
          platform: 'amazon'
        }
      ];

      // Mock category group data
      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      // Mock update inventory result
      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 40,
        movementId: 'movement-123'
      });

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.deductions).toHaveLength(1);
      expect(result.deductions[0]).toEqual({
        categoryGroupId: 'group-1',
        requestedQuantity: 10,
        deductedQuantity: 10,
        newInventoryLevel: 40,
        movementId: 'movement-123'
      });
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      // Verify service calls
      expect(mockCategoryGroupService.getCategoryGroup).toHaveBeenCalledWith('group-1');
      expect(mockCategoryGroupService.updateInventory).toHaveBeenCalledWith(
        'group-1',
        10,
        'deduction',
        expect.objectContaining({
          transactionReference: 'TXN-456',
          orderReference: 'ORDER-123',
          productSku: 'TEST-001',
          platform: 'amazon',
          reason: 'Order processing deduction for 1 item(s)',
          notes: 'SKUs: TEST-001'
        })
      );
    });

    it('should add warning for insufficient inventory but proceed with deduction', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'group-1',
          quantity: 100, // More than available
          unit: 'pcs',
          productSku: 'TEST-001'
        }
      ];

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 20, // Less than requested 100
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: -80, // Goes negative
        movementId: 'movement-123'
      });

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        categoryGroupId: 'group-1',
        warning: 'Insufficient inventory: requested 100pcs, available 20pcs',
        requestedQuantity: 100,
        availableQuantity: 20
      });
      expect(result.deductions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle unit mismatch errors', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'group-1',
          quantity: 10,
          unit: 'kg', // Different from category group unit
          productSku: 'TEST-001'
        }
      ];

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        categoryGroupId: 'group-1',
        error: 'Unit mismatch',
        requestedQuantity: 10,
        reason: 'Order item unit (kg) does not match category group unit (pcs)'
      });
      expect(result.deductions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle missing category group', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'nonexistent-group',
          quantity: 10,
          unit: 'pcs',
          productSku: 'TEST-001'
        }
      ];

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue(undefined);

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        categoryGroupId: 'nonexistent-group',
        error: 'Category group not found',
        requestedQuantity: 10,
        reason: 'The specified category group does not exist in the system'
      });
      expect(result.deductions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should group multiple items by categoryGroupId and process as batch', async () => {
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'group-1',
          quantity: 5,
          unit: 'pcs',
          productSku: 'TEST-001'
        },
        {
          categoryGroupId: 'group-1',
          quantity: 10,
          unit: 'pcs',
          productSku: 'TEST-002'
        }
      ];

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 35,
        movementId: 'movement-123'
      });

      const result = await inventoryService.deductInventoryFromOrder(orderItems);
      
      expect(result.deductions).toHaveLength(2); // Both items recorded
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      // Verify that updateInventory was called once with total quantity (5 + 10 = 15)
      expect(mockCategoryGroupService.updateInventory).toHaveBeenCalledTimes(1);
      expect(mockCategoryGroupService.updateInventory).toHaveBeenCalledWith(
        'group-1',
        15, // Total quantity
        'deduction',
        expect.objectContaining({
          reason: 'Order processing deduction for 2 item(s)',
          notes: 'SKUs: TEST-001, TEST-002'
        })
      );
    });
  });

  describe('adjustInventoryManually', () => {
    it('should successfully increase inventory', async () => {
      const adjustment = {
        categoryGroupId: 'group-1',
        adjustmentType: 'increase' as const,
        quantity: 20,
        reason: 'stock_received' as const,
        notes: 'New stock delivery',
        adjustedBy: 'user-123'
      };

      // Mock category group data
      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 120,
        movementId: 'movement-123'
      });

      const result = await inventoryService.adjustInventoryManually(adjustment);

      expect(result).toEqual({
        newInventoryLevel: 120,
        movementId: 'movement-123'
      });
    });

    it('should successfully decrease inventory', async () => {
      const adjustment = {
        categoryGroupId: 'group-1',
        adjustmentType: 'decrease' as const,
        quantity: 10,
        reason: 'stock_damaged' as const,
        notes: 'Damaged inventory removal',
        adjustedBy: 'user-123'
      };

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 90,
        movementId: 'movement-456'
      });

      const result = await inventoryService.adjustInventoryManually(adjustment);

      expect(result).toEqual({
        newInventoryLevel: 90,
        movementId: 'movement-456'
      });
    });

    it('should handle set adjustment type', async () => {
      const adjustment = {
        categoryGroupId: 'group-1',
        adjustmentType: 'set' as const,
        quantity: 50,
        reason: 'stock_counted' as const,
        notes: 'Physical count adjustment',
        adjustedBy: 'user-123'
      };

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 50,
        movementId: 'movement-789'
      });

      const result = await inventoryService.adjustInventoryManually(adjustment);

      expect(result).toEqual({
        newInventoryLevel: 50,
        movementId: 'movement-789'
      });
    });

    it('should throw error for invalid adjustment type', async () => {
      const adjustment = {
        categoryGroupId: 'group-1',
        adjustmentType: 'invalid' as unknown as 'increase' | 'decrease' | 'set',
        quantity: 20,
        reason: 'stock_received' as const,
        notes: 'Invalid adjustment',
        adjustedBy: 'user-123'
      };

      // Mock category group data
      mockCategoryGroupService.getCategoryGroup.mockResolvedValue({
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        currentInventory: 100,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      });

      await expect(inventoryService.adjustInventoryManually(adjustment))
        .rejects
        .toThrow('Invalid adjustment type: invalid. Must be \'increase\', \'decrease\', or \'set\'');
    });

    it('should throw error for zero or negative quantity', async () => {
      const adjustment = {
        categoryGroupId: 'group-1',
        adjustmentType: 'increase' as const,
        quantity: -5,
        reason: 'stock_received' as const,
        notes: 'Invalid quantity',
        adjustedBy: 'user-123'
      };

      await expect(inventoryService.adjustInventoryManually(adjustment))
        .rejects
        .toThrow('Quantity must be non-negative');
    });

    it('should throw error for missing category group', async () => {
      const adjustment = {
        categoryGroupId: 'nonexistent-group',
        adjustmentType: 'increase' as const,
        quantity: 20,
        reason: 'stock_received' as const,
        notes: 'Missing group test',
        adjustedBy: 'user-123'
      };

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue(undefined);

      await expect(inventoryService.adjustInventoryManually(adjustment))
        .rejects
        .toThrow('Manual inventory adjustment failed: Category group with ID nonexistent-group not found');
    });
  });
});
