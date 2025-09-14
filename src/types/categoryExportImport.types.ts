import { Category } from '../services/category.service';

export interface CategoryExportSectionProps {
  onExportComplete?: (success: boolean, message?: string) => void;
}

export interface CategoryImportSectionProps {
  onImportComplete?: (success: boolean, message?: string) => void;
}

export interface ExportResult {
  success: boolean;
  message?: string;
  errors: string[];
  data?: Category[];
}

export interface ImportResult {
  success: boolean;
  message?: string;
  errors: string[];
  importedCount?: number;
}

export interface OperationProgress {
  stage: 'preparing' | 'processing' | 'completing' | 'complete' | 'error';
  message: string;
  percentage: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}