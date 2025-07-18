import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CategorySortConfig } from '../utils/pdfSorting';
import { storage } from './firebase.config';
import { storageService } from './storage.service';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata, listAll, getMetadata } from 'firebase/storage';
import { roleAccessService } from './role-access.service';
import { 
  UserDetails, 
  PaginationOptions, 
  PaginatedPdfResult 
} from '../types/auth.types';

/**
 * Configuration for PDF storage
 */
export interface StorageConfig {
  /** Number of days before the file should expire (1-90) */
  expiryDays: number;
  /** Whether access to the file should be restricted */
  restrictAccess: boolean;
  /** Whether the file can be shared with others */
  isShared: boolean;
  /** Visibility level for the file (private, organization, public) */
  visibility: 'private' | 'organization' | 'public';
  /** Optional description for the file */
  description?: string;
}

/**
 * Default storage configuration
 */
export const defaultStorageConfig: StorageConfig = {
  expiryDays: 30,
  restrictAccess: true,
  isShared: false,
  visibility: 'private'
};

/**
 * Metadata for stored PDF files
 */
export interface PdfMetadata {
  /** User ID of the uploader */
  userId: string;
  /** When the file was uploaded */
  uploadedAt: number;
  /** When the file will expire */
  expiresAt: number;
  /** Original file name */
  originalFileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Whether access is restricted */
  restrictAccess: boolean;
  /** Whether the file is shared */
  isShared: boolean;
  /** Visibility level */
  visibility: string;
  /** Storage path in Firebase Storage */
  storagePath?: string;
  /** Optional statistics about the PDF content */
  stats?: {
    /** Number of categories in the file */
    categoryCount?: number;
    /** Number of products in the file */
    productCount?: number;
    /** Sort configuration used to generate the file */
    sortConfig?: CategorySortConfig;
  };
  /** User-provided description */
  description?: string;
  /** Date when the file was uploaded (YYYY-MM-DD) */
  selectedDate?: string;
}

/**
 * Information about a folder in Firebase Storage
 */
export interface FolderInfo {
  /** Full path to the folder */
  path: string;
  /** Display name of the folder */
  name: string;
  /** Number of files in the folder */
  fileCount: number;
  /** Total size of all files in the folder (bytes) */
  totalSize: number;
  /** Date when the folder was last modified */
  lastModified: Date;
}

/**
 * Information about a file in Firebase Storage
 */
export interface FileInfo {
  /** Full path to the file in storage */
  path: string;
  /** Display name of the file */
  name: string;
  /** File size in bytes */
  size: number;
  /** Date when the file was last modified */
  lastModified: Date;
  /** Download URL for the file */
  downloadUrl: string;
  /** File ID in Firestore (if available) */
  fileId?: string;
  /** File metadata from Firestore */
  metadata?: PdfMetadata;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** Unique ID for the file */
  fileId: string;
  /** URL to download the file */
  downloadUrl: string;
  /** When the file will expire */
  expiresAt: number;
  /** Whether the file is shared */
  isShared: boolean;
  /** Access restrictions */
  restrictAccess: boolean;
  /** Metadata about the uploaded file */
  metadata: PdfMetadata;
  /** Success flag */
  success: boolean;
  /** Error message */
  error?: string;
}

/**
 * Service for managing PDF storage in Firebase
 */
class PdfStorageService {
  private readonly STORAGE_PATH = 'pdfs';
  private readonly COLLECTION_NAME = 'pdfs';
  
  /**
   * Generate a date-based path for file storage
   * 
   * @param userId - User ID (kept for backward compatibility but not used in path)
   * @param selectedDate - Optional date for the folder (defaults to today)
   * @returns Storage path for the given date
   */
  private generateDateBasedPath(userId: string, selectedDate?: Date): string {
    const targetDate = selectedDate || new Date();
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    
    // Format as dd-mm-yyyy
    const dateFolder = `${day}-${month}-${year}`;
    
    // Store PDFs directly in date folders instead of user/date hierarchy
    return `${this.STORAGE_PATH}/${dateFolder}`;
  }

  /**
   * Get today's folder path for the current user
   * 
   * @returns Path string for today's folder or null if not authenticated
   */
  getTodaysFolderPath(): string | null {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return null;
    }
    
    return this.generateDateBasedPath(currentUser.uid);
  }

  /**
   * Get today's date in the folder name format
   * 
   * @returns Date string in dd-mm-yyyy format
   */
  getTodaysDateString(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  /**
   * Get date string in the folder name format for a specific date
   * 
   * @param date - The date to format
   * @returns Date string in dd-mm-yyyy format
   */
  getDateString(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  /**
   * Get folder path for a specific date for the current user
   * 
   * @param date - The date to get folder path for
   * @returns Path string for the date's folder or null if not authenticated
   */
  getFolderPathForDate(date: Date): string | null {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return null;
    }
    
    return this.generateDateBasedPath(currentUser.uid, date);
  }

  /**
   * List files available for download from today's folder across all users
   * 
   * @returns Promise with array of files from today's folder
   */
  async listTodaysFiles(): Promise<FileInfo[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to access files');
      }
      
      // List all files from all users for today's date
      return await this.listFilesForDate(new Date());
    } catch (error) {
      // If folder doesn't exist for today, return empty array
      if (error instanceof Error && error.message.includes('folder does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * List files available for download from a specific date's folder across all users
   * 
   * @param date - The date to list files for
   * @returns Promise with array of files from the specified date's folder
   */
  async listFilesForDate(date: Date): Promise<FileInfo[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to access files');
      }
      
      // Get the date string
      const dateString = this.getDateString(date);
      
      // Access the date folder directly in the new structure
      const dateFolderPath = `${this.STORAGE_PATH}/${dateString}`;
      const allFiles: FileInfo[] = [];
      
      try {
        // List files directly from the date folder
        const dateFiles = await this.listFolderContents(dateFolderPath);
        allFiles.push(...dateFiles);
       } catch {
         // If no folders exist at all, return empty array
         return [];
       }
      
      return allFiles;
    } catch (error) {
      // If folder doesn't exist for the date, return empty array
      if (error instanceof Error && error.message.includes('folder does not exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Upload a PDF file to Firebase Storage
   * 
   * @param file - PDF file to upload (as Blob)
   * @param fileName - Name to use for the file
   * @param stats - Optional statistics about the PDF
   * @param config - Storage configuration options
   * @returns Promise with the upload result
   */
  async uploadPdf(
    file: Blob,
    fileName: string,
    stats: {
      categoryCount?: number;
      productCount?: number;
      sortConfig?: CategorySortConfig;
      description?: string;
    },
    config: StorageConfig = defaultStorageConfig
  ): Promise<UploadResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('Authentication error: No user is currently signed in');
        return {
          success: false,
          error: 'User must be authenticated to upload files',
          fileId: '',
          downloadUrl: '',
          expiresAt: 0,
          isShared: false,
          restrictAccess: true,
          metadata: {
            userId: '',
            uploadedAt: 0,
            expiresAt: 0,
            originalFileName: fileName,
            fileSize: 0,
            restrictAccess: true,
            isShared: false,
            visibility: 'private',
            description: ''
          }
        };
      }

      console.log('Starting PDF upload with auth user:', currentUser.uid);

      // Generate a unique file path with date-based folder structure
      const timestamp = Date.now();
      const userId = currentUser.uid;
      
      // Create date-based folder structure
      const dateBasedPath = this.generateDateBasedPath(userId);
      
      // Ensure we have a valid file name
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timePrefix = new Date().toISOString().replace(/[:.]/g, '-').substring(11, 19); // HH-MM-SS format
      const filePath = `${dateBasedPath}/${timePrefix}_${sanitizedFileName}`;
      
      console.log('Generated file path:', filePath);
      
      // Calculate expiry date
      const expiryDays = Math.max(1, Math.min(90, config.expiryDays)); // 1-90 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const expiresAt = expiryDate.getTime();
      
      // Prepare metadata for storage
      const customMetadata = {
        userId,
        fileId: '',  // Will be updated after Firestore document is created
        expiresAt: expiresAt.toString(),
        visibility: config.visibility || 'private',
        description: stats.description || config.description || ''
      };
      
      console.log('Uploading file with metadata:', customMetadata);
      
      // Create storage reference directly
      const storageRef = ref(storage, filePath);
      
      // Upload the file with metadata
      const uploadTask = await uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata
      });
      
      console.log('File uploaded successfully, getting download URL');
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      
      // Create metadata
      const metadata: PdfMetadata = {
        userId,
        uploadedAt: timestamp,
        expiresAt,
        originalFileName: fileName,
        fileSize: file.size,
        restrictAccess: config.restrictAccess,
        isShared: config.isShared,
        visibility: config.visibility || 'private',
        storagePath: filePath,
        stats: {
          categoryCount: stats.categoryCount,
          productCount: stats.productCount,
          sortConfig: stats.sortConfig
        },
        description: stats.description || config.description
      };
      
      console.log('Storing metadata in Firestore');
      
      // Store metadata in Firestore
      const db = getFirestore();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...metadata,
        storagePath: filePath,
        downloadUrl,
        uploadedAt: Timestamp.fromMillis(timestamp),
        expiresAt: Timestamp.fromMillis(expiresAt)
      });
      
      console.log('Metadata stored, updating storage metadata with file ID');
      
      // Update storage metadata with file ID
      await updateMetadata(storageRef, {
        customMetadata: {
          fileId: docRef.id
        }
      });
      
      console.log('Upload process completed successfully');
      
      return {
        fileId: docRef.id,
        downloadUrl,
        expiresAt,
        isShared: config.isShared,
        restrictAccess: config.restrictAccess,
        metadata,
        success: true
      };
    } catch (error) {
      console.error('Error uploading PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during upload',
        fileId: '',
        downloadUrl: '',
        expiresAt: 0,
        isShared: false,
        restrictAccess: true,
        metadata: {
          userId: '',
          uploadedAt: 0,
          expiresAt: 0,
          originalFileName: fileName,
          fileSize: 0,
          restrictAccess: true,
          isShared: false,
          visibility: 'private',
          description: ''
        }
      };
    }
  }

  /**
   * Upload a PDF file to Firebase Storage for a specific date
   * 
   * @param file - PDF file to upload (as Blob)
   * @param fileName - Name to use for the file
   * @param selectedDate - Date to use for folder organization
   * @param stats - Optional statistics about the PDF
   * @param config - Storage configuration options
   * @returns Promise with the upload result
   */
  async uploadPdfForDate(
    file: Blob,
    fileName: string,
    selectedDate: Date,
    stats: {
      categoryCount?: number;
      productCount?: number;
      sortConfig?: CategorySortConfig;
      description?: string;
    },
    config: StorageConfig = defaultStorageConfig
  ): Promise<UploadResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('Authentication error: No user is currently signed in');
        return {
          success: false,
          error: 'User must be authenticated to upload files',
          fileId: '',
          downloadUrl: '',
          expiresAt: 0,
          isShared: false,
          restrictAccess: true,
          metadata: {
            userId: '',
            uploadedAt: 0,
            expiresAt: 0,
            originalFileName: fileName,
            fileSize: 0,
            restrictAccess: true,
            isShared: false,
            visibility: 'private',
            description: ''
          }
        };
      }

      console.debug('Starting PDF upload for date:', selectedDate.toISOString().split('T')[0], 'with auth user:', currentUser.uid);

      // Generate a unique file path with selected date-based folder structure
      const timestamp = Date.now();
      const userId = currentUser.uid;
      
      // Create date-based folder structure using selected date
      const dateBasedPath = this.generateDateBasedPath(userId, selectedDate);
      
      // Ensure we have a valid file name
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timePrefix = new Date().toISOString().replace(/[:.]/g, '-').substring(11, 19); // HH-MM-SS format
      const filePath = `${dateBasedPath}/${timePrefix}_${sanitizedFileName}`;
      
      console.log('Generated file path:', filePath);
      
      // Calculate expiry date
      const expiryDays = Math.max(1, Math.min(90, config.expiryDays)); // 1-90 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const expiresAt = expiryDate.getTime();
      
      // Prepare metadata for storage
      const customMetadata = {
        userId,
        fileId: '',  // Will be updated after Firestore document is created
        expiresAt: expiresAt.toString(),
        visibility: config.visibility || 'private',
        description: stats.description || config.description || '',
        selectedDate: selectedDate.toISOString().split('T')[0] // Store the selected date
      };
      
      console.log('Uploading file with metadata:', customMetadata);
      
      // Create storage reference directly
      const storageRef = ref(storage, filePath);
      
      // Upload the file with metadata
      const uploadTask = await uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata
      });
      
      console.log('File uploaded successfully, getting download URL');
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      
      // Create metadata
      const metadata: PdfMetadata = {
        userId,
        uploadedAt: timestamp,
        expiresAt,
        originalFileName: fileName,
        fileSize: file.size,
        restrictAccess: config.restrictAccess,
        isShared: config.isShared,
        visibility: config.visibility || 'private',
        storagePath: filePath,
        stats: {
          categoryCount: stats.categoryCount,
          productCount: stats.productCount,
          sortConfig: stats.sortConfig
        },
        description: stats.description || config.description,
        selectedDate: selectedDate.toISOString().split('T')[0] // Store selected date in metadata
      };
      
      console.log('Storing metadata in Firestore');
      
      // Store metadata in Firestore
      const db = getFirestore();
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        userId,
        uploadedAt: Timestamp.fromMillis(timestamp),
        expiresAt: Timestamp.fromMillis(expiresAt),
        originalFileName: fileName,
        fileSize: file.size,
        restrictAccess: config.restrictAccess,
        isShared: config.isShared,
        visibility: config.visibility || 'private',
        downloadUrl,
        storagePath: filePath,
        stats: metadata.stats,
        description: metadata.description,
        selectedDate: selectedDate.toISOString().split('T')[0]
      });
      
      console.log('Metadata stored successfully with ID:', docRef.id);
      
      return {
        fileId: docRef.id,
        downloadUrl,
        expiresAt,
        isShared: config.isShared,
        restrictAccess: config.restrictAccess,
        metadata,
        success: true
      };
    } catch (error) {
      console.error('Error uploading PDF for date:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during upload',
        fileId: '',
        downloadUrl: '',
        expiresAt: 0,
        isShared: false,
        restrictAccess: true,
        metadata: {
          userId: '',
          uploadedAt: 0,
          expiresAt: 0,
          originalFileName: fileName,
          fileSize: 0,
          restrictAccess: true,
          isShared: false,
          visibility: 'private',
          description: ''
        }
      };
    }
  }

  /**
   * Get details about a stored PDF (now accessible to all authenticated users)
   * 
   * @param fileId - ID of the file to retrieve
   * @returns Promise with the file details
   */
  async getPdfDetails(fileId: string): Promise<UploadResult | null> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to view file details');
      }

      const db = getFirestore();
      const docRef = doc(db, this.COLLECTION_NAME, fileId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Universal access - no longer check user ownership
      // All authenticated users can access any PDF details
      
      const metadata: PdfMetadata = {
        userId: data.userId,
        uploadedAt: data.uploadedAt.toMillis(),
        expiresAt: data.expiresAt.toMillis(),
        originalFileName: data.originalFileName,
        fileSize: data.fileSize,
        restrictAccess: data.restrictAccess,
        isShared: data.isShared,
        visibility: data.visibility,
        storagePath: data.storagePath,
        stats: data.stats,
        description: data.description,
        selectedDate: data.selectedDate
      };
      
      return {
        fileId,
        downloadUrl: data.downloadUrl,
        expiresAt: metadata.expiresAt,
        isShared: metadata.isShared,
        restrictAccess: metadata.restrictAccess,
        metadata,
        success: true
      };
    } catch (error) {
      console.error('Error retrieving PDF details:', error);
      throw error;
    }
  }

  /**
   * Delete a stored PDF file (now accessible to all authenticated users)
   * 
   * @param fileId - ID of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  async deletePdf(fileId: string): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to delete files');
      }

      const db = getFirestore();
      const docRef = doc(db, this.COLLECTION_NAME, fileId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('File not found');
      }
      
      const data = docSnap.data();
      
      // Universal access - removed user ownership check
      // All authenticated users can delete any PDF
      
      // Delete from storage
      await storageService.deleteFile(data.storagePath);
      
      // Delete from Firestore
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting PDF:', error);
      throw error;
    }
  }

  /**
   * Update the expiry date for a stored PDF (now accessible to all authenticated users)
   * 
   * @param fileId - ID of the file to update
   * @param expiryDays - New number of days until expiry (1-90)
   * @returns Promise that resolves when the expiry is updated
   */
  async updatePdfExpiry(fileId: string, expiryDays: number): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to update files');
      }

      // Ensure expiryDays is within valid range
      const days = Math.max(1, Math.min(90, expiryDays));
      
      // Calculate new expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      const expiresAt = expiryDate.getTime();
      
      const db = getFirestore();
      const docRef = doc(db, this.COLLECTION_NAME, fileId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('File not found');
      }
      
      const data = docSnap.data();
      
      // Universal access - removed user ownership check
      // All authenticated users can update any PDF expiry
      
      // Update Firestore
      await updateDoc(docRef, {
        expiresAt: Timestamp.fromMillis(expiresAt)
      });
      
      // Update storage metadata
      await storageService.updateFileMetadata(data.storagePath, {
        expiresAt: expiresAt.toString()
      });
    } catch (error) {
      console.error('Error updating PDF expiry:', error);
      throw error;
    }
  }

  /**
   * List all PDFs from all users (renamed from listUserPdfs for universal access)
   * 
   * @returns Promise with an array of PDF details from all users
   */
  async listAllPdfs(): Promise<UploadResult[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to list files');
      }

      const db = getFirestore();
      // Remove user filter to get all PDFs
      const q = query(collection(db, this.COLLECTION_NAME));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return [];
      }
      
      const now = Date.now();
      const results: UploadResult[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const expiryTime = data.expiresAt.toMillis();
        
        // Skip expired files
        if (expiryTime < now) {
          return;
        }
        
        results.push({
          fileId: doc.id,
          downloadUrl: data.downloadUrl,
          expiresAt: expiryTime,
          isShared: data.isShared,
          restrictAccess: data.restrictAccess,
          metadata: {
            userId: data.userId,
            uploadedAt: data.uploadedAt.toMillis(),
            expiresAt: expiryTime,
            originalFileName: data.originalFileName,
            fileSize: data.fileSize,
            restrictAccess: data.restrictAccess,
            isShared: data.isShared,
            visibility: data.visibility,
            storagePath: data.storagePath,
            stats: data.stats,
            description: data.description,
            selectedDate: data.selectedDate
          },
          success: true
        });
      });
      
      // Sort by upload date, newest first
      return results.sort((a, b) => b.metadata.uploadedAt - a.metadata.uploadedAt);
    } catch (error) {
      console.error('Error listing PDFs:', error);
      throw error;
    }
  }

  /**
   * Backward compatibility - alias for listAllPdfs
   * @deprecated Use listAllPdfs() instead
   */
  async listUserPdfs(): Promise<UploadResult[]> {
    return this.listAllPdfs();
  }

  /**
   * Check for expired files and delete them (now works on all users' files)
   * 
   * @returns Promise with the number of files deleted
   */
  async cleanupExpiredFiles(): Promise<number> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to clean up files');
      }

      const now = Date.now();
      const db = getFirestore();
      
      // Find expired files from all users (not just current user)
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<=', Timestamp.fromMillis(now))
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return 0;
      }
      
      // Delete each expired file
      let deletedCount = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        try {
          // Delete from storage
          await storageService.deleteFile(data.storagePath);
          
          // Delete from Firestore
          await deleteDoc(doc.ref);
          
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete expired file ${doc.id}:`, error);
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired files:', error);
      throw error;
    }
  }

  // ===== FOLDER MANAGEMENT METHODS =====

  /**
   * List all folders from all users (renamed from listUserFolders for universal access)
   * 
   * @returns Promise with an array of folder information from all users
   */
  async listAllFolders(): Promise<FolderInfo[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to list folders');
      }

      // List all date folders directly under the storage path
      const baseRef = ref(storage, this.STORAGE_PATH);
      const allFolders: FolderInfo[] = [];
      
      // List all date folders
      const listResult = await listAll(baseRef);
      
      // Process each date folder
      const dateFolderPromises = listResult.prefixes.map(async (dateFolderRef) => {
        const folderPath = dateFolderRef.fullPath;
        const folderName = dateFolderRef.name;
        
        try {
          // Get folder contents to calculate size and file count
          const folderContents = await listAll(dateFolderRef);
          let totalSize = 0;
          let lastModified = new Date(0);
          
          // Get metadata for each file in the folder
          const filePromises = folderContents.items.map(async (fileRef) => {
            try {
              const metadata = await getMetadata(fileRef);
              const fileSize = metadata.size || 0;
              const modifiedTime = new Date(metadata.updated);
              
              totalSize += fileSize;
              if (modifiedTime > lastModified) {
                lastModified = modifiedTime;
              }
            } catch (error) {
              console.warn(`Failed to get metadata for ${fileRef.fullPath}:`, error);
            }
          });
          
          await Promise.all(filePromises);
          
          return {
            path: folderPath,
            name: folderName,
            fileCount: folderContents.items.length,
            totalSize,
            lastModified: lastModified.getTime() === 0 ? new Date() : lastModified
          } as FolderInfo;
        } catch (error) {
          console.warn(`Failed to process date folder ${folderName}:`, error);
          return null;
        }
      });
      
      const dateFolders = await Promise.all(dateFolderPromises);
      
      // Filter out null results and add to allFolders
      dateFolders.forEach(folder => {
        if (folder) {
          allFolders.push(folder);
        }
      });
      
      // Sort folders by name (date)
      return allFolders.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error listing all folders:', error);
      throw error;
    }
  }

  /**
   * Backward compatibility - alias for listAllFolders
   * @deprecated Use listAllFolders() instead
   */
  async listUserFolders(): Promise<FolderInfo[]> {
    return this.listAllFolders();
  }

  /**
   * List contents of a specific folder (now accessible to all authenticated users)
   * 
   * @param folderPath - Full path to the folder
   * @returns Promise with an array of file information
   */
  async listFolderContents(folderPath: string): Promise<FileInfo[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to list folder contents');
      }

      // Universal access - removed user access validation
      
      const folderRef = ref(storage, folderPath);
      const listResult = await listAll(folderRef);
      
      // Process files in the folder
      const filePromises = listResult.items.map(async (fileRef) => {
        try {
          const [metadata, downloadUrl] = await Promise.all([
            getMetadata(fileRef),
            getDownloadURL(fileRef)
          ]);
          
          // Try to find corresponding Firestore document for additional metadata
          const db = getFirestore();
          let firestoreData = null;
          let fileId = null;
          
          try {
            const q = query(
              collection(db, this.COLLECTION_NAME),
              where('storagePath', '==', fileRef.fullPath)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              const doc = snapshot.docs[0];
              fileId = doc.id;
              firestoreData = doc.data();
            }
          } catch (error) {
            console.warn(`Failed to get Firestore data for ${fileRef.fullPath}:`, error);
          }
          
          return {
            path: fileRef.fullPath,
            name: fileRef.name,
            size: metadata.size || 0,
            lastModified: new Date(metadata.updated),
            downloadUrl,
            fileId,
            metadata: firestoreData ? {
              userId: firestoreData.userId,
              uploadedAt: firestoreData.uploadedAt?.toMillis() || 0,
              expiresAt: firestoreData.expiresAt?.toMillis() || 0,
              originalFileName: firestoreData.originalFileName,
              fileSize: firestoreData.fileSize,
              restrictAccess: firestoreData.restrictAccess,
              isShared: firestoreData.isShared,
              visibility: firestoreData.visibility,
              storagePath: firestoreData.storagePath,
              stats: firestoreData.stats,
              description: firestoreData.description,
              selectedDate: firestoreData.selectedDate
            } : undefined
          } as FileInfo;
        } catch (error) {
          console.error(`Failed to process file ${fileRef.fullPath}:`, error);
          return null;
        }
      });
      
      const files = (await Promise.all(filePromises)).filter(Boolean) as FileInfo[];
      
      // Sort files by name
      return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error listing folder contents:', error);
      throw error;
    }
  }

  /**
   * Get the total size of a folder (now accessible to all authenticated users)
   * 
   * @param folderPath - Full path to the folder
   * @returns Promise with the total size in bytes
   */
  async getFolderSize(folderPath: string): Promise<number> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to get folder size');
      }

      // Universal access - removed user access validation
      
      const folderRef = ref(storage, folderPath);
      const listResult = await listAll(folderRef);
      
      let totalSize = 0;
      
      // Get size of each file
      const sizePromises = listResult.items.map(async (fileRef) => {
        try {
          const metadata = await getMetadata(fileRef);
          return metadata.size || 0;
        } catch (error) {
          console.warn(`Failed to get size for ${fileRef.fullPath}:`, error);
          return 0;
        }
      });
      
      const sizes = await Promise.all(sizePromises);
      totalSize = sizes.reduce((sum, size) => sum + size, 0);
      
      return totalSize;
    } catch (error) {
      console.error('Error getting folder size:', error);
      throw error;
    }
  }

  /**
   * Delete a folder and all its contents recursively (now accessible to all authenticated users)
   * 
   * @param folderPath - Full path to the folder to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteFolderRecursive(folderPath: string): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to delete folders');
      }

      // Universal access - removed user access validation
      
      const folderRef = ref(storage, folderPath);
      const listResult = await listAll(folderRef);
      
      // Delete all files in the folder
      const fileDeletionPromises = listResult.items.map(async (fileRef) => {
        try {
          // Try to find and delete corresponding Firestore document
          const db = getFirestore();
          const q = query(
            collection(db, this.COLLECTION_NAME),
            where('storagePath', '==', fileRef.fullPath)
          );
          const snapshot = await getDocs(q);
          
          // Delete Firestore documents
          const firestoreDeletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(firestoreDeletions);
          
          // Delete from Firebase Storage
          await storageService.deleteFile(fileRef.fullPath);
        } catch (error) {
          console.error(`Failed to delete file ${fileRef.fullPath}:`, error);
          throw error;
        }
      });
      
      // Delete all subfolders recursively
      const folderDeletionPromises = listResult.prefixes.map(async (prefixRef) => {
        await this.deleteFolderRecursive(prefixRef.fullPath);
      });
      
      // Wait for all deletions to complete
      await Promise.all([...fileDeletionPromises, ...folderDeletionPromises]);
      
      console.log(`Successfully deleted folder: ${folderPath}`);
    } catch (error) {
      console.error('Error deleting folder recursively:', error);
      throw error;
    }
  }

  /**
   * Delete a single file (now accessible to all authenticated users)
   * 
   * @param filePath - Full path to the file to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to delete files');
      }

      // Universal access - removed user access validation
      
      // Try to find and delete corresponding Firestore document
      const db = getFirestore();
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('storagePath', '==', filePath)
      );
      const snapshot = await getDocs(q);
      
      // Delete Firestore documents
      const firestoreDeletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(firestoreDeletions);
      
      // Delete from Firebase Storage
      await storageService.deleteFile(filePath);
      
      console.log(`Successfully deleted file: ${filePath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files at once (now accessible to all authenticated users)
   * 
   * @param filePaths - Array of file paths to delete
   * @returns Promise that resolves when all deletions are complete
   */
  async deleteMultipleFiles(filePaths: string[]): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to delete files');
      }

      // Universal access - removed user access validation
      
      // Delete all files
      const deletionPromises = filePaths.map(filePath => this.deleteFile(filePath));
      await Promise.all(deletionPromises);
      
      console.log(`Successfully deleted ${filePaths.length} files`);
    } catch (error) {
      console.error('Error deleting multiple files:', error);
      throw error;
    }
  }

  /**
   * Validate that the current user has access to a given path
   * @deprecated No longer needed with universal access - kept for backward compatibility
   * 
   * @param path - Storage path to validate (ignored in universal access mode)
   * @returns Promise that resolves if access is valid, rejects otherwise
   */
  async validateUserAccess(path: string): Promise<boolean> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to access files');
      }

      // Universal access - all authenticated users can access any path
      // This method is kept for backward compatibility but no longer enforces user restrictions
      // Path parameter is ignored but preserved for API compatibility
      void path; // Explicitly mark as unused
      return true;
    } catch (error) {
      console.error('Error validating user access:', error);
      throw error;
    }
  }

  /**
   * List PDFs across all users (admin/superuser functionality)
   * @param options - Optional filtering and pagination options
   * @returns Promise with paginated PDF results
   */
  async listAllUserPdfs(options: PaginationOptions = {}): Promise<PaginatedPdfResult> {
    try {
      // Check admin access
      const hasAdminAccess = await roleAccessService.hasAdminAccess();
      if (!hasAdminAccess) {
        throw new Error('Insufficient permissions to view all PDFs');
      }

      const db = getFirestore();
      const pdfsRef = collection(db, this.COLLECTION_NAME);

      // Build query with optional filters
      let baseQuery = query(pdfsRef);

      // Apply date filter if provided
      if (options.filterByDate) {
        const startOfDay = new Date(options.filterByDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(options.filterByDate);
        endOfDay.setHours(23, 59, 59, 999);

        baseQuery = query(
          baseQuery, 
          where('uploadedAt', '>=', Timestamp.fromDate(startOfDay)),
          where('uploadedAt', '<=', Timestamp.fromDate(endOfDay))
        );
      }

      // Apply search term if provided
      if (options.searchTerm) {
        baseQuery = query(
          baseQuery,
          where('originalFileName', '>=', options.searchTerm),
          where('originalFileName', '<=', options.searchTerm + '\uf8ff')
        );
      }

      // Apply sorting
      const sortField = options.sortBy || 'uploadedAt';
      const sortDirection = options.sortOrder || 'desc';
      baseQuery = query(baseQuery, orderBy(sortField, sortDirection));

      // Apply pagination
      const pageSize = options.pageSize || 50;
      const pageQuery = query(baseQuery, limit(pageSize));

      // Execute query
      const snapshot = await getDocs(pageQuery);

      // Convert documents to UploadResult
      const pdfs: UploadResult[] = snapshot.docs.map(doc => ({
        fileId: doc.id,
        downloadUrl: doc.data().downloadUrl,
        expiresAt: doc.data().expiresAt.toMillis(),
        isShared: doc.data().isShared,
        restrictAccess: doc.data().restrictAccess,
        metadata: {
          userId: doc.data().userId,
          uploadedAt: doc.data().uploadedAt.toMillis(),
          expiresAt: doc.data().expiresAt.toMillis(),
          originalFileName: doc.data().originalFileName,
          fileSize: doc.data().fileSize,
          restrictAccess: doc.data().restrictAccess,
          isShared: doc.data().isShared,
          visibility: doc.data().visibility,
          storagePath: doc.data().storagePath,
          stats: doc.data().stats,
          description: doc.data().description,
          selectedDate: doc.data().selectedDate
        },
        success: true
      }));

      // Get total count for pagination
      const countSnapshot = await getDocs(baseQuery);
      const totalCount = countSnapshot.size;

      return {
        pdfs,
        totalCount,
        page: options.page || 1,
        pageSize
      };
    } catch (error) {
      console.error('Error listing all user PDFs:', error);
      throw error;
    }
  }

  /**
   * Get user details for PDF owners
   * @param fileIds - Array of file IDs to get user information for
   * @returns Promise with user information
   */
  async getUserDetailsForPdfs(fileIds: string[]): Promise<Record<string, UserDetails>> {
    try {
      // Check admin access
      const hasAdminAccess = await roleAccessService.hasAdminAccess();
      if (!hasAdminAccess) {
        throw new Error('Insufficient permissions to retrieve user details');
      }

      // Get unique user IDs from PDF metadata
      const db = getFirestore();
      const userIds: string[] = [];

      // Fetch user IDs for the given file IDs
      for (const fileId of fileIds) {
        const docRef = doc(db, this.COLLECTION_NAME, fileId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userId = docSnap.data().userId;
          if (userId && !userIds.includes(userId)) {
            userIds.push(userId);
          }
        }
      }

      // Get user details for these IDs
      return await roleAccessService.getUserDetailsMap(userIds);
    } catch (error) {
      console.error('Error getting user details for PDFs:', error);
      throw error;
    }
  }
}

export const pdfStorageService = new PdfStorageService(); 