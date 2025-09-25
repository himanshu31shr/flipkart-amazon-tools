import { 
  writeBatch, 
  doc, 
  getFirestore,
  WriteBatch 
} from 'firebase/firestore';
import BatchProcessor, { 
  batchProcessor, 
  BatchOperation, 
  BatchProcessorOptions,
  BatchProgress,
  BatchProcessorResult 
} from '../batchProcessor';
import { InventoryDeductionResult, InventoryMovement } from '../../types/inventory';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  writeBatch: jest.fn(),
  doc: jest.fn(),
  collection: jest.fn()
}));

const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;

describe('BatchProcessor', () => {
  let mockBatch: jest.Mocked<WriteBatch>;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockDb = { mockDb: true };
    mockGetFirestore.mockReturnValue(mockDb);
    mockWriteBatch.mockReturnValue(mockBatch);
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' } as any);
  });

  describe('processBatchOperations', () => {
    it('should process single batch successfully', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'update',
          collection: 'inventory',
          docId: 'product-1',
          data: { currentLevel: 10 }
        },
        {
          type: 'create',
          collection: 'movements',
          docId: 'movement-1',
          data: { quantity: 5 }
        }
      ];

      const result = await batchProcessor.processBatchOperations(operations);

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(2);
      expect(result.completedOperations).toBe(2);
      expect(result.failedOperations).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple batches', async () => {
      const operations: BatchOperation[] = Array.from({ length: 1000 }, (_, i) => ({
        type: 'update',
        collection: 'inventory',
        docId: `product-${i}`,
        data: { currentLevel: i }
      }));

      const result = await batchProcessor.processBatchOperations(operations, {
        batchSize: 450
      });

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(1000);
      expect(result.completedOperations).toBe(1000);
      expect(mockBatch.commit).toHaveBeenCalledTimes(3); // ceil(1000/450) = 3
    });

    it('should call progress callback', async () => {
      const operations: BatchOperation[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'update',
        collection: 'inventory',
        docId: `product-${i}`,
        data: { currentLevel: i }
      }));

      const onProgress = jest.fn();
      const onBatchComplete = jest.fn();

      await batchProcessor.processBatchOperations(operations, {
        batchSize: 50,
        onProgress,
        onBatchComplete
      });

      expect(onProgress).toHaveBeenCalled();
      expect(onBatchComplete).toHaveBeenCalledTimes(2);
      expect(onBatchComplete).toHaveBeenCalledWith(1, 2);
      expect(onBatchComplete).toHaveBeenCalledWith(2, 2);
    });

    it('should retry failed batches', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'update',
          collection: 'inventory',
          docId: 'product-1',
          data: { currentLevel: 10 }
        }
      ];

      // Mock failure then success
      mockBatch.commit
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const result = await batchProcessor.processBatchOperations(operations, {
        maxRetries: 2,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(result.completedOperations).toBe(1);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });

    it('should handle max retries exceeded', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'update',
          collection: 'inventory',
          docId: 'product-1',
          data: { currentLevel: 10 }
        }
      ];

      mockBatch.commit.mockRejectedValue(new Error('Persistent error'));

      const result = await batchProcessor.processBatchOperations(operations, {
        maxRetries: 2,
        retryDelay: 100
      });

      expect(result.success).toBe(false);
      expect(result.completedOperations).toBe(0);
      expect(result.failedOperations).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Persistent error');
      expect(mockBatch.commit).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle delete operations', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'delete',
          collection: 'inventory',
          docId: 'product-1',
          data: {}
        }
      ];

      await batchProcessor.processBatchOperations(operations);

      expect(mockBatch.delete).toHaveBeenCalledTimes(1);
      expect(mockBatch.set).not.toHaveBeenCalled();
    });

    it('should handle unsupported operation types', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'unsupported' as any,
          collection: 'inventory',
          docId: 'product-1',
          data: {}
        }
      ];

      const result = await batchProcessor.processBatchOperations(operations, {
        maxRetries: 1,
        retryDelay: 100
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Unsupported operation type');
    }, 10000);
  });

  describe('processInventoryDeductions', () => {
    it('should process inventory deductions successfully', async () => {
      const deductionResults: InventoryDeductionResult[] = [
        {
          deductions: [
            {
              categoryGroupId: 'category-group-1',
              requestedQuantity: 5,
              deductedQuantity: 5,
              newInventoryLevel: 5,
              movementId: 'movement-1'
            },
            {
              categoryGroupId: 'category-group-2',
              requestedQuantity: 3,
              deductedQuantity: 3,
              newInventoryLevel: 17,
              movementId: 'movement-2'
            }
          ],
          warnings: [],
          errors: []
        }
      ];

      const movements: InventoryMovement[] = [
        {
          categoryGroupId: 'category-group-1',
          movementType: 'deduction',
          quantity: -5,
          unit: 'pcs',
          previousInventory: 10,
          newInventory: 5,
          reason: 'Order fulfillment',
          orderReference: 'order-1',
          productSku: 'SKU-001'
        }
      ];

      const result = await batchProcessor.processInventoryDeductions(
        deductionResults,
        movements
      );

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(3); // 2 inventory updates + 1 movement
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
    });

    it('should skip failed deduction items', async () => {
      const deductionResults: InventoryDeductionResult[] = [
        {
          deductions: [
            {
              categoryGroupId: 'category-group-1',
              requestedQuantity: 5,
              deductedQuantity: 5,
              newInventoryLevel: 5,
              movementId: 'movement-1'
            }
          ],
          warnings: [],
          errors: [
            {
              categoryGroupId: 'category-group-2',
              error: 'Insufficient inventory',
              requestedQuantity: 3,
              reason: 'Stock level too low'
            }
          ]
        }
      ];

      const movements: InventoryMovement[] = [];

      const result = await batchProcessor.processInventoryDeductions(
        deductionResults,
        movements
      );

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(1); // Only 1 successful inventory update
    });
  });

  describe('processCategoryDeductions', () => {
    it('should process category deductions successfully', async () => {
      const categoryUpdates = [
        {
          categoryId: 'category-1',
          deductionQuantity: 10,
          lastUpdated: new Date('2024-01-01')
        },
        {
          categoryId: 'category-2',
          deductionQuantity: 5,
          lastUpdated: new Date('2024-01-01')
        }
      ];

      const result = await batchProcessor.processCategoryDeductions(categoryUpdates);

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(2);
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('processOrderItemsDeduction', () => {
    it('should process order items deduction successfully', async () => {
      const orderItems = [
        {
          orderId: 'order-1',
          SKU: 'SKU-001',
          quantity: 5,
          deductedAt: new Date('2024-01-01'),
          categoryId: 'category-1',
          productName: 'Test Product'
        }
      ];

      const result = await batchProcessor.processOrderItemsDeduction(orderItems);

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(1);
      expect(mockBatch.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly', async () => {
      const operations: BatchOperation[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'update',
        collection: 'inventory',
        docId: `product-${i}`,
        data: { currentLevel: i }
      }));

      const progressUpdates: BatchProgress[] = [];
      const onProgress = (progress: BatchProgress) => {
        progressUpdates.push(progress);
      };

      await batchProcessor.processBatchOperations(operations, {
        batchSize: 25,
        onProgress
      });

      expect(progressUpdates).toHaveLength(4);
      expect(progressUpdates[0].percentage).toBe(25);
      expect(progressUpdates[1].percentage).toBe(50);
      expect(progressUpdates[2].percentage).toBe(75);
      expect(progressUpdates[3].percentage).toBe(100);
    });
  });

  describe('static utility methods', () => {
    it('should create progress logger', () => {
      const logger = BatchProcessor.createProgressLogger('Test');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const progress: BatchProgress = {
        totalOperations: 100,
        completedOperations: 50,
        currentBatch: 2,
        totalBatches: 4,
        percentage: 50,
        estimatedTimeRemaining: 5000
      };

      logger(progress);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Test: 50% (50/100) (ETA: 5s)'
      );

      consoleSpy.mockRestore();
    });

    it('should create batch complete logger', () => {
      const logger = BatchProcessor.createBatchCompleteLogger('Test Batch');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger(2, 5);

      expect(consoleSpy).toHaveBeenCalledWith('Test Batch: Batch 2/5 completed');

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'update',
          collection: 'inventory',
          docId: 'product-1',
          data: { currentLevel: 10 }
        }
      ];

      mockBatch.commit.mockRejectedValue('Unknown error type');

      const result = await batchProcessor.processBatchOperations(operations, {
        maxRetries: 1
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Unknown error');
    });

    it('should measure execution time', async () => {
      const operations: BatchOperation[] = [
        {
          type: 'update',
          collection: 'inventory',
          docId: 'product-1',
          data: { currentLevel: 10 }
        }
      ];

      // Add small delay to ensure measurable time
      mockBatch.commit.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10))
      );

      const result = await batchProcessor.processBatchOperations(operations);

      expect(result.timeTaken).toBeGreaterThanOrEqual(0);
      expect(typeof result.timeTaken).toBe('number');
    });
  });
});