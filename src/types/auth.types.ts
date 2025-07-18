import { UploadResult } from '../services/pdfStorageService';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERUSER = 'superuser'
}

export interface UserDetails {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'uploadDate' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  filterByDate?: Date;
  searchTerm?: string;
}

export interface PaginatedPdfResult {
  pdfs: UploadResult[];
  totalCount: number;
  page: number;
  pageSize: number;
} 