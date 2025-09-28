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