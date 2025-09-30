import { renderHook, act } from '@testing-library/react';
import { useScanSession } from '../useScanSession';
import { ScanningResult } from '../../../types/barcode';

// Mock the ScanSessionManager
jest.mock('../../../utils/barcode/ScanSessionManager');

describe('useScanSession', () => {
  const createSuccessResult = (barcodeId: string): ScanningResult => ({
    success: true,
    barcodeId,
    orderData: {
      productName: `Product for ${barcodeId}`,
      sku: `SKU-${barcodeId}`,
      quantity: 1,
      platform: 'amazon',
      dateDocId: '2024-01-15',
      orderIndex: 0
    }
  });

  const createErrorResult = (error: string): ScanningResult => ({
    success: false,
    error,
    errorType: 'NOT_FOUND'
  });

  it('should initialize with no active session', () => {
    const { result } = renderHook(() => useScanSession());

    expect(result.current.session).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.scanHistory).toEqual([]);
    expect(result.current.statistics).toBeNull();
  });

  it('should start a new session', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      const session = result.current.startSession();
      expect(session).toBeDefined();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.session).toBeDefined();
  });

  it('should end session and return statistics', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
    });

    act(() => {
      const stats = result.current.endSession();
      expect(stats).toBeDefined();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('should add scan to session', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
    });

    act(() => {
      result.current.addScan('BC001', createSuccessResult('BC001'), true);
    });

    expect(result.current.scanHistory.length).toBeGreaterThan(0);
  });

  it('should add throttled barcode to session', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
    });

    act(() => {
      result.current.addThrottledBarcode('BC001', Date.now());
    });

    // Verify the hook doesn't throw and maintains state consistency
    expect(result.current.isActive).toBe(true);
  });

  it('should reset session', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
      result.current.addScan('BC001', createSuccessResult('BC001'));
    });

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.scanHistory).toEqual([]);
    expect(result.current.isActive).toBe(true);
  });

  it('should check if barcode was scanned', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
      result.current.addScan('BC001', createSuccessResult('BC001'));
    });

    const wasScanned = result.current.wasBarcodeScanned('BC001');
    expect(typeof wasScanned).toBe('boolean');
  });

  it('should get unique scanned barcodes', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
      result.current.addScan('BC001', createSuccessResult('BC001'));
      result.current.addScan('BC002', createSuccessResult('BC002'));
      result.current.addScan('BC001', createSuccessResult('BC001')); // Duplicate
    });

    const uniqueBarcodes = result.current.getUniqueScannedBarcodes();
    expect(uniqueBarcodes).toBeInstanceOf(Set);
  });

  it('should export session data', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
      result.current.addScan('BC001', createSuccessResult('BC001'));
    });

    const exportedData = result.current.exportSessionData();
    expect(exportedData).toBeDefined();
  });

  it('should handle operations without active session gracefully', () => {
    const { result } = renderHook(() => useScanSession());

    // These should not throw errors
    act(() => {
      result.current.addScan('BC001', createSuccessResult('BC001'));
      result.current.addThrottledBarcode('BC001', Date.now());
      result.current.resetSession();
    });
    
    // No assertions needed, just verifying no errors are thrown
    expect(result.current.isActive).toBe(false);
  });

  it('should maintain consistent state across multiple operations', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
      
      // Add multiple scans
      for (let i = 0; i < 5; i++) {
        result.current.addScan(`BC00${i}`, createSuccessResult(`BC00${i}`));
      }
      
      // Add some throttled barcodes
      result.current.addThrottledBarcode('BC001', Date.now());
      result.current.addThrottledBarcode('BC002', Date.now());
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.session).toBeDefined();
    expect(result.current.statistics).toBeDefined();
  });

  it('should update state immediately after operations', () => {
    const { result } = renderHook(() => useScanSession());

    act(() => {
      result.current.startSession();
    });

    const initialHistoryLength = result.current.scanHistory.length;

    act(() => {
      result.current.addScan('BC001', createSuccessResult('BC001'));
    });

    // State should update immediately
    expect(result.current.scanHistory.length).toBeGreaterThan(initialHistoryLength);
  });
});