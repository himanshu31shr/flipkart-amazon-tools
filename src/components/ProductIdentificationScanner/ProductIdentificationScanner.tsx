import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  Edit as ManualIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { QuaggaJSResultObject } from 'quagga';
import { ScanningResult } from '../../types/barcode';
import { ScanFeedback } from '../../components/barcode/ScanFeedback';
import { useScanFeedback, useEnhancedCamera } from '../../hooks/barcode';

export interface ProductIdentificationScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess?: (result: ScanningResult) => void;
  onScanError?: (error: string) => void;
  throttleMs?: number; // Optional throttling in milliseconds
}

type ScanMode = 'camera' | 'manual';

/**
 * ProductIdentificationScanner - A dedicated scanner for product identification
 * Unlike EnhancedBarcodeScanner which is for order processing, this is focused
 * solely on identifying products and navigating to their marketplace listings
 */
export const ProductIdentificationScanner: React.FC<ProductIdentificationScannerProps> = ({
  open,
  onClose,
  onScanSuccess,
  onScanError: _onScanError
}) => {
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Ref for camera target
  const scannerRef = useRef<HTMLDivElement>(null);

  // Feedback system for user notifications
  const {
    feedback,
    isVisible: feedbackVisible,
    showError,
    showInfo,
    hideFeedback
  } = useScanFeedback({
    defaultDuration: 3000,
    autoHide: true
  });

  // Camera hook for barcode scanning
  const camera = useEnhancedCamera({
    targetRef: scannerRef,
    timeout: 30000,
    useEnvironmentCamera: true
  });

  /**
   * Handle successful barcode detection from camera
   */
  const handleCameraScan = useCallback((result: QuaggaJSResultObject) => {
    if (isProcessing) {
      return;
    }

    const barcode = result.codeResult.code;
    
    if (!barcode || barcode.length < 4) {
      showError('Invalid barcode detected. Please try again.');
      return;
    }

    setIsProcessing(true);
    showInfo('Product barcode detected!');

    const scanResult: ScanningResult = {
      success: true,
      barcodeId: barcode
    };

    onScanSuccess?.(scanResult);
  }, [isProcessing, onScanSuccess, showError, showInfo]);

  // Camera management - start camera when in camera mode and dialog is open
  useEffect(() => {
    if (open && scanMode === 'camera' && !camera.isActive) {
      const startCameraAsync = async () => {
        try {
          await camera.startCamera();
          camera.setOnDetected(handleCameraScan);
        } catch (error) {
          console.error('ProductIdentificationScanner: Failed to start camera:', error);
          showError('Failed to start camera. Please check permissions.');
        }
      };
      startCameraAsync();
    } else if (!open || scanMode !== 'camera') {
      // Immediate synchronous cleanup
      camera.removeOnDetected();
      
      // Stop media streams immediately
      if (scannerRef.current) {
        const videoElement = scannerRef.current.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
          }
        }
      }
      
      // Then async cleanup
      const stopCameraAsync = async () => {
        try {
          await camera.stopCamera();
        } catch (error) {
          console.warn('ProductIdentificationScanner: Error stopping camera:', error);
        }
      };
      stopCameraAsync();
    }
  }, [open, scanMode, camera, handleCameraScan, showError]);

  // Additional cleanup effect for when component unmounts or dialog closes
  useEffect(() => {
    // Cleanup function that runs when dialog closes or component unmounts
    return () => {
      if (camera.isActive) {
        camera.stopCamera().catch(error => {
          console.warn('ProductIdentificationScanner: Error in cleanup camera stop:', error);
        });
        camera.removeOnDetected();
      }
    };
  }, [camera]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setManualBarcode('');
      setIsProcessing(false);
      setScanMode('camera');
      hideFeedback();
    }
  }, [open, hideFeedback]);


  /**
   * Handle manual barcode entry
   */
  const handleManualScan = useCallback(() => {
    const trimmedBarcode = manualBarcode.trim();
    
    if (!trimmedBarcode) {
      showError('Please enter a barcode');
      return;
    }

    if (trimmedBarcode.length < 4) {
      showError('Barcode must be at least 4 characters long');
      return;
    }

    setIsProcessing(true);
    showInfo('Processing barcode...');

    const scanResult: ScanningResult = {
      success: true,
      barcodeId: trimmedBarcode
    };

    onScanSuccess?.(scanResult);
  }, [manualBarcode, onScanSuccess, showError, showInfo]);

  /**
   * Handle Enter key in manual input
   */
  const handleManualKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleManualScan();
    }
  }, [handleManualScan]);

  /**
   * Handle dialog close
   */
  const handleClose = useCallback(async () => {
    // Immediate camera cleanup - don't wait for async operations
    try {
      // Stop camera synchronously first
      camera.removeOnDetected();
      
      // Immediate stream cleanup
      if (scannerRef.current) {
        const videoElement = scannerRef.current.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
            });
            videoElement.srcObject = null;
          }
        }
      }
      
      // Then do full camera cleanup
      await camera.stopCamera();
    } catch (error) {
      console.warn('ProductIdentificationScanner: Error stopping camera:', error);
    }
    
    setIsProcessing(false);
    hideFeedback();
    onClose();
  }, [camera, onClose, hideFeedback]);

  return (
    <Dialog
      open={open}
      onClose={(_event, _reason) => {
        // Immediate cleanup for any dialog close (backdrop, escape, etc.)
        if (scannerRef.current) {
          const videoElement = scannerRef.current.querySelector('video');
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              videoElement.srcObject = null;
            }
          }
        }
        handleClose();
      }}
      maxWidth="sm"
      fullWidth
      fullScreen={isSmallScreen}
      PaperProps={{
        sx: {
          minHeight: isMobile ? '100vh' : '600px',
          maxHeight: isMobile ? '100vh' : '80vh',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Product Scanner
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={isProcessing}
          aria-label="close"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Stack spacing={3}>
          {/* Scan Mode Toggle */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
              Scanning Method
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant={scanMode === 'camera' ? 'contained' : 'outlined'}
                startIcon={<CameraIcon />}
                onClick={() => setScanMode('camera')}
                disabled={isProcessing || camera.cameraState === 'denied'}
                size={isMobile ? 'small' : 'medium'}
              >
                Camera
              </Button>
              <Button
                variant={scanMode === 'manual' ? 'contained' : 'outlined'}
                startIcon={<ManualIcon />}
                onClick={() => setScanMode('manual')}
                disabled={isProcessing}
                size={isMobile ? 'small' : 'medium'}
              >
                Manual Entry
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Scanner Content */}
          {scanMode === 'camera' ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                Position barcode in camera view
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: isMobile ? '250px' : '300px',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <div
                  ref={scannerRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                />
                {camera.cameraState === 'active' && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      position: 'absolute',
                      bottom: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      bgcolor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1
                    }}
                  >
                    Point camera at barcode to scan
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                Enter Product Barcode
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Barcode / SKU"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={handleManualKeyPress}
                  disabled={isProcessing}
                  placeholder="Enter barcode or SKU..."
                  variant="outlined"
                  autoFocus={scanMode === 'manual'}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleManualScan}
                  disabled={!manualBarcode.trim() || isProcessing}
                  startIcon={<SearchIcon />}
                  size="large"
                >
                  Identify Product
                </Button>
              </Stack>
            </Box>
          )}

          {/* Feedback Display */}
          <ScanFeedback
            feedback={feedback}
            visible={feedbackVisible}
            onHide={hideFeedback}
            sx={{
              mt: 2
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          Scan a product barcode to open its marketplace listing
        </Typography>
        <Button
          onClick={handleClose}
          disabled={isProcessing}
          color="primary"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};