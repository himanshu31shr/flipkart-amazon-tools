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
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  QrCodeScanner as ScannerIcon,
  Edit as ManualIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import Quagga from 'quagga';
import { BarcodeService } from '../../../services/barcode.service';
import { ScanningResult, BarcodeScanningOptions } from '../../../types/barcode';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess?: (result: ScanningResult) => void;
  onScanError?: (error: string) => void;
  options?: BarcodeScanningOptions;
}

type ScanMode = 'camera' | 'manual';
type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onScanSuccess,
  onScanError,
  options = {}
}) => {
  // State management
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanResult, setScanResult] = useState<ScanningResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Refs
  const scannerRef = useRef<HTMLDivElement>(null);
  const barcodeService = useRef(new BarcodeService());
  const isQuaggaInitialized = useRef(false);

  const {
    cameraTimeout = 30000,
    enableManualEntry = true,
    validateBarcode
  } = options;

  /**
   * Initialize camera and barcode scanner with QuaggaJS
   */
  const initializeCamera = useCallback(async () => {
    if (!scannerRef.current || !open) return;

    // Prevent multiple initialization attempts
    if (isQuaggaInitialized.current) {
      try {
        Quagga.stop();
      } catch (error) {
        console.warn('Error stopping Quagga:', error);
      }
      isQuaggaInitialized.current = false;
    }

    try {
      setScanStatus('scanning');
      setErrorMessage('');

      // Initialize QuaggaJS
      await new Promise<void>((resolve, reject) => {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 640,
              height: 480,
              facingMode: "environment" // Use back camera on mobile
            }
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader"
            ]
          },
          locate: true
        }, (err: Error | null) => {
          if (err) {
            console.error('Quagga initialization failed:', err);
            reject(err);
          } else {
            console.log('Quagga initialized successfully');
            resolve();
          }
        });
      });

      // Set up barcode detection handler
      Quagga.onDetected(async (result) => {
        try {
          const barcodeId = result.codeResult.code;
          console.log('Scanned barcode ID:', barcodeId);
          
          // Validate barcode format if custom validator provided
          if (validateBarcode && !validateBarcode(barcodeId)) {
            console.warn('Custom validation failed for:', barcodeId);
            setErrorMessage('Invalid barcode format');
            return;
          }

          // Lookup barcode in database
          console.log('Looking up barcode:', barcodeId);
          const scanResult = await barcodeService.current.lookupBarcode(barcodeId);
          console.log('Lookup result:', scanResult);
          
          setScanResult(scanResult);
          if (scanResult.success) {
            setScanStatus('success');
            onScanSuccess?.(scanResult);
            // Stop scanning after successful detection
            Quagga.stop();
            isQuaggaInitialized.current = false;
          } else {
            setScanStatus('error');
            setErrorMessage(scanResult.error || 'Failed to scan barcode');
            onScanError?.(scanResult.error || 'Scan failed');
          }
        } catch (error) {
          console.error('Error processing scan:', error);
          const errorMsg = error instanceof Error ? error.message : 'Failed to process scan';
          setErrorMessage(errorMsg);
          setScanStatus('error');
          onScanError?.(errorMsg);
        }
      });

      // Start scanning
      Quagga.start();
      isQuaggaInitialized.current = true;
      setCameraPermission('granted');
      setScanStatus('scanning');

    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraPermission('denied');
      setScanStatus('error');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Camera permission denied. Please enable camera access or use manual entry.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No camera found. Please use manual entry.');
        } else if (error.name === 'AbortError') {
          setErrorMessage('Camera access was interrupted. Please try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Failed to access camera');
      }

      if (enableManualEntry) {
        setScanMode('manual');
      }
    }
  }, [open, cameraTimeout, enableManualEntry, validateBarcode, onScanSuccess, onScanError]);

  /**
   * Handle manual barcode entry
   */
  const handleManualEntry = async () => {
    if (!manualInput.trim()) {
      setErrorMessage('Please enter a barcode ID');
      return;
    }

    try {
      setScanStatus('scanning');
      setErrorMessage('');

      const trimmedInput = manualInput.trim();
      console.log('Manual entry barcode ID:', trimmedInput);

      // Validate barcode format if custom validator provided
      if (validateBarcode && !validateBarcode(trimmedInput)) {
        console.warn('Custom validation failed for manual entry:', trimmedInput);
        setErrorMessage('Invalid barcode format');
        setScanStatus('error');
        return;
      }

      // Lookup barcode in database
      console.log('Looking up manual barcode:', trimmedInput);
      const scanResult = await barcodeService.current.lookupBarcode(trimmedInput);
      console.log('Manual lookup result:', scanResult);
      
      setScanResult(scanResult);
      if (scanResult.success) {
        setScanStatus('success');
        onScanSuccess?.(scanResult);
      } else {
        setScanStatus('error');
        setErrorMessage(scanResult.error || 'Failed to find barcode');
        onScanError?.(scanResult.error || 'Manual entry failed');
      }
    } catch (error) {
      console.error('Error processing manual entry:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process manual entry';
      setErrorMessage(errorMsg);
      setScanStatus('error');
      onScanError?.(errorMsg);
    }
  };

  /**
   * Cleanup camera resources
   */
  const cleanupCamera = useCallback(async () => {
    if (isQuaggaInitialized.current) {
      try {
        Quagga.stop();
        Quagga.offDetected();
        isQuaggaInitialized.current = false;
      } catch (error) {
        console.warn('Error during camera cleanup:', error);
      }
    }
  }, []);

  /**
   * Reset scanner state
   */
  const resetScanner = () => {
    setScanStatus('idle');
    setScanResult(null);
    setErrorMessage('');
    setManualInput('');
  };

  /**
   * Handle modal close
   */
  const handleClose = async () => {
    await cleanupCamera();
    resetScanner();
    onClose();
  };

  /**
   * Switch between camera and manual modes
   */
  const switchMode = async (mode: ScanMode) => {
    if (mode === 'camera') {
      await cleanupCamera();
      resetScanner();
      setScanMode(mode);
    } else {
      await cleanupCamera();
      setScanMode(mode);
      setScanStatus('idle');
    }
  };

  // Initialize camera when component mounts and mode is camera
  useEffect(() => {
    let isMounted = true;

    if (open && scanMode === 'camera' && isMounted) {
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isMounted) {
          initializeCamera();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        isMounted = false;
        cleanupCamera().catch(console.warn);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [open, scanMode, initializeCamera, cleanupCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCamera().catch(console.warn);
    };
  }, [cleanupCamera]);

  const getScanStatusIcon = () => {
    switch (scanStatus) {
      case 'scanning':
        return <CircularProgress size={20} />;
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ScannerIcon />;
    }
  };

  const getScanStatusColor = () => {
    switch (scanStatus) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'scanning':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getScanStatusIcon()}
          <Typography variant="h6" component="h2">
            Barcode Scanner
          </Typography>
          <Chip
            size="small"
            label={scanStatus}
            color={getScanStatusColor()}
            variant="outlined"
          />
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Mode Selection */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant={scanMode === 'camera' ? 'contained' : 'outlined'}
            onClick={() => switchMode('camera')}
            startIcon={<CameraIcon />}
            disabled={cameraPermission === 'denied' || scanStatus === 'scanning'}
          >
            Camera
          </Button>
          {enableManualEntry && (
            <Button
              variant={scanMode === 'manual' ? 'contained' : 'outlined'}
              onClick={() => switchMode('manual')}
              startIcon={<ManualIcon />}
              disabled={scanStatus === 'scanning'}
            >
              Manual Entry
            </Button>
          )}
        </Stack>

        {/* Camera Mode */}
        {scanMode === 'camera' && (
          <Box sx={{ mb: 2 }}>
            <div
              ref={scannerRef}
              style={{
                width: '100%',
                maxHeight: '300px',
                borderRadius: '8px',
                backgroundColor: '#000',
                position: 'relative'
              }}
            />
            {scanStatus === 'scanning' && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                Point your camera at a barcode to scan
              </Typography>
            )}
          </Box>
        )}

        {/* Manual Entry Mode */}
        {scanMode === 'manual' && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Enter Barcode ID"
              placeholder="YYDDDN (e.g., 250051)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualEntry();
                }
              }}
              disabled={scanStatus === 'scanning'}
              helperText="Format: YYDDDN (YY=year, DDD=day of year, N=sequence)"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleManualEntry}
              disabled={scanStatus === 'scanning' || !manualInput.trim()}
              sx={{ mt: 1 }}
            >
              {scanStatus === 'scanning' ? 'Processing...' : 'Scan Barcode'}
            </Button>
          </Box>
        )}

        {/* Error Display */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Success Result Display */}
        {scanResult && scanResult.success && scanResult.orderData && (
          <Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Order Found
            </Typography>
            <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
              <Typography variant="body2">
                <strong>Product:</strong> {scanResult.orderData.productName}
              </Typography>
              <Typography variant="body2">
                <strong>SKU:</strong> {scanResult.orderData.sku || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Quantity:</strong> {scanResult.orderData.quantity}
              </Typography>
              <Typography variant="body2">
                <strong>Platform:</strong> {scanResult.orderData.platform}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {scanResult.orderData.dateDocId}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
        {scanResult && scanResult.success && (
          <Button
            variant="contained"
            color="success"
            onClick={handleClose}
            startIcon={<SuccessIcon />}
          >
            Complete Order
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};