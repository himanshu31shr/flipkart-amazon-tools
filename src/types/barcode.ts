import { Timestamp } from 'firebase/firestore';

/**
 * Barcode tracking record for Firestore collection
 * Stores barcode-to-order mappings for efficient scanning lookup
 */
export interface OrderBarcode {
  /** Document ID: Unique barcode identifier (e.g., "BC_2024-01-15_001") */
  barcodeId: string;
  /** Reference to active-orders document (date in YYYY-MM-DD format) */
  dateDocId: string;
  /** Position in orders array (0-based index) */
  orderIndex: number;
  /** Original order ID if available */
  orderId?: string;
  /** Master completion status */
  isCompleted: boolean;
  /** ISO timestamp when order was completed */
  completedAt?: string;
  /** User ID who completed the order */
  completedBy?: string;
  
  /** Order metadata for quick scanning reference */
  metadata: {
    /** Product name for scanning confirmation */
    productName: string;
    /** Product SKU for validation */
    sku?: string;
    /** Order quantity */
    quantity: number;
    /** Platform where order originated */
    platform: 'amazon' | 'flipkart';
    /** ISO timestamp when barcode was created */
    generatedAt: string;
  };
  
  /** Audit trail timestamps */
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Result of barcode generation for PDF processing
 */
export interface BarcodeGenerationResult {
  /** Unique barcode identifier generated */
  barcodeId: string;
  /** Base64 data URL of QR code image for PDF embedding */
  qrCodeDataUrl: string;
  /** Raw QR code content for validation */
  qrCodeContent: string;
  /** Timestamp when barcode was generated */
  generatedAt: string;
}

/**
 * Result of barcode scanning operation
 */
export interface ScanningResult {
  /** Whether scanning was successful */
  success: boolean;
  /** Scanned barcode ID if successful */
  barcodeId?: string;
  /** Associated order data if found */
  orderData?: {
    productName: string;
    sku?: string;
    quantity: number;
    platform: 'amazon' | 'flipkart';
    dateDocId: string;
    orderIndex: number;
  };
  /** Error message if scanning failed */
  error?: string;
  /** Error type for handling different scenarios */
  errorType?: 'CAMERA_DENIED' | 'INVALID_BARCODE' | 'ALREADY_COMPLETED' | 'NETWORK_ERROR' | 'NOT_FOUND';
}

/**
 * Options for barcode generation
 */
export interface BarcodeGenerationOptions {
  /** Date for barcode sequence (YYYY-MM-DD format) */
  date: string;
  /** Maximum retry attempts for collision resolution */
  maxRetries?: number;
  /** QR code size in pixels */
  qrSize?: number;
}

/**
 * Options for barcode scanning
 */
export interface BarcodeScanningOptions {
  /** Timeout for camera operations in milliseconds */
  cameraTimeout?: number;
  /** Whether to enable manual entry fallback */
  enableManualEntry?: boolean;
  /** Custom validation function for scanned codes */
  validateBarcode?: (barcodeId: string) => boolean;
}

/**
 * Barcode embedding position and size for PDF
 */
export interface BarcodeEmbedding {
  /** X coordinate (pixels from left) */
  x: number;
  /** Y coordinate (pixels from bottom) */
  y: number;
  /** QR code size in pixels */
  size: number;
}

/**
 * Enhanced ProductSummary with barcode fields
 * Extends existing ProductSummary interface
 */
export interface ProductSummaryWithBarcode {
  /** Link to barcode document */
  barcodeId?: string;
  /** Synced completion status from barcode collection */
  isCompleted?: boolean;
  /** Synced completion timestamp */
  completedAt?: string;
  /** User who completed the order */
  completedBy?: string;
}

/**
 * Completion status for filtering and display
 */
export type CompletionStatus = 'all' | 'completed' | 'pending';

/**
 * Barcode validation result
 */
export interface BarcodeValidation {
  /** Whether barcode format is valid */
  isValid: boolean;
  /** Extracted date from barcode if valid */
  date?: string;
  /** Extracted sequence number if valid */
  sequence?: number;
  /** Validation error message if invalid */
  error?: string;
}

/**
 * Entry in scanning session history
 */
export interface ScanHistoryEntry {
  /** Unique barcode identifier */
  barcodeId: string;
  /** When barcode was scanned in session */
  scannedAt: string;
  /** Scanning result data */
  result: ScanningResult;
  /** Visual feedback state when scanned */
  feedbackShown: boolean;
}

/**
 * Session statistics for productivity tracking
 */
export interface SessionStatistics {
  /** Total barcodes scanned in session */
  totalScanned: number;
  /** Successfully processed barcodes */
  successfulScans: number;
  /** Failed scan attempts */
  failedScans: number;
  /** Duplicate scan attempts (throttled) */
  duplicateAttempts: number;
  /** Session start time */
  sessionStarted: string;
  /** Session duration in milliseconds */
  sessionDuration: number;
  /** Average time between scans */
  averageScanInterval: number;
}

/**
 * Comprehensive scanning session state
 */
export interface ScanSession {
  /** Unique session identifier */
  sessionId: string;
  /** Whether session is currently active */
  isActive: boolean;
  /** Session start timestamp */
  startedAt: string;
  /** Last activity timestamp */
  lastActivity: string;
  /** History of all scan attempts in session */
  scanHistory: ScanHistoryEntry[];
  /** Session productivity statistics */
  statistics: SessionStatistics;
  /** Map of throttled barcodes (barcodeId -> timestamp) */
  throttledBarcodes: Map<string, number>;
}

/**
 * Configuration for responsive drawer behavior
 */
export interface ResponsiveConfig {
  /** Breakpoint for mobile behavior (px) */
  mobileBreakpoint: number;
  /** Whether to use drawer on mobile */
  useDrawerOnMobile: boolean;
  /** Whether to use dialog on desktop */
  useDialogOnDesktop: boolean;
  /** Full screen on mobile */
  fullScreenMobile: boolean;
  /** Auto-height adjustment */
  autoHeight: boolean;
}

/**
 * Throttle cache entry for duplicate detection
 */
export interface ThrottleEntry {
  /** When barcode was first scanned */
  firstScanAt: number;
  /** When barcode was last attempted */
  lastAttemptAt: number;
  /** Number of throttled attempts */
  attemptCount: number;
  /** Whether cooldown is active */
  isThrottled: boolean;
}

/**
 * Enhanced barcode scanning options with session support
 */
export interface EnhancedBarcodeScanningOptions extends BarcodeScanningOptions {
  /** Throttle duration in milliseconds (default: 3000) */
  throttleDuration?: number;
  /** Maximum throttle cache size (default: 100) */
  maxThrottleCache?: number;
  /** Visual feedback duration in milliseconds (default: 2000) */
  feedbackDuration?: number;
  /** Session persistence across modal reopens */
  persistSession?: boolean;
  /** Responsive configuration */
  responsiveConfig?: ResponsiveConfig;
}

/**
 * Visual feedback states for scan results
 */
export type ScanFeedbackState = 
  | 'idle'
  | 'scanning' 
  | 'success'
  | 'error'
  | 'throttled'
  | 'duplicate';

/**
 * Visual feedback configuration
 */
export interface ScanFeedbackConfig {
  /** Current feedback state */
  state: ScanFeedbackState;
  /** Feedback message to display */
  message: string;
  /** Duration to show feedback (ms) */
  duration: number;
  /** Whether to auto-hide feedback */
  autoHide: boolean;
  /** Color scheme for feedback */
  severity: 'success' | 'error' | 'warning' | 'info';
}