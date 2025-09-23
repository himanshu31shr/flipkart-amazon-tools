import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import InventoryDeductionOverview from '../InventoryDeductionOverview';
import { inventoryReducer } from '../../../../store/slices/inventorySlice';
import categoriesReducer from '../../../../store/slices/categoriesSlice';

// Mock the selector functions
const mockCategoryDeduction = {
  isProcessing: false,
  preview: null,
  categoriesWithDeduction: [],
  deductionConfigurationSummary: [],
  lastProcessedOrderItems: [],
};

const mockCategories = [
  {
    id: 'cat1',
    name: 'Electronics',
    inventoryDeductionQuantity: 10,
  },
  {
    id: 'cat2', 
    name: 'Books',
    inventoryDeductionQuantity: 5,
  },
  {
    id: 'cat3',
    name: 'Clothing',
    inventoryDeductionQuantity: undefined,
  },
];

const mockLoading = {
  levels: false,
  movements: false,
  alerts: false,
};

const mockErrors = {};

// Mock the hooks
jest.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: jest.fn((selector) => {
    // Mock different selectors based on what's being selected
    if (selector.toString().includes('categoryDeduction') || selector.name === 'selectCategoryDeduction') {
      return mockCategoryDeduction;
    }
    if (selector.toString().includes('categories') || selector.name === 'selectCategories') {
      return mockCategories;
    }
    if (selector.toString().includes('loading') || selector.name === 'selectInventoryLoading') {
      return mockLoading;
    }
    if (selector.toString().includes('errors') || selector.name === 'selectInventoryErrors') {
      return mockErrors;
    }
    // Default fallback
    return mockCategoryDeduction;
  }),
}));

// Mock Redux actions
jest.mock('../../../../store/slices/inventorySlice', () => ({
  ...jest.requireActual('../../../../store/slices/inventorySlice'),
  fetchCategoriesWithDeduction: jest.fn(() => ({ type: 'fetchCategoriesWithDeduction' })),
  previewCategoryDeductions: jest.fn(() => ({ type: 'previewCategoryDeductions' })),
  fetchDeductionConfigurationSummary: jest.fn(() => ({ type: 'fetchDeductionConfigurationSummary' })),
  selectCategoryDeduction: jest.fn(),
  selectInventoryLoading: jest.fn(),
  selectInventoryErrors: jest.fn(),
}));

jest.mock('../../../../store/slices/categoriesSlice', () => ({
  ...jest.requireActual('../../../../store/slices/categoriesSlice'),
  fetchCategories: jest.fn(() => ({ type: 'fetchCategories' })),
  selectCategories: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy HH:mm') {
      return 'Jan 15, 2024 10:30';
    }
    if (formatStr === 'MMM dd, HH:mm') {
      return 'Jan 15, 10:30';
    }
    return '2024-01-15';
  }),
}));

const theme = createTheme();

const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({ 
      reducer: {
        inventory: inventoryReducer,
        categories: categoriesReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  } = {}
) => {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

describe('InventoryDeductionOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('Basic Rendering', () => {
    it('renders the component with default props', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      expect(screen.getByText('Inventory Deduction Overview')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument();
      expect(screen.getByText('Category Deduction Configuration')).toBeInTheDocument();
    }) as any;

    it('renders the component in compact mode', () => {
      renderWithProviders(<InventoryDeductionOverview compact={true} />);
      
      expect(screen.getByText('Inventory Deduction Overview')).toBeInTheDocument();
      // In compact mode, activity feed might be hidden by default
    }) as any;

    it('displays category data in the table', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Search Functionality', () => {
    it('filters categories based on search term', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InventoryDeductionOverview />);
      
      const searchInput = screen.getByPlaceholderText('Search categories...');
      await user.type(searchInput, 'Electronics');
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.queryByText('Books')).not.toBeInTheDocument();
      }) as any;
    }) as any;

  }) as any;


  describe('Activity Feed Toggle', () => {
    it('toggles activity feed visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InventoryDeductionOverview />);
      
      // Activity feed should be visible by default
      expect(screen.getByText('Recent Deduction Activity')).toBeInTheDocument();
      
      // Toggle off
      const activityToggle = screen.getByRole('checkbox', { name: /show recent activity/i }) as any;
      await user.click(activityToggle);
      
      await waitFor(() => {
        expect(screen.queryByText('Recent Deduction Activity')).not.toBeInTheDocument();
      }) as any;
      
      // Toggle back on
      await user.click(activityToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Deduction Activity')).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe('Action Handlers', () => {
    it('calls onEditCategory when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEditCategory = jest.fn();
      
      renderWithProviders(
        <InventoryDeductionOverview onEditCategory={mockOnEditCategory} />
      );
      
      // Find the first edit button
      const editButtons = screen.getAllByRole('button', { name: /edit category/i }) as any;
      await user.click(editButtons[0]);
      
      expect(mockOnEditCategory).toHaveBeenCalledWith('cat1');
    }) as any;

    it('calls onViewDeductionHistory when history button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnViewHistory = jest.fn();
      
      renderWithProviders(
        <InventoryDeductionOverview onViewDeductionHistory={mockOnViewHistory} />
      );
      
      // Find the first history button
      const historyButtons = screen.getAllByRole('button', { name: /view history/i }) as any;
      await user.click(historyButtons[0]);
      
      expect(mockOnViewHistory).toHaveBeenCalledWith('cat1');
    }) as any;

    it('calls onConfigureDeduction when configure button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnConfigureDeduction = jest.fn();
      
      renderWithProviders(
        <InventoryDeductionOverview onConfigureDeduction={mockOnConfigureDeduction} />
      );
      
      // Find the first configure button
      const configureButtons = screen.getAllByRole('button', { name: /configure deduction/i }) as any;
      await user.click(configureButtons[0]);
      
      expect(mockOnConfigureDeduction).toHaveBeenCalledWith('cat1');
    }) as any;
  }) as any;

  describe('Pagination', () => {
    it('displays pagination controls', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      expect(screen.getByLabelText(/rows per page/i)).toBeInTheDocument();
    }) as any;
  }) as any;


  describe('Configuration Tools', () => {
    it('shows configuration tools when enabled', () => {
      renderWithProviders(
        <InventoryDeductionOverview showConfigurationTools={true} />
      );
      
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    }) as any;

    it('hides configuration tools when disabled', () => {
      renderWithProviders(
        <InventoryDeductionOverview showConfigurationTools={false} />
      );
      
      expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Status Chips', () => {

    it('displays correct status chips for disabled categories', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      // Look for disabled status indicator
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Recent Activity', () => {
    it('displays recent activity items', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      expect(screen.getByText('Recent Deduction Activity')).toBeInTheDocument();
      expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('Programming Guide')).toBeInTheDocument();
    }) as any;

  }) as any;


  describe('Accessibility', () => {

    it('has proper button roles and labels', () => {
      renderWithProviders(<InventoryDeductionOverview />);
      
      expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any;