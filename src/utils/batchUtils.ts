import { Transaction, BatchInfo } from '../types/transaction.type';

/**
 * Generate a unique batch ID with timestamp and random suffix
 */
export function generateBatchId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `batch_${timestamp}_${randomSuffix}`;
}

/**
 * Create a BatchInfo object with the provided parameters
 */
export function createBatchInfo(
  fileName: string,
  fileId: string | undefined,
  platform: 'amazon' | 'flipkart' | 'mixed',
  userId: string,
  selectedDate: string,
  orderCount: number,
  description?: string
): BatchInfo {
  const now = new Date().toISOString();
  
  // Create base batch info object
  const batchInfo: Partial<BatchInfo> = {
    batchId: generateBatchId(),
    uploadedAt: now,
    fileName,
    platform,
    orderCount,
    metadata: {
      userId,
      selectedDate,
      processedAt: now
    }
  };
  
  // Only add optional fields if they have values (not undefined)
  if (fileId !== undefined) {
    batchInfo.fileId = fileId;
  }
  if (description !== undefined) {
    batchInfo.description = description;
  }
  
  return batchInfo as BatchInfo;
}

/**
 * Create a legacy batch for transactions without batch information
 */
export function createLegacyBatch(transactions: Transaction[]): BatchInfo {
  return {
    batchId: 'legacy',
    uploadedAt: 'Unknown',
    fileName: 'Legacy Orders',
    platform: 'mixed',
    orderCount: transactions.length,
    metadata: {
      userId: 'unknown',
      selectedDate: 'unknown',
      processedAt: 'unknown'
    }
  };
}

/**
 * Group transactions by their batch ID, creating a legacy batch for unbatched transactions
 */
export function groupTransactionsByBatch(transactions: Transaction[]): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};
  const legacyTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    if (transaction.batchInfo) {
      const batchId = transaction.batchInfo.batchId;
      if (!grouped[batchId]) {
        grouped[batchId] = [];
      }
      grouped[batchId].push(transaction);
    } else {
      legacyTransactions.push(transaction);
    }
  }

  // Add legacy transactions if any exist
  if (legacyTransactions.length > 0) {
    grouped['legacy'] = legacyTransactions;
  }

  return grouped;
}

/**
 * Batch summary statistics
 */
export interface BatchSummary {
  totalBatches: number;
  totalTransactions: number;
  batchedTransactions: number;
  legacyTransactions: number;
  platforms: string[];
}

/**
 * Calculate summary statistics for batched transactions
 */
export function getBatchSummary(transactions: Transaction[]): BatchSummary {
  if (transactions.length === 0) {
    return {
      totalBatches: 0,
      totalTransactions: 0,
      batchedTransactions: 0,
      legacyTransactions: 0,
      platforms: []
    };
  }

  const grouped = groupTransactionsByBatch(transactions);
  const batchedTransactions = transactions.filter(t => t.batchInfo).length;
  const legacyTransactions = transactions.length - batchedTransactions;
  
  // Get unique platforms from batch info, plus platforms from legacy transactions
  const batchPlatforms = transactions
    .filter(t => t.batchInfo)
    .map(t => t.batchInfo!.platform);
  
  const legacyPlatforms = transactions
    .filter(t => !t.batchInfo)
    .map(t => t.platform);
  
  const platforms = Array.from(new Set([...batchPlatforms, ...legacyPlatforms]));

  return {
    totalBatches: Object.keys(grouped).length,
    totalTransactions: transactions.length,
    batchedTransactions,
    legacyTransactions,
    platforms
  };
}

/**
 * Batch with its transactions and metadata
 */
export interface BatchWithTransactions {
  batchInfo: BatchInfo;
  transactions: Transaction[];
  totalRevenue: number;
  totalQuantity: number;
}

/**
 * Convert grouped transactions to batch objects with metadata
 */
export function createBatchesWithTransactions(transactions: Transaction[]): BatchWithTransactions[] {
  const grouped = groupTransactionsByBatch(transactions);
  const batches: BatchWithTransactions[] = [];

  for (const [batchId, batchTransactions] of Object.entries(grouped)) {
    let batchInfo: BatchInfo;
    
    if (batchId === 'legacy') {
      batchInfo = createLegacyBatch(batchTransactions);
    } else {
      // Use batch info from first transaction (all should have same batch info)
      batchInfo = batchTransactions[0].batchInfo!;
    }

    const totalRevenue = batchTransactions.reduce((sum, t) => sum + (t.sellingPrice * t.quantity), 0);
    const totalQuantity = batchTransactions.reduce((sum, t) => sum + t.quantity, 0);

    batches.push({
      batchInfo,
      transactions: batchTransactions,
      totalRevenue,
      totalQuantity
    });
  }

  // Sort batches by upload date (newest first), with legacy at the end
  return batches.sort((a, b) => {
    if (a.batchInfo.batchId === 'legacy') return 1;
    if (b.batchInfo.batchId === 'legacy') return -1;
    return new Date(b.batchInfo.uploadedAt).getTime() - new Date(a.batchInfo.uploadedAt).getTime();
  });
}