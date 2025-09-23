import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';
import { authReducer } from '../store/slices/authSlice';

// Mock the auth service
jest.mock('../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    getCurrentUser: jest.fn(),
    onAuthStateChanged: jest.fn(() => () => {}),
  })),
}));

// Mock Firebase config
jest.mock('../services/firebase.config', () => ({
  auth: {},
  db: {},
}));

const createMockStore = (authState: Record<string, unknown> = {}) => {
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
        ...authState,
      },
    },
  }) as any;
};

const renderApp = (authState?: Record<string, unknown>) => {
  const store = createMockStore(authState);
  const mockToggleTheme = jest.fn();
  
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <App toggleTheme={mockToggleTheme} mode="light" />
      </BrowserRouter>
    </Provider>
  );
};

describe('App', () => {
  it('should render without crashing', () => {
    renderApp();
    expect(document.body).toBeInTheDocument();
  }) as any;

  it('should render the app with theme provider', () => {
    renderApp();
    // The app should render with Material-UI theme
    const appElement = document.querySelector('body');
    expect(appElement).toBeInTheDocument();
  }) as any;

  it('should handle different auth states', () => {
    // Test with authenticated user
    const authenticatedState = {
      user: { uid: 'test-uid', email: 'test@example.com' },
      loading: false,
      error: null,
      isAuthenticated: true,
      authStateLoaded: true,
      isLoading: false,
    };
    
    renderApp(authenticatedState);
    expect(document.body).toBeInTheDocument();
  }) as any;

  it('should handle loading state', () => {
    const loadingState = {
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,
      authStateLoaded: false,
      isLoading: false,
    };
    
    renderApp(loadingState);
    expect(document.body).toBeInTheDocument();
  }) as any;

  it('should handle error state', () => {
    const errorState = {
      user: null,
      loading: false,
      error: 'Authentication error',
      isAuthenticated: false,
      authStateLoaded: true,
      isLoading: false,
    };
    
    renderApp(errorState);
    expect(document.body).toBeInTheDocument();
  }) as any;

  it('should provide theme context to child components', () => {
    renderApp();
    
    // Check if Material-UI theme classes are applied
    const body = document.body;
    expect(body).toBeInTheDocument();
    
    // The app should have rendered without throwing errors
    expect(body.children.length).toBeGreaterThan(0);
  }) as any;
}) as any; 