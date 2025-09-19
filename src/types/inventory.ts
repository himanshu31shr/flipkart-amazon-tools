import { Timestamp } from 'firebase/firestore';

export interface InventoryMovement {
  id?: string;
  categoryGroupId: string;
  movementType: 'deduction' | 'addition' | 'adjustment' | 'initial';
  quantity: number;
  unit: 'kg' | 'g' | 'pcs';
  previousInventory: number;
  newInventory: number;
  
  // Order processing context fields (for automatic movements)
  transactionReference?: string;
  orderReference?: string;
  productSku?: string;
  platform?: 'amazon' | 'flipkart';
  
  // Manual adjustment context fields
  reason?: string;
  notes?: string;
  adjustedBy?: string; // User ID or identifier
  
  // Audit trail
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InventoryMovementFormData {
  categoryGroupId: string;
  movementType: 'addition' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface InventoryMovementValidationResult {
  isValid: boolean;
  errors: {
    categoryGroupId?: string;
    movementType?: string;
    quantity?: string;
    reason?: string;
    notes?: string;
  };
}

// Predefined reason codes for manual inventory adjustments
export const INVENTORY_ADJUSTMENT_REASONS = [
  'stock_received',
  'stock_damaged',
  'stock_expired',
  'stock_returned',
  'stock_counted',
  'stock_transferred',
  'stock_lost',
  'correction',
  'other'
] as const;

export type InventoryAdjustmentReason = typeof INVENTORY_ADJUSTMENT_REASONS[number];

export interface InventoryHistoryFilter {
  categoryGroupId?: string;
  movementType?: InventoryMovement['movementType'];
  startDate?: Date;
  endDate?: Date;
  platform?: 'amazon' | 'flipkart';
  adjustedBy?: string;
}

export interface InventoryAlert {
  id?: string;
  categoryGroupId: string;
  alertType: 'low_stock' | 'zero_stock' | 'negative_stock';
  currentLevel: number;
  thresholdLevel: number;
  unit: 'kg' | 'g' | 'pcs';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  
  // User acknowledgment tracking
  acknowledgedBy?: string; // User ID or identifier
  acknowledgedAt?: Timestamp;
  
  // Alert lifecycle timestamps
  createdAt?: Timestamp;
  resolvedAt?: Timestamp;
}

// Service Layer Interfaces

export interface ManualInventoryAdjustment {
  categoryGroupId: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: InventoryAdjustmentReason;
  notes?: string;
  adjustedBy: string; // User ID or identifier
}

export interface InventoryDeductionItem {
  categoryGroupId: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pcs';
  productSku?: string;
  orderReference?: string;
  transactionReference?: string;
  platform?: 'amazon' | 'flipkart';
}

export interface InventoryDeductionResult {
  deductions: {
    categoryGroupId: string;
    requestedQuantity: number;
    deductedQuantity: number;
    newInventoryLevel: number;
    movementId: string;
  }[];
  warnings: {
    categoryGroupId: string;
    warning: string;
    requestedQuantity: number;
    availableQuantity: number;
  }[];
  errors: {
    categoryGroupId: string;
    error: string;
    requestedQuantity: number;
    reason: string;
  }[];
}

export interface MovementFilters {
  categoryGroupId?: string;
  movementType?: InventoryMovement['movementType'];
  startDate?: Date;
  endDate?: Date;
  platform?: 'amazon' | 'flipkart';
  adjustedBy?: string;
  transactionReference?: string;
  orderReference?: string;
  productSku?: string;
  reason?: InventoryAdjustmentReason;
  limit?: number;
  offset?: number;
}

export interface InventoryFilters {
  categoryGroupIds?: string[];
  lowStock?: boolean;
  zeroStock?: boolean;
  negativeStock?: boolean;
  healthyStock?: boolean;
  inventoryType?: 'weight' | 'qty';
  unit?: 'kg' | 'g' | 'pcs';
  minThreshold?: number;
  maxThreshold?: number;
  lastUpdatedAfter?: Date;
  lastUpdatedBefore?: Date;
  searchTerm?: string; // For searching by category group name/description
  sortBy?: 'name' | 'currentInventory' | 'lastUpdated' | 'threshold';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export type InventoryStatus = 'healthy' | 'low_stock' | 'zero_stock' | 'negative_stock';

export interface InventoryLevel {
  categoryGroupId: string;
  name: string;
  currentInventory: number;
  inventoryUnit: 'kg' | 'g' | 'pcs';
  inventoryType: 'weight' | 'qty';
  minimumThreshold: number;
  status: InventoryStatus;
  lastInventoryUpdate?: Timestamp;
}