import { Box, CircularProgress } from "@mui/material";
import { Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedRoutes } from "./components/ProtectedRoutes";
import { LoginPage } from "./pages/auth/login.page";
import React from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import monitoringService from "./services/monitoring.service";

export default function App({
  toggleTheme,
  mode,
}: {
  toggleTheme: () => void;
  mode: "light" | "dark";
}) {
  useEffect(() => {
    // Initialize monitoring
    monitoringService.trackEvent('app_loaded', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Track page performance
    setTimeout(() => {
      monitoringService.capturePerformanceMetrics();
    }, 2000);
  }, []);

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Suspense
          fallback={
            <CircularProgress data-testid="loading-progress" color="success" />
          }
        >
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/health" 
            element={
              React.createElement(
                React.lazy(() => import("./pages/health/health.page").then(module => ({ default: module.default })))
              )
            } 
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ProtectedRoutes toggleTheme={toggleTheme} mode={mode} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Box>
    </ErrorBoundary>
  );
}
