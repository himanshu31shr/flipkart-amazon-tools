import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ThresholdConfigModal from '../ThresholdConfigModal';
import inventorySlice from '../../../../store/slices/inventorySlice';
import categoryGroupsSlice from '../../../../store/slices/categoryGroupsSlice';
import { CategoryGroupWithStats } from '../../../../types/categoryGroup';
import { InventoryLevel } from '../../../../types/inventory';

// Mock store with test data
const mockCategoryGroups: CategoryGroupWithStats[] = [
  {
    id: 'group1',
    name: 'Electronics',
    description: 'Electronic products',
    color: '#2196F3',
    currentInventory: 50,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 10,
    categoryCount: 5,
  },
  {
    id: 'group2',
    name: 'Books',
    description: 'Book products',
    color: '#4CAF50',
    currentInventory: 25,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 15,
    categoryCount: 3,
  },
];

const mockInventoryLevels: InventoryLevel[] = [
  {
    categoryGroupId: 'group1',
    name: 'Electronics',
    currentInventory: 50,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 10,
    status: 'healthy',
  },
  {
    categoryGroupId: 'group2',
    name: 'Books',
    currentInventory: 25,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 15,
    status: 'healthy',
  },
];

const createTestStore = () => {
  return configureStore({ 
    reducer: {
      inventory: inventorySlice,
      categoryGroups: categoryGroupsSlice,
    },
    preloadedState: {
      categoryGroups: {
        groups: mockCategoryGroups,
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: null,
      },
      inventory: {
        inventoryLevels: mockInventoryLevels,
        filteredInventoryLevels: mockInventoryLevels,
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
      categoryDeduction: {
        isProcessing: false,
        preview: null,
        categoriesWithDeduction: [],
        deductionConfigurationSummary: [],
        lastProcessedOrderItems: [],
      },        lastDeductionResult: null,
      },
    },
  }) as any;
};

const renderThresholdConfigModal = (props = {}) => {
  const store = createTestStore();
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  return render(
    <Provider store={store}>
      <ThresholdConfigModal {...defaultProps} {...props} />
    </Provider>
  );
};

describe('ThresholdConfigModal', () => {
  it('renders correctly when open', () => {
    renderThresholdConfigModal();
    
    expect(screen.getByText('Configure Inventory Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Set minimum inventory thresholds that trigger automatic alerts when stock levels are low')).toBeInTheDocument();
  }) as any;

  it('does not render when closed', () => {
    renderThresholdConfigModal({ open: false }) as any;
    
    expect(screen.queryByText('Configure Inventory Thresholds')).not.toBeInTheDocument();
  }) as any;

  it('displays category group selection in single mode', () => {
    renderThresholdConfigModal();
    
    // Check that at least one Category Group selector exists
    expect(screen.getAllByText('Category Group *').length).toBeGreaterThan(0);
    expect(screen.getByText('Bulk Update Mode')).toBeInTheDocument();
  }) as any;

  it('switches to bulk mode when checkbox is checked', async () => {
    renderThresholdConfigModal();
    
    const bulkModeCheckbox = screen.getByRole('checkbox', { name: 'Bulk Update Mode' }) as any;
    fireEvent.click(bulkModeCheckbox);
    
    // Just verify the text is present without wait
    expect(screen.getAllByText('Select Category Groups *').length).toBeGreaterThan(0);
  }) as any;

  it('validates threshold input', async () => {
    renderThresholdConfigModal();
    
    // Enter invalid threshold (negative)
    const thresholdInput = screen.getByLabelText('New Minimum Threshold');
    fireEvent.change(thresholdInput, { target: { value: '-5' } }) as any;
    fireEvent.blur(thresholdInput);
    
    await waitFor(() => {
      expect(screen.getByText('Threshold must be non-negative')).toBeInTheDocument();
    }) as any;
  }) as any;

  it('shows preview impact button', () => {
    renderThresholdConfigModal();
    
    expect(screen.getByText('Preview Impact')).toBeInTheDocument();
  }) as any;

  it('has update threshold button', () => {
    renderThresholdConfigModal();
    
    expect(screen.getByText('Update Threshold')).toBeInTheDocument();
  }) as any;

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    renderThresholdConfigModal({ onClose }) as any;
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  }) as any;

  it('has new minimum threshold input', () => {
    renderThresholdConfigModal();
    
    expect(screen.getByLabelText('New Minimum Threshold')).toBeInTheDocument();
  }) as any;

  it('handles bulk mode with multiple category groups', async () => {
    renderThresholdConfigModal();
    
    // Enable bulk mode
    const bulkModeCheckbox = screen.getByRole('checkbox', { name: 'Bulk Update Mode' }) as any;
    fireEvent.click(bulkModeCheckbox);
    
    // Check if bulk mode elements are present
    expect(screen.getAllByText('Select Category Groups *').length).toBeGreaterThan(0);
    expect(screen.getByText(/Update Threshold/)).toBeInTheDocument();
  }) as any;
}) as any;