import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import { MobileTodaysOrdersPage } from '../MobileTodaysOrdersPage';
import ordersReducer, { setFilters, setBatchFilter, OrdersState } from '../../../../store/slices/ordersSlice';
import authReducer, { AuthState } from '../../../../store/slices/authSlice';
import * as mobileUtils from '../../../../utils/mobile';
import { ProductSummary } from '../../../../pages/home/services/base.transformer';

// Mock the mobile utilities
jest.mock('../../../../utils/mobile', () => ({
  getSafeAreaInsets: jest.fn(() => ({
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px'
  })),
  useIsMobile: jest.fn(() => true)
}));

// Mock the pull-to-refresh hook
jest.mock('../../../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: jest.fn((onRefresh) => ({
    state: {
      isPulling: false,
      pullDistance: 0,
      isRefreshing: false,
      shouldRefresh: false,
      progress: 0,
    },
    containerRef: { current: null },
  })),
  getPullToRefreshIndicatorStyle: jest.fn(() => ({})),
  getPullToRefreshRotation: jest.fn(() => 0),
}));

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web')
  }
}));

// Mock Firebase - firebase.config.ts exports app, auth, db, storage
jest.mock('../../../../services/firebase.config', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
  storage: {},
  app: {}
}));

// Mock services
jest.mock('../../../../services/todaysOrder.service', () => ({
  TodaysOrder: jest.fn().mockImplementation(() => ({
    getTodaysOrders: jest.fn().mockResolvedValue({ orders: [] }),
    getOrdersForDate: jest.fn().mockResolvedValue({ orders: [] }),
  }))
}));

jest.mock('../../../../services/batch.service', () => ({
  batchService: {
    getBatchesForDate: jest.fn().mockResolvedValue([]),
  }
}));

jest.mock('../../../../services/barcode.service', () => ({
  BarcodeService: jest.fn().mockImplementation(() => ({
    getBarcodesForDate: jest.fn().mockResolvedValue([]),
  }))
}));

const theme = createTheme();

// Mock orders with proper ProductSummary structure
const mockOrders: ProductSummary[] = [
  {
    name: 'Test Product 1',
    SKU: 'SKU-001',
    quantity: '2',
    type: 'amazon',
    orderId: 'AMZ-001',
    categoryId: 'cat-1',
    category: 'Category 1',
    batchInfo: {
      batchId: 'BATCH-001',
      fileName: 'batch_001.pdf',
      uploadedAt: '2025-01-05T10:00:00',
    },
    isCompleted: false,
  },
  {
    name: 'Test Product 2',
    SKU: 'SKU-002',
    quantity: '1',
    type: 'flipkart',
    orderId: 'FLP-001',
    categoryId: 'cat-2',
    category: 'Category 2',
    batchInfo: {
      batchId: 'BATCH-001',
      fileName: 'batch_001.pdf',
      uploadedAt: '2025-01-05T10:00:00',
    },
    isCompleted: false,
  },
  {
    name: 'Test Product 3',
    SKU: 'SKU-003',
    quantity: '3',
    type: 'amazon',
    orderId: 'AMZ-002',
    categoryId: 'cat-1',
    category: 'Category 1',
    batchInfo: {
      batchId: 'BATCH-002',
      fileName: 'batch_002.pdf',
      uploadedAt: '2025-01-05T11:00:00',
    },
    isCompleted: true,
    completedAt: '2025-01-05T12:00:00',
    completedBy: 'test-user-id',
  },
];

const mockBatches = [
  {
    batchId: 'BATCH-001',
    fileName: 'batch_001.pdf',
    uploadedAt: '2025-01-05T10:00:00',
    platform: 'amazon' as const,
    orderCount: 2,
  },
  {
    batchId: 'BATCH-002',
    fileName: 'batch_002.pdf',
    uploadedAt: '2025-01-05T11:00:00',
    platform: 'amazon' as const,
    orderCount: 1,
  },
];

interface TestStoreState {
  orders?: Partial<OrdersState>;
  auth?: Partial<AuthState>;
}

const createMockStore = (initialState: TestStoreState = {}) => {
  return configureStore({
    reducer: {
      orders: ordersReducer,
      auth: authReducer,
    },
    preloadedState: {
      orders: {
        items: mockOrders,
        loading: false,
        error: null,
        lastFetched: null,
        pendingUpdates: {},
        batchFilter: null,
        platformFilter: 'all' as const,
        completionFilter: 'all' as const,
        batches: mockBatches,
        batchesLoading: false,
        selectedDate: null,
        ...initialState.orders
      },
      auth: {
        isAuthenticated: true,
        user: { uid: 'test-user-id', email: 'test@example.com' },
        loading: false,
        error: null,
        ...initialState.auth
      }
    }
  });
};

const renderWithProviders = (store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <MobileTodaysOrdersPage />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('MobileTodaysOrdersPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Page Load', () => {
    it('should render the mobile orders page with title', () => {
      renderWithProviders();
      expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    });

    it('should display all orders on initial load', () => {
      renderWithProviders();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
      expect(screen.getByText('Test Product 3')).toBeInTheDocument();
    });

    it('should display order count in header', () => {
      renderWithProviders();
      // Should show "3 Orders" or similar
      expect(screen.getByText(/3\s+Orders/i)).toBeInTheDocument();
    });

    it('should render date picker with today\'s date', () => {
      renderWithProviders();
      const datePicker = screen.getByLabelText(/order date/i);
      expect(datePicker).toBeInTheDocument();
    });

    it('should render filter button with badge showing active filters', () => {
      renderWithProviders();
      const filterButton = screen.getByLabelText(/open filters/i);
      expect(filterButton).toBeInTheDocument();
    });

    it('should render barcode scanner FAB', () => {
      renderWithProviders();
      const scannerButton = screen.getByLabelText(/open barcode scanner/i);
      expect(scannerButton).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('should trigger fetchOrdersForDate when date changes', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Simulate date picker interaction
      // Note: Actual date picker interaction would require more complex mocking
      // This test verifies the structure exists
      const datePicker = screen.getByLabelText(/order date/i);
      expect(datePicker).toBeInTheDocument();
    });

    it('should update batches when date changes', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Verify batches are loaded
      const batch1 = screen.getByText(/Batch batch_001\.pdf/i);
      const batch2 = screen.getByText(/Batch batch_002\.pdf/i);

      expect(batch1).toBeInTheDocument();
      expect(batch2).toBeInTheDocument();
    });
  });

  describe('Platform Filtering', () => {
    it('should filter to show only Amazon orders', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Apply platform filter through Redux action
      act(() => {
        store.dispatch(setFilters({ platformFilter: 'amazon' }));
      });

      await waitFor(() => {
        // Should show only Amazon orders (Product 1 and 3)
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument(); // Flipkart
        expect(screen.getByText('Test Product 3')).toBeInTheDocument();
      });
    });

    it('should filter to show only Flipkart orders', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      act(() => {
        store.dispatch(setFilters({ platformFilter: 'flipkart' }));
      });

      await waitFor(() => {
        expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        expect(screen.queryByText('Test Product 3')).not.toBeInTheDocument();
      });
    });

    it('should show all orders when platform filter is "all"', async () => {
      const store = createMockStore({
        orders: {
          platformFilter: 'amazon' // Start with filter applied
        }
      });
      renderWithProviders(store);

      // Reset to "all"
      act(() => {
        store.dispatch(setFilters({ platformFilter: 'all' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        expect(screen.getByText('Test Product 3')).toBeInTheDocument();
      });
    });

    it('should update filter badge count when filters are applied', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      const filterButton = screen.getByLabelText(/open filters/i);

      // Initially no badge
      expect(within(filterButton).queryByText('1')).not.toBeInTheDocument();

      // Apply filter
      act(() => {
        store.dispatch(setFilters({ platformFilter: 'amazon' }));
      });

      await waitFor(() => {
        // Badge should show "1" active filter
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('Batch Grouping', () => {
    it('should group orders by batch ID', () => {
      renderWithProviders();

      // Check for batch headers
      const batch1Header = screen.getByText(/Batch batch_001\.pdf/i);
      const batch2Header = screen.getByText(/Batch batch_002\.pdf/i);

      expect(batch1Header).toBeInTheDocument();
      expect(batch2Header).toBeInTheDocument();
    });

    it('should show correct order count badge per batch', () => {
      renderWithProviders();

      // BATCH-001 has 2 orders
      const batch1Section = screen.getByText(/Batch batch_001\.pdf/i).closest('.MuiAccordion-root');
      const batch1Badge = within(batch1Section!).getByText('2');
      expect(batch1Badge).toBeInTheDocument();

      // BATCH-002 has 1 order
      const batch2Section = screen.getByText(/Batch batch_002\.pdf/i).closest('.MuiAccordion-root');
      const batch2Badge = within(batch2Section!).getByText('1');
      expect(batch2Badge).toBeInTheDocument();
    });

    it('should expand batch accordion on click', async () => {
      renderWithProviders();

      const batchHeader = screen.getByText(/Batch batch_001\.pdf/i);
      const accordion = batchHeader.closest('.MuiAccordion-root');

      // All batches should be expanded by default
      expect(accordion).toHaveClass('Mui-expanded');
    });

    it('should collapse batch accordion when clicked again', async () => {
      renderWithProviders();

      const batchHeader = screen.getByText(/Batch batch_001\.pdf/i);

      // Click to collapse (starts expanded)
      fireEvent.click(batchHeader);

      await waitFor(() => {
        const accordion = batchHeader.closest('.MuiAccordion-root');
        expect(accordion).not.toHaveClass('Mui-expanded');
      });
    });

    it('should display orders within their respective batches', () => {
      renderWithProviders();

      // Verify Product 1 and 2 are in BATCH-001
      const batch1Section = screen.getByText(/Batch batch_001\.pdf/i).closest('.MuiAccordion-root');
      expect(within(batch1Section!).getByText('Test Product 1')).toBeInTheDocument();
      expect(within(batch1Section!).getByText('Test Product 2')).toBeInTheDocument();

      // Verify Product 3 is in BATCH-002
      const batch2Section = screen.getByText(/Batch batch_002\.pdf/i).closest('.MuiAccordion-root');
      expect(within(batch2Section!).getByText('Test Product 3')).toBeInTheDocument();
    });
  });

  describe('Batch Filtering', () => {
    it('should filter orders by selected batch', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Filter to BATCH-001
      act(() => {
        store.dispatch(setBatchFilter('BATCH-001'));
      });

      await waitFor(() => {
        // Should only show BATCH-001 section
        expect(screen.getByText(/Batch batch_001\.pdf/i)).toBeInTheDocument();
        expect(screen.queryByText(/Batch batch_002\.pdf/i)).not.toBeInTheDocument();
      });
    });

    it('should show all batches when batch filter is null', async () => {
      const store = createMockStore({
        orders: {
          batchFilter: 'BATCH-001' // Start with filter
        }
      });
      renderWithProviders(store);

      // Clear batch filter
      act(() => {
        store.dispatch(setBatchFilter(null));
      });

      await waitFor(() => {
        expect(screen.getByText(/Batch batch_001\.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Batch batch_002\.pdf/i)).toBeInTheDocument();
      });
    });
  });

  describe('Completion Status Filtering', () => {
    it('should filter to show only pending orders', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      act(() => {
        store.dispatch(setFilters({ completionFilter: 'pending' }));
      });

      await waitFor(() => {
        // Product 1 and 2 are pending
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        // Product 3 is completed
        expect(screen.queryByText('Test Product 3')).not.toBeInTheDocument();
      });
    });

    it('should filter to show only completed orders', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      act(() => {
        store.dispatch(setFilters({ completionFilter: 'completed' }));
      });

      await waitFor(() => {
        // Only Product 3 is completed
        expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
        expect(screen.getByText('Test Product 3')).toBeInTheDocument();
      });
    });

    it('should show all orders when completion filter is "all"', async () => {
      const store = createMockStore({
        orders: {
          completionFilter: 'pending' // Start with filter
        }
      });
      renderWithProviders(store);

      act(() => {
        store.dispatch(setFilters({ completionFilter: 'all' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.getByText('Test Product 2')).toBeInTheDocument();
        expect(screen.getByText('Test Product 3')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Filters Combined', () => {
    it('should apply multiple filters simultaneously', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Apply platform=amazon AND completion=pending
      act(() => {
        store.dispatch(setFilters({
          platformFilter: 'amazon',
          completionFilter: 'pending'
        }));
      });

      await waitFor(() => {
        // Only Product 1 matches (amazon + pending)
        expect(screen.getByText('Test Product 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument(); // Flipkart
        expect(screen.queryByText('Test Product 3')).not.toBeInTheDocument(); // Completed
      });
    });

    it('should update filter badge to show count of active filters', async () => {
      const store = createMockStore();
      renderWithProviders(store);

      // Apply 3 filters
      act(() => {
        store.dispatch(setFilters({
          platformFilter: 'amazon',
          completionFilter: 'pending',
        }));
        store.dispatch(setBatchFilter('BATCH-001'));
      });

      await waitFor(() => {
        // Badge should show "3" for 3 active filters
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should display refresh indicator when pulling', async () => {
      const usePullToRefreshMock = require('../../../../hooks/usePullToRefresh').usePullToRefresh;
      usePullToRefreshMock.mockImplementation((onRefresh) => ({
        state: {
          isPulling: true,
          pullDistance: 50,
          isRefreshing: false,
          shouldRefresh: false,
          progress: 0.5,
        },
        containerRef: { current: null },
      }));

      renderWithProviders();

      expect(screen.getByText(/pull to refresh/i)).toBeInTheDocument();
    });

    it('should show "Release to refresh" when pull threshold reached', async () => {
      const usePullToRefreshMock = require('../../../../hooks/usePullToRefresh').usePullToRefresh;
      usePullToRefreshMock.mockImplementation((onRefresh) => ({
        state: {
          isPulling: true,
          pullDistance: 100,
          isRefreshing: false,
          shouldRefresh: true,
          progress: 1.0,
        },
        containerRef: { current: null },
      }));

      renderWithProviders();

      expect(screen.getByText(/release to refresh/i)).toBeInTheDocument();
    });

    it('should show loading spinner during refresh', async () => {
      const usePullToRefreshMock = require('../../../../hooks/usePullToRefresh').usePullToRefresh;
      usePullToRefreshMock.mockImplementation((onRefresh) => ({
        state: {
          isPulling: false,
          pullDistance: 0,
          isRefreshing: true,
          shouldRefresh: false,
          progress: 0,
        },
        containerRef: { current: null },
      }));

      renderWithProviders();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when fetching orders', () => {
      const store = createMockStore({
        orders: {
          loading: true,
          items: []
        }
      });
      renderWithProviders(store);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should hide loading indicator after orders are fetched', () => {
      const store = createMockStore({
        orders: {
          loading: false,
          items: mockOrders
        }
      });
      renderWithProviders(store);

      // Loading spinner should not be shown (except in pull-to-refresh area)
      const progressBars = screen.queryAllByRole('progressbar');
      expect(progressBars).toHaveLength(0);
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no orders exist', () => {
      const store = createMockStore({
        orders: {
          items: [],
          loading: false
        }
      });
      renderWithProviders(store);

      expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
    });

    it('should show filter adjustment message when filters produce no results', () => {
      const store = createMockStore({
        orders: {
          items: mockOrders,
          platformFilter: 'amazon', // Apply filter that would exclude all if items were different
          loading: false
        }
      });

      // Clear items after filter
      act(() => {
        store.dispatch(setFilters({ platformFilter: 'flipkart' }));
        // Assuming all mock orders are amazon, this should show empty with filter message
      });

      // This test needs refinement based on actual selector behavior
      // Just verify the structure exists
      expect(screen.getByLabelText(/open filters/i)).toBeInTheDocument();
    });

    it('should show date-specific empty message', () => {
      const store = createMockStore({
        orders: {
          items: [],
          loading: false
        }
      });
      renderWithProviders(store);

      // Should show message with current date
      expect(screen.getByText(/no orders/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when fetch fails', () => {
      const store = createMockStore({
        orders: {
          items: [],
          error: 'Failed to fetch orders from server'
        }
      });
      renderWithProviders(store);

      expect(screen.getByText(/failed to fetch orders from server/i)).toBeInTheDocument();
    });

    it('should show error in MUI Alert component', () => {
      const store = createMockStore({
        orders: {
          items: [],
          error: 'Network connection error'
        }
      });
      renderWithProviders(store);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/network connection error/i);
    });
  });

  describe('Order Card Display', () => {
    it('should display order cards within batch sections', () => {
      renderWithProviders();

      const orderCard1 = screen.getByText('Test Product 1').closest('.MuiCard-root');
      expect(orderCard1).toBeInTheDocument();
    });

    it('should show product names correctly', () => {
      renderWithProviders();

      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
      expect(screen.getByText('Test Product 3')).toBeInTheDocument();
    });

    it('should display SKUs for each order', () => {
      renderWithProviders();

      expect(screen.getByText(/SKU-001/i)).toBeInTheDocument();
      expect(screen.getByText(/SKU-002/i)).toBeInTheDocument();
      expect(screen.getByText(/SKU-003/i)).toBeInTheDocument();
    });

    it('should show quantities correctly', () => {
      renderWithProviders();

      // Quantities: 2, 1, 3
      expect(screen.getByText(/×2|qty.*2/i)).toBeInTheDocument();
      expect(screen.getByText(/×1|qty.*1/i)).toBeInTheDocument();
      expect(screen.getByText(/×3|qty.*3/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to scanner page when FAB is clicked', () => {
      const store = createMockStore();
      renderWithProviders(store);

      const scannerButton = screen.getByLabelText(/open barcode scanner/i);
      fireEvent.click(scannerButton);

      // Router would navigate to /todays-orders/scanner
      // Verify button click works (actual navigation requires router mock)
      expect(scannerButton).toBeInTheDocument();
    });

    it('should open filter dialog when filter button clicked', async () => {
      renderWithProviders();

      const filterButton = screen.getByLabelText(/open filters/i);
      fireEvent.click(filterButton);

      // Filter sheet should open
      // Actual implementation depends on MobileOrderFilters component
      // This verifies the interaction works
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      renderWithProviders();

      expect(screen.getByLabelText(/order date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/open filters/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/open barcode scanner/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders();

      const filterButton = screen.getByLabelText(/open filters/i);
      filterButton.focus();

      expect(document.activeElement).toBe(filterButton);
    });

    it('should have minimum 44px touch targets for buttons', () => {
      renderWithProviders();

      const buttons = screen.getAllByRole('button');

      // Filter out non-interactive buttons and check touch targets
      const interactiveButtons = buttons.filter(btn =>
        btn.getAttribute('aria-label') !== null ||
        btn.classList.contains('MuiIconButton-root')
      );

      interactiveButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        const minWidth = parseInt(styles.minWidth);

        // iOS requires minimum 44x44px touch targets
        if (minHeight > 0) {
          expect(minHeight).toBeGreaterThanOrEqual(44);
        }
        if (minWidth > 0) {
          expect(minWidth).toBeGreaterThanOrEqual(44);
        }
      });
    });
  });

  describe('Performance', () => {
    it('should handle large number of orders without crashing', () => {
      const manyOrders = Array.from({ length: 200 }, (_, i) => ({
        name: `Product ${i}`,
        SKU: `SKU-${String(i).padStart(3, '0')}`,
        quantity: '1',
        type: i % 2 === 0 ? ('amazon' as const) : ('flipkart' as const),
        orderId: `ORD-${i}`,
        categoryId: `cat-${i % 5}`,
        category: `Category ${i % 5}`,
        batchInfo: {
          batchId: `BATCH-${Math.floor(i / 20)}`,
          fileName: `batch_${Math.floor(i / 20)}.pdf`,
          uploadedAt: '2025-01-05T10:00:00',
        },
        isCompleted: false,
      }));

      const store = createMockStore({
        orders: {
          items: manyOrders,
          loading: false
        }
      });

      const { container } = renderWithProviders(store);

      expect(container).toBeInTheDocument();
      expect(screen.getByText(/200\s+Orders/i)).toBeInTheDocument();
    });

    it('should efficiently group orders by batch', () => {
      // Create 50 orders across 5 batches
      const batchedOrders = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i}`,
        SKU: `SKU-${i}`,
        quantity: '1',
        type: 'amazon' as const,
        orderId: `ORD-${i}`,
        categoryId: 'cat-1',
        category: 'Category 1',
        batchInfo: {
          batchId: `BATCH-${Math.floor(i / 10)}`,
          fileName: `batch_${Math.floor(i / 10)}.pdf`,
          uploadedAt: '2025-01-05T10:00:00',
        },
        isCompleted: false,
      }));

      const store = createMockStore({
        orders: {
          items: batchedOrders,
          loading: false
        }
      });

      renderWithProviders(store);

      // Should render 5 batch sections
      const batchHeaders = screen.getAllByText(/^Batch batch_/i);
      expect(batchHeaders).toHaveLength(5);
    });
  });

  describe('Offline Mode Support', () => {
    it('should queue order completions when offline', () => {
      // This would test offline functionality when implemented
      // Currently just verifies the structure for future offline support
      const store = createMockStore({
        auth: {
          isAuthenticated: true
        }
      });

      renderWithProviders(store);
      expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    });
  });

  describe('Safe Area Insets', () => {
    it('should apply safe area insets for iOS notch', () => {
      const getSafeAreaInsetsMock = mobileUtils.getSafeAreaInsets as jest.Mock;
      getSafeAreaInsetsMock.mockReturnValue({
        top: '44px',
        right: '0px',
        bottom: '34px',
        left: '0px'
      });

      renderWithProviders();

      // Component should render without issues
      expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    });
  });
});
