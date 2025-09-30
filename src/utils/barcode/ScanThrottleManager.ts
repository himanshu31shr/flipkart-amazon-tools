import { ThrottleEntry } from '../../types/barcode';

/**
 * Manages barcode scan throttling to prevent duplicate scans in quick succession
 * Provides memory-efficient caching with automatic cleanup of expired entries
 */
export class ScanThrottleManager {
  private throttleCache = new Map<string, ThrottleEntry>();
  private readonly throttleDuration: number;
  private readonly maxCacheSize: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(throttleDuration = 3000, maxCacheSize = 100) {
    this.throttleDuration = throttleDuration;
    this.maxCacheSize = maxCacheSize;
    this.startPeriodicCleanup();
  }

  /**
   * Check if barcode is currently throttled
   * @param barcodeId Barcode identifier to check
   * @returns true if barcode should be throttled, false if allowed to proceed
   */
  isThrottled(barcodeId: string): boolean {
    const now = Date.now();
    const entry = this.throttleCache.get(barcodeId);

    if (!entry) {
      return false;
    }

    const timeSinceFirstScan = now - entry.firstScanAt;
    const isWithinThrottlePeriod = timeSinceFirstScan < this.throttleDuration;

    if (!isWithinThrottlePeriod) {
      // Throttle period expired, remove entry
      this.throttleCache.delete(barcodeId);
      return false;
    }

    return entry.isThrottled;
  }

  /**
   * Register a barcode scan attempt
   * @param barcodeId Barcode identifier being scanned
   * @returns ThrottleEntry with current throttle state
   */
  registerScan(barcodeId: string): ThrottleEntry {
    const now = Date.now();
    const existingEntry = this.throttleCache.get(barcodeId);

    if (existingEntry) {
      // Update existing entry
      const timeSinceFirstScan = now - existingEntry.firstScanAt;
      const isWithinThrottlePeriod = timeSinceFirstScan < this.throttleDuration;

      if (isWithinThrottlePeriod) {
        // Still within throttle period, increment attempt count
        const updatedEntry: ThrottleEntry = {
          ...existingEntry,
          lastAttemptAt: now,
          attemptCount: existingEntry.attemptCount + 1,
          isThrottled: true
        };
        this.throttleCache.set(barcodeId, updatedEntry);
        return updatedEntry;
      } else {
        // Throttle period expired, create new entry
        this.throttleCache.delete(barcodeId);
      }
    }

    // Create new entry for first scan or after throttle expiry
    const newEntry: ThrottleEntry = {
      firstScanAt: now,
      lastAttemptAt: now,
      attemptCount: 1,
      isThrottled: false
    };

    // Manage cache size
    this.enforceCacheLimit();
    this.throttleCache.set(barcodeId, newEntry);

    return newEntry;
  }

  /**
   * Get throttle information for a specific barcode
   * @param barcodeId Barcode identifier to query
   * @returns ThrottleEntry if exists, undefined otherwise
   */
  getThrottleInfo(barcodeId: string): ThrottleEntry | undefined {
    return this.throttleCache.get(barcodeId);
  }

  /**
   * Get all currently throttled barcodes
   * @returns Map of barcodeId to ThrottleEntry for all throttled items
   */
  getThrottledBarcodes(): Map<string, ThrottleEntry> {
    const now = Date.now();
    const throttledBarcodes = new Map<string, ThrottleEntry>();

    for (const [barcodeId, entry] of this.throttleCache.entries()) {
      const timeSinceFirstScan = now - entry.firstScanAt;
      const isWithinThrottlePeriod = timeSinceFirstScan < this.throttleDuration;

      if (isWithinThrottlePeriod && entry.isThrottled) {
        throttledBarcodes.set(barcodeId, entry);
      }
    }

    return throttledBarcodes;
  }

  /**
   * Get total number of duplicate attempts across all throttled barcodes
   * @returns Sum of all duplicate scan attempts
   */
  getTotalDuplicateAttempts(): number {
    let total = 0;
    for (const entry of this.throttleCache.values()) {
      if (entry.attemptCount > 1) {
        total += entry.attemptCount - 1; // Subtract 1 for the first valid scan
      }
    }
    return total;
  }

  /**
   * Clear specific barcode from throttle cache
   * @param barcodeId Barcode identifier to clear
   */
  clearBarcode(barcodeId: string): void {
    this.throttleCache.delete(barcodeId);
  }

  /**
   * Clear all throttle cache entries
   */
  clearAll(): void {
    this.throttleCache.clear();
  }

  /**
   * Get current cache size
   * @returns Number of entries in throttle cache
   */
  getCacheSize(): number {
    return this.throttleCache.size;
  }

  /**
   * Get throttle configuration
   * @returns Object with current throttle settings
   */
  getConfig(): { throttleDuration: number; maxCacheSize: number } {
    return {
      throttleDuration: this.throttleDuration,
      maxCacheSize: this.maxCacheSize
    };
  }

  /**
   * Cleanup expired entries and enforce cache size limit
   */
  private enforceCacheLimit(): void {
    this.cleanupExpiredEntries();

    // If still over limit, remove oldest entries
    if (this.throttleCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.throttleCache.entries());
      entries.sort((a, b) => a[1].lastAttemptAt - b[1].lastAttemptAt);
      
      const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize + 1);
      for (const [barcodeId] of entriesToRemove) {
        this.throttleCache.delete(barcodeId);
      }
    }
  }

  /**
   * Remove expired throttle entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredBarcodes: string[] = [];

    for (const [barcodeId, entry] of this.throttleCache.entries()) {
      const timeSinceLastAttempt = now - entry.lastAttemptAt;
      if (timeSinceLastAttempt > this.throttleDuration) {
        expiredBarcodes.push(barcodeId);
      }
    }

    for (const barcodeId of expiredBarcodes) {
      this.throttleCache.delete(barcodeId);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startPeriodicCleanup(): void {
    // Cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  /**
   * Stop periodic cleanup (for cleanup on unmount)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clearAll();
  }
}