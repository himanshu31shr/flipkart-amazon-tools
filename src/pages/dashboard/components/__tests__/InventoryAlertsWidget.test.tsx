import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import InventoryAlertsWidget from '../InventoryAlertsWidget';
import inventoryReducer from '../../../../store/slices/inventorySlice';
import categoryGroupsReducer from '../../../../store/slices/categoryGroupsSlice';
import { authReducer } from '../../../../store/slices/authSlice';

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ 
      seconds: 1234567890, 
      nanoseconds: 0,
      toDate: () => new Date('2009-02-13T23:31:30.000Z')
    })),
    fromDate: jest.fn((date: Date) => ({ 
      seconds: Math.floor(date.getTime() / 1000), 
      nanoseconds: 0,
      toDate: () => date
    })),
  },
}));

// Mock InventoryAlertsPanel since we're testing the widget wrapper
jest.mock('../../../inventory/components/InventoryAlertsPanel', () => {
  return function MockInventoryAlertsPanel({ 
    variant, 
    maxAlertsInWidget, 
    onManualAdjustment, 
    onViewCategoryGroup 
  }: {
    variant?: string;
    maxAlertsInWidget?: number;
    onManualAdjustment?: (categoryId: string) => void;
    onViewCategoryGroup?: (categoryId: string) => void;
  }) {
    return (
      <div data-testid="inventory-alerts-panel">
        <div data-testid="panel-variant">{variant}</div>
        <div data-testid="max-alerts">{maxAlertsInWidget}</div>
        {onManualAdjustment && (
          <button 
            data-testid="manual-adjustment-button"
            onClick={() => onManualAdjustment('test-category-id')}
          >
            Manual Adjustment
          </button>
        )}
        {onViewCategoryGroup && (
          <button 
            data-testid="view-category-button"
            onClick={() => onViewCategoryGroup('test-category-id')}
          >
            View Category
          </button>
        )}
      </div>
    );
  };
});

const theme = createTheme();

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
      categoryGroups: categoryGroupsReducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
          ignoredPaths: ['auth.user'],
        },
      }),
    preloadedState: {
      inventory: {
        inventoryLevels: [],
        filteredInventoryLevels: [],
        inventoryMovements: [],
        filteredInventoryMovements: [],
        inventoryAlerts: [
          {
            id: 'alert-1',
            categoryGroupId: 'group-1',
            alertType: 'low_stock' as const,
            severity: 'medium' as const,
            currentLevel: 5,
            thresholdLevel: 10,
            unit: 'kg' as const,
            isActive: true,
            acknowledgedBy: undefined,
            acknowledgedAt: undefined,
            createdAt: undefined,
            resolvedAt: undefined,
          }
        ],
        activeInventoryAlerts: [
          {
            id: 'alert-1',
            categoryGroupId: 'group-1',
            alertType: 'low_stock' as const,
            severity: 'medium' as const,
            currentLevel: 5,
            thresholdLevel: 10,
            unit: 'kg' as const,
            isActive: true,
            acknowledgedBy: undefined,
            acknowledgedAt: undefined,
            createdAt: undefined,
            resolvedAt: undefined,
          }
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
        groups: [],
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
          emailVerified: true,
          isAnonymous: false,
          metadata: {
            creationTime: '2023-01-01T00:00:00.000Z',
            lastSignInTime: '2024-01-01T00:00:00.000Z',
          },
          providerData: [],
          refreshToken: 'test-refresh-token',
          tenantId: null,
          delete: jest.fn(),
          getIdToken: jest.fn(),
          getIdTokenResult: jest.fn(),
          reload: jest.fn(),
          toJSON: jest.fn(),
          phoneNumber: null,
          photoURL: null,
          providerId: 'firebase',
        } as any,
        loading: false,
        error: null,
        isAuthenticated: true,
        authStateLoaded: true,
        isLoading: false,
      },
    },
  }) as any;
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('InventoryAlertsWidget', () => {
  describe('component rendering', () => {
    it('should render the InventoryAlertsPanel with widget variant', () => {
      renderWithProviders(<InventoryAlertsWidget />);
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      expect(screen.getByTestId('panel-variant')).toHaveTextContent('widget');
    }) as any;

    it('should pass default maxAlertsInWidget prop', () => {
      renderWithProviders(<InventoryAlertsWidget />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('5');
    }) as any;

    it('should pass custom maxAlertsInWidget prop', () => {
      renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={10} />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('10');
    }) as any;

    it('should render without crashing with minimal props', () => {
      const { container } = renderWithProviders(<InventoryAlertsWidget />);
      
      expect(container).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('callback props', () => {
    it('should call onManualAdjustment when callback is provided', async () => {
      const user = userEvent.setup();
      const mockOnManualAdjustment = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onManualAdjustment={mockOnManualAdjustment} />
      );
      
      const button = screen.getByTestId('manual-adjustment-button');
      await user.click(button);
      
      expect(mockOnManualAdjustment).toHaveBeenCalledWith('test-category-id');
    }) as any;

    it('should call onViewCategoryGroup when callback is provided', async () => {
      const user = userEvent.setup();
      const mockOnViewCategoryGroup = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onViewCategoryGroup={mockOnViewCategoryGroup} />
      );
      
      const button = screen.getByTestId('view-category-button');
      await user.click(button);
      
      expect(mockOnViewCategoryGroup).toHaveBeenCalledWith('test-category-id');
    }) as any;

    it('should handle both callbacks when provided', async () => {
      const user = userEvent.setup();
      const mockOnManualAdjustment = jest.fn();
      const mockOnViewCategoryGroup = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget 
          onManualAdjustment={mockOnManualAdjustment}
          onViewCategoryGroup={mockOnViewCategoryGroup}
        />
      );
      
      const manualButton = screen.getByTestId('manual-adjustment-button');
      const viewButton = screen.getByTestId('view-category-button');
      
      await user.click(manualButton);
      await user.click(viewButton);
      
      expect(mockOnManualAdjustment).toHaveBeenCalledWith('test-category-id');
      expect(mockOnViewCategoryGroup).toHaveBeenCalledWith('test-category-id');
    }) as any;

    it('should not render callback buttons when callbacks are not provided', () => {
      renderWithProviders(<InventoryAlertsWidget />);
      
      expect(screen.queryByTestId('manual-adjustment-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-category-button')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('props validation', () => {
    it('should handle zero maxAlertsInWidget', () => {
      renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={0} />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('0');
    }) as any;

    it('should handle large maxAlertsInWidget values', () => {
      renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={100} />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('100');
    }) as any;

    it('should handle negative maxAlertsInWidget values', () => {
      renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={-1} />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('-1');
    }) as any;
  }) as any;

  describe('widget behavior', () => {
    it('should always pass widget variant regardless of other props', () => {
      renderWithProviders(
        <InventoryAlertsWidget maxAlertsInWidget={15} />
      );
      
      expect(screen.getByTestId('panel-variant')).toHaveTextContent('widget');
    }) as any;

    it('should maintain widget identity with different configurations', () => {
      const configs = [
        { maxAlertsInWidget: 1 },
        { maxAlertsInWidget: 5 },
        { maxAlertsInWidget: 10 },
        { maxAlertsInWidget: 20 },
      ];
      
      configs.forEach(config => {
        const { unmount } = renderWithProviders(<InventoryAlertsWidget {...config} />);
        
        expect(screen.getByTestId('panel-variant')).toHaveTextContent('widget');
        expect(screen.getByTestId('max-alerts')).toHaveTextContent(config.maxAlertsInWidget.toString());
        
        unmount();
      }) as any;
    }) as any;

    it('should work as a dashboard widget component', () => {
      // Test that it can be used as a dashboard widget
      const DashboardMock = () => (
        <div data-testid="dashboard">
          <InventoryAlertsWidget maxAlertsInWidget={3} />
          <InventoryAlertsWidget maxAlertsInWidget={5} />
        </div>
      );
      
      renderWithProviders(<DashboardMock />);
      
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getAllByTestId('inventory-alerts-panel')).toHaveLength(2);
      expect(screen.getAllByTestId('panel-variant')).toHaveLength(2);
    }) as any;
  }) as any;

  describe('user interactions', () => {
    it('should support complete manual adjustment workflow', async () => {
      const user = userEvent.setup();
      const mockOnManualAdjustment = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onManualAdjustment={mockOnManualAdjustment} />
      );
      
      const button = screen.getByTestId('manual-adjustment-button');
      
      // Test multiple clicks
      await user.click(button);
      await user.click(button);
      
      expect(mockOnManualAdjustment).toHaveBeenCalledTimes(2);
      expect(mockOnManualAdjustment).toHaveBeenCalledWith('test-category-id');
    }) as any;

    it('should support complete view category workflow', async () => {
      const user = userEvent.setup();
      const mockOnViewCategoryGroup = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onViewCategoryGroup={mockOnViewCategoryGroup} />
      );
      
      const button = screen.getByTestId('view-category-button');
      
      // Test keyboard interaction
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(mockOnViewCategoryGroup).toHaveBeenCalledWith('test-category-id');
    }) as any;

    it('should handle rapid user interactions', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onManualAdjustment={mockCallback} />
      );
      
      const button = screen.getByTestId('manual-adjustment-button');
      
      // Rapid clicking
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(mockCallback).toHaveBeenCalledTimes(3);
    }) as any;
  }) as any;

  describe('error handling', () => {
    it('should render without errors when wrapped component fails gracefully', () => {
      // This test ensures the widget wrapper doesn't break if the panel has issues
      renderWithProviders(<InventoryAlertsWidget />);
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
    }) as any;

    it('should handle undefined callbacks gracefully', () => {
      renderWithProviders(
        <InventoryAlertsWidget 
          onManualAdjustment={undefined}
          onViewCategoryGroup={undefined}
        />
      );
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('manual-adjustment-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-category-button')).not.toBeInTheDocument();
    }) as any;

    it('should handle null props gracefully', () => {
      renderWithProviders(
        <InventoryAlertsWidget 
          maxAlertsInWidget={undefined}
          onManualAdjustment={undefined}
          onViewCategoryGroup={undefined}
        />
      );
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should maintain accessibility structure from wrapped component', () => {
      renderWithProviders(<InventoryAlertsWidget />);
      
      // The accessibility is handled by the wrapped InventoryAlertsPanel
      const panel = screen.getByTestId('inventory-alerts-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toBeVisible();
    }) as any;

    it('should pass through all props to maintain accessibility', () => {
      const mockCallback = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget 
          maxAlertsInWidget={3}
          onManualAdjustment={mockCallback}
          onViewCategoryGroup={mockCallback}
        />
      );
      
      // Verify all props are passed through correctly
      expect(screen.getByTestId('panel-variant')).toHaveTextContent('widget');
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('3');
      expect(screen.getByTestId('manual-adjustment-button')).toBeInTheDocument();
      expect(screen.getByTestId('view-category-button')).toBeInTheDocument();
    }) as any;

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();
      
      renderWithProviders(
        <InventoryAlertsWidget onManualAdjustment={mockCallback} />
      );
      
      const button = screen.getByTestId('manual-adjustment-button');
      
      // Test keyboard accessibility
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockCallback).toHaveBeenCalledWith('test-category-id');
    }) as any;
  }) as any;

  describe('responsive behavior', () => {
    it('should render correctly on different screen sizes', () => {
      // Test mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      renderWithProviders(<InventoryAlertsWidget />);
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      
      // Test tablet viewport
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      
      // Test desktop viewport
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
    }) as any;

    it('should maintain widget behavior across viewports', () => {
      renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={7} />);
      
      // Verify widget variant is maintained regardless of screen size
      expect(screen.getByTestId('panel-variant')).toHaveTextContent('widget');
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('7');
    }) as any;
  }) as any;

  describe('performance', () => {
    it('should handle component re-renders gracefully', () => {
      const { rerender } = renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={5} />);
      
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('5');
      
      rerender(<InventoryAlertsWidget maxAlertsInWidget={5} />);
      
      // Component should still render correctly after re-render
      expect(screen.getByTestId('inventory-alerts-panel')).toBeInTheDocument();
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('5');
    }) as any;

    it('should handle rapid prop changes', () => {
      const { rerender } = renderWithProviders(<InventoryAlertsWidget maxAlertsInWidget={1} />);
      
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('1');
      
      rerender(<InventoryAlertsWidget maxAlertsInWidget={2} />);
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('2');
      
      rerender(<InventoryAlertsWidget maxAlertsInWidget={3} />);
      expect(screen.getByTestId('max-alerts')).toHaveTextContent('3');
    }) as any;

    it('should handle callback function changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const { rerender } = renderWithProviders(
        <InventoryAlertsWidget onManualAdjustment={callback1} />
      );
      
      expect(screen.getByTestId('manual-adjustment-button')).toBeInTheDocument();
      
      rerender(<InventoryAlertsWidget onManualAdjustment={callback2} />);
      
      expect(screen.getByTestId('manual-adjustment-button')).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any;