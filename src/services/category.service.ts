import { Timestamp, orderBy, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Category } from '../types/category';
import { inventoryDeductionValidator } from '../utils/inventoryDeductionValidation';
import { ValidationResult } from '../types/categoryExportImport.types';

// Re-export Category interface for backward compatibility
export type { Category };

export class CategoryService extends FirebaseService {
  private readonly COLLECTION_NAME = 'categories';

  async getCategories(): Promise<Category[]> {
    const categories = await this.getDocuments<Category>(
      this.COLLECTION_NAME,
      [orderBy('name', 'asc')]
    );
    
    // Handle case where getDocuments returns undefined (e.g., in tests or emulator issues)
    if (!categories || !Array.isArray(categories)) {
      return [];
    }
    
    return categories;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.getDocument<Category>(this.COLLECTION_NAME, id);
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<string> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedCategory = {
      name: category.name,
      description: category.description || '',
      tag: category.tag || '',
      categoryGroupId: category.categoryGroupId || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await this.addDocument(this.COLLECTION_NAME, sanitizedCategory);
    return docRef.id;
  }

  async updateCategory(id: string, category: Partial<Omit<Category, 'id'>>): Promise<void> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedUpdates: Partial<Category> & { updatedAt: Timestamp } = {
      updatedAt: Timestamp.now(),
    };
    
    if (category.name !== undefined) {
      sanitizedUpdates.name = category.name;
    }
    if (category.description !== undefined) {
      sanitizedUpdates.description = category.description || '';
    }
    if (category.tag !== undefined) {
      sanitizedUpdates.tag = category.tag || '';
    }
    if (category.categoryGroupId !== undefined) {
      sanitizedUpdates.categoryGroupId = category.categoryGroupId || undefined;
    }
    if (category.inventoryType !== undefined) {
      sanitizedUpdates.inventoryType = category.inventoryType;
    }
    if (category.inventoryUnit !== undefined) {
      sanitizedUpdates.inventoryUnit = category.inventoryUnit;
    }
    if (category.unitConversionRate !== undefined) {
      sanitizedUpdates.unitConversionRate = category.unitConversionRate;
    }
    if (category.inventoryDeductionQuantity !== undefined) {
      sanitizedUpdates.inventoryDeductionQuantity = category.inventoryDeductionQuantity;
    }
    
    await this.updateDocument(this.COLLECTION_NAME, id, sanitizedUpdates);
  }

  async deleteCategory(id: string): Promise<void> {
    // TODO: Check if category is in use before deleting
    await this.deleteDocument(this.COLLECTION_NAME, id);
  }

  async isCategoryInUse(categoryId: string): Promise<boolean> {
    const products = await this.getDocuments<{ id: string }>(
      'products',
      [
        where('categoryId', '==', categoryId),
        orderBy('id', 'asc')
      ]
    );
    return products.length > 0;
  }

  // Group-related methods
  async getCategoriesWithGroups(): Promise<Array<Category & { categoryGroup?: { id: string; name: string; color: string } }>> {
    const categories = await this.getCategories();
    const categoriesWithGroups = [];

    for (const category of categories) {
      if (category.categoryGroupId) {
        try {
          const group = await this.getDocument<{ id: string; name: string; color: string }>('categoryGroups', category.categoryGroupId);
          categoriesWithGroups.push({
            ...category,
            categoryGroup: group
          });
        } catch {
          // If group doesn't exist, just add category without group
          categoriesWithGroups.push(category);
        }
      } else {
        categoriesWithGroups.push(category);
      }
    }

    return categoriesWithGroups;
  }

  async assignCategoryToGroup(categoryId: string, groupId: string | null): Promise<void> {
    await this.updateCategory(categoryId, { categoryGroupId: groupId || undefined });
  }

  async getCategoriesByGroup(groupId: string): Promise<Category[]> {
    return this.getDocuments<Category>(
      this.COLLECTION_NAME,
      [
        where('categoryGroupId', '==', groupId),
        orderBy('name', 'asc')
      ]
    );
  }

  async getUnassignedCategories(): Promise<Category[]> {
    // Get categories without a group assignment
    const allCategories = await this.getCategories();
    return allCategories.filter(category => !category.categoryGroupId);
  }

  async assignMultipleCategoriesToGroup(categoryIds: string[], groupId: string | null): Promise<void> {
    const updatePromises = categoryIds.map(categoryId =>
      this.updateCategory(categoryId, { categoryGroupId: groupId || undefined })
    );
    await Promise.all(updatePromises);
  }

  // Inventory Deduction Methods

  /**
   * Get categories that have inventory deduction configured
   * @returns Promise<Category[]> Categories with deduction quantity set
   */
  async getCategoriesWithInventoryDeduction(): Promise<Category[]> {
    const allCategories = await this.getCategories();
    return allCategories.filter(category => 
      category.inventoryDeductionQuantity !== null && 
      category.inventoryDeductionQuantity !== undefined &&
      category.inventoryDeductionQuantity > 0
    );
  }

  /**
   * Validate inventory deduction configuration for a category
   * @param category Category to validate
   * @returns ValidationResult with validation status and messages
   */
  validateInventoryDeductionConfig(category: Category): ValidationResult {
    return inventoryDeductionValidator.validateCategoryDeductionConfig(category);
  }

  /**
   * Update inventory deduction quantity for a category
   * @param categoryId ID of the category to update
   * @param quantity New deduction quantity (null to disable)
   * @returns Promise<void>
   */
  async updateInventoryDeductionQuantity(categoryId: string, quantity: number | null): Promise<void> {
    // Validate the quantity before updating
    if (quantity !== null) {
      const validation = inventoryDeductionValidator.validateDeductionQuantity(quantity);
      if (!validation.isValid) {
        throw new Error(`Invalid deduction quantity: ${validation.errors.join(', ')}`);
      }
    }

    await this.updateCategory(categoryId, { 
      inventoryDeductionQuantity: quantity || undefined,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get categories by category group that have deduction configured
   * @param groupId ID of the category group
   * @returns Promise<Category[]> Categories in the group with deduction configured
   */
  async getCategoriesWithDeductionByGroup(groupId: string): Promise<Category[]> {
    const groupCategories = await this.getCategoriesByGroup(groupId);
    return groupCategories.filter(category => 
      category.inventoryDeductionQuantity !== null && 
      category.inventoryDeductionQuantity !== undefined &&
      category.inventoryDeductionQuantity > 0
    );
  }

  /**
   * Check if a category is ready for automatic inventory deduction
   * @param categoryId ID of the category to check
   * @returns Promise<boolean> True if category is properly configured
   */
  async isCategoryReadyForDeduction(categoryId: string): Promise<boolean> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return false;
    }
    return inventoryDeductionValidator.isCategoryReadyForDeduction(category);
  }

  /**
   * Bulk update inventory deduction quantities for multiple categories
   * @param updates Array of {categoryId, quantity} objects
   * @returns Promise<void>
   */
  async bulkUpdateDeductionQuantities(updates: Array<{categoryId: string, quantity: number | null}>): Promise<void> {
    // Validate all quantities first
    for (const update of updates) {
      if (update.quantity !== null) {
        const validation = inventoryDeductionValidator.validateDeductionQuantity(update.quantity);
        if (!validation.isValid) {
          throw new Error(`Invalid deduction quantity for category ${update.categoryId}: ${validation.errors.join(', ')}`);
        }
      }
    }

    // Perform all updates
    const updatePromises = updates.map(update =>
      this.updateCategory(update.categoryId, { 
        inventoryDeductionQuantity: update.quantity || undefined,
        updatedAt: Timestamp.now()
      })
    );
    await Promise.all(updatePromises);
  }

  /**
   * Get validation summary for a category's deduction configuration
   * @param categoryId ID of the category
   * @returns Promise<string> User-friendly validation summary
   */
  async getDeductionValidationSummary(categoryId: string): Promise<string> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return 'Category not found';
    }
    return inventoryDeductionValidator.getValidationSummary(category);
  }

  /**
   * Enable inventory deduction for a category with validation
   * @param categoryId ID of the category
   * @param quantity Deduction quantity to set
   * @param inventoryType Optional inventory type (weight/qty)
   * @param inventoryUnit Optional inventory unit (kg/g/pcs)
   * @returns Promise<ValidationResult> Result of enabling deduction
   */
  async enableInventoryDeduction(
    categoryId: string, 
    quantity: number,
    inventoryType?: 'weight' | 'qty',
    inventoryUnit?: 'kg' | 'g' | 'pcs'
  ): Promise<ValidationResult> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return {
        isValid: false,
        errors: ['Category not found'],
        warnings: []
      };
    }

    // Create temporary category object for validation
    const testCategory: Category = {
      ...category,
      inventoryDeductionQuantity: quantity,
      inventoryType: inventoryType || category.inventoryType,
      inventoryUnit: inventoryUnit || category.inventoryUnit
    };

    const validation = this.validateInventoryDeductionConfig(testCategory);
    
    if (validation.isValid) {
      // Update the category with new settings
      const updates: Partial<Category> = {
        inventoryDeductionQuantity: quantity
      };
      
      if (inventoryType) {
        updates.inventoryType = inventoryType;
      }
      if (inventoryUnit) {
        updates.inventoryUnit = inventoryUnit;
      }

      await this.updateCategory(categoryId, updates);
    }

    return validation;
  }

  /**
   * Disable inventory deduction for a category
   * @param categoryId ID of the category
   * @returns Promise<void>
   */
  async disableInventoryDeduction(categoryId: string): Promise<void> {
    await this.updateInventoryDeductionQuantity(categoryId, null);
  }
}
