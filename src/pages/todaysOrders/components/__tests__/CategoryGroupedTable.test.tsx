import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CategoryGroupedTable } from '../CategoryGroupedTable';
import { GroupedOrderData } from '../../utils/groupingUtils';
import { ProductSummary } from '../../../home/services/base.transformer';

// Mock the FormattedCurrency component
jest.mock('../../../../components/FormattedCurrency', () => ({
  FormattedCurrency: ({ value }: { value: number }) => <span>₹{value.toLocaleString()}</span>
}));

// Mock the ActionButtons components
jest.mock('../../../../shared/ActionButtons', () => ({
  ViewAmazonListingButton: ({ amazonSerialNumber }: { amazonSerialNumber: string }) => 
    <button data-testid="amazon-button">{amazonSerialNumber}</button>,
  ViewFlipkartListingButton: ({ flipkartSerialNumber }: { flipkartSerialNumber: string }) => 
    <button data-testid="flipkart-button">{flipkartSerialNumber}</button>
}));

const mockGroupedData: GroupedOrderData = {
  categorizedGroups: [
    {
      categoryName: 'Electronics',
      categoryId: 'cat1',
      orders: [
        {
          SKU: 'SKU001',
          name: 'Test Product 1',
          quantity: '2',
          category: 'Electronics',
          type: 'amazon',
          product: {
            sku: 'SKU001',
            name: 'Test Product 1',
            description: 'Test description',
            sellingPrice: 100,
            customCostPrice: 60,
            categoryId: 'cat1',
            platform: 'amazon',
            visibility: 'visible',
            inventory: { quantity: 10, lowStockThreshold: 5 },
            metadata: { amazonSerialNumber: 'AMZ001' }
          }
        } as ProductSummary,
        {
          SKU: 'SKU002',
          name: 'Test Product 2',
          quantity: '1',
          category: 'Electronics',
          type: 'flipkart',
          product: {
            sku: 'SKU002',
            name: 'Test Product 2',
            description: 'Test description',
            sellingPrice: 150,
            customCostPrice: 90,
            categoryId: 'cat1',
            platform: 'flipkart',
            visibility: 'visible',
            inventory: { quantity: 15, lowStockThreshold: 5 },
            metadata: { flipkartSerialNumber: 'FLK001' }
          }
        } as ProductSummary
      ],
      totalQuantity: 3,
      totalRevenue: 350,
      totalItems: 2,
      platforms: ['amazon', 'flipkart']
    },
    {
      categoryName: 'Books',
      orders: [
        {
          SKU: 'SKU003',
          name: 'Test Book',
          quantity: '2',
          category: 'Books',
          type: 'amazon',
          product: {
            sku: 'SKU003',
            name: 'Test Book',
            description: 'Test book description',
            sellingPrice: 25,
            customCostPrice: 15,
            categoryId: 'cat2',
            platform: 'amazon',
            visibility: 'visible',
            inventory: { quantity: 20, lowStockThreshold: 5 },
            metadata: { amazonSerialNumber: 'AMZ002' }
          }
        } as ProductSummary
      ],
      totalQuantity: 2,
      totalRevenue: 50,
      totalItems: 1,
      platforms: ['amazon']
    }
  ],
  uncategorizedGroup: {
    categoryName: 'Uncategorized',
    orders: [
      {
        SKU: 'SKU004',
        name: 'Uncategorized Product',
        quantity: '1',
        category: '',
        type: 'amazon',
        product: {
          sku: 'SKU004',
          name: 'Uncategorized Product',
          description: 'Test description',
          sellingPrice: 75,
          customCostPrice: 45,
          categoryId: '',
          platform: 'amazon',
          visibility: 'visible',
          inventory: { quantity: 8, lowStockThreshold: 5 },
          metadata: { amazonSerialNumber: 'AMZ003' }
        }
      } as ProductSummary
    ],
    totalQuantity: 1,
    totalRevenue: 75,
    totalItems: 1,
    platforms: ['amazon']
  },
  summary: {
    totalCategories: 3,
    totalOrders: 4,
    totalRevenue: 475
  }
};

describe('CategoryGroupedTable', () => {
  it('renders summary cards correctly', () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total categories
    expect(screen.getByText('4')).toBeInTheDocument(); // Total orders
    expect(screen.getByText('₹475')).toBeInTheDocument(); // Total revenue
    expect(screen.getByText('119')).toBeInTheDocument(); // Average revenue (475/4)
  });

  it('renders search input', () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const searchInput = screen.getByPlaceholderText('Search by product name, SKU, or category...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders category accordion headers', () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('shows category statistics in accordion headers', () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    // Electronics category stats
    expect(screen.getByText('2 Items')).toBeInTheDocument();
    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
    expect(screen.getByText('₹350')).toBeInTheDocument();
    expect(screen.getByText('amazon, flipkart')).toBeInTheDocument();
  });

  it('expands accordion when clicked', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    // Find the accordion summary containing Electronics
    const electronicsAccordion = screen.getByText('Electronics').closest('[role="button"]');
    expect(electronicsAccordion).toBeInTheDocument();
    
    fireEvent.click(electronicsAccordion!);
    
    await waitFor(() => {
      expect(screen.getByText('SKU001')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });
  });

  it('filters data when searching by category', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const searchInput = screen.getByPlaceholderText('Search by product name, SKU, or category...');
    fireEvent.change(searchInput, { target: { value: 'Electronics' } });
    
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Books')).not.toBeInTheDocument();
    });
  });

  it('filters data when searching by SKU', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const searchInput = screen.getByPlaceholderText('Search by product name, SKU, or category...');
    fireEvent.change(searchInput, { target: { value: 'SKU001' } });
    
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Books')).not.toBeInTheDocument();
    });
  });

  it('filters by platform when Amazon is selected', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const amazonButton = screen.getByText('Amazon');
    fireEvent.click(amazonButton);
    
    await waitFor(() => {
      // Expand the electronics category to check its contents
      const electronicsAccordion = screen.getByText('Electronics').closest('[role="button"]');
      fireEvent.click(electronicsAccordion!);

      expect(screen.getByText('Test Product 1')).toBeInTheDocument(); // Amazon product
      expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument(); // Flipkart product
    });
  });

  it('shows action buttons for products with serial numbers', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    // Find and expand Electronics accordion
    const electronicsAccordion = screen.getByText('Electronics').closest('[role="button"]');
    fireEvent.click(electronicsAccordion!);
    
    await waitFor(() => {
      const flipkartChips = screen.getAllByText('FLIPKART');
      
      expect(screen.getAllByText('AMAZON').length).toBeGreaterThan(0);
      expect(flipkartChips.length).toBeGreaterThan(0);
    });
  });

  it('displays empty state when no orders match search', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const searchInput = screen.getByPlaceholderText('Search by product name, SKU, or category...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No orders found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
    });
  });

  it('handles empty grouped data', () => {
    const emptyData: GroupedOrderData = {
      categorizedGroups: [],
      uncategorizedGroup: {
        categoryName: 'Uncategorized',
        orders: [],
        totalQuantity: 0,
        totalRevenue: 0,
        totalItems: 0,
        platforms: []
      },
      summary: {
        totalCategories: 0,
        totalOrders: 0,
        totalRevenue: 0
      }
    };
    
    render(<CategoryGroupedTable groupedData={emptyData} />);
    
    expect(screen.getByText('No orders found')).toBeInTheDocument();
    expect(screen.getByText('No active orders available')).toBeInTheDocument();
  });

  it('renders uncategorized section with warning style', () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    const uncategorizedChip = screen.getByText('Uncategorized Products');
    expect(uncategorizedChip).toBeInTheDocument();
  });

  it('displays correct revenue calculations in table rows', async () => {
    render(<CategoryGroupedTable groupedData={mockGroupedData} />);
    
    // Find and expand Electronics accordion
    const electronicsAccordion = screen.getByText('Electronics').closest('[role="button"]');
    fireEvent.click(electronicsAccordion!);
    
    await waitFor(() => {
      // Product 1: 100 * 2 = 200
      expect(screen.getByText('₹200')).toBeInTheDocument();
      // Product 2: 150 * 1 = 150 - use getAllByText since unit price and revenue are both 150
      const revenue150Elements = screen.getAllByText('₹150');
      expect(revenue150Elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});