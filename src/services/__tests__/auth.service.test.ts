import { AuthService } from '../auth.service';
import { User } from 'firebase/auth';

// Mock firebase auth
jest.mock('firebase/auth', () => {
  const mockUnsubscribe = jest.fn();
  const mockOnAuthStateChanged = jest.fn(() => mockUnsubscribe);
  const mockCreateUserWithEmailAndPassword = jest.fn();
  const mockSignInWithEmailAndPassword = jest.fn();
  const mockSignOut = jest.fn();
  const mockSendPasswordResetEmail = jest.fn();
  const mockCurrentUser = { uid: 'test-uid', email: 'test@example.com' };
  
  return {
    createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    signOut: mockSignOut,
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    onAuthStateChanged: mockOnAuthStateChanged,
    setPersistence: jest.fn(),
    browserLocalPersistence: 'local',
    browserSessionPersistence: 'session',
    getAuth: jest.fn(() => ({
      currentUser: mockCurrentUser
    })),
    __mockOnAuthStateChanged: mockOnAuthStateChanged,
    __mockUnsubscribe: mockUnsubscribe,
    __mockCreateUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
    __mockSignInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    __mockSignOut: mockSignOut,
    __mockSendPasswordResetEmail: mockSendPasswordResetEmail,
    __mockCurrentUser: mockCurrentUser
  };
});

// Mock firebase firestore
jest.mock('firebase/firestore', () => {
  const mockDoc = jest.fn(() => 'mocked-doc-ref');
  const mockSetDoc = jest.fn();
  const mockGetDoc = jest.fn();
  
  return {
    doc: mockDoc,
    setDoc: mockSetDoc,
    getDoc: mockGetDoc,
    __mockDoc: mockDoc,
    __mockSetDoc: mockSetDoc,
    __mockGetDoc: mockGetDoc
  };
});

// Mock firebase config
jest.mock('../firebase.config', () => ({
  auth: {},
  db: {}
}));

// Helper function to access the mocks
const getMocks = () => {
   
  const auth = jest.requireMock('firebase/auth') as any;
   
  const firestore = jest.requireMock('firebase/firestore') as any;
  
  return {
    mockCreateUserWithEmailAndPassword: auth.__mockCreateUserWithEmailAndPassword,
    mockSignInWithEmailAndPassword: auth.__mockSignInWithEmailAndPassword,
    mockSignOut: auth.__mockSignOut,
    mockSendPasswordResetEmail: auth.__mockSendPasswordResetEmail,
    mockOnAuthStateChanged: auth.__mockOnAuthStateChanged,
    mockUnsubscribe: auth.__mockUnsubscribe,
    mockCurrentUser: auth.__mockCurrentUser,
    mockDoc: firestore.__mockDoc,
    mockSetDoc: firestore.__mockSetDoc,
    mockGetDoc: firestore.__mockGetDoc
  };
};

describe('AuthService', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof getMocks>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
    mocks = getMocks();
  });
  
  describe('signUp', () => {
    it('should create a user and store user data in Firestore', async () => {
      const mockUser = { uid: 'new-user-id', email: 'new@example.com' };
      mocks.mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      
      const result = await service.signUp('new@example.com', 'password123');
      
      expect(mocks.mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'password123'
      );
      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', mockUser.uid);
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        'mocked-doc-ref',
        expect.objectContaining({
          email: 'new@example.com',
          role: 'user',
          createdAt: expect.any(Date),
          lastLoginAt: expect.any(Date)
        })
      );
      expect(result).toBe(mockUser);
    });
    
    it('should throw an error when signup fails', async () => {
      const mockError = new Error('Auth error');
      mocks.mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);
      
      await expect(service.signUp('invalid@example.com', 'short')).rejects.toThrow('Auth error');
      expect(mocks.mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'invalid@example.com',
        'short'
      );
      expect(mocks.mockSetDoc).not.toHaveBeenCalled();
    });
  });
  
  describe('signIn', () => {
    it('should sign in with local persistence when rememberMe is true', async () => {
      const mockUser = { uid: 'user-id', email: 'user@example.com' };
      mocks.mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      
      const result = await service.signIn('user@example.com', 'password123', true);
      
      expect(mocks.mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com',
        'password123'
      );
      // Check persistence was set correctly
      const setPersistence = jest.requireMock('firebase/auth').setPersistence;
      expect(setPersistence).toHaveBeenCalledWith(expect.anything(), 'local');
      
      // Check last login update
      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', mockUser.uid);
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        'mocked-doc-ref',
        expect.objectContaining({
          lastLoginAt: expect.any(Date)
        }),
        { merge: true }
      );
      expect(result).toBe(mockUser);
    });
    
    it('should sign in with session persistence when rememberMe is false', async () => {
      const mockUser = { uid: 'user-id', email: 'user@example.com' };
      mocks.mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      
      await service.signIn('user@example.com', 'password123', false);
      
      // Check persistence was set correctly
      const setPersistence = jest.requireMock('firebase/auth').setPersistence;
      expect(setPersistence).toHaveBeenCalledWith(expect.anything(), 'session');
    });
    
    it('should throw an error when signin fails', async () => {
      const mockError = new Error('Invalid credentials');
      mocks.mockSignInWithEmailAndPassword.mockRejectedValue(mockError);
      
      await expect(service.signIn('wrong@example.com', 'wrongpass')).rejects.toThrow('Invalid credentials');
      expect(mocks.mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'wrong@example.com',
        'wrongpass'
      );
    });
  });
  
  describe('signOut', () => {
    it('should call Firebase signOut method', async () => {
      mocks.mockSignOut.mockResolvedValue(undefined);
      
      await service.signOut();
      
      expect(mocks.mockSignOut).toHaveBeenCalledWith(expect.anything());
    });
    
    it('should throw an error when signout fails', async () => {
      const mockError = new Error('Network error');
      mocks.mockSignOut.mockRejectedValue(mockError);
      
      await expect(service.signOut()).rejects.toThrow('Network error');
    });
  });
  
  describe('resetPassword', () => {
    it('should call Firebase sendPasswordResetEmail method', async () => {
      mocks.mockSendPasswordResetEmail.mockResolvedValue(undefined);
      
      await service.resetPassword('user@example.com');
      
      expect(mocks.mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com'
      );
    });
    
    it('should throw an error when reset password fails', async () => {
      const mockError = new Error('User not found');
      mocks.mockSendPasswordResetEmail.mockRejectedValue(mockError);
      
      await expect(service.resetPassword('nonexistent@example.com')).rejects.toThrow('User not found');
    });
  });
  
  describe('getCurrentUser', () => {
    it('should return the current user from Firebase auth', async () => {
      // Mock the auth property of the service directly
      Object.defineProperty(service, 'auth', {
        get: () => ({
          currentUser: mocks.mockCurrentUser
        })
      });
      
      const result = await service.getCurrentUser();
      
      expect(result).toEqual(mocks.mockCurrentUser);
    });
  });
  
  describe('getUserData', () => {
    it('should return user data from Firestore if it exists', async () => {
      const mockUserData = {
        email: 'user@example.com',
        role: 'admin',
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserData
      });
      
      const result = await service.getUserData('user-id');
      
      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-id');
      expect(mocks.mockGetDoc).toHaveBeenCalledWith('mocked-doc-ref');
      expect(result).toEqual(mockUserData);
    });
    
    it('should return null if user data does not exist', async () => {
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });
      
      const result = await service.getUserData('nonexistent-id');
      
      expect(result).toBeNull();
    });
    
    it('should throw an error when getUserData fails', async () => {
      const mockError = new Error('Firestore error');
      mocks.mockGetDoc.mockRejectedValue(mockError);
      
      await expect(service.getUserData('user-id')).rejects.toThrow('Firestore error');
    });
  });
  
  describe('onAuthStateChanged', () => {
    it('should register a callback for auth state changes and return an unsubscribe function', () => {
      const callback = jest.fn();
      
      const unsubscribe = service.onAuthStateChanged(callback);
      
      expect(mocks.mockOnAuthStateChanged).toHaveBeenCalledWith(expect.anything(), callback);
      expect(unsubscribe).toBe(mocks.mockUnsubscribe);
    });
    
    it('should call the callback when auth state changes', () => {
      const callback = jest.fn();
      service.onAuthStateChanged(callback);
      
      // Simulate auth state change
      const mockUser: User = { uid: 'user-123', email: 'user@example.com' } as User;
      const authStateChangedHandler = mocks.mockOnAuthStateChanged.mock.calls[0][1];
      authStateChangedHandler(mockUser);
      
      expect(callback).toHaveBeenCalledWith(mockUser);
    });
  });
}); 