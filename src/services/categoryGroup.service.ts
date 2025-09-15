import { Timestamp, orderBy, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { 
  CategoryGroup, 
  CategoryGroupWithStats, 
  CategoryGroupFormData,
  CategoryGroupValidationResult,
  CATEGORY_GROUP_COLORS 
} from '../types/categoryGroup';

export class CategoryGroupService extends FirebaseService {
  private readonly COLLECTION_NAME = 'categoryGroups';
  private readonly CATEGORIES_COLLECTION = 'categories';

  async getCategoryGroups(): Promise<CategoryGroup[]> {
    return this.getDocuments<CategoryGroup>(
      this.COLLECTION_NAME,
      [orderBy('name', 'asc')]
    );
  }

  async getCategoryGroupsWithStats(): Promise<CategoryGroupWithStats[]> {
    const groups = await this.getCategoryGroups();
    const groupsWithStats: CategoryGroupWithStats[] = [];

    for (const group of groups) {
      const categoryCount = await this.getCategoryCountForGroup(group.id!);
      groupsWithStats.push({
        ...group,
        categoryCount
      });
    }

    return groupsWithStats;
  }

  async getCategoryGroup(id: string): Promise<CategoryGroup | undefined> {
    return this.getDocument<CategoryGroup>(this.COLLECTION_NAME, id);
  }

  async createCategoryGroup(groupData: CategoryGroupFormData): Promise<string> {
    // Validate the data
    const validation = this.validateCategoryGroup(groupData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
    }

    // Check for duplicate names
    const existingGroups = await this.getCategoryGroups();
    const duplicateName = existingGroups.find(
      group => group.name.toLowerCase() === groupData.name.toLowerCase()
    );
    
    if (duplicateName) {
      throw new Error('A category group with this name already exists');
    }

    // Create the group
    const sanitizedGroup: Omit<CategoryGroup, 'id'> = {
      name: groupData.name.trim(),
      description: groupData.description.trim(),
      color: groupData.color,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await this.addDocument(this.COLLECTION_NAME, sanitizedGroup);
    return docRef.id;
  }

  async updateCategoryGroup(id: string, groupData: Partial<CategoryGroupFormData>): Promise<void> {
    // Validate the data if provided
    if (Object.keys(groupData).length > 0) {
      const validation = this.validateCategoryGroup(groupData as CategoryGroupFormData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
    }

    // Check for duplicate names (excluding current group)
    if (groupData.name) {
      const existingGroups = await this.getCategoryGroups();
      const duplicateName = existingGroups.find(
        group => group.id !== id && group.name.toLowerCase() === groupData.name!.toLowerCase()
      );
      
      if (duplicateName) {
        throw new Error('A category group with this name already exists');
      }
    }

    // Prepare update data
    const sanitizedUpdates: Partial<CategoryGroup> & { updatedAt: Timestamp } = {
      updatedAt: Timestamp.now(),
    };

    if (groupData.name !== undefined) {
      sanitizedUpdates.name = groupData.name.trim();
    }
    if (groupData.description !== undefined) {
      sanitizedUpdates.description = groupData.description.trim();
    }
    if (groupData.color !== undefined) {
      sanitizedUpdates.color = groupData.color;
    }

    await this.updateDocument(this.COLLECTION_NAME, id, sanitizedUpdates);
  }

  async deleteCategoryGroup(id: string): Promise<void> {
    // Check if group is in use by categories
    const isInUse = await this.isCategoryGroupInUse(id);
    if (isInUse) {
      throw new Error('Cannot delete category group: it is currently assigned to categories');
    }

    await this.deleteDocument(this.COLLECTION_NAME, id);
  }

  async isCategoryGroupInUse(groupId: string): Promise<boolean> {
    const categories = await this.getDocuments<{ id: string }>(
      this.CATEGORIES_COLLECTION,
      [where('categoryGroupId', '==', groupId)]
    );
    return categories.length > 0;
  }

  async getCategoryCountForGroup(groupId: string): Promise<number> {
    const categories = await this.getDocuments<{ id: string }>(
      this.CATEGORIES_COLLECTION,
      [where('categoryGroupId', '==', groupId)]
    );
    return categories.length;
  }

  async assignCategoryToGroup(categoryId: string, groupId: string): Promise<void> {
    // Verify the group exists
    const group = await this.getCategoryGroup(groupId);
    if (!group) {
      throw new Error('Category group not found');
    }

    // Update the category
    await this.updateDocument(this.CATEGORIES_COLLECTION, categoryId, {
      categoryGroupId: groupId,
      updatedAt: Timestamp.now()
    });
  }

  async removeCategoryFromGroup(categoryId: string): Promise<void> {
    await this.updateDocument(this.CATEGORIES_COLLECTION, categoryId, {
      categoryGroupId: null,
      updatedAt: Timestamp.now()
    });
  }

  async assignMultipleCategoriesToGroup(categoryIds: string[], groupId: string): Promise<void> {
    // Verify the group exists
    const group = await this.getCategoryGroup(groupId);
    if (!group) {
      throw new Error('Category group not found');
    }

    // Update all categories in parallel
    const updatePromises = categoryIds.map(categoryId =>
      this.updateDocument(this.CATEGORIES_COLLECTION, categoryId, {
        categoryGroupId: groupId,
        updatedAt: Timestamp.now()
      })
    );

    await Promise.all(updatePromises);
  }

  private validateCategoryGroup(
    groupData: Partial<CategoryGroupFormData>
  ): CategoryGroupValidationResult {
    const errors: CategoryGroupValidationResult['errors'] = {};

    // Validate name
    if (groupData.name !== undefined) {
      if (!groupData.name || groupData.name.trim().length === 0) {
        errors.name = 'Name is required';
      } else if (groupData.name.trim().length > 100) {
        errors.name = 'Name must be 100 characters or less';
      }
    }

    // Validate description
    if (groupData.description !== undefined) {
      if (groupData.description.length > 500) {
        errors.description = 'Description must be 500 characters or less';
      }
    }

    // Validate color
    if (groupData.color !== undefined) {
      if (!groupData.color) {
        errors.color = 'Color is required';
      } else if (!this.isValidHexColor(groupData.color)) {
        errors.color = 'Color must be a valid hex color';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color) || CATEGORY_GROUP_COLORS.includes(color as typeof CATEGORY_GROUP_COLORS[number]);
  }

  async getCategoriesByGroup(groupId: string): Promise<Array<{id: string; name: string}>> {
    const categories = await this.getDocuments<{id: string; name: string}>(
      this.CATEGORIES_COLLECTION,
      [
        where('categoryGroupId', '==', groupId),
        orderBy('name', 'asc')
      ]
    );
    return categories;
  }

  async getUnassignedCategories(): Promise<Array<{id: string; name: string}>> {
    // Get categories without a group assignment
    const categories = await this.getDocuments<{id: string; name: string; categoryGroupId?: string}>(
      this.CATEGORIES_COLLECTION,
      [orderBy('name', 'asc')]
    );
    
    return categories.filter(cat => !cat.categoryGroupId);
  }
}