import { TodaysOrder, ActiveOrderSchema } from '../todaysOrder.service';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { format } from 'date-fns';

// Mock the dependencies
jest.mock('../firebase.service');
jest.mock('../product.service');
jest.mock('../category.service');

describe('TodaysOrder Service', () => {
  let todaysOrderService: TodaysOrder;
  let mockGetDocument: jest.SpyInstance;
  let mockUpdateDocument: jest.SpyInstance;
  let mockBatchOperation: jest.SpyInstance;

  const mockProductSummary: ProductSummary = {
    name: 'Test Product',
    quantity: '2',
    SKU: 'TEST-SKU-001',
    type: 'amazon',
  };

  const mockActiveOrderSchema: ActiveOrderSchema = {
    id: '2024-01-15',
    date: '2024-01-15',
    orders: [mockProductSummary],
  };

  beforeEach(() => {
    todaysOrderService = new TodaysOrder();
    
    // Mock the inherited methods from FirebaseService
     
    mockGetDocument = jest.spyOn(todaysOrderService as any, 'getDocument').mockResolvedValue(null);
     
    mockUpdateDocument = jest.spyOn(todaysOrderService as any, 'updateDocument').mockResolvedValue(undefined);
     
    mockBatchOperation = jest.spyOn(todaysOrderService as any, 'batchOperation').mockResolvedValue(undefined);
    
    // Mock the product mapping methods
     
    jest.spyOn(todaysOrderService as any, 'mapProductsToActiveOrder').mockResolvedValue(undefined);
     
    jest.spyOn(todaysOrderService as any, 'mapProductToOrder').mockImplementation(() => {});
     
    jest.spyOn(todaysOrderService as any, 'cleanOrders').mockImplementation((orders) => orders);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrdersForDate', () => {
    it('should retrieve orders for a specific date', async () => {
      const testDate = '2024-01-15';
      mockGetDocument.mockResolvedValue(mockActiveOrderSchema);

      const result = await todaysOrderService.getOrdersForDate(testDate);

      expect(mockGetDocument).toHaveBeenCalledWith('active-orders', testDate);
      expect(result).toEqual(mockActiveOrderSchema);
    });

    it('should return undefined when no orders exist for the date', async () => {
      const testDate = '2024-01-15';
      mockGetDocument.mockResolvedValue(null);

      const result = await todaysOrderService.getOrdersForDate(testDate);

      expect(mockGetDocument).toHaveBeenCalledWith('active-orders', testDate);
      expect(result).toBeNull();
    });

    it('should map products to orders when orders exist', async () => {
      const testDate = '2024-01-15';
       
      const mapProductSpy = jest.spyOn(todaysOrderService as any, 'mapProductToOrder');
      mockGetDocument.mockResolvedValue(mockActiveOrderSchema);

      await todaysOrderService.getOrdersForDate(testDate);

      expect(mapProductSpy).toHaveBeenCalledTimes(mockActiveOrderSchema.orders.length);
    });
  });

  describe('updateOrdersForDate', () => {
    it('should create new order document when none exists for the date', async () => {
      const testDate = '2024-01-15';
      const newOrder = {
        id: testDate,
        date: testDate,
        orders: [mockProductSummary],
      };

      mockGetDocument.mockResolvedValue(null); // No existing order
      
      await todaysOrderService.updateOrdersForDate(newOrder, testDate);

      expect(mockBatchOperation).toHaveBeenCalledWith(
        [newOrder],
        'active-orders',
        'create',
        expect.any(Function)
      );
    });

    it('should merge with existing orders when document exists for the date', async () => {
      const testDate = '2024-01-15';
      const existingOrder = {
        id: testDate,
        date: testDate,
        orders: [{ ...mockProductSummary, SKU: 'EXISTING-SKU' }],
      };
      
      const newOrder = {
        id: testDate,
        date: testDate,
        orders: [mockProductSummary],
      };

      mockGetDocument.mockResolvedValue(existingOrder);
      
      await todaysOrderService.updateOrdersForDate(newOrder, testDate);

      expect(mockUpdateDocument).toHaveBeenCalledWith(
        'active-orders',
        testDate,
        expect.objectContaining({
          id: testDate,
          date: testDate,
          orders: expect.any(Array)
        })
      );
    });


    it('should return updated orders for the date', async () => {
      const testDate = '2024-01-15';
      const updatedOrder = { ...mockActiveOrderSchema };
      
      mockGetDocument
        .mockResolvedValueOnce(null) // First call for checking existing
        .mockResolvedValueOnce(updatedOrder); // Second call for returning result
      
      const newOrder = {
        id: testDate,
        date: testDate,
        orders: [mockProductSummary],
      };

      const result = await todaysOrderService.updateOrdersForDate(newOrder, testDate);

      expect(result).toEqual(updatedOrder);
    });
  });

  describe('getTodaysOrders compatibility', () => {
    it('should still work with current date format', async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      mockGetDocument.mockResolvedValue(mockActiveOrderSchema);

      await todaysOrderService.getTodaysOrders();

      expect(mockGetDocument).toHaveBeenCalledWith('active-orders', today);
    });
  });

  describe('date format validation', () => {
    it('should handle various date formats correctly', async () => {
      const validDates = ['2024-01-15', '2024-12-31', '2023-02-28'];
      
      for (const date of validDates) {
        mockGetDocument.mockResolvedValue(null);
        
        await todaysOrderService.getOrdersForDate(date);
        
        expect(mockGetDocument).toHaveBeenCalledWith('active-orders', date);
      }
    });
  });
}); 