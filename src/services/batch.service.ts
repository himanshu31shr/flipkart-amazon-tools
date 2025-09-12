import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BatchInfo } from '../types/transaction.type';

/**
 * Result type for batch operations
 */
export interface BatchOperationResult {
  success: boolean;
  error?: string;
  batchId?: string;
  firestoreDocId?: string;
  batch?: BatchInfo;
  batches?: BatchInfo[];
}

/**
 * Service for managing batch information in Firestore
 */
class BatchService {
  private readonly COLLECTION_NAME = 'batches';

  /**
   * Create a new batch in Firestore
   */
  async createBatch(batchInfo: BatchInfo): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to create batches',
          batchId: batchInfo.batchId
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);

      // Convert date strings to Firestore timestamps
      const batchData = {
        ...batchInfo,
        uploadedAt: Timestamp.fromDate(new Date(batchInfo.uploadedAt)),
        metadata: {
          ...batchInfo.metadata,
          processedAt: Timestamp.fromDate(new Date(batchInfo.metadata.processedAt))
        }
      };

      const docRef = await addDoc(batchesCollection, batchData);

      return {
        success: true,
        batchId: batchInfo.batchId,
        firestoreDocId: docRef.id
      };
    } catch (error) {
      console.error('Error creating batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        batchId: batchInfo.batchId
      };
    }
  }

  /**
   * Retrieve a batch by its batch ID
   */
  async getBatch(batchId: string): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to retrieve batches'
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);
      const batchQuery = query(batchesCollection, where('batchId', '==', batchId));
      
      const querySnapshot = await getDocs(batchQuery);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Batch not found'
        };
      }

      const batchDoc = querySnapshot.docs[0];
      const batchData = batchDoc.data();

      // Convert Firestore timestamps back to ISO strings
      const batch: BatchInfo = {
        ...batchData,
        uploadedAt: batchData.uploadedAt.toDate().toISOString(),
        metadata: {
          ...batchData.metadata,
          processedAt: batchData.metadata.processedAt.toDate().toISOString()
        }
      } as BatchInfo;

      return {
        success: true,
        batch
      };
    } catch (error) {
      console.error('Error retrieving batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all batches for a specific date
   */
  async getBatchesForDate(selectedDate: string): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to retrieve batches',
          batches: []
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);
      const batchQuery = query(
        batchesCollection,
        where('metadata.selectedDate', '==', selectedDate),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(batchQuery);

      if (querySnapshot.empty) {
        return {
          success: true,
          batches: []
        };
      }

      const batches: BatchInfo[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          uploadedAt: data.uploadedAt.toDate().toISOString(),
          metadata: {
            ...data.metadata,
            processedAt: data.metadata.processedAt.toDate().toISOString()
          }
        } as BatchInfo;
      });

      return {
        success: true,
        batches
      };
    } catch (error) {
      console.error('Error retrieving batches for date:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        batches: []
      };
    }
  }

  /**
   * Update the order count for a batch
   */
  async updateBatchOrderCount(batchId: string, orderCount: number): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to update batches'
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);
      const batchQuery = query(batchesCollection, where('batchId', '==', batchId));
      
      const querySnapshot = await getDocs(batchQuery);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Batch not found'
        };
      }

      const batchDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, this.COLLECTION_NAME, batchDoc.id), {
        orderCount
      });

      return {
        success: true,
        batchId
      };
    } catch (error) {
      console.error('Error updating batch order count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a batch from Firestore
   */
  async deleteBatch(batchId: string): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to delete batches'
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);
      const batchQuery = query(batchesCollection, where('batchId', '==', batchId));
      
      const querySnapshot = await getDocs(batchQuery);
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: 'Batch not found'
        };
      }

      const batchDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, this.COLLECTION_NAME, batchDoc.id));

      return {
        success: true,
        batchId
      };
    } catch (error) {
      console.error('Error deleting batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get batches for a specific user (admin function)
   */
  async getBatchesForUser(userId: string): Promise<BatchOperationResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to retrieve user batches',
          batches: []
        };
      }

      const db = getFirestore();
      const batchesCollection = collection(db, this.COLLECTION_NAME);
      const batchQuery = query(
        batchesCollection,
        where('metadata.userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(batchQuery);

      if (querySnapshot.empty) {
        return {
          success: true,
          batches: []
        };
      }

      const batches: BatchInfo[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          uploadedAt: data.uploadedAt.toDate().toISOString(),
          metadata: {
            ...data.metadata,
            processedAt: data.metadata.processedAt.toDate().toISOString()
          }
        } as BatchInfo;
      });

      return {
        success: true,
        batches
      };
    } catch (error) {
      console.error('Error retrieving user batches:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        batches: []
      };
    }
  }
}

export const batchService = new BatchService();