import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectAuthStateLoaded } from '../store/slices/authSlice';
import { createRoutePath } from '../utils/routing';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authStateLoaded = useAppSelector(selectAuthStateLoaded);
  const location = useLocation();

  // Show loading while auth state is being determined
  if (!authStateLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={createRoutePath('/login')} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};