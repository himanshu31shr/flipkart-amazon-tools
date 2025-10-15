import React, { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { IconButton, Tooltip, Box, useMediaQuery, useTheme, CircularProgress, Alert, Snackbar } from '@mui/material';
import { QrCodeScanner as ScannerIcon } from '@mui/icons-material';
import { fetchProducts } from '../../store/slices/productsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

// Lazy load the product identification scanner component to improve initial bundle size
const ProductIdentificationScanner = lazy(() => 
  import('../ProductIdentificationScanner').then(module => ({
    default: module.ProductIdentificationScanner
  }))
);
import { BarcodeService } from '../../services/barcode.service';
import { ProductNavigationService } from '../../services/productNavigation.service';
import { Product } from '../../services/product.service';
import { ScanningResult } from '../../types/barcode';
import { BarcodeScannerButtonProps } from './types';
import { ScanFeedback } from '../../components/barcode/ScanFeedback';
import { useScanFeedback } from '../../hooks/barcode/useScanFeedback';

/**
 * Global navigation barcode scanner button component
 * Provides instant product identification and marketplace navigation
 */
export const BarcodeScannerButton: React.FC<BarcodeScannerButtonProps> = ({
  className,
  disabled = false,
  onScanSuccess,
  onScanError,
}) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('error');
  const [isNavigating, setIsNavigating] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux setup
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products.items);
  const productsLoading = useAppSelector((state) => state.products.loading);

  // Memoize service instances to prevent unnecessary re-creation on each render
  const barcodeService = useMemo(() => new BarcodeService(), []);
  const navigationService = useMemo(() => new ProductNavigationService(), []);

  // Throttling state
  const lastScanTimeRef = useRef<number>(0);
  const SCAN_THROTTLE_MS = 2000; // 2 seconds

  // Initialize feedback system with memoized config to prevent unnecessary re-renders
  const feedbackConfig = useMemo(() => ({
    defaultDuration: 3000,
    autoHide: true
  }), []);

  const {
    feedback,
    isVisible: feedbackVisible,
    showSuccess,
    showError,
    showInfo,
    hideFeedback
  } = useScanFeedback(feedbackConfig);

  /**
   * Ref to store announcement timeout for cleanup
   */
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Show alert with auto-dismiss
   */
  const showAlert = useCallback((message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  }, []);

  /**
   * Close alert
   */
  const handleAlertClose = useCallback(() => {
    setAlertOpen(false);
  }, []);

  /**
   * Announce message to screen readers with proper timeout cleanup
   */
  const announceToScreenReader = useCallback((message: string) => {
    // Clear any existing timeout
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    
    setAnnouncement(message);
    // Clear after a delay to allow screen readers to announce
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement('');
      announcementTimeoutRef.current = null;
    }, 1000);
  }, []);

  /**
   * Check if scan should be throttled
   */
  const shouldThrottleScan = useCallback(() => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    if (timeSinceLastScan < SCAN_THROTTLE_MS) {
      const remainingTime = Math.ceil((SCAN_THROTTLE_MS - timeSinceLastScan) / 1000);
      showAlert(`Please wait ${remainingTime} seconds before scanning again`, 'warning');
      return true;
    }
    lastScanTimeRef.current = now;
    return false;
  }, [showAlert, SCAN_THROTTLE_MS]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);


  /**
   * Handle successful barcode scan with product lookup and navigation
   */
  const handleScanSuccess = useCallback(async (result: ScanningResult) => {
    // Prevent duplicate navigation attempts
    if (isNavigating) {
      return;
    }
    
    // Check throttling first
    if (shouldThrottleScan()) {
      return;
    }
    
    if (!result.success || !result.barcodeId) {
      showError('Invalid scan result - please try again');
      showAlert('Invalid scan result - please try again', 'error');
      onScanError?.('Invalid scan result');
      return;
    }

    setIsProcessing(true);
    setIsNavigating(true);
    showInfo('Looking up product...');
    announceToScreenReader('Looking up product information');

    try {
      // Strategy 1: Try to find product by SKU using Redux store
      let product: Product | null = null;
      
      product = products.find((p: Product) => 
        p.sku === result.barcodeId || 
        p.sku.toLowerCase() === result.barcodeId?.toLowerCase() ||
        // Also check if barcode matches any metadata fields that might contain barcodes
        p.metadata?.amazonSerialNumber === result.barcodeId ||
        p.metadata?.flipkartSerialNumber === result.barcodeId
      ) || null;

      // Strategy 2: If no direct product match, try looking up in barcode orders
      if (!product) {
        showInfo('Checking order history...');
        announceToScreenReader('Product not found in catalog, checking order history');
        try {
          // Use the dedicated product identification method that works with completed orders
          const productIdResult = await barcodeService.lookupBarcodeForProductIdentification(result.barcodeId);
          
          if (productIdResult.success && productIdResult.sku) {
            // Try to find product by SKU using Redux store
            product = products.find((p: Product) => p.sku === productIdResult.sku) || null;
          }
        } catch {
          // Don't show error here, just continue to product not found
        }
      }

      if (!product) {
        const errorMsg = `Product not found for barcode: ${result.barcodeId}`;
        showError(errorMsg, 4000);
        showAlert(errorMsg, 'error');
        announceToScreenReader('Product not found. Please try scanning a different barcode.');
        onScanError?.('Product not found for this barcode');
        return;
      }

      // Check if product has marketplace listings
      if (!navigationService.hasMarketplaceListing(product)) {
        const errorMsg = `Product "${product.name}" found but no marketplace listing available`;
        showError(errorMsg, 4000);
        showAlert(errorMsg, 'warning');
        announceToScreenReader(`Product ${product.name} found, but no marketplace listing is available`);
        onScanError?.('Product found but no marketplace listing available');
        return;
      }

      showInfo('Opening marketplace listing...');
      announceToScreenReader(`Product ${product.name} found. Opening marketplace listing.`);
      
      // Navigate to product marketplace listing
      await navigationService.navigateToProduct(product);
      
      // Show success feedback with product details
      const platform = navigationService.getProductPlatform(product);
      const successMsg = `Successfully opened ${product.name} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
      showSuccess(successMsg, 2000);
      showAlert(successMsg, 'success');
      announceToScreenReader(`Successfully opened ${product.name} on ${platform}`);
      
      // Close scanner modal on successful navigation
      setScannerOpen(false);
      
      // Notify parent component of successful scan
      onScanSuccess?.(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process barcode';
      showError(`Navigation failed: ${errorMessage}`, 4000);
      showAlert(`Navigation failed: ${errorMessage}`, 'error');
      announceToScreenReader(`Navigation failed: ${errorMessage}`);
      onScanError?.(errorMessage);
    } finally {
      setIsProcessing(false);
      setIsNavigating(false);
    }
  }, [navigationService, barcodeService, onScanSuccess, onScanError, showSuccess, showError, showInfo, announceToScreenReader, shouldThrottleScan, products, showAlert, isNavigating]);

  /**
   * Handle barcode scanning errors
   */
  const handleScanError = useCallback((error: string) => {
    console.error('Barcode scanning error:', error);
    showError(error, 4000);
    announceToScreenReader(`Scanning error: ${error}`);
    onScanError?.(error);
  }, [onScanError, showError, announceToScreenReader]);

  /**
   * Open scanner modal and fetch products if not already loaded
   */
  const handleScannerOpen = useCallback(() => {
    if (!disabled && !isProcessing) {
      setScannerOpen(true);
      announceToScreenReader('Barcode scanner opened. Position a barcode in front of your camera or enter it manually.');
      
      // Fetch products if not already loaded or if data is stale
      if (products.length === 0 && !productsLoading) {
        dispatch(fetchProducts({}));
      }
    }
  }, [disabled, isProcessing, announceToScreenReader, products.length, productsLoading, dispatch]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Allow activation with Enter or Space keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleScannerOpen();
    }
    // Escape key closes scanner if open
    if (event.key === 'Escape' && scannerOpen) {
      event.preventDefault();
      setScannerOpen(false);
      announceToScreenReader('Barcode scanner closed');
    }
  }, [handleScannerOpen, scannerOpen]);

  /**
   * Close scanner modal
   */
  const handleScannerClose = useCallback(() => {
    setScannerOpen(false);
    setIsProcessing(false);
    setIsNavigating(false);
    hideFeedback(); // Clear any active feedback when closing
    announceToScreenReader('Barcode scanner closed');
  }, [hideFeedback, announceToScreenReader]);

  return (
    <>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {announcement}
      </div>

      <Box sx={{ position: 'relative' }}>
        <Tooltip 
          title={isSmallScreen ? "" : "Scan Product Barcode"} 
          arrow
          // Disable tooltip on small screens to avoid covering content
          disableHoverListener={isSmallScreen}
          disableFocusListener={isSmallScreen}
          // Hide tooltip when button is disabled to prevent warnings
          slotProps={{
            tooltip: {
              sx: (disabled || isProcessing) ? { display: 'none' } : {}
            }
          }}
        >
          <span style={{ display: 'inline-block' }}>
            <IconButton
              color="inherit"
              onClick={handleScannerOpen}
              onKeyDown={handleKeyDown}
              disabled={disabled || isProcessing}
              className={className}
              aria-label={
                isProcessing 
                  ? "Processing barcode scan, please wait" 
                  : "Scan product barcode to open marketplace listing"
              }
              aria-describedby={feedbackVisible ? "scanner-feedback" : undefined}
              aria-expanded={scannerOpen}
              aria-haspopup="dialog"
              size={isMobile ? "medium" : "large"}
              // Enhanced focus visibility for accessibility
              sx={{
                minWidth: isMobile ? 44 : 'auto',
                minHeight: isMobile ? 44 : 'auto',
                // Improved focus indicator
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                },
                // Add subtle visual feedback for touch
                ...(isMobile && {
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.1s',
                  },
                }),
              }}
            >
              <ScannerIcon fontSize={isMobile ? "medium" : "large"} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Responsive feedback positioning */}
        <div id="scanner-feedback">
          <ScanFeedback
            feedback={feedback}
            visible={feedbackVisible}
            asSnackbar={isMobile}
            snackbarPosition={
              isMobile 
                ? { vertical: 'top', horizontal: 'center' }
                : undefined
            }
            onHide={hideFeedback}
            sx={!isMobile ? {
              position: 'absolute',
              top: '100%',
              right: 0,
              mt: 1,
              minWidth: isSmallScreen ? 250 : 300,
              maxWidth: isSmallScreen ? 300 : 400,
              zIndex: 9999,
            } : {}}
          />
        </div>
      </Box>

      {/* Lazy-loaded scanner component with loading fallback */}
      {scannerOpen && (
        <Suspense fallback={
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
            }}
          >
            <CircularProgress />
          </Box>
        }>
          <ProductIdentificationScanner
            open={scannerOpen}
            onClose={handleScannerClose}
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            throttleMs={SCAN_THROTTLE_MS}
          />
        </Suspense>
      )}

      {/* Alert Snackbar */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleAlertClose} 
          severity={alertSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </>
  );
};