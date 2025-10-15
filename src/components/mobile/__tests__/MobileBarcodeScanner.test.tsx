import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MobileBarcodeScanner } from '../MobileBarcodeScanner';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web')
  }
}));

// Mock BarcodeScanner
jest.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: {
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
    startScan: jest.fn(),
    stopScan: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    toggleTorch: jest.fn()
  },
  BarcodeFormat: {
    Ean13: 'EAN_13',
    Ean8: 'EAN_8',
    UpcA: 'UPC_A',
    UpcE: 'UPC_E',
    Code128: 'CODE_128',
    Code39: 'CODE_39',
    QrCode: 'QR_CODE'
  }
}));

describe('MobileBarcodeScanner', () => {
  const mockOnScan = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
  });

  describe('Web Fallback', () => {
    it('should render manual input when not on native platform', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/enter barcode manually/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter barcode number/i)).toBeInTheDocument();
    });

    it('should call onScan with manual input', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByPlaceholderText(/enter barcode number/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(input, { target: { value: '1234567890' } });
      fireEvent.click(submitButton);

      expect(mockOnScan).toHaveBeenCalledWith('1234567890', 'MANUAL');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should submit on Enter key press', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByPlaceholderText(/enter barcode number/i);

      fireEvent.change(input, { target: { value: '9876543210' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(mockOnScan).toHaveBeenCalledWith('9876543210', 'MANUAL');
    });

    it('should disable submit button when input is empty', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input has value', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByPlaceholderText(/enter barcode number/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      fireEvent.change(input, { target: { value: 'test' } });

      expect(submitButton).not.toBeDisabled();
    });

    it('should close when close button is clicked', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Native Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    });

    it('should request camera permissions on mount', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'prompt'
      });
      (BarcodeScanner.requestPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(BarcodeScanner.checkPermissions).toHaveBeenCalled();
      });
    });

    it('should start scanning when permissions are granted', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });
      (BarcodeScanner.startScan as jest.Mock).mockResolvedValue(undefined);
      (BarcodeScanner.addListener as jest.Mock).mockResolvedValue({
        remove: jest.fn()
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(BarcodeScanner.startScan).toHaveBeenCalled();
      });
    });

    it('should show error when permissions are denied', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'denied'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/camera permission denied/i)).toBeInTheDocument();
      });
    });

    it('should show "Open Settings" button when permission denied', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'denied'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
      });
    });

    it('should render native scanner UI when active', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/scan barcode/i)).toBeInTheDocument();
      });
    });

    it('should call onScan when barcode is scanned', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      let barcodeScanHandler: ((event: any) => void) | null = null;
      (BarcodeScanner.addListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'barcodesScanned') {
          barcodeScanHandler = handler;
        }
        return Promise.resolve({ remove: jest.fn() });
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(barcodeScanHandler).toBeTruthy();
      });

      // Simulate barcode scan
      if (barcodeScanHandler && typeof barcodeScanHandler === 'function') {
        await (barcodeScanHandler as (event: { barcodes: Array<{ rawValue: string; format: string }> }) => Promise<void>)({
          barcodes: [{
            rawValue: '1234567890123',
            format: 'EAN_13'
          }]
        });
      }

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('1234567890123', 'EAN_13');
      });
    });

    it('should stop scanning after successful scan', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });
      (BarcodeScanner.stopScan as jest.Mock).mockResolvedValue(undefined);

      let barcodeScanHandler: ((event: any) => void) | null = null;
      (BarcodeScanner.addListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'barcodesScanned') {
          barcodeScanHandler = handler;
        }
        return Promise.resolve({ remove: jest.fn() });
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(barcodeScanHandler).toBeTruthy();
      });

      // Simulate barcode scan
      if (barcodeScanHandler && typeof barcodeScanHandler === 'function') {
        await act(async () => {
          await (barcodeScanHandler as (event: { barcodes: Array<{ rawValue: string; format: string }> }) => Promise<void>)({
            barcodes: [{
              rawValue: '1234567890123',
              format: 'EAN_13'
            }]
          });
        });
      }

      await waitFor(() => {
        expect(BarcodeScanner.stopScan).toHaveBeenCalled();
      });
    });

    it('should display custom instructions', async () => {
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
          instructions="Custom scan instructions"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Custom scan instructions')).toBeInTheDocument();
      });
    });
  });

  describe('Visibility Control', () => {
    it('should not render when isActive is false', () => {
      const { container } = render(
        <MobileBarcodeScanner
          isActive={false}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isActive is true', () => {
      const { container } = render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have close button with proper aria-label', () => {
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.getAttribute('aria-label')?.toLowerCase().includes('close')
      );

      expect(closeButton).toBeTruthy();
    });

    it('should auto-focus input in web fallback', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      
      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByPlaceholderText(/enter barcode number/i);
      expect(input).toHaveFocus();
    });
  });

  describe('Supported Formats', () => {
    it('should support custom barcode formats', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      const customFormats = [BarcodeFormat.QrCode, BarcodeFormat.Code128];

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
          formats={customFormats}
        />
      );

      await waitFor(() => {
        expect(BarcodeScanner.startScan).toHaveBeenCalledWith({
          formats: customFormats
        });
      });
    });

    it('should use default formats when not specified', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (BarcodeScanner.checkPermissions as jest.Mock).mockResolvedValue({
        camera: 'granted'
      });

      render(
        <MobileBarcodeScanner
          isActive={true}
          onScan={mockOnScan}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(BarcodeScanner.startScan).toHaveBeenCalledWith(
          expect.objectContaining({
            formats: expect.arrayContaining([
              BarcodeFormat.Ean13,
              BarcodeFormat.UpcA,
              BarcodeFormat.QrCode
            ])
          })
        );
      });
    });
  });
});
