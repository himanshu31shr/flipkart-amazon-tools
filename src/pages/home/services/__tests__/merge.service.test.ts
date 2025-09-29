import { PDFMergerService } from '../merge.service';
import { TodaysOrder } from '../../../../services/todaysOrder.service';
import { Product } from '../../../../services/product.service';
import { Category } from '../../../../services/category.service';
import { batchService } from '../../../../services/batch.service';
import { format } from 'date-fns';

// Mock dependencies
jest.mock('../../../../services/todaysOrder.service');
jest.mock('../../../../services/batch.service');
jest.mock('../TrasformAmazonPages');
jest.mock('../TrasformFlipkartPages');
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com'
    }
  }))
}));
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn().mockResolvedValue({
      copyPages: jest.fn().mockResolvedValue([{ addPage: jest.fn() }]),
      addPage: jest.fn(),
    }),
  },
}));

describe('PDFMergerService', () => {
  let mergerService: PDFMergerService;
  let mockTodaysOrder: jest.Mocked<TodaysOrder>;
  let mockProducts: Product[];
  let mockCategories: Category[];
  let mockBatchService: jest.Mocked<typeof batchService>;

  beforeEach(() => {
    // Setup mock data
    mockProducts = [
      {
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test Description',
        platform: 'amazon',
        visibility: 'visible',
        sellingPrice: 150,
        metadata: {},
      },
    ];

    mockCategories = [
      {
        id: 'cat-1',
        name: 'Test Category',
        description: 'Test Category Description',
      },
    ];

    // Create service instance
    mergerService = new PDFMergerService(mockProducts, mockCategories);

    // Mock TodaysOrder methods
    mockTodaysOrder = {
      updateTodaysOrder: jest.fn().mockResolvedValue(undefined),
      updateOrdersForDate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TodaysOrder>;

    // Mock the TodaysOrder constructor
    (TodaysOrder as unknown as jest.Mock).mockImplementation(() => mockTodaysOrder);

    // Mock batchService for all tests to avoid console errors
    mockBatchService = batchService as jest.Mocked<typeof batchService>;
    mockBatchService.createBatch.mockResolvedValue({
      success: true,
      batchId: 'test-batch-123',
      firestoreDocId: 'firestore-doc-id'
    });
    mockBatchService.updateBatchOrderCount.mockResolvedValue({
      success: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mergePdfs', () => {
    const mockAmazonFiles = [new Uint8Array([1, 2, 3])];
    const mockFlipkartFiles = [new Uint8Array([4, 5, 6])];

    beforeEach(() => {
      // Mock the initialize method
       
      jest.spyOn(mergerService as any, 'initialize').mockResolvedValue(undefined);
      // Mock PDF document
       
      (mergerService as any).outpdf = {
        copyPages: jest.fn().mockResolvedValue([{}]),
        addPage: jest.fn(),
      };
      // Mock process methods
       
      jest.spyOn(mergerService as any, 'processAmazonFile').mockResolvedValue(undefined);
       
      jest.spyOn(mergerService as any, 'processFlipkartFile').mockResolvedValue(undefined);
      // Mock summary
       
      (mergerService as any).summaryText = [
        { name: 'Test Product', quantity: '1', SKU: 'TEST-001', type: 'amazon' },
      ];
    });

    it('should use current date when no selectedDate is provided', async () => {
      const today = new Date();
      const expectedDateString = format(today, 'yyyy-MM-dd');

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
      });

      expect(mockTodaysOrder.updateTodaysOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.any(Array),
          date: expectedDateString,
          id: expectedDateString,
          batchId: 'test-batch-123', // Now includes batch ID
        })
      );
      expect(mockTodaysOrder.updateOrdersForDate).not.toHaveBeenCalled();
    });

    it('should use selectedDate when provided', async () => {
      const selectedDate = new Date('2024-01-15');
      const expectedDateString = '2024-01-15';

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate,
      });

      expect(mockTodaysOrder.updateOrdersForDate).toHaveBeenCalledWith(
        {
          orders: expect.any(Array),
          date: expectedDateString,
          id: expectedDateString,
          batchId: 'test-batch-123', // Now includes batch ID
        },
        expectedDateString
      );
      expect(mockTodaysOrder.updateTodaysOrder).not.toHaveBeenCalled();
    });

    it('should format selectedDate correctly', async () => {
      const selectedDate = new Date('2024-12-25T10:30:00Z');
      const expectedDateString = '2024-12-25';

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate,
      });

      expect(mockTodaysOrder.updateOrdersForDate).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expectedDateString,
          id: expectedDateString,
          batchId: 'test-batch-123', // Now includes batch ID
        }),
        expectedDateString
      );
    });

    it('should process files before updating orders', async () => {
       
      const processAmazonSpy = jest.spyOn(mergerService as any, 'processAmazonFile');
       
      const processFlipkartSpy = jest.spyOn(mergerService as any, 'processFlipkartFile');

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate: new Date('2024-01-15'),
      });

      expect(processAmazonSpy).toHaveBeenCalledWith(mockAmazonFiles[0], undefined, expect.any(Object), "2024-01-15", true);
      expect(processFlipkartSpy).toHaveBeenCalledWith(mockFlipkartFiles[0], undefined, expect.any(Object), "2024-01-15", true);
      expect(mockTodaysOrder.updateOrdersForDate).toHaveBeenCalled();
    });

    it('should pass sortConfig to file processors', async () => {
      const sortConfig = { 
        primarySort: 'category' as const, 
        groupByCategory: true,
        sortOrder: 'asc' as const,
        prioritizeActiveCategories: true,
        sortCategoriesAlphabetically: false,
      };
       
      const processAmazonSpy = jest.spyOn(mergerService as any, 'processAmazonFile');

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: [],
        sortConfig,
        selectedDate: new Date('2024-01-15'),
      });

      expect(processAmazonSpy).toHaveBeenCalledWith(mockAmazonFiles[0], sortConfig, expect.any(Object), "2024-01-15", true);
    });

    it('should return undefined when PDF document is not initialized', async () => {
       
      (mergerService as any).outpdf = null;

      const result = await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
      });

      expect(result).toBeUndefined();
      expect(mockTodaysOrder.updateTodaysOrder).not.toHaveBeenCalled();
      expect(mockTodaysOrder.updateOrdersForDate).not.toHaveBeenCalled();
    });

    it('should handle empty file arrays', async () => {
      await mergerService.mergePdfs({
        amzon: [],
        flp: [],
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockTodaysOrder.updateOrdersForDate).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: expect.any(Array),
          // No batchId property when no files are processed (undefined values are filtered out)
        }),
        '2024-01-15'
      );
      
      // Verify batchId is not included when undefined
      const callArgs = mockTodaysOrder.updateOrdersForDate.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('batchId');
    });

    it('should maintain backward compatibility with existing API and create batches', async () => {
      // Test that the old API (without selectedDate) still works but now creates batches
      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        sortConfig: { 
          primarySort: 'name', 
          groupByCategory: false,
          sortOrder: 'asc',
          prioritizeActiveCategories: false,
          sortCategoriesAlphabetically: true,
        },
      });

      expect(mockTodaysOrder.updateTodaysOrder).toHaveBeenCalled();
      expect(mockTodaysOrder.updateOrdersForDate).not.toHaveBeenCalled();
      
      // Should now create a batch even without selectedDate
      expect(mockBatchService.createBatch).toHaveBeenCalled();
      expect(mockBatchService.updateBatchOrderCount).toHaveBeenCalled();
      
      // Should include batchId in the order data
      const callArgs = mockTodaysOrder.updateTodaysOrder.mock.calls[0][0];
      expect(callArgs).toHaveProperty('batchId', 'test-batch-123');
    });
  });

  describe('summary getter', () => {
    it('should return the summary text', () => {
      const mockSummary = [
        { name: 'Product 1', quantity: '2', SKU: 'SKU-001', type: 'amazon' },
      ];
       
      (mergerService as any).summaryText = mockSummary;

      expect(mergerService.summary).toEqual(mockSummary);
    });
  });

  describe('batch functionality', () => {
    const mockAmazonFiles = [new Uint8Array([1, 2, 3])];
    const mockFlipkartFiles = [new Uint8Array([4, 5, 6])];
    const mockBatchService = batchService as jest.Mocked<typeof batchService>;

    beforeEach(() => {
      // Reset mocks and set up default behavior
      jest.clearAllMocks();
      mockBatchService.createBatch.mockResolvedValue({
        success: true,
        batchId: 'test-batch-123',
        firestoreDocId: 'firestore-doc-id'
      });

      // Mock initialize and setup
       
      jest.spyOn(mergerService as any, 'initialize').mockResolvedValue(undefined);
       
      (mergerService as any).outpdf = {
        copyPages: jest.fn().mockResolvedValue([{}]),
        addPage: jest.fn(),
      };
       
      jest.spyOn(mergerService as any, 'processAmazonFile').mockResolvedValue(undefined);
       
      jest.spyOn(mergerService as any, 'processFlipkartFile').mockResolvedValue(undefined);
      // Mock summary
       
      (mergerService as any).summaryText = [
        { name: 'Test Product', quantity: '1', SKU: 'TEST-001', type: 'amazon' },
      ];
    });

    it('should create a batch when processing Amazon files', async () => {
      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: [],
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'amazon',
          orderCount: 0, // Batch is pre-created with 0, then updated
          metadata: expect.objectContaining({
            selectedDate: '2024-01-15'
          })
        })
      );
    });

    it('should create a batch when processing Flipkart files', async () => {
      // Mock flipkart-specific summary
       
      (mergerService as any).summaryText = [
        { name: 'Test Flipkart Product', quantity: '1', SKU: 'FLP-001', type: 'flipkart' },
      ];

      await mergerService.mergePdfs({
        amzon: [],
        flp: mockFlipkartFiles,
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'flipkart',
          orderCount: 0 // Batch is pre-created with 0, then updated
        })
      );
    });

    it('should create a mixed platform batch when processing both Amazon and Flipkart files', async () => {
      // Mock different summaries for mixed files
       
      (mergerService as any).summaryText = [
        { name: 'Amazon Product', quantity: '1', SKU: 'AMZ-001', type: 'amazon' },
        { name: 'Flipkart Product', quantity: '1', SKU: 'FLP-001', type: 'flipkart' },
      ];

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'mixed',
          orderCount: 0 // Batch is pre-created with 0, then updated
        })
      );
    });

    it('should handle batch creation failure gracefully', async () => {
      mockBatchService.createBatch.mockResolvedValue({
        success: false,
        error: 'Batch creation failed'
      });

      const result = await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: [],
        selectedDate: new Date('2024-01-15'),
      });

      // Should still return the PDF document even if batch creation fails
      expect(result).toBeDefined();
      expect(mockTodaysOrder.updateOrdersForDate).toHaveBeenCalled();
    });

    it('should not create batch when no files are processed', async () => {
       
      (mergerService as any).summaryText = []; // Empty summary

      await mergerService.mergePdfs({
        amzon: [],
        flp: [],
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockBatchService.createBatch).not.toHaveBeenCalled();
    });

    it('should include file names in batch creation', async () => {
      const fileNames = ['amazon-orders.pdf', 'flipkart-orders.pdf'];
      
      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate: new Date('2024-01-15'),
        fileNames
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'amazon-orders.pdf, flipkart-orders.pdf'
        })
      );
    });

    it('should use default filename when no file names provided', async () => {
      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: [],
        selectedDate: new Date('2024-01-15'),
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: expect.stringMatching(/^Batch_\d{4}-\d{2}-\d{2}_\d+\.pdf$/)
        })
      );
    });

    it('should create batch for today\'s uploads when no selectedDate provided', async () => {
      // Mock current date for consistent testing
      const mockDate = new Date('2024-01-15T10:00:00Z');
      const originalDate = global.Date;
      global.Date = jest.fn(() => mockDate) as unknown as DateConstructor;
      global.Date.now = originalDate.now;
      global.Date.parse = originalDate.parse;
      global.Date.UTC = originalDate.UTC;
      
      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        fileNames: ['test-amazon.pdf', 'test-flipkart.pdf']
      });

      expect(mockBatchService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'mixed',
          fileName: 'test-amazon.pdf, test-flipkart.pdf',
          orderCount: 0,
          metadata: expect.objectContaining({
            selectedDate: '2024-01-15' // Should use today's date
          })
        })
      );
      
      expect(mockBatchService.updateBatchOrderCount).toHaveBeenCalledWith('test-batch-123', 1);
      expect(mockTodaysOrder.updateTodaysOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'test-batch-123'
        })
      );
      
      // Restore original Date
      global.Date = originalDate;
    });
  });
}); 