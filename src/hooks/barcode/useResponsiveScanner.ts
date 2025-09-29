import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { ResponsiveConfig } from '../../types/barcode';

interface UseResponsiveScannerOptions {
  /** Custom responsive configuration */
  responsiveConfig?: Partial<ResponsiveConfig>;
}

interface UseResponsiveScannerReturn {
  /** Whether currently on mobile viewport */
  isMobile: boolean;
  /** Whether to use drawer component */
  useDrawer: boolean;
  /** Whether to use dialog component */
  useDialog: boolean;
  /** Whether to show full screen on mobile */
  fullScreenMobile: boolean;
  /** Whether to auto-adjust height */
  autoHeight: boolean;
  /** Complete responsive configuration */
  config: ResponsiveConfig;
  /** Force mobile mode (for testing) */
  forceMobile: (force: boolean) => void;
  /** Reset to automatic detection */
  resetResponsive: () => void;
}

const DEFAULT_CONFIG: ResponsiveConfig = {
  mobileBreakpoint: 768,
  useDrawerOnMobile: true,
  useDialogOnDesktop: true,
  fullScreenMobile: true,
  autoHeight: true
};

/**
 * Custom hook for responsive barcode scanner behavior
 * Handles mobile/desktop UI switching with customizable breakpoints
 */
export const useResponsiveScanner = (
  options: UseResponsiveScannerOptions = {}
): UseResponsiveScannerReturn => {
  const theme = useTheme();
  const { responsiveConfig = {} } = options;

  // Merge default config with provided options - memoized to prevent re-creation
  const config: ResponsiveConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...responsiveConfig
  }), [responsiveConfig]);

  // Use Material-UI's breakpoint system as primary detection
  const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('md'));
  
  // Custom breakpoint detection based on config
  const isCustomMobile = useMediaQuery(`(max-width:${config.mobileBreakpoint}px)`);

  // State for forced mobile mode (testing/debugging)
  const [forcedMobile, setForcedMobile] = useState<boolean | null>(null);

  // Determine actual mobile state
  const isMobile = forcedMobile !== null ? forcedMobile : (isMobileBreakpoint || isCustomMobile);

  // Determine which component to use
  const useDrawer = isMobile ? config.useDrawerOnMobile : !config.useDialogOnDesktop;
  const useDialog = !useDrawer;

  // Mobile-specific configurations
  const fullScreenMobile = isMobile && config.fullScreenMobile;
  const autoHeight = config.autoHeight;

  /**
   * Force mobile mode for testing
   */
  const forceMobile = useCallback((force: boolean) => {
    setForcedMobile(force);
  }, []);

  /**
   * Reset to automatic responsive detection
   */
  const resetResponsive = useCallback(() => {
    setForcedMobile(null);
  }, []);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ResponsiveScanner:', {
        isMobile,
        useDrawer,
        useDialog,
        fullScreenMobile,
        isMobileBreakpoint,
        isCustomMobile,
        forcedMobile,
        config
      });
    }
  }, [
    isMobile, 
    useDrawer, 
    useDialog, 
    fullScreenMobile, 
    isMobileBreakpoint, 
    isCustomMobile, 
    forcedMobile, 
    config
  ]);

  return {
    isMobile,
    useDrawer,
    useDialog,
    fullScreenMobile,
    autoHeight,
    config,
    forceMobile,
    resetResponsive
  };
};