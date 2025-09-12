import { batchService } from '../batch.service';
import { BatchInfo } from '../../types/transaction.type';
import * as FirestoreMethods from 'firebase/firestore';
import * as FirebaseAuth from 'firebase/auth';

// Mock Firebase modules
jest.mock('firebase/firestore', () => {
  const originalModule = jest.requireActual('firebase/firestore');
  return {
    ...originalModule,
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(() => 'mock-collection'),
    doc: jest.fn(() => ({ id: 'mock-doc-id' })),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    Timestamp: {
      now: jest.fn(() => ({ toMillis: () => Date.now() })),
      fromDate: jest.fn((date) => ({ toMillis: () => date.getTime() }))
    }
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn()
}));

describe('BatchService', () => {
  const mockBatchInfo: BatchInfo = {
    batchId: 'batch-test-123',
    uploadedAt: '2025-01-09T10:00:00.000Z',
    fileName: 'test-orders.pdf',
    fileId: 'file-456',
    platform: 'amazon',
    orderCount: 5,
    metadata: {
      userId: 'user-123',
      selectedDate: '2025-01-09',
      processedAt: '2025-01-09T10:05:00.000Z'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default authenticated user
    (FirebaseAuth.getAuth as jest.Mock).mockReturnValue({
      currentUser: {
        uid: 'test-user-123',
        email: 'test@example.com'
      }
    });
  });

  describe('createBatch', () => {
    it('should create a batch in Firestore successfully', async () => {
      (FirestoreMethods.addDoc as jest.Mock).mockResolvedValue({
        id: 'batch-doc-id'
      });

      const result = await batchService.createBatch(mockBatchInfo);

      expect(result.success).toBe(true);
      expect(result.batchId).toBe(mockBatchInfo.batchId);
      expect(result.firestoreDocId).toBe('batch-doc-id');
      expect(FirestoreMethods.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          batchId: mockBatchInfo.batchId,
          uploadedAt: expect.any(Object),
          fileName: mockBatchInfo.fileName,
          platform: mockBatchInfo.platform,
          orderCount: mockBatchInfo.orderCount
        })
      );
    });

    it('should handle Firestore errors gracefully', async () => {
      const firestoreError = new Error('Firestore connection failed');
      (FirestoreMethods.addDoc as jest.Mock).mockRejectedValue(firestoreError);

      const result = await batchService.createBatch(mockBatchInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firestore connection failed');
      expect(result.batchId).toBe(mockBatchInfo.batchId);
      expect(result.firestoreDocId).toBeUndefined();
    });

    it('should handle unauthenticated user', async () => {
      (FirebaseAuth.getAuth as jest.Mock).mockReturnValue({
        currentUser: null
      });

      const result = await batchService.createBatch(mockBatchInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User must be authenticated to create batches');
    });
  });

  describe('getBatch', () => {
    it('should retrieve batch by ID successfully', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [{
          data: () => ({
            batchId: mockBatchInfo.batchId,
            uploadedAt: { toDate: () => new Date(mockBatchInfo.uploadedAt) },
            fileName: mockBatchInfo.fileName,
            platform: mockBatchInfo.platform,
            orderCount: mockBatchInfo.orderCount,
            metadata: {
              ...mockBatchInfo.metadata,
              processedAt: { toDate: () => new Date(mockBatchInfo.metadata.processedAt) }
            }
          }),
          id: 'firestore-doc-id'
        }]
      };

      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await batchService.getBatch(mockBatchInfo.batchId);

      expect(result.success).toBe(true);
      expect(result.batch).toBeDefined();
      expect(result.batch?.batchId).toBe(mockBatchInfo.batchId);
      expect(result.batch?.fileName).toBe(mockBatchInfo.fileName);
    });

    it('should handle batch not found', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: []
      };

      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await batchService.getBatch('nonexistent-batch');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Batch not found');
      expect(result.batch).toBeUndefined();
    });
  });

  describe('getBatchesForDate', () => {
    it('should retrieve batches for specific date', async () => {
      const mockBatches = [
        {
          id: 'doc1',
          data: () => ({
            batchId: 'batch-1',
            uploadedAt: { toDate: () => new Date() },
            fileName: 'orders1.pdf',
            platform: 'amazon',
            orderCount: 3,
            metadata: {
              userId: 'user-123',
              selectedDate: '2025-01-09',
              processedAt: { toDate: () => new Date('2025-01-09T10:00:00.000Z') }
            }
          })
        },
        {
          id: 'doc2',
          data: () => ({
            batchId: 'batch-2',
            uploadedAt: { toDate: () => new Date() },
            fileName: 'orders2.pdf',
            platform: 'flipkart',
            orderCount: 2,
            metadata: {
              userId: 'user-123',
              selectedDate: '2025-01-09',
              processedAt: { toDate: () => new Date('2025-01-09T11:00:00.000Z') }
            }
          })
        }
      ];

      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue({
        docs: mockBatches,
        empty: false
      });

      const result = await batchService.getBatchesForDate('2025-01-09');

      expect(result.success).toBe(true);
      expect(result.batches).toBeDefined();
      expect(result.batches!).toHaveLength(2);
      expect(result.batches![0].batchId).toBe('batch-1');
      expect(result.batches![1].batchId).toBe('batch-2');
    });

    it('should handle empty results', async () => {
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true
      });

      const result = await batchService.getBatchesForDate('2025-01-10');

      expect(result.success).toBe(true);
      expect(result.batches).toHaveLength(0);
    });
  });

  describe('updateBatchOrderCount', () => {
    it('should update batch order count successfully', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [{ id: 'doc-id' }]
      };
      
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      (FirestoreMethods.updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await batchService.updateBatchOrderCount('batch-123', 10);

      expect(result.success).toBe(true);
      expect(FirestoreMethods.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { orderCount: 10 }
      );
    });

    it('should handle update errors', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [{ id: 'doc-id' }]
      };
      
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      
      const updateError = new Error('Update failed');
      (FirestoreMethods.updateDoc as jest.Mock).mockRejectedValue(updateError);

      const result = await batchService.updateBatchOrderCount('batch-123', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteBatch', () => {
    it('should delete batch successfully', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [{ id: 'doc-id' }]
      };
      
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      (FirestoreMethods.deleteDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await batchService.deleteBatch('batch-123');

      expect(result.success).toBe(true);
      expect(FirestoreMethods.deleteDoc).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [{ id: 'doc-id' }]
      };
      
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      
      const deleteError = new Error('Delete failed');
      (FirestoreMethods.deleteDoc as jest.Mock).mockRejectedValue(deleteError);

      const result = await batchService.deleteBatch('batch-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});