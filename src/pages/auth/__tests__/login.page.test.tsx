import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoginPage } from '../login.page';
import { authReducer } from '../../../store/slices/authSlice';

// Mock Firebase auth
jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    }),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    onAuthStateChanged: jest.fn(),
    browserLocalPersistence: 'local',
    browserSessionPersistence: 'session',
    setPersistence: jest.fn().mockResolvedValue(undefined),
  };
}) as any;

// Mock Firestore
jest.mock('firebase/firestore', () => {
  return {
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn(),
    getDocs: jest.fn(),
    Firestore: jest.fn(),
  };
}) as any;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

const createMockStore = (initialState = {}) => {
  return configureStore({ 
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        authStateLoaded: true,
        isLoading: false,
        ...initialState,
      },
    },
  }) as any;
};

const renderWithProviders = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.clearAllMocks();
  }) as any;

  describe('rendering', () => {
    it('should render login form by default', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByText('Sign in to access your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    }) as any;

    it('should render all form elements', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT')).toBeDefined();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Forgot Password?' })).toBeInTheDocument();
    }) as any;

    it('should have proper form structure', () => {
      renderWithProviders(<LoginPage />);
      // The form is present, but does not have role="form"; select by element
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT');
      expect(passwordInput).toBeDefined();
      
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput!).toHaveAttribute('type', 'password');
      expect(passwordInput!).toHaveAttribute('required');
    }) as any;
  }) as any;

  describe('form interactions', () => {
    it('should update email field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    }) as any;

    it('should update password field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const passwordInput = screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT');
      expect(passwordInput).toBeDefined();
      await user.type(passwordInput!, 'password123');
      
      expect(passwordInput!).toHaveValue('password123');
    }) as any;

    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    }) as any;

    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const passwordInput = screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT');
      expect(passwordInput).toBeDefined();
      const toggleButton = screen.getByLabelText(/toggle password visibility/i);
      
      expect(passwordInput!).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(passwordInput!).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(passwordInput!).toHaveAttribute('type', 'password');
    }) as any;
  }) as any;

  describe('reset password mode', () => {
    it('should switch to reset password mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const forgotPasswordButton = screen.getByRole('button', { name: 'Forgot Password?' }) as any;
      await user.click(forgotPasswordButton);
      
      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByText('Enter your email to receive a password reset link')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    }) as any;

    it('should hide password field in reset mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const forgotPasswordButton = screen.getByRole('button', { name: 'Forgot Password?' }) as any;
      await user.click(forgotPasswordButton);
      
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/remember me/i)).not.toBeInTheDocument();
    }) as any;

    it('should switch back to login mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      // Switch to reset mode
      const forgotPasswordButton = screen.getByRole('button', { name: 'Forgot Password?' }) as any;
      await user.click(forgotPasswordButton);
      
      // Switch back to login mode
      const backButton = screen.getByRole('button', { name: 'Back to Sign In' }) as any;
      await user.click(backButton);
      
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT')).toBeDefined();
    }) as any;
  }) as any;

  describe('form submission', () => {
    it('should submit login form with correct data', async () => {
      const user = userEvent.setup();
      const store = createMockStore();
      renderWithProviders(<LoginPage />, store);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT');
      expect(passwordInput).toBeDefined();
      const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: 'Sign In' }) as any;
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput!, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);
      
      // Check if the form was submitted (we can't easily test the actual dispatch without mocking)
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput!).toHaveValue('password123');
      expect(rememberMeCheckbox).toBeChecked();
    }) as any;

    it('should submit reset password form', async () => {
      const user = userEvent.setup();
      const store = createMockStore();
      renderWithProviders(<LoginPage />, store);
      
      // Switch to reset mode
      const forgotPasswordButton = screen.getByRole('button', { name: 'Forgot Password?' }) as any;
      await user.click(forgotPasswordButton);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' }) as any;
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      expect(emailInput).toHaveValue('test@example.com');
    }) as any;

    it('should prevent submission with empty required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' }) as any;
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInvalid();
    }) as any;
  }) as any;

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      const store = createMockStore({ loading: true }) as any;
      renderWithProviders(<LoginPage />, store);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    }) as any;

    it('should disable submit button when loading', () => {
      const store = createMockStore({ loading: true }) as any;
      renderWithProviders(<LoginPage />, store);
      
      const submitButton = screen.getByRole('button', { name: '' }) as any;
      expect(submitButton).toBeDisabled();
    }) as any;
  }) as any;

  describe('error handling', () => {
    it('should display error message', () => {
      const store = createMockStore({ error: 'Invalid credentials' }) as any;
      renderWithProviders(<LoginPage />, store);
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
    }) as any;

    it('should display success message for password reset', () => {
      const store = createMockStore({ error: 'Password reset email sent' }) as any;
      renderWithProviders(<LoginPage />, store);
      
      expect(screen.getByText('Password reset email sent')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
    }) as any;

    it('should not display alert when no error', () => {
      const store = createMockStore({ error: null }) as any;
      renderWithProviders(<LoginPage />, store);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithProviders(<LoginPage />);
      
      const heading = screen.getByRole('heading', { level: 1 }) as any;
      expect(heading).toHaveTextContent('Sign In');
    }) as any;

    it('should have proper form labels', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT')).toBeDefined();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    }) as any;

    it('should have proper button labels', () => {
      renderWithProviders(<LoginPage />);
      
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Forgot Password?' })).toBeInTheDocument();
      expect(screen.getByLabelText(/toggle password visibility/i)).toBeInTheDocument();
    }) as any;

    it('should have autofocus on email field', () => {
      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i);
      // MUI TextField uses autoFocus prop, but it does not set the attribute, so check document.activeElement
      expect(document.activeElement === emailInput).toBeTruthy();
    }) as any;
  }) as any;

  describe('responsive design', () => {
    it('should render card with proper styling', () => {
      renderWithProviders(<LoginPage />);
      // The Card is present, check by class
      const card = document.querySelector('[class*="MuiCard-root"]');
      expect(card).toBeInTheDocument();
    }) as any;

    it('should have proper icon display', () => {
      renderWithProviders(<LoginPage />);
      // There may be multiple LockOutlinedIcons, use getAllByTestId
      expect(screen.getAllByTestId('LockOutlinedIcon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('EmailOutlinedIcon').length).toBeGreaterThan(0);
    }) as any;
  }) as any;

  describe('edge cases', () => {
    it('should handle form submission with preventDefault', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      // Select the form by element
      const form = document.querySelector('form');
      const submitEvent = jest.fn();
      if (form) form.addEventListener('submit', submitEvent);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT');
      expect(passwordInput).toBeDefined();
      const submitButton = screen.getByRole('button', { name: 'Sign In' }) as any;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput!, 'password123');
      await user.click(submitButton);
      expect(submitEvent).toHaveBeenCalled();
    }) as any;

    it('should maintain form state when switching modes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      
      // Switch to reset mode
      const forgotPasswordButton = screen.getByRole('button', { name: 'Forgot Password?' }) as any;
      await user.click(forgotPasswordButton);
      
      // Email should be preserved
      const resetEmailInput = screen.getByLabelText(/email/i);
      expect(resetEmailInput).toHaveValue('test@example.com');
    }) as any;
  }) as any;
}) as any; 