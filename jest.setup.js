import React from 'react';

// Make React available globally for JSX in tests
global.React = React;

// Mock Capacitor core with registerPlugin
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
  registerPlugin: jest.fn((pluginName) => {
    // Return a mock plugin implementation based on plugin name
    if (pluginName === 'FirebaseAuthentication') {
      return {
        createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({
          user: {
            uid: 'test-uid',
            email: 'test@example.com',
            emailVerified: false,
            displayName: null,
            photoUrl: null,
            phoneNumber: null,
            isAnonymous: false,
          }
        })),
        signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
          user: {
            uid: 'test-uid',
            email: 'test@example.com',
            emailVerified: false,
            displayName: null,
            photoUrl: null,
            phoneNumber: null,
            isAnonymous: false,
          }
        })),
        signOut: jest.fn(() => Promise.resolve()),
        getCurrentUser: jest.fn(() => Promise.resolve({ user: null })),
        sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
        addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
      };
    }
    if (pluginName === 'FirebaseFirestore') {
      return {
        getCollection: jest.fn(() => Promise.resolve({ snapshots: [] })),
        getDocument: jest.fn(() => Promise.resolve({ snapshot: { exists: false, data: null } })),
        setDocument: jest.fn(() => Promise.resolve()),
        addDocument: jest.fn(() => Promise.resolve({ reference: { id: 'test-id' } })),
        updateDocument: jest.fn(() => Promise.resolve()),
        deleteDocument: jest.fn(() => Promise.resolve()),
      };
    }
    if (pluginName === 'FirebaseStorage') {
      return {
        uploadFile: jest.fn(() => Promise.resolve()),
        getDownloadUrl: jest.fn(() => Promise.resolve({ downloadUrl: 'test-url' })),
        deleteFile: jest.fn(() => Promise.resolve()),
        getMetadata: jest.fn(() => Promise.resolve({
          bucket: 'test-bucket',
          name: 'test-file',
          size: 1024,
          contentType: 'application/octet-stream',
          customMetadata: {},
        })),
      };
    }
    // Default mock for any other plugins
    return {};
  }),
}));

// Mock Capacitor Firebase Authentication
jest.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({
      user: {
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: false,
        displayName: null,
        photoUrl: null,
        phoneNumber: null,
        isAnonymous: false,
      }
    })),
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
      user: {
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: false,
        displayName: null,
        photoUrl: null,
        phoneNumber: null,
        isAnonymous: false,
      }
    })),
    signOut: jest.fn(() => Promise.resolve()),
    getCurrentUser: jest.fn(() => Promise.resolve({ user: null })),
    sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  },
}));

// Mock Capacitor Firebase Firestore
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(() => Promise.resolve({ snapshots: [] })),
    getDocument: jest.fn(() => Promise.resolve({ snapshot: { exists: false, data: null } })),
    setDocument: jest.fn(() => Promise.resolve()),
    addDocument: jest.fn(() => Promise.resolve({ reference: { id: 'test-id' } })),
    updateDocument: jest.fn(() => Promise.resolve()),
    deleteDocument: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Capacitor Firebase Storage
jest.mock('@capacitor-firebase/storage', () => ({
  FirebaseStorage: {
    uploadFile: jest.fn(() => Promise.resolve()),
    getDownloadUrl: jest.fn(() => Promise.resolve({ downloadUrl: 'test-url' })),
    deleteFile: jest.fn(() => Promise.resolve()),
    getMetadata: jest.fn(() => Promise.resolve({
      bucket: 'test-bucket',
      name: 'test-file',
      size: 1024,
      contentType: 'application/octet-stream',
      customMetadata: {},
    })),
  },
})); 