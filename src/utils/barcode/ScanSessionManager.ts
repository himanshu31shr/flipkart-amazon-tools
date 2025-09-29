import { 
  ScanSession, 
  ScanHistoryEntry, 
  SessionStatistics, 
  ScanningResult 
} from '../../types/barcode';

/**
 * Manages scanning session state and statistics
 * Provides comprehensive tracking of scan productivity and history
 */
export class ScanSessionManager {
  private currentSession: ScanSession | null = null;

  /**
   * Start a new scanning session
   * @returns Newly created session
   */
  startSession(): ScanSession {
    const now = new Date().toISOString();
    const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      sessionId,
      isActive: true,
      startedAt: now,
      lastActivity: now,
      scanHistory: [],
      statistics: this.createInitialStatistics(now),
      throttledBarcodes: new Map()
    };

    return this.currentSession;
  }

  /**
   * Get current active session
   * @returns Current session or null if no active session
   */
  getCurrentSession(): ScanSession | null {
    return this.currentSession;
  }

  /**
   * Check if session is currently active
   * @returns true if session is active, false otherwise
   */
  isSessionActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  /**
   * Add scan result to current session
   * @param barcodeId Scanned barcode identifier
   * @param result Scanning result
   * @param feedbackShown Whether visual feedback was displayed
   */
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

  /**
   * Mark barcode as throttled in current session
   * @param barcodeId Barcode identifier
   * @param timestamp Throttle timestamp
   */
  addThrottledBarcode(barcodeId: string, timestamp: number): void {
    if (!this.currentSession || !this.currentSession.isActive) {
      return;
    }

    this.currentSession.throttledBarcodes.set(barcodeId, timestamp);
    this.updateSessionStatistics();
  }

  /**
   * Remove throttled barcode from session
   * @param barcodeId Barcode identifier to remove
   */
  removeThrottledBarcode(barcodeId: string): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.throttledBarcodes.delete(barcodeId);
  }

  /**
   * Get session scan history
   * @returns Array of scan history entries
   */
  getScanHistory(): ScanHistoryEntry[] {
    return this.currentSession?.scanHistory ?? [];
  }

  /**
   * Get session statistics
   * @returns Current session statistics
   */
  getSessionStatistics(): SessionStatistics | null {
    return this.currentSession?.statistics ?? null;
  }

  /**
   * Get scan history filtered by success status
   * @param successful Filter for successful scans only
   * @returns Filtered scan history
   */
  getFilteredScanHistory(successful?: boolean): ScanHistoryEntry[] {
    const history = this.getScanHistory();
    
    if (successful === undefined) {
      return history;
    }

    return history.filter(entry => entry.result.success === successful);
  }

  /**
   * Get unique scanned barcodes in session
   * @returns Set of unique barcode IDs scanned
   */
  getUniqueScannedBarcodes(): Set<string> {
    const history = this.getScanHistory();
    return new Set(history.map(entry => entry.barcodeId));
  }

  /**
   * Check if barcode was already scanned in session
   * @param barcodeId Barcode identifier to check
   * @returns true if barcode was scanned, false otherwise
   */
  wasBarcodeScanned(barcodeId: string): boolean {
    const history = this.getScanHistory();
    return history.some(entry => 
      entry.barcodeId === barcodeId && entry.result.success
    );
  }

  /**
   * Get most recent scan for a specific barcode
   * @param barcodeId Barcode identifier
   * @returns Most recent scan entry or undefined
   */
  getLastScanForBarcode(barcodeId: string): ScanHistoryEntry | undefined {
    const history = this.getScanHistory();
    const barcodeScans = history.filter(entry => entry.barcodeId === barcodeId);
    return barcodeScans.length > 0 ? barcodeScans[barcodeScans.length - 1] : undefined;
  }

  /**
   * End current session
   * @returns Final session statistics
   */
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

  /**
   * Reset current session (clear history but keep session active)
   */
  resetSession(): void {
    if (!this.currentSession) {
      return;
    }

    const now = new Date().toISOString();
    this.currentSession.scanHistory = [];
    this.currentSession.throttledBarcodes.clear();
    this.currentSession.lastActivity = now;
    this.currentSession.statistics = this.createInitialStatistics(this.currentSession.startedAt);
  }

  /**
   * Get session duration in milliseconds
   * @returns Session duration or 0 if no active session
   */
  getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }

    const startTime = new Date(this.currentSession.startedAt).getTime();
    const currentTime = Date.now();
    return currentTime - startTime;
  }

  /**
   * Export session data for external analysis
   * @returns Complete session data
   */
  exportSessionData(): ScanSession | null {
    if (!this.currentSession) {
      return null;
    }

    // Create deep copy to prevent external modification
    return {
      ...this.currentSession,
      scanHistory: [...this.currentSession.scanHistory],
      statistics: { ...this.currentSession.statistics },
      throttledBarcodes: new Map(this.currentSession.throttledBarcodes)
    };
  }

  /**
   * Create initial statistics for a new session
   * @param startTime Session start timestamp
   * @returns Initial session statistics
   */
  private createInitialStatistics(startTime: string): SessionStatistics {
    return {
      totalScanned: 0,
      successfulScans: 0,
      failedScans: 0,
      duplicateAttempts: 0,
      sessionStarted: startTime,
      sessionDuration: 0,
      averageScanInterval: 0
    };
  }

  /**
   * Update session statistics based on current data
   */
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

  /**
   * Calculate average time between scans
   * @returns Average interval in milliseconds
   */
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