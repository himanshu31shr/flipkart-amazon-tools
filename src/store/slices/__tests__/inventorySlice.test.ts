import { configureStore } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';
import {
  inventoryReducer,
  InventoryState,
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
  fetchInventoryLevels,
  fetchInventoryMovements,
  processInventoryDeductions,
  adjustInventoryManually,
  fetchInventoryAlerts,
  createInventoryAlert,
  acknowledgeInventoryAlert,
  resolveInventoryAlert,
  selectInventoryLevels,
  selectInventoryMovements,
  selectInventoryAlerts,
  selectActiveInventoryAlerts,
  selectInventoryLoading,
  selectInventoryErrors,
  selectInventoryFilters,
  selectInventoryPagination,
  selectSelectedInventoryLevel,
  selectSelectedMovement,
  selectSelectedAlert,
  selectLastDeductionResult,
  selectInventoryLevelsLastFetched,
  selectInventoryMovementsLastFetched,
  selectInventoryAlertsLastFetched,
} from '../inventorySlice';
import {
  InventoryLevel,
  InventoryMovement,
  InventoryAlert,
  InventoryDeductionResult,
  InventoryFilters,
  MovementFilters,
} from '../../../types/inventory';

// Mock Firebase Timestamp
const createMockTimestamp = (input: Date | number) => {
  const seconds = input instanceof Date 
    ? Math.floor(input.getTime() / 1000) 
    : Math.floor(input / 1000);
  
  return {
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000),
    toMillis: () => seconds * 1000,
    isEqual: () => false,
    toJSON: () => ({ seconds, nanoseconds: 0 }),
    valueOf: () => seconds * 1000,
  } as unknown as Timestamp;
};

const mockTimestamp = createMockTimestamp(1234567890 * 1000);

jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: jest.fn((date: Date) => createMockTimestamp(date)),
    fromMillis: jest.fn((millis: number) => createMockTimestamp(millis)),
    now: jest.fn(() => createMockTimestamp(Date.now())),
  }
}));

// Mock the services
jest.mock('../../../services/inventory.service', () => ({
  InventoryService: jest.fn().mockImplementation(() => ({
    getInventoryLevels: jest.fn(),
    getInventoryMovements: jest.fn(),
    deductInventoryFromOrder: jest.fn(),
    adjustInventoryManually: jest.fn(),
  })),
}));

jest.mock('../../../services/alerting.service', () => ({
  AlertingService: jest.fn().mockImplementation(() => ({
    getInventoryAlerts: jest.fn(),
    createInventoryAlert: jest.fn(),
    updateInventoryAlert: jest.fn(),
    getInventoryAlert: jest.fn(),
    resolveInventoryAlert: jest.fn(),
  })),
}));

describe('inventorySlice', () => {
  let store: ReturnType<typeof configureStore<{ inventory: InventoryState }>>;

  const mockInventoryLevel: InventoryLevel = {
    categoryGroupId: 'category-1',
    name: 'Test Category',
    currentInventory: 100,
    inventoryUnit: 'kg',
    inventoryType: 'weight',
    minimumThreshold: 20,
    status: 'healthy',
    lastInventoryUpdate: mockTimestamp,
  };

  const mockInventoryLevel2: InventoryLevel = {
    categoryGroupId: 'category-2',
    name: 'Test Category 2',
    currentInventory: 5,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 10,
    status: 'low_stock',
    lastInventoryUpdate: mockTimestamp,
  };

  const mockInventoryMovement: InventoryMovement = {
    id: 'movement-1',
    categoryGroupId: 'category-1',
    movementType: 'deduction',
    quantity: 10,
    unit: 'kg',
    previousInventory: 110,
    newInventory: 100,
    transactionReference: 'txn-123',
    orderReference: 'order-456',
    productSku: 'SKU-123',
    platform: 'amazon',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockInventoryAlert: InventoryAlert = {
    id: 'alert-1',
    categoryGroupId: 'category-2',
    alertType: 'low_stock',
    currentLevel: 5,
    thresholdLevel: 10,
    unit: 'pcs',
    severity: 'medium',
    isActive: true,
    createdAt: mockTimestamp,
  };

  const mockInitialState: InventoryState = {
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

  beforeEach(() => {
    store = configureStore({
      reducer: {
        inventory: inventoryReducer,
      },
      preloadedState: { inventory: mockInitialState },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false, // Disable for tests with Firebase Timestamps
        }),
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().inventory;
      expect(state).toEqual(mockInitialState);
    });
  });

  describe('synchronous reducers', () => {
    describe('inventory filters', () => {
      it('should set inventory filters and apply them', () => {
        const stateWithData = {
          ...mockInitialState,
          inventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
          filteredInventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<InventoryFilters> = { lowStock: true };
        storeWithData.dispatch(setInventoryFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filters.inventory).toEqual(filters);
        expect(state.filteredInventoryLevels).toHaveLength(1);
        expect(state.filteredInventoryLevels[0].status).toBe('low_stock');
      });

      it('should filter by category group IDs', () => {
        const stateWithData = {
          ...mockInitialState,
          inventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
          filteredInventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<InventoryFilters> = { categoryGroupIds: ['category-1'] };
        storeWithData.dispatch(setInventoryFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filteredInventoryLevels).toHaveLength(1);
        expect(state.filteredInventoryLevels[0].categoryGroupId).toBe('category-1');
      });

      it('should filter by inventory type', () => {
        const stateWithData = {
          ...mockInitialState,
          inventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
          filteredInventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<InventoryFilters> = { inventoryType: 'weight' };
        storeWithData.dispatch(setInventoryFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filteredInventoryLevels).toHaveLength(1);
        expect(state.filteredInventoryLevels[0].inventoryType).toBe('weight');
      });

      it('should filter by search term', () => {
        const stateWithData = {
          ...mockInitialState,
          inventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
          filteredInventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<InventoryFilters> = { searchTerm: 'Test Category 2' };
        storeWithData.dispatch(setInventoryFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filteredInventoryLevels).toHaveLength(1);
        expect(state.filteredInventoryLevels[0].name).toBe('Test Category 2');
      });

      it('should clear inventory filters', () => {
        const stateWithFilters = {
          ...mockInitialState,
          inventoryLevels: [mockInventoryLevel, mockInventoryLevel2],
          filteredInventoryLevels: [mockInventoryLevel],
          filters: {
            inventory: { lowStock: true },
            movements: {},
          },
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithFilters },
        });

        storeWithData.dispatch(clearInventoryFilters());
        const state = storeWithData.getState().inventory;

        expect(state.filters.inventory).toEqual({});
        expect(state.filteredInventoryLevels).toEqual([mockInventoryLevel, mockInventoryLevel2]);
      });
    });

    describe('movement filters', () => {
      it('should set movement filters and apply them', () => {
        const movement2 = { ...mockInventoryMovement, id: 'movement-2', movementType: 'addition' as const };
        const stateWithData = {
          ...mockInitialState,
          inventoryMovements: [mockInventoryMovement, movement2],
          filteredInventoryMovements: [mockInventoryMovement, movement2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<MovementFilters> = { movementType: 'deduction' };
        storeWithData.dispatch(setMovementFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filters.movements).toEqual(filters);
        expect(state.filteredInventoryMovements).toHaveLength(1);
        expect(state.filteredInventoryMovements[0].movementType).toBe('deduction');
      });

      it('should filter by category group ID', () => {
        const movement2 = { ...mockInventoryMovement, id: 'movement-2', categoryGroupId: 'category-2' };
        const stateWithData = {
          ...mockInitialState,
          inventoryMovements: [mockInventoryMovement, movement2],
          filteredInventoryMovements: [mockInventoryMovement, movement2],
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithData },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        const filters: Partial<MovementFilters> = { categoryGroupId: 'category-1' };
        storeWithData.dispatch(setMovementFilters(filters));
        const state = storeWithData.getState().inventory;

        expect(state.filteredInventoryMovements).toHaveLength(1);
        expect(state.filteredInventoryMovements[0].categoryGroupId).toBe('category-1');
      });

      it('should clear movement filters', () => {
        const stateWithFilters = {
          ...mockInitialState,
          inventoryMovements: [mockInventoryMovement],
          filteredInventoryMovements: [],
          filters: {
            inventory: {},
            movements: { movementType: 'deduction' as const },
          },
        };

        const storeWithData = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithFilters },
        });

        storeWithData.dispatch(clearMovementFilters());
        const state = storeWithData.getState().inventory;

        expect(state.filters.movements).toEqual({});
        expect(state.filteredInventoryMovements).toEqual([mockInventoryMovement]);
      });
    });

    describe('selection management', () => {
      it('should select inventory level', () => {
        store.dispatch(selectInventoryLevel('category-1'));
        const state = store.getState().inventory;
        expect(state.selectedInventoryLevel).toBe('category-1');
      });

      it('should select movement', () => {
        store.dispatch(selectMovement('movement-1'));
        const state = store.getState().inventory;
        expect(state.selectedMovement).toBe('movement-1');
      });

      it('should select alert', () => {
        store.dispatch(selectAlert('alert-1'));
        const state = store.getState().inventory;
        expect(state.selectedAlert).toBe('alert-1');
      });

      it('should clear selections', () => {
        store.dispatch(selectInventoryLevel('category-1'));
        store.dispatch(selectMovement('movement-1'));
        store.dispatch(selectAlert('alert-1'));

        store.dispatch(selectInventoryLevel(null));
        store.dispatch(selectMovement(null));
        store.dispatch(selectAlert(null));

        const state = store.getState().inventory;
        expect(state.selectedInventoryLevel).toBeNull();
        expect(state.selectedMovement).toBeNull();
        expect(state.selectedAlert).toBeNull();
      });
    });

    describe('pagination', () => {
      it('should set inventory levels pagination', () => {
        const pagination = { currentPage: 2, pageSize: 50 };
        store.dispatch(setInventoryLevelsPagination(pagination));
        const state = store.getState().inventory;

        expect(state.pagination.inventoryLevels.currentPage).toBe(2);
        expect(state.pagination.inventoryLevels.pageSize).toBe(50);
      });

      it('should set inventory movements pagination', () => {
        const pagination = { currentPage: 3, totalItems: 100 };
        store.dispatch(setInventoryMovementsPagination(pagination));
        const state = store.getState().inventory;

        expect(state.pagination.inventoryMovements.currentPage).toBe(3);
        expect(state.pagination.inventoryMovements.totalItems).toBe(100);
      });
    });

    describe('error clearing', () => {
      it('should clear inventory levels error', () => {
        const stateWithError = {
          ...mockInitialState,
          error: {
            ...mockInitialState.error,
            inventoryLevels: 'Test error',
          },
        };

        const storeWithError = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithError },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        storeWithError.dispatch(clearInventoryLevelsError());
        const state = storeWithError.getState().inventory;
        expect(state.error.inventoryLevels).toBeNull();
      });

      it('should clear all error types', () => {
        const stateWithErrors = {
          ...mockInitialState,
          error: {
            inventoryLevels: 'Error 1',
            inventoryMovements: 'Error 2',
            inventoryAlerts: 'Error 3',
            deduction: 'Error 4',
            adjustment: 'Error 5',
            alertCreation: 'Error 6',
            alertAcknowledgment: 'Error 7',
            alertResolution: 'Error 8',
          },
        };

        const storeWithErrors = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithErrors },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        storeWithErrors.dispatch(clearInventoryLevelsError());
        storeWithErrors.dispatch(clearInventoryMovementsError());
        storeWithErrors.dispatch(clearInventoryAlertsError());
        storeWithErrors.dispatch(clearDeductionError());
        storeWithErrors.dispatch(clearAdjustmentError());
        storeWithErrors.dispatch(clearAlertCreationError());
        storeWithErrors.dispatch(clearAlertAcknowledgmentError());
        storeWithErrors.dispatch(clearAlertResolutionError());

        const state = storeWithErrors.getState().inventory;
        Object.values(state.error).forEach(error => {
          expect(error).toBeNull();
        });
      });
    });

    describe('last deduction result', () => {
      it('should clear last deduction result', () => {
        const mockResult: InventoryDeductionResult = {
          deductions: [],
          warnings: [],
          errors: [],
        };

        const stateWithResult = {
          ...mockInitialState,
          lastDeductionResult: mockResult,
        };

        const storeWithResult = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: { inventory: stateWithResult },
          middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        });

        storeWithResult.dispatch(clearLastDeductionResult());
        const state = storeWithResult.getState().inventory;
        expect(state.lastDeductionResult).toBeNull();
      });
    });
  });

  describe('async thunks', () => {
    describe('fetchInventoryLevels', () => {
      it('should set loading to true when pending', () => {
        const action = { type: fetchInventoryLevels.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryLevels).toBe(true);
        expect(state.error.inventoryLevels).toBeNull();
      });

      it('should set inventory levels when fulfilled', () => {
        const levels = [mockInventoryLevel, mockInventoryLevel2];
        const action = {
          type: fetchInventoryLevels.fulfilled.type,
          payload: levels
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryLevels).toBe(false);
        expect(state.inventoryLevels).toEqual(levels);
        expect(state.filteredInventoryLevels).toEqual(levels);
        expect(state.lastFetched.inventoryLevels).toBeDefined();
      });

      it('should set error when rejected', () => {
        const action = {
          type: fetchInventoryLevels.rejected.type,
          error: { message: 'Failed to fetch inventory levels' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryLevels).toBe(false);
        expect(state.error.inventoryLevels).toBe('Failed to fetch inventory levels');
      });

      it('should apply existing filters when data is fetched', () => {
        const initialState = {
          ...mockInitialState,
          filters: {
            inventory: { lowStock: true },
            movements: {},
          },
        };

        const levels = [mockInventoryLevel, mockInventoryLevel2];
        const action = {
          type: fetchInventoryLevels.fulfilled.type,
          payload: levels
        };
        const state = inventoryReducer(initialState, action);

        expect(state.inventoryLevels).toEqual(levels);
        expect(state.filteredInventoryLevels).toHaveLength(1);
        expect(state.filteredInventoryLevels[0].status).toBe('low_stock');
      });
    });

    describe('fetchInventoryMovements', () => {
      it('should set loading to true when pending', () => {
        const action = { type: fetchInventoryMovements.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryMovements).toBe(true);
        expect(state.error.inventoryMovements).toBeNull();
      });

      it('should set inventory movements when fulfilled', () => {
        const movements = [mockInventoryMovement];
        const action = {
          type: fetchInventoryMovements.fulfilled.type,
          payload: movements
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryMovements).toBe(false);
        expect(state.inventoryMovements).toEqual(movements);
        expect(state.filteredInventoryMovements).toEqual(movements);
        expect(state.lastFetched.inventoryMovements).toBeDefined();
      });

      it('should set error when rejected', () => {
        const action = {
          type: fetchInventoryMovements.rejected.type,
          error: { message: 'Failed to fetch movements' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryMovements).toBe(false);
        expect(state.error.inventoryMovements).toBe('Failed to fetch movements');
      });
    });

    describe('processInventoryDeductions', () => {
      it('should set loading to true when pending', () => {
        const action = { type: processInventoryDeductions.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.deduction).toBe(true);
        expect(state.error.deduction).toBeNull();
        expect(state.lastDeductionResult).toBeNull();
      });

      it('should set deduction result when fulfilled', () => {
        const result: InventoryDeductionResult = {
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

        const action = {
          type: processInventoryDeductions.fulfilled.type,
          payload: result
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.deduction).toBe(false);
        expect(state.lastDeductionResult).toEqual(result);
        expect(state.lastFetched.inventoryLevels).toBeNull(); // Cache invalidated
      });

      it('should set error when rejected', () => {
        const action = {
          type: processInventoryDeductions.rejected.type,
          error: { message: 'Failed to process deductions' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.deduction).toBe(false);
        expect(state.error.deduction).toBe('Failed to process deductions');
      });
    });

    describe('adjustInventoryManually', () => {
      it('should set loading to true when pending', () => {
        const action = { type: adjustInventoryManually.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.adjustment).toBe(true);
        expect(state.error.adjustment).toBeNull();
      });

      it('should invalidate cache when fulfilled', () => {
        const initialState = {
          ...mockInitialState,
          lastFetched: {
            inventoryLevels: 123456789,
            inventoryMovements: 123456789,
            inventoryAlerts: 123456789,
          },
        };

        const action = { type: adjustInventoryManually.fulfilled.type, payload: undefined };
        const state = inventoryReducer(initialState, action);

        expect(state.loading.adjustment).toBe(false);
        expect(state.lastFetched.inventoryLevels).toBeNull();
        expect(state.lastFetched.inventoryMovements).toBeNull();
        expect(state.lastFetched.inventoryAlerts).toBe(123456789); // Not invalidated
      });

      it('should set error when rejected', () => {
        const action = {
          type: adjustInventoryManually.rejected.type,
          error: { message: 'Failed to adjust inventory' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.adjustment).toBe(false);
        expect(state.error.adjustment).toBe('Failed to adjust inventory');
      });
    });

    describe('fetchInventoryAlerts', () => {
      it('should set loading to true when pending', () => {
        const action = { type: fetchInventoryAlerts.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryAlerts).toBe(true);
        expect(state.error.inventoryAlerts).toBeNull();
      });

      it('should set alerts and filter active ones when fulfilled', () => {
        const inactiveAlert = { ...mockInventoryAlert, id: 'alert-2', isActive: false };
        const alerts = [mockInventoryAlert, inactiveAlert];
        
        const action = {
          type: fetchInventoryAlerts.fulfilled.type,
          payload: alerts
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryAlerts).toBe(false);
        expect(state.inventoryAlerts).toEqual(alerts);
        expect(state.activeInventoryAlerts).toHaveLength(1);
        expect(state.activeInventoryAlerts[0].isActive).toBe(true);
        expect(state.lastFetched.inventoryAlerts).toBeDefined();
      });

      it('should set error when rejected', () => {
        const action = {
          type: fetchInventoryAlerts.rejected.type,
          error: { message: 'Failed to fetch alerts' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.inventoryAlerts).toBe(false);
        expect(state.error.inventoryAlerts).toBe('Failed to fetch alerts');
      });
    });

    describe('createInventoryAlert', () => {
      it('should set loading to true when pending', () => {
        const action = { type: createInventoryAlert.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertCreation).toBe(true);
        expect(state.error.alertCreation).toBeNull();
      });

      it('should add alert to both arrays when fulfilled and active', () => {
        const newAlert = { ...mockInventoryAlert, id: 'alert-new' };
        const action = {
          type: createInventoryAlert.fulfilled.type,
          payload: newAlert
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertCreation).toBe(false);
        expect(state.inventoryAlerts).toContain(newAlert);
        expect(state.activeInventoryAlerts).toContain(newAlert);
      });

      it('should add alert only to main array when fulfilled and inactive', () => {
        const newAlert = { ...mockInventoryAlert, id: 'alert-new', isActive: false };
        const action = {
          type: createInventoryAlert.fulfilled.type,
          payload: newAlert
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertCreation).toBe(false);
        expect(state.inventoryAlerts).toContain(newAlert);
        expect(state.activeInventoryAlerts).not.toContain(newAlert);
      });

      it('should set error when rejected', () => {
        const action = {
          type: createInventoryAlert.rejected.type,
          error: { message: 'Failed to create alert' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertCreation).toBe(false);
        expect(state.error.alertCreation).toBe('Failed to create alert');
      });
    });

    describe('acknowledgeInventoryAlert', () => {
      it('should set loading to true when pending', () => {
        const action = { type: acknowledgeInventoryAlert.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertAcknowledgment).toBe(true);
        expect(state.error.alertAcknowledgment).toBeNull();
      });

      it('should update alert in both arrays when fulfilled', () => {
        const initialState = {
          ...mockInitialState,
          inventoryAlerts: [mockInventoryAlert],
          activeInventoryAlerts: [mockInventoryAlert],
        };

        const updatedAlert = {
          ...mockInventoryAlert,
          acknowledgedBy: 'user-123',
          acknowledgedAt: mockTimestamp,
        };

        const action = {
          type: acknowledgeInventoryAlert.fulfilled.type,
          payload: updatedAlert
        };
        const state = inventoryReducer(initialState, action);

        expect(state.loading.alertAcknowledgment).toBe(false);
        expect(state.inventoryAlerts[0]).toEqual(updatedAlert);
        expect(state.activeInventoryAlerts[0]).toEqual(updatedAlert);
      });

      it('should set error when rejected', () => {
        const action = {
          type: acknowledgeInventoryAlert.rejected.type,
          error: { message: 'Failed to acknowledge alert' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertAcknowledgment).toBe(false);
        expect(state.error.alertAcknowledgment).toBe('Failed to acknowledge alert');
      });
    });

    describe('resolveInventoryAlert', () => {
      it('should set loading to true when pending', () => {
        const action = { type: resolveInventoryAlert.pending.type, payload: undefined };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertResolution).toBe(true);
        expect(state.error.alertResolution).toBeNull();
      });

      it('should update alert and remove from active when resolved', () => {
        const initialState = {
          ...mockInitialState,
          inventoryAlerts: [mockInventoryAlert],
          activeInventoryAlerts: [mockInventoryAlert],
        };

        const resolvedAlert = {
          ...mockInventoryAlert,
          isActive: false,
          resolvedAt: mockTimestamp,
        };

        const action = {
          type: resolveInventoryAlert.fulfilled.type,
          payload: resolvedAlert
        };
        const state = inventoryReducer(initialState, action);

        expect(state.loading.alertResolution).toBe(false);
        expect(state.inventoryAlerts[0]).toEqual(resolvedAlert);
        expect(state.activeInventoryAlerts).toHaveLength(0);
      });

      it('should keep alert in active array if still active', () => {
        const initialState = {
          ...mockInitialState,
          inventoryAlerts: [mockInventoryAlert],
          activeInventoryAlerts: [mockInventoryAlert],
        };

        const updatedAlert = {
          ...mockInventoryAlert,
          acknowledgedBy: 'user-123',
          isActive: true, // Still active
        };

        const action = {
          type: resolveInventoryAlert.fulfilled.type,
          payload: updatedAlert
        };
        const state = inventoryReducer(initialState, action);

        expect(state.inventoryAlerts[0]).toEqual(updatedAlert);
        expect(state.activeInventoryAlerts).toHaveLength(1);
      });

      it('should set error when rejected', () => {
        const action = {
          type: resolveInventoryAlert.rejected.type,
          error: { message: 'Failed to resolve alert' }
        };
        const state = inventoryReducer(undefined, action);

        expect(state.loading.alertResolution).toBe(false);
        expect(state.error.alertResolution).toBe('Failed to resolve alert');
      });
    });
  });

  describe('selectors', () => {
    const mockRootState = {
      inventory: {
        ...mockInitialState,
        inventoryLevels: [mockInventoryLevel],
        filteredInventoryLevels: [mockInventoryLevel],
        inventoryMovements: [mockInventoryMovement],
        filteredInventoryMovements: [mockInventoryMovement],
        inventoryAlerts: [mockInventoryAlert],
        activeInventoryAlerts: [mockInventoryAlert],
        selectedInventoryLevel: 'category-1',
        selectedMovement: 'movement-1',
        selectedAlert: 'alert-1',
        lastDeductionResult: { deductions: [], warnings: [], errors: [] },
        lastFetched: {
          inventoryLevels: 123456789,
          inventoryMovements: 987654321,
          inventoryAlerts: 555555555,
        },
      },
    };

    it('should select inventory levels', () => {
      expect(selectInventoryLevels(mockRootState)).toEqual([mockInventoryLevel]);
    });

    it('should select inventory movements', () => {
      expect(selectInventoryMovements(mockRootState)).toEqual([mockInventoryMovement]);
    });

    it('should select inventory alerts', () => {
      expect(selectInventoryAlerts(mockRootState)).toEqual([mockInventoryAlert]);
    });

    it('should select active inventory alerts', () => {
      expect(selectActiveInventoryAlerts(mockRootState)).toEqual([mockInventoryAlert]);
    });

    it('should select inventory loading states', () => {
      expect(selectInventoryLoading(mockRootState)).toEqual(mockInitialState.loading);
    });

    it('should select inventory errors', () => {
      expect(selectInventoryErrors(mockRootState)).toEqual(mockInitialState.error);
    });

    it('should select inventory filters', () => {
      expect(selectInventoryFilters(mockRootState)).toEqual(mockInitialState.filters);
    });

    it('should select inventory pagination', () => {
      expect(selectInventoryPagination(mockRootState)).toEqual(mockInitialState.pagination);
    });

    it('should select selected inventory level', () => {
      expect(selectSelectedInventoryLevel(mockRootState)).toBe('category-1');
    });

    it('should select selected movement', () => {
      expect(selectSelectedMovement(mockRootState)).toBe('movement-1');
    });

    it('should select selected alert', () => {
      expect(selectSelectedAlert(mockRootState)).toBe('alert-1');
    });

    it('should select last deduction result', () => {
      expect(selectLastDeductionResult(mockRootState)).toEqual({
        deductions: [],
        warnings: [],
        errors: [],
      });
    });

    it('should select last fetched timestamps', () => {
      expect(selectInventoryLevelsLastFetched(mockRootState)).toBe(123456789);
      expect(selectInventoryMovementsLastFetched(mockRootState)).toBe(987654321);
      expect(selectInventoryAlertsLastFetched(mockRootState)).toBe(555555555);
    });
  });

  describe('complex filter scenarios', () => {
    it('should handle multiple inventory filter criteria', () => {
      const healthyLevel = { ...mockInventoryLevel, status: 'healthy' as const };
      const zeroStockLevel = { ...mockInventoryLevel2, status: 'zero_stock' as const, currentInventory: 0 };
      
      const stateWithData = {
        ...mockInitialState,
        inventoryLevels: [healthyLevel, mockInventoryLevel2, zeroStockLevel],
        filteredInventoryLevels: [healthyLevel, mockInventoryLevel2, zeroStockLevel],
      };

      const storeWithData = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: { inventory: stateWithData },
      });

      // Filter for low stock and zero stock
      const filters: Partial<InventoryFilters> = { 
        lowStock: true, 
        zeroStock: true,
        unit: 'pcs'
      };
      storeWithData.dispatch(setInventoryFilters(filters));
      const state = storeWithData.getState().inventory;

      expect(state.filteredInventoryLevels).toHaveLength(2);
      expect(state.filteredInventoryLevels.some(level => level.status === 'low_stock')).toBe(true);
      expect(state.filteredInventoryLevels.some(level => level.status === 'zero_stock')).toBe(true);
    });

    it('should handle date range filters for movements', () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-12-31');
      
      const oldMovement = {
        ...mockInventoryMovement,
        id: 'old-movement',
        createdAt: createMockTimestamp(oldDate),
      };
      const newMovement = {
        ...mockInventoryMovement,
        id: 'new-movement',
        createdAt: createMockTimestamp(newDate),
      };

      const stateWithData = {
        ...mockInitialState,
        inventoryMovements: [oldMovement, newMovement],
        filteredInventoryMovements: [oldMovement, newMovement],
      };

      const storeWithData = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: { inventory: stateWithData },
      });

      const filters: Partial<MovementFilters> = {
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-12-31'),
      };
      storeWithData.dispatch(setMovementFilters(filters));
      const state = storeWithData.getState().inventory;

      expect(state.filteredInventoryMovements).toHaveLength(1);
      expect(state.filteredInventoryMovements[0].id).toBe('new-movement');
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays in filters', () => {
      const stateWithData = {
        ...mockInitialState,
        inventoryLevels: [mockInventoryLevel],
      };

      const storeWithData = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: { inventory: stateWithData },
      });

      // Apply filter with empty array
      storeWithData.dispatch(setInventoryFilters({ categoryGroupIds: [] }));
      const state = storeWithData.getState().inventory;

      // Should show all items when empty array is provided
      expect(state.filteredInventoryLevels).toEqual([mockInventoryLevel]);
    });

    it('should handle null/undefined inventory levels in filters', () => {
      const stateWithNullData = {
        ...mockInitialState,
        inventoryLevels: [],
        filteredInventoryLevels: [],
      };

      const storeWithData = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: { inventory: stateWithNullData },
      });

      storeWithData.dispatch(setInventoryFilters({ lowStock: true }));
      const state = storeWithData.getState().inventory;

      expect(state.filteredInventoryLevels).toEqual([]);
    });

    it('should handle alert updates for non-existent alerts', () => {
      const initialState = {
        ...mockInitialState,
        inventoryAlerts: [],
        activeInventoryAlerts: [],
      };

      const updatedAlert = {
        ...mockInventoryAlert,
        id: 'non-existent-alert',
      };

      const action = {
        type: acknowledgeInventoryAlert.fulfilled.type,
        payload: updatedAlert
      };
      const state = inventoryReducer(initialState, action);

      // Should not crash, arrays should remain empty
      expect(state.inventoryAlerts).toHaveLength(0);
      expect(state.activeInventoryAlerts).toHaveLength(0);
    });
  });
});