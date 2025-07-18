import { pdfStorageService } from '../pdfStorageService';
import { roleAccessService } from '../role-access.service';
import * as FirestoreMethods from 'firebase/firestore';
import { UserRole } from '../../types/auth.types';

// Mock entire Firestore module
jest.mock('firebase/firestore', () => {
  const originalModule = jest.requireActual('firebase/firestore');
  return {
    ...originalModule,
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(() => ({
      doc: jest.fn((docId) => ({
        id: docId,
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ userId: docId })
        })
      }))
    })),
    doc: jest.fn((db, collectionName, docId) => ({
      id: docId,
      get: jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: docId })
      })
    })),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn().mockResolvedValue({
      docs: [],
      size: 0
    }),
    getDoc: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ userId: 'test-user' })
    }),
    orderBy: jest.fn(),
    limit: jest.fn(),
    Timestamp: {
      fromDate: jest.fn().mockImplementation((date) => ({
        toMillis: () => date.getTime(),
        toDate: () => date
      }))
    }
  };
});

// Mock role access service
jest.mock('../role-access.service', () => ({
  roleAccessService: {
    hasAdminAccess: jest.fn(),
    getUserDetailsMap: jest.fn()
  }
}));

describe('PdfStorageService Multi-User Methods', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAllUserPdfs', () => {
    it('should return paginated PDFs with default options', async () => {
      // Mock admin access
      (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(true);

      // Mock Firestore query and docs
      const mockDoc = {
        id: 'test-pdf-id',
        data: () => ({
          userId: 'user1',
          downloadUrl: 'http://example.com/pdf',
          expiresAt: FirestoreMethods.Timestamp.fromDate(new Date()),
          isShared: false,
          restrictAccess: true,
          originalFileName: 'test.pdf',
          fileSize: 1024,
          uploadedAt: FirestoreMethods.Timestamp.fromDate(new Date()),
          visibility: 'private',
          storagePath: 'pdfs/user1/test.pdf',
          stats: {},
          description: 'Test PDF'
        })
      };

      // Mock Firestore methods
      (FirestoreMethods.getFirestore as jest.Mock).mockReturnValue({});
      (FirestoreMethods.collection as jest.Mock).mockReturnValue('mock-collection');
      (FirestoreMethods.query as jest.Mock).mockReturnValue('mock-query');
      (FirestoreMethods.orderBy as jest.Mock).mockReturnValue('mock-order');
      (FirestoreMethods.limit as jest.Mock).mockReturnValue('mock-limit');
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue({
        docs: [mockDoc],
        size: 1
      });

      const result = await pdfStorageService.listAllUserPdfs();

      expect(result.pdfs).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);

      // Verify Firestore method calls
      expect(FirestoreMethods.orderBy).toHaveBeenCalledWith('uploadedAt', 'desc');
      expect(FirestoreMethods.limit).toHaveBeenCalledWith(50);
    });

    it('should apply date filtering', async () => {
      // Mock admin access
      (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(true);

      const testDate = new Date('2024-01-15T00:00:00.000Z');
      const options = { filterByDate: testDate };

      // Mock Firestore methods
      (FirestoreMethods.getFirestore as jest.Mock).mockReturnValue({});
      (FirestoreMethods.collection as jest.Mock).mockReturnValue('mock-collection');
      (FirestoreMethods.query as jest.Mock).mockReturnValue('mock-query');
      (FirestoreMethods.where as jest.Mock)
        .mockReturnValueOnce('mock-where-start')
        .mockReturnValueOnce('mock-where-end');
      (FirestoreMethods.orderBy as jest.Mock).mockReturnValue('mock-order');
      (FirestoreMethods.limit as jest.Mock).mockReturnValue('mock-limit');
      (FirestoreMethods.getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        size: 0
      });

      await pdfStorageService.listAllUserPdfs(options);

      // Verify date filtering was applied
      expect(FirestoreMethods.where).toHaveBeenCalledWith('uploadedAt', '>=', expect.any(Object));
      expect(FirestoreMethods.where).toHaveBeenCalledWith('uploadedAt', '<=', expect.any(Object));
    });
  });

  describe('getUserDetailsForPdfs', () => {
    it('should handle PDFs with no user ID', async () => {
      // Mock admin access
      (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(true);

      // Mock Firestore doc without user ID
      const mockDoc = {
        exists: () => true,
        data: () => ({}) // No userId
      };

      (FirestoreMethods.getFirestore as jest.Mock).mockReturnValue({});
      (FirestoreMethods.getDoc as jest.Mock).mockResolvedValue(mockDoc);

      // Mock role access service to return no details
      (roleAccessService.getUserDetailsMap as jest.Mock).mockResolvedValue({});

      const result = await pdfStorageService.getUserDetailsForPdfs(['pdf1']);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return user details for PDFs with user IDs', async () => {
      // Mock admin access
      (roleAccessService.hasAdminAccess as jest.Mock).mockResolvedValue(true);

      // Mock Firestore docs with user IDs
      const mockDocs = [
        {
          exists: () => true,
          data: () => ({ userId: 'user1' })
        },
        {
          exists: () => true,
          data: () => ({ userId: 'user2' })
        }
      ];

      (FirestoreMethods.getFirestore as jest.Mock).mockReturnValue({});
      (FirestoreMethods.getDoc as jest.Mock).mockResolvedValue(mockDocs[0]);

      // Mock role access service to return user details
      const mockUserDetails = {
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
      };

      (roleAccessService.getUserDetailsMap as jest.Mock).mockResolvedValue(mockUserDetails);

      const result = await pdfStorageService.getUserDetailsForPdfs(['pdf1', 'pdf2']);

      expect(result).toEqual(mockUserDetails);
    });
  });
}); 