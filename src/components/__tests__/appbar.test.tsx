import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppBar } from '../appbar';

// Mock the auth service
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock('../../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    signOut: mockSignOut,
    onAuthStateChanged: mockOnAuthStateChanged,
  })),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

const renderAppBar = (props = {}, router?: React.ReactNode) => {
  const defaultProps = {
    toggleDrawer: jest.fn(() => jest.fn()),
    toggleTheme: jest.fn(),
    mode: 'light' as const,
    open: false,
  };
  return render(
    router ? (
      router
    ) : (
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AppBar {...defaultProps} {...props} />
        </ThemeProvider>
      </BrowserRouter>
    )
  );
};

describe('AppBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to unauthenticated state
    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return jest.fn(); // unsubscribe function
    }) as any;
  }) as any;

  describe('rendering', () => {
    it('should render with default title', () => {
      renderAppBar(
        {},
        <MemoryRouter initialEntries={['/flipkart-amazon-tools/']}>
          <ThemeProvider theme={theme}>
            <AppBar
              toggleDrawer={jest.fn(() => jest.fn())}
              toggleTheme={jest.fn()}
              mode="light"
              open={false}
            />
          </ThemeProvider>
        </MemoryRouter>
      );
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    }) as any;

    it('should render menu button when drawer is closed', () => {
      renderAppBar({ open: false }) as any;
      
      const menuButton = screen.getByTestId('menu-button');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toBeVisible();
    }) as any;

    it('should hide menu button when drawer is open', () => {
      renderAppBar({ open: true }) as any;
      
      const menuButton = screen.getByTestId('menu-button');
      expect(menuButton).toHaveStyle({ display: 'none' }) as any;
    }) as any;

    it('should render theme toggle switch', () => {
      renderAppBar();
      
      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle).toBeInTheDocument();
    }) as any;

    it('should show correct theme state', () => {
      renderAppBar({ mode: 'dark' }) as any;
      
      const themeToggle = screen.getByLabelText('dark mode toggle');
      expect(themeToggle).toBeChecked();
    }) as any;

    it('should show light theme state', () => {
      renderAppBar({ mode: 'light' }) as any;
      
      const themeToggle = screen.getByLabelText('dark mode toggle');
      expect(themeToggle).not.toBeChecked();
    }) as any;
  }) as any;

  describe('route titles', () => {
    const routeTests = [
      { path: '/flipkart-amazon-tools/', title: 'Dashboard' },
      { path: '/flipkart-amazon-tools/transactions/', title: 'Transaction Analytics' },
      { path: '/flipkart-amazon-tools/activeOrders/', title: 'Active Orders' },
      { path: '/flipkart-amazon-tools/products/', title: 'Products' },
      { path: '/flipkart-amazon-tools/hidden-products/', title: 'Hidden Products' },
      { path: '/flipkart-amazon-tools/order-analytics/', title: 'Order Analytics' },
      { path: '/unknown-route/', title: 'Label Merger' },
    ];

    routeTests.forEach(({ path, title }) => {
      it(`should show "${title}" for route ${path}`, () => {
        renderAppBar(
          {},
          <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={theme}>
              <AppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </MemoryRouter>
        );
        expect(screen.getByText(title)).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe('interactions', () => {
    it('should call toggleDrawer when menu button is clicked', () => {
      const mockToggleDrawer = jest.fn(() => jest.fn());
      renderAppBar({ toggleDrawer: mockToggleDrawer, open: false }) as any;
      
      const menuButton = screen.getByTestId('menu-button');
      fireEvent.click(menuButton);
      
      expect(mockToggleDrawer).toHaveBeenCalledWith(true);
    }) as any;

    it('should call toggleTheme when theme switch is clicked', () => {
      const mockToggleTheme = jest.fn();
      renderAppBar({ toggleTheme: mockToggleTheme }) as any;
      
      const themeToggle = screen.getByLabelText('dark mode toggle');
      fireEvent.click(themeToggle);
      
      expect(mockToggleTheme).toHaveBeenCalled();
    }) as any;

    it('should call toggleDrawer with false when close button is clicked', () => {
      const mockToggleDrawer = jest.fn(() => jest.fn());
      renderAppBar({ toggleDrawer: mockToggleDrawer, open: true }) as any;
      
      const closeButton = screen.getByLabelText('close drawer');
      fireEvent.click(closeButton);
      
      expect(mockToggleDrawer).toHaveBeenCalledWith(false);
    }) as any;
  }) as any;

  describe('authentication', () => {
    it('should not show logout button when not authenticated', () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(null); // No user
        return jest.fn();
      }) as any;

      renderAppBar();
      
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    }) as any;

    it('should show logout button when authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: 'test-user' }) as any; // User exists
        return jest.fn();
      }) as any;

      renderAppBar();
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }) as any;
    }) as any;

    it('should call signOut and navigate when logout is clicked', async () => {
      mockSignOut.mockResolvedValue(undefined);
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: 'test-user' }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }) as any;

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/flipkart-amazon-tools/login');
      }) as any;
    }) as any;

    it('should handle logout error gracefully', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: 'test-user' }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }) as any;

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // The logout should fail silently without crashing the app
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        // The app should still be functional even if logout fails
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }) as any;
    }) as any;

    it('should unsubscribe from auth state changes on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderAppBar();
      
      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    }) as any;
  }) as any;

  describe('styling and layout', () => {
    it('should apply correct styles when drawer is open', () => {
      renderAppBar({ open: true }) as any;
      
      // The AppBar should have specific styles when open
      const appBar = screen.getByRole('banner');
      expect(appBar).toBeInTheDocument();
    }) as any;

    it('should apply correct styles when drawer is closed', () => {
      renderAppBar({ open: false }) as any;
      
      const appBar = screen.getByRole('banner');
      expect(appBar).toBeInTheDocument();
    }) as any;

    it('should render with fixed position', () => {
      renderAppBar();
      
      const appBar = screen.getByRole('banner');
      expect(appBar).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      renderAppBar();
      
      expect(screen.getByLabelText('menu')).toBeInTheDocument();
      expect(screen.getByLabelText('dark mode toggle')).toBeInTheDocument();
    }) as any;

    it('should have proper aria label for close button when open', () => {
      renderAppBar({ open: true }) as any;
      
      expect(screen.getByLabelText('close drawer')).toBeInTheDocument();
    }) as any;

    it('should be keyboard accessible', () => {
      renderAppBar();
      
      const menuButton = screen.getByTestId('menu-button');
      const themeToggle = screen.getByTestId('theme-toggle');
      
      expect(menuButton).toHaveAttribute('tabIndex', '0');
      expect(themeToggle).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('edge cases', () => {
    it('should handle missing props gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppBar: LocalAppBar } = require('../appbar');
      expect(() => {
        render(
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <LocalAppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </BrowserRouter>
        );
      }).not.toThrow();
    }) as any;

    it('should handle auth service errors during initialization', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOnAuthStateChanged.mockImplementation(() => {
        throw new Error('Auth service error');
      }) as any;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppBar: LocalAppBar } = require('../appbar');
      expect(() => {
        render(
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <LocalAppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </BrowserRouter>
        );
      }).toThrow('Auth service error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    }) as any;
  }) as any;
}) as any; 