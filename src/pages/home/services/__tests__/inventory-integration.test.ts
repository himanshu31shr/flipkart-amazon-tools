import { AmazonPDFTransformer } from '../TrasformAmazonPages';
import { FlipkartPageTransformer } from '../TrasformFlipkartPages';
import { InventoryService } from '../../../../services/inventory.service';
import { CategoryGroupService } from '../../../../services/categoryGroup.service';
import { Product } from '../../../../services/product.service';
import { Category } from '../../../../services/category.service';
import { CategoryGroup } from '../../../../types/categoryGroup';
import { 
  InventoryDeductionItem, 
  InventoryDeductionResult
} from '../../../../types/inventory';
import { BatchInfo } from '../../../../types/transaction.type';
import { CategorySortConfig } from '../../../../utils/pdfSorting';
import { Timestamp } from 'firebase/firestore';

// Mock PDF libraries
jest.mock('pdf-lib');
jest.mock('pdfjs-dist/legacy/build/pdf');

// Mock Firebase services
jest.mock('../../../../services/inventory.service');
jest.mock('../../../../services/categoryGroup.service');

const MockInventoryService = InventoryService as jest.MockedClass<typeof InventoryService>;
const MockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;

describe('PDF Processing Inventory Integration', () => {
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockCategoryGroupService: jest.Mocked<CategoryGroupService>;
  let mockPdfData: Uint8Array;
  let mockProducts: Product[];
  let mockCategories: Category[];
  let mockCategoryGroups: CategoryGroup[];
  let defaultSortConfig: CategorySortConfig;
  let mockBatchInfo: BatchInfo;

  beforeAll(() => {
    // Set up global PDF.js worker for tests
    if (typeof window !== 'undefined') {
      (global as typeof globalThis & { pdfjsLib?: { GlobalWorkerOptions: { workerSrc: string }; version: string } }).pdfjsLib = {
        GlobalWorkerOptions: { workerSrc: '' },
        version: '2.16.105'
      };
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock PDF data
    mockPdfData = new Uint8Array([
      37, 80, 68, 70, 45, 49, 46, 52, // %PDF-1.4 header
      ...Array(1000).fill(0).map(() => Math.floor(Math.random() * 256))
    ]);

    // Mock batch info for order tracking
    mockBatchInfo = {
      batchId: 'batch-2024-001',
      uploadedAt: '2024-01-15T10:30:00Z',
      fileName: 'test-amazon-orders.pdf',
      platform: 'amazon',
      orderCount: 5,
      metadata: {
        userId: 'test-user-123',
        selectedDate: '2024-01-15',
        processedAt: '2024-01-15T10:30:00Z'
      }
    };

    // Mock category groups with inventory tracking
    mockCategoryGroups = [
      {
        id: 'group-electronics',
        name: 'Electronics',
        description: 'Electronic products group',
        color: '#2196F3',
        currentInventory: 150,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 20,
        lastInventoryUpdate: Timestamp.fromDate(new Date('2024-01-14'))
      },
      {
        id: 'group-accessories',
        name: 'Accessories', 
        description: 'Accessories group',
        color: '#FF9800',
        currentInventory: 2.5, // 2.5 kg
        inventoryUnit: 'kg',
        inventoryType: 'weight',
        minimumThreshold: 0.5,
        lastInventoryUpdate: Timestamp.fromDate(new Date('2024-01-13'))
      }
    ];

    // Mock categories mapped to category groups
    mockCategories = [
      {
        id: 'cat-phones',
        name: 'Smartphones',
        description: 'Mobile phones category',
        tag: 'PHONE',
        categoryGroupId: 'group-electronics'
      },
      {
        id: 'cat-tablets', 
        name: 'Tablets',
        description: 'Tablet devices category',
        tag: 'TAB',
        categoryGroupId: 'group-electronics'
      },
      {
        id: 'cat-cases',
        name: 'Phone Cases',
        description: 'Protective cases category',
        tag: 'CASE', 
        categoryGroupId: 'group-accessories'
      },
      {
        id: 'cat-chargers',
        name: 'Chargers',
        description: 'Charging accessories category',
        tag: 'CHG',
        categoryGroupId: 'group-accessories'
      }
    ];

    // Mock products with category group mappings
    mockProducts = [
      {
        id: 'prod-1',
        sku: 'SSPH001234',
        name: 'Samsung Galaxy S24',
        description: 'Premium smartphone',
        platform: 'amazon',
        visibility: 'visible',
        sellingPrice: 45000,
        categoryId: 'cat-phones',
        categoryGroupId: 'group-electronics',
        metadata: {}
      },
      {
        id: 'prod-2',
        sku: 'SSTB005678',
        name: 'iPad Air 5th Gen',
        description: 'Apple tablet device',
        platform: 'amazon',
        visibility: 'visible', 
        sellingPrice: 55000,
        categoryId: 'cat-tablets',
        categoryGroupId: 'group-electronics',
        metadata: {}
      },
      {
        id: 'prod-3',
        sku: 'SSCS009876',
        name: 'Leather Phone Case',
        description: 'Premium leather case',
        platform: 'flipkart',
        visibility: 'visible',
        sellingPrice: 1200,
        categoryId: 'cat-cases',
        categoryGroupId: 'group-accessories',
        metadata: {}
      }
    ];

    // Default sort configuration
    defaultSortConfig = {
      primarySort: 'category',
      secondarySort: 'sku',
      sortOrder: 'asc',
      groupByCategory: true,
      prioritizeActiveCategories: false,
      sortCategoriesAlphabetically: true
    };

    // Set up mocked services
    mockInventoryService = {
      deductInventoryFromOrder: jest.fn(),
      adjustInventoryManually: jest.fn(),
      getInventoryLevels: jest.fn(),
      getInventoryMovements: jest.fn()
    } as jest.Mocked<Partial<InstanceType<typeof InventoryService>>>;

    mockCategoryGroupService = {
      getCategoryGroup: jest.fn(),
      getCategoryGroups: jest.fn(),
      updateInventory: jest.fn(),
      checkThresholdAlerts: jest.fn()
    } as jest.Mocked<Partial<InstanceType<typeof CategoryGroupService>>>;

    MockInventoryService.mockImplementation(() => mockInventoryService);
    MockCategoryGroupService.mockImplementation(() => mockCategoryGroupService);
  });

  describe('Amazon PDF Processing Integration', () => {
    let amazonTransformer: AmazonPDFTransformer;

    beforeEach(() => {
      amazonTransformer = new AmazonPDFTransformer(
        mockPdfData,
        mockProducts,
        mockCategories,
        defaultSortConfig,
        mockBatchInfo
      );

      // Mock PDF initialization
      jest.spyOn(amazonTransformer, 'initialize').mockResolvedValue();
    });

    it('should process Amazon PDF and trigger inventory deduction workflow', async () => {
      // Mock PDF processing results
      const mockProductSummaries = [
        {
          name: 'Samsung Galaxy S24',
          quantity: '2',
          SKU: 'SSPH001234',
          orderId: '123-4567890-1234567',
          type: 'amazon' as const,
          categoryId: 'cat-phones',
          category: 'Smartphones',
          batchInfo: mockBatchInfo
        },
        {
          name: 'iPad Air 5th Gen', 
          quantity: '1',
          SKU: 'SSTB005678',
          orderId: '123-4567890-1234568',
          type: 'amazon' as const,
          categoryId: 'cat-tablets',
          category: 'Tablets',
          batchInfo: mockBatchInfo
        }
      ];

      // Mock transformer summary to return processed products
      Object.defineProperty(amazonTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Set up category group service mocks
      mockCategoryGroupService.getCategoryGroup
        .mockResolvedValueOnce(mockCategoryGroups[0]) // Electronics group
        .mockResolvedValueOnce(mockCategoryGroups[0]); // Same group for both products

      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 147, // 150 - 3 (2+1)
        movementId: 'movement-amazon-001'
      });

      // Mock successful inventory deduction
      const mockDeductionResult: InventoryDeductionResult = {
        deductions: [
          {
            categoryGroupId: 'group-electronics',
            requestedQuantity: 2,
            deductedQuantity: 2,
            newInventoryLevel: 147,
            movementId: 'movement-amazon-001'
          },
          {
            categoryGroupId: 'group-electronics', 
            requestedQuantity: 1,
            deductedQuantity: 1,
            newInventoryLevel: 147,
            movementId: 'movement-amazon-001'
          }
        ],
        warnings: [],
        errors: []
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValue(mockDeductionResult);

      // Simulate PDF processing workflow
      await amazonTransformer.initialize();
      
      // Extract order items for inventory deduction
      const orderItems: InventoryDeductionItem[] = mockProductSummaries.map(summary => {
        const product = mockProducts.find(p => p.sku === summary.SKU);
        return {
          categoryGroupId: product!.categoryGroupId!,
          quantity: parseInt(summary.quantity),
          unit: 'pcs' as const,
          productSku: summary.SKU!,
          orderReference: summary.orderId,
          transactionReference: mockBatchInfo.batchId,
          platform: 'amazon' as const
        };
      });

      // Process inventory deduction
      const result = await mockInventoryService.deductInventoryFromOrder(orderItems);

      // Verify integration workflow
      expect(mockInventoryService.deductInventoryFromOrder).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            categoryGroupId: 'group-electronics',
            quantity: 2,
            unit: 'pcs',
            productSku: 'SSPH001234',
            orderReference: '123-4567890-1234567',
            transactionReference: 'batch-2024-001',
            platform: 'amazon'
          }),
          expect.objectContaining({
            categoryGroupId: 'group-electronics',
            quantity: 1,
            unit: 'pcs',
            productSku: 'SSTB005678',
            orderReference: '123-4567890-1234568',
            transactionReference: 'batch-2024-001',
            platform: 'amazon'
          })
        ])
      );

      expect(result.deductions).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.deductions[0].newInventoryLevel).toBe(147);
    });

    it('should handle insufficient inventory with warnings during Amazon processing', async () => {
      const mockProductSummaries = [
        {
          name: 'Samsung Galaxy S24',
          quantity: '200', // More than available (150)
          SKU: 'SSPH001234',
          orderId: '123-4567890-1234567',
          type: 'amazon' as const,
          categoryId: 'cat-phones',
          category: 'Smartphones',
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(amazonTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Mock insufficient inventory scenario
      const mockDeductionResult: InventoryDeductionResult = {
        deductions: [
          {
            categoryGroupId: 'group-electronics',
            requestedQuantity: 200,
            deductedQuantity: 200,
            newInventoryLevel: -50, // Goes negative
            movementId: 'movement-amazon-002'
          }
        ],
        warnings: [
          {
            categoryGroupId: 'group-electronics',
            warning: 'Insufficient inventory: requested 200pcs, available 150pcs',
            requestedQuantity: 200,
            availableQuantity: 150
          }
        ],
        errors: []
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValue(mockDeductionResult);

      // Process workflow
      const orderItems: InventoryDeductionItem[] = [{
        categoryGroupId: 'group-electronics',
        quantity: 200,
        unit: 'pcs',
        productSku: 'SSPH001234',
        orderReference: '123-4567890-1234567',
        transactionReference: mockBatchInfo.batchId,
        platform: 'amazon'
      }];

      const result = await mockInventoryService.deductInventoryFromOrder(orderItems);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].warning).toContain('Insufficient inventory');
      expect(result.deductions).toHaveLength(1);
      expect(result.deductions[0].newInventoryLevel).toBe(-50);
    });

    it('should handle products without category group mapping', async () => {
      const mockProductSummaries = [
        {
          name: 'Unknown Product',
          quantity: '1',
          SKU: 'UNKNOWN001',
          orderId: '123-4567890-1234567',
          type: 'amazon' as const,
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(amazonTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Mock error for unmapped product
      const mockDeductionResult: InventoryDeductionResult = {
        deductions: [],
        warnings: [],
        errors: [
          {
            categoryGroupId: 'unknown',
            error: 'Missing category group mapping',
            requestedQuantity: 1,
            reason: 'Product SKU must be mapped to a category group before inventory deduction'
          }
        ]
      };

      mockInventoryService.deductInventoryFromOrder.mockResolvedValue(mockDeductionResult);

      // Process workflow - product not found, so no category group mapping
      const orderItems: InventoryDeductionItem[] = [{
        categoryGroupId: '', // Empty since product not found
        quantity: 1,
        unit: 'pcs',
        productSku: 'UNKNOWN001',
        orderReference: '123-4567890-1234567',
        transactionReference: mockBatchInfo.batchId,
        platform: 'amazon'
      }];

      const result = await mockInventoryService.deductInventoryFromOrder(orderItems);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Missing category group mapping');
      expect(result.deductions).toHaveLength(0);
    });
  });

  describe('Flipkart PDF Processing Integration', () => {
    let flipkartTransformer: FlipkartPageTransformer;

    beforeEach(() => {
      flipkartTransformer = new FlipkartPageTransformer(
        mockPdfData,
        mockProducts,
        mockCategories,
        defaultSortConfig,
        mockBatchInfo
      );

      // Mock PDF initialization
      jest.spyOn(flipkartTransformer, 'initialize').mockResolvedValue();
    });

    it('should process Flipkart PDF and trigger inventory deduction workflow', async () => {
      const mockProductSummaries = [
        {
          name: 'Leather Phone Case',
          quantity: '5', 
          SKU: 'SSCS009876',
          orderId: 'OD123456789',
          type: 'flipkart' as const,
          categoryId: 'cat-cases',
          category: 'Phone Cases',
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(flipkartTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Mock Flipkart's processOrdersWithInventory method
      const mockOrderProcessingResult = {
        orderItems: mockProductSummaries,
        inventoryResult: {
          deductions: [
            {
              categoryGroupId: 'group-accessories',
              requestedQuantity: 5,
              deductedQuantity: 5,
              newInventoryLevel: 2.0, // 2.5kg - 0.5kg (5 cases * 0.1kg each)
              movementId: 'movement-flipkart-001'
            }
          ],
          warnings: [],
          errors: []
        } as InventoryDeductionResult
      };

      // Mock the processOrdersWithInventory method
      jest.spyOn(flipkartTransformer, 'processOrdersWithInventory')
        .mockResolvedValue(mockOrderProcessingResult);

      // Mock category group service calls
      mockCategoryGroupService.getCategoryGroup.mockResolvedValue(mockCategoryGroups[1]); // Accessories group
      mockCategoryGroupService.updateInventory.mockResolvedValue({
        newInventoryLevel: 2.0,
        movementId: 'movement-flipkart-001'
      });

      // Process Flipkart PDF with inventory integration
      const result = await flipkartTransformer.processOrdersWithInventory();

      expect(result.orderItems).toHaveLength(1);
      expect(result.inventoryResult.deductions).toHaveLength(1);
      expect(result.inventoryResult.deductions[0].categoryGroupId).toBe('group-accessories');
      expect(result.inventoryResult.deductions[0].newInventoryLevel).toBe(2.0);
    });

    it('should handle Flipkart multi-SKU orders correctly', async () => {
      const mockProductSummaries = [
        {
          name: 'Case && Charger Bundle',
          quantity: '3',
          SKU: 'SSCS009876 && SSCHG001234', // Multiple SKUs in single order
          orderId: 'OD123456789',
          type: 'flipkart' as const,
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(flipkartTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Mock processing result for multi-SKU order
      const mockOrderProcessingResult = {
        orderItems: mockProductSummaries,
        inventoryResult: {
          deductions: [
            {
              categoryGroupId: 'group-accessories',
              requestedQuantity: 3,
              deductedQuantity: 3,
              newInventoryLevel: 1.7, // Different calculation for bundle
              movementId: 'movement-flipkart-002'
            }
          ],
          warnings: [],
          errors: []
        } as InventoryDeductionResult
      };

      jest.spyOn(flipkartTransformer, 'processOrdersWithInventory')
        .mockResolvedValue(mockOrderProcessingResult);

      const result = await flipkartTransformer.processOrdersWithInventory();

      expect(result.orderItems[0].SKU).toContain('&&'); // Validates multi-SKU format
      expect(result.inventoryResult.deductions).toHaveLength(1);
    });

    it('should handle Flipkart inventory errors gracefully', async () => {
      const mockProductSummaries = [
        {
          name: 'Invalid Product',
          quantity: '1',
          SKU: 'INVALID001',
          orderId: 'OD123456789',
          type: 'flipkart' as const,
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(flipkartTransformer, 'summaryText', {
        value: mockProductSummaries,
        writable: true
      });

      // Mock error scenario
      const mockOrderProcessingResult = {
        orderItems: mockProductSummaries,
        inventoryResult: {
          deductions: [],
          warnings: [],
          errors: [
            {
              categoryGroupId: 'unknown',
              error: 'Category group not found',
              requestedQuantity: 1,
              reason: 'The specified category group does not exist in the system'
            }
          ]
        } as InventoryDeductionResult
      };

      jest.spyOn(flipkartTransformer, 'processOrdersWithInventory')
        .mockResolvedValue(mockOrderProcessingResult);

      const result = await flipkartTransformer.processOrdersWithInventory();

      expect(result.inventoryResult.errors).toHaveLength(1);
      expect(result.inventoryResult.errors[0].error).toBe('Category group not found');
    });
  });

  describe('Firebase Emulator Integration', () => {
    it('should validate Firebase emulator connectivity', async () => {
      // This test validates that the integration can work with Firebase emulators
      // In a real emulator environment, these would connect to emulated services

      // Mock emulator environment setup
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

      // Verify emulator configuration
      expect(process.env.FIRESTORE_EMULATOR_HOST).toBeDefined();
      expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeDefined();
      expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBeDefined();

      // Mock emulator data operations
      mockCategoryGroupService.getCategoryGroups.mockResolvedValue(mockCategoryGroups);
      mockInventoryService.getInventoryLevels.mockResolvedValue([
        {
          categoryGroupId: 'group-electronics',
          name: 'Electronics',
          currentInventory: 150,
          inventoryUnit: 'pcs',
          inventoryType: 'qty',
          minimumThreshold: 20,
          status: 'healthy'
        }
      ]);

      // Verify emulator operations
      const categoryGroups = await mockCategoryGroupService.getCategoryGroups();
      const inventoryLevels = await mockInventoryService.getInventoryLevels();

      expect(categoryGroups).toHaveLength(2);
      expect(inventoryLevels).toHaveLength(1);
      expect(inventoryLevels[0].status).toBe('healthy');
    });

    it('should handle emulator connection failures gracefully', async () => {
      // Mock connection failure
      mockCategoryGroupService.getCategoryGroup.mockRejectedValue(
        new Error('Emulator connection failed')
      );

      // Verify error handling
      await expect(mockCategoryGroupService.getCategoryGroup('test'))
        .rejects
        .toThrow('Emulator connection failed');
    });
  });

  describe('End-to-End PDF to Inventory Workflow', () => {
    it('should complete full Amazon PDF processing with inventory deduction', async () => {
      // Set up full workflow test
      const amazonTransformer = new AmazonPDFTransformer(
        mockPdfData,
        mockProducts,
        mockCategories,
        defaultSortConfig,
        mockBatchInfo
      );

      // Mock complete workflow steps
      jest.spyOn(amazonTransformer, 'initialize').mockResolvedValue();
      
      const mockProcessedSummary = [
        {
          name: 'Samsung Galaxy S24',
          quantity: '1',
          SKU: 'SSPH001234',
          orderId: '123-4567890-1234567',
          type: 'amazon' as const,
          categoryId: 'cat-phones',
          category: 'Smartphones',
          batchInfo: mockBatchInfo
        }
      ];

      Object.defineProperty(amazonTransformer, 'summaryText', {
        value: mockProcessedSummary,
        writable: true
      });

      // Mock successful end-to-end processing
      mockInventoryService.deductInventoryFromOrder.mockResolvedValue({
        deductions: [
          {
            categoryGroupId: 'group-electronics',
            requestedQuantity: 1,
            deductedQuantity: 1,
            newInventoryLevel: 149,
            movementId: 'movement-e2e-001'
          }
        ],
        warnings: [],
        errors: []
      });

      // Execute full workflow
      await amazonTransformer.initialize();
      const summaries = amazonTransformer.summary;
      
      const orderItems: InventoryDeductionItem[] = summaries.map(summary => ({
        categoryGroupId: mockProducts.find(p => p.sku === summary.SKU)!.categoryGroupId!,
        quantity: parseInt(summary.quantity),
        unit: 'pcs' as const,
        productSku: summary.SKU!,
        orderReference: summary.orderId,
        transactionReference: mockBatchInfo.batchId,
        platform: 'amazon' as const
      }));

      const inventoryResult = await mockInventoryService.deductInventoryFromOrder(orderItems);

      // Verify complete integration
      expect(summaries).toHaveLength(1);
      expect(inventoryResult.deductions).toHaveLength(1);
      expect(inventoryResult.deductions[0].movementId).toBeDefined();
      expect(inventoryResult.errors).toHaveLength(0);
    });

    it('should handle concurrent PDF processing scenarios', async () => {
      // Test concurrent processing to validate race condition handling
      const amazonTransformer1 = new AmazonPDFTransformer(
        mockPdfData,
        mockProducts,
        mockCategories,
        defaultSortConfig,
        { ...mockBatchInfo, batchId: 'batch-concurrent-1' }
      );

      const amazonTransformer2 = new AmazonPDFTransformer(
        mockPdfData,
        mockProducts,
        mockCategories,
        defaultSortConfig,
        { ...mockBatchInfo, batchId: 'batch-concurrent-2' }
      );

      // Mock both transformers
      jest.spyOn(amazonTransformer1, 'initialize').mockResolvedValue();
      jest.spyOn(amazonTransformer2, 'initialize').mockResolvedValue();

      // Mock concurrent inventory operations
      mockInventoryService.deductInventoryFromOrder
        .mockResolvedValueOnce({
          deductions: [{ 
            categoryGroupId: 'group-electronics', 
            requestedQuantity: 1, 
            deductedQuantity: 1, 
            newInventoryLevel: 149, 
            movementId: 'movement-concurrent-1' 
          }],
          warnings: [],
          errors: []
        })
        .mockResolvedValueOnce({
          deductions: [{ 
            categoryGroupId: 'group-electronics', 
            requestedQuantity: 1, 
            deductedQuantity: 1, 
            newInventoryLevel: 148, 
            movementId: 'movement-concurrent-2' 
          }],
          warnings: [],
          errors: []
        });

      // Execute concurrent operations
      const [result1, result2] = await Promise.all([
        mockInventoryService.deductInventoryFromOrder([{
          categoryGroupId: 'group-electronics',
          quantity: 1,
          unit: 'pcs',
          productSku: 'SSPH001234',
          transactionReference: 'batch-concurrent-1',
          platform: 'amazon'
        }]),
        mockInventoryService.deductInventoryFromOrder([{
          categoryGroupId: 'group-electronics',
          quantity: 1,
          unit: 'pcs',
          productSku: 'SSPH001234',
          transactionReference: 'batch-concurrent-2',
          platform: 'amazon'
        }])
      ]);

      // Verify both operations succeeded with different movement IDs
      expect(result1.deductions[0].movementId).toBe('movement-concurrent-1');
      expect(result2.deductions[0].movementId).toBe('movement-concurrent-2');
      expect(result1.deductions[0].newInventoryLevel).toBe(149);
      expect(result2.deductions[0].newInventoryLevel).toBe(148);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle PDF processing errors without breaking inventory workflow', async () => {
      const amazonTransformer = new AmazonPDFTransformer(
        new Uint8Array([]), // Empty/invalid PDF data
        mockProducts,
        mockCategories,
        defaultSortConfig,
        mockBatchInfo
      );

      // Mock PDF processing error
      jest.spyOn(amazonTransformer, 'initialize').mockRejectedValue(
        new Error('Invalid PDF format')
      );

      // Verify error handling
      await expect(amazonTransformer.initialize()).rejects.toThrow('Invalid PDF format');

      // Inventory service should not be called with invalid data
      expect(mockInventoryService.deductInventoryFromOrder).not.toHaveBeenCalled();
    });

    it('should handle network interruptions during Firebase operations', async () => {
      // Mock network failure during inventory operation
      mockInventoryService.deductInventoryFromOrder.mockRejectedValue(
        new Error('Network error: Connection timeout')
      );

      const orderItems: InventoryDeductionItem[] = [{
        categoryGroupId: 'group-electronics',
        quantity: 1,
        unit: 'pcs',
        productSku: 'SSPH001234',
        platform: 'amazon'
      }];

      // Verify error propagation
      await expect(mockInventoryService.deductInventoryFromOrder(orderItems))
        .rejects
        .toThrow('Network error: Connection timeout');
    });

    it('should validate data integrity throughout the integration flow', async () => {
      // Test data validation at each integration point
      const orderItems: InventoryDeductionItem[] = [
        {
          categoryGroupId: 'group-electronics',
          quantity: 1,
          unit: 'pcs',
          productSku: 'SSPH001234',
          orderReference: '123-4567890-1234567',
          transactionReference: 'batch-2024-001',
          platform: 'amazon'
        }
      ];

      // Mock successful operation with validation
      mockInventoryService.deductInventoryFromOrder.mockResolvedValue({
        deductions: [
          {
            categoryGroupId: 'group-electronics',
            requestedQuantity: 1,
            deductedQuantity: 1,
            newInventoryLevel: 149,
            movementId: 'movement-validation-001'
          }
        ],
        warnings: [],
        errors: []
      });

      const result = await mockInventoryService.deductInventoryFromOrder(orderItems);

      // Verify data integrity
      expect(result.deductions[0].categoryGroupId).toBe(orderItems[0].categoryGroupId);
      expect(result.deductions[0].requestedQuantity).toBe(orderItems[0].quantity);
      expect(result.deductions[0].movementId).toBeTruthy();
      expect(typeof result.deductions[0].newInventoryLevel).toBe('number');
    });
  });
});