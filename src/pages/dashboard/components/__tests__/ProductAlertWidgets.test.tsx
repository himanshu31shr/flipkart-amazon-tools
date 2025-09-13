import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { HiddenProductsWidget, HighPricedProductsWidget } from '../ProductAlertWidgets';
import { Product } from '../../../../services/product.service';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

// Mock FormattedCurrency component
jest.mock('../../../../components/FormattedCurrency', () => ({
  FormattedCurrency: ({ value }: { value: number }) => (
    <span data-testid="formatted-currency">₹{value.toFixed(2)}</span>
  ),
}));

const theme = createTheme();

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  sku: 'TEST-SKU-001',
  name: 'Test Product',
  platform: 'amazon',
  sellingPrice: 100,
  customCostPrice: 50,
  description: 'Test description',
  visibility: 'visible',
  existsOnSellerPage: true,
  metadata: {
    amazonSerialNumber: 'B123456789',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    listingStatus: 'active',
    moq: '1',
  },
  ...overrides,
});

const createMockCompetitionAnalysis = (competitorPrice: string) => ({
  competitorName: 'Test Competitor',
  competitorPrice,
  ourPrice: 100,
  visibility: 'visible',
  existsOnSellerPage: true,
  totalSellers: 5,
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('HiddenProductsWidget', () => {
  describe('loading state', () => {
    it('should show loading spinner when loading is true', () => {
      renderWithProviders(<HiddenProductsWidget products={[]} loading={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should not show content when loading', () => {
      renderWithProviders(<HiddenProductsWidget products={[]} loading={true} />);
      
      expect(screen.queryByText('Hidden Products')).not.toBeInTheDocument();
      expect(screen.queryByText('No hidden products found.')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no hidden products and not loading', () => {
      const visibleProducts = [
        createMockProduct({ existsOnSellerPage: true }),
        createMockProduct({ existsOnSellerPage: true, sku: 'VISIBLE-002' }),
      ];
      
      renderWithProviders(<HiddenProductsWidget products={visibleProducts} loading={false} />);
      
      expect(screen.getByText('No hidden products found.')).toBeInTheDocument();
    });

    it('should not show header when no hidden products', () => {
      const visibleProducts = [createMockProduct({ existsOnSellerPage: true })];
      
      renderWithProviders(<HiddenProductsWidget products={visibleProducts} loading={false} />);
      
      expect(screen.queryByText('Hidden Products')).not.toBeInTheDocument();
    });
  });

  describe('with hidden products', () => {
    const hiddenProducts = [
      createMockProduct({
        sku: 'HIDDEN-001',
        name: 'Hidden Product 1',
        existsOnSellerPage: false,
        platform: 'amazon',
      }),
      createMockProduct({
        sku: 'HIDDEN-002',
        name: 'Hidden Product 2',
        existsOnSellerPage: false,
        platform: 'flipkart',
      }),
    ];

    it('should render header with visibility off icon', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      expect(screen.getByText('Hidden Products')).toBeInTheDocument();
      expect(screen.getByTestId('VisibilityOffIcon')).toBeInTheDocument();
    });

    it('should show count of hidden products', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render product list', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      expect(screen.getByText('Hidden Product 1')).toBeInTheDocument();
      expect(screen.getByText('Hidden Product 2')).toBeInTheDocument();
    });

    it('should show SKU information', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      expect(screen.getByText('SKU: HIDDEN-001')).toBeInTheDocument();
      expect(screen.getByText('SKU: HIDDEN-002')).toBeInTheDocument();
    });

    it('should show platform chips with correct colors', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      expect(screen.getByText('amazon')).toBeInTheDocument();
      expect(screen.getByText('flipkart')).toBeInTheDocument();
    });

    it('should show "Manage Hidden Products" link when items <= 5', () => {
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      const manageLink = screen.getByText('Manage Hidden Products');
      expect(manageLink).toBeInTheDocument();
      expect(manageLink.closest('a')).toHaveAttribute('href', '/flipkart-amazon-tools/hidden-products/');
    });
  });

  describe('product name truncation', () => {
    it('should truncate long product names', () => {
      const longNameProduct = createMockProduct({
        name: 'This is a very long product name that should be truncated because it exceeds the limit',
        sku: 'LONG-NAME',
        existsOnSellerPage: false,
      });

      renderWithProviders(<HiddenProductsWidget products={[longNameProduct]} loading={false} />);
      
      expect(screen.getByText('This is a very long product na...')).toBeInTheDocument();
    });

    it('should not truncate short product names', () => {
      const shortNameProduct = createMockProduct({
        name: 'Short Name',
        sku: 'SHORT',
        existsOnSellerPage: false,
      });

      renderWithProviders(<HiddenProductsWidget products={[shortNameProduct]} loading={false} />);
      
      expect(screen.getByText('Short Name')).toBeInTheDocument();
    });

    it('should show full name in title attribute', () => {
      const longNameProduct = createMockProduct({
        name: 'This is a very long product name that should be truncated because it exceeds the limit',
        sku: 'LONG-NAME',
        existsOnSellerPage: false,
      });

      renderWithProviders(<HiddenProductsWidget products={[longNameProduct]} loading={false} />);
      
      const truncatedElement = screen.getByText('This is a very long product na...');
      expect(truncatedElement).toHaveAttribute('title', 'This is a very long product name that should be truncated because it exceeds the limit');
    });
  });

  describe('pagination and overflow', () => {
    it('should show only first 5 items when more than 5 hidden products', () => {
      const manyHiddenProducts = Array.from({ length: 8 }, (_, i) =>
        createMockProduct({
          sku: `HIDDEN-${i + 1}`,
          name: `Hidden Product ${i + 1}`,
          existsOnSellerPage: false,
        })
      );

      renderWithProviders(<HiddenProductsWidget products={manyHiddenProducts} loading={false} />);
      
      // Should show first 5
      expect(screen.getByText('Hidden Product 1')).toBeInTheDocument();
      expect(screen.getByText('Hidden Product 5')).toBeInTheDocument();
      
      // Should not show 6th and beyond
      expect(screen.queryByText('Hidden Product 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Hidden Product 8')).not.toBeInTheDocument();
    });

    it('should show "View X more" button when more than 5 hidden products', () => {
      const manyHiddenProducts = Array.from({ length: 8 }, (_, i) =>
        createMockProduct({
          sku: `HIDDEN-${i + 1}`,
          name: `Hidden Product ${i + 1}`,
          existsOnSellerPage: false,
        })
      );

      renderWithProviders(<HiddenProductsWidget products={manyHiddenProducts} loading={false} />);
      
      const viewMoreButton = screen.getByText('View 3 more hidden products');
      expect(viewMoreButton).toBeInTheDocument();
      expect(viewMoreButton.closest('a')).toHaveAttribute('href', '/flipkart-amazon-tools/hidden-products/');
    });

    it('should not show "View more" button when 5 or fewer hidden products', () => {
      const fewHiddenProducts = Array.from({ length: 3 }, (_, i) =>
        createMockProduct({
          sku: `HIDDEN-${i + 1}`,
          name: `Hidden Product ${i + 1}`,
          existsOnSellerPage: false,
        })
      );

      renderWithProviders(<HiddenProductsWidget products={fewHiddenProducts} loading={false} />);
      
      expect(screen.queryByText(/View \d+ more hidden products/)).not.toBeInTheDocument();
    });
  });

  describe('filtering logic', () => {
    it('should only show products where existsOnSellerPage is false', () => {
      const mixedProducts = [
        createMockProduct({ name: 'Visible Product', existsOnSellerPage: true }),
        createMockProduct({ name: 'Hidden Product', existsOnSellerPage: false }),
        createMockProduct({ name: 'Another Visible', existsOnSellerPage: true }),
      ];

      renderWithProviders(<HiddenProductsWidget products={mixedProducts} loading={false} />);
      
      expect(screen.getByText('Hidden Product')).toBeInTheDocument();
      expect(screen.queryByText('Visible Product')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Visible')).not.toBeInTheDocument();
    });

    it('should handle products with undefined existsOnSellerPage', () => {
      const productsWithUndefined = [
        createMockProduct({ name: 'Undefined Product', existsOnSellerPage: undefined }),
        createMockProduct({ name: 'Hidden Product', existsOnSellerPage: false }),
      ];

      renderWithProviders(<HiddenProductsWidget products={productsWithUndefined} loading={false} />);
      
      expect(screen.getByText('Undefined Product')).toBeInTheDocument();
      expect(screen.getByText('Hidden Product')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      const hiddenProducts = [createMockProduct({ existsOnSellerPage: false })];
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      const heading = screen.getByRole('heading', { name: 'Hidden Products' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible list structure', () => {
      const hiddenProducts = [
        createMockProduct({ existsOnSellerPage: false }),
        createMockProduct({ sku: 'HIDDEN-002', existsOnSellerPage: false }),
      ];
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('should have accessible links', () => {
      const hiddenProducts = [createMockProduct({ existsOnSellerPage: false })];
      renderWithProviders(<HiddenProductsWidget products={hiddenProducts} loading={false} />);
      
      const manageLink = screen.getByRole('link', { name: 'Manage Hidden Products' });
      expect(manageLink).toBeInTheDocument();
    });
  });
});

describe('HighPricedProductsWidget', () => {
  describe('loading state', () => {
    it('should show loading spinner when loading is true', () => {
      renderWithProviders(<HighPricedProductsWidget products={[]} loading={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should not show content when loading', () => {
      renderWithProviders(<HighPricedProductsWidget products={[]} loading={true} />);
      
      expect(screen.queryByText('High-Priced Products')).not.toBeInTheDocument();
      expect(screen.queryByText('No high-priced products found.')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no high-priced products and not loading', () => {
      const normalPricedProducts = [
        createMockProduct({ 
          sellingPrice: 100,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
      ];
      
      renderWithProviders(<HighPricedProductsWidget products={normalPricedProducts} loading={false} />);
      
      expect(screen.getByText('No high-priced products found.')).toBeInTheDocument();
    });

    it('should not show header when no high-priced products', () => {
      const normalPricedProducts = [
        createMockProduct({ 
          sellingPrice: 100,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
      ];
      
      renderWithProviders(<HighPricedProductsWidget products={normalPricedProducts} loading={false} />);
      
      expect(screen.queryByText('High-Priced Products')).not.toBeInTheDocument();
    });
  });

  describe('with high-priced products', () => {
          const highPricedProducts = [
        createMockProduct({ 
          sku: 'HIGH-001',
          name: 'High Priced Product 1',
          sellingPrice: 150,
          platform: 'amazon',
          competitionAnalysis: createMockCompetitionAnalysis('120'),
        }),
        createMockProduct({ 
          sku: 'HIGH-002',
          name: 'High Priced Product 2',
          sellingPrice: 200,
          platform: 'flipkart',
          competitionAnalysis: createMockCompetitionAnalysis('180'),
        }),
      ];

    it('should render header with trending up icon', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('High-Priced Products')).toBeInTheDocument();
      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
    });

    it('should show count of high-priced products', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render product list', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('High Priced Product 1')).toBeInTheDocument();
      expect(screen.getByText('High Priced Product 2')).toBeInTheDocument();
    });

    it('should show price comparison', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getAllByText('Our price:')).toHaveLength(2);
      expect(screen.getAllByText('Competitor:')).toHaveLength(2);
      
      // Check for formatted currency components
      const currencyElements = screen.getAllByTestId('formatted-currency');
      expect(currencyElements.length).toBeGreaterThan(0);
    });

    it('should show SKU information', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('SKU: HIGH-001')).toBeInTheDocument();
      expect(screen.getByText('SKU: HIGH-002')).toBeInTheDocument();
    });

    it('should show platform chips with correct colors', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('amazon')).toBeInTheDocument();
      expect(screen.getByText('flipkart')).toBeInTheDocument();
    });

    it('should show "Manage Pricing" link when items <= 5', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      const manageLink = screen.getByText('Manage Pricing');
      expect(manageLink).toBeInTheDocument();
      expect(manageLink.closest('a')).toHaveAttribute('href', '/flipkart-amazon-tools/hidden-products/');
    });
  });

  describe('filtering logic', () => {
    it('should only show products where our price is higher than competitor', () => {
      const mixedProducts = [
        createMockProduct({ 
          name: 'Normal Priced Product',
          sellingPrice: 100,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
        createMockProduct({ 
          name: 'High Priced Product',
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
        createMockProduct({ 
          name: 'Another Normal Product',
          sellingPrice: 90,
          competitionAnalysis: createMockCompetitionAnalysis('100')
        }),
      ];

      renderWithProviders(<HighPricedProductsWidget products={mixedProducts} loading={false} />);
      
      expect(screen.getByText('High Priced Product')).toBeInTheDocument();
      expect(screen.queryByText('Normal Priced Product')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Normal Product')).not.toBeInTheDocument();
    });

    it('should handle products without competition analysis', () => {
      const productsWithoutAnalysis = [
        createMockProduct({ name: 'No Analysis Product', competitionAnalysis: undefined }),
        createMockProduct({ 
          name: 'High Priced Product',
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
      ];

      renderWithProviders(<HighPricedProductsWidget products={productsWithoutAnalysis} loading={false} />);
      
      expect(screen.getByText('High Priced Product')).toBeInTheDocument();
      expect(screen.queryByText('No Analysis Product')).not.toBeInTheDocument();
    });

    it('should handle products with zero competitor price', () => {
      const productsWithZeroPrice = [
        createMockProduct({ 
          name: 'Zero Competitor Price',
          sellingPrice: 100,
          competitionAnalysis: createMockCompetitionAnalysis('0')
        }),
        createMockProduct({ 
          name: 'High Priced Product',
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
      ];

      renderWithProviders(<HighPricedProductsWidget products={productsWithZeroPrice} loading={false} />);
      
      expect(screen.getByText('High Priced Product')).toBeInTheDocument();
      expect(screen.queryByText('Zero Competitor Price')).not.toBeInTheDocument();
    });
  });

  describe('pagination and overflow', () => {
    it('should show only first 5 items when more than 5 high-priced products', () => {
      const manyHighPricedProducts = Array.from({ length: 8 }, (_, i) =>
        createMockProduct({
          sku: `HIGH-${i + 1}`,
          name: `High Priced Product ${i + 1}`,
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120'),
        })
      );

      renderWithProviders(<HighPricedProductsWidget products={manyHighPricedProducts} loading={false} />);
      
      // Should show first 5
      expect(screen.getByText('High Priced Product 1')).toBeInTheDocument();
      expect(screen.getByText('High Priced Product 5')).toBeInTheDocument();
      
      // Should not show 6th and beyond
      expect(screen.queryByText('High Priced Product 6')).not.toBeInTheDocument();
      expect(screen.queryByText('High Priced Product 8')).not.toBeInTheDocument();
    });

    it('should show "View X more" button when more than 5 high-priced products', () => {
      const manyHighPricedProducts = Array.from({ length: 8 }, (_, i) =>
        createMockProduct({
          sku: `HIGH-${i + 1}`,
          name: `High Priced Product ${i + 1}`,
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120'),
        })
      );

      renderWithProviders(<HighPricedProductsWidget products={manyHighPricedProducts} loading={false} />);
      
      const viewMoreButton = screen.getByText('View 3 more high-priced products');
      expect(viewMoreButton).toBeInTheDocument();
      expect(viewMoreButton.closest('a')).toHaveAttribute('href', '/flipkart-amazon-tools/hidden-products/');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      const highPricedProducts = [createMockProduct({ 
        sellingPrice: 150,
        competitionAnalysis: createMockCompetitionAnalysis('120')
      })];
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      const heading = screen.getByRole('heading', { name: 'High-Priced Products' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible list structure', () => {
      const highPricedProducts = [
        createMockProduct({ 
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('120')
        }),
        createMockProduct({ 
          sku: 'HIGH-002',
          sellingPrice: 200,
          competitionAnalysis: createMockCompetitionAnalysis('180')
        }),
      ];
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('should have accessible links', () => {
      const highPricedProducts = [createMockProduct({ 
        sellingPrice: 150,
        competitionAnalysis: createMockCompetitionAnalysis('120')
      })];
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      const manageLink = screen.getByRole('link', { name: 'Manage Pricing' });
      expect(manageLink).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty products array', () => {
      renderWithProviders(<HighPricedProductsWidget products={[]} loading={false} />);
      
      expect(screen.getByText('No high-priced products found.')).toBeInTheDocument();
    });

    it('should handle products with invalid competitor price strings', () => {
      const productsWithInvalidPrice = [
        createMockProduct({ 
          name: 'Invalid Price Product',
          sellingPrice: 150,
          competitionAnalysis: createMockCompetitionAnalysis('invalid')
        }),
      ];

      renderWithProviders(<HighPricedProductsWidget products={productsWithInvalidPrice} loading={false} />);
      
      expect(screen.getByText('No high-priced products found.')).toBeInTheDocument();
    });
  });
}); 