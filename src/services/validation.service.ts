import { 
  CategoryCSVRow,
  ImportValidationReport,
  CategoryValidationResult,
  ImportConfiguration
} from '../types/categoryExportImport.types';

/**
 * ValidationService - Handles data integrity validation and business rule enforcement
 * 
 * This service is responsible for comprehensive validation of imported CSV data,
 * following the validation algorithm designed in the creative phase.
 * 
 * Key responsibilities:
 * - Format validation (required fields, data types)
 * - Business rule validation (unique constraints, references)
 * - Relationship validation (product-category mappings)
 * - Conflict detection (duplicates, overlaps)
 */
export class ValidationService {

  /**
   * Validate imported CSV data comprehensively
   * 
   * @param csvRows Array of CSV rows to validate
   * @param configuration Import configuration
   * @param onProgress Progress callback function
   * @returns Promise resolving to validation report
   */
  async validateImportData(
    csvRows: CategoryCSVRow[],
    configuration: ImportConfiguration,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportValidationReport> {
    try {
      const report: ImportValidationReport = {
        isValid: true,
        totalRows: csvRows.length,
        validRows: 0,
        errorRows: 0,
        warningRows: 0,
        categoryResults: [],
        globalErrors: [],
        duplicateCategories: [],
        duplicateSKUs: []
      };

      if (csvRows.length === 0) {
        report.isValid = false;
        report.globalErrors.push({
          field: 'file',
          message: 'CSV file is empty or contains no valid data',
          severity: 'error',
          code: 'EMPTY_FILE'
        });
        return report;
      }

      // Phase 1: Individual row validation
      const batchSize = 25;
      for (let i = 0; i < csvRows.length; i += batchSize) {
        const batch = csvRows.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (csvRow, batchIndex) => {
            const rowResult = await this.validateSingleRow(csvRow);
            
            // Report progress
            const currentIndex = i + batchIndex + 1;
            if (onProgress) {
              onProgress(currentIndex, csvRows.length);
            }
            
            return rowResult;
          })
        );

        report.categoryResults.push(...batchResults);

        // Small delay for non-blocking processing
        if (i + batchSize < csvRows.length) {
          await this.delay(1);
        }
      }

      // Phase 2: Cross-reference validation
      this.performCrossReferenceValidation(report, csvRows);

      // Phase 3: Generate summary statistics
      this.generateValidationSummary(report);

      return report;

    } catch (error) {
      console.error('Error during validation:', error);
      
      return {
        isValid: false,
        totalRows: csvRows.length,
        validRows: 0,
        errorRows: csvRows.length,
        warningRows: 0,
        categoryResults: [],
        globalErrors: [{
          field: 'validation',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          code: 'VALIDATION_EXCEPTION'
        }],
        duplicateCategories: [],
        duplicateSKUs: []
      };
    }
  }

  /**
   * Validate a single CSV row
   * 
   * @param csvRow CSV row to validate
   * @param configuration Import configuration
   * @returns Promise resolving to validation result
   */
  private async validateSingleRow(
    csvRow: CategoryCSVRow
  ): Promise<CategoryValidationResult> {
    const result: CategoryValidationResult = {
      isValid: true,
      categoryId: csvRow.categoryId,
      categoryName: csvRow.categoryName,
      errors: [],
      warnings: []
    };

    // Format validation
    this.validateRequiredFields(csvRow, result);
    this.validateDataTypes(csvRow, result);
    this.validateDataRanges(csvRow, result);

    // Business rule validation
    this.validateBusinessRules(csvRow, result);

    // Relationship validation
    this.validateRelationships(csvRow, result);

    // Determine if row is valid
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate required fields are present and not empty
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   */
  private validateRequiredFields(csvRow: CategoryCSVRow, result: CategoryValidationResult): void {
    const requiredFields: Array<{ field: keyof CategoryCSVRow; name: string }> = [
      { field: 'categoryId', name: 'Category ID' },
      { field: 'categoryName', name: 'Category Name' }
    ];

    requiredFields.forEach(({ field, name }) => {
      const value = csvRow[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        result.errors.push({
          field,
          message: `${name} is required and cannot be empty`,
          severity: 'error',
          code: 'REQUIRED_FIELD'
        });
      }
    });
  }

  /**
   * Validate data types and formats
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   */
  private validateDataTypes(csvRow: CategoryCSVRow, result: CategoryValidationResult): void {
    // Validate numeric fields
    const numericFields: Array<{ field: keyof CategoryCSVRow; name: string }> = [
      { field: 'costPrice', name: 'Cost Price' },
      { field: 'productCount', name: 'Product Count' },
      { field: 'totalInventory', name: 'Total Inventory' },
      { field: 'lowStockThreshold', name: 'Low Stock Threshold' }
    ];

    numericFields.forEach(({ field, name }) => {
      const value = csvRow[field];
      if (value !== undefined && value !== null && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          result.errors.push({
            field,
            message: `${name} must be a valid number`,
            severity: 'error',
            code: 'INVALID_DATA_TYPE'
          });
        }
      }
    });

    // Validate date fields
    const dateFields: Array<{ field: keyof CategoryCSVRow; name: string }> = [
      { field: 'createdAt', name: 'Created At' },
      { field: 'updatedAt', name: 'Updated At' }
    ];

    dateFields.forEach(({ field, name }) => {
      const value = csvRow[field];
      if (value && typeof value === 'string' && value.trim() !== '') {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          result.warnings.push({
            field,
            message: `${name} is not a valid date format, will use current date`,
            code: 'INVALID_DATE_FORMAT'
          });
        }
      }
    });
  }

  /**
   * Validate numeric ranges and logical constraints
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   */
  private validateDataRanges(csvRow: CategoryCSVRow, result: CategoryValidationResult): void {
    // Cost price validation
    if (csvRow.costPrice !== undefined && csvRow.costPrice < 0) {
      result.errors.push({
        field: 'costPrice',
        message: 'Cost price cannot be negative',
        severity: 'error',
        code: 'INVALID_RANGE'
      });
    }

    // Product count validation
    if (csvRow.productCount !== undefined && csvRow.productCount < 0) {
      result.errors.push({
        field: 'productCount',
        message: 'Product count cannot be negative',
        severity: 'error',
        code: 'INVALID_RANGE'
      });
    }

    // Inventory validation
    if (csvRow.totalInventory !== undefined && csvRow.totalInventory < 0) {
      result.errors.push({
        field: 'totalInventory',
        message: 'Total inventory cannot be negative',
        severity: 'error',
        code: 'INVALID_RANGE'
      });
    }

    // Low stock threshold validation
    if (csvRow.lowStockThreshold !== undefined && csvRow.lowStockThreshold < 0) {
      result.errors.push({
        field: 'lowStockThreshold',
        message: 'Low stock threshold cannot be negative',
        severity: 'error',
        code: 'INVALID_RANGE'
      });
    }

    // Logical validation: low stock threshold should be less than total inventory
    if (csvRow.totalInventory !== undefined && 
        csvRow.lowStockThreshold !== undefined && 
        csvRow.lowStockThreshold > csvRow.totalInventory) {
      result.warnings.push({
        field: 'lowStockThreshold',
        message: 'Low stock threshold is higher than total inventory',
        code: 'LOGICAL_INCONSISTENCY'
      });
    }
  }

  /**
   * Validate business rules
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   * @param configuration Import configuration
   */
  private validateBusinessRules(
    csvRow: CategoryCSVRow, 
    result: CategoryValidationResult
  ): void {
    // Category name length validation
    if (csvRow.categoryName && csvRow.categoryName.length > 100) {
      result.errors.push({
        field: 'categoryName',
        message: 'Category name cannot exceed 100 characters',
        severity: 'error',
        code: 'FIELD_LENGTH_EXCEEDED'
      });
    }

    // Category ID format validation
    if (csvRow.categoryId && !/^[a-zA-Z0-9_-]+$/.test(csvRow.categoryId)) {
      result.errors.push({
        field: 'categoryId',
        message: 'Category ID can only contain letters, numbers, hyphens, and underscores',
        severity: 'error',
        code: 'INVALID_FORMAT'
      });
    }

    // Product count vs associated SKUs validation
    const skuCount = this.parseCSVArray(csvRow.associatedSKUs).length;
    if (csvRow.productCount !== undefined && skuCount !== csvRow.productCount) {
      result.warnings.push({
        field: 'productCount',
        message: `Product count (${csvRow.productCount}) doesn't match number of associated SKUs (${skuCount})`,
        code: 'COUNT_MISMATCH'
      });
    }

    // Validate array field consistency
    this.validateArrayFieldConsistency(csvRow, result);
  }

  /**
   * Validate relationships and references
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   */
  private validateRelationships(csvRow: CategoryCSVRow, result: CategoryValidationResult): void {
    // Validate product data consistency
    const skus = this.parseCSVArray(csvRow.associatedSKUs);
    const names = this.parseCSVArray(csvRow.productNames);
    const platforms = this.parseCSVArray(csvRow.productPlatforms);
    const costPrices = this.parseCSVArray(csvRow.productCostPrices);
    const sellingPrices = this.parseCSVArray(csvRow.productSellingPrices);

    // Check if all product arrays have the same length
    const lengths = [skus.length, names.length, platforms.length, costPrices.length, sellingPrices.length];
    const maxLength = Math.max(...lengths);
    const minLength = Math.min(...lengths);

    if (maxLength !== minLength) {
      result.warnings.push({
        field: 'associatedSKUs',
        message: 'Product data arrays have inconsistent lengths. Missing data will be filled with defaults.',
        code: 'ARRAY_LENGTH_MISMATCH'
      });
    }

    // Validate platform values
    platforms.forEach((platform, index) => {
      if (platform && !['amazon', 'flipkart'].includes(platform.toLowerCase())) {
        result.warnings.push({
          field: 'productPlatforms',
          message: `Invalid platform "${platform}" at position ${index + 1}. Will default to "amazon".`,
          code: 'INVALID_PLATFORM'
        });
      }
    });

    // Validate SKU uniqueness within the row
    const uniqueSkus = new Set(skus.filter(sku => sku && sku.trim() !== ''));
    if (uniqueSkus.size !== skus.filter(sku => sku && sku.trim() !== '').length) {
      result.errors.push({
        field: 'associatedSKUs',
        message: 'Duplicate SKUs found within the same category',
        severity: 'error',
        code: 'DUPLICATE_SKUS'
      });
    }
  }

  /**
   * Validate consistency between array fields
   * 
   * @param csvRow CSV row to validate
   * @param result Validation result to update
   */
  private validateArrayFieldConsistency(csvRow: CategoryCSVRow, result: CategoryValidationResult): void {
    const costPrices = this.parseCSVArray(csvRow.productCostPrices);
    const sellingPrices = this.parseCSVArray(csvRow.productSellingPrices);

    // Validate that cost prices are numbers
    costPrices.forEach((price, index) => {
      if (price && isNaN(Number(price))) {
        result.warnings.push({
          field: 'productCostPrices',
          message: `Invalid cost price "${price}" at position ${index + 1}`,
          code: 'INVALID_PRICE_FORMAT'
        });
      }
    });

    // Validate that selling prices are numbers
    sellingPrices.forEach((price, index) => {
      if (price && isNaN(Number(price))) {
        result.warnings.push({
          field: 'productSellingPrices',
          message: `Invalid selling price "${price}" at position ${index + 1}`,
          code: 'INVALID_PRICE_FORMAT'
        });
      }
    });
  }

  /**
   * Perform cross-reference validation across all rows
   * 
   * @param report Validation report to update
   * @param csvRows All CSV rows
   */
  private performCrossReferenceValidation(
    report: ImportValidationReport,
    csvRows: CategoryCSVRow[]
  ): void {
    // Find duplicate category IDs
    const categoryIds = csvRows.map(row => row.categoryId).filter(id => id && id.trim() !== '');
    const uniqueCategoryIds = new Set(categoryIds);
    
    if (uniqueCategoryIds.size !== categoryIds.length) {
      const duplicates = this.findDuplicates(categoryIds);
      report.duplicateCategories = duplicates;
      
      duplicates.forEach(duplicate => {
        report.globalErrors.push({
          field: 'categoryId',
          message: `Duplicate category ID found: ${duplicate}`,
          severity: 'error',
          code: 'DUPLICATE_CATEGORY_ID'
        });
      });
    }

    // Find duplicate SKUs across all categories
    const allSkus: string[] = [];
    csvRows.forEach(row => {
      const skus = this.parseCSVArray(row.associatedSKUs);
      allSkus.push(...skus.filter(sku => sku && sku.trim() !== ''));
    });

    const uniqueSkus = new Set(allSkus);
    if (uniqueSkus.size !== allSkus.length) {
      const duplicates = this.findDuplicates(allSkus);
      report.duplicateSKUs = duplicates;
      
      duplicates.forEach(duplicate => {
        report.globalErrors.push({
          field: 'associatedSKUs',
          message: `SKU "${duplicate}" appears in multiple categories`,
          severity: 'error',
          code: 'DUPLICATE_SKU_ACROSS_CATEGORIES'
        });
      });
    }
  }

  /**
   * Generate validation summary statistics
   * 
   * @param report Validation report to update
   */
  private generateValidationSummary(report: ImportValidationReport): void {
    report.validRows = report.categoryResults.filter(result => result.isValid).length;
    report.errorRows = report.categoryResults.filter(result => !result.isValid).length;
    report.warningRows = report.categoryResults.filter(result => 
      result.isValid && result.warnings.length > 0
    ).length;

    // Overall validity check
    report.isValid = report.errorRows === 0 && report.globalErrors.length === 0;
  }

  /**
   * Find duplicate values in an array
   * 
   * @param array Array to check for duplicates
   * @returns Array of duplicate values
   */
  private findDuplicates(array: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    array.forEach(item => {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    });

    return Array.from(duplicates);
  }

  /**
   * Parse semicolon-separated array from CSV
   * 
   * @param csvValue Semicolon-separated string
   * @returns Array of strings
   */
  private parseCSVArray(csvValue: string): string[] {
    if (!csvValue || csvValue.trim() === '') {
      return [];
    }
    
    return csvValue.split(';').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Simple delay utility for non-blocking processing
   * 
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 