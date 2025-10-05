import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle hardware back button on Android devices
 *
 * Behavior:
 * - If not at root route: Navigate back in history
 * - If at root route: Show exit confirmation, then exit app
 * - Only works on native Android platform
 *
 * @example
 * function MyApp() {
 *   useBackButton();
 *   return <Routes>...</Routes>;
 * }
 */
export function useBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only handle back button on native Android platform
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    // Define root routes where back button should exit app
    // For Capacitor apps, root is just '/'
    const rootRoutes = ['/'];

    let backButtonHandler: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    // Register back button listener
    const setupListener = async () => {
      backButtonHandler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = location.pathname;
        const isAtRoot = rootRoutes.includes(currentPath);

        if (!isAtRoot && canGoBack) {
          // Navigate back in history if not at root
          navigate(-1);
        } else if (isAtRoot) {
          // At root route - confirm exit
          const confirmExit = window.confirm(
            'Are you sure you want to exit Sacred Sutra Tools?'
          );

          if (confirmExit) {
            CapacitorApp.exitApp();
          }
        } else {
          // Fallback: navigate to root or exit
          if (currentPath !== rootRoutes[0]) {
            navigate(rootRoutes[0]);
          } else {
            CapacitorApp.exitApp();
          }
        }
      });
    };

    setupListener();

    // Cleanup listener on unmount
    return () => {
      if (backButtonHandler) {
        backButtonHandler.remove();
      }
    };
  }, [navigate, location.pathname]);
}

/**
 * Alternative back button hook with custom exit handler
 * Allows customization of exit behavior (e.g., custom modal)
 *
 * @param onExitAttempt - Callback when user tries to exit at root route
 *
 * @example
 * useBackButtonWithCustomExit(() => {
 *   setShowExitModal(true);
 * });
 */
export function useBackButtonWithCustomExit(
  onExitAttempt: () => void
): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const rootRoutes = [
      '/flipkart-amazon-tools/',
      '/flipkart-amazon-tools',
      '/'
    ];

    let backButtonHandler: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    const setupListener = async () => {
      backButtonHandler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = location.pathname;
        const isAtRoot = rootRoutes.includes(currentPath);

        if (!isAtRoot && canGoBack) {
          navigate(-1);
        } else if (isAtRoot) {
          // Call custom exit handler instead of default confirm
          onExitAttempt();
        } else {
          if (currentPath !== rootRoutes[0]) {
            navigate(rootRoutes[0]);
          } else {
            onExitAttempt();
          }
        }
      });
    };

    setupListener();

    return () => {
      if (backButtonHandler) {
        backButtonHandler.remove();
      }
    };
  }, [navigate, location.pathname, onExitAttempt]);
}

/**
 * Programmatically exit the app (Android only)
 * Shows confirmation dialog before exiting
 */
export function exitApp(): void {
  if (!Capacitor.isNativePlatform()) {
    console.warn('exitApp() only works on native platforms');
    return;
  }

  const confirmExit = window.confirm(
    'Are you sure you want to exit Sacred Sutra Tools?'
  );

  if (confirmExit) {
    CapacitorApp.exitApp();
  }
}

/**
 * Programmatically exit the app without confirmation (Android only)
 * Use with caution - generally prefer exitApp() with confirmation
 */
export function forceExitApp(): void {
  if (!Capacitor.isNativePlatform()) {
    console.warn('forceExitApp() only works on native platforms');
    return;
  }

  CapacitorApp.exitApp();
}
