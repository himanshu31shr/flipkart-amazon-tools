import { 
  getFirestore, 
  writeBatch, 
  doc
} from 'firebase/firestore';
import { InventoryDeductionResult, InventoryMovement } from '../types/inventory';

export interface BatchOperation {
  type: 'update' | 'create' | 'delete';
  collection: string;
  docId: string;
  data: Record<string, any>;
}

export interface BatchProcessorOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: BatchProgress) => void;
  onBatchComplete?: (batchIndex: number, totalBatches: number) => void;
}

export interface BatchProgress {
  totalOperations: number;
  completedOperations: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface BatchProcessorResult {
  success: boolean;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  errors: string[];
  timeTaken: number;
}

class BatchProcessor {
  private readonly FIRESTORE_BATCH_LIMIT = 500;
  private readonly DEFAULT_BATCH_SIZE = 450; // Leave some buffer
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  async processBatchOperations(
    operations: BatchOperation[],
    options: BatchProcessorOptions = {}
  ): Promise<BatchProcessorResult> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      onProgress,
      onBatchComplete
    } = options;

    const startTime = Date.now();
    const db = getFirestore();
    const totalOperations = operations.length;
    const totalBatches = Math.ceil(totalOperations / batchSize);
    
    let completedOperations = 0;
    const errors: string[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalOperations);
      const batchOperations = operations.slice(batchStart, batchEnd);

      let retries = 0;
      let batchSuccess = false;

      while (retries <= maxRetries && !batchSuccess) {
        try {
          const batch = writeBatch(db);
          
          for (const operation of batchOperations) {
            const docRef = doc(db, operation.collection, operation.docId);
            
            switch (operation.type) {
              case 'create':
              case 'update':
                batch.set(docRef, operation.data, { merge: operation.type === 'update' });
                break;
              case 'delete':
                batch.delete(docRef);
                break;
              default:
                throw new Error(`Unsupported operation type: ${operation.type}`);
            }
          }

          await batch.commit();
          batchSuccess = true;
          completedOperations += batchOperations.length;

          if (onBatchComplete) {
            onBatchComplete(i + 1, totalBatches);
          }

        } catch (error) {
          retries++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (retries > maxRetries) {
            errors.push(`Batch ${i + 1} failed after ${maxRetries} retries: ${errorMessage}`);
            break;
          } else {
            console.warn(`Batch ${i + 1} failed, retrying (${retries}/${maxRetries}):`, errorMessage);
            await this.delay(retryDelay * retries);
          }
        }
      }

      if (onProgress) {
        const progress: BatchProgress = {
          totalOperations,
          completedOperations,
          currentBatch: i + 1,
          totalBatches,
          percentage: Math.round((completedOperations / totalOperations) * 100),
          estimatedTimeRemaining: this.calculateETA(startTime, completedOperations, totalOperations)
        };
        onProgress(progress);
      }
    }

    const timeTaken = Date.now() - startTime;

    return {
      success: errors.length === 0,
      totalOperations,
      completedOperations,
      failedOperations: totalOperations - completedOperations,
      errors,
      timeTaken
    };
  }

  async processInventoryDeductions(
    deductionResults: InventoryDeductionResult[],
    movements: InventoryMovement[],
    options: BatchProcessorOptions = {}
  ): Promise<BatchProcessorResult> {
    const operations: BatchOperation[] = [];

    // Create operations for inventory level updates
    for (const result of deductionResults) {
      for (const deduction of result.deductions) {
        operations.push({
          type: 'update',
          collection: 'categoryGroups',
          docId: deduction.categoryGroupId,
          data: {
            currentInventory: deduction.newInventoryLevel,
            lastUpdated: new Date(),
            lastDeductionAt: new Date()
          }
        });
      }
    }

    // Create operations for inventory movements
    for (const movement of movements) {
      operations.push({
        type: 'create',
        collection: 'inventoryMovements',
        docId: `${movement.categoryGroupId}_${movement.createdAt?.toMillis() || Date.now()}`,
        data: movement
      });
    }

    return this.processBatchOperations(operations, {
      ...options,
      onProgress: options.onProgress ? (progress) => {
        console.log(`Processing inventory deductions: ${progress.percentage}% complete`);
        options.onProgress!(progress);
      } : undefined
    });
  }

  async processCategoryDeductions(
    categoryUpdates: Array<{ categoryId: string; deductionQuantity: number; lastUpdated: Date }>,
    options: BatchProcessorOptions = {}
  ): Promise<BatchProcessorResult> {
    const operations: BatchOperation[] = categoryUpdates.map(update => ({
      type: 'update',
      collection: 'categories',
      docId: update.categoryId,
      data: {
        inventoryDeductionQuantity: update.deductionQuantity,
        lastUpdated: update.lastUpdated
      }
    }));

    return this.processBatchOperations(operations, {
      ...options,
      onProgress: options.onProgress ? (progress) => {
        console.log(`Processing category deductions: ${progress.percentage}% complete`);
        options.onProgress!(progress);
      } : undefined
    });
  }

  async processOrderItemsDeduction(
    orderItems: Array<{
      orderId: string;
      SKU: string;
      quantity: number;
      deductedAt: Date;
      categoryId: string;
      productName: string;
    }>,
    options: BatchProcessorOptions = {}
  ): Promise<BatchProcessorResult> {
    const operations: BatchOperation[] = orderItems.map(item => ({
      type: 'create',
      collection: 'orderDeductions',
      docId: `${item.orderId}_${item.SKU}_${item.deductedAt.getTime()}`,
      data: {
        orderId: item.orderId,
        SKU: item.SKU,
        quantity: item.quantity,
        deductedAt: item.deductedAt,
        categoryId: item.categoryId,
        productName: item.productName,
        processed: true
      }
    }));

    return this.processBatchOperations(operations, {
      ...options,
      onProgress: options.onProgress ? (progress) => {
        console.log(`Processing order item deductions: ${progress.percentage}% complete`);
        options.onProgress!(progress);
      } : undefined
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateETA(startTime: number, completed: number, total: number): number | undefined {
    if (completed === 0) return undefined;
    
    const elapsed = Date.now() - startTime;
    const rate = completed / elapsed;
    const remaining = total - completed;
    
    return Math.round(remaining / rate);
  }

  static createProgressLogger(prefix: string = 'Batch Progress'): (progress: BatchProgress) => void {
    let lastLogTime = 0;
    const LOG_INTERVAL = 1000; // Log every 1 second at most

    return (progress: BatchProgress) => {
      const now = Date.now();
      if (now - lastLogTime >= LOG_INTERVAL || progress.percentage === 100) {
        const eta = progress.estimatedTimeRemaining 
          ? ` (ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s)`
          : '';
        
        console.log(`${prefix}: ${progress.percentage}% (${progress.completedOperations}/${progress.totalOperations})${eta}`);
        lastLogTime = now;
      }
    };
  }

  static createBatchCompleteLogger(prefix: string = 'Batch Complete'): (batchIndex: number, totalBatches: number) => void {
    return (batchIndex: number, totalBatches: number) => {
      console.log(`${prefix}: Batch ${batchIndex}/${totalBatches} completed`);
    };
  }
}

export const batchProcessor = new BatchProcessor();

export default BatchProcessor;