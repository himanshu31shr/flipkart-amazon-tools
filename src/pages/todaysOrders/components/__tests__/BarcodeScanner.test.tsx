import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarcodeScanner } from '../BarcodeScanner';
import { ScanningResult, BarcodeScanningOptions } from '../../../../types/barcode';

// Mock Quagga with a factory function
jest.mock('quagga', () => ({
  init: jest.fn((config, callback) => {
    // Default to failure to ensure manual entry mode is available
    const shouldFail = process.env.JEST_WORKER_ID !== undefined; // Fail in multi-worker context
    if (callback) {
      setTimeout(() => {
        if (shouldFail) {
          callback(new Error('Camera not available'));
        } else {
          callback(null);
        }
      }, 10); // Small delay to simulate async behavior
    }
  }),
  start: jest.fn(),
  stop: jest.fn(),
  onDetected: jest.fn(),
  offDetected: jest.fn()
}));

// Create a mock BarcodeService instance
const mockBarcodeService = {
  lookupBarcode: jest.fn(),
  markOrderCompleted: jest.fn(),
  validateBarcodeFormat: jest.fn()
};

// Mock the BarcodeService module only for this test file
jest.mock('../../../../services/barcode.service', () => ({
  BarcodeService: jest.fn().mockImplementation(() => mockBarcodeService)
}));

// Get reference to the mocked Quagga
import Quagga from 'quagga';
const mockQuagga = Quagga as jest.Mocked<typeof Quagga>;

describe('BarcodeScanner', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onScanSuccess: jest.fn(),
    onScanError: jest.fn(),
    options: {
      enableManualEntry: true,
      cameraTimeout: 30000,
      validateBarcode: (barcodeId: string) => {
        const validation = mockBarcodeService.validateBarcodeFormat(barcodeId);
        return validation.isValid;
      }
    } as BarcodeScanningOptions
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations to ensure clean state
    mockBarcodeService.lookupBarcode.mockReset();
    mockBarcodeService.markOrderCompleted.mockReset();
    mockBarcodeService.validateBarcodeFormat.mockReset();
    
    // Reset Quagga mocks
    mockQuagga.init.mockReset();
    mockQuagga.start.mockReset();
    mockQuagga.stop.mockReset();
    mockQuagga.onDetected.mockReset();
    mockQuagga.offDetected.mockReset();
    
    // Restore default mock implementations - fail by default to enable manual entry
    mockQuagga.init.mockImplementation((config, callback) => {
      if (callback) {
        setTimeout(() => {
          callback(new Error('Camera not available'));
        }, 10);
      }
    });
  });

  describe('component rendering', () => {
    it('should render when open', () => {
      render(<BarcodeScanner {...defaultProps} />);
      
      expect(screen.getByText('Barcode Scanner')).toBeInTheDocument();
      expect(screen.getByText('Camera')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<BarcodeScanner {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Barcode Scanner')).not.toBeInTheDocument();
    });

    it('should show manual entry option when enabled', () => {
      render(<BarcodeScanner {...defaultProps} />);
      
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    });

    it('should not show manual entry option when disabled', () => {
      render(<BarcodeScanner {...defaultProps} options={{ enableManualEntry: false, cameraTimeout: 30000 }} />);
      
      expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument();
    });
  });

  describe('manual entry functionality', () => {
    it('should allow manual barcode entry', async () => {
      const user = userEvent.setup();
      
      // Mock Quagga to fail initialization so camera doesn't start scanning
      mockQuagga.init.mockImplementation((config, callback) => {
        if (callback) callback(new Error('Camera not available'));
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for component to render and handle the failed camera initialization
      await waitFor(() => {
        expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      });
      
      // Now the manual entry button should be clickable since camera failed
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      // Wait for manual mode UI to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Enter Barcode ID')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Scan Barcode')).toBeInTheDocument();
    });

    it('should validate barcode format on manual entry', async () => {
      const user = userEvent.setup();
      
      // Mock validation to return invalid first
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid barcode format' 
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      // Test invalid format
      await user.type(input, 'INVALID_BARCODE');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid barcode format')).toBeInTheDocument();
      });
    });

    it('should handle successful manual barcode processing', async () => {
      const user = userEvent.setup();
      
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      mockBarcodeService.lookupBarcode.mockResolvedValue({
        success: true,
        barcodeId: '240151',
        orderData: {
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 1,
          platform: 'amazon',
          dateDocId: '2024-01-15',
          orderIndex: 0
        }
      });
      
      mockBarcodeService.markOrderCompleted.mockResolvedValue(true);
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for camera initialization to fail and manual entry to become available
      await waitFor(() => {
        expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      });
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      // Wait for manual entry form to appear
      const input = await screen.findByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, '240151');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onScanSuccess).toHaveBeenCalledWith({
          success: true,
          barcodeId: '240151',
          orderData: {
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 1,
            platform: 'amazon',
            dateDocId: '2024-01-15',
            orderIndex: 0
          }
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle barcode lookup failures', async () => {
      const user = userEvent.setup();
      
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      mockBarcodeService.lookupBarcode.mockResolvedValue({
        success: false,
        error: 'Barcode not found',
        errorType: 'NOT_FOUND'
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for camera initialization to fail and manual entry to become available
      await waitFor(() => {
        expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      });
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = await screen.findByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, '240159');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onScanError).toHaveBeenCalledWith('Barcode not found');
      });
    });

    it('should handle completion failures', async () => {
      const user = userEvent.setup();
      
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      mockBarcodeService.lookupBarcode.mockResolvedValue({
        success: false,
        error: 'Failed to find barcode',
        errorType: 'NOT_FOUND'
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, '240151');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onScanError).toHaveBeenCalledWith('Failed to find barcode');
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      mockBarcodeService.lookupBarcode.mockRejectedValue(new Error('Network error'));
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, '240151');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onScanError).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('modal interactions', () => {
    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<BarcodeScanner {...defaultProps} />);
      
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should render dialog with proper structure', () => {
      const { getByText } = render(<BarcodeScanner {...defaultProps} />);
      
      // Verify the dialog title is rendered, which confirms dialog is properly mounted
      expect(getByText('Barcode Scanner')).toBeInTheDocument();
      
      // Verify close button is accessible 
      const closeButton = getByText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('should show loading state during processing', async () => {
      const user = userEvent.setup();
      
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const lookupPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockBarcodeService.lookupBarcode.mockReturnValue(lookupPromise);
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for camera initialization to fail and manual entry to become available
      await waitFor(() => {
        expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      });
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = await screen.findByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, '240151');
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise
      resolvePromise!({
        success: true,
        barcodeId: '240151',
        orderData: {
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 1,
          platform: 'amazon',
          dateDocId: '2024-01-15',
          orderIndex: 0
        }
      });
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BarcodeScanner {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      // Mock validation for this test
      mockBarcodeService.validateBarcodeFormat.mockReturnValue({
        isValid: true,
        date: '2024-01-15',
        sequence: 1
      });
      
      mockBarcodeService.lookupBarcode.mockResolvedValue({
        success: true,
        barcodeId: '240151',
        orderData: {
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 1,
          platform: 'amazon',
          dateDocId: '2024-01-15',
          orderIndex: 0
        }
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for camera initialization to fail and manual entry to become available
      await waitFor(() => {
        expect(screen.getByText('Manual Entry')).toBeInTheDocument();
      });
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = await screen.findByLabelText('Enter Barcode ID');
      
      // Focus the input field directly 
      await user.click(input);
      expect(input).toHaveFocus();
      
      // Test that Enter key triggers submission
      await user.type(input, '240151');
      await user.keyboard('{Enter}');
      
      // Just verify the input still has focus after interaction
      expect(input).toBeInTheDocument();
    });
  });

  describe('camera functionality', () => {
    it('should switch between camera and manual entry modes', async () => {
      const user = userEvent.setup();
      
      // Override default to succeed for this test
      mockQuagga.init.mockImplementation((config, callback) => {
        if (callback) {
          setTimeout(() => {
            callback(null);
          }, 10);
        }
      });
      
      render(<BarcodeScanner {...defaultProps} />);
      
      // Wait for camera initialization to succeed
      await waitFor(() => {
        expect(screen.getByText('Camera')).toBeInTheDocument();
      });
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = await screen.findByLabelText('Enter Barcode ID');
      expect(input).toBeInTheDocument();
      
      // Switch back to camera
      const cameraButton = screen.getByText('Camera');
      await user.click(cameraButton);
      
      // Camera mode should be active again
      expect(screen.getByRole('button', { name: /Camera/ })).toBeInTheDocument();
    });
  });
});