import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PDFMergerService } from '../../pages/home/services/merge.service';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { store } from '..';
import { CategorySortConfig } from "../../utils/pdfSorting";

export interface PdfMergerState {
  amazonFiles: File[];
  flipkartFiles: File[];
  finalPdf: string | null;
  summary: ProductSummary[];
  loading: boolean;
  error: string | null;
  selectedDate: Date;
}

const initialState: PdfMergerState = {
  amazonFiles: [],
  flipkartFiles: [],
  finalPdf: null,
  summary: [],
  loading: false,
  error: null,
  selectedDate: new Date(),
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
  async (params: MergePDFsParams) => {
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

    const mergePdfs = new PDFMergerService(products, categories);
    
    // Read all Amazon files
    const amazonFileContents = await Promise.all(
      amazonFiles.map(file => readFileFromInput(file))
    );
    
    // Read all Flipkart files
    const flipkartFileContents = await Promise.all(
      flipkartFiles.map(file => readFileFromInput(file))
    );
    
    // Pass the sort config and selectedDate to the merge service
    const pdf = await mergePdfs.mergePdfs({
      amzon: amazonFileContents,
      flp: flipkartFileContents,
      sortConfig: sortConfig,
      selectedDate: selectedDate
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(mergePDFs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(mergePDFs.fulfilled, (state, action) => {
        state.loading = false;
        state.finalPdf = action.payload.pdfUrl;
        state.summary = action.payload.summary;
      })
      .addCase(mergePDFs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to merge PDFs';
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
  clearFiles
} = pdfMergerSlice.actions;
export const pdfMergerReducer = pdfMergerSlice.reducer; 