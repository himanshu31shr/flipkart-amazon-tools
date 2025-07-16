import { 
  CategoryExportData, 
  CategoryCSVRow, 
  TransformationOptions
} from '../types/categoryExportImport.types';
import Papa from 'papaparse';

/**
 * DataTransformationService - Handles CSV transformation and file operations
 * 
 * This service is responsible for converting between internal data structures
 * and CSV format, following the streaming batch processing algorithm
 * designed in the creative phase.
 * 
 * Key responsibilities:
 * - Export transformation: CategoryExportData → CSV
 * - Import transformation: CSV → CategoryExportData
 * - File parsing and generation
 * - Data normalization and schema mapping
 */
export class DataTransformationService {

  /**
   * Transform category export data to CSV format
   * 
   * @param categoryData Array of category export data
   * @param options Transformation options
   * @param onProgress Progress callback function
   * @returns Promise resolving to CSV data
   */
  async transformToCSV(
    categoryData: CategoryExportData[],
    options: TransformationOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<string> {
    try {
      const csvRows: CategoryCSVRow[] = [];
      const batchSize = 20; // Process in batches

      // Process categories in batches
      for (let i = 0; i < categoryData.length; i += batchSize) {
        const batch = categoryData.slice(i, i + batchSize);
        
        const batchRows = batch.map((categoryExportData, batchIndex) => {
          const csvRow = this.transformCategoryToCSVRow(categoryExportData, options);
          
          // Report progress
          const currentIndex = i + batchIndex + 1;
          if (onProgress) {
            onProgress(currentIndex, categoryData.length);
          }
          
          return csvRow;
        });

        csvRows.push(...batchRows);

        // Small delay for non-blocking processing
        if (i + batchSize < categoryData.length) {
          await this.delay(1);
        }
      }

      // Generate CSV string
      const csvConfig = {
        delimiter: options.delimiter,
        header: options.includeHeaders,
        encoding: options.encoding
      };

      return Papa.unparse(csvRows, csvConfig);

    } catch (error) {
      console.error('Error transforming to CSV:', error);
      throw new Error(`Failed to transform data to CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CSV file and return structured data
   * 
   * @param file CSV file to parse
   * @returns Promise resolving to array of CSV rows
   */
  async parseCSVFile(file: File): Promise<CategoryCSVRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Normalize header names
          return header.trim().toLowerCase().replace(/\s+/g, '');
        },
        transform: (value: string) => {
          // Trim whitespace from all values
          return value.trim();
        },
        complete: (results) => {
          try {
            if (results.errors && results.errors.length > 0) {
              const errorMessages = results.errors.map(error => error.message).join(', ');
              reject(new Error(`CSV parsing errors: ${errorMessages}`));
              return;
            }

            const csvRows = results.data as Record<string, string>[];
            const validatedRows = this.validateAndNormalizeCSVRows(csvRows);
            resolve(validatedRows);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        }
      });
    });
  }

  /**
   * Transform CSV data back to category export data format
   * 
   * @param csvRows Array of CSV rows
   * @param configuration Import configuration
   * @returns Promise resolving to category export data
   */
  async transformFromCSV(
    csvRows: CategoryCSVRow[]
  ): Promise<CategoryExportData[]> {
    try {
      const result: CategoryExportData[] = [];
      const batchSize = 15;

      for (let i = 0; i < csvRows.length; i += batchSize) {
        const batch = csvRows.slice(i, i + batchSize);
        
        const batchResults = batch.map(csvRow => {
          return this.transformCSVRowToCategory(csvRow);
        });

        result.push(...batchResults);

        // Small delay for non-blocking processing
        if (i + batchSize < csvRows.length) {
          await this.delay(1);
        }
      }

      return result;

    } catch (error) {
      console.error('Error transforming from CSV:', error);
      throw new Error(`Failed to transform from CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate download file from CSV data
   * 
   * @param csvData CSV string data
   * @param options Transformation options
   * @returns File generation result
   */
  async generateDownloadFile(
    csvData: string,
    options: TransformationOptions
  ): Promise<{ fileName: string; fileSize: number }> {
    try {
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `category-export-${timestamp}.csv`;
      
      // Create blob and trigger download
      const blob = new Blob([csvData], { 
        type: `text/csv;charset=${options.encoding}` 
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);

      return {
        fileName,
        fileSize: blob.size
      };

    } catch (error) {
      console.error('Error generating download file:', error);
      throw new Error(`Failed to generate download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform a single category export data to CSV row
   * 
   * @param categoryData Category export data
   * @param options Transformation options
   * @returns CSV row
   */
  private transformCategoryToCSVRow(
    categoryData: CategoryExportData,
    options: TransformationOptions
  ): CategoryCSVRow {
    const { category, metadata } = categoryData;

    return {
      categoryId: category.id || '',
      categoryName: category.name || '',
      description: category.description || '',
      tag: category.tag || '',
      costPrice: category.costPrice || 0,
      productCount: metadata.productCount || 0,
      totalInventory: metadata.totalInventory || 0,
      lowStockThreshold: metadata.lowStockThreshold || 0,
      associatedSKUs: metadata.associatedSKUs.join(';'),
      productNames: metadata.productNames.join(';'),
      productPlatforms: metadata.productPlatforms.join(';'),
      productCostPrices: metadata.productCostPrices.join(';'),
      productSellingPrices: metadata.productSellingPrices.join(';'),
      inventoryQuantities: metadata.inventoryQuantities.join(';'),
      createdAt: this.formatDateForCSV(category.createdAt, options),
      updatedAt: this.formatDateForCSV(category.updatedAt, options)
    };
  }

  /**
   * Transform CSV row back to category export data
   * 
   * @param csvRow CSV row data
   * @param configuration Import configuration
   * @returns Category export data
   */
  private transformCSVRowToCategory(
    csvRow: CategoryCSVRow
  ): CategoryExportData {
    // Parse arrays from CSV
    const associatedSKUs = this.parseCSVArray(csvRow.associatedSKUs);
    const productNames = this.parseCSVArray(csvRow.productNames);
    const productPlatforms = this.parseCSVArray(csvRow.productPlatforms);
    const productCostPrices = this.parseCSVArray(csvRow.productCostPrices).map(Number);
    const productSellingPrices = this.parseCSVArray(csvRow.productSellingPrices).map(Number);
    const inventoryQuantities = this.parseCSVArray(csvRow.inventoryQuantities).map(Number);

    // Create products from CSV data
    const products = associatedSKUs.map((sku, index) => ({
      sku: sku || '',
      name: productNames[index] || '',
      description: '',
      categoryId: csvRow.categoryId,
      platform: (productPlatforms[index] || 'amazon') as 'amazon' | 'flipkart',
      visibility: 'visible' as const,
      sellingPrice: productSellingPrices[index] || 0,
      customCostPrice: productCostPrices[index] || null,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }));

    // Create category
    const category = {
      id: csvRow.categoryId,
      name: csvRow.categoryName,
      description: csvRow.description,
      tag: csvRow.tag,
      costPrice: csvRow.costPrice,
      createdAt: csvRow.createdAt,
      updatedAt: csvRow.updatedAt
    };

    // Create inventory
    const inventory = csvRow.totalInventory > 0 ? {
      totalQuantity: csvRow.totalInventory,
      lowStockThreshold: csvRow.lowStockThreshold,
      lastUpdated: new Date(),
      productCount: csvRow.productCount
    } : null;

    // Create metadata
    const metadata = {
      productCount: csvRow.productCount,
      totalInventory: csvRow.totalInventory,
      lowStockThreshold: csvRow.lowStockThreshold,
      associatedSKUs,
      productNames,
      productPlatforms,
      productCostPrices,
      productSellingPrices,
      inventoryQuantities,
      createdAt: csvRow.createdAt,
      updatedAt: csvRow.updatedAt
    };

    return {
      category,
      products,
      inventory,
      metadata
    };
  }

  /**
   * Validate and normalize CSV rows after parsing
   * 
   * @param rawRows Raw CSV data from Papa Parse
   * @returns Validated CSV rows
   */
  private validateAndNormalizeCSVRows(rawRows: Record<string, string>[]): CategoryCSVRow[] {
    return rawRows.map((row, index) => {
      try {
        return {
          categoryId: this.normalizeString(row.categoryid || row.id || ''),
          categoryName: this.normalizeString(row.categoryname || row.name || ''),
          description: this.normalizeString(row.description || ''),
          tag: this.normalizeString(row.tag || ''),
          costPrice: this.normalizeNumber(row.costprice || 0),
          productCount: this.normalizeNumber(row.productcount || 0),
          totalInventory: this.normalizeNumber(row.totalinventory || 0),
          lowStockThreshold: this.normalizeNumber(row.lowstockthreshold || 0),
          associatedSKUs: this.normalizeString(row.associatedskus || ''),
          productNames: this.normalizeString(row.productnames || ''),
          productPlatforms: this.normalizeString(row.productplatforms || ''),
          productCostPrices: this.normalizeString(row.productcostprices || ''),
          productSellingPrices: this.normalizeString(row.productsellingprices || ''),
          inventoryQuantities: this.normalizeString(row.inventoryquantities || ''),
          createdAt: this.normalizeString(row.createdat || new Date().toISOString()),
          updatedAt: this.normalizeString(row.updatedat || new Date().toISOString())
        };
      } catch (error) {
        console.error(`Error normalizing CSV row ${index}:`, error);
        throw new Error(`Invalid CSV data at row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Format date for CSV output
   * 
   * @param date Date in various formats
   * @param options Transformation options
   * @returns Formatted date string
   */
  private formatDateForCSV(
    date: Date | number | string | { toDate(): Date; toMillis(): number } | undefined,
    options: TransformationOptions
  ): string {
    if (!date) {
      return new Date().toISOString();
    }

    try {
      let dateObj: Date;

      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'object' && 'toDate' in date) {
        dateObj = date.toDate();
      } else {
        dateObj = new Date();
      }

      switch (options.dateFormat) {
        case 'iso':
          return dateObj.toISOString();
        case 'locale':
          return dateObj.toLocaleDateString();
        case 'timestamp':
          return dateObj.getTime().toString();
        default:
          return dateObj.toISOString();
      }
    } catch (error) {
      console.error('Error formatting date for CSV:', error);
      return new Date().toISOString();
    }
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
   * Normalize string values
   * 
   * @param value Raw string value
   * @returns Normalized string
   */
  private normalizeString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    return String(value).trim();
  }

  /**
   * Normalize numeric values
   * 
   * @param value Raw numeric value
   * @returns Normalized number
   */
  private normalizeNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
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