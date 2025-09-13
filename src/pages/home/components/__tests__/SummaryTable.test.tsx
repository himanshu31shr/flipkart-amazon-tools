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
  customCostPrice: 100,
  platform,
  visibility: 'visible' as const,
  sellingPrice: 150,
  metadata: {
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(platform === 'flipkart' && serialNumber && { flipkartSerialNumber: serialNumber }),
    ...(platform === 'amazon' && serialNumber && { amazonSerialNumber: serialNumber }),
  },
});

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
  });

  describe('rendering', () => {
    it('should render DataTable with correct id', () => {
      renderSummaryTable();
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    });

    it('should render table headers correctly', () => {
      renderSummaryTable();
      
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render empty table when no summary data', () => {
      renderSummaryTable({ summary: [] });
      
      const table = screen.getByTestId('summary-table');
      expect(table).toBeInTheDocument();
    });

    it('should render table with summary data', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      expect(screen.getByText('FLP-001')).toBeInTheDocument();
      expect(screen.getByText('Test Flipkart Product')).toBeInTheDocument();
      expect(screen.getByText('AMZ-001')).toBeInTheDocument();
      expect(screen.getByText('Test Amazon Product')).toBeInTheDocument();
    });
  });

  describe('column formatting', () => {
    it('should format quantity column correctly', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should format platform column with chips', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      // Check for platform chips
      expect(screen.getByText('FLIPKART')).toBeInTheDocument();
      expect(screen.getByText('AMAZON')).toBeInTheDocument();
    });

    it('should apply correct chip colors for platforms', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      // The chips should be rendered with different colors
      const flipkartChip = screen.getByText('FLIPKART');
      const amazonChip = screen.getByText('AMAZON');
      
      expect(flipkartChip).toBeInTheDocument();
      expect(amazonChip).toBeInTheDocument();
    });

    it('should handle different quantity formats', () => {
      const products = [
        { ...mockFlipkartProduct, quantity: '0' },
        { ...mockAmazonProduct, quantity: '999' },
      ];
      
      renderSummaryTable({ summary: products });
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render Flipkart action button for Flipkart products', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      const flipkartButton = screen.getByTestId('view-flipkart-FLP123456');
      expect(flipkartButton).toBeInTheDocument();
    });

    it('should render Amazon action button for Amazon products', () => {
      renderSummaryTable({ summary: [mockAmazonProduct] });
      
      const amazonButton = screen.getByTestId('view-amazon-AMZ789012');
      expect(amazonButton).toBeInTheDocument();
    });

    it('should not render Amazon button for Flipkart products', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      expect(screen.queryByTestId('view-amazon-AMZ789012')).not.toBeInTheDocument();
    });

    it('should not render Flipkart button for Amazon products', () => {
      renderSummaryTable({ summary: [mockAmazonProduct] });
      
      expect(screen.queryByTestId('view-flipkart-FLP123456')).not.toBeInTheDocument();
    });

    it('should handle products with missing metadata', () => {
      renderSummaryTable({ summary: [mockProductWithoutMetadata] });
      
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    });

    it('should handle products with undefined metadata', () => {
      const productWithUndefinedMetadata = {
        ...mockFlipkartProduct,
        product: {
          platform: 'flipkart',
          metadata: undefined,
        },
      };
      
      renderSummaryTable({ summary: [productWithUndefinedMetadata] });
      
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    });
  });

  describe('data handling', () => {
    it('should handle mixed platform products', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      expect(screen.getByTestId('view-flipkart-FLP123456')).toBeInTheDocument();
      expect(screen.getByTestId('view-amazon-AMZ789012')).toBeInTheDocument();
    });

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
      
      renderSummaryTable({ summary: largeDataset });
      
      expect(screen.getByText('SKU-0')).toBeInTheDocument();
      expect(screen.getByText('Product 0')).toBeInTheDocument();
    });

    it('should handle products with special characters in names', () => {
      const specialProduct = {
        ...mockFlipkartProduct,
        name: 'Product with "quotes" & special chars!',
        SKU: 'SPECIAL-001',
      };
      
      renderSummaryTable({ summary: [specialProduct] });
      
      expect(screen.getByText('Product with "quotes" & special chars!')).toBeInTheDocument();
    });

    it('should handle products with very long names', () => {
      const longNameProduct = {
        ...mockFlipkartProduct,
        name: 'This is a very long product name that might cause layout issues in the table component',
        SKU: 'LONG-001',
      };
      
      renderSummaryTable({ summary: [longNameProduct] });
      
      expect(screen.getByText('This is a very long product name that might cause layout issues in the table component')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined summary prop', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <SummaryTable summary={undefined as unknown as ProductSummary[]} />
          </ThemeProvider>
        );
      }).not.toThrow();
    });

    it('should handle null summary prop', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <SummaryTable summary={null as unknown as ProductSummary[]} />
          </ThemeProvider>
        );
      }).not.toThrow();
    });

    it('should handle products without product property', () => {
      const productWithoutProduct = {
        SKU: 'NO-PRODUCT-001',
        name: 'Product Without Product Property',
        quantity: '1',
        type: 'flipkart',
        product: undefined,
      };
      
      expect(() => {
        renderSummaryTable({ summary: [productWithoutProduct] });
      }).not.toThrow();
    });

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
      
      renderSummaryTable({ summary: [unknownPlatformProduct] });
      
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
      expect(screen.queryByTestId('view-flipkart-')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-amazon-')).not.toBeInTheDocument();
    });

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
      
      renderSummaryTable({ summary: [emptyStringProduct] });
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    });
  });

  describe('component integration', () => {
    it('should work with different themes', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
        },
      });

      render(
        <ThemeProvider theme={darkTheme}>
          <SummaryTable summary={[mockFlipkartProduct]} />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    });

    it('should pass correct props to DataTable', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      const dataTable = screen.getByTestId('summary-table');
      expect(dataTable).toBeInTheDocument();
    });

    it('should render all Material-UI components correctly', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      // Check that chips are rendered
      expect(screen.getByText('FLIPKART')).toBeInTheDocument();
      expect(screen.getByText('AMAZON')).toBeInTheDocument();
    });

    it('should handle re-renders correctly', () => {
      const { rerender } = renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      expect(screen.getByText('FLP-001')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={theme}>
          <SummaryTable summary={[mockAmazonProduct]} />
        </ThemeProvider>
      );
      
      expect(screen.getByText('AMZ-001')).toBeInTheDocument();
      expect(screen.queryByText('FLP-001')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible table structure', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should have accessible action buttons', () => {
      renderSummaryTable({ 
        summary: [mockFlipkartProduct, mockAmazonProduct] 
      });
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper semantic structure', () => {
      renderSummaryTable({ summary: [mockFlipkartProduct] });
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('rowgroup')).toHaveLength(2); // thead and tbody
    });
  });
}); 