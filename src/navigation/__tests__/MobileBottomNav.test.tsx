import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MobileBottomNav } from '../MobileBottomNav';
import * as mobileUtils from '../../utils/mobile';
import * as routingUtils from '../../utils/routing';

// Mock the mobile utilities
jest.mock('../../utils/mobile', () => ({
  getSafeAreaInsets: jest.fn(() => ({
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px'
  }))
}));

// Mock the routing utilities
jest.mock('../../utils/routing', () => ({
  getBasePath: jest.fn(() => '')
}));

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web')
  }
}));

const theme = createTheme();

const renderWithRouter = (initialRoute = '/') => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <MobileBottomNav />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('MobileBottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the bottom navigation component', () => {
      const { container } = renderWithRouter();

      const bottomNav = container.querySelector('.MuiBottomNavigation-root');
      expect(bottomNav).toBeInTheDocument();
    });

    it('should render all three navigation tabs', () => {
      renderWithRouter();

      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should render icons for all tabs', () => {
      renderWithRouter();

      // Material-UI BottomNavigationAction renders icons within buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      // Each button should have an svg icon
      buttons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should show labels for all tabs', () => {
      renderWithRouter();

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      const productsButton = screen.getByRole('button', { name: /products/i });
      const categoriesButton = screen.getByRole('button', { name: /categories/i });

      expect(ordersButton).toBeVisible();
      expect(productsButton).toBeVisible();
      expect(categoriesButton).toBeVisible();
    });
  });

  describe('Navigation', () => {
    it('should highlight active tab based on current route', () => {
      renderWithRouter('/todays-orders');

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      expect(ordersButton).toHaveClass('Mui-selected');
    });

    it('should navigate to orders tab when clicked', () => {
      renderWithRouter('/products');

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      fireEvent.click(ordersButton);

      // After click, the orders tab should become selected
      expect(ordersButton).toHaveClass('Mui-selected');
    });

    it('should navigate to products tab when clicked', () => {
      renderWithRouter('/todays-orders');

      const productsButton = screen.getByRole('button', { name: /products/i });
      fireEvent.click(productsButton);

      expect(productsButton).toHaveClass('Mui-selected');
    });

    it('should navigate to categories tab when clicked', () => {
      renderWithRouter('/products');

      const categoriesButton = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoriesButton);

      expect(categoriesButton).toHaveClass('Mui-selected');
    });

    it('should default to orders tab when route does not match any tab', () => {
      renderWithRouter('/unknown-route');

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      expect(ordersButton).toHaveClass('Mui-selected');
    });
  });

  describe('Base Path Integration', () => {
    it('should use base path from routing utils', () => {
      const mockGetBasePath = jest.spyOn(routingUtils, 'getBasePath');
      mockGetBasePath.mockReturnValue('/flipkart-amazon-tools');

      renderWithRouter('/flipkart-amazon-tools/products');

      expect(mockGetBasePath).toHaveBeenCalled();

      const productsButton = screen.getByRole('button', { name: /products/i });
      expect(productsButton).toHaveClass('Mui-selected');
    });

    it('should work without base path (mobile)', () => {
      const mockGetBasePath = jest.spyOn(routingUtils, 'getBasePath');
      mockGetBasePath.mockReturnValue('');

      renderWithRouter('/categories');

      const categoriesButton = screen.getByRole('button', { name: /categories/i });
      expect(categoriesButton).toHaveClass('Mui-selected');
    });
  });

  describe('Styling and Accessibility', () => {
    it('should have fixed positioning at bottom', () => {
      const { container } = renderWithRouter();

      const paper = container.querySelector('.MuiPaper-root');

      expect(paper).toHaveStyle({
        position: 'fixed',
        bottom: '0'
      });
    });

    it('should apply safe area insets', () => {
      const mockGetSafeAreaInsets = jest.spyOn(mobileUtils, 'getSafeAreaInsets');
      mockGetSafeAreaInsets.mockReturnValue({
        top: '20px',
        right: '10px',
        bottom: '34px',
        left: '10px'
      });

      renderWithRouter();

      expect(mockGetSafeAreaInsets).toHaveBeenCalled();
    });

    it('should have appropriate z-index for layering', () => {
      const { container } = renderWithRouter();

      const paper = container.querySelector('.MuiPaper-root');

      // z-index should be 1100 (above content, below modals)
      expect(paper).toHaveStyle({
        zIndex: '1100'
      });
    });

    it('should have minimum touch target height', () => {
      renderWithRouter();

      const buttons = screen.getAllByRole('button');

      // Each button should have sufficient height for touch targets
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);

        // Minimum 44px per iOS Human Interface Guidelines
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should be accessible via keyboard navigation', async () => {
      renderWithRouter();

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      const productsButton = screen.getByRole('button', { name: /products/i });

      // Should be focusable
      await act(async () => {
        ordersButton.focus();
      });
      expect(document.activeElement).toBe(ordersButton);

      await act(async () => {
        productsButton.focus();
      });
      expect(document.activeElement).toBe(productsButton);
    });
  });

  describe('Route Matching', () => {
    it('should match active tab for nested routes', () => {
      renderWithRouter('/products/edit/123');

      const productsButton = screen.getByRole('button', { name: /products/i });
      expect(productsButton).toHaveClass('Mui-selected');
    });

    it('should update active tab when clicking different tabs', () => {
      renderWithRouter('/products');

      const productsButton = screen.getByRole('button', { name: /products/i });
      expect(productsButton).toHaveClass('Mui-selected');

      // Click categories tab
      const categoriesButton = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoriesButton);

      // Categories should now be selected
      expect(categoriesButton).toHaveClass('Mui-selected');
    });
  });

  describe('Tab States', () => {
    it('should not navigate when clicking on already active tab', () => {
      renderWithRouter('/products');

      const productsButton = screen.getByRole('button', { name: /products/i });
      expect(productsButton).toHaveClass('Mui-selected');

      // Click again
      fireEvent.click(productsButton);

      // Should still be selected
      expect(productsButton).toHaveClass('Mui-selected');
    });

    it('should handle rapid tab switching', () => {
      renderWithRouter('/todays-orders');

      const ordersButton = screen.getByRole('button', { name: /orders/i });
      const productsButton = screen.getByRole('button', { name: /products/i });
      const categoriesButton = screen.getByRole('button', { name: /categories/i });

      // Rapid clicks
      fireEvent.click(productsButton);
      fireEvent.click(categoriesButton);
      fireEvent.click(ordersButton);

      // Final state should be orders selected
      expect(ordersButton).toHaveClass('Mui-selected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle root route', () => {
      renderWithRouter('/');

      // Should default to first tab (orders)
      const ordersButton = screen.getByRole('button', { name: /orders/i });
      expect(ordersButton).toHaveClass('Mui-selected');
    });

    it('should handle routes with query parameters', () => {
      renderWithRouter('/products?filter=active');

      const productsButton = screen.getByRole('button', { name: /products/i });
      expect(productsButton).toHaveClass('Mui-selected');
    });

    it('should handle routes with hash fragments', () => {
      renderWithRouter('/categories#section-1');

      const categoriesButton = screen.getByRole('button', { name: /categories/i });
      expect(categoriesButton).toHaveClass('Mui-selected');
    });
  });
});
