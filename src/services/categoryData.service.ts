import { 
  ExportResult, 
  ImportResult, 
  ImportValidationReport,
  ImportConfiguration,
  ServiceOptions,
  OperationProgress,
  AggregationOptions,
  TransformationOptions,
  PersistenceOptions
} from '../types/categoryExportImport.types';
import { CategoryDataAggregator } from './categoryDataAggregator.service';
import { DataTransformationService } from './dataTransformation.service';
import { ValidationService } from './validation.service';
import { CategoryDataPersistence } from './categoryDataPersistence.service';

/**
 * CategoryDataService - Main orchestrator for category export/import operations
 * 
 * This service coordinates all aspects of category data export and import,
 * following the layered architecture pattern designed in the creative phase.
 * 
 * Key responsibilities:
 * - Flow coordination and transaction management
 * - Progress tracking and user feedback
 * - Error handling and recovery
 * - Service layer integration
 */
export class CategoryDataService {
  private aggregator: CategoryDataAggregator;
  private transformer: DataTransformationService;
  private validator: ValidationService;
  private persistence: CategoryDataPersistence;

  constructor() {
    this.aggregator = new CategoryDataAggregator();
    this.transformer = new DataTransformationService();
    this.validator = new ValidationService();
    this.persistence = new CategoryDataPersistence();
  }

  /**
   * Export categories with all their data
   * 
   * @param aggregationOptions Options for data aggregation
   * @param transformationOptions Options for CSV transformation
   * @param options Service options for progress tracking
   * @returns Promise resolving to export result
   */
  async exportCategories(
    aggregationOptions: AggregationOptions = this.getDefaultAggregationOptions(),
    transformationOptions: TransformationOptions = this.getDefaultTransformationOptions(),
    options: ServiceOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();

    let progress: OperationProgress = {
      phase: 'initializing',
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Initializing export...',
      startTime: new Date()
    };

    try {
      // Report initial progress
      this.reportProgress(progress, options.onProgress);

      // Phase 1: Data Aggregation
      progress = { ...progress, phase: 'processing', message: 'Collecting category data...' };
      this.reportProgress(progress, options.onProgress);

      const categoryData = await this.aggregator.aggregateCategoryData(
        aggregationOptions,
        (current: number, total: number) => {
          progress.current = Math.round((current / total) * 40); // 40% of total progress
          progress.percentage = progress.current;
          progress.message = `Processing categories: ${current}/${total}`;
          this.reportProgress(progress, options.onProgress);
        }
      );

      // Phase 2: Data Transformation
      progress = { ...progress, phase: 'processing', message: 'Transforming data to CSV...' };
      this.reportProgress(progress, options.onProgress);

      const csvData = await this.transformer.transformToCSV(
        categoryData,
        transformationOptions,
        (current: number, total: number) => {
          progress.current = 40 + Math.round((current / total) * 40); // 40-80% of total
          progress.percentage = progress.current;
          progress.message = `Transforming data: ${current}/${total}`;
          this.reportProgress(progress, options.onProgress);
        }
      );

      // Phase 3: File Generation
      progress = { ...progress, phase: 'processing', message: 'Generating CSV file...' };
      this.reportProgress(progress, options.onProgress);

      const result = await this.transformer.generateDownloadFile(csvData, transformationOptions);

      // Complete
      progress = { 
        ...progress, 
        phase: 'complete', 
        current: 100, 
        percentage: 100, 
        message: 'Export completed!',
        estimatedCompletion: new Date()
      };
      this.reportProgress(progress, options.onProgress);

      const finalResult: ExportResult = {
        success: true,
        fileName: result.fileName,
        rowCount: categoryData.length,
        fileSize: result.fileSize,
        exportTime: Date.now() - startTime,
        errors: []
      };

      options.onComplete?.();
      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      progress = { ...progress, phase: 'error', message: `Export error: ${errorMessage}` };
      this.reportProgress(progress, options.onProgress);

      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        fileName: '',
        rowCount: 0,
        fileSize: 0,
        exportTime: Date.now() - startTime,
        errors: [errorMessage]
      };
    }
  }

  /**
   * Validate import data before processing
   * 
   * @param file File to validate
   * @param configuration Import configuration
   * @param options Service options for progress tracking
   * @returns Promise resolving to validation report
   */
  async validateImportData(
    file: File,
    configuration: ImportConfiguration,
    options: ServiceOptions = {}
  ): Promise<ImportValidationReport> {
    let progress: OperationProgress = {
      phase: 'initializing',
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Starting validation...',
      startTime: new Date()
    };

    try {
      this.reportProgress(progress, options.onProgress);

      // Phase 1: Parse CSV
      progress = { ...progress, phase: 'processing', message: 'Parsing CSV data...' };
      this.reportProgress(progress, options.onProgress);

      const csvRows = await this.transformer.parseCSVFile(file);

      progress.current = 30;
      progress.percentage = 30;
      progress.message = `Parsed ${csvRows.length} rows`;
      this.reportProgress(progress, options.onProgress);

      // Phase 2: Validation
      progress = { ...progress, phase: 'validating', message: 'Validating data...' };
      this.reportProgress(progress, options.onProgress);

      const validationReport = await this.validator.validateImportData(
        csvRows,
        configuration,
        (current: number, total: number) => {
          progress.current = 30 + Math.round((current / total) * 70); // 30-100%
          progress.percentage = progress.current;
          progress.message = `Validating: ${current}/${total}`;
          this.reportProgress(progress, options.onProgress);
        }
      );

      progress = { ...progress, phase: 'complete', current: 100, percentage: 100, message: 'Validation completed' };
      this.reportProgress(progress, options.onProgress);

      options.onComplete?.();
      return validationReport;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      
      progress = { ...progress, phase: 'error', message: `Validation error: ${errorMessage}` };
      this.reportProgress(progress, options.onProgress);

      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      // Return a basic failed validation report
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errorRows: 1,
        warningRows: 0,
        categoryResults: [],
        globalErrors: [{
          field: 'file',
          message: errorMessage,
          severity: 'error',
          code: 'VALIDATION_ERROR'
        }],
        duplicateCategories: [],
        duplicateSKUs: []
      };
    }
  }

  /**
   * Import categories from uploaded data
   * 
   * @param file File containing category data
   * @param configuration Import configuration
   * @param persistenceOptions Optional persistence options
   * @param serviceOptions Optional service options with callbacks
   * @returns Promise resolving to import result
   */
  async importCategories(
    file: File,
    configuration: ImportConfiguration,
    persistenceOptions?: PersistenceOptions,
    serviceOptions?: ServiceOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();

    // Default options
    const defaultPersistenceOptions: PersistenceOptions = {
      useTransaction: true,
      validateReferences: true,
      createAuditLog: false,
      backupBeforeImport: false,
      rollbackOnError: false
    };

    const finalPersistenceOptions = { ...defaultPersistenceOptions, ...persistenceOptions };

    let progress: OperationProgress = {
      phase: 'initializing',
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Initializing import...',
      startTime: new Date()
    };

    try {
      // Report initial progress
      this.reportProgress(progress, serviceOptions?.onProgress);

      // Phase 1: Data Transformation from CSV
      progress = { ...progress, phase: 'processing', message: 'Reading CSV data...' };
      this.reportProgress(progress, serviceOptions?.onProgress);

      const csvRows = await this.transformer.parseCSVFile(file);

      progress.current = 25;
      progress.percentage = 25;
      progress.message = `Parsed ${csvRows.length} rows from CSV`;
      this.reportProgress(progress, serviceOptions?.onProgress);

      // Phase 2: Data Transformation to Category Data
      progress = { ...progress, message: 'Transforming data structure...' };
      this.reportProgress(progress, serviceOptions?.onProgress);

      const categoryData = await this.transformer.transformFromCSV(csvRows);

      progress.current = 50;
      progress.percentage = 50;
      progress.message = `Transformed ${categoryData.length} categories`;
      this.reportProgress(progress, serviceOptions?.onProgress);

      // Phase 3: Validation (if enabled)
      if (configuration.validateBeforeImport) {
        progress = { ...progress, phase: 'validating', message: 'Validating import data...' };
        this.reportProgress(progress, serviceOptions?.onProgress);

        const validationReport = await this.validator.validateImportData(csvRows, configuration);
        
        if (!validationReport.isValid) {
          return {
            success: false,
            totalProcessed: 0,
            categoriesCreated: 0,
            categoriesUpdated: 0,
            categoriesSkipped: 0,
            productsCreated: 0,
            productsUpdated: 0,
            inventoryUpdated: 0,
            errors: validationReport.globalErrors.map((e: { message: string }) => e.message),
            warnings: [],
            importTime: Date.now() - startTime
          };
        }

        progress.current = 75;
        progress.percentage = 75;
        progress.message = 'Validation completed successfully';
        this.reportProgress(progress, serviceOptions?.onProgress);
      } else {
        progress.current = 75;
        progress.percentage = 75;
        progress.message = 'Skipping validation';
        this.reportProgress(progress, serviceOptions?.onProgress);
      }

      // Phase 4: Data Persistence
      progress = { ...progress, phase: 'persisting', message: 'Importing to database...' };
      this.reportProgress(progress, serviceOptions?.onProgress);

      const importResult = await this.persistence.importCategories(
        categoryData,
        configuration,
        finalPersistenceOptions,
        serviceOptions
      );

      // Phase 5: Complete
      progress = { ...progress, phase: 'complete', current: 100, percentage: 100, message: 'Import completed' };
      this.reportProgress(progress, serviceOptions?.onProgress);

      return {
        ...importResult,
        importTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      
      // Report error progress
      progress = { ...progress, phase: 'error', message: `Import failed: ${errorMessage}` };
      this.reportProgress(progress, serviceOptions?.onProgress);

      if (serviceOptions?.onError) {
        serviceOptions.onError(error instanceof Error ? error : new Error(errorMessage));
      }

      return {
        success: false,
        totalProcessed: 0,
        categoriesCreated: 0,
        categoriesUpdated: 0,
        categoriesSkipped: 0,
        productsCreated: 0,
        productsUpdated: 0,
        inventoryUpdated: 0,
        errors: [errorMessage],
        warnings: [],
        importTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get default aggregation options
   */
  private getDefaultAggregationOptions(): AggregationOptions {
    return {
      includeProducts: true,
      includeInventory: true,
      includeMetadata: true,
      filterEmptyCategories: false,
      sortBy: 'name',
      sortOrder: 'asc'
    };
  }

  /**
   * Get default transformation options
   */
  private getDefaultTransformationOptions(): TransformationOptions {
    return {
      delimiter: ',',
      encoding: 'utf-8',
      includeHeaders: true,
      dateFormat: 'iso',
      numberFormat: 'decimal'
    };
  }

  /**
   * Get default persistence options
   */
  private getDefaultPersistenceOptions(): PersistenceOptions {
    return {
      useTransaction: true,
      validateReferences: true,
      createAuditLog: true,
      backupBeforeImport: false,
      rollbackOnError: true
    };
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(
    progress: OperationProgress,
    onProgress?: (progress: OperationProgress) => void
  ): void {
    if (onProgress) {
      onProgress(progress);
    }
  }
}

// Create and export singleton instance
export const categoryDataService = new CategoryDataService(); 