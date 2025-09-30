import { ThrottleEntry } from '../../../types/barcode';

/**
 * Mock implementation of ScanThrottleManager for testing
 */
export class ScanThrottleManager {
  private throttleCache = new Map<string, ThrottleEntry>();
  private readonly throttleDuration: number;
  private readonly maxCacheSize: number;

  constructor(throttleDuration: number = 3000, maxCacheSize: number = 100) {
    this.throttleDuration = throttleDuration;
    this.maxCacheSize = maxCacheSize;
  }

  isThrottled(barcodeId: string): boolean {
    const now = Date.now();
    const entry = this.throttleCache.get(barcodeId);
    
    if (!entry) return false;
    
    const timeSinceFirstScan = now - entry.firstScanAt;
    const isWithinThrottlePeriod = timeSinceFirstScan < this.throttleDuration;
    
    if (!isWithinThrottlePeriod) {
      this.throttleCache.delete(barcodeId);
      return false;
    }
    
    return entry.isThrottled;
  }

  registerScan(barcodeId: string): ThrottleEntry {
    const now = Date.now();
    const existingEntry = this.throttleCache.get(barcodeId);

    if (existingEntry) {
      // Update existing entry
      const updatedEntry: ThrottleEntry = {
        ...existingEntry,
        lastAttemptAt: now,
        attemptCount: existingEntry.attemptCount + 1,
        isThrottled: true
      };
      
      this.throttleCache.set(barcodeId, updatedEntry);
      return updatedEntry;
    } else {
      // Create new entry
      const newEntry: ThrottleEntry = {
        firstScanAt: now,
        lastAttemptAt: now,
        attemptCount: 1,
        isThrottled: false
      };
      
      this.throttleCache.set(barcodeId, newEntry);
      this.enforceMaxCacheSize();
      return newEntry;
    }
  }

  getThrottleInfo(barcodeId: string): ThrottleEntry | undefined {
    return this.throttleCache.get(barcodeId);
  }

  getThrottledBarcodes(): Map<string, ThrottleEntry> {
    return new Map(this.throttleCache);
  }

  getTotalDuplicateAttempts(): number {
    let total = 0;
    for (const entry of this.throttleCache.values()) {
      total += Math.max(0, entry.attemptCount - 1);
    }
    return total;
  }

  clearBarcode(barcodeId: string): boolean {
    return this.throttleCache.delete(barcodeId);
  }

  clearAll(): void {
    this.throttleCache.clear();
  }

  getCacheSize(): number {
    return this.throttleCache.size;
  }

  getConfig() {
    return {
      throttleDuration: this.throttleDuration,
      maxCacheSize: this.maxCacheSize
    };
  }

  getExpiredBarcodes(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [barcodeId, entry] of this.throttleCache) {
      const timeSinceFirstScan = now - entry.firstScanAt;
      if (timeSinceFirstScan >= this.throttleDuration) {
        expired.push(barcodeId);
      }
    }
    
    return expired;
  }

  cleanupExpiredEntries(): number {
    const expired = this.getExpiredBarcodes();
    let cleaned = 0;
    
    for (const barcodeId of expired) {
      if (this.throttleCache.delete(barcodeId)) {
        cleaned++;
      }
    }
    
    return cleaned;
  }

  performPeriodicCleanup(): void {
    this.cleanupExpiredEntries();
  }

  private enforceMaxCacheSize(): void {
    if (this.throttleCache.size <= this.maxCacheSize) {
      return;
    }

    // Remove oldest entries (LRU style)
    const entries = Array.from(this.throttleCache.entries());
    entries.sort((a, b) => a[1].firstScanAt - b[1].firstScanAt);
    
    const toRemove = this.throttleCache.size - this.maxCacheSize;
    for (let i = 0; i < toRemove; i++) {
      this.throttleCache.delete(entries[i][0]);
    }
  }
}