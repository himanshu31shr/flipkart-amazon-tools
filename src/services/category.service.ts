import { Timestamp, orderBy, where } from "firebase/firestore";
import { FirebaseService } from "./firebase.service";
import { Category, CategoryLink } from "../types/category";
import { inventoryDeductionValidator } from "../utils/inventoryDeductionValidation";
import { circularDependencyValidator } from "../utils/circularDependencyValidator";
import { ValidationResult } from "../types/categoryExportImport.types";

// Re-export Category interface for backward compatibility
export type { Category };

export class CategoryService extends FirebaseService {
  private readonly COLLECTION_NAME = "categories";

  async getCategories(): Promise<Category[]> {
    const categories = await this.getDocuments<Category>(this.COLLECTION_NAME, [
      orderBy("name", "asc"),
    ]);

    // Handle case where getDocuments returns undefined (e.g., in tests or emulator issues)
    if (!categories || !Array.isArray(categories)) {
      return [];
    }

    return categories;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.getDocument<Category>(this.COLLECTION_NAME, id);
  }

  async createCategory(category: Omit<Category, "id">): Promise<string> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedCategory = {
      name: category.name,
      description: category.description || "",
      tag: category.tag || "",
      categoryGroupId: category.categoryGroupId || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await this.addDocument(
      this.COLLECTION_NAME,
      sanitizedCategory
    );
    return docRef.id;
  }

  async updateCategory(
    id: string,
    category: Partial<Omit<Category, "id">>
  ): Promise<void> {
    // Sanitize the data to ensure Firestore compatibility
    const sanitizedUpdates: Partial<Category> & { updatedAt: Timestamp } = {
      updatedAt: Timestamp.now(),
    };

    if (category.name !== undefined) {
      sanitizedUpdates.name = category.name;
    }
    if (category.description !== undefined) {
      sanitizedUpdates.description = category.description || "";
    }
    if (category.tag !== undefined) {
      sanitizedUpdates.tag = category.tag || "";
    }
    if (category.categoryGroupId !== undefined) {
      sanitizedUpdates.categoryGroupId = category.categoryGroupId || undefined;
    }
    if (category.inventoryType !== undefined) {
      sanitizedUpdates.inventoryType = category.inventoryType;
    }
    if (category.inventoryUnit !== undefined) {
      sanitizedUpdates.inventoryUnit = category.inventoryUnit;
    }
    if (category.unitConversionRate !== undefined) {
      sanitizedUpdates.unitConversionRate = category.unitConversionRate;
    }
    if (category.inventoryDeductionQuantity !== undefined) {
      sanitizedUpdates.inventoryDeductionQuantity =
        category.inventoryDeductionQuantity;
    }
    if (category.linkedCategories !== undefined) {
      sanitizedUpdates.linkedCategories = category.linkedCategories;
    }

    await this.updateDocument(this.COLLECTION_NAME, id, sanitizedUpdates);
  }

  async deleteCategory(id: string): Promise<void> {
    // TODO: Check if category is in use before deleting
    await this.deleteDocument(this.COLLECTION_NAME, id);
  }

  async isCategoryInUse(categoryId: string): Promise<boolean> {
    const products = await this.getDocuments<{ id: string }>("products", [
      where("categoryId", "==", categoryId),
      orderBy("id", "asc"),
    ]);
    return products.length > 0;
  }

  // Group-related methods
  async getCategoriesWithGroups(): Promise<
    Array<
      Category & { categoryGroup?: { id: string; name: string; color: string } }
    >
  > {
    const categories = await this.getCategories();
    const categoriesWithGroups = [];
    const categoryGroups = await this.getDocuments("categoryGroups", [
      orderBy("name", "asc"),
    ]); // Pre-fetch groups to reduce calls

    for (const category of categories) {
      if (category.categoryGroupId) {
        const group = categoryGroups.find(
          (g) => g.id === category.categoryGroupId
        );
        if (group) {
          categoriesWithGroups.push({
            ...category,
            categoryGroup: group,
          });
        } else {
          categoriesWithGroups.push(category);
        }
      } else {
        categoriesWithGroups.push(category);
      }
    }
    return categoriesWithGroups;
  }

  async assignCategoryToGroup(
    categoryId: string,
    groupId: string | null
  ): Promise<void> {
    await this.updateCategory(categoryId, {
      categoryGroupId: groupId || undefined,
    });
  }

  async getCategoriesByGroup(groupId: string): Promise<Category[]> {
    return this.getDocuments<Category>(this.COLLECTION_NAME, [
      where("categoryGroupId", "==", groupId),
      orderBy("name", "asc"),
    ]);
  }

  async getUnassignedCategories(): Promise<Category[]> {
    // Get categories without a group assignment
    const allCategories = await this.getCategories();
    return allCategories.filter((category) => !category.categoryGroupId);
  }

  async assignMultipleCategoriesToGroup(
    categoryIds: string[],
    groupId: string | null
  ): Promise<void> {
    const updatePromises = categoryIds.map((categoryId) =>
      this.updateCategory(categoryId, { categoryGroupId: groupId || undefined })
    );
    await Promise.all(updatePromises);
  }

  // Inventory Deduction Methods

  /**
   * Get categories that have inventory deduction configured
   * @returns Promise<Category[]> Categories with deduction quantity set
   */
  async getCategoriesWithInventoryDeduction(): Promise<Category[]> {
    const allCategories = await this.getCategories();
    return allCategories.filter(
      (category) =>
        category.inventoryDeductionQuantity !== null &&
        category.inventoryDeductionQuantity !== undefined &&
        category.inventoryDeductionQuantity > 0
    );
  }

  /**
   * Validate inventory deduction configuration for a category
   * @param category Category to validate
   * @returns ValidationResult with validation status and messages
   */
  validateInventoryDeductionConfig(category: Category): ValidationResult {
    return inventoryDeductionValidator.validateCategoryDeductionConfig(
      category
    );
  }

  /**
   * Update inventory deduction quantity for a category
   * @param categoryId ID of the category to update
   * @param quantity New deduction quantity (null to disable)
   * @returns Promise<void>
   */
  async updateInventoryDeductionQuantity(
    categoryId: string,
    quantity: number | null
  ): Promise<void> {
    // Validate the quantity before updating
    if (quantity !== null) {
      const validation =
        inventoryDeductionValidator.validateDeductionQuantity(quantity);
      if (!validation.isValid) {
        throw new Error(
          `Invalid deduction quantity: ${validation.errors.join(", ")}`
        );
      }
    }

    await this.updateCategory(categoryId, {
      inventoryDeductionQuantity: quantity || undefined,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Get categories by category group that have deduction configured
   * @param groupId ID of the category group
   * @returns Promise<Category[]> Categories in the group with deduction configured
   */
  async getCategoriesWithDeductionByGroup(
    groupId: string
  ): Promise<Category[]> {
    const groupCategories = await this.getCategoriesByGroup(groupId);
    return groupCategories.filter(
      (category) =>
        category.inventoryDeductionQuantity !== null &&
        category.inventoryDeductionQuantity !== undefined &&
        category.inventoryDeductionQuantity > 0
    );
  }

  /**
   * Check if a category is ready for automatic inventory deduction
   * @param categoryId ID of the category to check
   * @returns Promise<boolean> True if category is properly configured
   */
  async isCategoryReadyForDeduction(categoryId: string): Promise<boolean> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return false;
    }
    return inventoryDeductionValidator.isCategoryReadyForDeduction(category);
  }

  /**
   * Bulk update inventory deduction quantities for multiple categories
   * @param updates Array of {categoryId, quantity} objects
   * @returns Promise<void>
   */
  async bulkUpdateDeductionQuantities(
    updates: Array<{ categoryId: string; quantity: number | null }>
  ): Promise<void> {
    // Validate all quantities first
    for (const update of updates) {
      if (update.quantity !== null) {
        const validation =
          inventoryDeductionValidator.validateDeductionQuantity(
            update.quantity
          );
        if (!validation.isValid) {
          throw new Error(
            `Invalid deduction quantity for category ${
              update.categoryId
            }: ${validation.errors.join(", ")}`
          );
        }
      }
    }

    // Perform all updates
    const updatePromises = updates.map((update) =>
      this.updateCategory(update.categoryId, {
        inventoryDeductionQuantity: update.quantity || undefined,
        updatedAt: Timestamp.now(),
      })
    );
    await Promise.all(updatePromises);
  }

  /**
   * Get validation summary for a category's deduction configuration
   * @param categoryId ID of the category
   * @returns Promise<string> User-friendly validation summary
   */
  async getDeductionValidationSummary(categoryId: string): Promise<string> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return "Category not found";
    }
    return inventoryDeductionValidator.getValidationSummary(category);
  }

  /**
   * Enable inventory deduction for a category with validation
   * @param categoryId ID of the category
   * @param quantity Deduction quantity to set
   * @param inventoryType Optional inventory type (weight/qty)
   * @param inventoryUnit Optional inventory unit (kg/g/pcs)
   * @returns Promise<ValidationResult> Result of enabling deduction
   */
  async enableInventoryDeduction(
    categoryId: string,
    quantity: number,
    inventoryType?: "weight" | "qty",
    inventoryUnit?: "kg" | "g" | "pcs"
  ): Promise<ValidationResult> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return {
        isValid: false,
        errors: ["Category not found"],
        warnings: [],
      };
    }

    // Create temporary category object for validation
    const testCategory: Category = {
      ...category,
      inventoryDeductionQuantity: quantity,
      inventoryType: inventoryType || category.inventoryType,
      inventoryUnit: inventoryUnit || category.inventoryUnit,
    };

    const validation = this.validateInventoryDeductionConfig(testCategory);

    if (validation.isValid) {
      // Update the category with new settings
      const updates: Partial<Category> = {
        inventoryDeductionQuantity: quantity,
      };

      if (inventoryType) {
        updates.inventoryType = inventoryType;
      }
      if (inventoryUnit) {
        updates.inventoryUnit = inventoryUnit;
      }

      await this.updateCategory(categoryId, updates);
    }

    return validation;
  }

  /**
   * Disable inventory deduction for a category
   * @param categoryId ID of the category
   * @returns Promise<void>
   */
  async disableInventoryDeduction(categoryId: string): Promise<void> {
    await this.updateInventoryDeductionQuantity(categoryId, null);
  }

  // Category Linking Methods

  /**
   * Add a link from one category to another with circular dependency validation
   * @param sourceId ID of the source category
   * @param targetId ID of the target category to link
   * @param isActive Whether the link should be active (default true)
   * @returns Promise<ValidationResult> Result of adding the link
   */
  async addCategoryLink(
    sourceId: string,
    targetId: string,
    isActive: boolean = true
  ): Promise<ValidationResult> {
    const allCategories = await this.getCategories();

    // Validate the link before adding
    const validation = circularDependencyValidator.validateLink(
      sourceId,
      targetId,
      allCategories
    );

    if (!validation.isValid) {
      return validation;
    }

    const sourceCategory = await this.getCategory(sourceId);
    if (!sourceCategory) {
      return {
        isValid: false,
        errors: [`Source category with ID '${sourceId}' not found`],
        warnings: [],
      };
    }

    // Check if link already exists
    const existingLinks = sourceCategory.linkedCategories || [];
    const linkExists = existingLinks.some(
      (link) => link.categoryId === targetId
    );

    if (linkExists) {
      return {
        isValid: false,
        errors: ["Link already exists between these categories"],
        warnings: [],
      };
    }

    // Create new link
    const newLink: CategoryLink = {
      categoryId: targetId,
      isActive,
      createdAt: Timestamp.now(),
    };

    // Update the source category with the new link
    const updatedLinks = [...existingLinks, newLink];
    await this.updateCategory(sourceId, { linkedCategories: updatedLinks });

    return {
      isValid: true,
      errors: [],
      warnings: validation.warnings,
    };
  }

  /**
   * Remove a link between categories
   * @param sourceId ID of the source category
   * @param targetId ID of the target category to unlink
   * @returns Promise<ValidationResult> Result of removing the link
   */
  async removeCategoryLink(
    sourceId: string,
    targetId: string
  ): Promise<ValidationResult> {
    const sourceCategory = await this.getCategory(sourceId);
    if (!sourceCategory) {
      return {
        isValid: false,
        errors: [`Source category with ID '${sourceId}' not found`],
        warnings: [],
      };
    }

    const existingLinks = sourceCategory.linkedCategories || [];
    const linkIndex = existingLinks.findIndex(
      (link) => link.categoryId === targetId
    );

    if (linkIndex === -1) {
      return {
        isValid: false,
        errors: ["Link does not exist between these categories"],
        warnings: [],
      };
    }

    // Remove the link
    const updatedLinks = existingLinks.filter(
      (_, index) => index !== linkIndex
    );
    await this.updateCategory(sourceId, { linkedCategories: updatedLinks });

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Update a category link (enable/disable or modify properties)
   * @param sourceId ID of the source category
   * @param targetId ID of the target category
   * @param updates Updates to apply to the link
   * @returns Promise<ValidationResult> Result of updating the link
   */
  async updateCategoryLink(
    sourceId: string,
    targetId: string,
    updates: Partial<CategoryLink>
  ): Promise<ValidationResult> {
    const sourceCategory = await this.getCategory(sourceId);
    if (!sourceCategory) {
      return {
        isValid: false,
        errors: [`Source category with ID '${sourceId}' not found`],
        warnings: [],
      };
    }

    const existingLinks = sourceCategory.linkedCategories || [];
    const linkIndex = existingLinks.findIndex(
      (link) => link.categoryId === targetId
    );

    if (linkIndex === -1) {
      return {
        isValid: false,
        errors: ["Link does not exist between these categories"],
        warnings: [],
      };
    }

    // Update the link
    const updatedLinks = [...existingLinks];
    updatedLinks[linkIndex] = {
      ...updatedLinks[linkIndex],
      ...updates,
      categoryId: targetId, // Ensure categoryId cannot be changed
    };

    await this.updateCategory(sourceId, { linkedCategories: updatedLinks });

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Get all categories that are linked from a source category
   * @param sourceId ID of the source category
   * @param includeInactive Whether to include inactive links (default false)
   * @returns Promise<Category[]> Array of linked categories
   */
  async getLinkedCategories(
    sourceId: string,
    includeInactive: boolean = false
  ): Promise<Category[]> {
    const sourceCategory = await this.getCategory(sourceId);
    if (!sourceCategory || !sourceCategory.linkedCategories) {
      return [];
    }

    // Filter links based on active status
    const links = includeInactive
      ? sourceCategory.linkedCategories
      : sourceCategory.linkedCategories.filter(
          (link) => link.isActive !== false
        );

    // Fetch the actual category objects
    const linkedCategories: Category[] = [];
    for (const link of links) {
      const category = await this.getCategory(link.categoryId);
      if (category) {
        linkedCategories.push(category);
      }
    }

    return linkedCategories;
  }

  /**
   * Get all categories that link TO a target category (reverse lookup)
   * @param targetId ID of the target category
   * @param includeInactive Whether to include inactive links (default false)
   * @returns Promise<Category[]> Array of categories that link to the target
   */
  async getCategoriesLinkingTo(
    targetId: string,
    includeInactive: boolean = false
  ): Promise<Category[]> {
    const allCategories = await this.getCategories();
    const linkingCategories: Category[] = [];

    for (const category of allCategories) {
      if (category.linkedCategories) {
        const hasLink = category.linkedCategories.some(
          (link) =>
            link.categoryId === targetId &&
            (includeInactive || link.isActive !== false)
        );

        if (hasLink) {
          linkingCategories.push(category);
        }
      }
    }

    return linkingCategories;
  }

  /**
   * Get all active category links with detailed information
   * @param sourceId ID of the source category
   * @returns Promise<Array> Array of link details with target category info
   */
  async getCategoryLinkDetails(
    sourceId: string
  ): Promise<Array<CategoryLink & { targetCategory?: Category }>> {
    const sourceCategory = await this.getCategory(sourceId);
    if (!sourceCategory || !sourceCategory.linkedCategories) {
      return [];
    }

    const linkDetails = [];
    for (const link of sourceCategory.linkedCategories) {
      const targetCategory = await this.getCategory(link.categoryId);
      linkDetails.push({
        ...link,
        targetCategory,
      });
    }

    return linkDetails;
  }

  /**
   * Validate all category links for circular dependencies
   * @param categoryId Optional specific category to validate (validates all if not provided)
   * @returns Promise<ValidationResult> Comprehensive validation result
   */
  async validateCategoryLinks(categoryId?: string): Promise<ValidationResult> {
    if (categoryId) {
      const allCategories = await this.getCategories();
      return circularDependencyValidator.checkCircularDependency(
        categoryId,
        allCategories
      );
    } else {
      const allCategories = await this.getCategories();
      return circularDependencyValidator.validateAllCategoryLinks(
        allCategories
      );
    }
  }

  /**
   * Get a summary of category link configuration
   * @param categoryId ID of the category
   * @returns Promise<string> User-friendly link summary
   */
  async getCategoryLinkSummary(categoryId: string): Promise<string> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      return "Category not found";
    }

    const allCategories = await this.getCategories();
    return circularDependencyValidator.getLinkValidationSummary(
      category,
      allCategories
    );
  }

  /**
   * Bulk add multiple category links with validation
   * @param links Array of {sourceId, targetId, isActive} objects
   * @returns Promise<ValidationResult[]> Array of validation results for each link
   */
  async bulkAddCategoryLinks(
    links: Array<{ sourceId: string; targetId: string; isActive?: boolean }>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Process links one by one to ensure proper validation after each addition
    for (const link of links) {
      const result = await this.addCategoryLink(
        link.sourceId,
        link.targetId,
        link.isActive
      );
      results.push(result);

      // Stop processing if we encounter an error to prevent inconsistent state
      if (!result.isValid) {
        break;
      }
    }

    return results;
  }

  /**
   * Enable or disable a category link
   * @param sourceId ID of the source category
   * @param targetId ID of the target category
   * @param isActive Whether the link should be active
   * @returns Promise<ValidationResult> Result of the operation
   */
  async setCategoryLinkActive(
    sourceId: string,
    targetId: string,
    isActive: boolean
  ): Promise<ValidationResult> {
    return this.updateCategoryLink(sourceId, targetId, { isActive });
  }

  /**
   * Get categories that have cascade deduction potential (have linked categories)
   * @returns Promise<Category[]> Categories with active links configured
   */
  async getCategoriesWithCascadeDeduction(): Promise<Category[]> {
    const allCategories = await this.getCategories();
    return allCategories.filter((category) => {
      const activeLinks =
        category.linkedCategories?.filter((link) => link.isActive !== false) ||
        [];
      return activeLinks.length > 0;
    });
  }

  /**
   * Get dependency chains starting from a category
   * @param categoryId ID of the starting category
   * @param maxDepth Maximum depth to traverse (default 10)
   * @returns Promise<string[]> Array of dependency chain descriptions
   */
  async getDependencyChains(
    categoryId: string,
    maxDepth: number = 10
  ): Promise<string[]> {
    const allCategories = await this.getCategories();
    return circularDependencyValidator.getDependencyChains(
      categoryId,
      allCategories,
      maxDepth
    );
  }
}
