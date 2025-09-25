import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';
import QuickActionsPanel from '../QuickActionsPanel';
import inventoryReducer from '../../../../store/slices/inventorySlice';

const theme = createTheme();

const mockStore = configureStore({ 
  reducer: {
    inventory: inventoryReducer,
  } as any,
  preloadedState: {
    inventory: {
      inventoryLevels: [],
      filteredInventoryLevels: [],
      inventoryMovements: [],
      filteredInventoryMovements: [],
      inventoryAlerts: [
        {
          id: 'alert1',
          categoryGroupId: 'group1',
          alertType: 'low_stock' as const,
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs' as const,
          severity: 'critical' as const,
          isActive: true,
          createdAt: Timestamp.fromDate(new Date()),
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
          createdAt: Timestamp.fromDate(new Date()),
        },
      ],
      activeInventoryAlerts: [
        {
          id: 'alert1',
          categoryGroupId: 'group1',
          alertType: 'low_stock' as const,
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs' as const,
          severity: 'critical' as const,
          isActive: true,
          createdAt: Timestamp.fromDate(new Date()),
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
          createdAt: Timestamp.fromDate(new Date()),
        },
      ],
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
      },      lastDeductionResult: null,
    },
  },
}) as any;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </Provider>
  );
};

describe('QuickActionsPanel', () => {
  const mockHandlers = {
    onManualAdjustment: jest.fn(),
    onBulkOperations: jest.fn(),
    onExportData: jest.fn(),
    onViewAlerts: jest.fn(),
    onConfigureThresholds: jest.fn(),
    onViewMovements: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('Floating Mode', () => {
    it('renders floating SpeedDial by default', () => {
      renderWithProviders(
        <QuickActionsPanel {...mockHandlers} />
      );

      expect(screen.getByLabelText('Quick inventory actions')).toBeInTheDocument();
    }) as any;

    it('opens SpeedDial and shows action buttons when clicked', async () => {
      renderWithProviders(
        <QuickActionsPanel {...mockHandlers} />
      );

      const speedDial = screen.getByLabelText('Quick inventory actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
        expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
        expect(screen.getByText('Refresh Data')).toBeInTheDocument();
        expect(screen.getByText('Export Report')).toBeInTheDocument();
        expect(screen.getByText('View Alerts')).toBeInTheDocument();
        expect(screen.getByText('Configure Thresholds')).toBeInTheDocument();
        expect(screen.getByText('View Movements')).toBeInTheDocument();
      }) as any;
    }) as any;

    it('shows badge on alerts action when critical alerts exist', async () => {
      renderWithProviders(
        <QuickActionsPanel {...mockHandlers} showBadges={true} />
      );

      const speedDial = screen.getByLabelText('Quick inventory actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        // Should show badge with count of critical alerts (1 in our mock data)
        expect(screen.getByText('1')).toBeInTheDocument();
      }) as any;
    }) as any;

    it('calls appropriate handler when action is clicked', async () => {
      renderWithProviders(
        <QuickActionsPanel {...mockHandlers} />
      );

      const speedDial = screen.getByLabelText('Quick inventory actions');
      fireEvent.click(speedDial);

      await waitFor(() => {
        const manualAdjustmentAction = screen.getByText('Manual Adjustment');
        fireEvent.click(manualAdjustmentAction);
      }) as any;

      expect(mockHandlers.onManualAdjustment).toHaveBeenCalledTimes(1);
    }) as any;
  }) as any;

  describe('Embedded Mode', () => {
    it('renders button group in embedded mode', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
        />
      );

      expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    }) as any;

    it('supports horizontal orientation', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          orientation="horizontal"
          showLabels={true}
        />
      );

      const buttonGroup = screen.getByRole('group');
      expect(buttonGroup).toBeInTheDocument();
    }) as any;

    it('supports vertical orientation', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          orientation="vertical"
          showLabels={true}
        />
      );

      const buttonGroup = screen.getByRole('group');
      expect(buttonGroup).toBeInTheDocument();
    }) as any;

    it('calls handler when embedded button is clicked', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
        />
      );

      const exportButton = screen.getByText('Export Report');
      fireEvent.click(exportButton);

      expect(mockHandlers.onExportData).toHaveBeenCalledTimes(1);
    }) as any;
  }) as any;

  describe('Compact Mode', () => {
    it('renders compact buttons with icons only', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="compact" 
          showLabels={false}
        />
      );

      // Should show buttons but not text labels
      expect(screen.queryByText('Manual Adjustment')).not.toBeInTheDocument();
      
      // Should show tooltips on hover
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    }) as any;

    it('shows tooltips for compact mode buttons', async () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="compact" 
          showLabels={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      fireEvent.mouseOver(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe('Custom Actions', () => {
    it('renders custom actions', () => {
      const customActions = [
        {
          icon: <div>Custom Icon</div>,
          label: 'Custom Action',
          onClick: jest.fn(),
        },
      ];

      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
          customActions={customActions}
        />
      );

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    }) as any;

    it('calls custom action handler when clicked', () => {
      const customHandler = jest.fn();
      const customActions = [
        {
          icon: <div>Custom Icon</div>,
          label: 'Custom Action',
          onClick: customHandler,
        },
      ];

      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
          customActions={customActions}
        />
      );

      const customButton = screen.getByText('Custom Action');
      fireEvent.click(customButton);

      expect(customHandler).toHaveBeenCalledTimes(1);
    }) as any;
  }) as any;

  describe('Badge Functionality', () => {
    it('shows badges when enabled', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
          showBadges={true}
        />
      );

      // Should show critical alerts count as badge
      expect(screen.getByText('1')).toBeInTheDocument();
    }) as any;

    it('hides badges when disabled', () => {
      renderWithProviders(
        <QuickActionsPanel 
          {...mockHandlers} 
          mode="embedded" 
          showLabels={true}
          showBadges={false}
        />
      );

      // Should not show badge count
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Loading States', () => {
    it('disables actions when loading', () => {
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
      }) as any;

      render(
        <Provider store={loadingStore}>
          <ThemeProvider theme={theme}>
            <QuickActionsPanel 
              {...mockHandlers} 
              mode="embedded" 
              showLabels={true}
            />
          </ThemeProvider>
        </Provider>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      }) as any;
    }) as any;
  }) as any;
}) as any;