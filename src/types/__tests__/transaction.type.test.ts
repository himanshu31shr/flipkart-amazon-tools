import { BatchInfo, Transaction } from '../transaction.type';

describe('BatchInfo Interface', () => {
  it('should create BatchInfo with required fields', () => {
    const batchInfo: BatchInfo = {
      batchId: 'batch-123',
      uploadedAt: '2025-01-09T10:00:00.000Z',
      fileName: 'test-orders.pdf',
      platform: 'amazon',
      orderCount: 5,
      metadata: {
        userId: 'user-123',
        selectedDate: '2025-01-09',
        processedAt: '2025-01-09T10:05:00.000Z'
      }
    };

    expect(batchInfo.batchId).toBe('batch-123');
    expect(batchInfo.uploadedAt).toBe('2025-01-09T10:00:00.000Z');
    expect(batchInfo.fileName).toBe('test-orders.pdf');
    expect(batchInfo.platform).toBe('amazon');
    expect(batchInfo.orderCount).toBe(5);
    expect(batchInfo.metadata.userId).toBe('user-123');
    expect(batchInfo.metadata.selectedDate).toBe('2025-01-09');
    expect(batchInfo.metadata.processedAt).toBe('2025-01-09T10:05:00.000Z');
  });

  it('should create BatchInfo with optional fields', () => {
    const batchInfo: BatchInfo = {
      batchId: 'batch-456',
      uploadedAt: '2025-01-09T11:00:00.000Z',
      fileName: 'flipkart-orders.pdf',
      fileId: 'file-789',
      description: 'Batch of Flipkart orders',
      platform: 'flipkart',
      orderCount: 3,
      metadata: {
        userId: 'user-456',
        selectedDate: '2025-01-09',
        processedAt: '2025-01-09T11:05:00.000Z'
      }
    };

    expect(batchInfo.fileId).toBe('file-789');
    expect(batchInfo.description).toBe('Batch of Flipkart orders');
  });

  it('should handle mixed platform batches', () => {
    const batchInfo: BatchInfo = {
      batchId: 'batch-mixed',
      uploadedAt: '2025-01-09T12:00:00.000Z',
      fileName: 'mixed-orders.pdf',
      platform: 'mixed',
      orderCount: 10,
      metadata: {
        userId: 'user-789',
        selectedDate: '2025-01-09',
        processedAt: '2025-01-09T12:05:00.000Z'
      }
    };

    expect(batchInfo.platform).toBe('mixed');
    expect(batchInfo.orderCount).toBe(10);
  });
});

describe('Transaction Interface with Batch Support', () => {
  const mockTransaction: Transaction = {
    transactionId: 'txn-123',
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
      name: 'Test Product',
      description: 'Test Description',
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
    hash: 'hash-123'
  };

  it('should create Transaction without batch info (legacy support)', () => {
    expect(mockTransaction.batchInfo).toBeUndefined();
    expect(mockTransaction.transactionId).toBe('txn-123');
    expect(mockTransaction.platform).toBe('amazon');
  });

  it('should create Transaction with batch info', () => {
    const batchInfo: BatchInfo = {
      batchId: 'batch-123',
      uploadedAt: '2025-01-09T10:00:00.000Z',
      fileName: 'orders.pdf',
      platform: 'amazon',
      orderCount: 5,
      metadata: {
        userId: 'user-123',
        selectedDate: '2025-01-09',
        processedAt: '2025-01-09T10:05:00.000Z'
      }
    };

    const transactionWithBatch: Transaction = {
      ...mockTransaction,
      batchInfo
    };

    expect(transactionWithBatch.batchInfo).toBeDefined();
    expect(transactionWithBatch.batchInfo?.batchId).toBe('batch-123');
    expect(transactionWithBatch.batchInfo?.platform).toBe('amazon');
    expect(transactionWithBatch.batchInfo?.orderCount).toBe(5);
  });

  it('should handle partial batch info gracefully', () => {
    const partialBatchInfo: Partial<BatchInfo> = {
      batchId: 'partial-batch',
      uploadedAt: '2025-01-09T10:00:00.000Z'
    };

    // This should not compile, ensuring type safety
    // const transactionWithPartialBatch: Transaction = {
    //   ...mockTransaction,
    //   batchInfo: partialBatchInfo // This would cause TypeScript error
    // };

    expect(partialBatchInfo.batchId).toBe('partial-batch');
  });
});