import { Category, CategoryLink } from '../types/category';
import { ValidationResult } from '../types/categoryExportImport.types';

/**
 * Validation utilities for circular dependency detection in category links
 * Prevents invalid category linking configurations using graph algorithms
 */
export class CircularDependencyValidationService {

  /**
   * Validates if adding a category link would create a circular dependency
   * @param sourceId - ID of the source category
   * @param targetId - ID of the target category being linked
   * @param allCategories - Complete list of categories to check dependencies
   * @returns ValidationResult with validation status and dependency chain info
   */
  validateLink(sourceId: string, targetId: string, allCategories: Category[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Self-linking is not allowed
    if (sourceId === targetId) {
      errors.push('Cannot link a category to itself');
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // Check if source category exists
    const sourceCategory = allCategories.find(cat => cat.id === sourceId);
    if (!sourceCategory) {
      errors.push(`Source category with ID '${sourceId}' not found`);
    }

    // Check if target category exists
    const targetCategory = allCategories.find(cat => cat.id === targetId);
    if (!targetCategory) {
      errors.push(`Target category with ID '${targetId}' not found`);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // Check if target category has inventory deduction configured
    if (!targetCategory!.inventoryDeductionQuantity || targetCategory!.inventoryDeductionQuantity <= 0) {
      warnings.push(`Target category '${targetCategory!.name}' has no inventory deduction quantity configured - cascade deduction will not occur`);
    }

    // Check if target category is assigned to a category group
    if (!targetCategory!.categoryGroupId) {
      warnings.push(`Target category '${targetCategory!.name}' is not assigned to a category group - inventory deduction will not be possible`);
    }

    // Check for circular dependency by simulating the link addition
    const simulatedCategories = allCategories.map(cat => {
      if (cat.id === sourceId) {
        const existingLinks = cat.linkedCategories || [];
        const newLink: CategoryLink = {
          categoryId: targetId,
          isActive: true,
          createdAt: new Date()
        };
        return {
          ...cat,
          linkedCategories: [...existingLinks, newLink]
        };
      }
      return cat;
    });

    const circularCheck = this.checkCircularDependency(sourceId, simulatedCategories);
    
    if (!circularCheck.isValid) {
      errors.push(...circularCheck.errors);
    }

    warnings.push(...circularCheck.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detects circular dependencies in category link chains
   * Uses depth-first search with visited tracking
   * @param categoryId - Starting category ID to check
   * @param allCategories - Complete list of categories
   * @param visited - Set of visited category IDs (for recursive tracking)
   * @param path - Current path for cycle detection
   * @returns ValidationResult with circular dependency information
   */
  checkCircularDependency(
    categoryId: string, 
    allCategories: Category[], 
    visited: Set<string> = new Set(),
    path: string[] = []
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Performance optimization: limit traversal depth to prevent infinite loops
    const MAX_DEPTH = 100;
    if (path.length > MAX_DEPTH) {
      errors.push(`Dependency chain exceeded maximum depth of ${MAX_DEPTH} - possible circular dependency`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // If we've seen this category in the current path, we have a cycle
    if (path.includes(categoryId)) {
      const cycleStart = path.indexOf(categoryId);
      const cycle = [...path.slice(cycleStart), categoryId];
      const cycleNames = this.getCategoryNames(cycle, allCategories);
      
      errors.push(`Circular dependency detected: ${cycleNames.join(' → ')}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    // If we've already fully validated this category, skip it
    if (visited.has(categoryId)) {
      return {
        isValid: true,
        errors,
        warnings
      };
    }

    const category = allCategories.find(cat => cat.id === categoryId);
    if (!category) {
      // This is handled at higher level validation
      return {
        isValid: true,
        errors,
        warnings
      };
    }

    // Add current category to path
    const currentPath = [...path, categoryId];

    // Check all linked categories
    const linkedCategories = category.linkedCategories?.filter(link => link.isActive !== false) || [];
    
    for (const link of linkedCategories) {
      const linkResult = this.checkCircularDependency(
        link.categoryId, 
        allCategories, 
        visited, 
        currentPath
      );
      
      if (!linkResult.isValid) {
        errors.push(...linkResult.errors);
      }
      warnings.push(...linkResult.warnings);
    }

    // Mark as visited after checking all dependencies
    visited.add(categoryId);

    // Warn about deep dependency chains
    if (currentPath.length > 5) {
      const chainNames = this.getCategoryNames(currentPath, allCategories);
      warnings.push(`Deep dependency chain detected (${currentPath.length} levels): ${chainNames.join(' → ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates all category links in a category array for circular dependencies
   * @param categories - Array of categories to validate
   * @returns ValidationResult with comprehensive validation results
   */
  validateAllCategoryLinks(categories: Category[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Track overall validation performance
    const startTime = Date.now();

    // Validate each category's links
    categories.forEach(category => {
      if (category.id && category.linkedCategories?.length) {
        const categoryResult = this.checkCircularDependency(category.id, categories);
        
        // Prefix errors and warnings with category name
        const categoryName = category.name || category.id;
        
        categoryResult.errors.forEach(error => {
          errors.push(`[${categoryName}] ${error}`);
        });

        categoryResult.warnings.forEach(warning => {
          warnings.push(`[${categoryName}] ${warning}`);
        });
      }
    });

    // Performance warning
    const validationTime = Date.now() - startTime;
    if (validationTime > 500) {
      warnings.push(`Circular dependency validation took ${validationTime}ms - consider simplifying category link structure for better performance`);
    }

    // Statistics about link complexity
    const totalLinks = categories.reduce((sum, cat) => sum + (cat.linkedCategories?.length || 0), 0);

    if (totalLinks > 50) {
      warnings.push(`High number of category links (${totalLinks}) detected - monitor system performance with complex dependency chains`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets a visual representation of category dependency chains
   * @param categoryId - Starting category ID
   * @param allCategories - Complete list of categories
   * @param maxDepth - Maximum depth to traverse (default 10)
   * @returns Array of dependency chain strings
   */
  getDependencyChains(categoryId: string, allCategories: Category[], maxDepth: number = 10): string[] {
    const chains: string[] = [];
    
    const traverse = (currentId: string, path: string[], depth: number) => {
      if (depth > maxDepth) {
        chains.push(`${this.getCategoryNames(path, allCategories).join(' → ')} → [...]`);
        return;
      }

      const category = allCategories.find(cat => cat.id === currentId);
      if (!category || !category.linkedCategories?.length) {
        if (path.length > 1) {
          chains.push(this.getCategoryNames(path, allCategories).join(' → '));
        }
        return;
      }

      const linkedCategories = category.linkedCategories.filter(link => link.isActive !== false);
      
      for (const link of linkedCategories) {
        traverse(link.categoryId, [...path, link.categoryId], depth + 1);
      }
    };

    traverse(categoryId, [categoryId], 0);
    return chains;
  }

  /**
   * Helper method to convert category IDs to names for user-friendly messages
   * @param categoryIds - Array of category IDs
   * @param allCategories - Complete list of categories
   * @returns Array of category names
   */
  private getCategoryNames(categoryIds: string[], allCategories: Category[]): string[] {
    return categoryIds.map(id => {
      const category = allCategories.find(cat => cat.id === id);
      return category?.name || id;
    });
  }

  /**
   * Gets user-friendly summary of category link validation
   * @param category - Category to summarize
   * @param allCategories - Complete list of categories for dependency checking
   * @returns String summary of link validation status
   */
  getLinkValidationSummary(category: Category, allCategories: Category[]): string {
    if (!category.linkedCategories?.length) {
      return 'No category links configured';
    }

    const activeLinks = category.linkedCategories.filter(link => link.isActive !== false);
    if (activeLinks.length === 0) {
      return 'All category links are disabled';
    }

    const validation = category.id ? this.checkCircularDependency(category.id, allCategories) : { isValid: true, errors: [], warnings: [] };
    
    if (!validation.isValid) {
      return `Link configuration has issues: ${validation.errors[0]}`;
    }

    const linkCount = activeLinks.length;
    const warningCount = validation.warnings.length;
    
    let summary = `${linkCount} active link${linkCount !== 1 ? 's' : ''}`;
    if (warningCount > 0) {
      summary += ` (${warningCount} warning${warningCount !== 1 ? 's' : ''})`;
    }
    
    return summary;
  }
}

// Export singleton instance for consistent usage
export const circularDependencyValidator = new CircularDependencyValidationService();