import { PDFDocument } from 'pdf-lib';

// Error types for classification
export enum ErrorType {
  // File-related errors
  FILE_VALIDATION_ERROR = 'FILE_VALIDATION_ERROR',
  FILE_CORRUPTION_ERROR = 'FILE_CORRUPTION_ERROR',
  FILE_SIZE_ERROR = 'FILE_SIZE_ERROR',
  
  // Memory-related errors
  MEMORY_ALLOCATION_ERROR = 'MEMORY_ALLOCATION_ERROR',
  MEMORY_THRESHOLD_EXCEEDED = 'MEMORY_THRESHOLD_EXCEEDED',
  
  // Processing errors
  PDF_MERGE_ERROR = 'PDF_MERGE_ERROR',
  TRANSFORMER_ERROR = 'TRANSFORMER_ERROR',
  
  // Network/IO errors
  FILE_LOAD_ERROR = 'FILE_LOAD_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // User actions
  CANCELLATION_ERROR = 'CANCELLATION_ERROR',
  
  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Consolidation error interface
export interface ConsolidationError extends Error {
  type: ErrorType;
  fileIndex?: number;
  chunkIndex?: number;
  retryCount?: number;
  recoverable: boolean;
  userMessage: string;
  technicalDetails?: string;
  timestamp?: string;
}

// Consolidation options
export interface ConsolidationOptions {
  chunkSize?: number; // Default: 5
  validateFiles?: boolean; // Default: true
  retryAttempts?: number; // Default: 3
  memoryThreshold?: number; // Default: 50MB
  enableProgressTracking?: boolean;
  enableCancellation?: boolean;
  optimizeForSpeed?: boolean;
}

// Progress tracking interface
export interface ConsolidationProgress {
  currentFile: number;
  totalFiles: number;
  percentage: number;
  memoryUsage: number;
  estimatedTimeRemaining: number;
  currentChunkSize: number;
  processingSpeed: number; // files per second
}

// Performance metrics interface
export interface PerformanceMetrics {
  memoryUsage: number;
  processingTime: number;
  filesProcessed: number;
  totalFiles: number;
  chunkSize: number;
  averageTimePerFile: number;
  estimatedTimeRemaining: number;
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private memoryThreshold: number = 50 * 1024 * 1024; // 50MB
  
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      memoryUsage: 0,
      processingTime: 0,
      filesProcessed: 0,
      totalFiles: 0,
      chunkSize: 5,
      averageTimePerFile: 0,
      estimatedTimeRemaining: 0
    };
  }
  
  updateMetrics(processedFiles: number, totalFiles: number): void {
    this.metrics.filesProcessed = processedFiles;
    this.metrics.totalFiles = totalFiles;
    this.metrics.processingTime = Date.now() - this.startTime;
    this.metrics.averageTimePerFile = this.metrics.processingTime / processedFiles;
    this.metrics.estimatedTimeRemaining = 
      this.metrics.averageTimePerFile * (totalFiles - processedFiles);
    
    // Update memory usage
    this.updateMemoryUsage();
  }
  
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    }
  }
  
  shouldReduceChunkSize(): boolean {
    return this.metrics.memoryUsage > this.memoryThreshold;
  }
  
  getOptimalChunkSize(): number {
    const baseChunkSize = 5;
    const memoryFactor = this.metrics.memoryUsage / this.memoryThreshold;
    
    if (memoryFactor > 0.8) {
      return Math.max(1, Math.floor(baseChunkSize / 2));
    } else if (memoryFactor > 0.6) {
      return Math.max(2, Math.floor(baseChunkSize * 0.8));
    }
    
    return baseChunkSize;
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

// Error handler class
export class ConsolidationErrorHandler {
  private retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  private errorLog: ConsolidationError[] = [];
  
  constructor(config?: Partial<{
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  }>) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...config
    };
  }
  
  async handleError(
    error: ConsolidationError,
    operation: () => Promise<unknown>
  ): Promise<unknown> {
    // Log error
    this.logError(error);
    
    // Check if error is recoverable
    if (!error.recoverable) {
      throw error;
    }
    
    // Implement retry logic with exponential backoff
    return this.retryWithBackoff(operation, error);
  }
  
  private async retryWithBackoff(
    operation: () => Promise<unknown>,
    originalError: ConsolidationError
  ): Promise<unknown> {
    let lastError = originalError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Wait before retry (exponential backoff)
        if (attempt > 1) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
          );
          await this.sleep(delay);
        }
        
        return await operation();
      } catch (error) {
        lastError = this.classifyError(error, attempt);
        
        // If error is not recoverable, fail fast
        if (!lastError.recoverable) {
          throw lastError;
        }
      }
    }
    
    // Max retries reached
    throw lastError;
  }
  
  classifyError(error: unknown, retryCount: number): ConsolidationError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Error classification logic
    if (errorMessage.includes('memory')) {
      return {
        name: 'MemoryAllocationError',
        type: ErrorType.MEMORY_ALLOCATION_ERROR,
        message: errorMessage,
        recoverable: retryCount < 2, // Only retry once for memory errors
        userMessage: 'Insufficient memory to process files. Try with fewer files.',
        retryCount
      };
    }
    
    if (errorMessage.includes('PDF')) {
      return {
        name: 'PDFMergeError',
        type: ErrorType.PDF_MERGE_ERROR,
        message: errorMessage,
        recoverable: true,
        userMessage: 'Error merging PDF files. Retrying...',
        retryCount
      };
    }
    
    if (errorMessage.includes('cancelled')) {
      return {
        name: 'CancellationError',
        type: ErrorType.CANCELLATION_ERROR,
        message: errorMessage,
        recoverable: false,
        userMessage: 'Operation was cancelled by the user.',
        retryCount
      };
    }
    
    // Default classification
    return {
      name: 'UnknownError',
      type: ErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      recoverable: false,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryCount
    };
  }
  
  private logError(error: ConsolidationError): void {
    this.errorLog.push({
      ...error,
      timestamp: new Date().toISOString()
    });
    
    // Log to console for debugging
    console.error('Consolidation Error:', {
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      retryCount: error.retryCount,
      timestamp: new Date().toISOString()
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getErrorLog(): ConsolidationError[] {
    return [...this.errorLog];
  }
}

// Main PDF consolidation service
export class PDFConsolidationService {
  private performanceMonitor: PerformanceMonitor;
  private errorHandler: ConsolidationErrorHandler;
  private isCancelled: boolean = false;
  public onProgress?: (progress: ConsolidationProgress) => void;
  
  constructor(options: ConsolidationOptions = {}) {
    this.performanceMonitor = new PerformanceMonitor();
    this.errorHandler = new ConsolidationErrorHandler();
    this.onProgress = options.enableProgressTracking ? 
      (progress: ConsolidationProgress) => this.updateProgress(progress) : undefined;
  }
  
  async mergeAmazonFiles(
    files: Uint8Array[], 
    options: ConsolidationOptions = {}
  ): Promise<Uint8Array | null> {
    return this.mergeFiles(files, 'amazon', options);
  }
  
  async mergeFlipkartFiles(
    files: Uint8Array[], 
    options: ConsolidationOptions = {}
  ): Promise<Uint8Array | null> {
    return this.mergeFiles(files, 'flipkart', options);
  }
  
  private async mergeFiles(
    files: Uint8Array[], 
    type: 'amazon' | 'flipkart',
    options: ConsolidationOptions
  ): Promise<Uint8Array | null> {
    if (files.length === 0) return null;
    
    this.isCancelled = false;
    const mergedPdf = await PDFDocument.create();
    
    let processedFiles = 0;
    const totalFiles = files.length;
    let currentChunkSize = options.chunkSize || 5;
    
    // Process files in chunks
    for (let i = 0; i < files.length; i += currentChunkSize) {
      if (this.isCancelled) {
        throw new Error('Operation cancelled by user');
      }
      
      const chunk = files.slice(i, i + currentChunkSize);
      
      try {
        // Process chunk
        for (const file of chunk) {
          // Validate file if enabled
          if (options.validateFiles !== false) {
            const isValid = await this.validatePDFFile(file);
            if (!isValid) {
              console.warn(`Skipping invalid PDF file at index ${i + processedFiles}`);
              processedFiles++;
              continue;
            }
          }
          
          const pdfDoc = await PDFDocument.load(file);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
          
          processedFiles++;
          
          // Update performance metrics
          this.performanceMonitor.updateMetrics(processedFiles, totalFiles);
          
          // Update progress
          if (this.onProgress) {
            this.onProgress({
              currentFile: processedFiles,
              totalFiles,
              percentage: (processedFiles / totalFiles) * 100,
              memoryUsage: this.performanceMonitor.getMetrics().memoryUsage,
              estimatedTimeRemaining: this.performanceMonitor.getMetrics().estimatedTimeRemaining,
              currentChunkSize,
              processingSpeed: processedFiles / (this.performanceMonitor.getMetrics().processingTime / 1000)
            });
          }
          
          // Adaptive chunk sizing
          if (this.performanceMonitor.shouldReduceChunkSize()) {
            currentChunkSize = Math.max(1, currentChunkSize - 1);
          } else {
            currentChunkSize = Math.min(
              currentChunkSize + 1, 
              this.performanceMonitor.getOptimalChunkSize()
            );
          }
        }
        
        // Force garbage collection if available
        if ('gc' in window) {
          (window as Window & { gc(): void }).gc();
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${i}-${i + currentChunkSize}:`, error);
        
        // Reduce chunk size on error
        currentChunkSize = Math.max(1, currentChunkSize - 1);
        
        // Continue with next chunk
        continue;
      }
    }
    
    if (mergedPdf.getPageCount() === 0) {
      return null;
    }
    
    return await mergedPdf.save();
  }
  
  private async validatePDFFile(file: Uint8Array): Promise<boolean> {
    try {
      // Basic PDF validation - check if it's a valid PDF
      const header = new TextDecoder().decode(file.slice(0, 8));
      if (!header.startsWith('%PDF-')) {
        return false;
      }
      
      // Try to load the PDF to validate structure
      await PDFDocument.load(file);
      return true;
    } catch (error) {
      console.warn('PDF validation failed:', error);
      return false;
    }
  }
  
  private updateProgress(): void {
    // Emit progress event or update UI
    
  }
  
  cancel(): void {
    this.isCancelled = true;
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }
  
  getErrorLog(): ConsolidationError[] {
    return this.errorHandler.getErrorLog();
  }
} 