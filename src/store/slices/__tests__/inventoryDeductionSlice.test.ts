import { configureStore } from '@reduxjs/toolkit';
import inventoryDeductionReducer, {
  InventoryDeductionState,
  DeductionActivity,
  DeductionAlert,
  processOrderDeductions,
  previewOrderDeductions,
  fetchRecentDeductionActivity,
  fetchDeductionAlerts,
  validateCategoryDeductionConfig,
  dismissAlert,
  clearError,
  clearPreviewError,
  clearActivityError,
  clearAlertsError,
  addDeductionActivity,
  updateDeductionActivity,
  startDeduction,
  completeDeduction,
  resetDailyTotals,
  selectDeductionProcessing,
  selectLastDeductionResult,
  selectCurrentPreview,
  selectRecentActivity,
  selectDeductionAlerts,
  selectActiveDeductions,
  selectValidationResults,
  selectDeductionError,
  selectPreviewError,
  selectActivityError,
  selectAlertsError,
} from '../inventoryDeductionSlice';
import { InventoryDeductionResult } from '../../../types/inventory';
import { InventoryDeductionPreview } from '../../../services/inventoryOrderProcessor.service';

// Mock the inventory order processor service
jest.mock('../../../services/inventoryOrderProcessor.service', () => ({
  InventoryOrderProcessor: jest.fn().mockImplementation(() => ({
    processOrderDeductions: jest.fn(),
    previewOrderDeductions: jest.fn(),
    getRecentActivity: jest.fn(),
    getDeductionAlerts: jest.fn(),
    validateConfiguration: jest.fn(),
  })),
}));

describe('inventoryDeductionSlice', () => {
  let store: ReturnType<typeof configureStore<{ inventoryDeduction: InventoryDeductionState }>>;

  const mockDeductionActivity: DeductionActivity = {
    id: 'activity-1',
    timestamp: new Date('2023-12-01T10:00:00Z'),
    orderId: 'order-123',
    platform: 'amazon',
    categoryId: 'category-1',
    categoryName: 'Test Category',
    productName: 'Test Product',
    productSku: 'TEST-SKU-001',
    quantityDeducted: 10,
    unit: 'kg',
    status: 'success',
  };

  const mockDeductionAlert: DeductionAlert = {
    id: 'alert-1',
    type: 'low_stock_after_deduction',
    categoryId: 'category-1',
    categoryName: 'Test Category',
    message: 'Stock level is low after deduction',
    severity: 'warning',
    timestamp: new Date('2023-12-01T10:00:00Z'),
    dismissed: false,
  };

  const mockDeductionResult: InventoryDeductionResult = {
    deductions: [{
      categoryGroupId: 'category-1',
      requestedQuantity: 10,
      deductedQuantity: 10,
      newInventoryLevel: 90,
      movementId: 'movement-123',
    }],
    warnings: [],
    errors: [],
  };

  const mockDeductionPreview: InventoryDeductionPreview = {
    items: [{
      productSku: 'SKU-001',
      productName: 'Test Product',
      categoryName: 'Test Category',
      categoryGroupId: 'category-1',
      orderQuantity: 2,
      deductionQuantity: 5,
      totalDeduction: 10,
      inventoryUnit: 'kg',
    }],
    totalDeductions: new Map([
      ['category-1', { categoryGroupName: 'Test Category', totalQuantity: 10, unit: 'kg' }]
    ]),
    warnings: [],
    errors: [],
  };

  const mockInitialState: InventoryDeductionState = {
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

  beforeEach(() => {
    store = configureStore({
      reducer: {
        inventoryDeduction: inventoryDeductionReducer,
      },
      preloadedState: { inventoryDeduction: mockInitialState },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false, // Disable for tests with Date objects
        }),
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().inventoryDeduction;
      expect(state).toEqual(mockInitialState);
    });
  });

  describe('synchronous reducers', () => {
    describe('error clearing', () => {
      it('should clear processing error', () => {
        const stateWithError = {
          ...mockInitialState,
          error: 'Processing error',
        };

        const storeWithError = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithError },
        });

        storeWithError.dispatch(clearError());
        const state = storeWithError.getState().inventoryDeduction;
        expect(state.error).toBeNull();
      });

      it('should clear preview error', () => {
        const stateWithError = {
          ...mockInitialState,
          previewError: 'Preview error',
        };

        const storeWithError = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithError },
        });

        storeWithError.dispatch(clearPreviewError());
        const state = storeWithError.getState().inventoryDeduction;
        expect(state.previewError).toBeNull();
      });

      it('should clear activity error', () => {
        const stateWithError = {
          ...mockInitialState,
          activityError: 'Activity error',
        };

        const storeWithError = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithError },
        });

        storeWithError.dispatch(clearActivityError());
        const state = storeWithError.getState().inventoryDeduction;
        expect(state.activityError).toBeNull();
      });

      it('should clear alerts error', () => {
        const stateWithError = {
          ...mockInitialState,
          alertsError: 'Alerts error',
        };

        const storeWithError = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithError },
        });

        storeWithError.dispatch(clearAlertsError());
        const state = storeWithError.getState().inventoryDeduction;
        expect(state.alertsError).toBeNull();
      });
    });

    describe('activity management', () => {
      it('should add deduction activity', () => {
        store.dispatch(addDeductionActivity(mockDeductionActivity));
        const state = store.getState().inventoryDeduction;

        expect(state.recentActivity).toHaveLength(1);
        expect(state.recentActivity[0]).toEqual(mockDeductionActivity);
      });

      it('should update deduction activity', () => {
        const stateWithActivity = {
          ...mockInitialState,
          recentActivity: [mockDeductionActivity],
        };

        const storeWithActivity = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithActivity },
        });

        const updatedActivity = { ...mockDeductionActivity, status: 'failed' as const };
        storeWithActivity.dispatch(updateDeductionActivity(updatedActivity));
        const state = storeWithActivity.getState().inventoryDeduction;

        expect(state.recentActivity[0].status).toBe('failed');
      });

      it('should start deduction and add to active deductions', () => {
        store.dispatch(startDeduction(mockDeductionActivity));
        const state = store.getState().inventoryDeduction;

        expect(state.activeDeductions['order-123']).toEqual(mockDeductionActivity);
      });

      it('should complete deduction and move to recent activity', () => {
        const stateWithActive = {
          ...mockInitialState,
          activeDeductions: { 'order-123': mockDeductionActivity },
        };

        const storeWithActive = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithActive },
        });

        storeWithActive.dispatch(completeDeduction({
          orderId: 'order-123',
          status: 'success',
        }));
        const state = storeWithActive.getState().inventoryDeduction;

        expect(state.activeDeductions['order-123']).toBeUndefined();
        expect(state.recentActivity).toHaveLength(1);
        expect(state.recentActivity[0].status).toBe('success');
      });
    });

    describe('daily totals management', () => {
      it('should reset daily totals', () => {
        const stateWithTotals = {
          ...mockInitialState,
          totalDeductionsToday: 10,
          totalQuantityDeductedToday: 100,
        };

        const storeWithTotals = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithTotals },
        });

        storeWithTotals.dispatch(resetDailyTotals());
        const state = storeWithTotals.getState().inventoryDeduction;

        expect(state.totalDeductionsToday).toBe(0);
        expect(state.totalQuantityDeductedToday).toBe(0);
      });
    });

    describe('alert management', () => {
      it('should dismiss alert', () => {
        const stateWithAlerts = {
          ...mockInitialState,
          alerts: [mockDeductionAlert],
          unreadAlertsCount: 1,
        };

        const storeWithAlerts = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithAlerts },
        });

        storeWithAlerts.dispatch(dismissAlert('alert-1'));
        const state = storeWithAlerts.getState().inventoryDeduction;

        expect(state.alerts[0].dismissed).toBe(true);
        expect(state.unreadAlertsCount).toBe(0);
      });

      it('should handle dismissing non-existent alert', () => {
        const stateWithAlerts = {
          ...mockInitialState,
          alerts: [mockDeductionAlert],
          unreadAlertsCount: 1,
        };

        const storeWithAlerts = configureStore({
          reducer: { inventoryDeduction: inventoryDeductionReducer },
          preloadedState: { inventoryDeduction: stateWithAlerts },
        });

        storeWithAlerts.dispatch(dismissAlert('non-existent'));
        const state = storeWithAlerts.getState().inventoryDeduction;

        // Should remain unchanged
        expect(state.alerts[0].dismissed).toBe(false);
        expect(state.unreadAlertsCount).toBe(1);
      });
    });
  });

  describe('async thunks', () => {
    describe('processOrderDeductions', () => {
      it('should set loading to true when pending', () => {
        const action = { type: processOrderDeductions.pending.type, payload: undefined };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.processing).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set deduction result when fulfilled', () => {
        const mockOrderItems = [{
          SKU: 'TEST-SKU-001',
          quantity: '10',
          name: 'Test Product',
          orderId: 'order-123',
          type: 'amazon',
          categoryId: 'category-1',
          category: 'Test Category'
        }];
        
        const action = {
          type: processOrderDeductions.fulfilled.type,
          payload: {
            inventoryResult: mockDeductionResult,
            orderItems: mockOrderItems
          }
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.processing).toBe(false);
        expect(state.lastDeductionResult).toEqual(mockDeductionResult);
        expect(state.recentActivity).toHaveLength(1);
        expect(state.error).toBeNull();
      });

      it('should set error when rejected', () => {
        const action = {
          type: processOrderDeductions.rejected.type,
          payload: 'Failed to process deductions'
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.processing).toBe(false);
        expect(state.error).toBe('Failed to process deductions');
      });
    });

    describe('previewOrderDeductions', () => {
      it('should set preview loading to true when pending', () => {
        const action = { type: previewOrderDeductions.pending.type, payload: undefined };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.previewLoading).toBe(true);
        expect(state.previewError).toBeNull();
      });

      it('should set preview result when fulfilled', () => {
        const action = {
          type: previewOrderDeductions.fulfilled.type,
          payload: mockDeductionPreview
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.previewLoading).toBe(false);
        expect(state.currentPreview).toEqual(mockDeductionPreview);
        expect(state.previewError).toBeNull();
      });

      it('should set preview error when rejected', () => {
        const action = {
          type: previewOrderDeductions.rejected.type,
          payload: 'Failed to preview deductions'
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.previewLoading).toBe(false);
        expect(state.previewError).toBe('Failed to preview deductions');
      });
    });

    describe('fetchRecentDeductionActivity', () => {
      it('should set activity loading to true when pending', () => {
        const action = { type: fetchRecentDeductionActivity.pending.type, payload: undefined };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.activityLoading).toBe(true);
        expect(state.activityError).toBeNull();
      });

      it('should set recent activity when fulfilled', () => {
        const activities = [mockDeductionActivity];
        const action = {
          type: fetchRecentDeductionActivity.fulfilled.type,
          payload: activities
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.activityLoading).toBe(false);
        expect(state.recentActivity).toEqual(activities);
        expect(state.activityError).toBeNull();
      });

      it('should set activity error when rejected', () => {
        const action = {
          type: fetchRecentDeductionActivity.rejected.type,
          payload: 'Failed to fetch activity'
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.activityLoading).toBe(false);
        expect(state.activityError).toBe('Failed to fetch activity');
      });
    });

    describe('fetchDeductionAlerts', () => {
      it('should set alerts loading to true when pending', () => {
        const action = { type: fetchDeductionAlerts.pending.type, payload: undefined };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.alertsLoading).toBe(true);
        expect(state.alertsError).toBeNull();
      });

      it('should set alerts and update unread count when fulfilled', () => {
        const unreadAlert = { ...mockDeductionAlert, dismissed: false };
        const readAlert = { ...mockDeductionAlert, id: 'alert-2', dismissed: true };
        const alerts = [unreadAlert, readAlert];

        const action = {
          type: fetchDeductionAlerts.fulfilled.type,
          payload: alerts
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.alertsLoading).toBe(false);
        expect(state.alerts).toEqual(alerts);
        expect(state.unreadAlertsCount).toBe(1); // Only unread alerts counted
        expect(state.alertsError).toBeNull();
      });

      it('should handle empty alerts array', () => {
        const action = {
          type: fetchDeductionAlerts.fulfilled.type,
          payload: []
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.alerts).toEqual([]);
        expect(state.unreadAlertsCount).toBe(0);
      });

      it('should set alerts error when rejected', () => {
        const action = {
          type: fetchDeductionAlerts.rejected.type,
          payload: 'Failed to fetch alerts'
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.alertsLoading).toBe(false);
        expect(state.alertsError).toBe('Failed to fetch alerts');
      });
    });

    describe('validateCategoryDeductionConfig', () => {
      it('should set validation loading to true when pending', () => {
        const action = { type: validateCategoryDeductionConfig.pending.type, payload: undefined };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.validationLoading).toBe(true);
      });

      it('should set validation results when fulfilled', () => {
        const validationResults = {
          'category-1': true,
          'category-2': false,
        };

        const action = {
          type: validateCategoryDeductionConfig.fulfilled.type,
          payload: validationResults
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.validationLoading).toBe(false);
        expect(state.validationResults).toEqual(validationResults);
      });

      it('should handle validation error gracefully', () => {
        const action = {
          type: validateCategoryDeductionConfig.rejected.type,
          payload: 'Validation failed'
        };
        const state = inventoryDeductionReducer(undefined, action);

        expect(state.validationLoading).toBe(false);
        expect(state.validationResults).toEqual({});
      });
    });
  });

  describe('selectors', () => {
    const mockRootState = {
      inventoryDeduction: {
        ...mockInitialState,
        processing: true,
        error: 'Processing error',
        lastDeductionResult: mockDeductionResult,
        currentPreview: mockDeductionPreview,
        recentActivity: [mockDeductionActivity],
        alerts: [mockDeductionAlert],
        activeDeductions: { 'order-123': mockDeductionActivity },
        totalDeductionsToday: 5,
        totalQuantityDeductedToday: 50,
        validationResults: { 'category-1': true },
        previewError: 'Preview error',
        activityError: 'Activity error',
        alertsError: 'Alerts error',
      },
    };

    it('should select processing status', () => {
      expect(selectDeductionProcessing(mockRootState)).toBe(true);
    });

    it('should select last deduction result', () => {
      expect(selectLastDeductionResult(mockRootState)).toEqual(mockDeductionResult);
    });

    it('should select current preview', () => {
      expect(selectCurrentPreview(mockRootState)).toEqual(mockDeductionPreview);
    });

    it('should select recent activity', () => {
      expect(selectRecentActivity(mockRootState)).toEqual([mockDeductionActivity]);
    });

    it('should select deduction alerts', () => {
      expect(selectDeductionAlerts(mockRootState)).toEqual([mockDeductionAlert]);
    });

    it('should select active deductions', () => {
      expect(selectActiveDeductions(mockRootState)).toEqual({ 'order-123': mockDeductionActivity });
    });

    it('should select validation results', () => {
      expect(selectValidationResults(mockRootState)).toEqual({ 'category-1': true });
    });

    it('should select deduction errors', () => {
      expect(selectDeductionError(mockRootState)).toBe('Processing error');
      expect(selectPreviewError(mockRootState)).toBe('Preview error');
      expect(selectActivityError(mockRootState)).toBe('Activity error');
      expect(selectAlertsError(mockRootState)).toBe('Alerts error');
    });

    it('should handle empty state in selectors', () => {
      const emptyState = {
        inventoryDeduction: mockInitialState,
      };

      expect(selectDeductionProcessing(emptyState)).toBe(false);
      expect(selectLastDeductionResult(emptyState)).toBeNull();
      expect(selectCurrentPreview(emptyState)).toBeNull();
      expect(selectRecentActivity(emptyState)).toEqual([]);
      expect(selectDeductionAlerts(emptyState)).toEqual([]);
      expect(selectActiveDeductions(emptyState)).toEqual({});
      expect(selectValidationResults(emptyState)).toEqual({});
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent activity updates', () => {
      store.dispatch(addDeductionActivity({ ...mockDeductionActivity, id: 'activity-1' }));
      store.dispatch(addDeductionActivity({ ...mockDeductionActivity, id: 'activity-2' }));

      const state = store.getState().inventoryDeduction;
      expect(state.recentActivity).toHaveLength(2);
      expect(state.recentActivity[0].id).toBe('activity-2'); // Most recent first
      expect(state.recentActivity[1].id).toBe('activity-1');
    });

    it('should handle large numbers in daily totals', () => {
      // Adding activity on today's date should update totals
      const todayActivity = { 
        ...mockDeductionActivity, 
        timestamp: new Date(),
        quantityDeducted: 999999 
      };
      
      store.dispatch(addDeductionActivity(todayActivity));
      const state = store.getState().inventoryDeduction;
      
      expect(state.totalDeductionsToday).toBe(1);
      expect(state.totalQuantityDeductedToday).toBe(999999);
    });

    it('should handle malformed async thunk payloads by throwing error', () => {
      const actionWithNullPayload = {
        type: processOrderDeductions.fulfilled.type,
        payload: null
      };

      expect(() => {
        inventoryDeductionReducer(mockInitialState, actionWithNullPayload as any);
      }).toThrow();
    });

    it('should preserve state immutability during operations', () => {
      const frozenState = Object.freeze(mockInitialState);

      const action = addDeductionActivity(mockDeductionActivity);

      expect(() => {
        inventoryDeductionReducer(frozenState, action);
      }).not.toThrow();
    });
  });

  describe('state consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      // Start with initial state
      let state = mockInitialState;

      // Add some activities
      const activityAction = {
        type: fetchRecentDeductionActivity.fulfilled.type,
        payload: [mockDeductionActivity]
      };
      state = inventoryDeductionReducer(state, activityAction);

      // Add some alerts
      const alertsAction = {
        type: fetchDeductionAlerts.fulfilled.type,
        payload: [mockDeductionAlert]
      };
      state = inventoryDeductionReducer(state, alertsAction);

      // Process some deductions  
      const processAction = {
        type: processOrderDeductions.fulfilled.type,
        payload: {
          inventoryResult: mockDeductionResult,
          orderItems: []
        }
      };
      state = inventoryDeductionReducer(state, processAction);

      // Start deduction
      state = inventoryDeductionReducer(state, startDeduction(mockDeductionActivity));

      // Verify final state consistency
      expect(state.recentActivity).toHaveLength(1);
      expect(state.alerts).toHaveLength(1);
      expect(state.unreadAlertsCount).toBe(1);
      expect(state.lastDeductionResult).toEqual(mockDeductionResult);
      expect(state.activeDeductions['order-123']).toEqual(mockDeductionActivity);
      expect(state.processing).toBe(false);
    });
  });
});