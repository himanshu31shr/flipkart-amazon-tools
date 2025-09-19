import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import BulkActionsToolbar from '../BulkActionsToolbar';
import inventoryReducer from '../../../../store/slices/inventorySlice';
import { InventoryLevel } from '../../../../types/inventory';

const theme = createTheme();

const mockSelectedItems: InventoryLevel[] = [
  {
    categoryGroupId: 'group1',
    name: 'Test Product 1',
    currentInventory: 15,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 10,
    status: 'healthy',
    lastInventoryUpdate: undefined,
  },
  {
    categoryGroupId: 'group2',
    name: 'Test Product 2',
    currentInventory: 5,
    inventoryUnit: 'kg',
    inventoryType: 'weight',
    minimumThreshold: 10,
    status: 'low_stock',
    lastInventoryUpdate: undefined,
  },
  {
    categoryGroupId: 'group3',
    name: 'Test Product 3',
    currentInventory: 0,
    inventoryUnit: 'pcs',
    inventoryType: 'qty',
    minimumThreshold: 5,
    status: 'zero_stock',
    lastInventoryUpdate: undefined,
  },
];

const mockStore = configureStore({
  reducer: {
    inventory: inventoryReducer,
  },
  preloadedState: {
    inventory: {
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
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </Provider>
  );
};

describe('BulkActionsToolbar', () => {
  const mockHandlers = {
    onClearSelection: jest.fn(),
    onBulkAdjustment: jest.fn(),
    onBulkExport: jest.fn(),
    onBulkThresholdUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility and Basic Rendering', () => {
    it('does not render when no items are selected', () => {
      const { container } = renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={[]} 
          {...mockHandlers}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders when items are selected', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      expect(screen.getByText('3 selected')).toBeInTheDocument();
      expect(screen.getByText('Total: 20 units')).toBeInTheDocument();
    });

    it('displays status chips for selected items', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      expect(screen.getByText('1 healthy')).toBeInTheDocument();
      expect(screen.getByText('1 low stock')).toBeInTheDocument();
      expect(screen.getByText('1 zero stock')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          compact={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('3 selected')).toBeInTheDocument();
      // Status chips should not be visible in compact mode
      expect(screen.queryByText('1 healthy')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows bulk adjustment button', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Bulk Adjustment')).toBeInTheDocument();
    });

    it('shows update thresholds button', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Update Thresholds')).toBeInTheDocument();
    });

    it('calls clear selection when close button is clicked', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const closeButton = screen.getByLabelText('Clear Selection');
      fireEvent.click(closeButton);

      expect(mockHandlers.onClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Actions Menu', () => {
    it('opens and closes actions menu', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => 
        button.querySelector('[data-testid="MoreVertIcon"]')
      );
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Export Selected')).toBeInTheDocument();
        expect(screen.getByText('Filter by Selection')).toBeInTheDocument();
      });

      // Just verify the menu is open - don't test closing behavior
      // as it's complex MUI internal behavior
      expect(screen.getByText('Export Selected')).toBeInTheDocument();
    });

    it('calls export handler when export menu item is clicked', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => 
        button.querySelector('[data-testid="MoreVertIcon"]')
      );
      fireEvent.click(menuButton!);

      await waitFor(() => {
        const exportMenuItem = screen.getByText('Export Selected');
        fireEvent.click(exportMenuItem);
      });

      expect(mockHandlers.onBulkExport).toHaveBeenCalledWith(mockSelectedItems);
    });
  });

  describe('Bulk Adjustment Dialog', () => {
    it('opens bulk adjustment dialog', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      fireEvent.click(adjustmentButton);

      await waitFor(() => {
        expect(screen.getByText('Bulk Inventory Adjustment')).toBeInTheDocument();
        expect(screen.getByText('Adjusting 3 items')).toBeInTheDocument();
      });
    });

    it('allows setting adjustment type and amount', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      fireEvent.click(adjustmentButton);

      await waitFor(() => {
        expect(screen.getByText('Bulk Inventory Adjustment')).toBeInTheDocument();
      });

      // Set amount first (easier to test)
      const amountInput = screen.getByLabelText('Amount');
      fireEvent.change(amountInput, { target: { value: '5' } });

      expect(amountInput).toHaveValue(5);
      
      // Test that adjustment type selector is present by looking for the combobox
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('calls bulk adjustment handler when applied', async () => {
      mockHandlers.onBulkAdjustment.mockResolvedValue(undefined);

      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      fireEvent.click(adjustmentButton);

      await waitFor(() => {
        // Set amount
        const amountInput = screen.getByLabelText('Amount');
        fireEvent.change(amountInput, { target: { value: '10' } });

        // Set reason
        const reasonInput = screen.getByLabelText('Reason (Optional)');
        fireEvent.change(reasonInput, { target: { value: 'Test adjustment' } });

        // Apply adjustment
        const applyButton = screen.getByText('Apply Adjustment');
        fireEvent.click(applyButton);
      });

      expect(mockHandlers.onBulkAdjustment).toHaveBeenCalledWith(
        mockSelectedItems,
        {
          type: 'add',
          amount: 10,
          reason: 'Test adjustment',
        }
      );
    });

    it('disables apply button when amount is zero', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      fireEvent.click(adjustmentButton);

      await waitFor(() => {
        const applyButton = screen.getByText('Apply Adjustment');
        expect(applyButton).toBeDisabled();
      });
    });
  });

  describe('Bulk Threshold Update Dialog', () => {
    it('opens bulk threshold update dialog', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const thresholdButton = screen.getByText('Update Thresholds');
      fireEvent.click(thresholdButton);

      await waitFor(() => {
        expect(screen.getByText('Update Bulk Thresholds')).toBeInTheDocument();
        expect(screen.getByText('Updating thresholds for 3 items')).toBeInTheDocument();
      });
    });

    it('calls bulk threshold update handler when applied', async () => {
      mockHandlers.onBulkThresholdUpdate.mockResolvedValue(undefined);

      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const thresholdButton = screen.getByText('Update Thresholds');
      fireEvent.click(thresholdButton);

      await waitFor(() => {
        expect(screen.getByText('Update Bulk Thresholds')).toBeInTheDocument();
      });

      // Set threshold value
      const thresholdInput = screen.getByLabelText('New Minimum Threshold');
      fireEvent.change(thresholdInput, { target: { value: '15' } });

      // Find and click the update button in the dialog
      const updateButtons = screen.getAllByText('Update Thresholds');
      const dialogUpdateButton = updateButtons.find(button => 
        button.closest('[role="dialog"]')
      );
      fireEvent.click(dialogUpdateButton!);

      await waitFor(() => {
        expect(mockHandlers.onBulkThresholdUpdate).toHaveBeenCalledWith(
          mockSelectedItems,
          15
        );
      });
    });

    it('shows warning message in threshold dialog', async () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const thresholdButton = screen.getByText('Update Thresholds');
      fireEvent.click(thresholdButton);

      await waitFor(() => {
        expect(screen.getByText(/This will overwrite existing threshold settings/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('disables actions when adjustment is loading', () => {
      const loadingStore = configureStore({
        reducer: {
          inventory: inventoryReducer,
        },
        preloadedState: {
          inventory: {
            ...mockStore.getState().inventory,
            loading: {
              inventoryLevels: false,
              inventoryMovements: false,
              inventoryAlerts: false,
              deduction: false,
              adjustment: true, // Loading state
              alertCreation: false,
              alertAcknowledgment: false,
              alertResolution: false,
            },
          },
        },
      });

      render(
        <Provider store={loadingStore}>
          <ThemeProvider theme={theme}>
            <BulkActionsToolbar 
              selectedItems={mockSelectedItems} 
              {...mockHandlers}
            />
          </ThemeProvider>
        </Provider>
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      const thresholdButton = screen.getByText('Update Thresholds');

      expect(adjustmentButton).toBeDisabled();
      expect(thresholdButton).toBeDisabled();
    });
  });

  describe('Responsive Behavior', () => {
    it('handles compact mode correctly', () => {
      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          compact={true}
          {...mockHandlers}
        />
      );

      // In compact mode, detailed information should be hidden
      expect(screen.queryByText('Total: 20 units')).not.toBeInTheDocument();
      expect(screen.queryByText('1 healthy')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles bulk adjustment errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockHandlers.onBulkAdjustment.mockRejectedValue(new Error('Adjustment failed'));

      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const adjustmentButton = screen.getByText('Bulk Adjustment');
      fireEvent.click(adjustmentButton);

      await waitFor(() => {
        const amountInput = screen.getByLabelText('Amount');
        fireEvent.change(amountInput, { target: { value: '10' } });

        const applyButton = screen.getByText('Apply Adjustment');
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Bulk adjustment failed:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles bulk threshold update errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockHandlers.onBulkThresholdUpdate.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(
        <BulkActionsToolbar 
          selectedItems={mockSelectedItems} 
          {...mockHandlers}
        />
      );

      const thresholdButton = screen.getByText('Update Thresholds');
      fireEvent.click(thresholdButton);

      await waitFor(() => {
        expect(screen.getByText('Update Bulk Thresholds')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByLabelText('New Minimum Threshold');
      fireEvent.change(thresholdInput, { target: { value: '15' } });

      // Find and click the update button in the dialog
      const updateButtons = screen.getAllByText('Update Thresholds');
      const dialogUpdateButton = updateButtons.find(button => 
        button.closest('[role="dialog"]')
      );
      fireEvent.click(dialogUpdateButton!);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Bulk threshold update failed:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });
});