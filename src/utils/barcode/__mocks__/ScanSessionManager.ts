import { 
  ScanSession, 
  ScanHistoryEntry, 
  SessionStatistics, 
  ScanningResult 
} from '../../../types/barcode';

/**
 * Mock implementation of ScanSessionManager for testing
 */
export class ScanSessionManager {
  private currentSession: ScanSession | null = null;
  private mockSessionId = 'mock-session-123';

  startSession(): ScanSession {
    const now = new Date().toISOString();
    
    this.currentSession = {
      sessionId: this.mockSessionId,
      isActive: true,
      startedAt: now,
      lastActivity: now,
      scanHistory: [],
      statistics: {
        totalScanned: 0,
        successfulScans: 0,
        failedScans: 0,
        duplicateAttempts: 0,
        sessionStarted: now,
        sessionDuration: 0,
        averageScanInterval: 0
      },
      throttledBarcodes: new Map()
    };

    return this.currentSession;
  }

  getCurrentSession(): ScanSession | null {
    return this.currentSession;
  }

  isSessionActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  addScanToSession(
    barcodeId: string, 
    result: ScanningResult, 
    feedbackShown: boolean = false
  ): void {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    const now = new Date().toISOString();
    
    const historyEntry: ScanHistoryEntry = {
      barcodeId,
      scannedAt: now,
      result,
      feedbackShown
    };

    this.currentSession.scanHistory.push(historyEntry);
    this.currentSession.lastActivity = now;
    this.updateSessionStatistics();
  }

  addThrottledBarcode(barcodeId: string, timestamp: number): void {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    this.currentSession.throttledBarcodes.set(barcodeId, timestamp);
    this.updateSessionStatistics();
  }

  removeThrottledBarcode(barcodeId: string): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.throttledBarcodes.delete(barcodeId);
  }

  getScanHistory(): ScanHistoryEntry[] {
    return this.currentSession?.scanHistory ?? [];
  }

  getSessionStatistics(): SessionStatistics | null {
    return this.currentSession?.statistics ?? null;
  }

  getFilteredScanHistory(successful?: boolean): ScanHistoryEntry[] {
    const history = this.getScanHistory();
    
    if (successful === undefined) {
      return history;
    }

    return history.filter(entry => entry.result.success === successful);
  }

  getUniqueScannedBarcodes(): Set<string> {
    const history = this.getScanHistory();
    return new Set(history.map(entry => entry.barcodeId));
  }

  wasBarcodeScanned(barcodeId: string): boolean {
    const history = this.getScanHistory();
    return history.some(entry => 
      entry.barcodeId === barcodeId && entry.result.success
    );
  }

  getLastScanForBarcode(barcodeId: string): ScanHistoryEntry | undefined {
    const history = this.getScanHistory();
    const barcodeScans = history.filter(entry => entry.barcodeId === barcodeId);
    return barcodeScans.length > 0 ? barcodeScans[barcodeScans.length - 1] : undefined;
  }

  endSession(): SessionStatistics | null {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.isActive = false;
    this.updateSessionStatistics();
    
    const finalStats = { ...this.currentSession.statistics };
    this.currentSession = null;
    
    return finalStats;
  }

  resetSession(): void {
    if (!this.currentSession) {
      return;
    }

    const now = new Date().toISOString();
    this.currentSession.scanHistory = [];
    this.currentSession.throttledBarcodes.clear();
    this.currentSession.lastActivity = now;
    this.currentSession.statistics = {
      totalScanned: 0,
      successfulScans: 0,
      failedScans: 0,
      duplicateAttempts: 0,
      sessionStarted: this.currentSession.startedAt,
      sessionDuration: 0,
      averageScanInterval: 0
    };
  }

  getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }

    const startTime = new Date(this.currentSession.startedAt).getTime();
    const currentTime = Date.now();
    return currentTime - startTime;
  }

  exportSessionData(): ScanSession | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      ...this.currentSession,
      scanHistory: [...this.currentSession.scanHistory],
      statistics: { ...this.currentSession.statistics },
      throttledBarcodes: new Map(this.currentSession.throttledBarcodes)
    };
  }

  private updateSessionStatistics(): void {
    if (!this.currentSession) {
      return;
    }

    const history = this.currentSession.scanHistory;
    const successful = history.filter(entry => entry.result.success);
    const failed = history.filter(entry => !entry.result.success);
    const duplicates = this.currentSession.throttledBarcodes.size;

    this.currentSession.statistics = {
      totalScanned: history.length,
      successfulScans: successful.length,
      failedScans: failed.length,
      duplicateAttempts: duplicates,
      sessionStarted: this.currentSession.startedAt,
      sessionDuration: this.getSessionDuration(),
      averageScanInterval: this.calculateAverageScanInterval()
    };
  }

  private calculateAverageScanInterval(): number {
    const history = this.currentSession?.scanHistory ?? [];
    
    if (history.length < 2) {
      return 0;
    }

    const intervals: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const prevTime = new Date(history[i - 1].scannedAt).getTime();
      const currentTime = new Date(history[i].scannedAt).getTime();
      intervals.push(currentTime - prevTime);
    }

    const totalInterval = intervals.reduce((sum, interval) => sum + interval, 0);
    return totalInterval / intervals.length;
  }
}