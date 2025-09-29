import { useRef, useCallback, useEffect } from 'react';
import { ThrottleEntry } from '../../types/barcode';
import { ScanThrottleManager } from '../../utils/barcode/ScanThrottleManager';

interface UseScanThrottlingOptions {
  /** Throttle duration in milliseconds (default: 3000) */
  throttleDuration?: number;
  /** Maximum cache size (default: 100) */
  maxCacheSize?: number;
}

interface UseScanThrottlingReturn {
  /** Check if barcode is currently throttled */
  isThrottled: (barcodeId: string) => boolean;
  /** Register a barcode scan attempt */
  registerScan: (barcodeId: string) => ThrottleEntry;
  /** Get throttle information for specific barcode */
  getThrottleInfo: (barcodeId: string) => ThrottleEntry | undefined;
  /** Get all currently throttled barcodes */
  getThrottledBarcodes: () => Map<string, ThrottleEntry>;
  /** Get total duplicate attempts */
  getTotalDuplicateAttempts: () => number;
  /** Clear specific barcode from cache */
  clearBarcode: (barcodeId: string) => void;
  /** Clear all throttle cache */
  clearAll: () => void;
  /** Get current cache size */
  getCacheSize: () => number;
  /** Get throttle configuration */
  getConfig: () => { throttleDuration: number; maxCacheSize: number };
}

/**
 * Custom hook for managing barcode scan throttling
 * Prevents duplicate scans in quick succession with efficient memory management
 */
export const useScanThrottling = (
  options: UseScanThrottlingOptions = {}
): UseScanThrottlingReturn => {
  const { 
    throttleDuration = 3000, 
    maxCacheSize = 100 
  } = options;

  const throttleManagerRef = useRef<ScanThrottleManager | null>(null);

  // Initialize throttle manager
  if (!throttleManagerRef.current) {
    throttleManagerRef.current = new ScanThrottleManager(throttleDuration, maxCacheSize);
  }

  const throttleManager = throttleManagerRef.current;

  /**
   * Check if barcode is currently throttled
   */
  const isThrottled = useCallback((barcodeId: string): boolean => {
    return throttleManager.isThrottled(barcodeId);
  }, [throttleManager]);

  /**
   * Register a barcode scan attempt
   */
  const registerScan = useCallback((barcodeId: string): ThrottleEntry => {
    return throttleManager.registerScan(barcodeId);
  }, [throttleManager]);

  /**
   * Get throttle information for specific barcode
   */
  const getThrottleInfo = useCallback((barcodeId: string): ThrottleEntry | undefined => {
    return throttleManager.getThrottleInfo(barcodeId);
  }, [throttleManager]);

  /**
   * Get all currently throttled barcodes
   */
  const getThrottledBarcodes = useCallback((): Map<string, ThrottleEntry> => {
    return throttleManager.getThrottledBarcodes();
  }, [throttleManager]);

  /**
   * Get total duplicate attempts
   */
  const getTotalDuplicateAttempts = useCallback((): number => {
    return throttleManager.getTotalDuplicateAttempts();
  }, [throttleManager]);

  /**
   * Clear specific barcode from cache
   */
  const clearBarcode = useCallback((barcodeId: string): void => {
    throttleManager.clearBarcode(barcodeId);
  }, [throttleManager]);

  /**
   * Clear all throttle cache
   */
  const clearAll = useCallback((): void => {
    throttleManager.clearAll();
  }, [throttleManager]);

  /**
   * Get current cache size
   */
  const getCacheSize = useCallback((): number => {
    return throttleManager.getCacheSize();
  }, [throttleManager]);

  /**
   * Get throttle configuration
   */
  const getConfig = useCallback((): { throttleDuration: number; maxCacheSize: number } => {
    return throttleManager.getConfig();
  }, [throttleManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleManagerRef.current) {
        throttleManagerRef.current.destroy();
        throttleManagerRef.current = null;
      }
    };
  }, []);

  return {
    isThrottled,
    registerScan,
    getThrottleInfo,
    getThrottledBarcodes,
    getTotalDuplicateAttempts,
    clearBarcode,
    clearAll,
    getCacheSize,
    getConfig
  };
};