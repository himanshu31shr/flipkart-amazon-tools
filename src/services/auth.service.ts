import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  Auth,
  User,
  Unsubscribe
} from 'firebase/auth';
import { doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { auth as firebaseAuth, db as firebaseDb } from './firebase.config';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

interface UserData {
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Check if we should use native Firebase Capacitor plugins
 * Returns false if using emulators (development mode with dummy config)
 */
function shouldUseNativeFirebase(): boolean {
  // Check if using dummy Firebase config (indicates emulator-only development)
  const usingDummyConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID === 'dummy-project' ||
    import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_key';

  // Check if emulator environment variables are set
  const hasEmulatorConfig = !!(
    import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST ||
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST
  );

  // Only use native plugins if NOT using emulators and on native platform
  return Capacitor.isNativePlatform() && !usingDummyConfig && !hasEmulatorConfig;
}

export class AuthService {
  private auth: Auth;
  private db: Firestore;
  private useNativeFirebase: boolean;

  constructor() {
    this.auth = firebaseAuth;
    this.db = firebaseDb;
    this.useNativeFirebase = shouldUseNativeFirebase();
  }

  async signUp(email: string, password: string): Promise<User> {
    try {
      if (this.useNativeFirebase) {
        // Use Capacitor Firebase Authentication
        const result = await FirebaseAuthentication.createUserWithEmailAndPassword({
          email,
          password,
        });
        
        if (result.user) {
          // Create user document in Firestore
          await setDoc(doc(this.db, 'users', result.user.uid), {
            email,
            role: 'user',
            createdAt: new Date(),
            lastLoginAt: new Date()
          });
          
          // Convert to Firebase User format for compatibility
          return {
            uid: result.user.uid,
            email: result.user.email,
            emailVerified: result.user.emailVerified || false,
            displayName: result.user.displayName || null,
            photoURL: result.user.photoUrl || null,
            phoneNumber: result.user.phoneNumber || null,
            providerId: 'firebase',
            isAnonymous: result.user.isAnonymous || false,
          } as User;
        }
        throw new Error('User creation failed');
      } else {
        // Use web SDK
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(this.db, 'users', userCredential.user.uid), {
          email,
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        });

        return userCredential.user;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sign up failed: ${errorMessage}`);
    }
  }

  async signIn(email: string, password: string, rememberMe: boolean = false): Promise<User> {
    try {
      if (this.useNativeFirebase) {
        // Use Capacitor Firebase Authentication
        const result = await FirebaseAuthentication.signInWithEmailAndPassword({
          email,
          password,
        });
        
        if (result.user) {
          // Update last login timestamp with retry logic
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.updateLastLogin(result.user.uid);
              break; // Success, exit retry loop
            } catch {
              if (attempt === 3) {
                // Failed after all retries, but don't fail the login
                break;
              }
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
          }
          
          // Convert to Firebase User format for compatibility
          return {
            uid: result.user.uid,
            email: result.user.email,
            emailVerified: result.user.emailVerified || false,
            displayName: result.user.displayName || null,
            photoURL: result.user.photoUrl || null,
            phoneNumber: result.user.phoneNumber || null,
            providerId: 'firebase',
            isAnonymous: result.user.isAnonymous || false,
          } as User;
        }
        throw new Error('Sign in failed');
      } else {
        // Use web SDK
        // Set persistence based on remember me
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        
        // Update last login timestamp with retry logic
        if (userCredential.user) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.updateLastLogin(userCredential.user.uid);
              break; // Success, exit retry loop
            } catch {
              if (attempt === 3) {
                // Failed after all retries, but don't fail the login
                break;
              }
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
          }
        }

        return userCredential.user;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sign in failed: ${errorMessage}`);
    }
  }

  private async updateLastLogin(userId: string, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await setDoc(doc(this.db, 'users', userId), {
          lastLoginAt: new Date()
        }, { merge: true });
        return; // Success
      } catch {
        if (attempt === maxRetries) {
          // Don't throw error - login should still succeed even if lastLoginAt update fails
          return;
        }
        
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 100));
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.useNativeFirebase) {
        // Use Capacitor Firebase Authentication
        await FirebaseAuthentication.signOut();
      } else {
        // Use web SDK
        await signOut(this.auth);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sign out failed: ${errorMessage}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      if (this.useNativeFirebase) {
        // Use Capacitor Firebase Authentication
        await FirebaseAuthentication.sendPasswordResetEmail({ email });
      } else {
        // Use web SDK
        await sendPasswordResetEmail(this.auth, email);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Password reset failed: ${errorMessage}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.useNativeFirebase) {
      // Use Capacitor Firebase Authentication
      try {
        const result = await FirebaseAuthentication.getCurrentUser();
        if (result.user) {
          return {
            uid: result.user.uid,
            email: result.user.email,
            emailVerified: result.user.emailVerified || false,
            displayName: result.user.displayName || null,
            photoURL: result.user.photoUrl || null,
            phoneNumber: result.user.phoneNumber || null,
            providerId: 'firebase',
            isAnonymous: result.user.isAnonymous || false,
          } as User;
        }
        return null;
      } catch {
        return null;
      }
    } else {
      // Use web SDK
      return this.auth.currentUser;
    }
  }

  async getUserData(userId: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', userId));
      return userDoc.exists() ? userDoc.data() as UserData : null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get user data: ${errorMessage}`);
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    if (this.useNativeFirebase) {
      // Use Capacitor Firebase Authentication
      // Capacitor uses listeners instead of callbacks
      let isListening = true;
      
      const listener = FirebaseAuthentication.addListener('authStateChange', async (change) => {
        if (!isListening) return;
        
        if (change.user) {
          // Convert to Firebase User format
          const user: User = {
            uid: change.user.uid,
            email: change.user.email,
            emailVerified: change.user.emailVerified || false,
            displayName: change.user.displayName || null,
            photoURL: change.user.photoUrl || null,
            phoneNumber: change.user.phoneNumber || null,
            providerId: 'firebase',
            isAnonymous: change.user.isAnonymous || false,
          } as User;
          callback(user);
        } else {
          callback(null);
        }
      });
      
      // Return unsubscribe function
      return () => {
        isListening = false;
        listener.then(l => l.remove());
      };
    } else {
      // Use web SDK
      return onAuthStateChanged(this.auth, callback);
    }
  }
}