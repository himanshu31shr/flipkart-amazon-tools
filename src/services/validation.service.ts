import { Category } from './category.service';
import { ValidationResult } from '../types/categoryExportImport.types';

/**
 * Simplified ValidationService for basic category validation
 * Without inventory functionality
 */
export class ValidationService {
  
  validateCategoryData(categories: Category[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    categories.forEach((category, index) => {
      // Required field validation
      if (!category.name || category.name.trim() === '') {
        errors.push(`Category at row ${index + 1} is missing a name`);
      }

      // Cost price validation
      if (category.costPrice !== null && category.costPrice !== undefined) {
        if (typeof category.costPrice !== 'number' || category.costPrice < 0) {
          errors.push(`Category "${category.name}" at row ${index + 1} has invalid cost price: ${category.costPrice}`);
        }
      }

      // Name length validation
      if (category.name && category.name.length > 100) {
        warnings.push(`Category "${category.name}" has a name longer than 100 characters`);
      }

      // Description length validation
      if (category.description && category.description.length > 500) {
        warnings.push(`Category "${category.name}" has a description longer than 500 characters`);
      }
    });

    // Check for duplicate names
    const nameMap = new Map<string, number>();
    categories.forEach((category, index) => {
      if (category.name) {
        const normalizedName = category.name.trim().toLowerCase();
        if (nameMap.has(normalizedName)) {
          errors.push(`Duplicate category name "${category.name}" found at rows ${nameMap.get(normalizedName)! + 1} and ${index + 1}`);
        } else {
          nameMap.set(normalizedName, index);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateCSVFormat(csvData: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const lines = csvData.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        errors.push('CSV file must contain at least a header row and one data row');
      }

      if (lines.length > 0) {
        const headerLine = lines[0];
        const expectedHeaders = ['name', 'description', 'tag', 'costPrice'];
        const actualHeaders = headerLine.split(',').map(h => h.trim().toLowerCase());

        if (!actualHeaders.includes('name')) {
          errors.push('CSV file must contain a "name" column');
        }

        expectedHeaders.forEach(header => {
          if (!actualHeaders.includes(header.toLowerCase())) {
            warnings.push(`CSV file is missing optional column: ${header}`);
          }
        });
      }
    } catch {
      errors.push('Invalid CSV format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}