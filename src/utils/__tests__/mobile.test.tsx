/**
 * Unit tests for mobile utility functions
 * Tests viewport detection, platform detection, and mobile-specific utilities
 */
import { renderHook } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Capacitor } from '@capacitor/core';
import {
  useIsMobile,
  useIsMobileApp,
  getPlatform,
  isIOS,
  isAndroid,
  isWeb,
  getViewportSize,
  useViewportSize,
  isTouchDevice,
  getSafeAreaInsets,
  getMinTouchTargetSize,
} from '../mobile';
import React from 'react';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
    getPlatform: jest.fn(),
  },
}));

const theme = createTheme();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('Mobile Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useIsMobile', () => {
    it('should return true when viewport width is less than 600px', () => {
      // Mock window.matchMedia to return mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width:599.95px)', // Material-UI sm breakpoint
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile(), { wrapper });
      expect(result.current).toBe(true);
    });

    it('should return false when viewport width is 600px or more', () => {
      // Mock window.matchMedia to return desktop viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false, // Desktop viewport
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile(), { wrapper });
      expect(result.current).toBe(false);
    });

    it('should use Material-UI theme breakpoints', () => {
      const customTheme = createTheme({
        breakpoints: {
          values: {
            xs: 0,
            sm: 700, // Custom mobile breakpoint
            md: 960,
            lg: 1280,
            xl: 1920,
          },
        },
      });

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={customTheme}>{children}</ThemeProvider>
      );

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width:699.95px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile(), { wrapper: customWrapper });
      expect(result.current).toBe(true);
    });
  });

  describe('useIsMobileApp', () => {
    it('should return true when running on native platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useIsMobileApp());
      expect(result.current).toBe(true);
      expect(Capacitor.isNativePlatform).toHaveBeenCalled();
    });

    it('should return false when running on web platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useIsMobileApp());
      expect(result.current).toBe(false);
      expect(Capacitor.isNativePlatform).toHaveBeenCalled();
    });
  });

  describe('getPlatform', () => {
    it('should return "ios" when running on iOS', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      const platform = getPlatform();
      expect(platform).toBe('ios');
      expect(Capacitor.getPlatform).toHaveBeenCalled();
    });

    it('should return "android" when running on Android', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      const platform = getPlatform();
      expect(platform).toBe('android');
      expect(Capacitor.getPlatform).toHaveBeenCalled();
    });

    it('should return "web" when running in browser', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      const platform = getPlatform();
      expect(platform).toBe('web');
      expect(Capacitor.getPlatform).toHaveBeenCalled();
    });
  });

  describe('isIOS', () => {
    it('should return true when platform is iOS', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(isIOS()).toBe(true);
    });

    it('should return false when platform is not iOS', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('should return true when platform is Android', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(isAndroid()).toBe(true);
    });

    it('should return false when platform is not Android', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(isAndroid()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('should return true when platform is web', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      expect(isWeb()).toBe(true);
    });

    it('should return false when platform is not web', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(isWeb()).toBe(false);
    });
  });

  describe('getViewportSize', () => {
    it('should return current window dimensions', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const size = getViewportSize();
      expect(size).toEqual({ width: 375, height: 667 });
    });

    it('should return zero dimensions when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Simulating SSR environment
      delete global.window;

      const size = getViewportSize();
      expect(size).toEqual({ width: 0, height: 0 });

      // Restore window
      global.window = originalWindow;
    });

    it('should handle different viewport sizes', () => {
      // Test iPhone SE
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 568 });
      expect(getViewportSize()).toEqual({ width: 320, height: 568 });

      // Test iPad
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1024 });
      expect(getViewportSize()).toEqual({ width: 768, height: 1024 });

      // Test desktop
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1080 });
      expect(getViewportSize()).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('useViewportSize', () => {
    it('should return initial viewport size', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 414 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 896 });

      const { result } = renderHook(() => useViewportSize());
      expect(result.current).toEqual({ width: 414, height: 896 });
    });

    it('should update size when window is resized', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });

      const { result, rerender } = renderHook(() => useViewportSize());
      expect(result.current).toEqual({ width: 375, height: 667 });

      // Simulate resize
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 428 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 926 });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      rerender();

      expect(result.current).toEqual({ width: 428, height: 926 });
    });

    it('should clean up resize listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useViewportSize());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('isTouchDevice', () => {
    const originalWindow = global.window;

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should return true when ontouchstart is supported', () => {
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: null,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return true when maxTouchPoints > 0', () => {
      delete window.ontouchstart;

      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return true when msMaxTouchPoints > 0 (IE11)', () => {
      delete window.ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: 0 });
      Object.defineProperty(navigator, 'msMaxTouchPoints', { writable: true, configurable: true, value: 2 });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return false when no touch support detected', () => {
      delete window.ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: 0 });
      // @ts-expect-error - Removing msMaxTouchPoints
      delete navigator.msMaxTouchPoints;

      expect(isTouchDevice()).toBe(false);
    });

    it('should return false in SSR environment', () => {
      // @ts-expect-error - Simulating SSR
      delete global.window;

      expect(isTouchDevice()).toBe(false);
    });
  });

  describe('getSafeAreaInsets', () => {
    it('should return CSS env() values for safe area insets', () => {
      const insets = getSafeAreaInsets();

      expect(insets).toEqual({
        top: 'env(safe-area-inset-top, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
      });
    });

    it('should return consistent values across multiple calls', () => {
      const insets1 = getSafeAreaInsets();
      const insets2 = getSafeAreaInsets();

      expect(insets1).toEqual(insets2);
    });

    it('should have fallback to 0px for all sides', () => {
      const insets = getSafeAreaInsets();

      Object.values(insets).forEach(value => {
        expect(value).toContain('0px');
      });
    });
  });

  describe('getMinTouchTargetSize', () => {
    it('should return 44 pixels for iOS platform', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(getMinTouchTargetSize()).toBe(44);
    });

    it('should return 48 pixels for Android platform', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(getMinTouchTargetSize()).toBe(48);
    });

    it('should return 44 pixels for web platform (WCAG 2.1 AAA standard)', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      expect(getMinTouchTargetSize()).toBe(44);
    });

    it('should return consistent value for unknown platforms', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('unknown');

      expect(getMinTouchTargetSize()).toBe(44);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid platform changes', () => {
      (Capacitor.getPlatform as jest.Mock)
        .mockReturnValueOnce('ios')
        .mockReturnValueOnce('android')
        .mockReturnValueOnce('web');

      expect(getPlatform()).toBe('ios');
      expect(getPlatform()).toBe('android');
      expect(getPlatform()).toBe('web');
    });

    it('should handle undefined navigator gracefully', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Simulating environment without navigator
      delete global.navigator;

      // Should not throw
      expect(() => isTouchDevice()).not.toThrow();

      global.navigator = originalNavigator;
    });

    it('should handle viewport size of 0', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 0 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 0 });

      const size = getViewportSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it('should handle very large viewport sizes', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 9999 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 9999 });

      const size = getViewportSize();
      expect(size).toEqual({ width: 9999, height: 9999 });
    });
  });

  describe('Integration Tests', () => {
    it('should correctly identify mobile native iOS device', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      expect(getPlatform()).toBe('ios');
      expect(isIOS()).toBe(true);
      expect(isAndroid()).toBe(false);
      expect(isWeb()).toBe(false);

      const { result } = renderHook(() => useIsMobileApp());
      expect(result.current).toBe(true);

      expect(getMinTouchTargetSize()).toBe(44);
    });

    it('should correctly identify mobile native Android device', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      expect(getPlatform()).toBe('android');
      expect(isAndroid()).toBe(true);
      expect(isIOS()).toBe(false);
      expect(isWeb()).toBe(false);

      const { result } = renderHook(() => useIsMobileApp());
      expect(result.current).toBe(true);

      expect(getMinTouchTargetSize()).toBe(48);
    });

    it('should correctly identify web mobile browser', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width:599.95px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      Object.defineProperty(window, 'ontouchstart', { writable: true, configurable: true, value: null });

      expect(getPlatform()).toBe('web');
      expect(isWeb()).toBe(true);
      expect(isIOS()).toBe(false);
      expect(isAndroid()).toBe(false);

      const { result: mobileResult } = renderHook(() => useIsMobile(), { wrapper });
      expect(mobileResult.current).toBe(true);

      const { result: nativeResult } = renderHook(() => useIsMobileApp());
      expect(nativeResult.current).toBe(false);

      expect(isTouchDevice()).toBe(true);
      expect(getMinTouchTargetSize()).toBe(44);
    });
  });
});
