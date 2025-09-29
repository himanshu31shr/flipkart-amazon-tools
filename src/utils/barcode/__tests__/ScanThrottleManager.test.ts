import { ScanThrottleManager } from '../ScanThrottleManager';

// Mock timers for testing
jest.useFakeTimers();

describe('ScanThrottleManager', () => {
  let throttleManager: ScanThrottleManager;

  beforeEach(() => {
    // Create new instance with short throttle duration for testing
    throttleManager = new ScanThrottleManager(1000, 5); // 1 second throttle, max 5 cache size
    jest.clearAllTimers();
  });

  afterEach(() => {
    throttleManager.destroy();
    jest.clearAllTimers();
  });

  describe('Basic throttling functionality', () => {
    it('should allow first scan of a barcode', () => {
      const barcodeId = 'BC_2024-01-15_001';
      expect(throttleManager.isThrottled(barcodeId)).toBe(false);
    });

    it('should register first scan correctly', () => {
      const barcodeId = 'BC_2024-01-15_001';
      const entry = throttleManager.registerScan(barcodeId);

      expect(entry.attemptCount).toBe(1);
      expect(entry.isThrottled).toBe(false);
      expect(entry.firstScanAt).toBeDefined();
      expect(entry.lastAttemptAt).toBeDefined();
    });

    it('should throttle subsequent scans within throttle period', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      // First scan
      const firstEntry = throttleManager.registerScan(barcodeId);
      expect(firstEntry.isThrottled).toBe(false);

      // Second scan immediately
      const secondEntry = throttleManager.registerScan(barcodeId);
      expect(secondEntry.isThrottled).toBe(true);
      expect(secondEntry.attemptCount).toBe(2);
    });

    it('should allow scan after throttle period expires', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      // First scan
      throttleManager.registerScan(barcodeId);
      
      // Advance time beyond throttle period
      jest.advanceTimersByTime(1100);
      
      // Should not be throttled anymore
      expect(throttleManager.isThrottled(barcodeId)).toBe(false);
      
      // New scan should be allowed
      const newEntry = throttleManager.registerScan(barcodeId);
      expect(newEntry.isThrottled).toBe(false);
      expect(newEntry.attemptCount).toBe(1);
    });
  });

  describe('Cache management', () => {
    it('should enforce maximum cache size', () => {
      // Add more entries than max cache size
      for (let i = 0; i < 10; i++) {
        throttleManager.registerScan(`BC_2024-01-15_${i.toString().padStart(3, '0')}`);
      }

      expect(throttleManager.getCacheSize()).toBeLessThanOrEqual(5);
    });

    it('should remove oldest entries when cache is full', () => {
      const firstBarcode = 'BC_2024-01-15_001';
      const lastBarcode = 'BC_2024-01-15_006';
      
      // Fill cache
      for (let i = 1; i <= 6; i++) {
        throttleManager.registerScan(`BC_2024-01-15_${i.toString().padStart(3, '0')}`);
        // Small delay between scans
        jest.advanceTimersByTime(10);
      }

      // First barcode should be removed, last should still exist
      expect(throttleManager.getThrottleInfo(firstBarcode)).toBeUndefined();
      expect(throttleManager.getThrottleInfo(lastBarcode)).toBeDefined();
    });

    it('should clear specific barcode from cache', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      throttleManager.registerScan(barcodeId);
      expect(throttleManager.getThrottleInfo(barcodeId)).toBeDefined();
      
      throttleManager.clearBarcode(barcodeId);
      expect(throttleManager.getThrottleInfo(barcodeId)).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      // Add multiple entries
      for (let i = 0; i < 3; i++) {
        throttleManager.registerScan(`BC_2024-01-15_${i.toString().padStart(3, '0')}`);
      }

      expect(throttleManager.getCacheSize()).toBe(3);
      
      throttleManager.clearAll();
      expect(throttleManager.getCacheSize()).toBe(0);
    });
  });

  describe('Statistics and reporting', () => {
    it('should track duplicate attempts correctly', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      // Multiple scans of same barcode
      throttleManager.registerScan(barcodeId);
      throttleManager.registerScan(barcodeId);
      throttleManager.registerScan(barcodeId);

      expect(throttleManager.getTotalDuplicateAttempts()).toBe(2); // 3 scans - 1 valid = 2 duplicates
    });

    it('should return currently throttled barcodes', () => {
      const barcode1 = 'BC_2024-01-15_001';
      const barcode2 = 'BC_2024-01-15_002';
      
      // First scan of each (not throttled)
      throttleManager.registerScan(barcode1);
      throttleManager.registerScan(barcode2);
      
      // Second scan of first (throttled)
      throttleManager.registerScan(barcode1);
      
      const throttledBarcodes = throttleManager.getThrottledBarcodes();
      expect(throttledBarcodes.has(barcode1)).toBe(true);
      expect(throttledBarcodes.has(barcode2)).toBe(false);
    });

    it('should provide configuration information', () => {
      const config = throttleManager.getConfig();
      expect(config.throttleDuration).toBe(1000);
      expect(config.maxCacheSize).toBe(5);
    });
  });

  describe('Cleanup and memory management', () => {
    it('should perform periodic cleanup of expired entries', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      throttleManager.registerScan(barcodeId);
      expect(throttleManager.getCacheSize()).toBe(1);
      
      // Advance time beyond throttle period
      jest.advanceTimersByTime(1200);
      
      // Manually trigger cleanup by calling a scan (which triggers internal cleanup)
      throttleManager.registerScan('BC_2024-01-15_999');
      
      // The expired entry should be cleaned up automatically
      expect(throttleManager.getCacheSize()).toBeLessThanOrEqual(1);
    });

    it('should cleanup resources on destroy', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      throttleManager.registerScan(barcodeId);
      expect(throttleManager.getCacheSize()).toBe(1);
      
      throttleManager.destroy();
      expect(throttleManager.getCacheSize()).toBe(0);
    });

    it('should handle multiple rapid scans efficiently', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      // Rapid fire scanning
      for (let i = 0; i < 100; i++) {
        throttleManager.registerScan(barcodeId);
      }

      const entry = throttleManager.getThrottleInfo(barcodeId);
      expect(entry?.attemptCount).toBe(100);
      expect(entry?.isThrottled).toBe(true);
      
      // Should still only count as single barcode in cache
      expect(throttleManager.getCacheSize()).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty barcode IDs gracefully', () => {
      expect(() => throttleManager.registerScan('')).not.toThrow();
      expect(throttleManager.isThrottled('')).toBe(false);
    });

    it('should handle special characters in barcode IDs', () => {
      const specialBarcode = 'BC_2024-01-15_001!@#$%';
      
      expect(() => throttleManager.registerScan(specialBarcode)).not.toThrow();
      expect(throttleManager.isThrottled(specialBarcode)).toBe(false);
    });

    it('should maintain separate throttling for different barcodes', () => {
      const barcode1 = 'BC_2024-01-15_001';
      const barcode2 = 'BC_2024-01-15_002';
      
      // Throttle first barcode
      throttleManager.registerScan(barcode1);
      throttleManager.registerScan(barcode1);
      
      // Second barcode should not be affected
      expect(throttleManager.isThrottled(barcode2)).toBe(false);
      const entry = throttleManager.registerScan(barcode2);
      expect(entry.isThrottled).toBe(false);
    });
  });

  describe('Time-based behavior', () => {
    it('should correctly calculate time differences', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      const firstEntry = throttleManager.registerScan(barcodeId);
      
      // Advance time by 500ms
      jest.advanceTimersByTime(500);
      
      const secondEntry = throttleManager.registerScan(barcodeId);
      
      expect(secondEntry.lastAttemptAt - firstEntry.firstScanAt).toBeGreaterThanOrEqual(500);
      expect(secondEntry.isThrottled).toBe(true);
    });

    it('should handle clock adjustments gracefully', () => {
      // This test ensures the manager doesn't break with system clock changes
      const barcodeId = 'BC_2024-01-15_001';
      
      throttleManager.registerScan(barcodeId);
      
      // Simulate clock going backwards (shouldn't happen but good to test)
      jest.setSystemTime(Date.now() - 10000);
      
      expect(() => throttleManager.isThrottled(barcodeId)).not.toThrow();
      expect(() => throttleManager.registerScan(barcodeId)).not.toThrow();
    });
  });
});