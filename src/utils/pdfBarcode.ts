import { PDFDocument, PDFPage, PDFImage } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import { BarcodeEmbedding } from '../types/barcode';

/**
 * Utility class for embedding barcodes into PDF pages
 * Handles QR code generation and positioning at bottom-left corner
 */
export class PDFBarcodeEmbedder {
  private static readonly DEFAULT_BARCODE_SIZE = 64; // Minimum viable size for reliable scanning
  private static readonly MARGIN = 10; // Margin from page edges
  private static readonly MIN_SIZE = 32; // Absolute minimum barcode size
  private static readonly MAX_SIZE = 128; // Maximum barcode size

  /**
   * Generate barcode image as PNG bytes
   * Creates a compact barcode optimized for PDF embedding
   */
  static generateBarcodeImage(barcodeId: string, size: number = PDFBarcodeEmbedder.DEFAULT_BARCODE_SIZE): Uint8Array {
    // Create a canvas element for barcode generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context for barcode generation');
    }

    try {
      // Set canvas dimensions
      canvas.width = size;
      canvas.height = size;
      
      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      
      // Generate barcode using JsBarcode with CODE128 format
      JsBarcode(canvas, barcodeId, {
        format: 'CODE128',
        width: 1,
        height: Math.floor(size * 0.8), // 80% of canvas height for barcode
        displayValue: false, // Don't show text below barcode
        margin: 2, // Minimal margin
        background: '#ffffff',
        lineColor: '#000000',
        fontSize: 8 // Small font for minimal space usage
      });
      
      // Convert canvas to PNG bytes
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      throw new Error(`Failed to generate barcode image for ${barcodeId}: ${error}`);
    }
  }

  /**
   * Calculate optimal barcode size based on page dimensions
   * Ensures barcode is visible but doesn't interfere with content
   */
  static calculateOptimalSize(pageWidth: number, pageHeight: number): number {
    // Use 5% of the smaller dimension, but constrain to min/max bounds
    const basedOnDimension = Math.min(pageWidth, pageHeight) * 0.05;
    const optimalSize = Math.max(
      PDFBarcodeEmbedder.MIN_SIZE,
      Math.min(PDFBarcodeEmbedder.MAX_SIZE, basedOnDimension)
    );
    
    return Math.floor(optimalSize);
  }

  /**
   * Calculate barcode position for bottom-left corner placement
   * Accounts for margins and page dimensions
   */
  static calculateBarcodePosition(
    pageWidth: number,
    pageHeight: number,
    barcodeSize: number
  ): BarcodeEmbedding {
    return {
      x: PDFBarcodeEmbedder.MARGIN,
      y: PDFBarcodeEmbedder.MARGIN, // pdf-lib uses bottom-left origin
      size: barcodeSize
    };
  }

  /**
   * Embed barcode into a PDF page at bottom-left corner
   * Returns the embedded image for potential reuse
   */
  static async embedBarcodeInPage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    barcodeId: string,
    customSize?: number
  ): Promise<PDFImage> {
    try {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Calculate optimal size if not provided
      const barcodeSize = customSize || PDFBarcodeEmbedder.calculateOptimalSize(pageWidth, pageHeight);
      
      // Generate barcode image
      const barcodeImageBytes = PDFBarcodeEmbedder.generateBarcodeImage(barcodeId, barcodeSize);
      
      // Embed image in PDF document
      const barcodeImage = await pdfDoc.embedPng(barcodeImageBytes);
      
      // Calculate position for bottom-left corner
      const position = PDFBarcodeEmbedder.calculateBarcodePosition(pageWidth, pageHeight, barcodeSize);
      
      // Draw barcode on page
      page.drawImage(barcodeImage, {
        x: position.x,
        y: position.y,
        width: position.size,
        height: position.size,
        opacity: 1.0
      });
      
      return barcodeImage;
    } catch (error) {
      throw new Error(`Failed to embed barcode ${barcodeId} in PDF page: ${error}`);
    }
  }

  /**
   * Batch embed barcodes into multiple pages
   * Optimized for processing multiple pages with different barcodes
   */
  static async batchEmbedBarcodes(
    pdfDoc: PDFDocument,
    embeddingRequests: Array<{
      page: PDFPage;
      barcodeId: string;
      customSize?: number;
    }>
  ): Promise<PDFImage[]> {
    const embeddedImages: PDFImage[] = [];
    
    for (const request of embeddingRequests) {
      try {
        const image = await PDFBarcodeEmbedder.embedBarcodeInPage(
          pdfDoc,
          request.page,
          request.barcodeId,
          request.customSize
        );
        embeddedImages.push(image);
      } catch (error) {
        console.error(`Failed to embed barcode ${request.barcodeId}:`, error);
        // Continue with other embeddings even if one fails
      }
    }
    
    return embeddedImages;
  }

  /**
   * Validate if barcode can be embedded on page without overlap
   * Checks if bottom-left corner has sufficient space
   */
  static validateBarcodeSpace(
    pageWidth: number,
    pageHeight: number,
    barcodeSize?: number
  ): {
    canEmbed: boolean;
    recommendedSize: number;
    position: BarcodeEmbedding;
  } {
    const size = barcodeSize || PDFBarcodeEmbedder.calculateOptimalSize(pageWidth, pageHeight);
    const position = PDFBarcodeEmbedder.calculateBarcodePosition(pageWidth, pageHeight, size);
    
    // Check if barcode fits within page bounds
    const fitsHorizontally = position.x + size <= pageWidth;
    const fitsVertically = position.y + size <= pageHeight;
    const canEmbed = fitsHorizontally && fitsVertically;
    
    // If it doesn't fit, calculate a smaller size that would fit
    let recommendedSize = size;
    if (!canEmbed) {
      const maxWidth = pageWidth - (PDFBarcodeEmbedder.MARGIN * 2);
      const maxHeight = pageHeight - (PDFBarcodeEmbedder.MARGIN * 2);
      recommendedSize = Math.max(
        PDFBarcodeEmbedder.MIN_SIZE,
        Math.min(maxWidth, maxHeight)
      );
    }
    
    return {
      canEmbed,
      recommendedSize,
      position
    };
  }

  /**
   * Check if a specific area of the page is clear for barcode placement
   * This can be extended to detect existing content conflicts
   */
  static isAreaClear(
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    // Basic implementation - in a real scenario, you might want to analyze page content
    // For now, we assume bottom-left corner is typically clear in invoice PDFs
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // Check bounds
    if (x < 0 || y < 0 || x + width > pageWidth || y + height > pageHeight) {
      return false;
    }
    
    // For invoice PDFs, bottom-left corner is usually clear
    // This could be enhanced with actual content detection if needed
    return true;
  }

  /**
   * Create a test barcode for validation purposes
   * Useful for testing barcode generation and scanning
   */
  static createTestBarcode(size: number = PDFBarcodeEmbedder.DEFAULT_BARCODE_SIZE): Uint8Array {
    const testBarcodeId = `TEST_${new Date().toISOString().split('T')[0]}_001`;
    return PDFBarcodeEmbedder.generateBarcodeImage(testBarcodeId, size);
  }

  /**
   * Get barcode embedding configuration for a specific page
   * Returns optimal settings for the given page dimensions
   */
  static getBarcodeConfig(pageWidth: number, pageHeight: number): {
    size: number;
    position: BarcodeEmbedding;
    canEmbed: boolean;
  } {
    const validation = PDFBarcodeEmbedder.validateBarcodeSpace(pageWidth, pageHeight);
    
    return {
      size: validation.recommendedSize,
      position: validation.position,
      canEmbed: validation.canEmbed
    };
  }
}

/**
 * Utility functions for barcode data URL handling
 */
export class BarcodeDataUtils {
  /**
   * Convert barcode ID to QR code data URL
   * For use in React components that need to display barcodes
   */
  static generateBarcodeDataUrl(barcodeId: string, size: number = 64): string {
    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, barcodeId, {
        format: 'CODE128',
        width: 1,
        height: size,
        displayValue: false,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000'
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      throw new Error(`Failed to generate barcode data URL for ${barcodeId}: ${error}`);
    }
  }

  /**
   * Validate if a barcode ID can be successfully encoded
   */
  static validateBarcodeContent(barcodeId: string): boolean {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeId, { format: 'CODE128' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get barcode dimensions for a given size
   */
  static getBarcodeDimensions(size: number): { width: number; height: number } {
    return {
      width: size,
      height: size
    };
  }
}

/**
 * Error handling for barcode operations
 */
export class BarcodeError extends Error {
  constructor(
    message: string,
    public readonly barcodeId?: string,
    public readonly operation?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BarcodeError';
  }
}

// Re-export types for convenience
export type { BarcodeEmbedding } from '../types/barcode';