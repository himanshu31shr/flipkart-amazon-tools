import { roleAccessService } from '../role-access.service';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../../types/auth.types';

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

describe('RoleAccessService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUserRole', () => {
    it('should return USER role when no user is signed in', async () => {
      // Mock no current user
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: null
      });

      const role = await roleAccessService.getCurrentUserRole();
      expect(role).toBe(UserRole.USER);
    });

    it('should return USER role when user document does not exist', async () => {
      // Mock current user
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      // Mock Firestore doc not existing
      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      const role = await roleAccessService.getCurrentUserRole();
      expect(role).toBe(UserRole.USER);
    });

    it('should return role from user document', async () => {
      // Mock current user
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      // Mock Firestore doc existing with admin role
      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ role: UserRole.ADMIN })
      });

      const role = await roleAccessService.getCurrentUserRole();
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should handle errors gracefully', async () => {
      // Mock current user
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      // Mock Firestore error
      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const role = await roleAccessService.getCurrentUserRole();
      expect(role).toBe(UserRole.USER);
    });
  });

  describe('hasAdminAccess', () => {
    it('should return false for USER role', async () => {
      // Mock current user with USER role
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ role: UserRole.USER })
      });

      const hasAccess = await roleAccessService.hasAdminAccess();
      expect(hasAccess).toBe(false);
    });

    it('should return true for ADMIN role', async () => {
      // Mock current user with ADMIN role
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ role: UserRole.ADMIN })
      });

      const hasAccess = await roleAccessService.hasAdminAccess();
      expect(hasAccess).toBe(true);
    });

    it('should return true for SUPERUSER role', async () => {
      // Mock current user with SUPERUSER role
      const mockUser = { uid: 'test-user-id' };
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: mockUser
      });

      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ role: UserRole.SUPERUSER })
      });

      const hasAccess = await roleAccessService.hasAdminAccess();
      expect(hasAccess).toBe(true);
    });
  });

  describe('getUserDetails', () => {
    it('should return null when user document does not exist', async () => {
      // Mock Firestore
      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      // Mock current user for photoURL
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { photoURL: 'test-photo-url' }
      });

      const userDetails = await roleAccessService.getUserDetails('test-user-id');
      expect(userDetails).toBeNull();
    });

    it('should return user details when document exists', async () => {
      // Mock Firestore
      (getFirestore as jest.Mock).mockReturnValue({});
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@example.com',
          displayName: 'Test User',
          role: UserRole.USER,
          photoURL: 'test-photo-url'
        })
      });

      // Mock current user for photoURL
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { photoURL: 'current-photo-url' }
      });

      const userDetails = await roleAccessService.getUserDetails('test-user-id');
      expect(userDetails).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: UserRole.USER,
        photoURL: 'test-photo-url'
      });
    });
  });

  describe('getUserDetailsMap', () => {
    it('should return a map of user details', async () => {
      // Mock getUserDetails for multiple users
      const mockGetUserDetails = jest.spyOn(roleAccessService, 'getUserDetails');
      mockGetUserDetails
        .mockResolvedValueOnce({
          id: 'user1',
          email: 'user1@example.com',
          displayName: 'User One',
          role: UserRole.USER,
          photoURL: 'photo1'
        })
        .mockResolvedValueOnce({
          id: 'user2',
          email: 'user2@example.com',
          displayName: 'User Two',
          role: UserRole.ADMIN,
          photoURL: 'photo2'
        });

      const userDetailsMap = await roleAccessService.getUserDetailsMap(['user1', 'user2']);
      
      expect(userDetailsMap).toEqual({
        'user1': {
          id: 'user1',
          email: 'user1@example.com',
          displayName: 'User One',
          role: UserRole.USER,
          photoURL: 'photo1'
        },
        'user2': {
          id: 'user2',
          email: 'user2@example.com',
          displayName: 'User Two',
          role: UserRole.ADMIN,
          photoURL: 'photo2'
        }
      });

      // Restore the original method
      mockGetUserDetails.mockRestore();
    });

    it('should handle duplicate user IDs', async () => {
      // Mock getUserDetails for multiple users
      const mockGetUserDetails = jest.spyOn(roleAccessService, 'getUserDetails');
      mockGetUserDetails
        .mockResolvedValueOnce({
          id: 'user1',
          email: 'user1@example.com',
          displayName: 'User One',
          role: UserRole.USER,
          photoURL: 'photo1'
        });

      const userDetailsMap = await roleAccessService.getUserDetailsMap(['user1', 'user1']);
      
      expect(Object.keys(userDetailsMap)).toHaveLength(1);
      expect(userDetailsMap['user1']).toBeTruthy();

      // Restore the original method
      mockGetUserDetails.mockRestore();
    });
  });
}); 