import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, IconButton } from '@mui/material';
import {
  Close as CloseIcon,
  FlashlightOn as FlashOnIcon,
  FlashlightOff as FlashOffIcon,
} from '@mui/icons-material';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

export interface MobileBarcodeScannerProps {
  /** Callback when barcode is successfully scanned */
  onScan: (barcode: string, format: string) => void;

  /** Callback when scanner is closed */
  onClose: () => void;

  /** Whether scanner is currently active */
  isActive: boolean;

  /** Supported barcode formats (defaults to common retail formats) */
  formats?: BarcodeFormat[];

  /** Custom instructions to display */
  instructions?: string;
}

/**
 * Mobile barcode scanner component using Capacitor ML Kit
 *
 * Features:
 * - Native camera access on iOS/Android
 * - Multiple barcode format support (EAN13, UPC, Code128, etc.)
 * - Torch/flashlight toggle
 * - Permission handling
 * - Real-time scanning feedback
 * - Fallback for web (manual input)
 * - Error handling and retry
 *
 * Permissions Required:
 * - iOS: NSCameraUsageDescription in Info.plist
 * - Android: CAMERA permission in AndroidManifest.xml
 *
 * @example
 * ```tsx
 * const [scanning, setScanning] = useState(false);
 *
 * <MobileBarcodeScanner
 *   isActive={scanning}
 *   onScan={(barcode, format) => {
 *     console.log(`Scanned ${format}: ${barcode}`);
 *     setScanning(false);
 *   }}
 *   onClose={() => setScanning(false)}
 * />
 * ```
 */
export const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  onScan,
  onClose,
  isActive,
  formats = [
    BarcodeFormat.Ean13,
    BarcodeFormat.Ean8,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    BarcodeFormat.Code128,
    BarcodeFormat.Code39,
    BarcodeFormat.QrCode,
  ],
  instructions = 'Position barcode within the frame',
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isNative, setIsNative] = useState(false);

  // Check if running on native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Request camera permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (!isActive || !isNative) return;

      try {
        // Check current permission status
        const status = await BarcodeScanner.checkPermissions();

        if (status.camera === 'granted') {
          setHasPermission(true);
          startScanning();
        } else if (status.camera === 'denied') {
          setHasPermission(false);
          setError('Camera permission denied. Please enable in Settings.');
        } else {
          // Request permission
          const requestResult = await BarcodeScanner.requestPermissions();
          if (requestResult.camera === 'granted') {
            setHasPermission(true);
            startScanning();
          } else {
            setHasPermission(false);
            setError('Camera permission is required to scan barcodes.');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to request camera permission');
        setHasPermission(false);
      }
    };

    requestPermissions();

    // Cleanup on unmount or when inactive
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isActive, isNative, isScanning]);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Add listener for barcode detection
      await BarcodeScanner.addListener('barcodesScanned', async (event) => {
        if (event.barcodes && event.barcodes.length > 0) {
          const firstBarcode = event.barcodes[0];
          // Stop scanning after successful scan
          await stopScanning();

          // Notify parent component
          onScan(firstBarcode.rawValue || '', firstBarcode.format || 'UNKNOWN');
        }
      });

      // Start scanning
      await BarcodeScanner.startScan({
        formats: formats,
      });

      // Make webview transparent to show camera
      document.body.classList.add('barcode-scanner-active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scanning');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      await BarcodeScanner.stopScan();
      await BarcodeScanner.removeAllListeners();

      // Restore webview opacity
      document.body.classList.remove('barcode-scanner-active');

      setIsScanning(false);
      setIsTorchOn(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const toggleTorch = async () => {
    try {
      await BarcodeScanner.toggleTorch();
      setIsTorchOn(!isTorchOn);
    } catch {
      setError('Failed to toggle flashlight');
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim(), 'MANUAL');
      setManualInput('');
      onClose();
    }
  };

  const handleClose = async () => {
    if (isScanning) {
      await stopScanning();
    }
    onClose();
  };

  if (!isActive) {
    return null;
  }

  // Web fallback - manual barcode input
  if (!isNative) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h6" color="white" gutterBottom>
          Enter Barcode Manually
        </Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 3 }}>
          Barcode scanning is only available on mobile devices
        </Typography>

        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          placeholder="Enter barcode number"
          autoFocus
          style={{
            width: '100%',
            maxWidth: 300,
            padding: '12px 16px',
            fontSize: '16px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            marginBottom: 16,
          }}
        />

        <Button
          variant="contained"
          onClick={handleManualSubmit}
          disabled={!manualInput.trim()}
          sx={{ minWidth: 120, minHeight: 44 }}
        >
          Submit
        </Button>
      </Box>
    );
  }

  // Native scanner UI overlay
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Controls Bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <Typography variant="h6" color="white">
          Scan Barcode
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white', minWidth: 44, minHeight: 44 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Center scanning frame */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Scanning frame indicator */}
        <Box
          sx={{
            width: 280,
            height: 200,
            border: '2px solid white',
            borderRadius: 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            position: 'relative',
          }}
        >
          {/* Corner markers */}
          {[
            { top: -2, left: -2 },
            { top: -2, right: -2 },
            { bottom: -2, left: -2 },
            { bottom: -2, right: -2 },
          ].map((pos, idx) => (
            <Box
              key={idx}
              sx={{
                position: 'absolute',
                width: 20,
                height: 20,
                borderColor: 'primary.main',
                borderWidth: 4,
                borderStyle: 'solid',
                ...pos,
                ...(pos.top !== undefined && pos.left !== undefined && {
                  borderBottom: 'none',
                  borderRight: 'none',
                }),
                ...(pos.top !== undefined && pos.right !== undefined && {
                  borderBottom: 'none',
                  borderLeft: 'none',
                }),
                ...(pos.bottom !== undefined && pos.left !== undefined && {
                  borderTop: 'none',
                  borderRight: 'none',
                }),
                ...(pos.bottom !== undefined && pos.right !== undefined && {
                  borderTop: 'none',
                  borderLeft: 'none',
                }),
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Bottom Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Instructions */}
        <Typography variant="body2" color="white" textAlign="center">
          {instructions}
        </Typography>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', maxWidth: 400 }}>
            {error}
          </Alert>
        )}

        {/* Permission denied state */}
        {hasPermission === false && (
          <Button
            variant="contained"
            onClick={() => window.open('app-settings:', '_system')}
            sx={{ minHeight: 44 }}
          >
            Open Settings
          </Button>
        )}

        {/* Torch toggle */}
        {isScanning && hasPermission && (
          <IconButton
            onClick={toggleTorch}
            sx={{
              color: 'white',
              backgroundColor: isTorchOn ? 'primary.main' : 'rgba(255,255,255,0.2)',
              minWidth: 56,
              minHeight: 56,
              '&:hover': {
                backgroundColor: isTorchOn ? 'primary.dark' : 'rgba(255,255,255,0.3)',
              },
            }}
          >
            {isTorchOn ? <FlashOnIcon /> : <FlashOffIcon />}
          </IconButton>
        )}

        {/* Loading state */}
        {hasPermission === null && <CircularProgress sx={{ color: 'white' }} />}
      </Box>

      {/* Add CSS for transparent webview */}
      <style>
        {`
          body.barcode-scanner-active {
            background: transparent !important;
          }
          body.barcode-scanner-active ion-app,
          body.barcode-scanner-active #root {
            background: transparent !important;
          }
        `}
      </style>
    </Box>
  );
};

export default MobileBarcodeScanner;
