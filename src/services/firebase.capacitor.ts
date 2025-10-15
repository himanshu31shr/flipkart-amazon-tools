import { Capacitor } from '@capacitor/core';
import { FirebaseApp } from '@capacitor-firebase/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseStorage } from '@capacitor-firebase/storage';

/**
 * Check if we should use Firebase emulators
 * Returns true if running in development with emulator environment variables set
 * or if using dummy Firebase config (which indicates emulator-only development)
 */
function shouldUseEmulators(): boolean {
  // Check for development mode
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Check if emulator environment variables are set
  const hasEmulatorConfig = !!(
    import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST ||
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST
  );

  // Check if using dummy Firebase config (indicates emulator-only development)
  const usingDummyConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID === 'dummy-project' ||
    import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_key';

  return (isDev && hasEmulatorConfig) || usingDummyConfig;
}

/**
 * Initialize Firebase Capacitor plugins for native platforms
 * This module handles Firebase initialization when running on iOS or Android
 * via Capacitor's native container.
 *
 * Development Mode:
 * - When emulator environment variables are set, uses web Firebase SDK
 * - This allows development without native config files
 *
 * Production Mode:
 * - Uses native Capacitor Firebase plugins
 * - Requires GoogleService-Info.plist (iOS) and google-services.json (Android)
 *
 * @returns Promise<void>
 * @throws Error if Firebase configuration is invalid in production
 */
export async function initializeFirebaseCapacitor(): Promise<void> {
  // Only initialize on native platforms (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('Skipping Capacitor Firebase initialization (not on native platform)');
    return;
  }

  // Check if we should use emulators (development mode)
  if (shouldUseEmulators()) {
    console.log('🔧 Development mode: Using Firebase Web SDK with emulators');
    console.log('ℹ️  Native Firebase plugins will be used in production builds');
    // Web SDK will be used automatically - no Capacitor plugin initialization needed
    return;
  }

  // Production mode: Use Capacitor Firebase plugins
  try {
    console.log('Initializing Firebase Capacitor plugins for production...');

    // Verify Firebase App is configured by checking app name
    // Firebase is auto-initialized on native platforms
    const appInfo = await FirebaseApp.getName();
    console.log('✓ Firebase App configured:', appInfo.name);

    // Enable offline persistence for Firestore
    await FirebaseFirestore.enableNetwork();
    console.log('✓ Firestore network enabled');

    // Log successful initialization
    console.log('✓ Firebase Capacitor plugins initialized successfully');
  } catch (error) {
    // Log error with helpful message
    console.error('Failed to initialize Firebase Capacitor plugins:', error);

    // Provide helpful error message for missing config files
    if (error instanceof Error) {
      if (error.message.includes('GoogleService-Info.plist') ||
          error.message.includes('google-services.json')) {
        console.error(
          '\n❌ Firebase configuration files missing!\n' +
          '\nFor development: Start the app with Firebase emulators:\n' +
          '  npm run dev\n' +
          '\nFor production builds:\n' +
          '  1. Download GoogleService-Info.plist from Firebase Console\n' +
          '  2. Download google-services.json from Firebase Console\n' +
          '  3. See NATIVE_PLATFORM_SETUP.md for instructions\n'
        );
      }
    }

    // Don't throw in development - let app continue with web SDK
    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.warn('⚠️  Continuing with web Firebase SDK. Native features will be limited.');
      return;
    }

    // Throw in production
    throw error;
  }
}

/**
 * Check if we're running on a native platform with Capacitor
 * @returns boolean
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform (ios, android, web)
 * @returns string
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Check if we're running on iOS
 * @returns boolean
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if we're running on Android
 * @returns boolean
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if we're running on web
 * @returns boolean
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

// Export Capacitor Firebase plugin instances for direct use if needed
export {
  FirebaseAuthentication,
  FirebaseFirestore,
  FirebaseStorage,
  FirebaseApp
};
