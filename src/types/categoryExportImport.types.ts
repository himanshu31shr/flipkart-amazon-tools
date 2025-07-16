import { Category } from './category';
import { Product } from './product';
import { CategoryInventory } from './categoryInventory.types';

// ============================================================================
// CATEGORY DATA EXPORT/IMPORT TYPE DEFINITIONS
// ============================================================================

/**
 * Complete category data with all relationships for export/import operations
 */
export interface CategoryExportData {
  category: Category;
  products: Product[];
  inventory: CategoryInventory | null;
  metadata: CategoryMetadata;
}

/**
 * Additional metadata for category export/import tracking
 */
export interface CategoryMetadata {
  productCount: number;
  totalInventory: number;
  lowStockThreshold: number;
  associatedSKUs: string[];
  productNames: string[];
  productPlatforms: string[];
  productCostPrices: number[];
  productSellingPrices: number[];
  inventoryQuantities: number[];
  createdAt: string;
  updatedAt: string;
}

/**
 * CSV row structure for category data export
 */
export interface CategoryCSVRow {
  categoryId: string;
  categoryName: string;
  description: string;
  tag: string;
  costPrice: number;
  productCount: number;
  totalInventory: number;
  lowStockThreshold: number;
  associatedSKUs: string;
  productNames: string;
  productPlatforms: string;
  productCostPrices: string;
  productSellingPrices: string;
  inventoryQuantities: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Import validation result for a single category
 */
export interface CategoryValidationResult {
  isValid: boolean;
  categoryId: string;
  categoryName: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

/**
 * Validation warning for non-critical issues
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Complete validation report for import operation
 */
export interface ImportValidationReport {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  categoryResults: CategoryValidationResult[];
  globalErrors: ValidationError[];
  duplicateCategories: string[];
  duplicateSKUs: string[];
}

/**
 * Import conflict resolution options
 */
export interface ImportConflictResolution {
  duplicateCategories: 'skip' | 'update' | 'rename';
  duplicateSKUs: 'skip' | 'update' | 'merge';
  invalidData: 'skip' | 'fix' | 'abort';
}

/**
 * Import operation configuration
 */
export interface ImportConfiguration {
  validateBeforeImport: boolean;
  updateExistingCategories: boolean;
  createMissingProducts: boolean;
  conflictResolution: ImportConflictResolution;
  batchSize: number;
}

/**
 * Progress tracking for export/import operations
 */
export interface OperationProgress {
  phase: 'initializing' | 'processing' | 'validating' | 'persisting' | 'complete' | 'error';
  current: number;
  total: number;
  percentage: number;
  message: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

/**
 * Export operation result
 */
export interface ExportResult {
  success: boolean;
  fileName: string;
  rowCount: number;
  fileSize: number;
  exportTime: number;
  errors: string[];
}

/**
 * Import operation result
 */
export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesSkipped: number;
  productsCreated: number;
  productsUpdated: number;
  inventoryUpdated: number;
  errors: string[];
  warnings: string[];
  importTime: number;
}

/**
 * Service operation options
 */
export interface ServiceOptions {
  onProgress?: (progress: OperationProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

/**
 * Data aggregation options for export
 */
export interface AggregationOptions {
  includeProducts: boolean;
  includeInventory: boolean;
  includeMetadata: boolean;
  filterEmptyCategories: boolean;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'productCount';
  sortOrder: 'asc' | 'desc';
}

/**
 * Transformation options for CSV generation
 */
export interface TransformationOptions {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'utf-16' | 'ascii';
  includeHeaders: boolean;
  dateFormat: 'iso' | 'locale' | 'timestamp';
  numberFormat: 'decimal' | 'integer';
}

/**
 * Persistence options for import operations
 */
export interface PersistenceOptions {
  useTransaction: boolean;
  validateReferences: boolean;
  createAuditLog: boolean;
  backupBeforeImport: boolean;
  rollbackOnError: boolean;
}

/**
 * UI Component Props Types
 */
export interface CategoryExportSectionProps {
  onExportStart?: () => void;
  onExportComplete?: (result: ExportResult) => void;
  onExportError?: (error: Error) => void;
  disabled?: boolean;
}

export interface CategoryImportSectionProps {
  onImportStart?: () => void;
  onImportComplete?: (result: ImportResult) => void;
  onImportError?: (error: Error) => void;
  onValidationComplete?: (report: ImportValidationReport) => void;
  disabled?: boolean;
}

/**
 * File upload props and state
 */
export interface FileUploadState {
  file: File | null;
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Validation UI state
 */
export interface ValidationUIState {
  isValidating: boolean;
  validationReport: ImportValidationReport | null;
  showDetails: boolean;
  selectedErrors: string[];
}

/**
 * Import UI state
 */
export interface ImportUIState {
  configuration: ImportConfiguration;
  isImporting: boolean;
  progress: OperationProgress | null;
  result: ImportResult | null;
  showAdvancedOptions: boolean;
} 