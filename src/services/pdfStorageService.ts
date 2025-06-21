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
  Timestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CategorySortConfig } from '../utils/pdfSorting';
import { storageService } from './storage.service';
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata, listAll, getMetadata } from 'firebase/storage';
import { storage } from './firebase.config';

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
   * Generate a date-based folder name
   * 
   * @param userId - User ID for the file owner
   * @returns Path string in format "pdfs/userId/dd-mm-yyyy"
   */
  private generateDateBasedPath(userId: string): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    // Format as dd-mm-yyyy
    const dateFolder = `${day}-${month}-${year}`;
    
    return `${this.STORAGE_PATH}/${userId}/${dateFolder}`;
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
   * List files available for download from today's folder
   * 
   * @returns Promise with array of files from today's folder
   */
  async listTodaysFiles(): Promise<FileInfo[]> {
    try {
      const todaysFolderPath = this.getTodaysFolderPath();
      
      if (!todaysFolderPath) {
        throw new Error('User must be authenticated to access files');
      }
      
      // Check if today's folder exists and get its contents
      const todaysFiles = await this.listFolderContents(todaysFolderPath);
      
      return todaysFiles;
    } catch (error) {
      // If folder doesn't exist for today, return empty array
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
   * Get details about a stored PDF
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
      
      // Check if user has access
      if (data.userId !== currentUser.uid && data.visibility === 'private') {
        throw new Error('You do not have access to this file');
      }
      
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
        description: data.description
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
   * Delete a stored PDF file
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
      
      // Check if user has permission to delete
      if (data.userId !== currentUser.uid) {
        throw new Error('You do not have permission to delete this file');
      }
      
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
   * Update the expiry date for a stored PDF
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
      
      // Check if user has permission to update
      if (data.userId !== currentUser.uid) {
        throw new Error('You do not have permission to update this file');
      }
      
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
   * List all PDFs for the current user
   * 
   * @returns Promise with an array of PDF details
   */
  async listUserPdfs(): Promise<UploadResult[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to list files');
      }

      const db = getFirestore();
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', currentUser.uid)
      );
      
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
            description: data.description
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
   * Check for expired files and delete them
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
      
      // Find expired files for current user
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', currentUser.uid),
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
   * List all folders for the current user
   * 
   * @returns Promise with an array of folder information
   */
  async listUserFolders(): Promise<FolderInfo[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to list folders');
      }

      const userId = currentUser.uid;
      const userPath = `${this.STORAGE_PATH}/${userId}`;
      const userRef = ref(storage, userPath);
      
      // List all items under user's path
      const listResult = await listAll(userRef);
      
      // Process prefixes (which represent folders in Firebase Storage)
      const folderPromises = listResult.prefixes.map(async (folderRef) => {
        const folderPath = folderRef.fullPath;
        const folderName = folderRef.name;
        
        // Get folder contents to calculate size and file count
        const folderContents = await listAll(folderRef);
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
      });
      
      const folders = await Promise.all(folderPromises);
      
      // Sort folders by name
      return folders.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error listing user folders:', error);
      throw error;
    }
  }

  /**
   * List contents of a specific folder
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

      // Validate user access to the folder
      await this.validateUserAccess(folderPath);
      
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
              where('storagePath', '==', fileRef.fullPath),
              where('userId', '==', currentUser.uid)
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
              description: firestoreData.description
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
   * Get the total size of a folder
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

      // Validate user access to the folder
      await this.validateUserAccess(folderPath);
      
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
   * Delete a folder and all its contents recursively
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

      // Validate user access to the folder
      await this.validateUserAccess(folderPath);
      
      const folderRef = ref(storage, folderPath);
      const listResult = await listAll(folderRef);
      
      // Delete all files in the folder
      const fileDeletionPromises = listResult.items.map(async (fileRef) => {
        try {
          // Try to find and delete corresponding Firestore document
          const db = getFirestore();
          const q = query(
            collection(db, this.COLLECTION_NAME),
            where('storagePath', '==', fileRef.fullPath),
            where('userId', '==', currentUser.uid)
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
   * Delete a single file
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

      // Validate user access to the file
      await this.validateUserAccess(filePath);
      
      // Try to find and delete corresponding Firestore document
      const db = getFirestore();
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('storagePath', '==', filePath),
        where('userId', '==', currentUser.uid)
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
   * Delete multiple files at once
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

      // Validate user access to all files
      const validationPromises = filePaths.map(path => this.validateUserAccess(path));
      await Promise.all(validationPromises);
      
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
   * 
   * @param path - Storage path to validate
   * @returns Promise that resolves if access is valid, rejects otherwise
   */
  async validateUserAccess(path: string): Promise<boolean> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User must be authenticated to access files');
      }

      const userId = currentUser.uid;
      const userPath = `${this.STORAGE_PATH}/${userId}`;
      
      // Check if the path starts with the user's folder
      if (!path.startsWith(userPath)) {
        throw new Error('You do not have permission to access this path');
      }
      
      return true;
    } catch (error) {
      console.error('Error validating user access:', error);
      throw error;
    }
  }
}

export const pdfStorageService = new PdfStorageService(); 