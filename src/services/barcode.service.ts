import { format } from 'date-fns';
import { Timestamp, where } from 'firebase/firestore';
import JsBarcode from 'jsbarcode';
import { 
  OrderBarcode, 
  BarcodeGenerationResult, 
  BarcodeGenerationOptions, 
  ScanningResult,
  BarcodeValidation 
} from '../types/barcode';
import { FirebaseService } from './firebase.service';

/**
 * Service for managing order barcodes and QR codes
 * Handles barcode generation, storage, lookup, and completion tracking
 */
export class BarcodeService extends FirebaseService {
  private readonly COLLECTION_NAME = 'order-barcodes';
  private readonly DEFAULT_QR_SIZE = 64; // Minimum viable size for reliable scanning
  private readonly MAX_RETRY_ATTEMPTS = 5;

  constructor() {
    super();
  }

  /**
   * Convert date string to compact Julian day format (YYDDD)
   * @param dateString - Date in YYYY-MM-DD format
   * @returns Compact date string (e.g., "25005" for Jan 5, 2025)
   */
  private getCompactDateFormat(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00'); // Ensure consistent parsing
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits
    
    // Calculate Julian day (day of year)
    const start = new Date(date.getFullYear(), 0, 1); // Jan 1st of same year
    const diff = date.getTime() - start.getTime();
    const julianDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // +1 because Jan 1 = day 1
    const paddedJulianDay = julianDay.toString().padStart(3, '0');
    
    return `${year}${paddedJulianDay}`;
  }

  /**
   * Convert compact Julian day format back to full date (YYDDD → YYYY-MM-DD)
   * @param compactDate - Compact date string (e.g., "25005")
   * @returns Full date string in YYYY-MM-DD format or null if invalid
   */
  private parseCompactDateFormat(compactDate: string): string | null {
    if (compactDate.length !== 5) return null;
    
    const year = parseInt(compactDate.substring(0, 2), 10);
    const julianDay = parseInt(compactDate.substring(2, 5), 10);
    
    if (isNaN(year) || isNaN(julianDay) || julianDay < 1 || julianDay > 366) {
      return null;
    }
    
    // Convert 2-digit year to 4-digit (assuming 2000s)
    const fullYear = 2000 + year;
    
    // Convert Julian day to actual date
    const startOfYear = new Date(fullYear, 0, 1);
    const targetDate = new Date(startOfYear.getTime() + (julianDay - 1) * 24 * 60 * 60 * 1000);
    
    // Validate the date is within the correct year
    if (targetDate.getFullYear() !== fullYear) {
      return null;
    }
    
    return format(targetDate, 'yyyy-MM-dd');
  }

  /**
   * Generate a unique barcode ID with collision detection
   * Format: YYDDDN (YY = year, DDD = Julian day, N = sequence)
   */
  private async generateUniqueBarcodeId(
    date: string, 
    maxRetries: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<string> {
    try {
      // First, get the count of existing barcodes for this date to start from the next available sequence
      const existingBarcodes = await this.getDocuments<OrderBarcode>(
        this.COLLECTION_NAME,
        [where('dateDocId', '==', date)]
      );
      
      const existingCount = existingBarcodes.length;
      const startSequence = existingCount + 1;
      
      // Try up to maxRetries starting from the next logical sequence
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const sequence = String(startSequence + attempt); // No padding for minimal width
        const compactDate = this.getCompactDateFormat(date);
        const barcodeId = `${compactDate}${sequence}`;
        
        // Check if this barcode ID already exists (double-check for race conditions)
        const existing = await this.getDocument<OrderBarcode>(
          this.COLLECTION_NAME,
          barcodeId
        );
        
        if (!existing) {
          return barcodeId;
        }
      }
      
      throw new Error(`Failed to generate unique barcode ID after ${maxRetries} attempts for date ${date} (starting from sequence ${startSequence})`);
    } catch {
      // Fallback to original logic if query fails
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const sequence = String(attempt); // No padding for minimal width
        const compactDate = this.getCompactDateFormat(date);
        const barcodeId = `${compactDate}${sequence}`;
        
        // Check if this barcode ID already exists
        const existing = await this.getDocument<OrderBarcode>(
          this.COLLECTION_NAME,
          barcodeId
        );
        
        if (!existing) {
          return barcodeId;
        }
      }
      
      throw new Error(`Failed to generate unique barcode ID after ${maxRetries} attempts for date ${date}`);
    }
  }

  /**
   * Generate barcode as base64 data URL
   * Creates a proper barcode that can be scanned by camera
   */
  private generateBarcode(barcodeId: string, width: number = 2, height: number = 100): string {
    try {
      // Create a canvas element for barcode generation
      const canvas = document.createElement('canvas');
      
      // Generate barcode using JsBarcode
      JsBarcode(canvas, barcodeId, {
        format: 'CODE128', // Use CODE128 format for alphanumeric support
        width: width,
        height: height,
        displayValue: true,
        fontSize: 16,
        textAlign: 'center',
        textPosition: 'bottom'
      });
      
      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      throw new Error(`Failed to generate barcode for ${barcodeId}: ${error}`);
    }
  }

  /**
   * Validate barcode ID format
   * Expected format: BC_YYYY-MM-DD_XXX
   */
  validateBarcodeId(barcodeId: string): BarcodeValidation {
    const pattern = /^BC_(\d{4}-\d{2}-\d{2})_(\d{3})$/;
    const match = barcodeId.match(pattern);
    
    if (!match) {
      return {
        isValid: false,
        error: 'Invalid barcode format. Expected: BC_YYYY-MM-DD_XXX'
      };
    }
    
    const [, dateStr, sequenceStr] = match;
    const sequence = parseInt(sequenceStr, 10);
    
    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateStr)) {
      return {
        isValid: false,
        error: 'Invalid date format in barcode'
      };
    }
    
    return {
      isValid: true,
      date: dateStr,
      sequence: sequence
    };
  }

  /**
   * Generate barcode for an order
   * Creates unique barcode ID, generates QR code, and stores metadata
   */
  async generateBarcodeForOrder(
    dateDocId: string,
    orderIndex: number,
    metadata: {
      productName: string;
      sku?: string;
      quantity: number;
      platform: 'amazon' | 'flipkart';
    },
    orderId?: string,
    options: BarcodeGenerationOptions = { date: dateDocId }
  ): Promise<BarcodeGenerationResult> {
    try {
      // Generate unique barcode ID
      const barcodeId = await this.generateUniqueBarcodeId(
        options.date,
        options.maxRetries || this.MAX_RETRY_ATTEMPTS
      );
      
      // Generate barcode
      const barcodeDataUrl = this.generateBarcode(barcodeId);
      const generatedAt = new Date().toISOString();
      
      // Create barcode record
      const barcodeRecord: OrderBarcode = {
        barcodeId,
        dateDocId,
        orderIndex,
        orderId,
        isCompleted: false,
        metadata: {
          ...metadata,
          generatedAt
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Store in Firebase
      await this.setDocument(this.COLLECTION_NAME, barcodeId, barcodeRecord);
      
      return {
        barcodeId,
        qrCodeDataUrl: barcodeDataUrl, // Keep the same property name for compatibility
        qrCodeContent: barcodeId, // The barcode contains the barcode ID
        generatedAt
      };
    } catch (error) {
      throw new Error(`Failed to generate barcode for order: ${error}`);
    }
  }

  /**
   * Lookup barcode and return associated order data
   * Used during scanning to retrieve order information
   */
  async lookupBarcode(barcodeId: string): Promise<ScanningResult> {
    try {
      // Validate barcode format first using the new compact format
      const validation = this.validateBarcodeFormat(barcodeId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorType: 'INVALID_BARCODE'
        };
      }
      
      // Lookup barcode in database
      const barcodeRecord = await this.getDocument<OrderBarcode>(
        this.COLLECTION_NAME,
        barcodeId
      );
      
      if (!barcodeRecord) {
        return {
          success: false,
          error: 'Barcode not found',
          errorType: 'NOT_FOUND'
        };
      }
      
      // Check if already completed
      if (barcodeRecord.isCompleted) {
        return {
          success: false,
          error: 'Order already completed',
          errorType: 'ALREADY_COMPLETED'
        };
      }
      
      // Return successful lookup with order data
      return {
        success: true,
        barcodeId,
        orderData: {
          productName: barcodeRecord.metadata.productName,
          sku: barcodeRecord.metadata.sku,
          quantity: barcodeRecord.metadata.quantity,
          platform: barcodeRecord.metadata.platform,
          dateDocId: barcodeRecord.dateDocId,
          orderIndex: barcodeRecord.orderIndex
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to lookup barcode: ${error}`,
        errorType: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Mark order as completed via barcode
   * Updates completion status and tracks completion metadata
   */
  async markOrderCompleted(
    barcodeId: string, 
    completedBy: string
  ): Promise<boolean> {
    try {
      const completedAt = new Date().toISOString();
      
      await this.updateDocument<OrderBarcode>(
        this.COLLECTION_NAME,
        barcodeId,
        {
          isCompleted: true,
          completedAt,
          completedBy
        }
      );
      
      return true;
    } catch (error) {
      throw new Error(`Failed to mark order as completed: ${error}`);
    }
  }

  /**
   * Get all barcodes for a specific date
   * Used for completion status management and reporting
   */
  async getBarcodesForDate(dateDocId: string): Promise<OrderBarcode[]> {
    try {
      const barcodes = await this.getDocuments<OrderBarcode>(
        this.COLLECTION_NAME,
        [where('dateDocId', '==', dateDocId)]
      );
      
      return barcodes;
    } catch (error) {
      throw new Error(`Failed to get barcodes for date ${dateDocId}: ${error}`);
    }
  }

  /**
   * Get completion statistics for a date
   * Returns completion metrics for dashboard display
   */
  async getCompletionStats(dateDocId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  }> {
    try {
      const barcodes = await this.getBarcodesForDate(dateDocId);
      const total = barcodes.length;
      const completed = barcodes.filter(b => b.isCompleted).length;
      const pending = total - completed;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        total,
        completed,
        pending,
        completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      throw new Error(`Failed to get completion stats for ${dateDocId}: ${error}`);
    }
  }

  /**
   * Batch generate barcodes for multiple orders
   * Optimized for PDF processing workflow
   */
  async batchGenerateBarcodes(
    orders: Array<{
      dateDocId: string;
      orderIndex: number;
      metadata: {
        productName: string;
        sku?: string;
        quantity: number;
        platform: 'amazon' | 'flipkart';
      };
      orderId?: string;
    }>,
    options: BarcodeGenerationOptions = { date: format(new Date(), 'yyyy-MM-dd') }
  ): Promise<BarcodeGenerationResult[]> {
    const results: BarcodeGenerationResult[] = [];
    
    for (const order of orders) {
      try {
        const result = await this.generateBarcodeForOrder(
          order.dateDocId,
          order.orderIndex,
          order.metadata,
          order.orderId,
          options
        );
        results.push(result);
      } catch {
        // Continue with other orders on failure
        // Could implement partial failure handling here if needed
      }
    }
    
    return results;
  }

  /**
   * Get detailed completion statistics including top completors
   */
  async getCompletionStatistics(dateDocId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    topCompletors: { userId: string; count: number }[];
  }> {
    try {
      const barcodes = await this.getDocuments(
        this.COLLECTION_NAME,
        [where('dateDocId', '==', dateDocId)]
      ) as OrderBarcode[];
      
      const total = barcodes.length;
      const completed = barcodes.filter(b => b.isCompleted).length;
      const pending = total - completed;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      
      // Calculate top completors
      const completorCounts: Record<string, number> = {};
      barcodes
        .filter(b => b.isCompleted && b.completedBy)
        .forEach(b => {
          const userId = b.completedBy!;
          completorCounts[userId] = (completorCounts[userId] || 0) + 1;
        });
      
      const topCompletors = Object.entries(completorCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        total,
        completed,
        pending,
        completionRate: Math.round(completionRate * 100) / 100,
        topCompletors
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Lookup barcode for product identification purposes
   * Unlike lookupBarcode(), this method returns SKU data even for completed orders
   * Used specifically for product navigation features
   */
  async lookupBarcodeForProductIdentification(barcodeId: string): Promise<{
    success: boolean;
    sku?: string;
    productName?: string;
    platform?: 'amazon' | 'flipkart';
    error?: string;
  }> {
    try {
      // Validate barcode format first
      const validation = this.validateBarcodeFormat(barcodeId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }
      
      // Lookup barcode in database
      const barcodeRecord = await this.getDocument<OrderBarcode>(
        this.COLLECTION_NAME,
        barcodeId
      );
      
      if (!barcodeRecord) {
        return {
          success: false,
          error: 'Barcode not found'
        };
      }
      
      // For product identification, we return the data regardless of completion status
      return {
        success: true,
        sku: barcodeRecord.metadata.sku,
        productName: barcodeRecord.metadata.productName,
        platform: barcodeRecord.metadata.platform
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to lookup barcode for product identification: ${error}`
      };
    }
  }

  /**
   * Validate barcode format and extract components
   */
  validateBarcodeFormat(barcodeId: string): BarcodeValidation {
    // Handle null/undefined inputs
    if (!barcodeId || typeof barcodeId !== 'string') {
      return {
        isValid: false,
        error: 'Invalid barcode format. Expected: YYDDDN (6-8 digits)'
      };
    }

    // New compact format: YYDDDN (6-8 digits: YY + DDD + N+)
    const compactPattern = /^(\d{5})(\d+)$/;
    const match = barcodeId.match(compactPattern);
    
    if (!match) {
      return {
        isValid: false,
        error: 'Invalid barcode format. Expected: YYDDDN (6-8 digits)'
      };
    }
    
    const [, compactDate, sequenceStr] = match;
    
    // Validate compact date format and convert to full date
    const fullDate = this.parseCompactDateFormat(compactDate);
    if (!fullDate) {
      return {
        isValid: false,
        error: 'Invalid date format in barcode'
      };
    }
    
    // Validate sequence format
    const sequence = parseInt(sequenceStr, 10);
    if (isNaN(sequence) || sequence < 1) {
      return {
        isValid: false,
        error: 'Invalid sequence format in barcode'
      };
    }
    
    return {
      isValid: true,
      date: fullDate,
      sequence
    };
  }
}