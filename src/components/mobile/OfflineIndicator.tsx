import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertColor, Box, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';

/**
 * Network status state
 */
interface NetworkStatus {
  /** Whether device is currently online */
  isOnline: boolean;

  /** Last time connection status changed */
  lastChanged: Date;

  /** Connection type (wifi, cellular, none, unknown) */
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * Props for OfflineIndicator component
 */
interface OfflineIndicatorProps {
  /** Position of the indicator (default: 'bottom') */
  position?: 'top' | 'bottom';

  /** Auto-hide duration in ms when back online (default: 3000) */
  autoHideDuration?: number;

  /** Custom offline message */
  offlineMessage?: string;

  /** Custom online message */
  onlineMessage?: string;

  /** Severity level for offline alert (default: 'warning') */
  offlineSeverity?: AlertColor;

  /** Severity level for online alert (default: 'success') */
  onlineSeverity?: AlertColor;

  /** Callback when network status changes */
  onStatusChange?: (status: NetworkStatus) => void;
}

/**
 * Offline indicator component that monitors network connectivity
 * Shows a persistent banner when offline and temporary success message when back online
 *
 * Features:
 * - Real-time network status monitoring
 * - Non-intrusive banner UI
 * - Auto-dismiss when reconnected
 * - Safe area inset support
 * - Accessible ARIA labels
 *
 * @example
 * // Basic usage
 * <OfflineIndicator />
 *
 * @example
 * // Custom messages and positioning
 * <OfflineIndicator
 *   position="top"
 *   offlineMessage="Connection lost - working offline"
 *   onlineMessage="Connected!"
 *   onStatusChange={(status) => console.log('Network:', status)}
 * />
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'bottom',
  autoHideDuration = 3000,
  offlineMessage = 'No internet connection',
  onlineMessage = 'Back online',
  offlineSeverity = 'warning',
  onlineSeverity = 'success',
  onStatusChange,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastChanged: new Date(),
    connectionType: 'unknown',
  });

  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Get initial connection type
    const getConnectionType = (): NetworkStatus['connectionType'] => {
      if (!navigator.onLine) return 'none';

      // Type assertion for connection API (not available in all browsers)
      const nav = navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          type?: string;
        };
      };

      if (nav.connection) {
        const type = nav.connection.type || nav.connection.effectiveType;
        if (type?.includes('wifi')) return 'wifi';
        if (type?.includes('cellular') || type?.includes('4g') || type?.includes('3g')) {
          return 'cellular';
        }
      }

      return 'unknown';
    };

    // Handle online event
    const handleOnline = () => {
      const newStatus: NetworkStatus = {
        isOnline: true,
        lastChanged: new Date(),
        connectionType: getConnectionType(),
      };

      setNetworkStatus(newStatus);

      // Show "back online" message only if we were previously offline
      if (wasOffline) {
        setShowOnlineMessage(true);
        setWasOffline(false);
      }

      onStatusChange?.(newStatus);
    };

    // Handle offline event
    const handleOffline = () => {
      const newStatus: NetworkStatus = {
        isOnline: false,
        lastChanged: new Date(),
        connectionType: 'none',
      };

      setNetworkStatus(newStatus);
      setWasOffline(true);
      setShowOnlineMessage(false);

      onStatusChange?.(newStatus);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial connection type
    if (navigator.onLine) {
      setNetworkStatus(prev => ({
        ...prev,
        connectionType: getConnectionType(),
      }));
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, onStatusChange]);

  // Auto-hide "back online" message after duration
  useEffect(() => {
    if (showOnlineMessage) {
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [showOnlineMessage, autoHideDuration]);

  const anchorOrigin = {
    vertical: position,
    horizontal: 'center' as const,
  };

  return (
    <>
      {/* Offline indicator - persistent */}
      <Snackbar
        open={!networkStatus.isOnline}
        anchorOrigin={anchorOrigin}
        sx={{
          // Safe area insets
          bottom: position === 'bottom' ? 'env(safe-area-inset-bottom, 16px)' : undefined,
          top: position === 'top' ? 'env(safe-area-inset-top, 16px)' : undefined,
          '& .MuiSnackbarContent-root': {
            minWidth: '300px',
          },
        }}
      >
        <Alert
          severity={offlineSeverity}
          icon={<WifiOffIcon />}
          sx={{
            width: '100%',
            alignItems: 'center',
          }}
          aria-live="assertive"
          aria-atomic="true"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" fontWeight="medium">
              {offlineMessage}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Changes will sync when reconnected
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Back online message - temporary */}
      <Snackbar
        open={showOnlineMessage}
        autoHideDuration={autoHideDuration}
        onClose={() => setShowOnlineMessage(false)}
        anchorOrigin={anchorOrigin}
        sx={{
          bottom: position === 'bottom' ? 'env(safe-area-inset-bottom, 16px)' : undefined,
          top: position === 'top' ? 'env(safe-area-inset-top, 16px)' : undefined,
        }}
      >
        <Alert
          severity={onlineSeverity}
          icon={<WifiIcon />}
          onClose={() => setShowOnlineMessage(false)}
          sx={{ width: '100%', alignItems: 'center' }}
          aria-live="polite"
          aria-atomic="true"
        >
          <Typography variant="body2" fontWeight="medium">
            {onlineMessage}
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

/**
 * Hook to access current network status
 * Provides reactive network state without rendering UI
 *
 * @returns Current network status
 *
 * @example
 * const networkStatus = useNetworkStatus();
 *
 * if (!networkStatus.isOnline) {
 *   return <OfflineMessage />;
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastChanged: new Date(),
    connectionType: 'unknown',
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus({
        isOnline: true,
        lastChanged: new Date(),
        connectionType: 'unknown', // Could enhance with connection API
      });
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        lastChanged: new Date(),
        connectionType: 'none',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

export default OfflineIndicator;
