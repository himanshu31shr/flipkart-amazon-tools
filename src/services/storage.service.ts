import { 
  getDownloadURL, 
  ref, 
  uploadBytesResumable, 
  deleteObject,
  listAll,
  updateMetadata,
  getMetadata,
  UploadMetadata,
  FullMetadata,
  StorageReference
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { storage } from './firebase.config';
import { Capacitor } from '@capacitor/core';
import { FirebaseStorage } from '@capacitor-firebase/storage';

/**
 * Service for managing file storage in Firebase
 */
export class StorageService {
  private isNativePlatform: boolean;

  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform();
  }

  /**
   * Convert a Blob or File to base64 string for Capacitor
   * 
   * @param blob - Blob or File to convert
   * @returns Promise with base64 string
   */
  private async blobToBase64(blob: Blob | File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix for Capacitor
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  /**
   * Upload a file to Firebase Storage
   * 
   * @param file - File to upload
   * @param path - Path in storage where the file should be saved
   * @param metadata - Optional metadata for the file
   * @returns Promise with the download URL
   */
  async uploadFile(
    file: File | Blob,
    path: string,
    metadata?: UploadMetadata
  ): Promise<string> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('Authentication error: No user is currently signed in');
        throw new Error('User must be authenticated to upload files');
      }

      if (this.isNativePlatform) {
        // Use Capacitor Firebase Storage
        // Note: Capacitor Firebase Storage API is more limited
        // For now, we'll fall back to web SDK for upload operations on native
        console.warn('File upload on native platform using web SDK fallback');
        
        // Create storage reference using web SDK as fallback
        const storageRef = ref(storage, path);
        
        const metadataToUse = {
          ...metadata,
          customMetadata: {
            userId: currentUser.uid,
            uploadedAt: Date.now().toString(),
            ...metadata?.customMetadata
          }
        };
        
        const uploadTask = await uploadBytesResumable(storageRef, file, metadataToUse);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        return downloadUrl;
      } else {
        // Use web SDK
        // Create storage reference
        const storageRef = ref(storage, path);
        
        // Ensure we have valid metadata
        const metadataToUse = {
          ...metadata,
          customMetadata: {
            userId: currentUser.uid,
            uploadedAt: Date.now().toString(),
            ...metadata?.customMetadata
          }
        };
        
        // Upload the file with metadata
        const uploadTask = await uploadBytesResumable(storageRef, file, metadataToUse);
        
        // Get the download URL
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        return downloadUrl;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Download a file from Firebase Storage
   * 
   * @param path - Path to the file in storage
   * @returns Promise with the download URL
   */
  async getFileUrl(path: string): Promise<string> {
    try {
      if (this.isNativePlatform) {
        // Use Capacitor Firebase Storage
        const result = await FirebaseStorage.getDownloadUrl({ path });
        return result.downloadUrl;
      } else {
        // Use web SDK
        const storageRef = ref(storage, path);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
      }
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Firebase Storage
   * 
   * @param path - Path to the file in storage
   * @returns Promise that resolves when the file is deleted
   */
  async deleteFile(path: string): Promise<void> {
    try {
      if (this.isNativePlatform) {
        // Use Capacitor Firebase Storage
        await FirebaseStorage.deleteFile({ path });
      } else {
        // Use web SDK
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List all files in a directory
   * 
   * @param path - Path to the directory in storage
   * @returns Promise with an array of file paths
   */
  async listFiles(path: string): Promise<string[]> {
    try {
      if (this.isNativePlatform) {
        // Capacitor Firebase Storage doesn't support listAll directly
        // This would require a custom implementation or server-side solution
        console.warn('listFiles is not supported on native platforms with Capacitor Firebase Storage');
        throw new Error('File listing is not supported on native platforms');
      } else {
        // Use web SDK
        const storageRef = ref(storage, path);
        const result = await listAll(storageRef);
        
        // Return the list of file paths
        return result.items.map(item => item.fullPath);
      }
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a file
   * 
   * @param path - Path to the file in storage
   * @returns Promise with the file metadata
   */
  async getFileMetadata(path: string): Promise<FullMetadata> {
    try {
      if (this.isNativePlatform) {
        // Use Capacitor Firebase Storage
        const result = await FirebaseStorage.getMetadata({ path });
        
        // Convert Capacitor metadata format to Firebase web SDK format
        return {
          bucket: result.bucket || '',
          fullPath: path,
          generation: result.generation || '',
          metageneration: result.generation || '', // Use generation as fallback
          name: result.name || path.split('/').pop() || '',
          size: result.size || 0,
          timeCreated: result.createdAt || new Date().toISOString(),
          updated: result.updatedAt || new Date().toISOString(),
          md5Hash: result.md5Hash,
          cacheControl: result.cacheControl,
          contentDisposition: result.contentDisposition,
          contentEncoding: result.contentEncoding,
          contentLanguage: result.contentLanguage,
          contentType: result.contentType || 'application/octet-stream',
          customMetadata: result.customMetadata || {},
          downloadTokens: [], // Not available in Capacitor
          ref: {} as StorageReference, // StorageReference not available in Capacitor
          type: 'file'
        } as FullMetadata;
      } else {
        // Use web SDK
        const storageRef = ref(storage, path);
        const metadata = await getMetadata(storageRef);
        return metadata;
      }
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Update metadata for a file
   * 
   * @param path - Path to the file in storage
   * @param metadata - New metadata to apply
   * @returns Promise with the updated metadata
   */
  async updateFileMetadata(
    path: string,
    metadata: { [key: string]: string }
  ): Promise<FullMetadata> {
    try {
      if (this.isNativePlatform) {
        // Capacitor Firebase Storage doesn't support metadata updates directly
        console.warn('updateFileMetadata is limited on native platforms with Capacitor Firebase Storage');
        throw new Error('Metadata updates are not supported on native platforms');
      } else {
        // Use web SDK
        const storageRef = ref(storage, path);
        
        // Update only the custom metadata
        const updatedMetadata = await updateMetadata(storageRef, {
          customMetadata: metadata
        });
        
        return updatedMetadata;
      }
    } catch (error) {
      console.error('Error updating file metadata:', error);
      throw error;
    }
  }

  /**
   * Generate a unique file path for storage
   * 
   * @param directory - Directory in storage
   * @param fileName - Name of the file
   * @returns Unique storage path
   */
  generateFilePath(directory: string, fileName: string): string {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('Authentication error: No user is currently signed in');
      throw new Error('User must be authenticated to generate file paths');
    }
    
    const userId = currentUser.uid;
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${directory}/${userId}/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Check if a user is authenticated
   * 
   * @returns True if a user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    const auth = getAuth();
    return !!auth.currentUser;
  }
}

export const storageService = new StorageService(); 