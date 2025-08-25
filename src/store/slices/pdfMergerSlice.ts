import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PDFMergerService } from '../../pages/home/services/merge.service';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { store } from '..';
import { CategorySortConfig } from "../../utils/pdfSorting";
import { PDFConsolidationService, ConsolidationProgress, ConsolidationError } from '../../services/pdfConsolidation.service';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

export interface PdfMergerState {
  amazonFiles: File[];
  flipkartFiles: File[];
  finalPdf: string | null;
  summary: ProductSummary[];
  loading: boolean;
  error: string | null;
  selectedDate: Date;
  consolidationProgress: ConsolidationProgress | null;
  isConsolidating: boolean;
}

const initialState: PdfMergerState = {
  amazonFiles: [],
  flipkartFiles: [],
  finalPdf: null,
  summary: [],
  loading: false,
  error: null,
  selectedDate: new Date(),
  consolidationProgress: null,
  isConsolidating: false,
};

interface MergePDFsParams {
  amazonFiles: File[];
  flipkartFiles: File[];
  sortConfig?: CategorySortConfig;
  selectedDate?: Date;
}

// Helper function to read file contents
const readFileFromInput = (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const mergePDFs = createAsyncThunk(
  'pdfMerger/mergePDFs',
  async (params: MergePDFsParams, { dispatch }) => {
    const { amazonFiles, flipkartFiles, sortConfig, selectedDate } = params;

    if (amazonFiles.length === 0 && flipkartFiles.length === 0) {
      throw new Error('No files provided');
    }

    // Validate selectedDate is present or future
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(selectedDate);
      targetDate.setHours(0, 0, 0, 0);
      
      if (targetDate < today) {
        throw new Error('Selected date cannot be in the past');
      }
    }

    const products = store.getState().products.items;
    const categories = store.getState().products.categories;

    // Generate batch information
    const batchNumber = uuidv4();
    const batchTimestamp = new Date().toISOString();

    // Create consolidation service with progress tracking
    const consolidationService = new PDFConsolidationService({
      enableProgressTracking: true,
      enableCancellation: true,
      chunkSize: 5,
      validateFiles: true
    });

    // Set up progress tracking
    consolidationService.onProgress = (progress: ConsolidationProgress) => {
      dispatch(pdfMergerSlice.actions.updateConsolidationProgress(progress));
    };

    try {
      // Step 1: Consolidate Amazon files
      let consolidatedAmazonPDF: Uint8Array | null = null;
      if (amazonFiles.length > 0) {
        const amazonFileContents = await Promise.all(
          amazonFiles.map(file => readFileFromInput(file))
        );
        consolidatedAmazonPDF = await consolidationService.mergeAmazonFiles(amazonFileContents);
      }

      // Step 2: Consolidate Flipkart files
      let consolidatedFlipkartPDF: Uint8Array | null = null;
      if (flipkartFiles.length > 0) {
        const flipkartFileContents = await Promise.all(
          flipkartFiles.map(file => readFileFromInput(file))
        );
        consolidatedFlipkartPDF = await consolidationService.mergeFlipkartFiles(flipkartFileContents);
      }

      // Step 3: Process with existing merger service
      const mergePdfs = new PDFMergerService(products, categories);
      const pdf = await mergePdfs.mergePdfs({
        amzon: consolidatedAmazonPDF ? [consolidatedAmazonPDF] : [],
        flp: consolidatedFlipkartPDF ? [consolidatedFlipkartPDF] : [],
        sortConfig: sortConfig,
        selectedDate: selectedDate,
        batchNumber: batchNumber, // Pass batch number
        batchTimestamp: batchTimestamp, // Pass batch timestamp
      });

      if (!pdf) {
        throw new Error('Failed to merge PDFs');
      }

      const outputPdfBytes = await pdf.save();
      const blob = new Blob([outputPdfBytes], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);

      return {
        pdfUrl,
        summary: mergePdfs.summary,
      };
    } catch (error) {
      // Handle consolidation errors
      if (error instanceof Error) {
        const consolidationError = error as ConsolidationError;
        if (consolidationError.userMessage) {
          throw new Error(consolidationError.userMessage);
        }
      }
      throw error;
    }
  }
);

const pdfMergerSlice = createSlice({
  name: 'pdfMerger',
  initialState,
  reducers: {
    addAmazonFile: (state, action: PayloadAction<File>) => {
      state.amazonFiles.push(action.payload);
    },
    addFlipkartFile: (state, action: PayloadAction<File>) => {
      state.flipkartFiles.push(action.payload);
    },
    removeAmazonFile: (state, action: PayloadAction<number>) => {
      state.amazonFiles.splice(action.payload, 1);
    },
    removeFlipkartFile: (state, action: PayloadAction<number>) => {
      state.flipkartFiles.splice(action.payload, 1);
    },
    clearAmazonFiles: (state) => {
      state.amazonFiles = [];
    },
    clearFlipkartFiles: (state) => {
      state.flipkartFiles = [];
    },
    setSelectedDate: (state, action: PayloadAction<Date>) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(action.payload);
      targetDate.setHours(0, 0, 0, 0);
      
      // Only allow present or future dates
      if (targetDate >= today) {
        state.selectedDate = action.payload;
      }
    },
    clearFiles: (state) => {
      state.amazonFiles = [];
      state.flipkartFiles = [];
      state.finalPdf = null;
      state.summary = [];
      state.selectedDate = new Date();
      state.consolidationProgress = null;
      state.isConsolidating = false;
    },
    updateConsolidationProgress: (state, action: PayloadAction<ConsolidationProgress>) => {
      state.consolidationProgress = action.payload;
      state.isConsolidating = true;
    },
    clearConsolidationProgress: (state) => {
      state.consolidationProgress = null;
      state.isConsolidating = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(mergePDFs.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isConsolidating = true;
      })
      .addCase(mergePDFs.fulfilled, (state, action) => {
        state.loading = false;
        state.finalPdf = action.payload.pdfUrl;
        state.summary = action.payload.summary;
        state.consolidationProgress = null;
        state.isConsolidating = false;
      })
      .addCase(mergePDFs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to merge PDFs';
        state.consolidationProgress = null;
        state.isConsolidating = false;
      });
  },
});

export const { 
  addAmazonFile, 
  addFlipkartFile, 
  removeAmazonFile,
  removeFlipkartFile,
  clearAmazonFiles,
  clearFlipkartFiles,
  setSelectedDate,
  clearFiles,
  updateConsolidationProgress,
  clearConsolidationProgress
} = pdfMergerSlice.actions;
export const pdfMergerReducer = pdfMergerSlice.reducer; 