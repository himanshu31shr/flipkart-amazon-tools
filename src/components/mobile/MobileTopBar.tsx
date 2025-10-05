import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { getSafeAreaInsets } from '../../utils/mobile';

export interface MobileTopBarProps {
  /** Title to display in the top bar */
  title: string;

  /** Whether to show back button instead of menu */
  showBackButton?: boolean;

  /** Callback when menu button is clicked */
  onMenuClick?: () => void;

  /** Callback when back button is clicked */
  onBackClick?: () => void;

  /** Optional actions to display on the right side */
  actions?: React.ReactNode;

  /** Whether to hide the top bar */
  hidden?: boolean;
}

/**
 * Mobile top app bar component with menu/back button and title
 * Provides consistent header across all mobile pages
 *
 * Features:
 * - Menu button to open navigation drawer
 * - Back button for sub-pages
 * - Custom action buttons on the right
 * - Safe area support for iOS notch
 * - Proper elevation and z-index
 *
 * @example
 * <MobileTopBar
 *   title="Categories"
 *   onMenuClick={() => setDrawerOpen(true)}
 *   actions={<IconButton><SearchIcon /></IconButton>}
 * />
 */
export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  title,
  showBackButton = false,
  onMenuClick,
  onBackClick,
  actions,
  hidden = false,
}) => {
  const safeAreaInsets = getSafeAreaInsets();

  if (hidden) {
    return null;
  }

  return (
    <AppBar
      position="sticky"
      elevation={2}
      color="primary"
      sx={{
        top: 0,
        zIndex: 1200, // Above content and bottom nav, below drawer
        paddingTop: safeAreaInsets.top,
      }}
    >
      <Toolbar
        sx={{
          minHeight: 56,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        {/* Left side - Menu or Back button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label={showBackButton ? 'go back' : 'open menu'}
          onClick={showBackButton ? onBackClick : onMenuClick}
          sx={{
            mr: 1,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          {showBackButton ? <BackIcon /> : <MenuIcon />}
        </IconButton>

        {/* Center - Title */}
        <Typography
          variant="h6"
          component="h1"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            fontSize: '1.125rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>

        {/* Right side - Custom actions */}
        {actions && (
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {actions}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default MobileTopBar;
