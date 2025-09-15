import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  Firestore, 
  enableIndexedDbPersistence, 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  connectFirestoreEmulator,
  FirestoreError
} from 'firebase/firestore';
import {
  FirebaseStorage,
  getStorage,
  connectStorageEmulator
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'test-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'test-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'test-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'test-storage-bucket',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'test-messaging-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'test-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'test-measurement-id'
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Check if we're in a test environment
if (process.env.NODE_ENV === 'test') {
  // Mock Firebase for tests
  app = {
    name: '[DEFAULT]',
    options: firebaseConfig
  } as FirebaseApp;
  
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn()
  } as unknown as Auth;
  
  db = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      get: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn()
    }))
  } as unknown as Firestore;
  
  storage = {
    ref: jest.fn(),
    refFromURL: jest.fn()
  } as unknown as FirebaseStorage;
} else {
  // Real Firebase initialization for non-test environments
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with custom configuration
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    experimentalForceLongPolling: true // Better for certain network conditions
  });
  
  // Initialize Firebase Storage
  storage = getStorage(app);
  
  // Connect to the emulators if the environment variables are set
  if (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT) {
    connectFirestoreEmulator(
      db,
      import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
      parseInt(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT, 10)
    );
  }

  // Connect to Auth emulator if environment variables are set
  if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT) {
    const authUrl = `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT}`;
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  }
  
  // Connect to Storage emulator if environment variables are set or in development mode
  const isDevEnvironment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
  
  if (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST && import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT) {
    // Use environment variables if available
    connectStorageEmulator(
      storage,
      import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST,
      parseInt(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT, 10)
    );
  } else if (isDevEnvironment) {
    // Default to localhost:9199 for development if not specified
    try {
      // Use port 9199 which is the default for Firebase Storage emulator
      connectStorageEmulator(storage, 'localhost', 9199);
    } catch (error) {
      console.error('Failed to connect to Firebase Storage emulator:', error);
    }
  }
  
  // Enable offline persistence
  const enablePersistence = async () => {
    try {
      await enableIndexedDbPersistence(db, { 
        forceOwnership: false // Allow multiple tabs to share the same persistence
      });
    } catch (err: unknown) {
      // Add type guard for unknown error type
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as FirestoreError;
        if (firebaseError.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time
        } else if (firebaseError.code === 'unimplemented') {
          // The current browser does not support all of the features required
        }
      }
    }
  };

  if(process.env.NODE_ENV !== 'development') {
    enablePersistence();
  }
}

export { app, auth, db, storage };
