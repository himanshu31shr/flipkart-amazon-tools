import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';
import { InventoryService } from '../../services/inventory.service';
import { AlertingService } from '../../services/alerting.service';
import {
  InventoryLevel,
  InventoryMovement,
  InventoryAlert,
  InventoryDeductionItem,
  InventoryDeductionResult,
  ManualInventoryAdjustment,
  MovementFilters,
  InventoryFilters
} from '../../types/inventory';

export interface InventoryState {
  // Inventory levels data
  inventoryLevels: InventoryLevel[];
  filteredInventoryLevels: InventoryLevel[];
  
  // Inventory movements data
  inventoryMovements: InventoryMovement[];
  filteredInventoryMovements: InventoryMovement[];
  
  // Alerts data
  inventoryAlerts: InventoryAlert[];
  activeInventoryAlerts: InventoryAlert[];
  
  // Loading states for different operations
  loading: {
    inventoryLevels: boolean;
    inventoryMovements: boolean;
    inventoryAlerts: boolean;
    deduction: boolean;
    adjustment: boolean;
    alertCreation: boolean;
    alertAcknowledgment: boolean;
    alertResolution: boolean;
  };
  
  // Error handling
  error: {
    inventoryLevels: string | null;
    inventoryMovements: string | null;
    inventoryAlerts: string | null;
    deduction: string | null;
    adjustment: string | null;
    alertCreation: string | null;
    alertAcknowledgment: string | null;
    alertResolution: string | null;
  };
  
  // Filters and pagination state
  filters: {
    inventory: InventoryFilters;
    movements: MovementFilters;
  };
  
  // Pagination state
  pagination: {
    inventoryLevels: {
      currentPage: number;
      pageSize: number;
      totalItems: number;
      hasNextPage: boolean;
    };
    inventoryMovements: {
      currentPage: number;
      pageSize: number;
      totalItems: number;
      hasNextPage: boolean;
    };
  };
  
  // Cache management
  lastFetched: {
    inventoryLevels: number | null;
    inventoryMovements: number | null;
    inventoryAlerts: number | null;
  };
  
  // UI state
  selectedInventoryLevel: string | null;
  selectedMovement: string | null;
  selectedAlert: string | null;
  
  // Recent operation results
  lastDeductionResult: InventoryDeductionResult | null;
}

const initialState: InventoryState = {
  inventoryLevels: [],
  filteredInventoryLevels: [],
  inventoryMovements: [],
  filteredInventoryMovements: [],
  inventoryAlerts: [],
  activeInventoryAlerts: [],
  
  loading: {
    inventoryLevels: false,
    inventoryMovements: false,
    inventoryAlerts: false,
    deduction: false,
    adjustment: false,
    alertCreation: false,
    alertAcknowledgment: false,
    alertResolution: false,
  },
  
  error: {
    inventoryLevels: null,
    inventoryMovements: null,
    inventoryAlerts: null,
    deduction: null,
    adjustment: null,
    alertCreation: null,
    alertAcknowledgment: null,
    alertResolution: null,
  },
  
  filters: {
    inventory: {},
    movements: {},
  },
  
  pagination: {
    inventoryLevels: {
      currentPage: 1,
      pageSize: 20,
      totalItems: 0,
      hasNextPage: false,
    },
    inventoryMovements: {
      currentPage: 1,
      pageSize: 20,
      totalItems: 0,
      hasNextPage: false,
    },
  },
  
  lastFetched: {
    inventoryLevels: null,
    inventoryMovements: null,
    inventoryAlerts: null,
  },
  
  selectedInventoryLevel: null,
  selectedMovement: null,
  selectedAlert: null,
  lastDeductionResult: null,
};

// Service instances
const inventoryService = new InventoryService();
const alertingService = new AlertingService();

// Async thunks for inventory levels
export const fetchInventoryLevels = createAsyncThunk(
  'inventory/fetchInventoryLevels',
  async () => {
    return await inventoryService.getInventoryLevels();
  }
);

// Async thunks for inventory movements
export const fetchInventoryMovements = createAsyncThunk(
  'inventory/fetchInventoryMovements',
  async (filters: MovementFilters) => {
    return await inventoryService.getInventoryMovements(filters);
  }
);

// Async thunks for inventory deductions (order processing)
export const processInventoryDeductions = createAsyncThunk(
  'inventory/processInventoryDeductions',
  async (orderItems: InventoryDeductionItem[]) => {
    return await inventoryService.deductInventoryFromOrder(orderItems);
  }
);

// Async thunks for manual inventory adjustments
export const adjustInventoryManually = createAsyncThunk(
  'inventory/adjustInventoryManually',
  async (adjustment: ManualInventoryAdjustment) => {
    await inventoryService.adjustInventoryManually(adjustment);
    return adjustment;
  }
);

// Async thunks for inventory alerts
export const fetchInventoryAlerts = createAsyncThunk(
  'inventory/fetchInventoryAlerts',
  async () => {
    return await alertingService.getInventoryAlerts();
  }
);

export const createInventoryAlert = createAsyncThunk(
  'inventory/createInventoryAlert',
  async (params: {
    categoryGroupId: string;
    alertType: InventoryAlert['alertType'];
    currentLevel: number;
    thresholdLevel: number;
    unit: 'kg' | 'g' | 'pcs';
    severity: InventoryAlert['severity'];
  }) => {
    return await alertingService.createInventoryAlert(
      params.categoryGroupId,
      params.alertType,
      params.currentLevel,
      params.thresholdLevel,
      params.unit,
      params.severity
    );
  }
);

export const acknowledgeInventoryAlert = createAsyncThunk(
  'inventory/acknowledgeInventoryAlert',
  async (params: { alertId: string; acknowledgedBy: string }) => {
    // For acknowledge, we just update the acknowledgment fields without resolving
    const alertData = {
      acknowledgedBy: params.acknowledgedBy,
      acknowledgedAt: Timestamp.now()
    };
    await alertingService.updateInventoryAlert(params.alertId, alertData);
    
    // Return the updated alert
    const updatedAlert = await alertingService.getInventoryAlert(params.alertId);
    if (!updatedAlert) {
      throw new Error('Failed to fetch updated alert');
    }
    return updatedAlert;
  }
);

export const resolveInventoryAlert = createAsyncThunk(
  'inventory/resolveInventoryAlert',
  async (params: { alertId: string; acknowledgedBy: string }) => {
    return await alertingService.resolveInventoryAlert(
      params.alertId,
      params.acknowledgedBy
    );
  }
);

// Helper function to apply inventory filters
const applyInventoryFilters = (
  inventoryLevels: InventoryLevel[],
  filters: InventoryFilters
): InventoryLevel[] => {
  if (!inventoryLevels || !Array.isArray(inventoryLevels)) {
    return [];
  }
  
  return inventoryLevels.filter(level => {
    // Filter by category group IDs
    if (filters.categoryGroupIds && filters.categoryGroupIds.length > 0) {
      if (!filters.categoryGroupIds.includes(level.categoryGroupId)) {
        return false;
      }
    }
    
    // Filter by stock status - if any status filters are active, check if the level's status matches any of them
    const statusFilters = [
      filters.lowStock && 'low_stock',
      filters.zeroStock && 'zero_stock', 
      filters.negativeStock && 'negative_stock',
      filters.healthyStock && 'healthy'
    ].filter(Boolean);
    
    // If we have status filters, the level must match one of them
    if (statusFilters.length > 0) {
      if (!statusFilters.includes(level.status)) {
        return false;
      }
    }
    
    // Filter by inventory type
    if (filters.inventoryType && level.inventoryType !== filters.inventoryType) {
      return false;
    }
    
    // Filter by unit
    if (filters.unit && level.inventoryUnit !== filters.unit) {
      return false;
    }
    
    // Filter by threshold range
    if (filters.minThreshold && level.minimumThreshold < filters.minThreshold) {
      return false;
    }
    if (filters.maxThreshold && level.minimumThreshold > filters.maxThreshold) {
      return false;
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!level.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
};

// Helper function to apply movement filters
const applyMovementFilters = (
  movements: InventoryMovement[],
  filters: MovementFilters
): InventoryMovement[] => {
  return movements.filter(movement => {
    // Filter by category group ID
    if (filters.categoryGroupId && movement.categoryGroupId !== filters.categoryGroupId) {
      return false;
    }
    
    // Filter by movement type
    if (filters.movementType && movement.movementType !== filters.movementType) {
      return false;
    }
    
    // Filter by platform
    if (filters.platform && movement.platform !== filters.platform) {
      return false;
    }
    
    // Filter by adjusted by
    if (filters.adjustedBy && movement.adjustedBy !== filters.adjustedBy) {
      return false;
    }
    
    // Filter by transaction reference
    if (filters.transactionReference && movement.transactionReference !== filters.transactionReference) {
      return false;
    }
    
    // Filter by order reference
    if (filters.orderReference && movement.orderReference !== filters.orderReference) {
      return false;
    }
    
    // Filter by product SKU
    if (filters.productSku && movement.productSku !== filters.productSku) {
      return false;
    }
    
    // Filter by reason
    if (filters.reason && movement.reason !== filters.reason) {
      return false;
    }
    
    // Filter by date range
    if (filters.startDate && movement.createdAt) {
      const createdDate = movement.createdAt.toDate();
      if (createdDate < filters.startDate) {
        return false;
      }
    }
    
    if (filters.endDate && movement.createdAt) {
      const createdDate = movement.createdAt.toDate();
      if (createdDate > filters.endDate) {
        return false;
      }
    }
    
    return true;
  });
};

// Export/Import async thunks for Requirement 2: Multi-Unit Type Support
export const exportInventoryData = createAsyncThunk(
  'inventory/exportInventoryData',
  async (params: {
    includeMovements?: boolean;
    dateRange?: { startDate: Date; endDate: Date };
  }) => {
    const inventoryService = new InventoryService();
    return await inventoryService.exportInventoryData(
      params.includeMovements || false,
      params.dateRange
    );
  }
);

export const importInventoryData = createAsyncThunk(
  'inventory/importInventoryData',
  async (params: {
    csvData: string;
    options?: {
      updateExisting?: boolean;
      validateOnly?: boolean;
      skipMovements?: boolean;
    };
  }) => {
    const inventoryService = new InventoryService();
    return await inventoryService.importInventoryData(
      params.csvData,
      params.options || {}
    );
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    // Inventory filters
    setInventoryFilters: (state, action: PayloadAction<Partial<InventoryFilters>>) => {
      state.filters.inventory = { ...state.filters.inventory, ...action.payload };
      state.filteredInventoryLevels = applyInventoryFilters(
        state.inventoryLevels || [],
        state.filters.inventory
      );
    },
    
    clearInventoryFilters: (state) => {
      state.filters.inventory = {};
      state.filteredInventoryLevels = state.inventoryLevels || [];
    },
    
    // Movement filters
    setMovementFilters: (state, action: PayloadAction<Partial<MovementFilters>>) => {
      state.filters.movements = { ...state.filters.movements, ...action.payload };
      state.filteredInventoryMovements = applyMovementFilters(
        state.inventoryMovements,
        state.filters.movements
      );
    },
    
    clearMovementFilters: (state) => {
      state.filters.movements = {};
      state.filteredInventoryMovements = state.inventoryMovements;
    },
    
    // Selection management
    selectInventoryLevel: (state, action: PayloadAction<string | null>) => {
      state.selectedInventoryLevel = action.payload;
    },
    
    selectMovement: (state, action: PayloadAction<string | null>) => {
      state.selectedMovement = action.payload;
    },
    
    selectAlert: (state, action: PayloadAction<string | null>) => {
      state.selectedAlert = action.payload;
    },
    
    // Pagination
    setInventoryLevelsPagination: (state, action: PayloadAction<Partial<typeof state.pagination.inventoryLevels>>) => {
      state.pagination.inventoryLevels = { ...state.pagination.inventoryLevels, ...action.payload };
    },
    
    setInventoryMovementsPagination: (state, action: PayloadAction<Partial<typeof state.pagination.inventoryMovements>>) => {
      state.pagination.inventoryMovements = { ...state.pagination.inventoryMovements, ...action.payload };
    },
    
    // Error clearing
    clearInventoryLevelsError: (state) => {
      state.error.inventoryLevels = null;
    },
    
    clearInventoryMovementsError: (state) => {
      state.error.inventoryMovements = null;
    },
    
    clearInventoryAlertsError: (state) => {
      state.error.inventoryAlerts = null;
    },
    
    clearDeductionError: (state) => {
      state.error.deduction = null;
    },
    
    clearAdjustmentError: (state) => {
      state.error.adjustment = null;
    },
    
    clearAlertCreationError: (state) => {
      state.error.alertCreation = null;
    },
    
    clearAlertAcknowledgmentError: (state) => {
      state.error.alertAcknowledgment = null;
    },
    
    clearAlertResolutionError: (state) => {
      state.error.alertResolution = null;
    },
    
    // Clear last deduction result
    clearLastDeductionResult: (state) => {
      state.lastDeductionResult = null;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Inventory Levels
    builder
      .addCase(fetchInventoryLevels.pending, (state) => {
        state.loading.inventoryLevels = true;
        state.error.inventoryLevels = null;
      })
      .addCase(fetchInventoryLevels.fulfilled, (state, action) => {
        state.loading.inventoryLevels = false;
        state.inventoryLevels = action.payload;
        state.filteredInventoryLevels = applyInventoryFilters(
          action.payload,
          state.filters.inventory
        );
        state.lastFetched.inventoryLevels = Date.now();
      })
      .addCase(fetchInventoryLevels.rejected, (state, action) => {
        state.loading.inventoryLevels = false;
        state.error.inventoryLevels = action.error.message || 'Failed to fetch inventory levels';
      })
      
      // Fetch Inventory Movements
      .addCase(fetchInventoryMovements.pending, (state) => {
        state.loading.inventoryMovements = true;
        state.error.inventoryMovements = null;
      })
      .addCase(fetchInventoryMovements.fulfilled, (state, action) => {
        state.loading.inventoryMovements = false;
        state.inventoryMovements = action.payload;
        state.filteredInventoryMovements = applyMovementFilters(
          action.payload,
          state.filters.movements
        );
        state.lastFetched.inventoryMovements = Date.now();
      })
      .addCase(fetchInventoryMovements.rejected, (state, action) => {
        state.loading.inventoryMovements = false;
        state.error.inventoryMovements = action.error.message || 'Failed to fetch inventory movements';
      })
      
      // Process Inventory Deductions
      .addCase(processInventoryDeductions.pending, (state) => {
        state.loading.deduction = true;
        state.error.deduction = null;
        state.lastDeductionResult = null;
      })
      .addCase(processInventoryDeductions.fulfilled, (state, action) => {
        state.loading.deduction = false;
        state.lastDeductionResult = action.payload;
        
        // Invalidate inventory levels cache to force refresh
        state.lastFetched.inventoryLevels = null;
      })
      .addCase(processInventoryDeductions.rejected, (state, action) => {
        state.loading.deduction = false;
        state.error.deduction = action.error.message || 'Failed to process inventory deductions';
      })
      
      // Adjust Inventory Manually
      .addCase(adjustInventoryManually.pending, (state) => {
        state.loading.adjustment = true;
        state.error.adjustment = null;
      })
      .addCase(adjustInventoryManually.fulfilled, (state) => {
        state.loading.adjustment = false;
        
        // Invalidate cache to force refresh
        state.lastFetched.inventoryLevels = null;
        state.lastFetched.inventoryMovements = null;
      })
      .addCase(adjustInventoryManually.rejected, (state, action) => {
        state.loading.adjustment = false;
        state.error.adjustment = action.error.message || 'Failed to adjust inventory manually';
      })
      
      // Fetch Inventory Alerts
      .addCase(fetchInventoryAlerts.pending, (state) => {
        state.loading.inventoryAlerts = true;
        state.error.inventoryAlerts = null;
      })
      .addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
        state.loading.inventoryAlerts = false;
        state.inventoryAlerts = action.payload;
        state.activeInventoryAlerts = action.payload.filter(alert => alert.isActive);
        state.lastFetched.inventoryAlerts = Date.now();
      })
      .addCase(fetchInventoryAlerts.rejected, (state, action) => {
        state.loading.inventoryAlerts = false;
        state.error.inventoryAlerts = action.error.message || 'Failed to fetch inventory alerts';
      })
      
      // Create Inventory Alert
      .addCase(createInventoryAlert.pending, (state) => {
        state.loading.alertCreation = true;
        state.error.alertCreation = null;
      })
      .addCase(createInventoryAlert.fulfilled, (state, action) => {
        state.loading.alertCreation = false;
        state.inventoryAlerts.push(action.payload);
        
        if (action.payload.isActive) {
          state.activeInventoryAlerts.push(action.payload);
        }
      })
      .addCase(createInventoryAlert.rejected, (state, action) => {
        state.loading.alertCreation = false;
        state.error.alertCreation = action.error.message || 'Failed to create inventory alert';
      })
      
      // Acknowledge Inventory Alert
      .addCase(acknowledgeInventoryAlert.pending, (state) => {
        state.loading.alertAcknowledgment = true;
        state.error.alertAcknowledgment = null;
      })
      .addCase(acknowledgeInventoryAlert.fulfilled, (state, action) => {
        state.loading.alertAcknowledgment = false;
        
        // Update the alert in both arrays
        const alertIndex = state.inventoryAlerts.findIndex(alert => alert.id === action.payload.id);
        if (alertIndex !== -1) {
          state.inventoryAlerts[alertIndex] = action.payload;
        }
        
        const activeAlertIndex = state.activeInventoryAlerts.findIndex(alert => alert.id === action.payload.id);
        if (activeAlertIndex !== -1) {
          state.activeInventoryAlerts[activeAlertIndex] = action.payload;
        }
      })
      .addCase(acknowledgeInventoryAlert.rejected, (state, action) => {
        state.loading.alertAcknowledgment = false;
        state.error.alertAcknowledgment = action.error.message || 'Failed to acknowledge inventory alert';
      })
      
      // Resolve Inventory Alert
      .addCase(resolveInventoryAlert.pending, (state) => {
        state.loading.alertResolution = true;
        state.error.alertResolution = null;
      })
      .addCase(resolveInventoryAlert.fulfilled, (state, action) => {
        state.loading.alertResolution = false;
        
        // Update the alert in both arrays
        const alertIndex = state.inventoryAlerts.findIndex(alert => alert.id === action.payload.id);
        if (alertIndex !== -1) {
          state.inventoryAlerts[alertIndex] = action.payload;
        }
        
        // Remove from active alerts if it's no longer active
        if (!action.payload.isActive) {
          state.activeInventoryAlerts = state.activeInventoryAlerts.filter(
            alert => alert.id !== action.payload.id
          );
        }
      })
      .addCase(resolveInventoryAlert.rejected, (state, action) => {
        state.loading.alertResolution = false;
        state.error.alertResolution = action.error.message || 'Failed to resolve inventory alert';
      })
      
      // Export Inventory Data
      .addCase(exportInventoryData.pending, (state) => {
        state.loading.inventoryLevels = true;
        state.error.inventoryLevels = null;
      })
      .addCase(exportInventoryData.fulfilled, (state) => {
        state.loading.inventoryLevels = false;
      })
      .addCase(exportInventoryData.rejected, (state, action) => {
        state.loading.inventoryLevels = false;
        state.error.inventoryLevels = action.error.message || 'Failed to export inventory data';
      })
      
      // Import Inventory Data
      .addCase(importInventoryData.pending, (state) => {
        state.loading.adjustment = true;
        state.error.adjustment = null;
      })
      .addCase(importInventoryData.fulfilled, (state) => {
        state.loading.adjustment = false;
        // Optionally trigger a refresh of inventory levels after successful import
      })
      .addCase(importInventoryData.rejected, (state, action) => {
        state.loading.adjustment = false;
        state.error.adjustment = action.error.message || 'Failed to import inventory data';
      });
  },
});

export const {
  setInventoryFilters,
  clearInventoryFilters,
  setMovementFilters,
  clearMovementFilters,
  selectInventoryLevel,
  selectMovement,
  selectAlert,
  setInventoryLevelsPagination,
  setInventoryMovementsPagination,
  clearInventoryLevelsError,
  clearInventoryMovementsError,
  clearInventoryAlertsError,
  clearDeductionError,
  clearAdjustmentError,
  clearAlertCreationError,
  clearAlertAcknowledgmentError,
  clearAlertResolutionError,
  clearLastDeductionResult,
} = inventorySlice.actions;

// Selectors
export const selectInventoryLevels = (state: { inventory: InventoryState }) => 
  state.inventory.filteredInventoryLevels;

export const selectInventoryMovements = (state: { inventory: InventoryState }) => 
  state.inventory.filteredInventoryMovements;

export const selectInventoryAlerts = (state: { inventory: InventoryState }) => 
  state.inventory.inventoryAlerts;

export const selectActiveInventoryAlerts = (state: { inventory: InventoryState }) => 
  state.inventory.activeInventoryAlerts;

export const selectInventoryLoading = (state: { inventory: InventoryState }) => 
  state.inventory.loading;

export const selectInventoryErrors = (state: { inventory: InventoryState }) => 
  state.inventory.error;

export const selectInventoryFilters = (state: { inventory: InventoryState }) => 
  state.inventory.filters;

export const selectInventoryPagination = (state: { inventory: InventoryState }) => 
  state.inventory.pagination;

export const selectSelectedInventoryLevel = (state: { inventory: InventoryState }) => 
  state.inventory.selectedInventoryLevel;

export const selectSelectedMovement = (state: { inventory: InventoryState }) => 
  state.inventory.selectedMovement;

export const selectSelectedAlert = (state: { inventory: InventoryState }) => 
  state.inventory.selectedAlert;

export const selectLastDeductionResult = (state: { inventory: InventoryState }) => 
  state.inventory.lastDeductionResult;

export const selectInventoryLevelsLastFetched = (state: { inventory: InventoryState }) => 
  state.inventory.lastFetched.inventoryLevels;

export const selectInventoryMovementsLastFetched = (state: { inventory: InventoryState }) => 
  state.inventory.lastFetched.inventoryMovements;

export const selectInventoryAlertsLastFetched = (state: { inventory: InventoryState }) => 
  state.inventory.lastFetched.inventoryAlerts;

export const inventoryReducer = inventorySlice.reducer;
export default inventorySlice.reducer;