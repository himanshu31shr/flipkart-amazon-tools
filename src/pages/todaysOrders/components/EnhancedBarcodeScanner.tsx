import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  Divider,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  QrCodeScanner as ScannerIcon,
  Edit as ManualIcon,
  CheckCircle as SuccessIcon,
  History as HistoryIcon,
  Analytics as StatsIcon,
} from "@mui/icons-material";
import { QuaggaJSResultObject } from "quagga";
import { BarcodeService } from "../../../services/barcode.service";
import {
  ScanningResult,
  EnhancedBarcodeScanningOptions,
} from "../../../types/barcode";

// Import our new components and hooks
import {
  ResponsiveDrawer,
  SessionHistory,
  ScanFeedback,
} from "../../../components/barcode";
import {
  useScanSession,
  useScanThrottling,
  useScanFeedback,
  useResponsiveScanner,
  useEnhancedCamera,
} from "../../../hooks/barcode";

interface EnhancedBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess?: (result: ScanningResult) => void;
  onScanError?: (error: string) => void;
  options?: EnhancedBarcodeScanningOptions;
}

type ScanMode = "camera" | "manual";
type TabValue = "scanner" | "history" | "stats";

// Define default configs outside component to prevent re-creation
const DEFAULT_RESPONSIVE_CONFIG = {};

export const EnhancedBarcodeScanner: React.FC<EnhancedBarcodeScannerProps> = ({
  open,
  onClose,
  onScanSuccess,
  onScanError,
  options = {},
}) => {
  // Enhanced options with defaults
  const {
    throttleDuration = 3000,
    maxThrottleCache = 100,
    feedbackDuration = 2000,
    persistSession = true,
    responsiveConfig = DEFAULT_RESPONSIVE_CONFIG,
    cameraTimeout = 30000,
    enableManualEntry = true,
    validateBarcode,
  } = options;

  // State management
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [manualInput, setManualInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("scanner");

  // Refs
  const scannerRef = useRef<HTMLDivElement>(null);
  const barcodeService = useRef(new BarcodeService());

  // Memoize config objects to prevent recreating on every render
  const stableResponsiveConfig = useMemo(
    () => responsiveConfig,
    [responsiveConfig]
  );
  const stableThrottlingConfig = useMemo(
    () => ({ throttleDuration, maxCacheSize: maxThrottleCache }),
    [throttleDuration, maxThrottleCache]
  );
  const stableFeedbackConfig = useMemo(
    () => ({ defaultDuration: feedbackDuration }),
    [feedbackDuration]
  );
  const stableCameraConfig = useMemo(
    () => ({
      targetRef: scannerRef,
      timeout: cameraTimeout,
      useEnvironmentCamera: true,
    }),
    [cameraTimeout]
  );

  // Custom hooks
  const responsive = useResponsiveScanner({
    responsiveConfig: stableResponsiveConfig,
  });
  const session = useScanSession();
  const throttling = useScanThrottling(stableThrottlingConfig);
  const feedback = useScanFeedback(stableFeedbackConfig);
  const camera = useEnhancedCamera(stableCameraConfig);

  // Refs for stable callback access
  const throttlingRef = useRef(throttling);
  const feedbackRef = useRef(feedback);
  const sessionRef = useRef(session);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const validateBarcodeRef = useRef(validateBarcode);

  // Update refs when dependencies change
  useEffect(() => {
    throttlingRef.current = throttling;
    feedbackRef.current = feedback;
    sessionRef.current = session;
    onScanSuccessRef.current = onScanSuccess;
    onScanErrorRef.current = onScanError;
    validateBarcodeRef.current = validateBarcode;
  });

  // Create a single persistent callback that never changes identity
  const persistentCallback = useRef((result: QuaggaJSResultObject) => {
    // This will always point to the latest version of the function
    handleBarcodeDetected(result);
  });

  // The callback reference that never changes
  const stableCallback = persistentCallback.current;

  /**
   * Start session when scanner opens
   */
  useEffect(() => {
    if (open && !session.isActive) {
      session.startSession();
    }
  }, [open, session]);

  /**
   * Handle barcode detection from camera
   * Using refs to create a stable callback that doesn't cause re-renders
   */
  const handleBarcodeDetected = useCallback(
    async (result: QuaggaJSResultObject) => {
      const barcodeId = result.codeResult.code;

      try {
        // Check throttling first
        const throttleEntry = throttlingRef.current.registerScan(barcodeId);

        if (throttleEntry.isThrottled && throttleEntry.attemptCount > 1) {
          feedbackRef.current.showThrottled(
            `Already scanned recently (${throttleEntry.attemptCount} attempts)`
          );
          sessionRef.current.addThrottledBarcode(barcodeId, Date.now());
          return;
        }

        // Custom validation if provided
        if (
          validateBarcodeRef.current &&
          !validateBarcodeRef.current(barcodeId)
        ) {
          feedbackRef.current.showError("Invalid barcode format");
          const errorResult: ScanningResult = {
            success: false,
            error: "Invalid barcode format",
            errorType: "INVALID_BARCODE",
          };
          sessionRef.current.addScan(barcodeId, errorResult, true);
          return;
        }

        // Show scanning feedback
        feedbackRef.current.showInfo("Processing barcode...");

        // Lookup barcode in database
        const scanResult = await barcodeService.current.lookupBarcode(
          barcodeId
        );

        // Add to session
        sessionRef.current.addScan(barcodeId, scanResult, true);

        if (scanResult.success) {
          feedbackRef.current.showSuccess("Barcode scanned successfully!");
          onScanSuccessRef.current?.(scanResult);
        } else {
          feedbackRef.current.showError(
            scanResult.error || "Failed to scan barcode"
          );
          onScanErrorRef.current?.(scanResult.error || "Scan failed");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to process scan";

        feedbackRef.current.showError(errorMsg);

        const errorResult: ScanningResult = {
          success: false,
          error: errorMsg,
          errorType: "NETWORK_ERROR",
        };
        sessionRef.current.addScan(barcodeId, errorResult, true);
        onScanErrorRef.current?.(errorMsg);
      }
    },
    []
  ); // Empty dependency array to prevent re-creation

  /**
   * Handle manual barcode entry
   */
  const handleManualEntry = async () => {
    if (!manualInput.trim()) {
      feedback.showError("Please enter a barcode ID");
      return;
    }

    const barcodeId = manualInput.trim();

    try {
      // Check throttling
      const throttleEntry = throttling.registerScan(barcodeId);

      if (throttleEntry.isThrottled && throttleEntry.attemptCount > 1) {
        feedback.showThrottled(
          `Already scanned recently (${throttleEntry.attemptCount} attempts)`
        );
        session.addThrottledBarcode(barcodeId, Date.now());
        return;
      }

      // Custom validation if provided
      if (validateBarcode && !validateBarcode(barcodeId)) {
        feedback.showError("Invalid barcode format");
        const errorResult: ScanningResult = {
          success: false,
          error: "Invalid barcode format",
          errorType: "INVALID_BARCODE",
        };
        session.addScan(barcodeId, errorResult, true);
        return;
      }

      feedback.showInfo("Processing barcode...");

      // Lookup barcode
      const scanResult = await barcodeService.current.lookupBarcode(barcodeId);
      session.addScan(barcodeId, scanResult, true);

      if (scanResult.success) {
        feedback.showSuccess("Barcode processed successfully!");
        onScanSuccess?.(scanResult);
        setManualInput(""); // Clear input on success
      } else {
        feedback.showError(scanResult.error || "Failed to find barcode");
        onScanError?.(scanResult.error || "Manual entry failed");
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to process manual entry";

      feedback.showError(errorMsg);

      const errorResult: ScanningResult = {
        success: false,
        error: errorMsg,
        errorType: "NETWORK_ERROR",
      };
      session.addScan(barcodeId, errorResult, true);
      onScanError?.(errorMsg);
    }
  };

  // Track if camera has been initialized to prevent multiple inits
  const cameraInitializedRef = useRef(false);
  const lastScanModeRef = useRef<ScanMode>("camera");
  const lastOpenStateRef = useRef(false);

  /**
   * Initialize camera when component mounts and mode is camera
   * Only start camera when it's not already active to prevent flickering
   * Camera should activate when modal is open, on scanner tab, and in camera mode
   */
  useEffect(() => {
    const openStateChanged = lastOpenStateRef.current !== open;
    const scanModeChanged = lastScanModeRef.current !== scanMode;

    lastOpenStateRef.current = open;
    lastScanModeRef.current = scanMode;

    // Reset camera initialization flag when modal reopens
    if (openStateChanged && open) {
      cameraInitializedRef.current = false;
    }

    // Auto-activate camera when modal is open, on scanner tab, and in camera mode
    if (open && activeTab === "scanner" && scanMode === "camera") {
      if (!camera.isActive && !cameraInitializedRef.current) {
        cameraInitializedRef.current = true;

        // Start camera with platform-specific timing
        // Dialog mode needs a small delay for DOM element to be ready
        const startCameraAsync = async () => {
          try {
            // Add delay for dialog mode to ensure DOM element is rendered
            if (responsive.useDialog) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            await camera.startCamera();
          } catch (error) {
            console.error("Auto-activation failed:", error);
            cameraInitializedRef.current = false;
          }
        };

        startCameraAsync();
      }
    } else if (
      camera.isActive &&
      (scanModeChanged || !open || activeTab !== "scanner")
    ) {
      cameraInitializedRef.current = false;
      camera.stopCamera();
    }
  }, [
    open,
    scanMode,
    activeTab,
    camera.isActive,
    camera.startCamera,
    camera.stopCamera,
    stableCallback,
    responsive.useDialog,
  ]);

  /**
   * Set up barcode detection callback when camera is active
   * This effect runs independently to avoid camera restarts
   */
  useEffect(() => {
    if (open && scanMode === "camera" && camera.isActive) {
      camera.setOnDetected(stableCallback);
    } else {
      camera.removeOnDetected();
    }

    // Cleanup on unmount
    return () => {
      camera.removeOnDetected();
    };
  }, [open, scanMode, camera.isActive, stableCallback]);

  /**
   * Handle modal close
   */
  const handleClose = async () => {
    await camera.stopCamera();

    if (persistSession) {
      // Keep session active but hidden
    } else {
      session.endSession();
    }

    feedback.resetToIdle();
    onClose();
  };

  /**
   * Clear session history
   */
  const handleClearHistory = () => {
    session.resetSession();
    throttling.clearAll();
    feedback.showInfo("Session history cleared");
  };

  /**
   * Switch between camera and manual modes
   */
  const switchMode = async (mode: ScanMode) => {
    if (mode === "camera") {
      setScanMode(mode);
      await camera.startCamera();
      camera.setOnDetected(stableCallback);
    } else {
      await camera.stopCamera();
      camera.removeOnDetected();
      setScanMode(mode);
    }
    feedback.resetToIdle();
  };

  const renderScannerContent = () => {
    if (activeTab === "history") {
      return (
        <SessionHistory
          scanHistory={session.scanHistory}
          statistics={session.statistics}
          detailed={true}
          onClearHistory={handleClearHistory}
        />
      );
    }

    if (activeTab === "stats" && session.statistics) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Session Statistics
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Session Duration:{" "}
                {Math.floor(session.statistics.sessionDuration / 1000)}s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Scanned: {session.statistics.totalScanned}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate:{" "}
                {session.statistics.totalScanned > 0
                  ? Math.round(
                      (session.statistics.successfulScans /
                        session.statistics.totalScanned) *
                        100
                    )
                  : 0}
                %
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Scan Interval:{" "}
                {Math.floor(session.statistics.averageScanInterval / 1000)}s
              </Typography>
            </Box>
          </Stack>
        </Box>
      );
    }

    // Scanner tab content
    return (
      <Box>
        {/* Mode Selection */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant={scanMode === "camera" ? "contained" : "outlined"}
            onClick={() => switchMode("camera")}
            startIcon={<CameraIcon />}
            disabled={camera.cameraState === "denied"}
            size="small"
          >
            Camera
          </Button>
          {enableManualEntry && (
            <Button
              variant={scanMode === "manual" ? "contained" : "outlined"}
              onClick={() => switchMode("manual")}
              startIcon={<ManualIcon />}
              size="small"
            >
              Manual
            </Button>
          )}
        </Stack>

        {/* Visual Feedback */}
        {process.env.NODE_ENV === "development" && (
          <ScanFeedback
            feedback={feedback.feedback}
            visible={feedback.isVisible}
            sx={{ mb: 2 }}
          />
        )}

        {/* Camera Mode */}
        {scanMode === "camera" && (
          <Box sx={{ mb: 2 }}>
            <div
              ref={scannerRef}
              style={{
                width: "100%",
                height: responsive.isMobile ? "250px" : "300px",
                borderRadius: "8px",
                backgroundColor: "#000",
                position: "relative",
                overflow: "hidden",
              }}
            />
            {camera.cameraState === "active" && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                Point camera at barcode to scan
              </Typography>
            )}
          </Box>
        )}

        {/* Manual Entry Mode */}
        {scanMode === "manual" && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Enter Barcode ID"
              placeholder="BC_2024-01-15_001"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualEntry();
                }
              }}
              disabled={camera.cameraState === "initializing"}
              size="small"
              sx={{ mb: 1 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleManualEntry}
              disabled={
                camera.cameraState === "initializing" || !manualInput.trim()
              }
              size="small"
            >
              Scan Barcode
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ResponsiveDrawer
      open={open}
      onClose={handleClose}
      useDrawerOnMobile={responsive.config.useDrawerOnMobile}
      useDialogOnDesktop={responsive.config.useDialogOnDesktop}
      fullScreenMobile={responsive.config.fullScreenMobile}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ScannerIcon />
          <Typography variant="h6" component="h2">
            Barcode Scanner
          </Typography>
          {session.isActive && (
            <Chip
              size="small"
              label={`${session.statistics?.totalScanned || 0} scanned`}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2 }}>
        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab
            label="Scanner"
            value="scanner"
            icon={<ScannerIcon />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={session.scanHistory.length} color="primary">
                History
              </Badge>
            }
            value="history"
            icon={<HistoryIcon />}
            iconPosition="start"
          />
          <Tab
            label="Stats"
            value="stats"
            icon={<StatsIcon />}
            iconPosition="start"
          />
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        {renderScannerContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined" size="small">
          Close
        </Button>
        {session.isActive && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SuccessIcon />}
            onClick={handleClose}
            size="small"
          >
            Complete Session ({session.statistics?.successfulScans || 0}{" "}
            scanned)
          </Button>
        )}
      </DialogActions>
    </ResponsiveDrawer>
  );
};
