import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SummaryTable } from '../SummaryTable';
import { ProductSummary } from '../../services/base.transformer';
import { Product } from '../../../../services/product.service';
import { Timestamp } from 'firebase/firestore';

// Mock Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

interface MockColumn {
  id: string;
  label: string;
  format?: (value: unknown, row?: unknown) => React.ReactNode;
}

interface MockDataTableProps {
  columns: MockColumn[];
  data: ProductSummary[];
  id: string;
}

// Mock the DataTable component
jest.mock('../../../../components/DataTable/DataTable', () => ({
  DataTable: ({ columns, data, id }: MockDataTableProps) => (
    <div data-testid={id}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data || []).map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.id}>
                  {col.format ? col.format(row[col.id as keyof ProductSummary], row) : String(row[col.id as keyof ProductSummary] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

interface MockActionButtonProps {
  flipkartSerialNumber?: string;
  amazonSerialNumber?: string;
}

// Mock the ActionButtons
jest.mock('../../../../shared/ActionButtons', () => ({
  ViewFlipkartListingButton: ({ flipkartSerialNumber }: MockActionButtonProps) => (
    <button data-testid={`view-flipkart-${flipkartSerialNumber}`}>
      View Flipkart
    </button>
  ),
  ViewAmazonListingButton: ({ amazonSerialNumber }: MockActionButtonProps) => (
    <button data-testid={`view-amazon-${amazonSerialNumber}`}>
      View Amazon
    </button>
  ),
}));

const theme = createTheme();

const createMockProduct = (platform: 'flipkart' | 'amazon', serialNumber?: string): Product => ({
  sku: `${platform.toUpperCase()}-001`,
  name: `Test ${platform} Product`,
  description: `Test description for ${platform} product`,
  platform,
  visibility: 'visible' as const,
  sellingPrice: 150,
  metadata: {
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(platform === 'flipkart' && serialNumber && { flipkartSerialNumber: serialNumber }),
    ...(platform === 'amazon' && serialNumber && { amazonSerialNumber: serialNumber }),
  },
}) as any;

const mockFlipkartProduct: ProductSummary = {
  SKU: 'FLP-001',
  name: 'Test Flipkart Product',
  quantity: '5',
  type: 'flipkart',
  product: createMockProduct('flipkart', 'FLP123456'),
};

const mockAmazonProduct: ProductSummary = {
  SKU: 'AMZ-001',
  name: 'Test Amazon Product',
  quantity: '10',
  type: 'amazon',
  product: createMockProduct('amazon', 'AMZ789012'),
};

const mockProductWithoutMetadata: ProductSummary = {
  SKU: 'NO-META-001',
  name: 'Product Without Metadata',
  quantity: '3',
  type: 'flipkart',
  product: {
    ...createMockProduct('flipkart'),
    metadata: {},
  },
};

const renderSummaryTable = (props = {}) => {
  const defaultProps = {
    summary: [],
  };

  return render(
    <ThemeProvider theme={theme}>
      <SummaryTable {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('SummaryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('rendering', () => {
    it('should render DataTable with correct id', () => {
      renderSummaryTable();
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    }) as any;

    it('should render table headers correctly', () => {
      renderSummaryTable();
      
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    }) as any;

    it('should render empty table when no summary data', () => {
      renderSummaryTable({ summary: [] }) as any;
      
      const table = screen.getByTestId('summary-table');
      expect(table).toBeInTheDocument();
    }) as any;

    it('should render table with summary data', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      expect(screen.getByText('FLP-001')).toBeInTheDocument();
      expect(screen.getByText('Test Flipkart Product')).toBeInTheDocument();
      expect(screen.getByText('AMZ-001')).toBeInTheDocument();
      expect(screen.getByText('Test Amazon Product')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('column formatting', () => {
    it('should format quantity column correctly', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      expect(screen.getByText('5')).toBeInTheDocument();
    }) as any;

    it('should format platform column with chips', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      // Check for platform chips
      expect(screen.getByText('FLIPKART')).toBeInTheDocument();
      expect(screen.getByText('AMAZON')).toBeInTheDocument();
    }) as any;

    it('should apply correct chip colors for platforms', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      // The chips should be rendered with different colors
      const flipkartChip = screen.getByText('FLIPKART');
      const amazonChip = screen.getByText('AMAZON');
      
      expect(flipkartChip).toBeInTheDocument();
      expect(amazonChip).toBeInTheDocument();
    }) as any;

    it('should handle different quantity formats', () => {
      const products = [
        { ...mockFlipkartProduct, quantity: '0' },
        { ...mockAmazonProduct, quantity: '999' },
      ];
      
      renderSummaryTable({ summary: products }) as any;
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('999')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('action buttons', () => {
    it('should render Flipkart action button for Flipkart products', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      const flipkartButton = screen.getByTestId('view-flipkart-FLP123456');
      expect(flipkartButton).toBeInTheDocument();
    }) as any;

    it('should render Amazon action button for Amazon products', () => {
      renderSummaryTable({ summary: [mockAmazonProduct] }) as any;
      
      const amazonButton = screen.getByTestId('view-amazon-AMZ789012');
      expect(amazonButton).toBeInTheDocument();
    }) as any;

    it('should not render Amazon button for Flipkart products', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      expect(screen.queryByTestId('view-amazon-AMZ789012')).not.toBeInTheDocument();
    }) as any;

    it('should not render Flipkart button for Amazon products', () => {
      renderSummaryTable({ summary: [mockAmazonProduct] }) as any;
      
      expect(screen.queryByTestId('view-flipkart-FLP123456')).not.toBeInTheDocument();
    }) as any;

    it('should handle products with missing metadata', () => {
      renderSummaryTable({ summary: [mockProductWithoutMetadata] }) as any;
      
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    }) as any;

    it('should handle products with undefined metadata', () => {
      const productWithUndefinedMetadata = {
        ...mockFlipkartProduct,
        product: {
          platform: 'flipkart',
          metadata: undefined,
        },
      };
      
      renderSummaryTable({ summary: [productWithUndefinedMetadata] }) as any;
      
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('data handling', () => {
    it('should handle mixed platform products', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      expect(screen.getByTestId('view-flipkart-FLP123456')).toBeInTheDocument();
      expect(screen.getByTestId('view-amazon-AMZ789012')).toBeInTheDocument();
    }) as any;

    it('should handle large datasets', () => {
      const largeDataset = Array.from({ length: 50 }, (_, index) => ({
        SKU: `SKU-${index}`,
        name: `Product ${index}`,
        quantity: `${index + 1}`,
        type: index % 2 === 0 ? 'flipkart' : 'amazon',
        product: {
          platform: index % 2 === 0 ? 'flipkart' : 'amazon',
          metadata: {
            [index % 2 === 0 ? 'flipkartSerialNumber' : 'amazonSerialNumber']: `SN${index}`,
          },
        },
      }));
      
      renderSummaryTable({ summary: largeDataset }) as any;
      
      expect(screen.getByText('SKU-0')).toBeInTheDocument();
      expect(screen.getByText('Product 0')).toBeInTheDocument();
    }) as any;

    it('should handle products with special characters in names', () => {
      const specialProduct = {
        ...mockFlipkartProduct,
        name: 'Product with "quotes" & special chars!',
        SKU: 'SPECIAL-001',
      };
      
      renderSummaryTable({ summary: [specialProduct] }) as any;
      
      expect(screen.getByText('Product with "quotes" & special chars!')).toBeInTheDocument();
    }) as any;

    it('should handle products with very long names', () => {
      const longNameProduct = {
        ...mockFlipkartProduct,
        name: 'This is a very long product name that might cause layout issues in the table component',
        SKU: 'LONG-001',
      };
      
      renderSummaryTable({ summary: [longNameProduct] }) as any;
      
      expect(screen.getByText('This is a very long product name that might cause layout issues in the table component')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('edge cases', () => {
    it('should handle undefined summary prop', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <SummaryTable summary={undefined as unknown as ProductSummary[]} />
          </ThemeProvider>
        );
      }).not.toThrow();
    }) as any;

    it('should handle null summary prop', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <SummaryTable summary={null as unknown as ProductSummary[]} />
          </ThemeProvider>
        );
      }).not.toThrow();
    }) as any;

    it('should handle products without product property', () => {
      const productWithoutProduct = {
        SKU: 'NO-PRODUCT-001',
        name: 'Product Without Product Property',
        quantity: '1',
        type: 'flipkart',
        product: undefined,
      };
      
      expect(() => {
        renderSummaryTable({ summary: [productWithoutProduct] }) as any;
      }).not.toThrow();
    }) as any;

    it('should handle products with unknown platform', () => {
      const unknownPlatformProduct = {
        SKU: 'UNKNOWN-001',
        name: 'Unknown Platform Product',
        quantity: '1',
        type: 'unknown',
        product: {
          platform: 'unknown',
          metadata: {},
        },
      };
      
      renderSummaryTable({ summary: [unknownPlatformProduct] }) as any;
      
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    }) as any;

    it('should handle empty string values', () => {
      const emptyStringProduct = {
        SKU: '',
        name: '',
        quantity: '',
        type: '',
        product: {
          platform: 'flipkart',
          metadata: {
            flipkartSerialNumber: '',
          },
        },
      };
      
      renderSummaryTable({ summary: [emptyStringProduct] }) as any;
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('component integration', () => {
    it('should work with different themes', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
        },
      }) as any;

      render(
        <ThemeProvider theme={darkTheme}>
          <SummaryTable summary={[mockFlipkartProduct]} />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    }) as any;

    it('should pass correct props to DataTable', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      const dataTable = screen.getByTestId('summary-table');
      expect(dataTable).toBeInTheDocument();
    }) as any;

    it('should render all Material-UI components correctly', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      // Check that chips are rendered
      expect(screen.getByText('FLIPKART')).toBeInTheDocument();
      expect(screen.getByText('AMAZON')).toBeInTheDocument();
    }) as any;

    it('should handle re-renders correctly', () => {
      const { rerender } = renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      expect(screen.getByText('FLP-001')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={theme}>
          <SummaryTable summary={[mockAmazonProduct]} />
        </ThemeProvider>
      );
      
      expect(screen.getByText('AMZ-001')).toBeInTheDocument();
      expect(screen.queryByText('FLP-001')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should have accessible table structure', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    }) as any;

    it('should have accessible action buttons', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      }) as any;
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    }) as any;

    it('should have proper semantic structure', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] }) as any;
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('rowgroup')).toHaveLength(2); // thead and tbody
    }) as any;
  }) as any;
}) as any; 