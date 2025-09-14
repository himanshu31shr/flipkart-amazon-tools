import { 
  generateBatchId, 
  createLegacyBatch, 
  groupTransactionsByBatch, 
  getBatchSummary,
  createBatchInfo
} from '../batchUtils';
import { Transaction } from '../../types/transaction.type';

// Mock data for testing
const mockTransactionWithBatch: Transaction = {
  transactionId: 'txn-001',
  platform: 'amazon',
  orderDate: '2025-01-09',
  sku: 'SKU001',
  quantity: 2,
  sellingPrice: 100,
  expenses: {
    shippingFee: 5,
    marketplaceFee: 10,
    otherFees: 2
  },
  product: {
    sku: 'SKU001',
    name: 'Test Product 1',
    description: 'Test Description 1',
    sellingPrice: 100,
    categoryId: 'cat-1',
    platform: 'amazon',
    visibility: 'visible',
    metadata: {}
  },
  metadata: {
    createdAt: '2025-01-09T10:00:00.000Z',
    updatedAt: '2025-01-09T10:00:00.000Z'
  },
  hash: 'hash-001',
  batchInfo: {
    batchId: 'batch-123',
    uploadedAt: '2025-01-09T10:00:00.000Z',
    fileName: 'amazon-orders.pdf',
    platform: 'amazon',
    orderCount: 3,
    metadata: {
      userId: 'user-123',
      selectedDate: '2025-01-09',
      processedAt: '2025-01-09T10:05:00.000Z'
    }
  }
};

const mockTransactionWithoutBatch: Transaction = {
  transactionId: 'txn-002',
  platform: 'flipkart',
  orderDate: '2025-01-08',
  sku: 'SKU002',
  quantity: 1,
  sellingPrice: 150,
  expenses: {
    shippingFee: 8,
    marketplaceFee: 15,
    otherFees: 3
  },
  product: {
    sku: 'SKU002',
    name: 'Test Product 2',
    description: 'Test Description 2',
    sellingPrice: 150,
    categoryId: 'cat-2',
    platform: 'flipkart',
    visibility: 'visible',
    metadata: {}
  },
  metadata: {
    createdAt: '2025-01-08T15:00:00.000Z',
    updatedAt: '2025-01-08T15:00:00.000Z'
  },
  hash: 'hash-002'
};

describe('batchUtils', () => {
  describe('generateBatchId', () => {
    it('should generate unique batch IDs', () => {
      const batchId1 = generateBatchId();
      const batchId2 = generateBatchId();
      
      expect(batchId1).toBeDefined();
      expect(batchId2).toBeDefined();
      expect(batchId1).not.toBe(batchId2);
      expect(batchId1).toMatch(/^batch_\d+_[a-z0-9]+$/);
    });

    it('should generate batch IDs with timestamp and random suffix', () => {
      const batchId = generateBatchId();
      const parts = batchId.split('_');
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('batch');
      expect(parseInt(parts[1])).toBeGreaterThan(0); // timestamp
      expect(parts[2]).toMatch(/^[a-z0-9]+$/); // random suffix
    });
  });

  describe('createBatchInfo', () => {
    it('should create BatchInfo with provided data', () => {
      const fileName = 'test-orders.pdf';
      const fileId = 'file-123';
      const platform = 'amazon' as const;
      const userId = 'user-456';
      const selectedDate = '2025-01-09';
      const orderCount = 5;

      const batchInfo = createBatchInfo(
        fileName,
        fileId,
        platform,
        userId,
        selectedDate,
        orderCount
      );

      expect(batchInfo.fileName).toBe(fileName);
      expect(batchInfo.fileId).toBe(fileId);
      expect(batchInfo.platform).toBe(platform);
      expect(batchInfo.orderCount).toBe(orderCount);
      expect(batchInfo.metadata.userId).toBe(userId);
      expect(batchInfo.metadata.selectedDate).toBe(selectedDate);
      expect(batchInfo.batchId).toMatch(/^batch_\d+_[a-z0-9]+$/);
      expect(batchInfo.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(batchInfo.metadata.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should create BatchInfo without optional fileId', () => {
      const batchInfo = createBatchInfo(
        'orders.pdf',
        undefined,
        'flipkart',
        'user-789',
        '2025-01-09',
        3
      );

      expect(batchInfo.fileId).toBeUndefined();
      expect(batchInfo.fileName).toBe('orders.pdf');
      expect(batchInfo.platform).toBe('flipkart');
    });
  });

  describe('createLegacyBatch', () => {
    it('should create legacy batch for transactions without batch info', () => {
      const legacyTransactions = [mockTransactionWithoutBatch];
      const legacyBatch = createLegacyBatch(legacyTransactions);

      expect(legacyBatch.batchId).toBe('legacy');
      expect(legacyBatch.fileName).toBe('Legacy Orders');
      expect(legacyBatch.platform).toBe('mixed');
      expect(legacyBatch.orderCount).toBe(1);
      expect(legacyBatch.uploadedAt).toBe('Unknown');
      expect(legacyBatch.metadata.userId).toBe('unknown');
      expect(legacyBatch.metadata.selectedDate).toBe('unknown');
      expect(legacyBatch.metadata.processedAt).toBe('unknown');
    });

    it('should handle multiple legacy transactions', () => {
      const legacyTransactions = [
        mockTransactionWithoutBatch,
        { ...mockTransactionWithoutBatch, transactionId: 'txn-003' }
      ];
      const legacyBatch = createLegacyBatch(legacyTransactions);

      expect(legacyBatch.orderCount).toBe(2);
    });

    it('should create legacy batch with empty array', () => {
      const legacyBatch = createLegacyBatch([]);
      
      expect(legacyBatch.orderCount).toBe(0);
      expect(legacyBatch.batchId).toBe('legacy');
    });
  });

  describe('groupTransactionsByBatch', () => {
    it('should group transactions by batch correctly', () => {
      const transactions = [
        mockTransactionWithBatch,
        mockTransactionWithoutBatch,
        {
          ...mockTransactionWithBatch,
          transactionId: 'txn-003',
          batchInfo: {
            ...mockTransactionWithBatch.batchInfo!,
            batchId: 'batch-456'
          }
        }
      ];

      const grouped = groupTransactionsByBatch(transactions);

      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped['batch-123']).toHaveLength(1);
      expect(grouped['batch-456']).toHaveLength(1);
      expect(grouped['legacy']).toHaveLength(1);
    });

    it('should handle empty transactions array', () => {
      const grouped = groupTransactionsByBatch([]);
      
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('should handle all transactions having batch info', () => {
      const transactions = [mockTransactionWithBatch];
      const grouped = groupTransactionsByBatch(transactions);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped['batch-123']).toHaveLength(1);
      expect(grouped['legacy']).toBeUndefined();
    });

    it('should handle all transactions without batch info', () => {
      const transactions = [mockTransactionWithoutBatch];
      const grouped = groupTransactionsByBatch(transactions);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped['legacy']).toHaveLength(1);
    });
  });

  describe('getBatchSummary', () => {
    it('should calculate batch summary correctly', () => {
      const transactions = [mockTransactionWithBatch, mockTransactionWithoutBatch];
      const summary = getBatchSummary(transactions);

      expect(summary.totalBatches).toBe(2); // 1 real batch + 1 legacy
      expect(summary.totalTransactions).toBe(2);
      expect(summary.batchedTransactions).toBe(1);
      expect(summary.legacyTransactions).toBe(1);
      expect(summary.platforms).toContain('amazon');
      expect(summary.platforms).toContain('flipkart');
    });

    it('should handle empty transactions', () => {
      const summary = getBatchSummary([]);

      expect(summary.totalBatches).toBe(0);
      expect(summary.totalTransactions).toBe(0);
      expect(summary.batchedTransactions).toBe(0);
      expect(summary.legacyTransactions).toBe(0);
      expect(summary.platforms).toHaveLength(0);
    });

    it('should calculate platforms correctly for mixed batches', () => {
      const mixedBatchTransaction: Transaction = {
        ...mockTransactionWithBatch,
        batchInfo: {
          ...mockTransactionWithBatch.batchInfo!,
          platform: 'mixed'
        }
      };

      const summary = getBatchSummary([mixedBatchTransaction]);

      expect(summary.platforms).toEqual(['mixed']);
    });
  });
});