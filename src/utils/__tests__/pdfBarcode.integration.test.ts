import { PDFBarcodeEmbedder } from '../pdfBarcode';
import { PDFDocument } from 'pdf-lib';

// Mock jsbarcode
jest.mock('jsbarcode', () => jest.fn());

// Mock canvas for barcode generation
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillStyle: '#ffffff',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    rect: jest.fn(),
    closePath: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    setTransform: jest.fn(),
    canvas: {
      width: 128,
      height: 32,
      toDataURL: jest.fn(() => 'data:image/png;base64,mockBarcodeImage')
    }
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mockBarcodeImage'),
  width: 128,
  height: 32,
  style: {}
};

Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => mockCanvas),
    addEventListener: jest.fn()
  },
  writable: true
});

// Mock atob function
global.atob = jest.fn((data) => 'mock-binary-data');

describe('PDF Barcode Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDFBarcodeEmbedder.generateBarcodeImage', () => {
    it('should generate barcode image as Uint8Array', () => {
      const barcodeId = 'BC_2024-01-15_001';
      const size = 64;

      const result = PDFBarcodeEmbedder.generateBarcodeImage(barcodeId, size);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
    });

    it('should handle barcode generation errors', () => {
      const barcodeId = 'BC_2024-01-15_001';
      
      // Mock canvas creation to fail
      (document.createElement as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Canvas creation failed');
      });

      expect(() => {
        PDFBarcodeEmbedder.generateBarcodeImage(barcodeId);
      }).toThrow('Canvas creation failed');
    });
  });

  describe('PDFBarcodeEmbedder.calculateOptimalSize', () => {
    it('should calculate appropriate size based on page dimensions', () => {
      const result = PDFBarcodeEmbedder.calculateOptimalSize(612, 792); // Standard A4
      
      expect(result).toBeGreaterThanOrEqual(32); // MIN_SIZE
      expect(result).toBeLessThanOrEqual(128); // MAX_SIZE
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should enforce minimum size constraints', () => {
      const result = PDFBarcodeEmbedder.calculateOptimalSize(100, 100); // Very small page
      
      expect(result).toBeGreaterThanOrEqual(32); // Should be at least MIN_SIZE
    });

    it('should enforce maximum size constraints', () => {
      const result = PDFBarcodeEmbedder.calculateOptimalSize(5000, 5000); // Very large page
      
      expect(result).toBeLessThanOrEqual(128); // Should not exceed MAX_SIZE
    });
  });

  describe('PDFBarcodeEmbedder.calculateBarcodePosition', () => {
    it('should position barcode in bottom-left corner with margin', () => {
      const pageWidth = 612;
      const pageHeight = 792;
      const barcodeSize = 64;

      const position = PDFBarcodeEmbedder.calculateBarcodePosition(
        pageWidth,
        pageHeight,
        barcodeSize
      );

      expect(position.x).toBe(10); // MARGIN
      expect(position.y).toBe(10); // MARGIN (pdf-lib uses bottom-left origin)
      expect(position.size).toBe(64);
    });

    it('should return consistent positioning for different page sizes', () => {
      const result1 = PDFBarcodeEmbedder.calculateBarcodePosition(612, 792, 64);
      const result2 = PDFBarcodeEmbedder.calculateBarcodePosition(1000, 1200, 64);

      // Position should always be at margin regardless of page size
      expect(result1.x).toBe(result2.x);
      expect(result1.y).toBe(result2.y);
    });
  });

  describe('Integration with merge service workflow', () => {
    it('should provide methods needed for PDF processing pipeline', () => {
      // Verify that all necessary static methods exist
      expect(typeof PDFBarcodeEmbedder.generateBarcodeImage).toBe('function');
      expect(typeof PDFBarcodeEmbedder.calculateOptimalSize).toBe('function');
      expect(typeof PDFBarcodeEmbedder.calculateBarcodePosition).toBe('function');
      expect(typeof PDFBarcodeEmbedder.embedBarcodeInPage).toBe('function');
      expect(typeof PDFBarcodeEmbedder.batchEmbedBarcodes).toBe('function');
    });

    it('should handle the complete barcode embedding workflow', () => {
      const barcodeId = 'BC_2024-01-15_001';
      const pageWidth = 612;
      const pageHeight = 792;

      // Step 1: Calculate optimal size
      const optimalSize = PDFBarcodeEmbedder.calculateOptimalSize(pageWidth, pageHeight);
      expect(optimalSize).toBeGreaterThan(0);

      // Step 2: Generate barcode image
      const imageBytes = PDFBarcodeEmbedder.generateBarcodeImage(barcodeId, optimalSize);
      expect(imageBytes).toBeInstanceOf(Uint8Array);

      // Step 3: Calculate position
      const position = PDFBarcodeEmbedder.calculateBarcodePosition(pageWidth, pageHeight, optimalSize);
      expect(position.x).toBe(10);
      expect(position.y).toBe(10);
      expect(position.size).toBe(optimalSize);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid barcode IDs gracefully', () => {
      // Mock JsBarcode to throw an error for invalid input
      const mockJsBarcode = jest.mocked(jest.requireMock('jsbarcode'));
      mockJsBarcode.mockImplementationOnce(() => {
        throw new Error('Invalid barcode data');
      });

      expect(() => {
        PDFBarcodeEmbedder.generateBarcodeImage('');
      }).toThrow('Failed to generate barcode image for : Error: Invalid barcode data');
    });

    it('should handle extreme page dimensions', () => {
      // Very small page
      const smallResult = PDFBarcodeEmbedder.calculateOptimalSize(10, 10);
      expect(smallResult).toBe(32); // Should default to MIN_SIZE

      // Very large page  
      const largeResult = PDFBarcodeEmbedder.calculateOptimalSize(10000, 10000);
      expect(largeResult).toBe(128); // Should cap at MAX_SIZE
    });

    it('should handle zero or negative dimensions', () => {
      const result = PDFBarcodeEmbedder.calculateOptimalSize(0, 0);
      expect(result).toBe(32); // Should default to MIN_SIZE
    });

    it('should maintain type safety with barcode positioning', () => {
      const position = PDFBarcodeEmbedder.calculateBarcodePosition(612, 792, 64);
      
      expect(typeof position.x).toBe('number');
      expect(typeof position.y).toBe('number');
      expect(typeof position.size).toBe('number');
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and optimization', () => {
    it('should generate consistent barcode sizes', () => {
      const barcodeId = 'BC_2024-01-15_001';
      const size = 64;

      const image1 = PDFBarcodeEmbedder.generateBarcodeImage(barcodeId, size);
      const image2 = PDFBarcodeEmbedder.generateBarcodeImage(barcodeId, size);

      // Should generate consistent output for same inputs
      expect(image1.length).toEqual(image2.length);
    });

    it('should handle batch processing requirements', () => {
      // Verify that the API supports the patterns needed for batch processing
      const barcodeIds = ['BC_2024-01-15_001', 'BC_2024-01-15_002', 'BC_2024-01-15_003'];
      
      const images = barcodeIds.map(id => 
        PDFBarcodeEmbedder.generateBarcodeImage(id, 64)
      );

      expect(images).toHaveLength(3);
      images.forEach(image => {
        expect(image).toBeInstanceOf(Uint8Array);
      });
    });
  });
});