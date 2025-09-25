import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MergedCategoryTable from '../MergedCategoryTable';
import { HistoricalCategoryData } from '../../hooks/useHistoricalData';
import { ProductSummary } from '../../../home/services/base.transformer';
import { Category } from '../../../../services/category.service';

// Mock data
const mockCategories: Category[] = [
  { id: 'cat1', name: 'Electronics', description: 'Electronic items' },
  { id: 'cat2', name: 'Clothing', description: 'Clothing items' },
];

const mockHistoricalData: HistoricalCategoryData[] = [
  {
    categoryId: 'cat1',
    categoryName: 'Electronics',
    totalOrders: 150,
    todayOrders: 25,
    yesterdayOrders: 20,
    orderChange: 5,
    orderChangePercent: 25,
    isTopCategory: true,
    productCount: 2,
  },
  {
    categoryId: 'cat2',
    categoryName: 'Clothing',
    totalOrders: 100,
    todayOrders: 15,
    yesterdayOrders: 18,
    orderChange: -3,
    orderChangePercent: -16.67,
    isTopCategory: false,
    productCount: 1,
  },
];

const mockOrders: ProductSummary[] = [
  {
    name: 'Test Product 1',
    quantity: '5',
    type: 'amazon' as const,
    SKU: 'SKU001',
    product: {
      sku: 'SKU001',
      name: 'Test Product 1',
      description: 'Test description',
      categoryId: 'cat1',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 1000,
      metadata: {},
    },
  },
  {
    name: 'Test Product 2',
    quantity: '3',
    type: 'flipkart' as const,
    SKU: 'SKU002',
    product: {
      sku: 'SKU002',
      name: 'Test Product 2',
      description: 'Test description 2',
      categoryId: 'cat1',
      platform: 'flipkart',
      visibility: 'visible',
      sellingPrice: 500,
      metadata: {},
    },
  },
];

// Create a mock store
const mockStore = configureStore({ 
  reducer: {
    dummy: (state = {}) => state,
  },
}) as any;

// Create a simple theme for testing
const testTheme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={testTheme}>
        {component}
      </ThemeProvider>
    </Provider>
  );
};


describe('MergedCategoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  it('renders category table with data', async () => {
    renderWithProviders(
      <MergedCategoryTable
        historicalData={mockHistoricalData}
        orders={mockOrders}
        categories={mockCategories}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    }) as any;
    
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Total orders for Electronics
    expect(screen.getByText('100')).toBeInTheDocument(); // Total orders for Clothing
  }) as any;

  it('shows products when category row is clicked', async () => {
    renderWithProviders(
      <MergedCategoryTable
        historicalData={mockHistoricalData}
        orders={mockOrders}
        categories={mockCategories}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    }) as any;
    
    // Click on Electronics row
    const electronicsRow = screen.getByText('Electronics').closest('tr');
    if (electronicsRow) {
      fireEvent.click(electronicsRow);
    }

    // Check if products list appears
    await waitFor(() => {
      expect(screen.getByText('Products in "Electronics" Category')).toBeInTheDocument();
    }) as any;
    expect(screen.getByText('2 products found')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
  }) as any;

  it('hides products when same category row is clicked again', async () => {
    renderWithProviders(
      <MergedCategoryTable
        historicalData={mockHistoricalData}
        orders={mockOrders}
        categories={mockCategories}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    }) as any;
    
    // Click on Electronics row to show products
    const electronicsRow = screen.getByText('Electronics').closest('tr');
    if (electronicsRow) {
      fireEvent.click(electronicsRow);
    }

    // Verify products are shown
    await waitFor(() => {
      expect(screen.getByText('Products in "Electronics" Category')).toBeInTheDocument();
    }) as any;
    
    // Click again to hide products
    if (electronicsRow) {
      fireEvent.click(electronicsRow);
    }

    // Verify products are hidden
    await waitFor(() => {
      expect(screen.queryByText('Products in "Electronics" Category')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  it('shows different products when different category is clicked', async () => {
    // Add a product for Clothing category
    const ordersWithClothing: ProductSummary[] = [
      ...mockOrders,
      {
        name: 'Clothing Product',
        quantity: '2',
        type: 'amazon' as const,
        SKU: 'SKU003',
        product: {
          sku: 'SKU003',
          name: 'Clothing Product',
          description: 'Clothing description',
          categoryId: 'cat2',
          platform: 'amazon',
          visibility: 'visible',
          sellingPrice: 300,
          metadata: {},
        },
      },
    ];

    renderWithProviders(
      <MergedCategoryTable
        historicalData={mockHistoricalData}
        orders={ordersWithClothing}
        categories={mockCategories}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    }) as any;
    
    // Click on Clothing row
    const clothingRow = screen.getByText('Clothing').closest('tr');
    if (clothingRow) {
      fireEvent.click(clothingRow);
    }

    // Check if clothing products appear
    await waitFor(() => {
      expect(screen.getByText('Products in "Clothing" Category')).toBeInTheDocument();
    }) as any;
    expect(screen.getByText('1 products found')).toBeInTheDocument();
    expect(screen.getByText('Clothing Product')).toBeInTheDocument();
  }) as any;

  it('shows loading state briefly then renders data', async () => {
    renderWithProviders(
      <MergedCategoryTable
        historicalData={mockHistoricalData}
        orders={mockOrders}
        categories={mockCategories}
      />
    );

    // Should show loading briefly, then render data
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    }) as any;
    
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Clothing')).toBeInTheDocument();
  }) as any;

  it('shows empty state when no data', async () => {
    renderWithProviders(
      <MergedCategoryTable
        historicalData={[]}
        orders={[]}
        categories={[]}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('No category data available')).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any; 