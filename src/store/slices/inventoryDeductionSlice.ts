import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InventoryOrderProcessor } from '../../services/inventoryOrderProcessor.service';
import { InventoryDeductionResult } from '../../types/inventory';
import { InventoryDeductionPreview } from '../../services/inventoryOrderProcessor.service';
import { ProductSummary } from '../../pages/home/services/base.transformer';

export interface DeductionActivity {
  id: string;
  timestamp: Date;
  orderId?: string;
  platform: 'amazon' | 'flipkart';
  categoryId: string;
  categoryName: string;
  productName: string;
  productSku: string;
  quantityDeducted: number;
  unit: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
}

export interface DeductionAlert {
  id: string;
  type: 'low_stock_after_deduction' | 'negative_stock_warning' | 'deduction_failed';
  categoryId: string;
  categoryName: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
  timestamp: Date;
  dismissed: boolean;
}

export interface InventoryDeductionState {
  // Processing status
  processing: boolean;
  error: string | null;
  
  // Deduction results and previews
  lastDeductionResult: InventoryDeductionResult | null;
  currentPreview: InventoryDeductionPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  
  // Activity tracking
  recentActivity: DeductionActivity[];
  activityLoading: boolean;
  activityError: string | null;
  
  // Alerts and notifications
  alerts: DeductionAlert[];
  alertsLoading: boolean;
  alertsError: string | null;
  unreadAlertsCount: number;
  
  // Real-time status
  activeDeductions: Record<string, DeductionActivity>; // orderId -> activity
  totalDeductionsToday: number;
  totalQuantityDeductedToday: number;
  
  // Configuration and validation
  validationResults: Record<string, boolean>; // categoryId -> isValid
  validationLoading: boolean;
}

const initialState: InventoryDeductionState = {
  // Processing status
  processing: false,
  error: null,
  
  // Deduction results and previews
  lastDeductionResult: null,
  currentPreview: null,
  previewLoading: false,
  previewError: null,
  
  // Activity tracking
  recentActivity: [],
  activityLoading: false,
  activityError: null,
  
  // Alerts and notifications
  alerts: [],
  alertsLoading: false,
  alertsError: null,
  unreadAlertsCount: 0,
  
  // Real-time status
  activeDeductions: {},
  totalDeductionsToday: 0,
  totalQuantityDeductedToday: 0,
  
  // Configuration and validation
  validationResults: {},
  validationLoading: false,
};

const inventoryOrderProcessor = new InventoryOrderProcessor();

// Async thunks for deduction operations
export const processOrderDeductions = createAsyncThunk(
  'inventoryDeduction/processOrderDeductions',
  async (orderItems: ProductSummary[], { rejectWithValue }) => {
    try {
      const result = await inventoryOrderProcessor.processOrderWithCategoryDeduction(orderItems);
      return result;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to process order deductions');
    }
  }
);

export const previewOrderDeductions = createAsyncThunk(
  'inventoryDeduction/previewOrderDeductions',
  async (orderItems: ProductSummary[], { rejectWithValue }) => {
    try {
      const preview = await inventoryOrderProcessor.previewCategoryDeductions(orderItems);
      return preview;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to preview order deductions');
    }
  }
);

export const fetchRecentDeductionActivity = createAsyncThunk(
  'inventoryDeduction/fetchRecentActivity',
  async ({ limit = 50 }: { limit?: number } = {}, { rejectWithValue }) => {
    try {
      // TODO: Implement actual service call with limit parameter
      // For now, return mock data
      const mockActivity: DeductionActivity[] = [];
      // Use limit to control the number of returned activities when implemented
      return mockActivity.slice(0, limit);
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to fetch recent deduction activity');
    }
  }
);

export const fetchDeductionAlerts = createAsyncThunk(
  'inventoryDeduction/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implement actual service call
      // For now, return mock data
      const mockAlerts: DeductionAlert[] = [];
      return mockAlerts;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to fetch deduction alerts');
    }
  }
);

export const validateCategoryDeductionConfig = createAsyncThunk(
  'inventoryDeduction/validateConfig',
  async (categoryIds: string[], { rejectWithValue }) => {
    try {
      const validationResults: Record<string, boolean> = {};
      
      // TODO: Implement actual validation logic
      categoryIds.forEach(categoryId => {
        validationResults[categoryId] = true; // Mock validation
      });
      
      return validationResults;
    } catch (error: unknown) {
      return rejectWithValue((error as Error).message || 'Failed to validate category deduction configuration');
    }
  }
);

const inventoryDeductionSlice = createSlice({
  name: 'inventoryDeduction',
  initialState,
  reducers: {
    // Processing status management
    clearError: (state) => {
      state.error = null;
    },
    
    clearPreviewError: (state) => {
      state.previewError = null;
    },
    
    clearActivityError: (state) => {
      state.activityError = null;
    },
    
    clearAlertsError: (state) => {
      state.alertsError = null;
    },
    
    // Preview management
    clearCurrentPreview: (state) => {
      state.currentPreview = null;
      state.previewError = null;
    },
    
    // Activity management
    addDeductionActivity: (state, action: PayloadAction<DeductionActivity>) => {
      state.recentActivity.unshift(action.payload);
      
      // Keep only the most recent 100 activities
      if (state.recentActivity.length > 100) {
        state.recentActivity = state.recentActivity.slice(0, 100);
      }
      
      // Update daily totals if activity is from today
      const today = new Date();
      const activityDate = new Date(action.payload.timestamp);
      if (activityDate.toDateString() === today.toDateString()) {
        if (action.payload.status === 'success') {
          state.totalDeductionsToday += 1;
          state.totalQuantityDeductedToday += action.payload.quantityDeducted;
        }
      }
    },
    
    updateDeductionActivity: (state, action: PayloadAction<DeductionActivity>) => {
      const index = state.recentActivity.findIndex(activity => activity.id === action.payload.id);
      if (index !== -1) {
        state.recentActivity[index] = action.payload;
      }
    },
    
    // Active deductions management
    startDeduction: (state, action: PayloadAction<DeductionActivity>) => {
      if (action.payload.orderId) {
        state.activeDeductions[action.payload.orderId] = action.payload;
      }
    },
    
    completeDeduction: (state, action: PayloadAction<{ orderId: string; status: 'success' | 'failed'; errorMessage?: string }>) => {
      const { orderId, status, errorMessage } = action.payload;
      const activeDeduction = state.activeDeductions[orderId];
      
      if (activeDeduction) {
        // Update the active deduction
        activeDeduction.status = status;
        if (errorMessage) {
          activeDeduction.errorMessage = errorMessage;
        }
        
        // Move to recent activity
        state.recentActivity.unshift(activeDeduction);
        
        // Remove from active deductions
        delete state.activeDeductions[orderId];
        
        // Update daily totals
        const today = new Date();
        const activityDate = new Date(activeDeduction.timestamp);
        if (activityDate.toDateString() === today.toDateString() && status === 'success') {
          state.totalDeductionsToday += 1;
          state.totalQuantityDeductedToday += activeDeduction.quantityDeducted;
        }
      }
    },
    
    // Alerts management
    addAlert: (state, action: PayloadAction<DeductionAlert>) => {
      state.alerts.unshift(action.payload);
      if (!action.payload.dismissed) {
        state.unreadAlertsCount += 1;
      }
    },
    
    dismissAlert: (state, action: PayloadAction<string>) => {
      const alertIndex = state.alerts.findIndex(alert => alert.id === action.payload);
      if (alertIndex !== -1 && !state.alerts[alertIndex].dismissed) {
        state.alerts[alertIndex].dismissed = true;
        state.unreadAlertsCount = Math.max(0, state.unreadAlertsCount - 1);
      }
    },
    
    dismissAllAlerts: (state) => {
      state.alerts.forEach(alert => {
        alert.dismissed = true;
      });
      state.unreadAlertsCount = 0;
    },
    
    removeAlert: (state, action: PayloadAction<string>) => {
      const alertIndex = state.alerts.findIndex(alert => alert.id === action.payload);
      if (alertIndex !== -1) {
        const wasUnread = !state.alerts[alertIndex].dismissed;
        state.alerts.splice(alertIndex, 1);
        if (wasUnread) {
          state.unreadAlertsCount = Math.max(0, state.unreadAlertsCount - 1);
        }
      }
    },
    
    // Daily totals reset (for use with daily reset scheduler)
    resetDailyTotals: (state) => {
      state.totalDeductionsToday = 0;
      state.totalQuantityDeductedToday = 0;
    },
    
    // Validation results management
    updateValidationResults: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.validationResults = { ...state.validationResults, ...action.payload };
    },
    
    clearValidationResults: (state) => {
      state.validationResults = {};
    },
  },
  extraReducers: (builder) => {
    // Process Order Deductions
    builder.addCase(processOrderDeductions.pending, (state) => {
      state.processing = true;
      state.error = null;
    });
    builder.addCase(processOrderDeductions.fulfilled, (state, action) => {
      state.processing = false;
      state.lastDeductionResult = action.payload.inventoryResult;
      
      // Add activities for successful deductions
      action.payload.orderItems.forEach(item => {
        if (item.SKU && item.quantity) {
          const activity: DeductionActivity = {
            id: `${Date.now()}-${item.SKU}`,
            timestamp: new Date(),
            orderId: item.orderId,
            platform: item.type,
            categoryId: item.categoryId || '',
            categoryName: item.category || '',
            productName: item.name,
            productSku: item.SKU,
            quantityDeducted: parseInt(item.quantity),
            unit: 'pcs', // Default unit, should be determined from category
            status: 'success',
          };
          
          state.recentActivity.unshift(activity);
        }
      });
      
      // Update daily totals
      const successfulDeductions = action.payload.orderItems.filter(item => item.SKU && item.quantity);
      state.totalDeductionsToday += successfulDeductions.length;
      state.totalQuantityDeductedToday += successfulDeductions.reduce((total, item) => 
        total + parseInt(item.quantity || '0'), 0
      );
    });
    builder.addCase(processOrderDeductions.rejected, (state, action) => {
      state.processing = false;
      state.error = action.payload as string;
    });
    
    // Preview Order Deductions
    builder.addCase(previewOrderDeductions.pending, (state) => {
      state.previewLoading = true;
      state.previewError = null;
    });
    builder.addCase(previewOrderDeductions.fulfilled, (state, action) => {
      state.previewLoading = false;
      state.currentPreview = action.payload;
    });
    builder.addCase(previewOrderDeductions.rejected, (state, action) => {
      state.previewLoading = false;
      state.previewError = action.payload as string;
    });
    
    // Fetch Recent Activity
    builder.addCase(fetchRecentDeductionActivity.pending, (state) => {
      state.activityLoading = true;
      state.activityError = null;
    });
    builder.addCase(fetchRecentDeductionActivity.fulfilled, (state, action) => {
      state.activityLoading = false;
      state.recentActivity = action.payload;
    });
    builder.addCase(fetchRecentDeductionActivity.rejected, (state, action) => {
      state.activityLoading = false;
      state.activityError = action.payload as string;
    });
    
    // Fetch Alerts
    builder.addCase(fetchDeductionAlerts.pending, (state) => {
      state.alertsLoading = true;
      state.alertsError = null;
    });
    builder.addCase(fetchDeductionAlerts.fulfilled, (state, action) => {
      state.alertsLoading = false;
      state.alerts = action.payload;
      state.unreadAlertsCount = action.payload.filter(alert => !alert.dismissed).length;
    });
    builder.addCase(fetchDeductionAlerts.rejected, (state, action) => {
      state.alertsLoading = false;
      state.alertsError = action.payload as string;
    });
    
    // Validate Configuration
    builder.addCase(validateCategoryDeductionConfig.pending, (state) => {
      state.validationLoading = true;
    });
    builder.addCase(validateCategoryDeductionConfig.fulfilled, (state, action) => {
      state.validationLoading = false;
      state.validationResults = { ...state.validationResults, ...action.payload };
    });
    builder.addCase(validateCategoryDeductionConfig.rejected, (state) => {
      state.validationLoading = false;
    });
  },
});

export const {
  clearError,
  clearPreviewError,
  clearActivityError,
  clearAlertsError,
  clearCurrentPreview,
  addDeductionActivity,
  updateDeductionActivity,
  startDeduction,
  completeDeduction,
  addAlert,
  dismissAlert,
  dismissAllAlerts,
  removeAlert,
  resetDailyTotals,
  updateValidationResults,
  clearValidationResults,
} = inventoryDeductionSlice.actions;

// Selectors
export const selectDeductionProcessing = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.processing;

export const selectDeductionError = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.error;

export const selectLastDeductionResult = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.lastDeductionResult;

export const selectCurrentPreview = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.currentPreview;

export const selectPreviewLoading = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.previewLoading;

export const selectPreviewError = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.previewError;

export const selectRecentActivity = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.recentActivity;

export const selectActivityLoading = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.activityLoading;

export const selectActivityError = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.activityError;

export const selectDeductionAlerts = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.alerts;

export const selectAlertsLoading = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.alertsLoading;

export const selectAlertsError = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.alertsError;

export const selectUnreadAlertsCount = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.unreadAlertsCount;

export const selectActiveDeductions = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.activeDeductions;

export const selectTotalDeductionsToday = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.totalDeductionsToday;

export const selectTotalQuantityDeductedToday = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.totalQuantityDeductedToday;

export const selectValidationResults = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.validationResults;

export const selectValidationLoading = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.validationLoading;

// Helper selectors
export const selectUnreadAlerts = (state: { inventoryDeduction: InventoryDeductionState }) =>
  state.inventoryDeduction.alerts.filter(alert => !alert.dismissed);

export const selectRecentActivityByStatus = (state: { inventoryDeduction: InventoryDeductionState }, status: 'success' | 'failed' | 'pending') =>
  state.inventoryDeduction.recentActivity.filter(activity => activity.status === status);

export const selectActiveDeductionsCount = (state: { inventoryDeduction: InventoryDeductionState }) =>
  Object.keys(state.inventoryDeduction.activeDeductions).length;

export const selectTodaysActivity = (state: { inventoryDeduction: InventoryDeductionState }) => {
  const today = new Date().toDateString();
  return state.inventoryDeduction.recentActivity.filter(activity => 
    new Date(activity.timestamp).toDateString() === today
  );
};

export default inventoryDeductionSlice.reducer;