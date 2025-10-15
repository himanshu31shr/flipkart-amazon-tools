import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProtectedRoutes } from '../ProtectedRoutes';
import * as mobileUtils from '../../utils/mobile';
import { Capacitor } from '@capacitor/core';

// Mock dependencies
jest.mock('../../utils/mobile');
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
    getPlatform: jest.fn(),
  },
}));

jest.mock('../../navigation/MobileAppShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mobile-app-shell">{children}</div>
  ),
}));

jest.mock('../../containers/default/default.container', () => ({
  DefaultContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="desktop-container">{children}</div>
  ),
}));

// Mock all lazy-loaded pages to avoid loading issues in tests
jest.mock('../../pages/dashboard/dashboard.page', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}));

jest.mock('../../pages/products/products.page', () => ({
  __esModule: true,
  default: () => <div data-testid="products-page">Products</div>,
}));

jest.mock('../../pages/categories/categories.page', () => ({
  CategoriesPage: () => <div data-testid="categories-page">Categories</div>,
}));

jest.mock('../../pages/todaysOrders/todaysOrder.page', () => ({
  TodaysOrderPage: () => <div data-testid="orders-page">Orders</div>,
}));

// Create a minimal store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: (state = { user: { uid: 'test-user' }, isAuthenticated: true }) => state,
    },
  });
};

describe('ProtectedRoutes - Mobile Integration', () => {
  const mockToggleTheme = jest.fn();
  const mockStore = createMockStore();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop Layout', () => {
    beforeEach(() => {
      // Mock desktop viewport
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(false);
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
    });

    it('should render DefaultContainer on desktop viewport', async () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // Wait for lazy-loaded components to render
      await screen.findByTestId('desktop-container');

      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-app-shell')).not.toBeInTheDocument();
    });

    it('should wrap routes inside DefaultContainer on desktop', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();
      // Routes are lazy-loaded and tested separately
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      // Mock mobile viewport
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    });

    it('should not render DefaultContainer on mobile viewport', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // On mobile, ProtectedRoutes returns routes directly without DefaultContainer
      // Individual pages are responsible for wrapping themselves in MobileAppShell
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });

    it('should render routes directly on mobile without desktop container', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // ProtectedRoutes returns bare Routes on mobile
      // Individual mobile pages wrap themselves in MobileAppShell
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });

    it('should allow routes to render without wrapper on mobile', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/products/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // Verify no desktop container on mobile
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
      // Individual pages handle their own MobileAppShell wrapping
    });

    it('should not use desktop container on mobile', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // ProtectedRoutes delegates shell wrapping to individual pages
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should switch from desktop to mobile layout when viewport changes', async () => {
      // Start with desktop viewport
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      const { rerender } = render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // Initially desktop with container
      await screen.findByTestId('desktop-container');
      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();

      // Switch to mobile
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      rerender(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // On mobile, no desktop container (pages handle their own shells)
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });
  });

  describe('Platform Detection', () => {
    it('should not use desktop container on iOS', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // ProtectedRoutes returns bare routes on mobile platforms
      // Individual pages provide their own MobileAppShell
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });

    it('should not use desktop container on Android', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // ProtectedRoutes returns bare routes on mobile platforms
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });

    it('should use desktop container on web platform with desktop viewport', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();
    });
  });
});
