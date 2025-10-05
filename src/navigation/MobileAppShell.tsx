import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import { MobileTopBar } from '../components/mobile/MobileTopBar';
import { MobileDrawer } from '../components/mobile/MobileDrawer';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';

/**
 * Props for MobileAppShell component
 */
interface MobileAppShellProps {
  /** Child content to render in the main area */
  children: React.ReactNode;

  /** Whether to hide the bottom navigation (e.g., for full-screen pages) */
  hideBottomNav?: boolean;

  /** Whether to hide the top app bar (e.g., for full-screen pages) */
  hideTopBar?: boolean;

  /** Page title to display in the top bar */
  pageTitle?: string;

  /** Whether to show back button instead of menu in top bar */
  showBackButton?: boolean;

  /** Callback when back button is clicked */
  onBackClick?: () => void;

  /** Optional actions to display in the top bar */
  topBarActions?: React.ReactNode;
}

/**
 * Mobile app shell component providing consistent layout structure
 * Includes top bar, drawer, bottom navigation and proper safe area handling for iOS/Android
 *
 * Features:
 * - Top app bar with menu/back button and title
 * - Slide-out navigation drawer
 * - Fixed bottom navigation with safe area padding
 * - Content area with proper padding to prevent overlap
 * - Safe area insets for iOS notches and Android navigation bars
 * - Scrollable content area
 *
 * @example
 * <MobileAppShell pageTitle="Categories">
 *   <MyPageContent />
 * </MobileAppShell>
 */
export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  children,
  hideBottomNav = false,
  hideTopBar = false,
  pageTitle = 'Sacred Sutra Tools',
  showBackButton = false,
  onBackClick,
  topBarActions,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bottom navigation height + safe area
  const bottomNavHeight = 64; // Base height of bottom nav

  const handleMenuClick = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100vw',
        maxWidth: '100%',
        backgroundColor: 'background.default',
      }}
    >
      {/* Top App Bar */}
      {!hideTopBar && (
        <MobileTopBar
          title={pageTitle}
          showBackButton={showBackButton}
          onMenuClick={handleMenuClick}
          onBackClick={handleBackClick}
          actions={topBarActions}
        />
      )}

      {/* Navigation Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          // Padding bottom to account for bottom navigation
          paddingBottom: hideBottomNav ? 0 : `${bottomNavHeight}px`,
        }}
      >
        {children}
      </Box>

      {/* Bottom navigation */}
      {!hideBottomNav && <MobileBottomNav />}
    </Box>
  );
};

export default MobileAppShell;
