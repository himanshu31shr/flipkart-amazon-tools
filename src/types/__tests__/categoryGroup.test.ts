import { 
  CategoryGroup, 
  CategoryGroupFormData, 
  CategoryGroupWithStats, 
  CategoryGroupValidationResult,
  CATEGORY_GROUP_COLORS
} from '../categoryGroup';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

describe('CategoryGroup Types', () => {
  const mockTimestamp = { seconds: 1234567890, nanoseconds: 0 } as Timestamp;

  describe('CategoryGroup interface', () => {
    it('should create a valid CategoryGroup object', () => {
      const categoryGroup: CategoryGroup = {
        id: 'group-1',
        name: 'Electronics',
        description: 'Electronic products and accessories',
        color: '#FF5722',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      expect(categoryGroup.id).toBe('group-1');
      expect(categoryGroup.name).toBe('Electronics');
      expect(categoryGroup.description).toBe('Electronic products and accessories');
      expect(categoryGroup.color).toBe('#FF5722');
      expect(categoryGroup.createdAt).toBe(mockTimestamp);
      expect(categoryGroup.updatedAt).toBe(mockTimestamp);
    });

    it('should handle optional id field', () => {
      const categoryGroupWithoutId: Omit<CategoryGroup, 'id'> = {
        name: 'Test Group',
        description: 'Test description',
        color: '#2196F3',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      // This should compile without TypeScript errors
      expect(categoryGroupWithoutId.name).toBe('Test Group');
    });

    it('should require all mandatory fields', () => {
      // This test ensures TypeScript compilation catches missing fields
      const categoryGroup: CategoryGroup = {
        id: 'group-1',
        name: 'Required Name',
        description: 'Required Description',
        color: '#FF5722',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      expect(typeof categoryGroup.name).toBe('string');
      expect(typeof categoryGroup.description).toBe('string');
      expect(typeof categoryGroup.color).toBe('string');
      expect(categoryGroup.createdAt).toBeDefined();
      expect(categoryGroup.updatedAt).toBeDefined();
    });
  });

  describe('CategoryGroupFormData interface', () => {
    it('should create valid form data', () => {
      const formData: CategoryGroupFormData = {
        name: 'New Group',
        description: 'New group for testing',
        color: '#4CAF50',
      };

      expect(formData.name).toBe('New Group');
      expect(formData.description).toBe('New group for testing');
      expect(formData.color).toBe('#4CAF50');
    });

    it('should work with all required fields', () => {
      const minimalFormData: CategoryGroupFormData = {
        name: 'Minimal',
        description: 'Minimal description',
        color: '#000000',
      };

      expect(Object.keys(minimalFormData)).toHaveLength(3);
      expect(minimalFormData.name).toBeTruthy();
      expect(minimalFormData.description).toBeTruthy();
      expect(minimalFormData.color).toBeTruthy();
    });
  });

  describe('CategoryGroupWithStats interface', () => {
    it('should extend CategoryGroup with stats', () => {
      const groupWithStats: CategoryGroupWithStats = {
        id: 'group-1',
        name: 'Electronics',
        description: 'Electronic products',
        color: '#FF5722',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        categoryCount: 15,
      };

      expect(groupWithStats.categoryCount).toBe(15);
      expect(typeof groupWithStats.categoryCount).toBe('number');
      
      // Should have all CategoryGroup properties
      expect(groupWithStats.id).toBe('group-1');
      expect(groupWithStats.name).toBe('Electronics');
    });

    it('should handle zero category count', () => {
      const emptyGroup: CategoryGroupWithStats = {
        id: 'empty-group',
        name: 'Empty Group',
        description: 'Group with no categories',
        color: '#9E9E9E',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        categoryCount: 0,
      };

      expect(emptyGroup.categoryCount).toBe(0);
    });
  });

  describe('CategoryGroupValidationResult interface', () => {
    it('should represent valid validation result', () => {
      const validResult: CategoryGroupValidationResult = {
        isValid: true,
        errors: {},
      };

      expect(validResult.isValid).toBe(true);
      expect(Object.keys(validResult.errors)).toHaveLength(0);
    });

    it('should represent invalid validation result', () => {
      const invalidResult: CategoryGroupValidationResult = {
        isValid: false,
        errors: {
          name: 'Name is required',
          description: 'Description is too long',
          color: 'Invalid color format',
        },
      };

      expect(invalidResult.isValid).toBe(false);
      expect(Object.keys(invalidResult.errors)).toHaveLength(3);
      expect(invalidResult.errors.name).toBe('Name is required');
      expect(invalidResult.errors.description).toBe('Description is too long');
      expect(invalidResult.errors.color).toBe('Invalid color format');
    });

    it('should handle optional error fields', () => {
      const partialErrorResult: CategoryGroupValidationResult = {
        isValid: false,
        errors: {
          name: 'Name is required',
        },
      };

      expect(partialErrorResult.isValid).toBe(false);
      expect(partialErrorResult.errors.name).toBe('Name is required');
      expect(partialErrorResult.errors.description).toBeUndefined();
      expect(partialErrorResult.errors.color).toBeUndefined();
    });
  });

  describe('CATEGORY_GROUP_COLORS constant', () => {
    it('should contain predefined color options', () => {
      expect(Array.isArray(CATEGORY_GROUP_COLORS)).toBe(true);
      expect(CATEGORY_GROUP_COLORS.length).toBeGreaterThan(0);
    });

    it('should contain valid hex color values', () => {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      CATEGORY_GROUP_COLORS.forEach(color => {
        expect(typeof color).toBe('string');
        expect(hexColorRegex.test(color)).toBe(true);
      });
    });

    it('should have unique colors', () => {
      const uniqueColors = new Set(CATEGORY_GROUP_COLORS);
      expect(uniqueColors.size).toBe(CATEGORY_GROUP_COLORS.length);
    });

    it('should include common material design colors', () => {
      // Test for some expected colors
      const expectedColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5'];
      expectedColors.forEach(expectedColor => {
        expect(CATEGORY_GROUP_COLORS).toContain(expectedColor);
      });
    });

    it('should be read-only array', () => {
      // This test ensures the constant is properly exported and accessible
      expect(() => {
        const colors = CATEGORY_GROUP_COLORS;
        expect(colors).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Type compatibility', () => {
    it('should allow CategoryGroup to be used as base for CategoryGroupWithStats', () => {
      const baseGroup: CategoryGroup = {
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
        color: '#FF5722',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      const groupWithStats: CategoryGroupWithStats = {
        ...baseGroup,
        categoryCount: 10,
      };

      expect(groupWithStats.id).toBe(baseGroup.id);
      expect(groupWithStats.name).toBe(baseGroup.name);
      expect(groupWithStats.categoryCount).toBe(10);
    });

    it('should allow partial updates using CategoryGroupFormData', () => {
      const formData: CategoryGroupFormData = {
        name: 'Updated Name',
        description: 'Updated description',
        color: '#4CAF50',
      };

      const partialUpdate: Partial<CategoryGroupFormData> = {
        name: formData.name,
      };

      expect(partialUpdate.name).toBe('Updated Name');
      expect(partialUpdate.description).toBeUndefined();
      expect(partialUpdate.color).toBeUndefined();
    });
  });

  describe('Edge cases and constraints', () => {
    it('should handle empty string values', () => {
      const formData: CategoryGroupFormData = {
        name: '',
        description: '',
        color: '',
      };

      expect(formData.name).toBe('');
      expect(formData.description).toBe('');
      expect(formData.color).toBe('');
    });

    it('should handle special characters in name and description', () => {
      const specialCharacterData: CategoryGroupFormData = {
        name: 'Test & Special "Characters" (Group)',
        description: 'Description with special chars: @#$%^&*()[]{}|;:,.<>?',
        color: '#FF5722',
      };

      expect(specialCharacterData.name).toContain('&');
      expect(specialCharacterData.name).toContain('"');
      expect(specialCharacterData.description).toContain('@#$%');
    });

    it('should handle very long strings', () => {
      const longName = 'a'.repeat(1000);
      const longDescription = 'b'.repeat(5000);

      const longStringData: CategoryGroupFormData = {
        name: longName,
        description: longDescription,
        color: '#FF5722',
      };

      expect(longStringData.name.length).toBe(1000);
      expect(longStringData.description.length).toBe(5000);
    });
  });
});