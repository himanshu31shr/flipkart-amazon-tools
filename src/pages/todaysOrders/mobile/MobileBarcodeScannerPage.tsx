import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Alert, Snackbar } from '@mui/material';
import { useDispatch } from 'react-redux';
import { MobileBarcodeScanner } from '../../../components/mobile/MobileBarcodeScanner';
import { completeOrderByBarcode } from '../../../store/slices/ordersSlice';
import { AppDispatch } from '../../../store';

/**
 * Mobile barcode scanner page for completing orders
 *
 * Features:
 * - Full-screen native camera scanner
 * - Automatic order completion on successful scan
 * - Visual feedback with snackbar notifications
 * - Auto-navigation back to orders page after scan
 * - Error handling for invalid barcodes
 *
 * Flow:
 * 1. User clicks scanner FAB on orders page
 * 2. Navigates to /todays-orders/scanner
 * 3. Camera opens with native preview
 * 4. User scans barcode
 * 5. Order marked as complete in Redux
 * 6. Success message displayed
 * 7. Auto-navigate back to orders page
 *
 * @example
 * // Route configuration:
 * <Route path="/todays-orders/scanner" element={<MobileBarcodeScannerPage />} />
 */
export const MobileBarcodeScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle successful barcode scan
   * Dispatches action to complete order and navigates back
   */
  const handleScan = async (barcode: string, _format: string) => {
    try {
      // Dispatch Redux action to complete order by barcode
      await dispatch(completeOrderByBarcode({ barcodeId: barcode })).unwrap();

      // Show success message
      setSuccessMessage(`Order completed! Barcode: ${barcode}`);

      // Navigate back to orders page after short delay
      setTimeout(() => {
        navigate('/todays-orders');
      }, 1500);
    } catch (error) {
      // Handle error (barcode not found, network error, etc.)
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete order';
      setErrorMessage(errorMsg);
    }
  };

  /**
   * Handle scanner close
   * Navigates back to orders page without completing an order
   */
  const handleClose = () => {
    navigate('/todays-orders');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#000',
      }}
    >
      {/* Mobile barcode scanner component */}
      <MobileBarcodeScanner
        isActive={true}
        onScan={handleScan}
        onClose={handleClose}
        instructions="Position order barcode within the frame"
      />

      {/* Success notification */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error notification */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
