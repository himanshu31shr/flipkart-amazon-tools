import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EnhancedBarcodeScanner } from '../EnhancedBarcodeScanner';
import { ScanningResult } from '../../../../types/barcode';

// Create mock functions (will be redefined after hoisting)

// Mock the barcode service
jest.mock('../../../../services/barcode.service', () => ({
  BarcodeService: jest.fn().mockImplementation(() => ({
    lookupBarcode: jest.fn().mockResolvedValue({
      success: true,
      barcodeId: 'BC_2024-01-15_001',
      orderData: {
        productName: 'Test Product',
        sku: 'TEST-SKU',
        quantity: 1,
        platform: 'amazon',
        dateDocId: '2024-01-15',
        orderIndex: 0
      }
    })
  }))
}));

// Mock Quagga
jest.mock('quagga', () => ({
  __esModule: true,
  default: {
    init: jest.fn((config, callback) => callback(null)),
    start: jest.fn(),
    stop: jest.fn(),
    onDetected: jest.fn(),
    offDetected: jest.fn()
  },
  QuaggaJSResultObject: {}
}));

// Mock the custom hooks
jest.mock('../../../../hooks/barcode/useScanSession', () => ({
  useScanSession: jest.fn()
}));

jest.mock('../../../../hooks/barcode/useScanThrottling', () => ({
  useScanThrottling: () => ({
    isThrottled: jest.fn().mockReturnValue(false),
    registerScan: jest.fn().mockReturnValue({
      firstScanAt: Date.now(),
      lastAttemptAt: Date.now(),
      attemptCount: 1,
      isThrottled: false
    }),
    getThrottleInfo: jest.fn(),
    getThrottledBarcodes: jest.fn().mockReturnValue(new Map()),
    getTotalDuplicateAttempts: jest.fn().mockReturnValue(0),
    clearBarcode: jest.fn(),
    clearAll: jest.fn(),
    getCacheSize: jest.fn().mockReturnValue(0),
    getConfig: jest.fn().mockReturnValue({ throttleDuration: 3000, maxCacheSize: 100 })
  })
}));

jest.mock('../../../../hooks/barcode/useScanFeedback', () => ({
  useScanFeedback: () => ({
    feedback: {
      state: 'idle',
      message: '',
      duration: 2000,
      autoHide: true,
      severity: 'info'
    },
    isVisible: false,
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showThrottled: jest.fn(),
    showDuplicate: jest.fn(),
    hideFeedback: jest.fn(),
    resetToIdle: jest.fn()
  })
}));

jest.mock('../../../../hooks/barcode/useResponsiveScanner', () => ({
  useResponsiveScanner: jest.fn()
}));

jest.mock('../../../../hooks/barcode/useEnhancedCamera', () => ({
  useEnhancedCamera: jest.fn()
}));

// Mock components to avoid complex rendering
jest.mock('../../../../components/barcode/ResponsiveDrawer', () => ({
  ResponsiveDrawer: ({ children, open, onClose }: any) => 
    open ? <div data-testid="responsive-drawer">{children}</div> : null
}));

jest.mock('../../../../components/barcode/SessionHistory', () => ({
  SessionHistory: () => <div data-testid="session-history">Session History</div>
}));

jest.mock('../../../../components/barcode/ScanFeedback', () => ({
  ScanFeedback: ({ visible, feedback }: any) => 
    visible ? <div data-testid="scan-feedback">{feedback.message}</div> : null
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedBarcodeScanner', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onScanSuccess: jest.fn(),
    onScanError: jest.fn()
  };

  // Get the mocked functions
  const mockUseScanSession = jest.requireMock('../../../../hooks/barcode/useScanSession').useScanSession;
  const mockUseEnhancedCamera = jest.requireMock('../../../../hooks/barcode/useEnhancedCamera').useEnhancedCamera;
  const mockUseResponsiveScanner = jest.requireMock('../../../../hooks/barcode/useResponsiveScanner').useResponsiveScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset to default mock implementations
    mockUseScanSession.mockReturnValue({
      session: null,
      isActive: false,
      scanHistory: [],
      statistics: null,
      startSession: jest.fn(),
      endSession: jest.fn(),
      addScan: jest.fn(),
      addThrottledBarcode: jest.fn(),
      resetSession: jest.fn(),
      wasBarcodeScanned: jest.fn().mockReturnValue(false),
      getUniqueScannedBarcodes: jest.fn().mockReturnValue(new Set()),
      exportSessionData: jest.fn().mockReturnValue(null)
    });

    mockUseEnhancedCamera.mockReturnValue({
      cameraState: 'idle',
      cameraError: null,
      isActive: false,
      hasPermission: false,
      startCamera: jest.fn(),
      stopCamera: jest.fn().mockResolvedValue(undefined),
      restartCamera: jest.fn(),
      setOnDetected: jest.fn(),
      removeOnDetected: jest.fn(),
      getRetryCount: jest.fn().mockReturnValue(0),
      resetRetryCount: jest.fn()
    });

    mockUseResponsiveScanner.mockReturnValue({
      isMobile: false,
      useDrawer: false,
      useDialog: true,
      fullScreenMobile: false,
      autoHeight: true,
      config: {
        mobileBreakpoint: 768,
        useDrawerOnMobile: true,
        useDialogOnDesktop: true,
        fullScreenMobile: true,
        autoHeight: true
      },
      forceMobile: jest.fn(),
      resetResponsive: jest.fn()
    });
  });

  it('should render scanner when open', () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    expect(screen.getByText('Barcode Scanner')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-drawer')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    renderWithTheme(
      <EnhancedBarcodeScanner {...defaultProps} open={false} />
    );

    expect(screen.queryByTestId('responsive-drawer')).not.toBeInTheDocument();
  });

  it('should show scanner tab by default', () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    expect(screen.getByRole('tab', { name: /scanner/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch between tabs', async () => {
    // Mock session with statistics to ensure stats tab works
    const mockSessionWithStats = {
      session: {
        sessionId: 'test-session',
        isActive: true,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        scanHistory: [],
        statistics: {
          totalScanned: 3,
          successfulScans: 2,
          failedScans: 1,
          duplicateAttempts: 0,
          sessionStarted: new Date().toISOString(),
          sessionDuration: 30000,
          averageScanInterval: 10000
        },
        throttledBarcodes: new Map()
      },
      isActive: true,
      scanHistory: [],
      statistics: {
        totalScanned: 3,
        successfulScans: 2,
        failedScans: 1,
        duplicateAttempts: 0,
        sessionStarted: new Date().toISOString(),
        sessionDuration: 30000,
        averageScanInterval: 10000
      },
      startSession: jest.fn(),
      endSession: jest.fn(),
      addScan: jest.fn(),
      addThrottledBarcode: jest.fn(),
      resetSession: jest.fn(),
      wasBarcodeScanned: jest.fn().mockReturnValue(false),
      getUniqueScannedBarcodes: jest.fn().mockReturnValue(new Set()),
      exportSessionData: jest.fn().mockReturnValue(null)
    };

    mockUseScanSession.mockReturnValue(mockSessionWithStats);

    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Click on History tab
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /history/i }));
    });
    expect(screen.getByTestId('session-history')).toBeInTheDocument();

    // Click on Stats tab
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /stats/i }));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Session Statistics')).toBeInTheDocument();
    });

    // Click back to Scanner tab
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /scanner/i }));
    });
    // Scanner content should be visible (Camera/Manual buttons)
    expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument();
  });

  it('should show camera and manual mode buttons', () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
  });

  it('should switch between camera and manual modes', async () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Switch to manual mode
    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/enter barcode id/i)).toBeInTheDocument();
    });

    // Switch back to camera mode
    fireEvent.click(screen.getByRole('button', { name: /camera/i }));
    
    // Camera view should be shown
    expect(screen.queryByLabelText(/enter barcode id/i)).not.toBeInTheDocument();
  });

  it('should handle manual barcode entry', async () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Switch to manual mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/enter barcode id/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/enter barcode id/i);
    const scanButton = screen.getByRole('button', { name: /scan barcode/i });

    // Enter barcode
    await act(async () => {
      fireEvent.change(input, { target: { value: 'BC_2024-01-15_001' } });
      fireEvent.click(scanButton);
    });

    // Should process the barcode
    await waitFor(() => {
      expect(defaultProps.onScanSuccess).toHaveBeenCalled();
    });
  });

  it('should handle enter key in manual input', async () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Switch to manual mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/enter barcode id/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/enter barcode id/i);

    // Enter barcode and press Enter
    await act(async () => {
      fireEvent.change(input, { target: { value: 'BC_2024-01-15_001' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    // Should process the barcode
    await waitFor(() => {
      expect(defaultProps.onScanSuccess).toHaveBeenCalled();
    });
  });

  it('should disable scan button when input is empty', async () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Switch to manual mode
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/enter barcode id/i)).toBeInTheDocument();
    });

    const scanButton = screen.getByRole('button', { name: /scan barcode/i });
    expect(scanButton).toBeDisabled();
  });

  it('should call onClose when close button is clicked', async () => {
    const onCloseMock = jest.fn();
    const testProps = { ...defaultProps, onClose: onCloseMock };
    
    // Ensure camera.stopCamera resolves immediately for the test
    mockUseEnhancedCamera.mockReturnValue({
      cameraState: 'idle',
      cameraError: null,
      isActive: false,
      hasPermission: false,
      startCamera: jest.fn(),
      stopCamera: jest.fn().mockResolvedValue(undefined),
      restartCamera: jest.fn(),
      setOnDetected: jest.fn(),
      removeOnDetected: jest.fn(),
      getRetryCount: jest.fn().mockReturnValue(0),
      resetRetryCount: jest.fn()
    });
    
    renderWithTheme(<EnhancedBarcodeScanner {...testProps} />);

    // The close button is in the header with CloseIcon
    const closeButton = screen.getByTestId('CloseIcon').closest('button');
    
    await act(async () => {
      fireEvent.click(closeButton!);
    });
    
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('should call onClose when complete session button is clicked', async () => {
    const onCloseMock = jest.fn();
    const testProps = { ...defaultProps, onClose: onCloseMock };
    
    // Ensure camera.stopCamera resolves immediately for the test
    mockUseEnhancedCamera.mockReturnValue({
      cameraState: 'idle',
      cameraError: null,
      isActive: false,
      hasPermission: false,
      startCamera: jest.fn(),
      stopCamera: jest.fn().mockResolvedValue(undefined),
      restartCamera: jest.fn(),
      setOnDetected: jest.fn(),
      removeOnDetected: jest.fn(),
      getRetryCount: jest.fn().mockReturnValue(0),
      resetRetryCount: jest.fn()
    });
    
    renderWithTheme(<EnhancedBarcodeScanner {...testProps} />);

    // The close button in the footer area (this button closes the scanner)
    const closeButton = screen.getByRole('button', { name: /close/i });
    
    await act(async () => {
      fireEvent.click(closeButton);
    });
    
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('should show scan count in header when session is active', () => {
    // Mock active session before rendering
    mockUseScanSession.mockReturnValueOnce({
      session: {
        sessionId: 'test-session',
        isActive: true,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        scanHistory: [],
        statistics: {
          totalScanned: 5,
          successfulScans: 4,
          failedScans: 1,
          duplicateAttempts: 0,
          sessionStarted: new Date().toISOString(),
          sessionDuration: 60000,
          averageScanInterval: 15000
        },
        throttledBarcodes: new Map()
      },
      isActive: true,
      scanHistory: [],
      statistics: {
        totalScanned: 5,
        successfulScans: 4,
        failedScans: 1,
        duplicateAttempts: 0,
        sessionStarted: new Date().toISOString(),
        sessionDuration: 60000,
        averageScanInterval: 15000
      },
      startSession: jest.fn(),
      endSession: jest.fn(),
      addScan: jest.fn(),
      addThrottledBarcode: jest.fn(),
      resetSession: jest.fn(),
      wasBarcodeScanned: jest.fn().mockReturnValue(false),
      getUniqueScannedBarcodes: jest.fn().mockReturnValue(new Set()),
      exportSessionData: jest.fn().mockReturnValue(null)
    });

    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    expect(screen.getByText('5 scanned')).toBeInTheDocument();
  });

  it('should handle options prop', () => {
    const options = {
      throttleDuration: 5000,
      feedbackDuration: 3000,
      enableManualEntry: false
    };

    renderWithTheme(
      <EnhancedBarcodeScanner {...defaultProps} options={options} />
    );

    // Manual entry button should not be shown
    expect(screen.queryByRole('button', { name: /manual/i })).not.toBeInTheDocument();
  });

  it('should show camera area in camera mode', () => {
    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Should have a div for camera (scanner ref) with black background
    const cameraArea = document.querySelector('div[style*="background-color: rgb(0, 0, 0)"]') || 
                      document.querySelector('div[style*="backgroundColor: rgb(0, 0, 0)"]') ||
                      document.querySelector('div[style*="#000"]');
    expect(cameraArea).toBeInTheDocument();
  });

  it('should handle responsive behavior', () => {
    // Mock mobile responsive hook
    mockUseResponsiveScanner.mockReturnValue({
      isMobile: true,
      useDrawer: true,
      useDialog: false,
      fullScreenMobile: true,
      autoHeight: true,
      config: {
        mobileBreakpoint: 768,
        useDrawerOnMobile: true,
        useDialogOnDesktop: true,
        fullScreenMobile: true,
        autoHeight: true
      },
      forceMobile: jest.fn(),
      resetResponsive: jest.fn()
    });

    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Should render with responsive behavior
    expect(screen.getByTestId('responsive-drawer')).toBeInTheDocument();
  });

  it('should show session statistics in stats tab', async () => {
    // Mock session with statistics
    const mockSessionWithStats = {
      session: {
        sessionId: 'test-session',
        isActive: true,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        scanHistory: [],
        statistics: {
          totalScanned: 10,
          successfulScans: 8,
          failedScans: 2,
          duplicateAttempts: 1,
          sessionStarted: new Date().toISOString(),
          sessionDuration: 120000,
          averageScanInterval: 12000
        },
        throttledBarcodes: new Map()
      },
      isActive: true,
      scanHistory: [],
      statistics: {
        totalScanned: 10,
        successfulScans: 8,
        failedScans: 2,
        duplicateAttempts: 1,
        sessionStarted: new Date().toISOString(),
        sessionDuration: 120000,
        averageScanInterval: 12000
      },
      startSession: jest.fn(),
      endSession: jest.fn(),
      addScan: jest.fn(),
      addThrottledBarcode: jest.fn(),
      resetSession: jest.fn(),
      wasBarcodeScanned: jest.fn().mockReturnValue(false),
      getUniqueScannedBarcodes: jest.fn().mockReturnValue(new Set()),
      exportSessionData: jest.fn().mockReturnValue(null)
    };

    mockUseScanSession.mockReturnValue(mockSessionWithStats);

    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Click on Stats tab and wait for content to change
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /stats/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Session Statistics')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/session duration/i)).toBeInTheDocument();
    expect(screen.getByText(/total scanned/i)).toBeInTheDocument();
    expect(screen.getByText(/success rate/i)).toBeInTheDocument();
  });

  it('should handle camera state changes', () => {
    // Mock camera denied state
    mockUseEnhancedCamera.mockReturnValue({
      cameraState: 'denied',
      cameraError: null,
      isActive: false,
      hasPermission: false,
      startCamera: jest.fn(),
      stopCamera: jest.fn(),
      restartCamera: jest.fn(),
      setOnDetected: jest.fn(),
      removeOnDetected: jest.fn(),
      getRetryCount: jest.fn().mockReturnValue(0),
      resetRetryCount: jest.fn()
    });

    renderWithTheme(<EnhancedBarcodeScanner {...defaultProps} />);

    // Camera button should be disabled
    expect(screen.getByRole('button', { name: /camera/i })).toBeDisabled();
  });
});