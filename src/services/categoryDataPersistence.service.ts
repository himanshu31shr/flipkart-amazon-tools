import { CategoryService, Category } from './category.service';
import { ImportResult } from '../types/categoryExportImport.types';

/**
 * Basic category data persistence service
 * Simplified version without inventory functionality
 */
export class CategoryDataPersistenceService {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async importCategories(categories: Category[]): Promise<ImportResult> {
    try {
      let importedCount = 0;
      const errors: string[] = [];

      for (const category of categories) {
        try {
          if (category.id) {
            // Update existing category
            await this.categoryService.updateCategory(category.id, {
              name: category.name,
              description: category.description,
              tag: category.tag
            });
          } else {
            // Create new category
            await this.categoryService.createCategory({
              name: category.name,
              description: category.description,
              tag: category.tag
            });
          }
          importedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to import category ${category.name}: ${errorMessage}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Successfully imported ${importedCount} categories${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        errors,
        importedCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to import categories',
        errors: [errorMessage],
        importedCount: 0
      };
    }
  }

  async backupCategories(): Promise<Category[]> {
    return await this.categoryService.getCategories();
  }

  async validateCategoryData(categories: Category[]): Promise<string[]> {
    const errors: string[] = [];
    
    categories.forEach((category, index) => {
      if (!category.name || category.name.trim() === '') {
        errors.push(`Category at index ${index} is missing a name`);
      }
      
    });

    return errors;
  }
}