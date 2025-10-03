import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BarcodeScannerButton } from '../BarcodeScannerButton';
import { ProductService } from '../../../services/product.service';
import { BarcodeService } from '../../../services/barcode.service';
import { ProductNavigationService } from '../../../services/productNavigation.service';
import productsSlice, { fetchProducts } from '../../../store/slices/productsSlice';

// Mock the services
jest.mock('../../../services/product.service');
jest.mock('../../../services/barcode.service');
jest.mock('../../../services/productNavigation.service');

// Mock the fetchProducts async thunk to return a resolved promise
const mockFetchProducts = jest.fn().mockResolvedValue([]);

// Mock the ProductIdentificationScanner component for lazy loading
const MockProductIdentificationScanner = ({ open, onScanSuccess, onScanError, onClose }: any) => {
  if (!open) return null;
  
  return (
    <div data-testid="product-identification-scanner">
      <button 
        onClick={() => onScanSuccess({ 
          success: true, 
          barcodeId: 'TEST-SKU-001' // Use the test product's SKU
        })}
        data-testid="mock-scan-success"
      >
        Mock Scan Success
      </button>
      <button 
        onClick={() => onScanError('Mock scan error')}
        data-testid="mock-scan-error"
      >
        Mock Scan Error
      </button>
      <button onClick={onClose} data-testid="mock-close">
        Close Scanner
      </button>
    </div>
  );
};

// Mock the ProductIdentificationScanner component with proper lazy loading support
jest.mock('../../ProductIdentificationScanner', () => ({
  ProductIdentificationScanner: MockProductIdentificationScanner,
}));

describe('BarcodeScannerButton', () => {
  let mockProductService: jest.Mocked<ProductService>;
  let mockBarcodeService: jest.Mocked<BarcodeService>;
  let mockNavigationService: jest.Mocked<ProductNavigationService>;
  
  // Helper function to create test store
  const createTestStore = (initialProducts = []) => {
    return configureStore({
      reducer: {
        products: productsSlice,
      },
      preloadedState: {
        products: {
          items: initialProducts,
          filteredItems: initialProducts,
          loading: false,
          error: null,
          filters: {},
          lastFetched: null,
          detailsCache: {},
          categories: [],
          categoriesLoading: false,
          categoriesError: null,
          categoryProducts: [],
          categoryProductsLoading: false,
          categoryProductsError: null,
          inventoryLevels: {},
          inventoryLoading: false,
          inventoryError: null,
          productInventoryStatus: {},
          lowStockProducts: [],
          zeroStockProducts: [],
        },
      },
      middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware(),
    });
  };
  
  // Helper function to render with Redux Provider
  const renderWithProvider = (component: React.ReactElement, initialProducts = [mockProduct]) => {
    const store = createTestStore(initialProducts);
    return render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  };
  
  const mockProduct = {
    id: 'test-product-1',
    sku: 'TEST-SKU-001',
    name: 'Test Product',
    description: 'Test product description',
    platform: 'amazon' as const,
    visibility: 'visible' as const,
    sellingPrice: 100,
    metadata: {
      amazonSerialNumber: 'B0123456789',
      flipkartSerialNumber: 'FLIP123456789',
    },
  };

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    
    // Setup service mocks
    mockProductService = {
      getProducts: jest.fn().mockResolvedValue([mockProduct]),
    } as any;
    
    mockBarcodeService = {
      lookupBarcode: jest.fn().mockResolvedValue({
        success: false,
        error: 'Barcode not found',
      }),
    } as any;
    
    mockNavigationService = {
      hasMarketplaceListing: jest.fn().mockReturnValue(true),
      navigateToProduct: jest.fn().mockResolvedValue(undefined),
      getProductPlatform: jest.fn().mockReturnValue('amazon'),
    } as any;

    // Mock constructors to return our mocked instances
    (ProductService as unknown as jest.Mock).mockImplementation(() => mockProductService);
    (BarcodeService as unknown as jest.Mock).mockImplementation(() => mockBarcodeService);
    (ProductNavigationService as unknown as jest.Mock).mockImplementation(() => mockNavigationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render scanner button with correct icon and tooltip', () => {
      renderWithProvider(<BarcodeScannerButton />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      expect(button).toBeInTheDocument();
      
      // Check for scanner icon (QrCodeScanner icon should be present)
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render tooltip on hover', async () => {
      renderWithProvider(<BarcodeScannerButton />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.mouseOver(button);
      
      await waitFor(() => {
        expect(screen.getByText('Scan Product Barcode')).toBeInTheDocument();
      });
    });

    it('should be disabled when disabled prop is true', () => {
      renderWithProvider(<BarcodeScannerButton disabled />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      expect(button).toBeDisabled();
    });

    it('should apply custom className when provided', () => {
      renderWithProvider(<BarcodeScannerButton className="custom-class" />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Scanner Modal Interaction', () => {
    it('should open scanner modal when button is clicked', async () => {
      renderWithProvider(<BarcodeScannerButton />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(screen.getByTestId('product-identification-scanner')).toBeInTheDocument();
      });
    });

    it('should not open scanner when disabled', () => {
      renderWithProvider(<BarcodeScannerButton disabled />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      expect(screen.queryByTestId('product-identification-scanner')).not.toBeInTheDocument();
    });

    it('should close scanner modal when close is triggered', async () => {
      renderWithProvider(<BarcodeScannerButton />);
      
      // Open scanner
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(screen.getByTestId('product-identification-scanner')).toBeInTheDocument();
      });
      
      // Close scanner
      const closeButton = screen.getByTestId('mock-close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('product-identification-scanner')).not.toBeInTheDocument();
    });
  });

  describe('Product Lookup and Navigation', () => {
    it('should successfully lookup product and navigate on scan success', async () => {
      const onScanSuccess = jest.fn();
      renderWithProvider(<BarcodeScannerButton onScanSuccess={onScanSuccess} />);
      
      // Open scanner
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(screen.getByTestId('product-identification-scanner')).toBeInTheDocument();
      });
      
      // Trigger successful scan
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      
      await act(async () => {
        fireEvent.click(scanSuccessButton);
      });
      
      // Wait for all async operations to complete
      await waitFor(() => {
        expect(mockNavigationService.hasMarketplaceListing).toHaveBeenCalledWith(mockProduct);
        expect(mockNavigationService.navigateToProduct).toHaveBeenCalledWith(mockProduct);
        expect(onScanSuccess).toHaveBeenCalled();
      });
      
      // Scanner should close after successful navigation
      await waitFor(() => {
        expect(screen.queryByTestId('product-identification-scanner')).not.toBeInTheDocument();
      });
    });

    it('should handle product not found error', async () => {
      const onScanError = jest.fn();
      
      // Create a different product that won't match the test SKU to simulate product not found
      const differentProduct = {
        id: 'different-product',
        sku: 'DIFFERENT-SKU',
        name: 'Different Product',
        description: 'Different product description',
        platform: 'amazon' as const,
        visibility: 'visible' as const,
        sellingPrice: 100,
        metadata: {
          amazonSerialNumber: 'B0987654321',
          flipkartSerialNumber: 'FLIP987654321',
        },
      };
      
      // Render with product that won't match TEST-SKU-001
      renderWithProvider(<BarcodeScannerButton onScanError={onScanError} />, [differentProduct]);
      
      // Open scanner and trigger scan
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(screen.getByTestId('product-identification-scanner')).toBeInTheDocument();
      });
      
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(scanSuccessButton);
      
      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith('Product not found for this barcode');
      });
    });

    it('should handle product without marketplace listing', async () => {
      const onScanError = jest.fn();
      mockNavigationService.hasMarketplaceListing.mockReturnValue(false);
      
      renderWithProvider(<BarcodeScannerButton onScanError={onScanError} />);
      
      // Open scanner and trigger scan
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      
      await act(async () => {
        fireEvent.click(scanSuccessButton);
      });
      
      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith('Product found but no marketplace listing available');
      });
    });

    it('should handle navigation errors', async () => {
      const onScanError = jest.fn();
      mockNavigationService.navigateToProduct.mockRejectedValue(new Error('Navigation failed'));
      
      renderWithProvider(<BarcodeScannerButton onScanError={onScanError} />);
      
      // Open scanner and trigger scan
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      
      await act(async () => {
        fireEvent.click(scanSuccessButton);
      });
      
      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith('Navigation failed');
      });
    });

    it('should handle scan errors from scanner component', async () => {
      const onScanError = jest.fn();
      renderWithProvider(<BarcodeScannerButton onScanError={onScanError} />);
      
      // Open scanner
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      // Trigger scan error
      const scanErrorButton = screen.getByTestId('mock-scan-error');
      fireEvent.click(scanErrorButton);
      
      await waitFor(() => {
        expect(onScanError).toHaveBeenCalledWith('Mock scan error');
      });
    });
  });

  describe('Processing State', () => {
    it('should disable button during processing', async () => {
      // Mock a slow navigation to test processing state
      mockNavigationService.navigateToProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProvider(<BarcodeScannerButton />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      fireEvent.click(button);
      
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(scanSuccessButton);
      
      // Button should be disabled during processing
      expect(button).toBeDisabled();
      
      // Wait for processing to complete
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should not open scanner when already processing', async () => {
      // Mock a slow navigation to keep processing state active
      let resolveNavigation: () => void;
      const navigationPromise = new Promise<void>((resolve) => {
        resolveNavigation = resolve;
      });
      mockNavigationService.navigateToProduct.mockReturnValue(navigationPromise);
      
      renderWithProvider(<BarcodeScannerButton />);
      
      const button = screen.getByRole('button', { name: /scan product barcode/i });
      
      // Start first scan
      fireEvent.click(button);
      const scanSuccessButton = screen.getByTestId('mock-scan-success');
      
      // Trigger scan (this will start processing but not complete due to slow navigation)
      await act(async () => {
        fireEvent.click(scanSuccessButton);
      });
      
      // Verify the button is disabled due to processing
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
      
      // Try to open scanner again while processing (should not work due to disabled button)
      fireEvent.click(button);
      
      // Scanner should close automatically after navigation completes
      // But since navigation is pending, we test the disabled state instead
      expect(button).toBeDisabled();
      
      // Complete the navigation to clean up
      act(() => {
        resolveNavigation();
      });
    });
  });
});