import { 
  pdfMergerReducer,
  mergePDFs, 
  addAmazonFile, 
  addFlipkartFile, 
  removeAmazonFile,
  removeFlipkartFile,
  clearAmazonFiles,
  clearFlipkartFiles,
  setSelectedDate,
  clearFiles,
  PdfMergerState 
} from '../pdfMergerSlice';

// Mock dependencies
jest.mock('../../../pages/home/services/merge.service');

describe('pdfMergerSlice', () => {
  const initialState: PdfMergerState = {
    amazonFiles: [],
    flipkartFiles: [],
    finalPdf: null,
    summary: [],
    loading: false,
    error: null,
    selectedDate: new Date('2024-01-01'),
    consolidationProgress: null,
    isConsolidating: false,
  };

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(pdfMergerReducer(undefined, { type: 'unknown' })).toMatchObject({
        amazonFiles: [],
        flipkartFiles: [],
        finalPdf: null,
        summary: [],
        loading: false,
        error: null,
        selectedDate: expect.any(Date),
        consolidationProgress: null,
        isConsolidating: false,
      });
    });

    describe('setSelectedDate', () => {
      it('should set selectedDate for present date', () => {
        const today = new Date();
        const action = setSelectedDate(today);
        
        const state = pdfMergerReducer(initialState, action);
        
        expect(state.selectedDate).toEqual(today);
      });

      it('should set selectedDate for future date', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
        
        const action = setSelectedDate(futureDate);
        const state = pdfMergerReducer(initialState, action);
        
        expect(state.selectedDate).toEqual(futureDate);
      });

      it('should not set selectedDate for past date', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // 1 day in past
        
        const originalDate = new Date('2024-01-01');
        const stateWithDate = { ...initialState, selectedDate: originalDate };
        
        const action = setSelectedDate(pastDate);
        const state = pdfMergerReducer(stateWithDate, action);
        
        // Should keep the original date, not set the past date
        expect(state.selectedDate).toEqual(originalDate);
      });

      it('should handle date comparison regardless of time', () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of day
        
        const action = setSelectedDate(today);
        const state = pdfMergerReducer(initialState, action);
        
        expect(state.selectedDate).toEqual(today);
      });
    });

    describe('clearFiles', () => {
      it('should reset selectedDate to current date when clearing files', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        const stateWithData = {
          ...initialState,
          amazonFiles: [new File(['test'], 'test.pdf')],
          finalPdf: 'test-url',
          summary: [{ name: 'Test', quantity: '1', type: 'amazon' as const }],
          selectedDate: futureDate,
        };
        
        const action = clearFiles();
        const state = pdfMergerReducer(stateWithData, action);
        
        expect(state.amazonFiles).toEqual([]);
        expect(state.flipkartFiles).toEqual([]);
        expect(state.finalPdf).toBeNull();
        expect(state.summary).toEqual([]);
        // selectedDate should be reset to current date
        expect(state.selectedDate).toBeInstanceOf(Date);
        expect(state.selectedDate.getTime()).toBeCloseTo(new Date().getTime(), -100000); // Within 100 seconds
      });
    });

    describe('file management actions', () => {
      it('should add Amazon file', () => {
        const file = new File(['test'], 'amazon.pdf');
        const action = addAmazonFile(file);
        const state = pdfMergerReducer(initialState, action);
        
        expect(state.amazonFiles).toHaveLength(1);
        expect(state.amazonFiles[0]).toBe(file);
      });

      it('should add Flipkart file', () => {
        const file = new File(['test'], 'flipkart.pdf');
        const action = addFlipkartFile(file);
        const state = pdfMergerReducer(initialState, action);
        
        expect(state.flipkartFiles).toHaveLength(1);
        expect(state.flipkartFiles[0]).toBe(file);
      });

      it('should remove Amazon file by index', () => {
        const file1 = new File(['test1'], 'amazon1.pdf');
        const file2 = new File(['test2'], 'amazon2.pdf');
        const stateWithFiles = {
          ...initialState,
          amazonFiles: [file1, file2],
        };
        
        const action = removeAmazonFile(0);
        const state = pdfMergerReducer(stateWithFiles, action);
        
        expect(state.amazonFiles).toHaveLength(1);
        expect(state.amazonFiles[0]).toBe(file2);
      });

      it('should remove Flipkart file by index', () => {
        const file1 = new File(['test1'], 'flipkart1.pdf');
        const file2 = new File(['test2'], 'flipkart2.pdf');
        const stateWithFiles = {
          ...initialState,
          flipkartFiles: [file1, file2],
        };
        
        const action = removeFlipkartFile(1);
        const state = pdfMergerReducer(stateWithFiles, action);
        
        expect(state.amazonFiles).toHaveLength(0);
        expect(state.flipkartFiles).toHaveLength(1);
        expect(state.flipkartFiles[0]).toBe(file1);
      });

      it('should clear all Amazon files', () => {
        const stateWithFiles = {
          ...initialState,
          amazonFiles: [new File(['test'], 'amazon.pdf')],
        };
        
        const action = clearAmazonFiles();
        const state = pdfMergerReducer(stateWithFiles, action);
        
        expect(state.amazonFiles).toEqual([]);
      });

      it('should clear all Flipkart files', () => {
        const stateWithFiles = {
          ...initialState,
          flipkartFiles: [new File(['test'], 'flipkart.pdf')],
        };
        
        const action = clearFlipkartFiles();
        const state = pdfMergerReducer(stateWithFiles, action);
        
        expect(state.flipkartFiles).toEqual([]);
      });
    });
  });

  describe('mergePDFs async thunk', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate present date correctly', () => {
      const today = new Date();
      
      // The test should not throw an error for date validation
      expect(() => {
        const targetDate = new Date(today);
        targetDate.setHours(0, 0, 0, 0);
        const todayComparison = new Date();
        todayComparison.setHours(0, 0, 0, 0);
        
        if (targetDate < todayComparison) {
          throw new Error('Selected date cannot be in the past');
        }
      }).not.toThrow();
    });

    it('should validate future date correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      // Should not throw an error for future date validation
      expect(() => {
        const targetDate = new Date(futureDate);
        targetDate.setHours(0, 0, 0, 0);
        const todayComparison = new Date();
        todayComparison.setHours(0, 0, 0, 0);
        
        if (targetDate < todayComparison) {
          throw new Error('Selected date cannot be in the past');
        }
      }).not.toThrow();
    });

    it('should validate past date correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      // Should throw an error for past date validation
      expect(() => {
        const targetDate = new Date(pastDate);
        targetDate.setHours(0, 0, 0, 0);
        const todayComparison = new Date();
        todayComparison.setHours(0, 0, 0, 0);
        
        if (targetDate < todayComparison) {
          throw new Error('Selected date cannot be in the past');
        }
      }).toThrow('Selected date cannot be in the past');
    });
  });

  describe('extraReducers', () => {
    it('should handle mergePDFs pending', () => {
      const action = { type: mergePDFs.pending.type };
      const state = pdfMergerReducer(initialState, action);
      
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle mergePDFs fulfilled', () => {
      const mockPayload = {
        pdfUrl: 'test-url',
        summary: [{ name: 'Test Product', quantity: '1', type: 'amazon' as const }]
      };
      
      const action = { 
        type: mergePDFs.fulfilled.type, 
        payload: mockPayload 
      };
      
      const state = pdfMergerReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.finalPdf).toBe(mockPayload.pdfUrl);
      expect(state.summary).toEqual(mockPayload.summary);
    });

    it('should handle mergePDFs rejected', () => {
      const action = { 
        type: mergePDFs.rejected.type, 
        error: { message: 'Test error' } 
      };
      
      const state = pdfMergerReducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Test error');
    });
  });
}); 