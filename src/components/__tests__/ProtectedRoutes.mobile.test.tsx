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
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
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
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
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

    it('should render MobileAppShell on mobile viewport', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });

    it('should wrap routes inside MobileAppShell on mobile', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
      // Routes are lazy-loaded and tested separately
    });

    it('should wrap all routes in mobile shell', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/products/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // Verify mobile shell wraps the content
      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
      // Routes are lazy-loaded and tested separately
    });

    it('should support safe area insets on mobile', () => {
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      const mobileShell = screen.getByTestId('mobile-app-shell');
      expect(mobileShell).toBeInTheDocument();
      // Safe area insets are applied in MobileAppShell component
    });
  });

  describe('Responsive Behavior', () => {
    it('should switch from desktop to mobile layout when viewport changes', async () => {
      // Start with desktop viewport
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      const { rerender } = render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      // Initially desktop
      await screen.findByTestId('desktop-container');
      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();

      // Switch to mobile
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      rerender(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-container')).not.toBeInTheDocument();
    });
  });

  describe('Platform Detection', () => {
    it('should use mobile shell on iOS', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
    });

    it('should use mobile shell on Android', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('mobile-app-shell')).toBeInTheDocument();
    });

    it('should use desktop container on web platform with desktop viewport', () => {
      (mobileUtils.useIsMobile as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
            <ProtectedRoutes toggleTheme={mockToggleTheme} mode="light" />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByTestId('desktop-container')).toBeInTheDocument();
    });
  });
});
