import { ScanSessionManager } from '../ScanSessionManager';
import { ScanningResult } from '../../../types/barcode';

// Mock timers for testing
jest.useFakeTimers();

describe('ScanSessionManager', () => {
  let sessionManager: ScanSessionManager;

  beforeEach(() => {
    sessionManager = new ScanSessionManager();
    jest.clearAllTimers();
  });

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

  describe('Session lifecycle', () => {
    it('should start with no active session', () => {
      expect(sessionManager.getCurrentSession()).toBeNull();
      expect(sessionManager.isSessionActive()).toBe(false);
    });

    it('should create new session on start', () => {
      const session = sessionManager.startSession();
      
      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^scan_\d+_[a-z0-9]+$/);
      expect(session.isActive).toBe(true);
      expect(session.scanHistory).toEqual([]);
      expect(session.statistics.totalScanned).toBe(0);
    });

    it('should end session and return statistics', () => {
      sessionManager.startSession();
      
      // Add some scan data
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      
      const finalStats = sessionManager.endSession();
      
      expect(finalStats).toBeDefined();
      expect(finalStats?.totalScanned).toBe(1);
      expect(sessionManager.getCurrentSession()).toBeNull();
      expect(sessionManager.isSessionActive()).toBe(false);
    });

    it('should handle ending session when none exists', () => {
      const result = sessionManager.endSession();
      expect(result).toBeNull();
    });
  });

  describe('Scan tracking', () => {
    beforeEach(() => {
      sessionManager.startSession();
    });

    it('should add successful scan to session', () => {
      const barcodeId = 'BC001';
      const result = createSuccessResult(barcodeId);
      
      sessionManager.addScanToSession(barcodeId, result, true);
      
      const history = sessionManager.getScanHistory();
      expect(history).toHaveLength(1);
      expect(history[0].barcodeId).toBe(barcodeId);
      expect(history[0].result).toEqual(result);
      expect(history[0].feedbackShown).toBe(true);
    });

    it('should add failed scan to session', () => {
      const barcodeId = 'BC001';
      const result = createErrorResult('Barcode not found');
      
      sessionManager.addScanToSession(barcodeId, result, false);
      
      const history = sessionManager.getScanHistory();
      expect(history).toHaveLength(1);
      expect(history[0].result.success).toBe(false);
      expect(history[0].feedbackShown).toBe(false);
    });

    it('should track multiple scans in order', () => {
      const scans = ['BC001', 'BC002', 'BC003'];
      
      scans.forEach((barcodeId, index) => {
        jest.advanceTimersByTime(1000); // Add time between scans
        sessionManager.addScanToSession(barcodeId, createSuccessResult(barcodeId));
      });

      const history = sessionManager.getScanHistory();
      expect(history).toHaveLength(3);
      
      // Check chronological order
      scans.forEach((barcodeId, index) => {
        expect(history[index].barcodeId).toBe(barcodeId);
      });
    });

    it('should ignore scans when no active session', () => {
      sessionManager.endSession();
      
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      
      expect(sessionManager.getScanHistory()).toEqual([]);
    });
  });

  describe('Throttle tracking', () => {
    beforeEach(() => {
      sessionManager.startSession();
    });

    it('should track throttled barcodes', () => {
      const barcodeId = 'BC001';
      const timestamp = Date.now();
      
      sessionManager.addThrottledBarcode(barcodeId, timestamp);
      
      const session = sessionManager.getCurrentSession();
      expect(session?.throttledBarcodes.has(barcodeId)).toBe(true);
      expect(session?.throttledBarcodes.get(barcodeId)).toBe(timestamp);
    });

    it('should remove throttled barcodes', () => {
      const barcodeId = 'BC001';
      
      sessionManager.addThrottledBarcode(barcodeId, Date.now());
      expect(sessionManager.getCurrentSession()?.throttledBarcodes.has(barcodeId)).toBe(true);
      
      sessionManager.removeThrottledBarcode(barcodeId);
      expect(sessionManager.getCurrentSession()?.throttledBarcodes.has(barcodeId)).toBe(false);
    });

    it('should ignore throttle operations when no active session', () => {
      sessionManager.endSession();
      
      expect(() => {
        sessionManager.addThrottledBarcode('BC001', Date.now());
        sessionManager.removeThrottledBarcode('BC001');
      }).not.toThrow();
    });
  });

  describe('Statistics calculation', () => {
    beforeEach(() => {
      sessionManager.startSession();
    });

    it('should calculate basic statistics correctly', () => {
      // Add successful scans
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      sessionManager.addScanToSession('BC002', createSuccessResult('BC002'));
      
      // Add failed scan
      sessionManager.addScanToSession('BC003', createErrorResult('Not found'));
      
      // Add throttled barcodes
      sessionManager.addThrottledBarcode('BC001', Date.now());
      
      const stats = sessionManager.getSessionStatistics();
      
      expect(stats?.totalScanned).toBe(3);
      expect(stats?.successfulScans).toBe(2);
      expect(stats?.failedScans).toBe(1);
      expect(stats?.duplicateAttempts).toBe(1);
    });

    it('should calculate session duration', () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);
      
      sessionManager.startSession();
      
      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);
      
      const duration = sessionManager.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(5000);
    });

    it('should calculate average scan interval', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      
      sessionManager.startSession();
      
      // Add scans with consistent intervals
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(2000); // 2 second intervals
        sessionManager.addScanToSession(`BC00${i}`, createSuccessResult(`BC00${i}`));
      }

      const stats = sessionManager.getSessionStatistics();
      expect(stats?.averageScanInterval).toBeCloseTo(2000, -2); // Within 100ms
    });

    it('should handle single scan for average calculation', () => {
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      
      const stats = sessionManager.getSessionStatistics();
      expect(stats?.averageScanInterval).toBe(0);
    });
  });

  describe('Query operations', () => {
    beforeEach(() => {
      sessionManager.startSession();
      
      // Add test data
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      sessionManager.addScanToSession('BC002', createErrorResult('Not found'));
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001')); // Duplicate
    });

    it('should filter successful scans', () => {
      const successfulScans = sessionManager.getFilteredScanHistory(true);
      expect(successfulScans).toHaveLength(2);
      expect(successfulScans.every(scan => scan.result.success)).toBe(true);
    });

    it('should filter failed scans', () => {
      const failedScans = sessionManager.getFilteredScanHistory(false);
      expect(failedScans).toHaveLength(1);
      expect(failedScans.every(scan => !scan.result.success)).toBe(true);
    });

    it('should return all scans when no filter specified', () => {
      const allScans = sessionManager.getFilteredScanHistory();
      expect(allScans).toHaveLength(3);
    });

    it('should get unique scanned barcodes', () => {
      const uniqueBarcodes = sessionManager.getUniqueScannedBarcodes();
      expect(uniqueBarcodes.size).toBe(2);
      expect(uniqueBarcodes.has('BC001')).toBe(true);
      expect(uniqueBarcodes.has('BC002')).toBe(true);
    });

    it('should check if barcode was already scanned successfully', () => {
      expect(sessionManager.wasBarcodeScanned('BC001')).toBe(true);
      expect(sessionManager.wasBarcodeScanned('BC002')).toBe(false); // Failed scan
      expect(sessionManager.wasBarcodeScanned('BC999')).toBe(false); // Never scanned
    });

    it('should get last scan for specific barcode', () => {
      const lastScan = sessionManager.getLastScanForBarcode('BC001');
      expect(lastScan).toBeDefined();
      expect(lastScan?.barcodeId).toBe('BC001');
      expect(lastScan?.result.success).toBe(true);
    });

    it('should return undefined for barcode never scanned', () => {
      const lastScan = sessionManager.getLastScanForBarcode('BC999');
      expect(lastScan).toBeUndefined();
    });
  });

  describe('Session reset', () => {
    beforeEach(() => {
      sessionManager.startSession();
      
      // Add some data
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
      sessionManager.addThrottledBarcode('BC002', Date.now());
    });

    it('should reset session data while keeping session active', () => {
      const sessionId = sessionManager.getCurrentSession()?.sessionId;
      
      sessionManager.resetSession();
      
      const session = sessionManager.getCurrentSession();
      expect(session?.sessionId).toBe(sessionId); // Same session
      expect(session?.isActive).toBe(true);
      expect(session?.scanHistory).toEqual([]);
      expect(session?.throttledBarcodes.size).toBe(0);
      expect(session?.statistics.totalScanned).toBe(0);
    });

    it('should handle reset when no active session', () => {
      sessionManager.endSession();
      
      expect(() => sessionManager.resetSession()).not.toThrow();
    });
  });

  describe('Data export', () => {
    beforeEach(() => {
      sessionManager.startSession();
      sessionManager.addScanToSession('BC001', createSuccessResult('BC001'));
    });

    it('should export complete session data', () => {
      const exportedData = sessionManager.exportSessionData();
      
      expect(exportedData).toBeDefined();
      expect(exportedData?.sessionId).toBeDefined();
      expect(exportedData?.scanHistory).toHaveLength(1);
      expect(exportedData?.statistics).toBeDefined();
    });

    it('should export deep copy of session data', () => {
      const exportedData = sessionManager.exportSessionData();
      const originalSession = sessionManager.getCurrentSession();
      
      // Modify exported data
      exportedData?.scanHistory.push({
        barcodeId: 'BC999',
        scannedAt: new Date().toISOString(),
        result: createSuccessResult('BC999'),
        feedbackShown: false
      });

      // Original should not be affected
      expect(originalSession?.scanHistory).toHaveLength(1);
    });

    it('should return null when no active session', () => {
      sessionManager.endSession();
      
      const exportedData = sessionManager.exportSessionData();
      expect(exportedData).toBeNull();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle operations with null/undefined values gracefully', () => {
      sessionManager.startSession();
      
      expect(() => {
        sessionManager.addScanToSession('', createSuccessResult(''));
        sessionManager.addThrottledBarcode('', 0);
      }).not.toThrow();
    });

    it('should maintain session integrity across multiple operations', () => {
      sessionManager.startSession();
      const initialSessionId = sessionManager.getCurrentSession()?.sessionId;
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        sessionManager.addScanToSession(`BC${i}`, createSuccessResult(`BC${i}`));
        sessionManager.addThrottledBarcode(`BC${i}`, Date.now());
      }

      const session = sessionManager.getCurrentSession();
      expect(session?.sessionId).toBe(initialSessionId);
      expect(session?.isActive).toBe(true);
      expect(session?.scanHistory).toHaveLength(10);
    });

    it('should handle rapid successive operations', () => {
      sessionManager.startSession();
      
      const rapidScans = Array.from({ length: 100 }, (_, i) => `BC${i}`);
      
      rapidScans.forEach(barcodeId => {
        sessionManager.addScanToSession(barcodeId, createSuccessResult(barcodeId));
      });

      const stats = sessionManager.getSessionStatistics();
      expect(stats?.totalScanned).toBe(100);
      expect(stats?.successfulScans).toBe(100);
    });
  });
});