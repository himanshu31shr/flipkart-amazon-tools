import { PDFMergerService } from '../merge.service';
import { TodaysOrder } from '../../../../services/todaysOrder.service';
import { Product } from '../../../../services/product.service';
import { Category } from '../../../../services/category.service';
import { format } from 'date-fns';

// Mock dependencies
jest.mock('../../../../services/todaysOrder.service');
jest.mock('../TrasformAmazonPages');
jest.mock('../TrasformFlipkartPages');
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

  beforeEach(() => {
    // Setup mock data
    mockProducts = [
      {
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test Description',
        customCostPrice: 100,
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mergePdfs', () => {
    const mockAmazonFiles = [new Uint8Array([1, 2, 3])];
    const mockFlipkartFiles = [new Uint8Array([4, 5, 6])];

    beforeEach(() => {
      // Mock the initialize method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(mergerService as any, 'initialize').mockResolvedValue(undefined);
      // Mock PDF document
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mergerService as any).outpdf = {
        copyPages: jest.fn().mockResolvedValue([{}]),
        addPage: jest.fn(),
      };
      // Mock process methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(mergerService as any, 'processAmazonFile').mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(mergerService as any, 'processFlipkartFile').mockResolvedValue(undefined);
      // Mock summary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      expect(mockTodaysOrder.updateTodaysOrder).toHaveBeenCalledWith({
        orders: expect.any(Array),
        date: expectedDateString,
        id: expectedDateString,
      });
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
        }),
        expectedDateString
      );
    });

    it('should process files before updating orders', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processAmazonSpy = jest.spyOn(mergerService as any, 'processAmazonFile');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processFlipkartSpy = jest.spyOn(mergerService as any, 'processFlipkartFile');

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: mockFlipkartFiles,
        selectedDate: new Date('2024-01-15'),
      });

      expect(processAmazonSpy).toHaveBeenCalledWith(mockAmazonFiles[0], undefined);
      expect(processFlipkartSpy).toHaveBeenCalledWith(mockFlipkartFiles[0], undefined);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processAmazonSpy = jest.spyOn(mergerService as any, 'processAmazonFile');

      await mergerService.mergePdfs({
        amzon: mockAmazonFiles,
        flp: [],
        sortConfig,
        selectedDate: new Date('2024-01-15'),
      });

      expect(processAmazonSpy).toHaveBeenCalledWith(mockAmazonFiles[0], sortConfig);
    });

    it('should return undefined when PDF document is not initialized', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        }),
        '2024-01-15'
      );
    });

    it('should maintain backward compatibility with existing API', async () => {
      // Test that the old API (without selectedDate) still works
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
    });
  });

  describe('summary getter', () => {
    it('should return the summary text', () => {
      const mockSummary = [
        { name: 'Product 1', quantity: '2', SKU: 'SKU-001', type: 'amazon' },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mergerService as any).summaryText = mockSummary;

      expect(mergerService.summary).toEqual(mockSummary);
    });
  });
}); 