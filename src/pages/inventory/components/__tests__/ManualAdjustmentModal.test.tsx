import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ManualAdjustmentModal from '../ManualAdjustmentModal';
import inventoryReducer from '../../../../store/slices/inventorySlice';
import categoryGroupsReducer from '../../../../store/slices/categoryGroupsSlice';
import { authReducer } from '../../../../store/slices/authSlice';

// Mock the Redux store
const createMockStore = () => {
  return configureStore({ 
    reducer: {
      inventory: inventoryReducer,
      categoryGroups: categoryGroupsReducer,
      auth: authReducer,
    },
    preloadedState: {
      inventory: {
        inventoryLevels: [
          {
            categoryGroupId: 'group1',
            name: 'Test Group 1',
            currentInventory: 100,
            inventoryUnit: 'kg' as const,
            inventoryType: 'weight' as const,
            minimumThreshold: 20,
            status: 'healthy' as const,
          },
          {
            categoryGroupId: 'group2',
            name: 'Test Group 2',
            currentInventory: 5,
            inventoryUnit: 'pcs' as const,
            inventoryType: 'qty' as const,
            minimumThreshold: 10,
            status: 'low_stock' as const,
          },
        ],
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
        lastFetched: {
          inventoryLevels: null,
          inventoryMovements: null,
          inventoryAlerts: null,
        },
        pagination: {
          inventoryLevels: {
            currentPage: 1,
            pageSize: 50,
            totalItems: 0,
            hasNextPage: false,
          },
          inventoryMovements: {
            currentPage: 1,
            pageSize: 50,
            totalItems: 0,
            hasNextPage: false,
          },
        },
        selectedInventoryLevel: null,
        selectedMovement: null,
        selectedAlert: null,
        lastDeductionResult: null,
        categoryDeduction: {
          isProcessing: false,
          preview: null,
          categoriesWithDeduction: [],
          deductionConfigurationSummary: [],
          lastProcessedOrderItems: [],
        },
      },
      categoryGroups: {
        groups: [
          {
            id: 'group1',
            name: 'Test Group 1',
            description: 'Test Description 1',
            color: '#FF5722',
            currentInventory: 100,
            inventoryUnit: 'kg' as const,
            inventoryType: 'weight' as const,
            minimumThreshold: 20,
            categoryCount: 5,
            productCount: 15,
            lastUpdated: null,
          },
          {
            id: 'group2',
            name: 'Test Group 2',
            description: 'Test Description 2',
            color: '#2196F3',
            currentInventory: 5,
            inventoryUnit: 'pcs' as const,
            inventoryType: 'qty' as const,
            minimumThreshold: 10,
            categoryCount: 3,
            productCount: 8,
            lastUpdated: null,
          },
        ],
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: null,
      },
      auth: {
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        loading: false,
        error: null,
        isAuthenticated: true,
        authStateLoaded: true,
        isLoading: false,
      },
    },
  }) as any;
};

describe('ManualAdjustmentModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  it('renders the modal when open', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} />
      </Provider>
    );

    expect(screen.getByText('Manual Inventory Adjustment')).toBeInTheDocument();
    expect(screen.getByText('Adjust inventory levels manually with proper tracking and audit trail')).toBeInTheDocument();
  }) as any;

  it('does not render when closed', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} open={false} />
      </Provider>
    );

    expect(screen.queryByText('Manual Inventory Adjustment')).not.toBeInTheDocument();
  }) as any;

  it('shows adjustment type options', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} />
      </Provider>
    );

    expect(screen.getByLabelText('Increase')).toBeInTheDocument();
    expect(screen.getByLabelText('Decrease')).toBeInTheDocument();
    expect(screen.getByLabelText('Set Level')).toBeInTheDocument();
  }) as any;

  it('displays current user in adjusted by field', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} />
      </Provider>
    );

    const adjustedByField = screen.getByDisplayValue('test@example.com');
    expect(adjustedByField).toBeDisabled();
    expect(screen.getByText('Automatically filled from current user session')).toBeInTheDocument();
  }) as any;

  it('calls onClose when cancel button is clicked', async () => {
    const store = createMockStore();
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} onClose={onClose} />
      </Provider>
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  }) as any;

  it('shows submit button as disabled initially', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} />
      </Provider>
    );

    const submitButton = screen.getByText('Apply Adjustment');
    expect(submitButton).toBeDisabled();
  }) as any;

  it('shows loading state during submission', () => {
    const store = createMockStore();
    // Manually set the loading state after store creation
    store.dispatch({
      type: 'inventory/adjustInventoryManually/pending'
    }) as any;

    render(
      <Provider store={store}>
        <ManualAdjustmentModal {...defaultProps} />
      </Provider>
    );

    // Submit button should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  }) as any;
}) as any;