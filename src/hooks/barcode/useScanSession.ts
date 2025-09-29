import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ScanSession, 
  ScanHistoryEntry, 
  SessionStatistics, 
  ScanningResult 
} from '../../types/barcode';
import { ScanSessionManager } from '../../utils/barcode/ScanSessionManager';

interface UseScanSessionReturn {
  /** Current active session */
  session: ScanSession | null;
  /** Whether session is active */
  isActive: boolean;
  /** Session scan history */
  scanHistory: ScanHistoryEntry[];
  /** Session statistics */
  statistics: SessionStatistics | null;
  /** Start new scanning session */
  startSession: () => ScanSession;
  /** End current session */
  endSession: () => SessionStatistics | null;
  /** Add scan to current session */
  addScan: (barcodeId: string, result: ScanningResult, feedbackShown?: boolean) => void;
  /** Add throttled barcode to session */
  addThrottledBarcode: (barcodeId: string, timestamp: number) => void;
  /** Reset current session */
  resetSession: () => void;
  /** Check if barcode was already scanned */
  wasBarcodeScanned: (barcodeId: string) => boolean;
  /** Get unique scanned barcodes */
  getUniqueScannedBarcodes: () => Set<string>;
  /** Export session data */
  exportSessionData: () => ScanSession | null;
}

/**
 * Custom hook for managing barcode scanning sessions
 * Provides comprehensive session state management and productivity tracking
 */
export const useScanSession = (): UseScanSessionReturn => {
  const sessionManagerRef = useRef(new ScanSessionManager());
  const [session, setSession] = useState<ScanSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);

  const sessionManager = sessionManagerRef.current;

  /**
   * Update component state from session manager
   */
  const updateStateFromSession = useCallback(() => {
    const currentSession = sessionManager.getCurrentSession();
    setSession(currentSession);
    setIsActive(sessionManager.isSessionActive());
    setScanHistory(sessionManager.getScanHistory());
    setStatistics(sessionManager.getSessionStatistics());
  }, [sessionManager]);

  /**
   * Start new scanning session
   */
  const startSession = useCallback((): ScanSession => {
    const newSession = sessionManager.startSession();
    updateStateFromSession();
    return newSession;
  }, [sessionManager, updateStateFromSession]);

  /**
   * End current session
   */
  const endSession = useCallback((): SessionStatistics | null => {
    const finalStats = sessionManager.endSession();
    updateStateFromSession();
    return finalStats;
  }, [sessionManager, updateStateFromSession]);

  /**
   * Add scan result to current session
   */
  const addScan = useCallback((
    barcodeId: string, 
    result: ScanningResult, 
    feedbackShown: boolean = false
  ) => {
    sessionManager.addScanToSession(barcodeId, result, feedbackShown);
    updateStateFromSession();
  }, [sessionManager, updateStateFromSession]);

  /**
   * Add throttled barcode to session
   */
  const addThrottledBarcode = useCallback((barcodeId: string, timestamp: number) => {
    sessionManager.addThrottledBarcode(barcodeId, timestamp);
    updateStateFromSession();
  }, [sessionManager, updateStateFromSession]);

  /**
   * Reset current session
   */
  const resetSession = useCallback(() => {
    sessionManager.resetSession();
    updateStateFromSession();
  }, [sessionManager, updateStateFromSession]);

  /**
   * Check if barcode was already scanned in session
   */
  const wasBarcodeScanned = useCallback((barcodeId: string): boolean => {
    return sessionManager.wasBarcodeScanned(barcodeId);
  }, [sessionManager]);

  /**
   * Get unique scanned barcodes
   */
  const getUniqueScannedBarcodes = useCallback((): Set<string> => {
    return sessionManager.getUniqueScannedBarcodes();
  }, [sessionManager]);

  /**
   * Export session data
   */
  const exportSessionData = useCallback((): ScanSession | null => {
    return sessionManager.exportSessionData();
  }, [sessionManager]);

  // Update state on mount
  useEffect(() => {
    updateStateFromSession();
  }, [updateStateFromSession]);

  return {
    session,
    isActive,
    scanHistory,
    statistics,
    startSession,
    endSession,
    addScan,
    addThrottledBarcode,
    resetSession,
    wasBarcodeScanned,
    getUniqueScannedBarcodes,
    exportSessionData
  };
};