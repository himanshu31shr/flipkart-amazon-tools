import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PDFMergerService } from '../../pages/home/services/merge.service';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { store } from '..';
import { CategorySortConfig } from "../../utils/pdfSorting";
import { PDFConsolidationService, ConsolidationProgress, ConsolidationError } from '../../services/pdfConsolidation.service';
import { InventoryDeductionResult } from '../../types/inventory';
import { InventoryDeductionPreview } from '../../services/inventoryOrderProcessor.service';
import { fetchCategories, fetchProducts } from './productsSlice';

export interface PdfMergerState {
  amazonFiles: File[];
  flipkartFiles: File[];
  finalPdf: string | null;
  summary: ProductSummary[];
  inventoryResults: InventoryDeductionResult[];
  loading: boolean;
  error: string | null;
  selectedDate: Date;
  consolidationProgress: ConsolidationProgress | null;
  isConsolidating: boolean;
  categoryDeductionPreview: InventoryDeductionPreview | null;
  hasAutomaticDeductionEnabled: boolean;
  enableBarcodes: boolean;
}

const initialState: PdfMergerState = {
  amazonFiles: [],
  flipkartFiles: [],
  finalPdf: null,
  summary: [],
  inventoryResults: [],
  loading: false,
  error: null,
  selectedDate: new Date(),
  consolidationProgress: null,
  isConsolidating: false,
  categoryDeductionPreview: null,
  hasAutomaticDeductionEnabled: false,
  enableBarcodes: true, // Default to enabled for backward compatibility
};

interface MergePDFsParams {
  amazonFiles: File[];
  flipkartFiles: File[];
  sortConfig?: CategorySortConfig;
  selectedDate?: Date;
  enableBarcodes?: boolean;
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

export const previewCategoryDeductions = createAsyncThunk(
  'pdfMerger/previewCategoryDeductions',
  async (params: MergePDFsParams, { dispatch }) => {
    const { amazonFiles, flipkartFiles, sortConfig } = params;

    if (amazonFiles.length === 0 && flipkartFiles.length === 0) {
      throw new Error('No files provided');
    }

    // Ensure both products and categories are loaded first
    let products = store.getState().products.items;
    let categories = store.getState().products.categories;
    
    // Load products if empty
    if (products.length === 0) {
      await dispatch(fetchProducts({})).unwrap();
      products = store.getState().products.items;
    }
    
    // Load categories if empty
    if (categories.length === 0) {
      await dispatch(fetchCategories()).unwrap();
      categories = store.getState().products.categories;
    }

    // Create consolidation service for preview
    const consolidationService = new PDFConsolidationService({
      enableProgressTracking: false,
      enableCancellation: false,
      chunkSize: 5,
      validateFiles: true
    });

    // Step 1: Consolidate files for preview
    let consolidatedAmazonPDF: Uint8Array | null = null;
    if (amazonFiles.length > 0) {
      const amazonFileContents = await Promise.all(
        amazonFiles.map(file => readFileFromInput(file))
      );
      consolidatedAmazonPDF = await consolidationService.mergeAmazonFiles(amazonFileContents);
    }

    let consolidatedFlipkartPDF: Uint8Array | null = null;
    if (flipkartFiles.length > 0) {
      const flipkartFileContents = await Promise.all(
        flipkartFiles.map(file => readFileFromInput(file))
      );
      consolidatedFlipkartPDF = await consolidationService.mergeFlipkartFiles(flipkartFileContents);
    }

    // Step 2: Preview deductions using transformers
    const mergePdfs = new PDFMergerService(products, categories);
    
    // Preview deductions from both platforms
    const amazonPreview = consolidatedAmazonPDF ? 
      await mergePdfs.previewAmazonDeductions(consolidatedAmazonPDF, sortConfig) : null;
    const flipkartPreview = consolidatedFlipkartPDF ? 
      await mergePdfs.previewFlipkartDeductions(consolidatedFlipkartPDF, sortConfig) : null;

    // Combine previews
    const combinedPreview: InventoryDeductionPreview = {
      items: [
        ...(amazonPreview?.items || []),
        ...(flipkartPreview?.items || [])
      ],
      totalDeductions: new Map([
        ...Array.from(amazonPreview?.totalDeductions || new Map()),
        ...Array.from(flipkartPreview?.totalDeductions || new Map())
      ]),
      warnings: [
        ...(amazonPreview?.warnings || []),
        ...(flipkartPreview?.warnings || [])
      ],
      errors: [
        ...(amazonPreview?.errors || []),
        ...(flipkartPreview?.errors || [])
      ]
    };

    return combinedPreview;
  }
);

export const mergePDFs = createAsyncThunk(
  'pdfMerger/mergePDFs',
  async (params: MergePDFsParams, { dispatch }) => {
    const { amazonFiles, flipkartFiles, sortConfig, selectedDate, enableBarcodes = true } = params;

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

    // Ensure both products and categories are loaded first
    let products = store.getState().products.items;
    let categories = store.getState().products.categories;
    
    // Load products if empty
    if (products.length === 0) {
      await dispatch(fetchProducts({})).unwrap();
      products = store.getState().products.items;
    }
    
    // Load categories if empty
    if (categories.length === 0) {
      await dispatch(fetchCategories()).unwrap();
      categories = store.getState().products.categories;
    }

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
      
      // Extract file names for batch tracking
      const fileNames = [
        ...amazonFiles.map(file => file.name),
        ...flipkartFiles.map(file => file.name)
      ];
      
      const pdf = await mergePdfs.mergePdfs({
        amzon: consolidatedAmazonPDF ? [consolidatedAmazonPDF] : [],
        flp: consolidatedFlipkartPDF ? [consolidatedFlipkartPDF] : [],
        sortConfig: sortConfig,
        selectedDate: selectedDate,
        fileNames: fileNames,
        enableBarcodes: enableBarcodes
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
        inventoryResults: mergePdfs.inventoryDeductionResults,
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
      state.inventoryResults = [];
      state.selectedDate = new Date();
      state.consolidationProgress = null;
      state.isConsolidating = false;
      state.categoryDeductionPreview = null;
      state.hasAutomaticDeductionEnabled = false;
      // Don't reset enableBarcodes as it's a user preference
    },
    updateConsolidationProgress: (state, action: PayloadAction<ConsolidationProgress>) => {
      state.consolidationProgress = action.payload;
      state.isConsolidating = true;
    },
    clearConsolidationProgress: (state) => {
      state.consolidationProgress = null;
      state.isConsolidating = false;
    },
    setCategoryDeductionPreview: (state, action: PayloadAction<InventoryDeductionPreview | null>) => {
      state.categoryDeductionPreview = action.payload;
    },
    clearCategoryDeductionPreview: (state) => {
      state.categoryDeductionPreview = null;
    },
    setAutomaticDeductionEnabled: (state, action: PayloadAction<boolean>) => {
      state.hasAutomaticDeductionEnabled = action.payload;
    },
    setEnableBarcodes: (state, action: PayloadAction<boolean>) => {
      state.enableBarcodes = action.payload;
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
        state.inventoryResults = action.payload.inventoryResults || [];
        state.consolidationProgress = null;
        state.isConsolidating = false;
      })
      .addCase(mergePDFs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to merge PDFs';
        state.consolidationProgress = null;
        state.isConsolidating = false;
      })
      .addCase(previewCategoryDeductions.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.categoryDeductionPreview = null;
      })
      .addCase(previewCategoryDeductions.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryDeductionPreview = action.payload;
        state.hasAutomaticDeductionEnabled = action.payload.items.length > 0;
      })
      .addCase(previewCategoryDeductions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to preview category deductions';
        state.categoryDeductionPreview = null;
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
  clearConsolidationProgress,
  setCategoryDeductionPreview,
  clearCategoryDeductionPreview,
  setAutomaticDeductionEnabled,
  setEnableBarcodes
} = pdfMergerSlice.actions;
export const pdfMergerReducer = pdfMergerSlice.reducer; 