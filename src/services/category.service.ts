import { Timestamp, orderBy, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface Category {
  id?: string;
  name: string;
  description?: string;
  tag?: string;
  categoryGroupId?: string;
  costPrice?: number; // Cost price for the category (used for inheritance)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export class CategoryService extends FirebaseService {
  private readonly COLLECTION_NAME = 'categories';

  async getCategories(): Promise<Category[]> {
    return this.getDocuments<Category>(
      this.COLLECTION_NAME,
      [orderBy('name', 'asc')]
    );
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.getDocument<Category>(this.COLLECTION_NAME, id);
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<string> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedCategory = {
      name: category.name,
      description: category.description || '',
      tag: category.tag || '',
      categoryGroupId: category.categoryGroupId || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await this.addDocument(this.COLLECTION_NAME, sanitizedCategory);
    return docRef.id;
  }

  async updateCategory(id: string, category: Partial<Omit<Category, 'id'>>): Promise<void> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedUpdates: Partial<Category> & { updatedAt: Timestamp } = {
      updatedAt: Timestamp.now(),
    };
    
    if (category.name !== undefined) {
      sanitizedUpdates.name = category.name;
    }
    if (category.description !== undefined) {
      sanitizedUpdates.description = category.description || '';
    }
    if (category.tag !== undefined) {
      sanitizedUpdates.tag = category.tag || '';
    }
    if (category.categoryGroupId !== undefined) {
      sanitizedUpdates.categoryGroupId = category.categoryGroupId || undefined;
    }
    
    await this.updateDocument(this.COLLECTION_NAME, id, sanitizedUpdates);
  }

  async deleteCategory(id: string): Promise<void> {
    // TODO: Check if category is in use before deleting
    await this.deleteDocument(this.COLLECTION_NAME, id);
  }

  async isCategoryInUse(categoryId: string): Promise<boolean> {
    const products = await this.getDocuments<{ id: string }>(
      'products',
      [
        where('categoryId', '==', categoryId),
        orderBy('id', 'asc')
      ]
    );
    return products.length > 0;
  }

  // Group-related methods
  async getCategoriesWithGroups(): Promise<Array<Category & { categoryGroup?: { id: string; name: string; color: string } }>> {
    const categories = await this.getCategories();
    const categoriesWithGroups = [];

    for (const category of categories) {
      if (category.categoryGroupId) {
        try {
          const group = await this.getDocument<{ id: string; name: string; color: string }>('categoryGroups', category.categoryGroupId);
          categoriesWithGroups.push({
            ...category,
            categoryGroup: group
          });
        } catch {
          // If group doesn't exist, just add category without group
          categoriesWithGroups.push(category);
        }
      } else {
        categoriesWithGroups.push(category);
      }
    }

    return categoriesWithGroups;
  }

  async assignCategoryToGroup(categoryId: string, groupId: string | null): Promise<void> {
    await this.updateCategory(categoryId, { categoryGroupId: groupId || undefined });
  }

  async getCategoriesByGroup(groupId: string): Promise<Category[]> {
    return this.getDocuments<Category>(
      this.COLLECTION_NAME,
      [
        where('categoryGroupId', '==', groupId),
        orderBy('name', 'asc')
      ]
    );
  }

  async getUnassignedCategories(): Promise<Category[]> {
    // Get categories without a group assignment
    const allCategories = await this.getCategories();
    return allCategories.filter(category => !category.categoryGroupId);
  }

  async assignMultipleCategoriesToGroup(categoryIds: string[], groupId: string | null): Promise<void> {
    const updatePromises = categoryIds.map(categoryId =>
      this.updateCategory(categoryId, { categoryGroupId: groupId || undefined })
    );
    await Promise.all(updatePromises);
  }
}
