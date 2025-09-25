import { Timestamp, orderBy, where, writeBatch, doc, runTransaction, collection } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { 
  CategoryGroup, 
  CategoryGroupWithStats, 
  CategoryGroupFormData,
  CategoryGroupValidationResult,
  CATEGORY_GROUP_COLORS 
} from '../types/categoryGroup';
import { InventoryMovement, InventoryAlert } from '../types/inventory';

export class CategoryGroupService extends FirebaseService {
  private readonly COLLECTION_NAME = 'categoryGroups';
  private readonly CATEGORIES_COLLECTION = 'categories';
  private readonly INVENTORY_MOVEMENTS_COLLECTION = 'inventoryMovements';

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

    // Create the group with default inventory values (will be set properly via initializeInventory)
    const sanitizedGroup: Omit<CategoryGroup, 'id'> = {
      name: groupData.name.trim(),
      description: groupData.description.trim(),
      color: groupData.color,
      currentInventory: groupData.currentInventory || 0,
      inventoryUnit: groupData.inventoryUnit || 'pcs',
      inventoryType: groupData.inventoryType || 'qty',
      minimumThreshold: groupData.minimumThreshold || 0,
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
    if (groupData.currentInventory !== undefined) {
      sanitizedUpdates.currentInventory = groupData.currentInventory;
    }
    if (groupData.inventoryUnit !== undefined) {
      sanitizedUpdates.inventoryUnit = groupData.inventoryUnit;
    }
    if (groupData.inventoryType !== undefined) {
      sanitizedUpdates.inventoryType = groupData.inventoryType;
    }
    if (groupData.minimumThreshold !== undefined) {
      sanitizedUpdates.minimumThreshold = groupData.minimumThreshold;
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

  /**
   * Initialize inventory tracking for a category group
   * 
   * This method atomically:
   * 1. Updates the category group document with inventory fields
   * 2. Creates an initial inventory movement record
   * 
   * @param groupId - The ID of the category group to initialize inventory for
   * @param initialInventory - The initial inventory quantity
   * @param unit - The unit of measurement ('kg', 'g', or 'pcs')
   * @throws Error if the category group doesn't exist or initialization fails
   */
  async initializeInventory(groupId: string, initialInventory: number, unit: 'kg' | 'g' | 'pcs'): Promise<void> {
    // Verify the category group exists
    const categoryGroup = await this.getCategoryGroup(groupId);
    if (!categoryGroup) {
      throw new Error('Category group not found');
    }

    // Validate input parameters
    if (initialInventory < 0) {
      throw new Error('Initial inventory cannot be negative');
    }

    if (!['kg', 'g', 'pcs'].includes(unit)) {
      throw new Error('Invalid unit. Must be kg, g, or pcs');
    }

    const now = Timestamp.now();

    try {
      // Use Firebase batch to atomically update category group and create movement record
      const batch = writeBatch(this.db);

      // Update category group document with inventory fields
      const categoryGroupRef = doc(this.db, this.COLLECTION_NAME, groupId);
      const inventoryType = unit === 'pcs' ? 'qty' : 'weight';
      
      batch.update(categoryGroupRef, {
        currentInventory: initialInventory,
        inventoryUnit: unit,
        inventoryType: inventoryType,
        lastInventoryUpdate: now,
        updatedAt: now
      });

      // Create initial inventory movement record
      const movementRef = doc(collection(this.db, this.INVENTORY_MOVEMENTS_COLLECTION));
      const initialMovement: Omit<InventoryMovement, 'id'> = {
        categoryGroupId: groupId,
        movementType: 'initial',
        quantity: initialInventory,
        unit: unit,
        previousInventory: 0,
        newInventory: initialInventory,
        reason: 'Initial inventory setup',
        notes: 'System-generated initial inventory record',
        createdAt: now,
        updatedAt: now
      };

      batch.set(movementRef, initialMovement);

      // Commit the batch operation
      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to initialize inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update inventory for a category group with atomic transaction and audit trail
   * 
   * This method atomically:
   * 1. Reads the current category group inventory data
   * 2. Calculates the new inventory level based on the movement type
   * 3. Updates the category group document with the new inventory values
   * 4. Creates an inventory movement record documenting the change
   * 
   * @param groupId - The ID of the category group to update inventory for
   * @param quantity - The quantity to add/deduct/set (always positive)
   * @param movementType - The type of inventory movement ('deduction', 'addition', 'adjustment')
   * @param options - Optional parameters for the movement (order context, reason, etc.)
   * @returns Object containing the updated inventory level and movement ID
   * @throws Error if the category group doesn't exist, validation fails, or transaction fails
   */
  async updateInventory(
    groupId: string, 
    quantity: number, 
    movementType: 'deduction' | 'addition' | 'adjustment',
    options: {
      transactionReference?: string;
      orderReference?: string;
      productSku?: string;
      platform?: 'amazon' | 'flipkart';
      reason?: string;
      notes?: string;
      adjustedBy?: string;
    } = {}
  ): Promise<{ newInventoryLevel: number; movementId: string }> {
    // Validate input parameters
    if (quantity < 0) {
      throw new Error('Quantity must be non-negative');
    }

    if (!['deduction', 'addition', 'adjustment'].includes(movementType)) {
      throw new Error('Invalid movement type. Must be deduction, addition, or adjustment');
    }

    const now = Timestamp.now();

    try {
      // Use Firebase transaction for atomic read-write operation
      const result = await runTransaction(this.db, async (transaction) => {
        // Read current category group data
        const categoryGroupRef = doc(this.db, this.COLLECTION_NAME, groupId);
        const categoryGroupDoc = await transaction.get(categoryGroupRef);

        if (!categoryGroupDoc.exists()) {
          throw new Error('Category group not found');
        }

        const categoryGroup = categoryGroupDoc.data() as CategoryGroup;

        // Validate that inventory tracking is initialized
        if (categoryGroup.currentInventory === undefined || !categoryGroup.inventoryUnit) {
          throw new Error('Inventory tracking not initialized for this category group');
        }

        const previousInventory = categoryGroup.currentInventory;
        let newInventory: number;

        // Calculate new inventory based on movement type
        switch (movementType) {
          case 'deduction':
            newInventory = previousInventory - quantity;
            break;
          case 'addition':
            newInventory = previousInventory + quantity;
            break;
          case 'adjustment':
            // For adjustments, quantity represents the new total inventory level
            newInventory = quantity;
            break;
          default:
            throw new Error('Invalid movement type');
        }

        // Handle negative inventory scenario
        if (newInventory < 0 && movementType === 'deduction') {
          // Allow negative inventory but log a warning
          console.warn(`Inventory for category group ${groupId} will become negative: ${newInventory}`);
        }

        // Update category group document
        transaction.update(categoryGroupRef, {
          currentInventory: newInventory,
          lastInventoryUpdate: now,
          updatedAt: now
        });

        // Create inventory movement record
        const movementRef = doc(collection(this.db, this.INVENTORY_MOVEMENTS_COLLECTION));
        const movement: Omit<InventoryMovement, 'id'> = {
          categoryGroupId: groupId,
          movementType: movementType,
          quantity: movementType === 'adjustment' ? Math.abs(newInventory - previousInventory) : quantity,
          unit: categoryGroup.inventoryUnit,
          previousInventory: previousInventory,
          newInventory: newInventory,
          // Audit trail
          createdAt: now,
          updatedAt: now,
          // Only include optional fields if they have values
          ...(options.transactionReference && { transactionReference: options.transactionReference }),
          ...(options.orderReference && { orderReference: options.orderReference }),
          ...(options.productSku && { productSku: options.productSku }),
          ...(options.platform && { platform: options.platform }),
          ...(options.reason && { reason: options.reason }),
          ...(options.notes && { notes: options.notes }),
          ...(options.adjustedBy && { adjustedBy: options.adjustedBy }),
        };

        transaction.set(movementRef, movement);

        return {
          newInventoryLevel: newInventory,
          movementId: movementRef.id
        };
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve inventory movement history for a specific category group
   * 
   * This method retrieves paginated inventory movements for audit purposes,
   * sorted by creation date in descending order (most recent first).
   * 
   * @param groupId - The ID of the category group to get movement history for
   * @param limitValue - Maximum number of movements to retrieve (default: 50)
   * @returns Array of inventory movements sorted by creation date (newest first)
   * @throws Error if the query fails
   */
  async getInventoryHistory(groupId: string, limitValue: number = 50): Promise<InventoryMovement[]> {
    try {
      const movements = await this.getDocuments<InventoryMovement>(
        this.INVENTORY_MOVEMENTS_COLLECTION,
        [
          where('categoryGroupId', '==', groupId),
          orderBy('createdAt', 'desc')
        ]
      );
      
      // Apply limit manually to avoid Firebase import issues in tests
      return movements.slice(0, limitValue);
    } catch (error) {
      throw new Error(`Failed to retrieve inventory history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  /**
   * Calculate alert severity based on how far below threshold the inventory is
   * 
   * @param currentInventory - The current inventory level
   * @param minimumThreshold - The minimum threshold level
   * @returns Severity level based on percentage below threshold
   */
  private calculateAlertSeverity(currentInventory: number, minimumThreshold: number): InventoryAlert['severity'] {
    // Handle edge case where threshold is 0 or negative
    if (minimumThreshold <= 0) {
      return currentInventory < 0 ? 'critical' : 'low';
    }

    // Calculate percentage of threshold that current inventory represents
    const percentageOfThreshold = (currentInventory / minimumThreshold) * 100;

    // Determine severity based on percentage below threshold
    if (percentageOfThreshold < 25) {
      return 'critical'; // Very urgent - less than 25% of threshold
    } else if (percentageOfThreshold < 50) {
      return 'high'; // Urgent - 25-50% of threshold
    } else if (percentageOfThreshold < 75) {
      return 'medium'; // Needs attention - 50-75% of threshold
    } else {
      return 'low'; // Monitor - 75-100% of threshold (but still below)
    }
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

  /**
   * Monitor inventory thresholds and generate alerts for a specific category group
   * 
   * This method:
   * 1. Retrieves current category group inventory data
   * 2. Compares current inventory with minimum threshold
   * 3. Creates or resolves alerts based on inventory level
   * 4. Calculates severity based on percentage below threshold
   * 5. Returns alert object if threshold is breached, null otherwise
   * 
   * Severity calculation:
   * - Critical: inventory < 25% of threshold (very urgent)
   * - High: inventory 25-50% of threshold (urgent)
   * - Medium: inventory 50-75% of threshold (needs attention)
   * - Low: inventory 75-100% of threshold (monitor)
   * 
   * @param groupId - The ID of the category group to check
   * @returns InventoryAlert object if threshold is breached, null if above threshold
   * @throws Error if the category group doesn't exist or monitoring fails
   */
  async checkThresholdAlerts(groupId: string): Promise<InventoryAlert | null> {
    try {
      // Retrieve the current category group data
      const categoryGroup = await this.getCategoryGroup(groupId);
      if (!categoryGroup) {
        throw new Error('Category group not found');
      }

      // Validate that inventory tracking is initialized
      if (categoryGroup.currentInventory === undefined || categoryGroup.minimumThreshold === undefined) {
        throw new Error('Inventory tracking not initialized for this category group');
      }

      const currentInventory = categoryGroup.currentInventory;
      const minimumThreshold = categoryGroup.minimumThreshold;

      // Check if inventory is above threshold - no alert needed
      if (currentInventory >= minimumThreshold) {
        // TODO: In future implementation, resolve any existing active alerts for this group
        return null;
      }

      // Inventory is below threshold - create or update alert
      const now = Timestamp.now();
      
      // Determine alert type based on inventory level
      let alertType: InventoryAlert['alertType'];
      if (currentInventory < 0) {
        alertType = 'negative_stock';
      } else if (currentInventory === 0) {
        alertType = 'zero_stock';
      } else {
        alertType = 'low_stock';
      }

      // Calculate severity based on how far below threshold the inventory is
      const severity = this.calculateAlertSeverity(currentInventory, minimumThreshold);

      // Create alert object
      const alert: InventoryAlert = {
        categoryGroupId: groupId,
        alertType: alertType,
        currentLevel: currentInventory,
        thresholdLevel: minimumThreshold,
        unit: categoryGroup.inventoryUnit,
        severity: severity,
        isActive: true,
        createdAt: now
      };

      return alert;
    } catch (error) {
      throw new Error(`Failed to check threshold alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}