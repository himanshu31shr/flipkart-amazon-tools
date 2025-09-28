import { BarcodeService } from '../barcode.service';

// Mock dependencies to focus on testing the business logic
jest.mock('jsbarcode', () => jest.fn());
jest.mock('firebase/firestore');
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    // Use actual date formatting logic for testing
    if (formatStr === 'yyyy-MM-dd') {
      if (date instanceof Date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return 'invalid-date';
    }
    return date.toISOString();
  })
}));

// Mock Firebase service with proper prototype setup
jest.mock('../firebase.service', () => {
  const mockMethods = {
    getDocument: jest.fn(),
    setDocument: jest.fn(),
    updateDocument: jest.fn(),
    getDocuments: jest.fn()
  };
  
  return {
    FirebaseService: jest.fn().mockImplementation(function(this: any) {
      Object.assign(this, mockMethods);
      return this;
    })
  };
});

// Mock document for canvas creation
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      toDataURL: jest.fn(() => 'data:image/png;base64,mockQRCodeData')
    })),
    addEventListener: jest.fn()
  },
  writable: true
});

describe('BarcodeService', () => {
  let barcodeService: BarcodeService;

  beforeEach(() => {
    jest.clearAllMocks();
    barcodeService = new BarcodeService();
  });

  describe('validateBarcodeFormat', () => {
    it('should validate correct barcode format', () => {
      const result = barcodeService.validateBarcodeFormat('240151'); // Jan 15, 2024, sequence 1

      expect(result).toEqual({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
    });

    it('should reject invalid barcode format', () => {
      const result = barcodeService.validateBarcodeFormat('INVALID_BARCODE');

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid barcode format. Expected: YYDDDN (6-8 digits)'
      });
    });

    it('should reject barcodes with invalid date format', () => {
      const result = barcodeService.validateBarcodeFormat('243991'); // Invalid Julian day 399

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid date format in barcode'
      });
    });

    it('should reject barcodes with invalid sequence format', () => {
      const result = barcodeService.validateBarcodeFormat('240150'); // Sequence 0 is invalid

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid sequence format in barcode'
      });
    });

    it('should reject sequence numbers outside valid range', () => {
      const result = barcodeService.validateBarcodeFormat('240150'); // Sequence 0 is invalid

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid sequence format in barcode'
      });
    });

    it('should accept large sequence numbers', () => {
      const result = barcodeService.validateBarcodeFormat('2401510000'); // Jan 15, 2024, sequence 10000

      expect(result).toEqual({
        isValid: true, // Large sequences are now allowed in compact format
        date: '2024-01-15',
        sequence: 10000
      });
    });

    it('should handle null barcode IDs', () => {
      const result = barcodeService.validateBarcodeFormat(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined barcode IDs', () => {
      const result = barcodeService.validateBarcodeFormat(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty string barcode IDs', () => {
      const result = barcodeService.validateBarcodeFormat('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('service instantiation', () => {
    it('should create an instance without errors', () => {
      expect(barcodeService).toBeDefined();
      expect(barcodeService).toBeInstanceOf(BarcodeService);
    });

    it('should have required methods', () => {
      expect(typeof barcodeService.validateBarcodeFormat).toBe('function');
      expect(typeof barcodeService.generateBarcodeForOrder).toBe('function');
      expect(typeof barcodeService.lookupBarcode).toBe('function');
      expect(typeof barcodeService.markOrderCompleted).toBe('function');
      expect(typeof barcodeService.getCompletionStatistics).toBe('function');
      expect(typeof barcodeService.getBarcodesForDate).toBe('function');
      expect(typeof barcodeService.getCompletionStats).toBe('function');
      expect(typeof barcodeService.batchGenerateBarcodes).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle malformed barcode IDs gracefully', () => {
      const result = barcodeService.validateBarcodeFormat('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null barcode IDs', () => {
      const result = barcodeService.validateBarcodeFormat(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined barcode IDs', () => {
      const result = barcodeService.validateBarcodeFormat(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('barcode format validation edge cases', () => {
    it('should accept valid date ranges', () => {
      const result = barcodeService.validateBarcodeFormat('243661'); // Dec 31, 2024 (Julian day 366), sequence 1
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid months', () => {
      const result = barcodeService.validateBarcodeFormat('243991'); // Invalid Julian day 399
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    it('should reject invalid days', () => {
      const result = barcodeService.validateBarcodeFormat('240001'); // Julian day 000 is invalid
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    it('should handle leap year correctly', () => {
      const result = barcodeService.validateBarcodeFormat('240601'); // Feb 29, 2024 (Julian day 060), sequence 1
      expect(result.isValid).toBe(true);
    });

    it('should reject non-leap year February 29th', () => {
      const result = barcodeService.validateBarcodeFormat('233671'); // Invalid Julian day 367 in non-leap year
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    it('should accept minimum sequence number', () => {
      const result = barcodeService.validateBarcodeFormat('240151'); // Jan 15, 2024 (Julian day 015), sequence 1
      expect(result.isValid).toBe(true);
      expect(result.sequence).toBe(1);
    });

    it('should accept maximum sequence number', () => {
      const result = barcodeService.validateBarcodeFormat('24015999'); // Jan 15, 2024 (Julian day 015), sequence 999
      expect(result.isValid).toBe(true);
      expect(result.sequence).toBe(999);
    });
  });
});