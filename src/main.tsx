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
import { initializeAuthState } from './store/slices/authSlice';
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

  // Initialize auth state when app starts
  useEffect(() => {
    store.dispatch(initializeAuthState());
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
