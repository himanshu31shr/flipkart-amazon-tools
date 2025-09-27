import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { HighPricedProductsWidget } from '../ProductAlertWidgets';
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
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'Test Description',
  platform: 'amazon' as const,
  visibility: 'visible' as const,
  sellingPrice: 100,
  categoryId: 'test-category',
  existsOnSellerPage: true,
  metadata: {
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  competitionAnalysis: {
    competitorName: 'Competitor',
    competitorPrice: '80',
    ourPrice: 100,
    visibility: 'visible',
    existsOnSellerPage: true,
    totalSellers: 5,
  },
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('HighPricedProductsWidget', () => {
  describe('loading state', () => {
    it('should show loading spinner when loading is true', () => {
      renderWithProviders(<HighPricedProductsWidget products={[]} loading={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    }) as any;

    it('should not show content when loading', () => {
      renderWithProviders(<HighPricedProductsWidget products={[]} loading={true} />);
      
      expect(screen.queryByText('High-Priced Products')).not.toBeInTheDocument();
      expect(screen.queryByText('No high-priced products found.')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('empty state', () => {
    it('should show empty message when no high-priced products and not loading', () => {
      const competitiveProducts = [
        createMockProduct({ 
          sellingPrice: 80, 
          competitionAnalysis: { competitorName: 'Competitor', competitorPrice: '100', ourPrice: 80, visibility: 'visible', existsOnSellerPage: true, totalSellers: 5 } 
        }),
        createMockProduct({ 
          sku: 'COMP-002',
          sellingPrice: 90, 
          competitionAnalysis: { competitorName: 'Competitor', competitorPrice: '100', ourPrice: 80, visibility: 'visible', existsOnSellerPage: true, totalSellers: 5 } 
        }),
      ];
      
      renderWithProviders(<HighPricedProductsWidget products={competitiveProducts} loading={false} />);
      
      expect(screen.getByText('No high-priced products found.')).toBeInTheDocument();
    }) as any;

    it('should not show header when no high-priced products', () => {
      const competitiveProducts = [createMockProduct({ 
        sellingPrice: 80, 
        competitionAnalysis: { competitorName: 'Competitor', competitorPrice: '100', ourPrice: 80, visibility: 'visible', existsOnSellerPage: true, totalSellers: 5 } 
      })];
      
      renderWithProviders(<HighPricedProductsWidget products={competitiveProducts} loading={false} />);
      
      expect(screen.queryByText('High-Priced Products')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('with high-priced products', () => {
    const highPricedProducts = [
      createMockProduct({
        sku: 'HIGH-001',
        name: 'Overpriced Product 1',
        sellingPrice: 120,
        platform: 'amazon',
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '100',
          ourPrice: 120,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      }),
      createMockProduct({
        sku: 'HIGH-002',
        name: 'Overpriced Product 2',
        sellingPrice: 150,
        platform: 'flipkart',
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '130',
          ourPrice: 150,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      }),
    ];

    it('should render header with trending up icon', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('High-Priced Products')).toBeInTheDocument();
      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
    }) as any;

    it('should show count of high-priced products', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    }) as any;

    it('should render product list', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('Overpriced Product 1')).toBeInTheDocument();
      expect(screen.getByText('Overpriced Product 2')).toBeInTheDocument();
    }) as any;

    it('should show SKU information', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('SKU: HIGH-001')).toBeInTheDocument();
      expect(screen.getByText('SKU: HIGH-002')).toBeInTheDocument();
    }) as any;

    it('should show platform chips with correct colors', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      expect(screen.getByText('amazon')).toBeInTheDocument();
      expect(screen.getByText('flipkart')).toBeInTheDocument();
    }) as any;

    it('should show price information', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      // Should show our prices and competitor prices for both products
      expect(screen.getAllByText('Our price:')).toHaveLength(2);
      expect(screen.getAllByText('Competitor:')).toHaveLength(2);
    }) as any;

    it('should show selling prices and competitor prices', () => {
      renderWithProviders(<HighPricedProductsWidget products={highPricedProducts} loading={false} />);
      
      // Should show selling prices
      expect(screen.getByText('₹120.00')).toBeInTheDocument();
      expect(screen.getByText('₹150.00')).toBeInTheDocument();
      
      // Should show competitor prices
      expect(screen.getByText('₹100.00')).toBeInTheDocument();
      expect(screen.getByText('₹130.00')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('product name truncation', () => {
    it('should truncate long product names', () => {
      const longNameProduct = createMockProduct({
        name: 'This is a very long product name that should be truncated because it exceeds the limit',
        sku: 'LONG-NAME',
        sellingPrice: 120,
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '100',
          ourPrice: 120,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      });

      renderWithProviders(<HighPricedProductsWidget products={[longNameProduct]} loading={false} />);
      
      expect(screen.getByText('This is a very long product na...')).toBeInTheDocument();
    }) as any;

    it('should not truncate short product names', () => {
      const shortNameProduct = createMockProduct({
        name: 'Short Name',
        sku: 'SHORT',
        sellingPrice: 120,
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '100',
          ourPrice: 120,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      });

      renderWithProviders(<HighPricedProductsWidget products={[shortNameProduct]} loading={false} />);
      
      expect(screen.getByText('Short Name')).toBeInTheDocument();
    }) as any;

    it('should show full name in title attribute', () => {
      const longNameProduct = createMockProduct({
        name: 'This is a very long product name that should be truncated because it exceeds the limit',
        sku: 'LONG-NAME',
        sellingPrice: 120,
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '100',
          ourPrice: 120,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      });

      renderWithProviders(<HighPricedProductsWidget products={[longNameProduct]} loading={false} />);
      
      const truncatedElement = screen.getByText('This is a very long product na...');
      expect(truncatedElement).toHaveAttribute('title', 'This is a very long product name that should be truncated because it exceeds the limit');
    }) as any;
  }) as any;

  describe('filtering logic', () => {
    it('should only show products where selling price > competitor price', () => {
      const mixedProducts = [
        createMockProduct({ 
          name: 'Overpriced Product', 
          sellingPrice: 120,
          competitionAnalysis: { competitorName: 'Competitor', competitorPrice: '100', ourPrice: 80, visibility: 'visible', existsOnSellerPage: true, totalSellers: 5 }
        }),
        createMockProduct({ 
          name: 'Competitively Priced Product', 
          sellingPrice: 90,
          competitionAnalysis: { competitorName: 'Competitor', competitorPrice: '100', ourPrice: 80, visibility: 'visible', existsOnSellerPage: true, totalSellers: 5 }
        }),
        createMockProduct({ 
          name: 'No Competition Data', 
          sellingPrice: 120,
          competitionAnalysis: undefined
        }),
      ];

      renderWithProviders(<HighPricedProductsWidget products={mixedProducts} loading={false} />);
      
      // Should only show the overpriced product
      expect(screen.getByText('Overpriced Product')).toBeInTheDocument();
      expect(screen.queryByText('Competitively Priced Product')).not.toBeInTheDocument();
      expect(screen.queryByText('No Competition Data')).not.toBeInTheDocument();
      
      // Should show correct count
      expect(screen.getByText('1')).toBeInTheDocument();
    }) as any;

    it('should handle products with zero competitor price', () => {
      const productWithZeroCompetitor = createMockProduct({
        name: 'Zero Competitor Price',
        sellingPrice: 100,
        competitionAnalysis: {
          competitorName: 'Competitor',
          competitorPrice: '0',
          ourPrice: 100,
          visibility: 'visible',
          existsOnSellerPage: true,
          totalSellers: 5,
        },
      });

      renderWithProviders(<HighPricedProductsWidget products={[productWithZeroCompetitor]} loading={false} />);
      
      // Should not show products with zero competitor price
      expect(screen.queryByText('Zero Competitor Price')).not.toBeInTheDocument();
      expect(screen.getByText('No high-priced products found.')).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any;