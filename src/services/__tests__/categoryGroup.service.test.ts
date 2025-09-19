/* eslint-disable @typescript-eslint/no-explicit-any */
import { CategoryGroupService } from '../categoryGroup.service';
import { CategoryGroup, CategoryGroupFormData } from '../../types/categoryGroup';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('../firebase.service');
jest.mock('../firebase.config', () => ({ db: {} }));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  orderBy: jest.fn(() => ({ _type: 'orderBy' })),
  where: jest.fn(() => ({ _type: 'where' })),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('CategoryGroupService', () => {
  let service: CategoryGroupService;
  let mockFirebaseService: any;

  const mockCategoryGroup: CategoryGroup = {
    id: 'group-1',
    name: 'Electronics',
    description: 'Electronic products',
    color: '#FF5722',
    currentInventory: 100,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 10,
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
  };


  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryGroupService();
    
    // Mock the parent FirebaseService methods
    mockFirebaseService = {
      getDocuments: jest.fn(),
      getDocument: jest.fn(),
      addDocument: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
    };

    // Override FirebaseService methods
    (service as any).getDocuments = mockFirebaseService.getDocuments;
    (service as any).getDocument = mockFirebaseService.getDocument;
    (service as any).addDocument = mockFirebaseService.addDocument;
    (service as any).updateDocument = mockFirebaseService.updateDocument;
    (service as any).deleteDocument = mockFirebaseService.deleteDocument;
  });

  describe('getCategoryGroups', () => {
    it('should fetch all category groups ordered by name', async () => {
      const mockGroups = [mockCategoryGroup];
      mockFirebaseService.getDocuments.mockResolvedValue(mockGroups);

      const result = await service.getCategoryGroups();

      expect(result).toEqual(mockGroups);
      expect(mockFirebaseService.getDocuments).toHaveBeenCalledWith(
        'categoryGroups',
        [expect.any(Object)] // orderBy('name', 'asc')
      );
    });

    it('should handle empty results', async () => {
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      const result = await service.getCategoryGroups();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firestore error');
      mockFirebaseService.getDocuments.mockRejectedValue(error);

      await expect(service.getCategoryGroups()).rejects.toThrow('Firestore error');
    });
  });

  describe('getCategoryGroup', () => {
    it('should fetch a specific category group by ID', async () => {
      mockFirebaseService.getDocument.mockResolvedValue(mockCategoryGroup);

      const result = await service.getCategoryGroup('group-1');

      expect(result).toEqual(mockCategoryGroup);
      expect(mockFirebaseService.getDocument).toHaveBeenCalledWith('categoryGroups', 'group-1');
    });

    it('should return null for non-existent group', async () => {
      mockFirebaseService.getDocument.mockResolvedValue(null);

      const result = await service.getCategoryGroup('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      const error = new Error('Not found');
      mockFirebaseService.getDocument.mockRejectedValue(error);

      await expect(service.getCategoryGroup('group-1')).rejects.toThrow('Not found');
    });
  });

  describe('createCategoryGroup', () => {
    const validFormData: CategoryGroupFormData = {
      name: 'New Group',
      description: 'New group description',
      color: '#2196F3',
      currentInventory: 50,
      inventoryUnit: 'kg',
      inventoryType: 'weight',
      minimumThreshold: 5,
    };

    it('should create a new category group with valid data', async () => {
      const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 } as Timestamp;
      (Timestamp.now as jest.Mock).mockReturnValue(mockTimestamp);
      mockFirebaseService.addDocument.mockResolvedValue({ id: 'new-group-id' });
      mockFirebaseService.getDocuments.mockResolvedValue([]); // No existing groups

      const result = await service.createCategoryGroup(validFormData);

      expect(result).toBe('new-group-id');
      expect(mockFirebaseService.addDocument).toHaveBeenCalledWith(
        'categoryGroups',
        {
          name: validFormData.name.trim(),
          description: validFormData.description.trim(),
          color: validFormData.color,
          currentInventory: 50, // Should match the input data
          inventoryUnit: 'kg', // Should match the input data
          inventoryType: 'weight', // Should match the input data
          minimumThreshold: 5, // Should match the input data
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }
      );
    });

    it('should validate required fields', async () => {
      const invalidData = { 
        name: '', 
        description: '', 
        color: '',
        currentInventory: 0,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 0
      } as CategoryGroupFormData;
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(invalidData)).rejects.toThrow('Validation failed');
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      mockFirebaseService.addDocument.mockRejectedValue(error);

      await expect(service.createCategoryGroup(validFormData)).rejects.toThrow('Creation failed');
    });
  });

  describe('updateCategoryGroup', () => {
    const updateData: Partial<CategoryGroupFormData> = {
      name: 'Updated Group',
      description: 'Updated description',
    };

    it('should update an existing category group', async () => {
      const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 } as Timestamp;
      (Timestamp.now as jest.Mock).mockReturnValue(mockTimestamp);
      mockFirebaseService.updateDocument.mockResolvedValue(undefined);
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await service.updateCategoryGroup('group-1', updateData);

      expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
        'categoryGroups',
        'group-1',
        {
          name: updateData.name!.trim(),
          description: updateData.description!.trim(),
          updatedAt: mockTimestamp,
        }
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      mockFirebaseService.updateDocument.mockRejectedValue(error);

      await expect(service.updateCategoryGroup('group-1', updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteCategoryGroup', () => {
    it('should delete a category group when no categories are assigned', async () => {
      // Mock isCategoryGroupInUse to return false
      jest.spyOn(service, 'isCategoryGroupInUse').mockResolvedValue(false);
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      await service.deleteCategoryGroup('group-1');

      expect(service.isCategoryGroupInUse).toHaveBeenCalledWith('group-1');
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('categoryGroups', 'group-1');
    });

    it('should throw error when trying to delete group with assigned categories', async () => {
      // Mock isCategoryGroupInUse to return true
      jest.spyOn(service, 'isCategoryGroupInUse').mockResolvedValue(true);

      await expect(service.deleteCategoryGroup('group-1')).rejects.toThrow(
        'Cannot delete category group: it is currently assigned to categories'
      );

      expect(mockFirebaseService.deleteDocument).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      jest.spyOn(service, 'isCategoryGroupInUse').mockResolvedValue(false);
      const error = new Error('Deletion failed');
      mockFirebaseService.deleteDocument.mockRejectedValue(error);

      await expect(service.deleteCategoryGroup('group-1')).rejects.toThrow('Deletion failed');
    });
  });

  describe('getCategoriesByGroup', () => {
    it('should fetch categories for a specific group', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Electronics' }];
      mockFirebaseService.getDocuments.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByGroup('group-1');

      expect(result).toEqual(mockCategories);
      expect(mockFirebaseService.getDocuments).toHaveBeenCalledWith(
        'categories',
        [expect.any(Object), expect.any(Object)] // where('categoryGroupId', '==', 'group-1') + orderBy('name', 'asc')
      );
    });

    it('should return empty array when no categories in group', async () => {
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      const result = await service.getCategoriesByGroup('group-1');

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryGroupsWithStats', () => {
    it('should return groups with category counts', async () => {
      const mockGroups = [mockCategoryGroup];
      
      jest.spyOn(service, 'getCategoryGroups').mockResolvedValue(mockGroups);
      jest.spyOn(service, 'getCategoryCountForGroup').mockResolvedValue(1);

      const result = await service.getCategoryGroupsWithStats();

      expect(result).toEqual([
        {
          ...mockCategoryGroup,
          categoryCount: 1,
        },
      ]);
    });

    it('should handle groups with no categories', async () => {
      const mockGroups = [mockCategoryGroup];
      
      jest.spyOn(service, 'getCategoryGroups').mockResolvedValue(mockGroups);
      jest.spyOn(service, 'getCategoryCountForGroup').mockResolvedValue(0);

      const result = await service.getCategoryGroupsWithStats();

      expect(result).toEqual([
        {
          ...mockCategoryGroup,
          categoryCount: 0,
        },
      ]);
    });
  });

  describe('validation via createCategoryGroup', () => {
    it('should validate valid data successfully via createCategoryGroup', async () => {
      const validData: CategoryGroupFormData = {
        name: 'Valid Group',
        description: 'Valid description',
        color: '#2196F3',
        currentInventory: 50,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 5,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      mockFirebaseService.addDocument.mockResolvedValue({ id: 'test-id' });

      await expect(service.createCategoryGroup(validData)).resolves.toBe('test-id');
    });

    it('should return errors for missing required fields via createCategoryGroup', async () => {
      const invalidData: CategoryGroupFormData = {
        name: '',
        description: '',
        color: '',
        currentInventory: 0,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 0,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(invalidData)).rejects.toThrow('Validation failed: Name is required, Color is required');
    });

    it('should validate color format via createCategoryGroup', async () => {
      const invalidData: CategoryGroupFormData = {
        name: 'Test',
        description: 'Test description',
        color: 'invalid-color',
        currentInventory: 10,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 2,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(invalidData)).rejects.toThrow('Color must be a valid hex color');
    });

    it('should validate name length limits via createCategoryGroup', async () => {
      const longName = 'a'.repeat(101); // Max length is 100
      const invalidData: CategoryGroupFormData = {
        name: longName,
        description: 'Test description',
        color: '#2196F3',
        currentInventory: 10,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 2,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(invalidData)).rejects.toThrow('Name must be 100 characters or less');
    });

    it('should validate description length limits via createCategoryGroup', async () => {
      const longDescription = 'a'.repeat(501); // Max length is 500
      const invalidData: CategoryGroupFormData = {
        name: 'Test',
        description: longDescription,
        color: '#2196F3',
        currentInventory: 10,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 2,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(invalidData)).rejects.toThrow('Description must be 500 characters or less');
    });

    it('should prevent duplicate names', async () => {
      const existingGroup = { ...mockCategoryGroup, name: 'Existing Group' };
      const duplicateData: CategoryGroupFormData = {
        name: 'existing group', // Case insensitive check
        description: 'Test description',
        color: '#2196F3',
        currentInventory: 10,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 2,
      };
      
      mockFirebaseService.getDocuments.mockResolvedValue([existingGroup]);

      await expect(service.createCategoryGroup(duplicateData)).rejects.toThrow('A category group with this name already exists');
    });
  });

  describe('hex color validation via createCategoryGroup', () => {
    it('should accept correct hex colors', async () => {
      const testData = (color: string) => ({
        name: 'Test Group',
        description: 'Test description',
        color,
        currentInventory: 10,
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: 2,
      });
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);
      mockFirebaseService.addDocument.mockResolvedValue({ id: 'test-id' });

      await expect(service.createCategoryGroup(testData('#FF5722'))).resolves.toBe('test-id');
      await expect(service.createCategoryGroup(testData('#fff'))).resolves.toBe('test-id');
      await expect(service.createCategoryGroup(testData('#000000'))).resolves.toBe('test-id');
    });

    it('should reject invalid hex colors', async () => {
      const testData = (color: string) => ({
        name: 'Test Group',
        description: 'Test description',
        color,
        currentInventory: 10,
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: 2,
      });
      
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      await expect(service.createCategoryGroup(testData('FF5722'))).rejects.toThrow('Color must be a valid hex color'); // Missing #
      await expect(service.createCategoryGroup(testData('#GG5722'))).rejects.toThrow('Color must be a valid hex color'); // Invalid characters
      await expect(service.createCategoryGroup(testData('#FF57'))).rejects.toThrow('Color must be a valid hex color'); // Wrong length
      await expect(service.createCategoryGroup(testData('blue'))).rejects.toThrow('Color must be a valid hex color'); // Color name
    });
  });

  describe('getInventoryHistory', () => {
    const mockInventoryMovements = [
      {
        id: 'movement-1',
        categoryGroupId: 'group-1',
        movementType: 'addition' as const,
        quantity: 100,
        unit: 'pcs' as const,
        previousInventory: 0,
        newInventory: 100,
        reason: 'Initial stock',
        createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
        updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
      },
      {
        id: 'movement-2',
        categoryGroupId: 'group-1',
        movementType: 'deduction' as const,
        quantity: 25,
        unit: 'pcs' as const,
        previousInventory: 100,
        newInventory: 75,
        transactionReference: 'tx-123',
        orderReference: 'order-456',
        platform: 'amazon' as const,
        createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
        updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
      }
    ];

    it('should fetch inventory history for a category group with default limit', async () => {
      mockFirebaseService.getDocuments.mockResolvedValue(mockInventoryMovements);

      const result = await service.getInventoryHistory('group-1');

      expect(result).toEqual(mockInventoryMovements);
      expect(mockFirebaseService.getDocuments).toHaveBeenCalledWith(
        'inventoryMovements',
        [
          expect.objectContaining({
            _type: 'where'
          }),
          expect.objectContaining({
            _type: 'orderBy'
          })
        ]
      );
    });

    it('should fetch inventory history with custom limit', async () => {
      mockFirebaseService.getDocuments.mockResolvedValue(mockInventoryMovements);

      const result = await service.getInventoryHistory('group-1', 1);

      expect(result).toEqual(mockInventoryMovements.slice(0, 1));
      expect(result).toHaveLength(1);
      expect(mockFirebaseService.getDocuments).toHaveBeenCalledWith(
        'inventoryMovements',
        [
          expect.objectContaining({
            _type: 'where'
          }),
          expect.objectContaining({
            _type: 'orderBy'
          })
        ]
      );
    });

    it('should return empty array when no movements exist', async () => {
      mockFirebaseService.getDocuments.mockResolvedValue([]);

      const result = await service.getInventoryHistory('group-1');

      expect(result).toEqual([]);
      expect(mockFirebaseService.getDocuments).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firestore error');
      mockFirebaseService.getDocuments.mockRejectedValue(error);

      await expect(service.getInventoryHistory('group-1')).rejects.toThrow(
        'Failed to retrieve inventory history: Firestore error'
      );
    });

    it('should handle unknown errors', async () => {
      mockFirebaseService.getDocuments.mockRejectedValue('unknown error');

      await expect(service.getInventoryHistory('group-1')).rejects.toThrow(
        'Failed to retrieve inventory history: Unknown error'
      );
    });
  });
});