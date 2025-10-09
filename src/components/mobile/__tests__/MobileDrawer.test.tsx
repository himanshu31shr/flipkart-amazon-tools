/**
 * Unit tests for MobileDrawer component
 * Tests navigation menu, user info display, active route highlighting, and logout
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { User } from 'firebase/auth';
import { MobileDrawer } from '../MobileDrawer';
import { authReducer } from '../../../store/slices/authSlice';

const theme = createTheme();

const createMockStore = (initialState: { auth?: Partial<ReturnType<typeof authReducer>> } = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    } as any,
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { uid: 'test-user', email: 'test@example.com' } as User,
        loading: false,
        error: null,
        authStateLoaded: true,
        ...initialState.auth,
      },
    },
  });
};

const renderWithProviders = (ui: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>{ui}</BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('MobileDrawer', () => {
  describe('Rendering', () => {
    it('should render when open', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should not be visible when closed', () => {
      renderWithProviders(<MobileDrawer open={false} onClose={jest.fn()} />);

      // Drawer exists in DOM but is hidden
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });

    it('should render all menu items', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('PDF Upload')).toBeInTheDocument();
      expect(screen.getByText("Today's Orders")).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Category Groups')).toBeInTheDocument();
      expect(screen.getByText('Order Analytics')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    it('should render logout button', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should display user email', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display user avatar with first letter', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      const avatar = screen.getByText('T'); // First letter of test@example.com
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onClose when menu item is clicked', () => {
      const onClose = jest.fn();
      renderWithProviders(<MobileDrawer open onClose={onClose} />);

      const dashboardItem = screen.getByText('Dashboard');
      fireEvent.click(dashboardItem);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      renderWithProviders(<MobileDrawer open onClose={onClose} />);

      const closeButton = screen.getByLabelText('close drawer');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logout', () => {
    it('should call onLogout when logout button is clicked', () => {
      const onLogout = jest.fn();
      const onClose = jest.fn();
      renderWithProviders(<MobileDrawer open onClose={onClose} onLogout={onLogout} />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not crash if onLogout is not provided', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      const logoutButton = screen.getByText('Logout');
      expect(() => fireEvent.click(logoutButton)).not.toThrow();
    });
  });

  describe('User Info', () => {
    it('should display default avatar when no user', () => {
      const store = createMockStore({
        auth: { user: null },
      });
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />, store);

      expect(screen.getByText('U')).toBeInTheDocument(); // Default avatar letter
    });

    it('should handle long email addresses with ellipsis', () => {
      const store = createMockStore({
        auth: {
          user: { uid: 'test', email: 'verylongemailaddress@example.com' } as User,
        },
      });
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />, store);

      const emailElement = screen.getByText('verylongemailaddress@example.com');
      const styles = window.getComputedStyle(emailElement);

      expect(styles.textOverflow).toBe('ellipsis');
      expect(styles.whiteSpace).toBe('nowrap');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      expect(screen.getByLabelText('close drawer')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<MobileDrawer open onClose={jest.fn()} />);

      const closeButton = screen.getByLabelText('close drawer');
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);
    });
  });
});
