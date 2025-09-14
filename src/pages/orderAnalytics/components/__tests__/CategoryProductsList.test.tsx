import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CategoryProductsList from '../CategoryProductsList';
import { ProductSummary } from '../../../home/services/base.transformer';
import { Category } from '../../../../services/category.service';

// Mock data
const mockCategories: Category[] = [
  { id: 'cat1', name: 'Electronics', description: 'Electronic items' },
  { id: 'cat2', name: 'Clothing', description: 'Clothing items' },
];

const mockProducts: ProductSummary[] = [
  {
    name: 'Product 1',
    quantity: '10',
    type: 'amazon' as const,
    SKU: 'SKU001',
    product: {
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Test product 1',
      categoryId: 'cat1',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 1000,
      metadata: {},
    },
  },
  {
    name: 'Product 2',
    quantity: '5',
    type: 'flipkart' as const,
    SKU: 'SKU002',
    product: {
      sku: 'SKU002',
      name: 'Product 2',
      description: 'Test product 2',
      categoryId: 'cat1',
      platform: 'flipkart',
      visibility: 'visible',
      sellingPrice: 500,
      metadata: {},
    },
  },
  {
    name: 'Product 3',
    quantity: '15',
    type: 'amazon' as const,
    SKU: 'SKU003',
    product: {
      sku: 'SKU003',
      name: 'Product 3',
      description: 'Test product 3',
      categoryId: 'cat1',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 750,
      metadata: {},
    },
  },
];

// Create a simple theme for testing
const testTheme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={testTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('CategoryProductsList', () => {
  it('renders products list when open', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    expect(screen.getByText('Products in "Electronics" Category')).toBeInTheDocument();
    expect(screen.getByText('3 products found')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Product 3')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Products in "Electronics" Category')).not.toBeInTheDocument();
  });

  it('displays correct product information', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Check product details
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('SKU001')).toBeInTheDocument();
    // Use getAllByText for quantity since there might be multiple "10" elements
    const quantityElements = screen.getAllByText('10');
    expect(quantityElements.length).toBeGreaterThan(0);
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
    expect(screen.getByText('₹10,000')).toBeInTheDocument(); // Total value (10 * 1000)
  });

  it('sorts products by quantity in descending order', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Get all quantity cells
    const quantityCells = screen.getAllByText(/^(10|5|15)$/);
    
    // First product should be Product 3 (quantity 15) - highest quantity
    expect(quantityCells[0]).toHaveTextContent('15');
  });

  it('shows pagination when there are products', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Check if pagination is present
    expect(screen.getByText('1–3 of 3')).toBeInTheDocument();
  });

  it('handles pagination correctly', () => {
    // Create more products to test pagination
    const manyProducts = Array.from({ length: 15 }, (_, i) => ({
      name: `Product ${i + 1}`,
      quantity: `${i + 1}`,
      type: 'amazon' as const,
      SKU: `SKU${String(i + 1).padStart(3, '0')}`,
      product: {
        sku: `SKU${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        description: `Test product ${i + 1}`,
        categoryId: 'cat1',
        platform: 'amazon' as const,
        visibility: 'visible' as const,
        sellingPrice: 100 * (i + 1),
        metadata: {},
      },
    }));

    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={manyProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Check initial pagination state (default 10 rows per page)
    expect(screen.getByText('1–10 of 15')).toBeInTheDocument();
    
    // Check that only first 10 products are visible (sorted by quantity descending)
    // Product 15 has highest quantity (15), so it should be first
    expect(screen.getByText('Product 15')).toBeInTheDocument();
    expect(screen.getByText('Product 6')).toBeInTheDocument(); // Product 6 should be on first page
    expect(screen.queryByText('Product 5')).not.toBeInTheDocument(); // Product 5 should be on second page
  });

  it('changes rows per page correctly', () => {
    const manyProducts = Array.from({ length: 15 }, (_, i) => ({
      name: `Product ${i + 1}`,
      quantity: `${i + 1}`,
      type: 'amazon' as const,
      SKU: `SKU${String(i + 1).padStart(3, '0')}`,
      product: {
        sku: `SKU${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        description: `Test product ${i + 1}`,
        categoryId: 'cat1',
        platform: 'amazon' as const,
        visibility: 'visible' as const,
        sellingPrice: 100 * (i + 1),
        metadata: {},
      },
    }));

    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={manyProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Find and click the rows per page selector (it's a combobox, not a button)
    const rowsPerPageSelect = screen.getByRole('combobox', { name: /rows per page/i });
    fireEvent.mouseDown(rowsPerPageSelect);
    
    // Click on 25 rows per page option
    const option25 = screen.getByRole('option', { name: '25' });
    fireEvent.click(option25);

    // Check that pagination text updates
    expect(screen.getByText('1–15 of 15')).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={[]}
        categories={mockCategories}
        isOpen={true}
      />
    );

    expect(screen.getByText('0 products found')).toBeInTheDocument();
    expect(screen.getByText('No products found in this category')).toBeInTheDocument();
  });

  it('displays category chips for products', () => {
    renderWithTheme(
      <CategoryProductsList
        categoryName="Electronics"
        products={mockProducts}
        categories={mockCategories}
        isOpen={true}
      />
    );

    // Check if category chips are displayed (use getAllByText since there are multiple)
    const electronicsChips = screen.getAllByText('Electronics');
    expect(electronicsChips.length).toBeGreaterThan(0);
  });
}); 