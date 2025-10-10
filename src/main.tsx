import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Paper } from '@mui/material';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Capacitor } from '@capacitor/core';
import { store, persistor } from './store';
import { initializeAuthState, setAuthState } from './store/slices/authSlice';
import { initializeFirebaseCapacitor } from './services/firebase.capacitor';
import getDesignTokens from './theme';
import App from './App';

const AppWrapper = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme', newMode);
  };

  // Initialize Firebase Capacitor plugins and auth state when app starts
  useEffect(() => {
    // Initialize Firebase Capacitor plugins for native platforms
    initializeFirebaseCapacitor().catch((error) => {
      console.error('Failed to initialize Firebase Capacitor:', error);
    });

    // Initialize auth state
    store.dispatch(initializeAuthState());

    // E2E Test Support: Listen for auth state injection from Playwright tests
    const handleE2EAuth = (event: CustomEvent) => {
      store.dispatch(setAuthState(event.detail));
      console.log('✅ E2E auth state injected:', event.detail.user?.email);
    };

    window.addEventListener('e2e:set-auth', handleE2EAuth as EventListener);

    return () => {
      window.removeEventListener('e2e:set-auth', handleE2EAuth as EventListener);
    };
  }, []);

  // Use HashRouter for Capacitor (mobile apps) and BrowserRouter for web
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Paper sx={{ minHeight: '100vh' }}>
            <Router>
              <App toggleTheme={toggleTheme} mode={mode} />
            </Router>
          </Paper>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
);
