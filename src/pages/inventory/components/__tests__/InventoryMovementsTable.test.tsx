import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Timestamp } from 'firebase/firestore';
import { InventoryMovementsTable } from '../InventoryMovementsTable';
import inventoryReducer from '../../../../store/slices/inventorySlice';
import { InventoryMovement } from '../../../../types/inventory';

const mockMovement: InventoryMovement = {
  id: 'movement-1',
  categoryGroupId: 'test-category-1',
  movementType: 'deduction',
  quantity: 10,
  unit: 'kg',
  previousInventory: 100,
  newInventory: 90,
  orderReference: 'ORDER-123',
  platform: 'amazon',
  createdAt: Timestamp.fromDate(new Date('2023-01-01T10:00:00Z')),
};

const mockStore = configureStore({
  reducer: {
    inventory: inventoryReducer,
  },
  preloadedState: {
    inventory: {
      inventoryLevels: [],
      filteredInventoryLevels: [],
      inventoryMovements: [mockMovement],
      filteredInventoryMovements: [mockMovement],
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for test environment
    }),
});

const theme = createTheme();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {ui}
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('InventoryMovementsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the inventory movements table', () => {
    renderWithProviders(<InventoryMovementsTable />);

    expect(screen.getByText('Inventory Movements')).toBeInTheDocument();
    expect(screen.getByText('1 movements')).toBeInTheDocument();
  });

  it('displays movement data correctly', () => {
    renderWithProviders(<InventoryMovementsTable />);

    // Check if the movement type is displayed
    expect(screen.getByText('Deduction')).toBeInTheDocument();
    
    // Check if the category group ID is displayed
    expect(screen.getByText('test-category-1')).toBeInTheDocument();
    
    // Check if the order reference is displayed
    expect(screen.getByText('Order: ORDER-123')).toBeInTheDocument();
  });

  it('shows filters when filter button is clicked', () => {
    renderWithProviders(<InventoryMovementsTable />);

    const filterButton = screen.getByRole('button', { name: /toggle filters/i });
    fireEvent.click(filterButton);

    expect(screen.getByText('Filter Inventory Movements')).toBeInTheDocument();
  });

  it('handles order click callback', () => {
    const mockOnOrderClick = jest.fn();
    renderWithProviders(<InventoryMovementsTable onOrderClick={mockOnOrderClick} />);

    const orderLink = screen.getByText('Order: ORDER-123');
    fireEvent.click(orderLink);

    expect(mockOnOrderClick).toHaveBeenCalledWith('ORDER-123');
  });

  it('shows loading state', () => {
    const loadingStore = configureStore({
      reducer: {
        inventory: inventoryReducer,
      },
      preloadedState: {
        inventory: {
          ...mockStore.getState().inventory,
          loading: {
            ...mockStore.getState().inventory.loading,
            inventoryMovements: true,
          },
        },
      },
    });

    render(
      <Provider store={loadingStore}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <InventoryMovementsTable />
          </LocalizationProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Loading inventory movements...')).toBeInTheDocument();
  });

  it('shows empty state when no movements', async () => {
    const emptyStore = configureStore({
      reducer: {
        inventory: inventoryReducer,
      },
      preloadedState: {
        inventory: {
          ...mockStore.getState().inventory,
          inventoryMovements: [],
          filteredInventoryMovements: [],
          loading: {
            ...mockStore.getState().inventory.loading,
            inventoryMovements: false, // Explicitly set loading to false
          },
        },
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false, // Disable for test environment
        }),
    });

    render(
      <Provider store={emptyStore}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <InventoryMovementsTable />
          </LocalizationProvider>
        </ThemeProvider>
      </Provider>
    );

    // Wait for component to finish rendering and effects to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should show the empty state message
    expect(screen.getByText(/No Inventory Movements Found/)).toBeInTheDocument();
    expect(screen.getByText(/Inventory movements will appear here/)).toBeInTheDocument();
  });

  it('shows export button and can trigger export', () => {
    // Mock the CSV blob creation
    const mockCreateObjectURL = jest.fn().mockReturnValue('mock-url');
    const mockRevokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: mockCreateObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: mockRevokeObjectURL,
    });

    renderWithProviders(<InventoryMovementsTable />);

    const exportButton = screen.getByRole('button', { name: /export to csv/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);
    
    // Should create a blob URL for CSV export
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});