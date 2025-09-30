import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EditableInventoryLevelCell from '../EditableInventoryLevelCell';
import { InventoryLevel } from '../../../../types/inventory';
import inventoryReducer from '../../../../store/slices/inventorySlice';

// Mock the InventoryService
jest.mock('../../../../services/inventory.service', () => ({
  InventoryService: jest.fn().mockImplementation(() => ({
    adjustInventoryManually: jest.fn().mockResolvedValue({
      newInventoryLevel: 100,
      movementId: 'test-movement-id'
    })
  }))
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
    },
  });
};

const mockInventoryLevel: InventoryLevel = {
  categoryGroupId: 'test-group-id',
  name: 'Test Category Group',
  currentInventory: 50,
  inventoryUnit: 'kg',
  inventoryType: 'weight',
  minimumThreshold: 10,
  status: 'healthy',
};

const renderWithProvider = (
  component: React.ReactElement,
  store = createTestStore()
) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('EditableInventoryLevelCell', () => {
  let mockOnUpdateSuccess: jest.Mock;
  let mockOnUpdateError: jest.Mock;

  beforeEach(() => {
    mockOnUpdateSuccess = jest.fn();
    mockOnUpdateError = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders current inventory value correctly', () => {
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    expect(screen.getByText('50.00 kg')).toBeInTheDocument();
  });

  it('formats inventory value with unit conversion for grams', () => {
    const gramsInventoryLevel = {
      ...mockInventoryLevel,
      currentInventory: 1500,
      inventoryUnit: 'g' as const,
    };

    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={gramsInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    expect(screen.getByText('1.50 kg')).toBeInTheDocument();
  });

  it('shows error styling for zero inventory', () => {
    const zeroInventoryLevel = {
      ...mockInventoryLevel,
      currentInventory: 0,
    };

    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={zeroInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    const inventoryText = screen.getByText('0.00 kg');
    expect(inventoryText).toHaveStyle({ color: 'rgb(211, 47, 47)' }); // error.main color
  });

  it('enters edit mode when clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('shows edit button on hover', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    const container = screen.getByText('50.00 kg').closest('div');
    expect(container).toBeInTheDocument();

    await user.hover(container!);

    const editButton = screen.getByRole('button', { name: /click to set inventory level/i });
    expect(editButton).toBeInTheDocument();
  });

  it('validates negative values', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    // Enter edit mode
    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    // Enter negative value
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '-10');

    // Try to save
    const saveButton = screen.getByTestId('CheckIcon').closest('button')!;
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid non-negative number')).toBeInTheDocument();
    });
  });

  it('validates unreasonably high values', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    // Enter edit mode
    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    // Enter very high value
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '200000');

    // Try to save
    const saveButton = screen.getByTestId('CheckIcon').closest('button')!;
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Inventory level seems unreasonably high. Please verify.')).toBeInTheDocument();
    });
  });

  it('exits edit mode without changes when same value entered', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    // Enter edit mode
    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    // Keep the same value and save
    const saveButton = screen.getByTestId('CheckIcon').closest('button')!;
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('50.00 kg')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    expect(mockOnUpdateSuccess).not.toHaveBeenCalled();
  });

  it('cancels edit mode when cancel button clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    // Enter edit mode
    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    // Change value
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '75');

    // Cancel
    const cancelButton = screen.getByTestId('CloseIcon').closest('button')!;
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('50.00 kg')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <EditableInventoryLevelCell
        inventoryLevel={mockInventoryLevel}
        onUpdateSuccess={mockOnUpdateSuccess}
        onUpdateError={mockOnUpdateError}
      />
    );

    // Enter edit mode
    const inventoryDisplay = screen.getByText('50.00 kg');
    await user.click(inventoryDisplay);

    const input = screen.getByRole('spinbutton');
    
    // Test Escape key to cancel
    await user.clear(input);
    await user.type(input, '75');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByText('50.00 kg')).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });
});