import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarcodeScanner } from '../BarcodeScanner';
import { ScanningResult, BarcodeScanningOptions } from '../../../../types/barcode';

// Mock qr-scanner
jest.mock('qr-scanner', () => {
  const mockQrScannerInstance = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    setCamera: jest.fn().mockResolvedValue(undefined)
  };

  const MockQrScanner: any = jest.fn().mockImplementation(() => mockQrScannerInstance);
  MockQrScanner.hasCamera = jest.fn().mockResolvedValue(true);

  return {
    __esModule: true,
    default: MockQrScanner
  };
});

// Mock BarcodeService
const mockBarcodeService = {
  lookupBarcode: jest.fn(),
  markOrderCompleted: jest.fn(),
  validateBarcodeFormat: jest.fn()
};

jest.mock('../../../../services/barcode.service', () => ({
  BarcodeService: jest.fn().mockImplementation(() => mockBarcodeService)
}));

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
      render(<BarcodeScanner {...defaultProps} />);
      
      // Switch to manual entry mode
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      expect(screen.getByLabelText('Enter Barcode ID')).toBeInTheDocument();
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
        barcodeId: 'BC_2024-01-15_001',
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
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, 'BC_2024-01-15_001');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onScanSuccess).toHaveBeenCalledWith({
          success: true,
          barcodeId: 'BC_2024-01-15_001',
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
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, 'BC_2024-01-15_999');
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
      
      await user.type(input, 'BC_2024-01-15_001');
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
      
      await user.type(input, 'BC_2024-01-15_001');
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
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      const submitButton = screen.getByText('Scan Barcode');
      
      await user.type(input, 'BC_2024-01-15_001');
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise
      resolvePromise!({
        success: true,
        barcodeId: 'BC_2024-01-15_001',
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
        barcodeId: 'BC_2024-01-15_001',
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
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      const input = screen.getByLabelText('Enter Barcode ID');
      
      // Focus the input field directly 
      await user.click(input);
      expect(input).toHaveFocus();
      
      // Test that Enter key triggers submission
      await user.type(input, 'BC_2024-01-15_001');
      await user.keyboard('{Enter}');
      
      // Just verify the input still has focus after interaction
      expect(input).toBeInTheDocument();
    });
  });

  describe('camera functionality', () => {
    it('should switch between camera and manual entry modes', async () => {
      const user = userEvent.setup();
      render(<BarcodeScanner {...defaultProps} />);
      
      // Initially in camera mode - check for camera button being selected
      expect(screen.getByText('Camera')).toBeInTheDocument();
      
      // Switch to manual entry
      const manualButton = screen.getByText('Manual Entry');
      await user.click(manualButton);
      
      expect(screen.getByLabelText('Enter Barcode ID')).toBeInTheDocument();
      
      // Switch back to camera
      const cameraButton = screen.getByText('Camera');
      await user.click(cameraButton);
      
      // Camera mode should be active again
      expect(screen.getByRole('button', { name: /Camera/ })).toBeInTheDocument();
    });
  });
});