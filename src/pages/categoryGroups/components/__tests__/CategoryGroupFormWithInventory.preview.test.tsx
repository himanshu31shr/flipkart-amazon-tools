import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CategoryGroupFormWithInventory from '../CategoryGroupFormWithInventory';
import categoryGroupsSlice from '../../../../store/slices/categoryGroupsSlice';

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      categoryGroups: categoryGroupsSlice,
    },
    preloadedState: {
      categoryGroups: {
        groups: [],
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: null,
      },
    },
  });
};

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('CategoryGroupFormWithInventory - Real-time Preview', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the enhanced real-time preview section', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Check for the real-time preview heading
    expect(screen.getByText('Real-time Preview')).toBeInTheDocument();
    
    // Check for category group appearance section
    expect(screen.getByText('Category Group Appearance')).toBeInTheDocument();
    
    // Check for inventory status section
    expect(screen.getByText('Inventory Status')).toBeInTheDocument();
    
    // Check for configuration summary section
    expect(screen.getByText('Configuration Summary')).toBeInTheDocument();
  });

  it('should update preview when form values change', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Change the group name
    const nameInput = screen.getByLabelText('Group Name');
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });

    // The preview should show the updated name
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('should show inventory status with proper color coding', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Set current inventory to 5 and threshold to 10 (low stock)
    const currentInventoryInput = screen.getByLabelText('Current Inventory');
    const thresholdInput = screen.getByLabelText('Minimum Threshold');
    
    fireEvent.change(currentInventoryInput, { target: { value: '5' } });
    fireEvent.change(thresholdInput, { target: { value: '10' } });

    // Should show low stock status
    expect(screen.getByText('LOW STOCK')).toBeInTheDocument();
  });

  it('should show unit conversion hints for weight-based inventory', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Switch to weight-based inventory
    const weightOption = screen.getByText('Weight');
    fireEvent.click(weightOption);

    // Should show conversion hint
    expect(screen.getByText(/Tip: 1 kg = 1000 g/)).toBeInTheDocument();
  });

  it('should show validation messages for invalid configurations', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Set negative inventory
    const currentInventoryInput = screen.getByLabelText('Current Inventory');
    fireEvent.change(currentInventoryInput, { target: { value: '-5' } });

    // Should show validation message
    expect(screen.getByText(/Negative inventory requires immediate attention/)).toBeInTheDocument();
  });

  it('should display configuration summary with correct values', () => {
    renderWithProvider(<CategoryGroupFormWithInventory {...mockProps} />);

    // Change form values
    const currentInventoryInput = screen.getByLabelText('Current Inventory');
    const thresholdInput = screen.getByLabelText('Minimum Threshold');
    
    fireEvent.change(currentInventoryInput, { target: { value: '100' } });
    fireEvent.change(thresholdInput, { target: { value: '20' } });

    // Check configuration summary shows correct values (using getAllByText since values appear multiple times)
    expect(screen.getAllByText('100 pcs')).toHaveLength(2); // Once in inventory status, once in summary
    expect(screen.getAllByText('20 pcs')).toHaveLength(2); // Once in inventory status, once in summary
    expect(screen.getByText('Quantity-based')).toBeInTheDocument();
  });
});