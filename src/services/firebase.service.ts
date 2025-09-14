import { FirebaseError } from 'firebase/app';
import {
  Firestore,
  FirestoreError,
  QueryConstraint,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  enableIndexedDbPersistence,
  getDocs,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  DocumentData,
  WriteBatch,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase.config";

export class FirebaseService {
  protected db: Firestore;
  private static persistenceEnabled = false;

  constructor() {
    this.db = db;
    this.enableOfflinePersistence();
  }

  private async enableOfflinePersistence() {
    if (!FirebaseService.persistenceEnabled) {
      // Only enable persistence in production or non-development environments
      if (process.env.NODE_ENV !== 'development') {
        try {
          await enableIndexedDbPersistence(this.db);
          FirebaseService.persistenceEnabled = true;
        } catch (err) {
          if ((err as FirestoreError).code === 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time
          } else if ((err as FirestoreError).code === 'unimplemented') {
            // The current browser does not support persistence
          }
        }
      }
    }
  }

  protected handleError(error: unknown): never {
    if (error instanceof FirebaseError) {
      if (error.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
      } else if (error.code === 'unimplemented') {
        // The current browser does not support persistence
      } else {
        // Firebase error occurred
      }
    } else if (error instanceof Error) {
      // General error occurred
    }
    throw error;
  }

  private validateFirestoreData(data: DocumentData): void {
    const validateValue = (value: unknown, path: string): void => {
      if (value === undefined) {
        throw new Error(`Undefined value not allowed in Firestore at path: ${path}`);
      }
      
      if (typeof value === 'function') {
        throw new Error(`Function values not allowed in Firestore at path: ${path}`);
      }
      
      // Allow Firebase Timestamp objects and other valid Firestore types
      if (value && typeof value === 'object') {
        // Check if it's a Firebase Timestamp
        if (value.constructor && value.constructor.name === 'Timestamp') {
          return; // Valid Firebase Timestamp
        }
        
        // Check if it's a Date object (which should be converted to Timestamp)
        if (value instanceof Date) {
          // Date objects are allowed (Firestore will convert them)
          return;
        }
        
        // Check for plain objects without constructor (these are problematic)
        if (!value.constructor || value.constructor === Object) {
          // This is a plain object, validate its properties recursively
          const objValue = value as Record<string, unknown>;
          Object.keys(objValue).forEach(key => {
            validateValue(objValue[key], `${path}.${key}`);
          });
          return;
        }
        
        // For other objects with constructors, check if they're valid Firestore types
        const constructorName = value.constructor.name;
        const validFirestoreTypes = ['GeoPoint', 'DocumentReference', 'Blob'];
        if (validFirestoreTypes.includes(constructorName)) {
          return; // Valid Firestore type
        }
        
        // If it's not a recognized Firestore type, it might be problematic
        // Log warning for unknown object types
      }
      
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          validateValue(item, `${path}[${index}]`);
        });
      }
    };

    Object.keys(data).forEach(key => {
      validateValue(data[key], key);
    });
  }

  protected async getDocuments<T extends DocumentData>(
    collectionName: string,
    queryConstraints: QueryConstraint[] = []
  ): Promise<(T & { id: string })[]> {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        ...(doc.data() as T),
        id: doc.id,
      }));
    } catch (error) {
      this.handleError(error as FirestoreError);
    }
  }

  protected async getDocument<T extends DocumentData>(
    collectionName: string,
    docId: string
  ): Promise<T | undefined> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        return docSnapshot.data() as T;
      }
      return undefined;
    } catch (error) {
      this.handleError(error as FirestoreError);
    }
  }

  protected async setDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      this.handleError(error as FirestoreError);
    }
  }

  protected async addDocument<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<{ id: string }> {
    try {
      // Validate data before sending to Firestore
      this.validateFirestoreData(data);
      const docRef = await addDoc(collection(this.db, collectionName), data);
      return { id: docRef.id };
    } catch (error) {
      this.handleError(error as FirestoreError);
      throw error;
    }
  }

  protected async updateDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      this.handleError(error as FirestoreError);
    }
  }

  protected async deleteDocument(
    collectionName: string,
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      this.handleError(error as FirestoreError);
    }
  }

  protected async batchOperation<T>(
    items: T[],
    collectionName: string,
    operation: "create" | "update" | "delete",
    getDocId: (item: T) => string
  ): Promise<void> {
    // Firebase Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;
    
    if (items.length <= BATCH_SIZE) {
      // Single batch - use original logic
      const batch = writeBatch(this.db);
      items.forEach((item) => {
        const docRef = doc(this.db, collectionName, getDocId(item));
        switch (operation) {
          case "create":
            batch.set(docRef, {
              ...item,
              updatedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
            });
            break;
          case "update":
            batch.update(docRef, {
              ...item,
              updatedAt: Timestamp.now(),
            });
            break;
          case "delete":
            batch.delete(docRef);
            break;
        }
      });
      return this.processBatchWithRetry(batch);
    }
    
    // Multiple batches needed - chunk the items
    const chunks = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      chunks.push(items.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${items.length} items in ${chunks.length} batches of ${BATCH_SIZE}`);
    
    // Process each chunk sequentially to avoid overwhelming Firestore
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} items)`);
      
      const batch = writeBatch(this.db);
      chunk.forEach((item) => {
        const docRef = doc(this.db, collectionName, getDocId(item));
        switch (operation) {
          case "create":
            batch.set(docRef, {
              ...item,
              updatedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
            });
            break;
          case "update":
            batch.update(docRef, {
              ...item,
              updatedAt: Timestamp.now(),
            });
            break;
          case "delete":
            batch.delete(docRef);
            break;
        }
      });
      
      await this.processBatchWithRetry(batch);
      
      // Small delay between batches to be gentle on Firestore
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  protected async processBatchWithRetry(
    batch: WriteBatch,
    maxRetries = 3,
    attempt = 0
  ): Promise<void> {
    try {
      await batch.commit();
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'unavailable' && attempt < maxRetries) {
        // Exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return this.processBatchWithRetry(batch, maxRetries, attempt + 1);
      }
      throw new Error('Service temporarily unavailable');
    }
  }
}
