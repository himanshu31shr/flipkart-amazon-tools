import { Category } from '../types/category';
import { ValidationResult } from '../types/categoryExportImport.types';

/**
 * Validation utilities for inventory deduction configuration
 * Ensures data integrity for automatic inventory deduction functionality
 */
export class InventoryDeductionValidationService {

  /**
   * Validates inventory deduction quantity for a category
   * @param quantity - The deduction quantity to validate
   * @returns ValidationResult with validation status and messages
   */
  validateDeductionQuantity(quantity: number | undefined | null): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Allow null/undefined for disabled deduction
    if (quantity === null || quantity === undefined) {
      return {
        isValid: true,
        errors,
        warnings
      };
    }

    // Must be a valid number
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      errors.push('Deduction quantity must be a valid number');
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // Must be positive
    if (quantity <= 0) {
      errors.push('Deduction quantity must be greater than 0');
    }

    // Warn for very large quantities
    if (quantity > 10000) {
      warnings.push('Deduction quantity is very large (>10,000) - please verify this is correct');
    }

    // Warn for non-integer quantities for piece-based inventory
    if (quantity % 1 !== 0) {
      warnings.push('Non-integer deduction quantities may cause precision issues with piece-based inventory');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates complete category configuration for inventory deduction
   * @param category - Category to validate
   * @returns ValidationResult with comprehensive validation feedback
   */
  validateCategoryDeductionConfig(category: Category): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // If no deduction quantity is set, no validation needed
    if (category.inventoryDeductionQuantity === null || category.inventoryDeductionQuantity === undefined) {
      return {
        isValid: true,
        errors,
        warnings
      };
    }

    // Validate the deduction quantity itself
    const quantityValidation = this.validateDeductionQuantity(category.inventoryDeductionQuantity);
    errors.push(...quantityValidation.errors);
    warnings.push(...quantityValidation.warnings);

    // Category must have a categoryGroupId for inventory deduction
    if (!category.categoryGroupId) {
      errors.push('Category must be assigned to a category group to enable automatic inventory deduction');
    }

    // Category should have inventory type and unit defined
    if (!category.inventoryType) {
      warnings.push('Category should have an inventory type (weight or qty) defined for optimal deduction tracking');
    }

    if (!category.inventoryUnit) {
      warnings.push('Category should have an inventory unit (kg, g, or pcs) defined for optimal deduction tracking');
    }

    // Validate consistency between inventory type and unit
    if (category.inventoryType && category.inventoryUnit) {
      const weightUnits = ['kg', 'g'];
      const qtyUnits = ['pcs'];

      if (category.inventoryType === 'weight' && !weightUnits.includes(category.inventoryUnit)) {
        warnings.push(`Inventory type is 'weight' but unit '${category.inventoryUnit}' is not a weight unit (kg, g)`);
      }

      if (category.inventoryType === 'qty' && !qtyUnits.includes(category.inventoryUnit)) {
        warnings.push(`Inventory type is 'qty' but unit '${category.inventoryUnit}' is not a quantity unit (pcs)`);
      }
    }

    // For weight-based inventory, suggest appropriate deduction quantities
    if (category.inventoryType === 'weight' && category.inventoryDeductionQuantity) {
      if (category.inventoryUnit === 'kg' && category.inventoryDeductionQuantity < 0.001) {
        warnings.push('Very small deduction quantities in kg may cause precision issues');
      }
      if (category.inventoryUnit === 'g' && category.inventoryDeductionQuantity > 10000) {
        warnings.push('Very large deduction quantities in grams - consider using kg units instead');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates multiple categories for inventory deduction configuration
   * @param categories - Array of categories to validate
   * @returns ValidationResult with aggregated validation results
   */
  validateMultipleCategoriesDeduction(categories: Category[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    categories.forEach((category, index) => {
      const categoryValidation = this.validateCategoryDeductionConfig(category);
      
      // Prefix errors and warnings with category identifier
      const categoryId = category.name || `Category ${index + 1}`;
      
      categoryValidation.errors.forEach(error => {
        errors.push(`[${categoryId}] ${error}`);
      });

      categoryValidation.warnings.forEach(warning => {
        warnings.push(`[${categoryId}] ${warning}`);
      });
    });

    // Check for potential conflicts across categories
    const categoriesWithDeduction = categories.filter(cat => 
      cat.inventoryDeductionQuantity !== null && 
      cat.inventoryDeductionQuantity !== undefined
    );

    if (categoriesWithDeduction.length > 0) {
      // Group by category group to check for consistency
      const groupMap = new Map<string, Category[]>();
      categoriesWithDeduction.forEach(category => {
        if (category.categoryGroupId) {
          if (!groupMap.has(category.categoryGroupId)) {
            groupMap.set(category.categoryGroupId, []);
          }
          groupMap.get(category.categoryGroupId)!.push(category);
        }
      });

      // Check for mixed inventory types within same category group
      groupMap.forEach((groupCategories, groupId) => {
        const inventoryTypes = new Set(groupCategories.map(cat => cat.inventoryType).filter(Boolean));
        const inventoryUnits = new Set(groupCategories.map(cat => cat.inventoryUnit).filter(Boolean));

        if (inventoryTypes.size > 1) {
          warnings.push(`Category group ${groupId} contains categories with different inventory types (${Array.from(inventoryTypes).join(', ')}) - this may cause confusion`);
        }

        if (inventoryUnits.size > 1) {
          warnings.push(`Category group ${groupId} contains categories with different inventory units (${Array.from(inventoryUnits).join(', ')}) - ensure this is intentional`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates if a category is properly configured for automatic deduction
   * @param category - Category to check
   * @returns boolean indicating if category is ready for automatic deduction
   */
  isCategoryReadyForDeduction(category: Category): boolean {
    return !!(
      category.inventoryDeductionQuantity && 
      category.inventoryDeductionQuantity > 0 &&
      category.categoryGroupId &&
      category.inventoryType &&
      category.inventoryUnit
    );
  }

  /**
   * Gets user-friendly validation summary for a category
   * @param category - Category to summarize
   * @returns String summary of validation status
   */
  getValidationSummary(category: Category): string {
    const validation = this.validateCategoryDeductionConfig(category);
    
    if (!category.inventoryDeductionQuantity) {
      return 'Automatic inventory deduction is disabled';
    }

    if (validation.isValid) {
      return `Ready for automatic deduction: ${category.inventoryDeductionQuantity} ${category.inventoryUnit || 'units'} per product`;
    } else {
      return `Configuration issues: ${validation.errors.join(', ')}`;
    }
  }
}

// Export singleton instance for consistent usage
export const inventoryDeductionValidator = new InventoryDeductionValidationService();