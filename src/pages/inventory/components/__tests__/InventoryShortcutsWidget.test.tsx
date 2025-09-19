import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import InventoryShortcutsWidget from '../InventoryShortcutsWidget';
import inventoryReducer from '../../../../store/slices/inventorySlice';

const theme = createTheme();

const mockInventoryLevels = [
  {
    categoryGroupId: 'group1',
    name: 'Test Product 1',
    currentInventory: 5,
    inventoryUnit: 'pcs' as const,
    inventoryType: 'qty' as const,
    minimumThreshold: 10,
    status: 'low_stock' as const,
    lastInventoryUpdate: undefined,
  },
  {
    categoryGroupId: 'group2',
    name: 'Test Product 2',
    currentInventory: 0,
    inventoryUnit: 'kg' as const,
    inventoryType: 'weight' as const,
    minimumThreshold: 5,
    status: 'zero_stock' as const,
    lastInventoryUpdate: undefined,
  },
  {
    categoryGroupId: 'group3',
    name: 'Test Product 3',
    currentInventory: 50,
    inventoryUnit: 'pcs' as const,
    inventoryType: 'qty' as const,
    minimumThreshold: 10,
    status: 'healthy' as const,
    lastInventoryUpdate: undefined,
  },
];

const mockAlerts = [
  {
    id: 'alert1',
    categoryGroupId: 'group1',
    alertType: 'low_stock' as const,
    currentLevel: 5,
    thresholdLevel: 10,
    unit: 'pcs' as const,
    severity: 'critical' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert2',
    categoryGroupId: 'group2',
    alertType: 'zero_stock' as const,
    currentLevel: 0,
    thresholdLevel: 5,
    unit: 'kg' as const,
    severity: 'high' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const mockStore = configureStore({
  reducer: {
    inventory: inventoryReducer,
  },
  preloadedState: {
    inventory: {
      inventoryLevels: mockInventoryLevels,
      filteredInventoryLevels: mockInventoryLevels,
      inventoryMovements: [],
      filteredInventoryMovements: [],
      inventoryAlerts: mockAlerts,
      activeInventoryAlerts: mockAlerts,
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

describe('InventoryShortcutsWidget', () => {
  const mockHandlers = {
    onManualAdjustment: jest.fn(),
    onBulkOperations: jest.fn(),
    onViewReports: jest.fn(),
    onExportData: jest.fn(),
    onImportData: jest.fn(),
    onConfigureThresholds: jest.fn(),
    onViewMovements: jest.fn(),
    onViewAlerts: jest.fn(),
    onSearchInventory: jest.fn(),
    onViewTrends: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Mode', () => {
    it('renders the widget with title and shortcuts', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
      expect(screen.getByText('View Alerts')).toBeInTheDocument();
      expect(screen.getByText('Search Items')).toBeInTheDocument();
    });

    it('displays inventory status summary', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      expect(screen.getByText('Inventory Status Summary')).toBeInTheDocument();
      expect(screen.getByText('3 Total Items')).toBeInTheDocument();
      expect(screen.getByText('1 Low Stock')).toBeInTheDocument();
      expect(screen.getByText('1 Out of Stock')).toBeInTheDocument();
    });

    it('shows critical alerts badge in header', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      expect(screen.getByText('1 alert')).toBeInTheDocument();
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('shows badge on alerts action button', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      // Should show badge with count of critical alerts (1 in our mock data)
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calls handler when shortcut is clicked', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      const manualAdjustmentButton = screen.getByText('Manual Adjustment');
      fireEvent.click(manualAdjustmentButton);

      expect(mockHandlers.onManualAdjustment).toHaveBeenCalledTimes(1);
    });

    it('calls alerts handler when alerts shortcut is clicked', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      const alertsButton = screen.getByText('View Alerts');
      fireEvent.click(alertsButton);

      expect(mockHandlers.onViewAlerts).toHaveBeenCalledTimes(1);
    });
  });

  describe('Compact Mode', () => {
    it('renders compact layout without card wrapper', () => {
      renderWithProviders(
        <InventoryShortcutsWidget 
          {...mockHandlers} 
          compact={true}
          showLabels={true}
        />
      );

      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
      expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
    });

    it('shows icons only when labels are disabled', () => {
      renderWithProviders(
        <InventoryShortcutsWidget 
          {...mockHandlers} 
          compact={true}
          showLabels={false}
        />
      );

      expect(screen.queryByText('Manual Adjustment')).not.toBeInTheDocument();
      
      // Should show buttons but not text labels
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows tooltips on hover in compact mode without labels', () => {
      renderWithProviders(
        <InventoryShortcutsWidget 
          {...mockHandlers} 
          compact={true}
          showLabels={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      // Check that the button has an aria-label for tooltip content
      expect(buttons[0]).toHaveAttribute('aria-label', 'Adjust inventory levels manually');
    });
  });

  describe('Limited Shortcuts', () => {
    it('limits the number of shortcuts displayed', () => {
      renderWithProviders(
        <InventoryShortcutsWidget 
          {...mockHandlers} 
          maxShortcuts={3}
        />
      );

      const buttons = screen.getAllByRole('button');
      // Should have exactly 3 shortcuts (based on priority)
      expect(buttons).toHaveLength(3);
    });

    it('shows high priority shortcuts first', () => {
      renderWithProviders(
        <InventoryShortcutsWidget 
          {...mockHandlers} 
          maxShortcuts={2}
        />
      );

      // Manual Adjustment and View Alerts should be shown (priority 1)
      expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
      expect(screen.getByText('View Alerts')).toBeInTheDocument();
      
      // Lower priority items should not be shown
      expect(screen.queryByText('Configure Thresholds')).not.toBeInTheDocument();
    });
  });

  describe('Selective Handlers', () => {
    it('only shows shortcuts with provided handlers', () => {
      const limitedHandlers = {
        onManualAdjustment: jest.fn(),
        onViewAlerts: jest.fn(),
      };

      renderWithProviders(
        <InventoryShortcutsWidget {...limitedHandlers} />
      );

      expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
      expect(screen.getByText('View Alerts')).toBeInTheDocument();
      
      // Should not show shortcuts without handlers
      expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();
      expect(screen.queryByText('View Reports')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('disables shortcuts when loading', () => {
      const loadingStore = configureStore({
        reducer: {
          inventory: inventoryReducer,
        },
        preloadedState: {
          inventory: {
            ...mockStore.getState().inventory,
            loading: {
              inventoryLevels: true,
              inventoryMovements: false,
              inventoryAlerts: false,
              deduction: false,
              adjustment: false,
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
            <InventoryShortcutsWidget {...mockHandlers} />
          </ThemeProvider>
        </Provider>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Empty State', () => {
    it('shows healthy status when no issues', () => {
      const healthyStore = configureStore({
        reducer: {
          inventory: inventoryReducer,
        },
        preloadedState: {
          inventory: {
            ...mockStore.getState().inventory,
            inventoryLevels: [
              {
                categoryGroupId: 'group1',
                name: 'Healthy Product',
                currentInventory: 50,
                inventoryUnit: 'pcs' as const,
                inventoryType: 'qty' as const,
                minimumThreshold: 10,
                status: 'healthy' as const,
                lastInventoryUpdate: undefined,
              },
            ],
            filteredInventoryLevels: [
              {
                categoryGroupId: 'group1',
                name: 'Healthy Product',
                currentInventory: 50,
                inventoryUnit: 'pcs' as const,
                inventoryType: 'qty' as const,
                minimumThreshold: 10,
                status: 'healthy' as const,
                lastInventoryUpdate: undefined,
              },
            ],
            inventoryAlerts: [],
            activeInventoryAlerts: [],
          },
        },
      });

      render(
        <Provider store={healthyStore}>
          <ThemeProvider theme={theme}>
            <InventoryShortcutsWidget {...mockHandlers} />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByText('All Good')).toBeInTheDocument();
      expect(screen.queryByText('Low Stock')).not.toBeInTheDocument();
      expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument();
    });
  });

  describe('Badge Functionality', () => {
    it('highlights alerts shortcut with error color when critical alerts exist', () => {
      renderWithProviders(
        <InventoryShortcutsWidget {...mockHandlers} />
      );

      const alertsButton = screen.getByText('View Alerts');
      expect(alertsButton).toBeInTheDocument();
      
      // Button should have error color styling due to critical alerts
      expect(alertsButton.closest('button')).toHaveClass('MuiButton-colorError');
    });

    it('shows normal color for alerts when no critical alerts', () => {
      const noAlertsStore = configureStore({
        reducer: {
          inventory: inventoryReducer,
        },
        preloadedState: {
          inventory: {
            ...mockStore.getState().inventory,
            inventoryAlerts: [],
            activeInventoryAlerts: [],
          },
        },
      });

      render(
        <Provider store={noAlertsStore}>
          <ThemeProvider theme={theme}>
            <InventoryShortcutsWidget {...mockHandlers} />
          </ThemeProvider>
        </Provider>
      );

      const alertsButton = screen.getByText('View Alerts');
      expect(alertsButton.closest('button')).not.toHaveClass('MuiButton-colorError');
    });
  });
});