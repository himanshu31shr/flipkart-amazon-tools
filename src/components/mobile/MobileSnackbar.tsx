import React from 'react';
import { Snackbar, Alert, AlertColor, Button } from '@mui/material';
import { getSafeAreaInsets } from '../../utils/mobile';

export interface MobileSnackbarProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: AlertColor;
  autoHideDuration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Mobile-optimized snackbar positioned at bottom with safe area support
 * Auto-hides after 4 seconds, supports severity types and action buttons
 */
export function MobileSnackbar({
  open,
  onClose,
  message,
  severity = 'info',
  autoHideDuration = 4000,
  action
}: MobileSnackbarProps) {
  const safeAreaInsets = getSafeAreaInsets();

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: `calc(80px + ${safeAreaInsets.bottom})`, // Above bottom nav
        zIndex: 1200, // Above FAB, below modals
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        action={action && (
          <Button color="inherit" size="small" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        sx={{ minWidth: 300 }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

export default MobileSnackbar;
