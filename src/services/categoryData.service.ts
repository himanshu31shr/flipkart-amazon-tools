import { CategoryService } from './category.service';
import { ExportResult } from '../types/categoryExportImport.types';

/**
 * Simplified CategoryDataService for basic export functionality
 * Without inventory dependencies
 */
export class CategoryDataService {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async exportCategories(): Promise<ExportResult> {
    try {
      const categories = await this.categoryService.getCategories();
      
      // Generate CSV content
      const csvHeader = 'Name,Description,Tag\n';
      const csvRows = categories.map(category => {
        return [
          this.escapeCSV(category.name),
          this.escapeCSV(category.description || ''),
          this.escapeCSV(category.tag || '')
        ].join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `categories-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: `Successfully exported ${categories.length} categories`,
        errors: [],
        data: categories
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to export categories',
        errors: [errorMessage],
        data: []
      };
    }
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}