import { CategoryService, Category } from './category.service';
import { ExportResult } from '../types/categoryExportImport.types';

/**
 * Basic category data aggregation service
 * Simplified version without inventory functionality
 */
export class CategoryDataAggregatorService {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async aggregateCategories(): Promise<ExportResult> {
    try {
      const categories = await this.categoryService.getCategories();
      
      return {
        success: true,
        message: `Successfully aggregated ${categories.length} categories`,
        errors: [],
        data: categories
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to aggregate categories',
        errors: [errorMessage],
        data: []
      };
    }
  }

  async getCategoriesForExport(): Promise<Category[]> {
    return await this.categoryService.getCategories();
  }
}