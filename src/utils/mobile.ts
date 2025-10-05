import { useTheme, useMediaQuery } from '@mui/material';
import { Capacitor } from '@capacitor/core';

/**
 * Custom hook to detect if device is mobile based on Material-UI breakpoints
 * Uses theme.breakpoints.down('sm') which is < 600px by default
 *
 * @returns boolean - true if viewport width is less than 600px
 *
 * @example
 * const MyComponent = () => {
 *   const isMobile = useIsMobile();
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * };
 */
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

/**
 * Custom hook to detect if running on a native mobile platform (iOS/Android)
 * via Capacitor
 *
 * @returns boolean - true if running on native iOS or Android
 *
 * @example
 * const MyComponent = () => {
 *   const isNative = useIsMobileApp();
 *   return isNative ? <NativeFeatures /> : <WebFeatures />;
 * };
 */
export function useIsMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform (ios, android, web)
 * This is a static function that doesn't require React hooks
 *
 * @returns 'ios' | 'android' | 'web'
 *
 * @example
 * if (getPlatform() === 'ios') {
 *   // iOS-specific code
 * }
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Check if running on iOS platform
 *
 * @returns boolean
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android platform
 *
 * @returns boolean
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running on web platform
 *
 * @returns boolean
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Get viewport size information
 * Safe to call on server-side rendering (returns defaults if window is undefined)
 *
 * @returns { width: number; height: number }
 *
 * @example
 * const { width, height } = getViewportSize();
 * if (width < 600) {
 *   // Mobile viewport
 * }
 */
export function getViewportSize(): { width: number; height: number } {
  // Check if running in browser (not SSR)
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Custom hook to get viewport size with reactive updates
 * Updates when window is resized
 *
 * @returns { width: number; height: number }
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = React.useState(getViewportSize);

  React.useEffect(() => {
    const handleResize = () => {
      setSize(getViewportSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// Need to import React for hooks
import React from 'react';

/**
 * Check if device supports touch events
 *
 * @returns boolean
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    ('msMaxTouchPoints' in navigator && (navigator as Navigator & { msMaxTouchPoints: number }).msMaxTouchPoints > 0)
  );
}

/**
 * Get safe area insets for iOS devices with notches
 * Returns CSS env() values for use in styles
 *
 * @returns object with top, right, bottom, left inset values
 */
export function getSafeAreaInsets() {
  return {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)'
  };
}

/**
 * Get the platform-specific minimum touch target size
 * iOS: 44x44pt, Android: 48x48dp, Web: 44x44px (WCAG 2.1)
 *
 * @returns number - minimum touch target size in pixels
 */
export function getMinTouchTargetSize(): number {
  const platform = getPlatform();

  switch (platform) {
    case 'ios':
      return 44;
    case 'android':
      return 48;
    default:
      return 44; // WCAG 2.1 AAA standard
  }
}
