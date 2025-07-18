import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { UserRole, UserDetails } from '../types/auth.types';

class RoleAccessService {
  private readonly USERS_COLLECTION = 'users';

  /**
   * Get the current user's role
   * @returns Promise resolving to the user's role
   */
  async getCurrentUserRole(): Promise<UserRole> {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return UserRole.USER;
    }

    try {
      const db = getFirestore();
      const userDocRef = doc(db, this.USERS_COLLECTION, currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return (userData.role as UserRole) || UserRole.USER;
      }

      return UserRole.USER;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return UserRole.USER;
    }
  }

  /**
   * Check if the current user has admin access
   * @returns Promise resolving to a boolean indicating admin access
   */
  async hasAdminAccess(): Promise<boolean> {
    const userRole = await this.getCurrentUserRole();
    return [UserRole.ADMIN, UserRole.SUPERUSER].includes(userRole);
  }

  /**
   * Get detailed user information
   * @param userId - ID of the user to fetch details for
   * @returns Promise resolving to user details
   */
  async getUserDetails(userId: string): Promise<UserDetails | null> {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, this.USERS_COLLECTION, userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const auth = getAuth();
        const firebaseUser = auth.currentUser;

        return {
          id: userId,
          email: userData.email || '',
          displayName: userData.displayName || '',
          role: userData.role || UserRole.USER,
          photoURL: userData.photoURL || firebaseUser?.photoURL
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  /**
   * Get details for multiple users
   * @param userIds - Array of user IDs to fetch details for
   * @returns Promise resolving to a map of user details
   */
  async getUserDetailsMap(userIds: string[]): Promise<Record<string, UserDetails>> {
    const uniqueUserIds = [...new Set(userIds)];
    const userDetailsPromises = uniqueUserIds.map(id => this.getUserDetails(id));
    
    const userDetails = await Promise.all(userDetailsPromises);
    
    return userDetails.reduce((acc, details) => {
      if (details) {
        acc[details.id] = details;
      }
      return acc;
    }, {} as Record<string, UserDetails>);
  }
}

export const roleAccessService = new RoleAccessService(); 