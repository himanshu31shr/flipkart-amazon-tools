import { FirebaseService } from './firebase.service';
import { CategoryGroupService } from './categoryGroup.service';
import { CategoryGroup } from '../types/categoryGroup';
import { 
  InventoryDeductionItem,
  InventoryDeductionResult,
  ManualInventoryAdjustment,
  InventoryLevel,
  InventoryStatus,
  InventoryMovement,
  MovementFilters
} from '../types/inventory';

/**
 * InventoryService
 * 
 * Orchestrates higher-level inventory operations across multiple category groups.
 * This service coordinates with CategoryGroupService for individual group operations
 * and AlertingService for threshold monitoring. Handles complex operations like:
 * - Bulk deductions from orders
 * - Manual adjustments with validation
 * - Unit conversions
 * - Comprehensive filtering operations
 * - Multi-group inventory analysis
 * 
 * Requirements Coverage:
 * - R1: Category Group Inventory Tracking - coordinates with CategoryGroupService
 * - R2: Multi-Unit Type Support - handles unit conversions and validation
 * - R4: Order Processing Integration - manages bulk deductions with audit trails
 * - R5: Inventory Management Interface - provides comprehensive filtering and analysis
 */
export class InventoryService extends FirebaseService {
  // Firebase collection constants
  private readonly INVENTORY_MOVEMENTS_COLLECTION = 'inventoryMovements';
  private readonly INVENTORY_ALERTS_COLLECTION = 'inventoryAlerts';
  
  // Service dependencies
  private readonly categoryGroupService: CategoryGroupService;

  /**
   * Initialize InventoryService with required dependencies
   * 
   * Sets up the service with CategoryGroupService for individual group operations
   * and threshold monitoring capabilities.
   */
  constructor() {
    super();
    this.categoryGroupService = new CategoryGroupService();
  }

  /**
   * Deduct inventory from multiple category groups based on order items
   * 
   * This method orchestrates bulk inventory deductions when orders are processed from PDF documents.
   * It maps order items to their respective category groups, validates inventory availability,
   * performs atomic deductions, and returns comprehensive results including successful deductions,
   * warnings for low inventory, and errors for failed operations.
   * 
   * Process:
   * 1. Group order items by categoryGroupId to optimize operations
   * 2. Validate inventory availability for each category group
   * 3. Use CategoryGroupService.updateInventory for individual deductions
   * 4. Handle partial success scenarios (some items succeed, others fail)
   * 5. Check thresholds after deductions and trigger alerts if needed
   * 
   * @param orderItems - Array of InventoryDeductionItem objects representing order line items
   * @returns InventoryDeductionResult with three arrays:
   *   - deductions: Successfully processed items with movement IDs
   *   - warnings: Items processed with low inventory warnings
   *   - errors: Failed items with error descriptions
   * 
   * @throws Error if the operation fails catastrophically (should not happen with proper error handling)
   * 
   * Requirements Coverage:
   * - R4: Order Processing Integration - handles bulk deductions from PDF order processing
   * - Atomic operations for data consistency
   * - Comprehensive error handling and partial success scenarios
   * - Audit trail creation through CategoryGroupService
   * - Threshold monitoring and alert generation
   */
  async deductInventoryFromOrder(orderItems: InventoryDeductionItem[]): Promise<InventoryDeductionResult> {
    const result: InventoryDeductionResult = {
      deductions: [],
      warnings: [],
      errors: []
    };

    // Input validation
    if (!orderItems || orderItems.length === 0) {
      return result;
    }

    // Group items by categoryGroupId to optimize processing
    const itemsByGroup = new Map<string, InventoryDeductionItem[]>();
    for (const item of orderItems) {
      if (!item.categoryGroupId) {
        result.errors.push({
          categoryGroupId: 'unknown',
          error: 'Missing category group mapping',
          requestedQuantity: item.quantity,
          reason: 'Product SKU must be mapped to a category group before inventory deduction'
        });
        continue;
      }

      if (!itemsByGroup.has(item.categoryGroupId)) {
        itemsByGroup.set(item.categoryGroupId, []);
      }
      itemsByGroup.get(item.categoryGroupId)!.push(item);
    }

    // Process each category group
    for (const [categoryGroupId, groupItems] of itemsByGroup) {
      try {
        // Calculate total quantity needed for this category group
        const totalQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);

        // Get current category group data to validate availability
        const categoryGroup = await this.categoryGroupService.getCategoryGroup(categoryGroupId);
        if (!categoryGroup) {
          // Handle missing category group
          for (const item of groupItems) {
            result.errors.push({
              categoryGroupId: categoryGroupId,
              error: 'Category group not found',
              requestedQuantity: item.quantity,
              reason: 'The specified category group does not exist in the system'
            });
          }
          continue;
        }

        // Validate that inventory tracking is initialized
        if (categoryGroup.currentInventory === undefined || !categoryGroup.inventoryUnit) {
          for (const item of groupItems) {
            result.errors.push({
              categoryGroupId: categoryGroupId,
              error: 'Inventory tracking not initialized',
              requestedQuantity: item.quantity,
              reason: 'Category group inventory tracking must be initialized before deductions'
            });
          }
          continue;
        }

        // Validate unit consistency
        const firstItem = groupItems[0];
        const hasUnitMismatch = groupItems.some(item => item.unit !== categoryGroup.inventoryUnit);
        if (hasUnitMismatch) {
          for (const item of groupItems) {
            result.errors.push({
              categoryGroupId: categoryGroupId,
              error: 'Unit mismatch',
              requestedQuantity: item.quantity,
              reason: `Order item unit (${item.unit}) does not match category group unit (${categoryGroup.inventoryUnit})`
            });
          }
          continue;
        }

        // Check inventory availability
        const currentInventory = categoryGroup.currentInventory;
        const minimumThreshold = categoryGroup.minimumThreshold || 0;

        if (totalQuantity > currentInventory) {
          // Insufficient inventory - add warning and proceed (allowing negative inventory)
          const warning = `Insufficient inventory: requested ${totalQuantity}${categoryGroup.inventoryUnit}, available ${currentInventory}${categoryGroup.inventoryUnit}`;
          
          for (const item of groupItems) {
            result.warnings.push({
              categoryGroupId: categoryGroupId,
              warning: warning,
              requestedQuantity: item.quantity,
              availableQuantity: currentInventory
            });
          }
        }

        // Perform the deduction using CategoryGroupService
        // Combine all items for this group into a single deduction operation
        const deductionResult = await this.categoryGroupService.updateInventory(
          categoryGroupId,
          totalQuantity,
          'deduction',
          {
            // Use the first item's context for the combined operation
            transactionReference: firstItem.transactionReference,
            orderReference: firstItem.orderReference,
            productSku: groupItems.map(item => item.productSku).filter(Boolean).join(', '),
            platform: firstItem.platform,
            reason: `Order processing deduction for ${groupItems.length} item(s)`,
            notes: `SKUs: ${groupItems.map(item => item.productSku).filter(Boolean).join(', ')}`
          }
        );

        // Record successful deductions for each item in the group
        for (const item of groupItems) {
          result.deductions.push({
            categoryGroupId: categoryGroupId,
            requestedQuantity: item.quantity,
            deductedQuantity: item.quantity, // Individual item quantity
            newInventoryLevel: deductionResult.newInventoryLevel,
            movementId: deductionResult.movementId
          });
        }

        // Check if deduction brought inventory below threshold and generate alert
        if (deductionResult.newInventoryLevel < minimumThreshold) {
          try {
            const alert = await this.categoryGroupService.checkThresholdAlerts(categoryGroupId);
            if (alert) {
              // Alert was generated - log for visibility (future: integrate with alerting system)
              console.warn(`Inventory threshold alert generated for category group ${categoryGroupId}:`, {
                alertType: alert.alertType,
                currentLevel: alert.currentLevel,
                thresholdLevel: alert.thresholdLevel,
                severity: alert.severity
              });
            }
          } catch (alertError) {
            // Log alert generation error but don't fail the entire operation
            console.warn(`Failed to generate threshold alert for category group ${categoryGroupId}:`, alertError);
          }
        }

      } catch (error) {
        // Handle errors at the category group level
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        for (const item of groupItems) {
          result.errors.push({
            categoryGroupId: categoryGroupId,
            error: `Deduction failed: ${errorMessage}`,
            requestedQuantity: item.quantity,
            reason: 'Failed to process inventory deduction due to system error'
          });
        }
      }
    }

    return result;
  }

  /**
   * Manually adjust inventory for a category group
   * 
   * This method handles user-initiated inventory adjustments from the management interface.
   * It validates adjustment data, performs the inventory update using CategoryGroupService,
   * creates comprehensive audit trails with user context and reason codes, and handles
   * negative inventory scenarios with appropriate warnings.
   * 
   * The method supports three adjustment types:
   * - 'increase': Add quantity to current inventory
   * - 'decrease': Subtract quantity from current inventory  
   * - 'set': Set inventory to specific quantity
   * 
   * Process:
   * 1. Validate input parameters (categoryGroupId, adjustmentType, quantity, reason)
   * 2. Retrieve current category group data for validation
   * 3. Calculate new inventory level and validate against negative scenarios
   * 4. Use CategoryGroupService.updateInventory to perform the adjustment
   * 5. Create comprehensive audit trail with user, reason, and adjustment context
   * 
   * @param adjustment - ManualInventoryAdjustment object containing adjustment details
   * @throws Error if validation fails or the adjustment operation fails
   * 
   * Requirements Coverage:
   * - R5: Inventory Management Interface - manual adjustments with reason selection and audit trails
   * - Negative inventory validation and warnings
   * - Comprehensive user context and reason code tracking
   */
  async adjustInventoryManually(adjustment: ManualInventoryAdjustment): Promise<{ newInventoryLevel: number; movementId: string; }> {
    // Input validation
    if (!adjustment.categoryGroupId) {
      throw new Error('Category group ID is required for manual inventory adjustment');
    }
    
    if (!adjustment.adjustmentType) {
      throw new Error('Adjustment type is required (increase, decrease, or set)');
    }
    
    if (adjustment.quantity < 0) {
      throw new Error('Quantity must be non-negative');
    }
    
    if (!adjustment.reason) {
      throw new Error('Reason is required for manual inventory adjustment');
    }
    
    if (!adjustment.adjustedBy) {
      throw new Error('User identifier is required for audit trail');
    }

    try {
      // Retrieve current category group data for validation
      const categoryGroup = await this.categoryGroupService.getCategoryGroup(adjustment.categoryGroupId);
      if (!categoryGroup) {
        throw new Error(`Category group with ID ${adjustment.categoryGroupId} not found`);
      }

      // Validate that inventory tracking is initialized
      if (categoryGroup.currentInventory === undefined || !categoryGroup.inventoryUnit) {
        throw new Error('Inventory tracking must be initialized for this category group before manual adjustments');
      }

      // Calculate new inventory level based on adjustment type
      let newInventoryLevel: number;
      let movementType: 'addition' | 'deduction' | 'adjustment';
      let actualQuantity: number;

      switch (adjustment.adjustmentType) {
        case 'increase':
          newInventoryLevel = categoryGroup.currentInventory + adjustment.quantity;
          movementType = 'addition';
          actualQuantity = adjustment.quantity;
          break;
        
        case 'decrease':
          newInventoryLevel = categoryGroup.currentInventory - adjustment.quantity;
          movementType = 'deduction';
          actualQuantity = adjustment.quantity;
          break;
        
        case 'set':
          newInventoryLevel = adjustment.quantity;
          // Determine movement type based on whether we're adding or removing inventory
          if (adjustment.quantity > categoryGroup.currentInventory) {
            movementType = 'addition';
            actualQuantity = adjustment.quantity - categoryGroup.currentInventory;
          } else if (adjustment.quantity < categoryGroup.currentInventory) {
            movementType = 'deduction';
            actualQuantity = categoryGroup.currentInventory - adjustment.quantity;
          } else {
            // No change needed - inventory is already at the target level
            return {
              newInventoryLevel: categoryGroup.currentInventory,
              movementId: '' // No movement created
            };
          }
          break;
        
        default:
          throw new Error(`Invalid adjustment type: ${adjustment.adjustmentType}. Must be 'increase', 'decrease', or 'set'`);
      }

      // Check for negative inventory scenarios and provide warnings
      if (newInventoryLevel < 0) {
        const warningMessage = `Warning: Manual adjustment will result in negative inventory (${newInventoryLevel}${categoryGroup.inventoryUnit}) for category group ${adjustment.categoryGroupId}`;
        console.warn(warningMessage);
        
        // In a real implementation, this might trigger manager approval workflow
        // For now, we log the warning and allow the operation to proceed
      }

      // Perform the inventory adjustment using CategoryGroupService
      const result = await this.categoryGroupService.updateInventory(
        adjustment.categoryGroupId,
        actualQuantity,
        movementType,
        {
          reason: `Manual adjustment: ${adjustment.reason}`,
          notes: adjustment.notes ? `Manual adjustment notes: ${adjustment.notes}` : `Manual ${adjustment.adjustmentType} adjustment`,
          adjustedBy: adjustment.adjustedBy
        }
      );

      // Log successful adjustment for audit purposes
      console.info(`Manual inventory adjustment completed successfully:`, {
        categoryGroupId: adjustment.categoryGroupId,
        adjustmentType: adjustment.adjustmentType,
        quantity: adjustment.quantity,
        actualQuantity: actualQuantity,
        movementType: movementType,
        previousLevel: categoryGroup.currentInventory,
        newLevel: result.newInventoryLevel,
        movementId: result.movementId,
        adjustedBy: adjustment.adjustedBy,
        reason: adjustment.reason
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during manual inventory adjustment';
      throw new Error(`Manual inventory adjustment failed: ${errorMessage}`);
    }
  }

  /**
   * Get current inventory levels for category groups
   * 
   * This method retrieves comprehensive inventory status information for dashboard widgets
   * and management interfaces. It queries category groups with inventory tracking data,
   * calculates current status based on inventory levels and thresholds, and returns
   * structured data optimized for UI consumption.
   * 
   * The method supports optional filtering by group IDs for targeted queries and dashboard
   * optimization. Status calculation follows these rules:
   * - 'healthy': inventory >= minimumThreshold
   * - 'low_stock': 0 < inventory < minimumThreshold
   * - 'zero_stock': inventory === 0
   * - 'negative_stock': inventory < 0
   * 
   * Process:
   * 1. Query category groups using CategoryGroupService
   * 2. Filter by groupIds if provided, otherwise get all groups
   * 3. Filter out groups without initialized inventory tracking
   * 4. Transform category group data into inventory level objects
   * 5. Calculate inventory status for each group
   * 6. Sort by status priority (critical issues first) and name
   * 
   * @param groupIds - Optional array of category group IDs to filter results
   * @returns Promise resolving to array of InventoryLevel objects with current status
   * @throws Error if the query operation fails
   * 
   * Requirements Coverage:
   * - R1: Category Group Inventory Tracking - displays current inventory levels and status
   * - R5: Inventory Management Interface - provides data for management page and dashboard widgets
   * - Performance optimized with optional filtering for targeted queries
   * - Status calculation with priority ordering for critical issues
   * - Comprehensive inventory information for UI display
   */
  async getInventoryLevels(groupIds?: string[]): Promise<InventoryLevel[]> {
    try {
      // Query category groups using CategoryGroupService
      let categoryGroups;
      
      if (groupIds && groupIds.length > 0) {
        // Get specific category groups if IDs are provided
        const groupPromises = groupIds.map(id => this.categoryGroupService.getCategoryGroup(id));
        const groupResults = await Promise.all(groupPromises);
        
        // Filter out null results (non-existent groups)
        categoryGroups = groupResults.filter(group => group !== null);
      } else {
        // Get all category groups if no specific IDs provided
        categoryGroups = await this.categoryGroupService.getCategoryGroups();
      }

      // Filter out groups without initialized inventory tracking
      const groupsWithInventory = categoryGroups.filter((group): group is CategoryGroup & { 
        id: string; 
        currentInventory: number; 
        inventoryUnit: 'kg' | 'g' | 'pcs'; 
        inventoryType: 'weight' | 'qty'; 
        minimumThreshold: number; 
      } => 
        group !== undefined &&
        group.id !== undefined &&
        group.currentInventory !== undefined && 
        group.inventoryUnit !== undefined && 
        group.inventoryType !== undefined &&
        group.minimumThreshold !== undefined
      );

      // Transform category group data into inventory level objects
      const inventoryLevels: InventoryLevel[] = groupsWithInventory.map(group => {
        // Calculate inventory status based on current level and threshold
        const status: InventoryStatus = this.calculateInventoryStatus(
          group.currentInventory, 
          group.minimumThreshold
        );

        return {
          categoryGroupId: group.id,
          name: group.name,
          currentInventory: group.currentInventory,
          inventoryUnit: group.inventoryUnit,
          inventoryType: group.inventoryType,
          minimumThreshold: group.minimumThreshold,
          status: status,
          lastInventoryUpdate: group.lastInventoryUpdate
        };
      });

      // Sort by status priority (critical issues first) and then by name
      // Status priority: negative_stock -> zero_stock -> low_stock -> healthy
      const statusPriority: Record<InventoryStatus, number> = {
        'negative_stock': 0,
        'zero_stock': 1,
        'low_stock': 2,
        'healthy': 3
      };

      inventoryLevels.sort((a, b) => {
        // First sort by status priority
        const statusComparison = statusPriority[a.status] - statusPriority[b.status];
        if (statusComparison !== 0) {
          return statusComparison;
        }
        
        // Then sort by name alphabetically
        return a.name.localeCompare(b.name);
      });

      return inventoryLevels;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve inventory levels: ${errorMessage}`);
    }
  }

  /**
   * Calculate inventory status based on current level and threshold
   * 
   * This private helper method determines the inventory status for a category group
   * based on the current inventory level relative to the minimum threshold. The
   * status calculation follows business logic for inventory management alerts.
   * 
   * @param currentInventory - Current inventory level
   * @param minimumThreshold - Minimum threshold level
   * @returns InventoryStatus indicating the current state
   * 
   * Status Logic:
   * - 'healthy': inventory >= minimumThreshold (sufficient stock)
   * - 'low_stock': 0 < inventory < minimumThreshold (warning level)
   * - 'zero_stock': inventory === 0 (out of stock)
   * - 'negative_stock': inventory < 0 (oversold situation)
   */
  private calculateInventoryStatus(currentInventory: number, minimumThreshold: number): InventoryStatus {
    if (currentInventory < 0) {
      return 'negative_stock';
    } else if (currentInventory === 0) {
      return 'zero_stock';
    } else if (currentInventory < minimumThreshold) {
      return 'low_stock';
    } else {
      return 'healthy';
    }
  }

  /**
   * Convert a value from any unit to its base unit
   * 
   * This private utility method normalizes inventory values to base units for consistent
   * calculations throughout the system. Base units are:
   * - Weight type: kg (kilograms)
   * - Quantity type: pcs (pieces)
   * 
   * The method validates unit compatibility with the inventory type and handles conversions
   * with appropriate precision. Supports future extensibility for additional unit types.
   * 
   * @param value - The numeric value to convert
   * @param fromUnit - The source unit ('kg', 'g', or 'pcs')
   * @param type - The inventory type ('weight' or 'qty')
   * @returns The converted value in base units
   * @throws Error if unit is incompatible with inventory type or conversion fails
   * 
   * Requirements Coverage:
   * - R2: Multi-Unit Type Support - handles unit conversions for weight-based inventory
   * - Validates unit compatibility with inventory type
   * - Maintains precision for weight calculations
   * - Provides extensible foundation for additional unit types
   */
  private convertToBaseUnit(value: number, fromUnit: string, type: string): number {
    // Input validation
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Value must be a valid number');
    }

    if (value < 0) {
      throw new Error('Value cannot be negative');
    }

    if (!fromUnit || !type) {
      throw new Error('Both fromUnit and type parameters are required');
    }

    // Validate unit compatibility with inventory type
    if (type === 'weight') {
      if (!['kg', 'g'].includes(fromUnit)) {
        throw new Error(`Unit '${fromUnit}' is not compatible with inventory type 'weight'. Expected 'kg' or 'g'`);
      }
    } else if (type === 'qty') {
      if (fromUnit !== 'pcs') {
        throw new Error(`Unit '${fromUnit}' is not compatible with inventory type 'qty'. Expected 'pcs'`);
      }
    } else {
      throw new Error(`Invalid inventory type '${type}'. Expected 'weight' or 'qty'`);
    }

    // Handle edge case: zero values
    if (value === 0) {
      return 0;
    }

    // Perform unit conversions
    switch (fromUnit) {
      case 'kg':
        // Already in base unit for weight
        return value;
      
      case 'g':
        // Convert grams to kilograms (base unit for weight)
        // 1 kg = 1000 g, so g to kg = divide by 1000
        return value / 1000;
      
      case 'pcs':
        // Already in base unit for quantity
        return value;
      
      default:
        throw new Error(`Unsupported unit conversion: '${fromUnit}'`);
    }
  }

  /**
   * Convert a value from base unit to target display unit
   * 
   * This private utility method converts normalized base unit values back to display units
   * for user interface presentation and data export. It maintains precision for weight
   * calculations and validates target unit compatibility.
   * 
   * Base units are:
   * - Weight type: kg (kilograms)
   * - Quantity type: pcs (pieces)
   * 
   * @param value - The numeric value in base units to convert
   * @param toUnit - The target unit ('kg', 'g', or 'pcs')
   * @param type - The inventory type ('weight' or 'qty')
   * @returns The converted value in target units
   * @throws Error if target unit is incompatible with inventory type or conversion fails
   * 
   * Requirements Coverage:
   * - R2: Multi-Unit Type Support - handles display unit conversions for weight-based inventory
   * - Maintains precision for weight calculations
   * - Validates target unit compatibility with inventory type
   * - Supports consistent unit display across the application
   */
  private convertFromBaseUnit(value: number, toUnit: string, type: string): number {
    // Input validation
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Value must be a valid number');
    }

    if (value < 0) {
      throw new Error('Value cannot be negative');
    }

    if (!toUnit || !type) {
      throw new Error('Both toUnit and type parameters are required');
    }

    // Validate target unit compatibility with inventory type
    if (type === 'weight') {
      if (!['kg', 'g'].includes(toUnit)) {
        throw new Error(`Target unit '${toUnit}' is not compatible with inventory type 'weight'. Expected 'kg' or 'g'`);
      }
    } else if (type === 'qty') {
      if (toUnit !== 'pcs') {
        throw new Error(`Target unit '${toUnit}' is not compatible with inventory type 'qty'. Expected 'pcs'`);
      }
    } else {
      throw new Error(`Invalid inventory type '${type}'. Expected 'weight' or 'qty'`);
    }

    // Handle edge case: zero values
    if (value === 0) {
      return 0;
    }

    // Perform unit conversions from base units
    switch (toUnit) {
      case 'kg':
        // Value is already in base unit (kg) for weight
        return value;
      
      case 'g':
        // Convert kilograms (base unit) to grams
        // 1 kg = 1000 g, so kg to g = multiply by 1000
        return value * 1000;
      
      case 'pcs':
        // Value is already in base unit (pcs) for quantity
        // Round to integer for pieces since fractional pieces don't make sense
        return Math.round(value);
      
      default:
        throw new Error(`Unsupported target unit conversion: '${toUnit}'`);
    }
  }

  /**
   * Retrieve inventory movements with comprehensive filtering
   * 
   * This method provides advanced querying capabilities for inventory movement history,
   * supporting filtering by date ranges, category groups, movement types, and other
   * contextual information. Implements pagination and sorting for efficient data access
   * in management interfaces and audit reports.
   * 
   * @param filters - MovementFilters object with optional filtering criteria
   * @returns Promise<InventoryMovement[]> - Filtered and paginated movement history
   * @throws Error if query fails or invalid filter parameters provided
   * 
   * Supported Filters:
   * - categoryGroupId: Filter by specific category group
   * - movementType: Filter by movement type (deduction, addition, adjustment, initial)
   * - startDate/endDate: Filter by date range
   * - platform: Filter by Amazon/Flipkart orders
   * - adjustedBy: Filter by user for manual adjustments
   * - transactionReference/orderReference/productSku: Filter by order context
   * - reason: Filter by adjustment reason
   * - limit/offset: Pagination support
   * 
   * Requirements Coverage:
   * - R5: Support inventory history viewing with filterable date ranges
   */
  async getInventoryMovements(filters: MovementFilters): Promise<InventoryMovement[]> {
    try {
      // Build Firestore query constraints
      const constraints: unknown[] = []; // TODO: Improve type safety - should be QueryConstraint[]

      // Add category group filter
      if (filters.categoryGroupId) {
        constraints.push(['categoryGroupId', '==', filters.categoryGroupId]);
      }

      // Add movement type filter
      if (filters.movementType) {
        constraints.push(['movementType', '==', filters.movementType]);
      }

      // Add date range filters
      if (filters.startDate) {
        constraints.push(['createdAt', '>=', filters.startDate]);
      }
      if (filters.endDate) {
        constraints.push(['createdAt', '<=', filters.endDate]);
      }

      // Add platform filter for order-related movements
      if (filters.platform) {
        constraints.push(['platform', '==', filters.platform]);
      }

      // Add user filter for manual adjustments
      if (filters.adjustedBy) {
        constraints.push(['adjustedBy', '==', filters.adjustedBy]);
      }

      // Add order context filters
      if (filters.transactionReference) {
        constraints.push(['transactionReference', '==', filters.transactionReference]);
      }
      if (filters.orderReference) {
        constraints.push(['orderReference', '==', filters.orderReference]);
      }
      if (filters.productSku) {
        constraints.push(['productSku', '==', filters.productSku]);
      }

      // Add reason filter for manual adjustments
      if (filters.reason) {
        constraints.push(['reason', '==', filters.reason]);
      }

      // Query inventory movements with constructed constraints
      let movements = await this.getDocuments(
        this.INVENTORY_MOVEMENTS_COLLECTION,
        constraints
      ) as InventoryMovement[];

      // Sort by creation date in descending order (most recent first)
      movements.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      // Apply pagination if specified
      const offset = filters.offset || 0;
      const limit = filters.limit || 50; // Default limit of 50 items

      if (offset > 0) {
        movements = movements.slice(offset);
      }
      if (limit > 0) {
        movements = movements.slice(0, limit);
      }

      return movements;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve inventory movements: ${errorMessage}`);
    }
  }

  /**
   * Export inventory data to CSV format with unit type preservation
   * 
   * This method exports comprehensive inventory data including inventory levels,
   * movements, and unit type information in CSV format. It preserves all unit
   * type information and maintains data consistency for external backup/analysis.
   * 
   * @param includeMovements Whether to include movement history in export
   * @param dateRange Optional date range for movement history
   * @returns Promise resolving to CSV formatted inventory data
   * 
   * Requirements Coverage:
   * - R2: Multi-Unit Type Support - preserves unit type information in export
   * - AC6: Import/Export with unit type preservation and consistency validation
   */
  async exportInventoryData(
    includeMovements: boolean = false,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<string> {
    try {
      // Get all inventory levels
      const inventoryLevels = await this.getInventoryLevels();
      
      // Build CSV header for inventory levels
      const csvHeaders = [
        'CategoryGroupId',
        'CategoryGroupName', 
        'CurrentInventory',
        'InventoryUnit',
        'InventoryType',
        'MinimumThreshold',
        'Status',
        'LastUpdated'
      ];

      let csvData = csvHeaders.join(',') + '\n';

      // Add inventory levels data
      for (const level of inventoryLevels) {
        const row = [
          level.categoryGroupId,
          `"${level.name}"`, // Quote name in case it contains commas
          level.currentInventory.toString(),
          level.inventoryUnit,
          level.inventoryType,
          level.minimumThreshold.toString(),
          level.status,
          level.lastInventoryUpdate?.toDate?.()?.toISOString() || ''
        ];
        csvData += row.join(',') + '\n';
      }

      // Optionally include movement history
      if (includeMovements) {
        csvData += '\n--- INVENTORY MOVEMENTS ---\n';
        csvData += 'MovementId,CategoryGroupId,MovementType,Quantity,Unit,PreviousInventory,NewInventory,TransactionRef,OrderRef,ProductSku,Platform,Reason,Notes,AdjustedBy,CreatedAt\n';

        const filters: MovementFilters = {
          limit: 1000,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        };

        const movements = await this.getInventoryMovements(filters);
        
        for (const movement of movements) {
          const row = [
            movement.id || '',
            movement.categoryGroupId,
            movement.movementType,
            movement.quantity.toString(),
            movement.unit,
            movement.previousInventory.toString(),
            movement.newInventory.toString(),
            movement.transactionReference || '',
            movement.orderReference || '',
            movement.productSku || '',
            movement.platform || '',
            movement.reason || '',
            `"${movement.notes || ''}"`,
            movement.adjustedBy || '',
            movement.createdAt?.toDate?.()?.toISOString() || ''
          ];
          csvData += row.join(',') + '\n';
        }
      }

      return csvData;
    } catch (error) {
      console.error('Error exporting inventory data:', error);
      throw new Error(`Failed to export inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import inventory data from CSV with unit type validation
   * 
   * This method imports inventory data from CSV format, validating unit types
   * and ensuring data consistency. It supports both inventory level updates
   * and movement history import with comprehensive validation.
   * 
   * @param csvData CSV formatted inventory data
   * @param options Import configuration options
   * @returns Promise resolving to import results with validation summary
   * 
   * Requirements Coverage:
   * - R2: Multi-Unit Type Support - validates unit consistency during import
   * - AC6: Import/Export with unit type preservation and consistency validation
   */
  async importInventoryData(
    csvData: string,
    options: {
      updateExisting?: boolean;
      validateOnly?: boolean;
      skipMovements?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
    skipped: number;
  }> {
    const result = {
      success: false,
      imported: 0,
      errors: [] as string[],
      warnings: [] as string[],
      skipped: 0
    };

    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        result.errors.push('CSV must contain at least header and one data row');
        return result;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const expectedHeaders = ['CategoryGroupId', 'CategoryGroupName', 'CurrentInventory', 'InventoryUnit', 'InventoryType', 'MinimumThreshold', 'Status', 'LastUpdated'];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
        return result;
      }

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('---')) continue; // Skip empty lines and section separators

        const values = this.parseCSVLine(line);
        if (values.length < expectedHeaders.length) {
          result.warnings.push(`Row ${i + 1}: Insufficient columns, skipping`);
          result.skipped++;
          continue;
        }

        try {
          const rowData = {
            categoryGroupId: values[0],
            name: values[1].replace(/"/g, ''), // Remove quotes
            currentInventory: parseFloat(values[2]),
            inventoryUnit: values[3] as 'kg' | 'g' | 'pcs',
            inventoryType: values[4] as 'weight' | 'qty',
            minimumThreshold: parseFloat(values[5])
          };

          // Validate unit type consistency
          const unitValidation = this.validateUnitConsistency(rowData.inventoryType, rowData.inventoryUnit);
          if (!unitValidation.isValid) {
            result.errors.push(`Row ${i + 1}: ${unitValidation.error}`);
            continue;
          }

          // Validate numeric values
          if (isNaN(rowData.currentInventory) || isNaN(rowData.minimumThreshold)) {
            result.errors.push(`Row ${i + 1}: Invalid numeric values for inventory or threshold`);
            continue;
          }

          if (rowData.currentInventory < 0) {
            result.errors.push(`Row ${i + 1}: Current inventory cannot be negative`);
            continue;
          }

          // If validation only, don't actually update
          if (options.validateOnly) {
            result.imported++;
            continue;
          }

          // Check if category group exists
          const categoryGroup = await this.categoryGroupService.getCategoryGroup(rowData.categoryGroupId);
          if (!categoryGroup) {
            result.warnings.push(`Row ${i + 1}: Category group ${rowData.categoryGroupId} not found, skipping`);
            result.skipped++;
            continue;
          }

          // Update inventory if category group exists
          if (options.updateExisting || categoryGroup.currentInventory === undefined) {
            await this.categoryGroupService.updateInventory(
              rowData.categoryGroupId,
              rowData.currentInventory,
              'adjustment'
            );
            result.imported++;
          } else {
            result.warnings.push(`Row ${i + 1}: Category group exists and updateExisting=false, skipping`);
            result.skipped++;
          }

        } catch (rowError) {
          result.errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
      
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Parse CSV line handling quoted fields and commas
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Validate unit type consistency
   */
  private validateUnitConsistency(inventoryType: string, inventoryUnit: string): { isValid: boolean; error?: string } {
    if (inventoryType === 'weight') {
      if (!['kg', 'g'].includes(inventoryUnit)) {
        return { isValid: false, error: `Invalid unit '${inventoryUnit}' for weight-based inventory. Expected 'kg' or 'g'` };
      }
    } else if (inventoryType === 'qty') {
      if (inventoryUnit !== 'pcs') {
        return { isValid: false, error: `Invalid unit '${inventoryUnit}' for quantity-based inventory. Expected 'pcs'` };
      }
    } else {
      return { isValid: false, error: `Invalid inventory type '${inventoryType}'. Expected 'weight' or 'qty'` };
    }
    
    return { isValid: true };
  }
}