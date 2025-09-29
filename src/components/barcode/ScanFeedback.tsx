import React from 'react';
import {
  Alert,
  Fade,
  Box,
  IconButton,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  QrCodeScanner as ScannerIcon
} from '@mui/icons-material';
import { ScanFeedbackConfig } from '../../types/barcode';

interface ScanFeedbackProps {
  /** Feedback configuration */
  feedback: ScanFeedbackConfig;
  /** Whether feedback is visible */
  visible: boolean;
  /** Whether to show as snackbar (default: false) */
  asSnackbar?: boolean;
  /** Position for snackbar */
  snackbarPosition?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  /** Callback when feedback should be hidden */
  onHide?: () => void;
  /** Custom styles */
  sx?: object;
}

/**
 * Get icon for feedback state
 */
const getFeedbackIcon = (state: ScanFeedbackConfig['state']) => {
  switch (state) {
    case 'scanning':
      return <CircularProgress size={20} />;
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'throttled':
    case 'duplicate':
      return <WarningIcon />;
    case 'idle':
    default:
      return <ScannerIcon />;
  }
};

/**
 * ScanFeedback component provides visual feedback for scan operations
 */
export const ScanFeedback: React.FC<ScanFeedbackProps> = ({
  feedback,
  visible,
  asSnackbar = false,
  snackbarPosition = { vertical: 'top', horizontal: 'center' },
  onHide,
  sx = {}
}) => {
  const { state, message, severity } = feedback;

  // Don't render if idle and not visible
  if (state === 'idle' && !visible) {
    return null;
  }

  const feedbackContent = (
    <Alert
      severity={severity}
      icon={getFeedbackIcon(state)}
      action={
        onHide && (
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={onHide}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        )
      }
      sx={{
        '& .MuiAlert-message': {
          display: 'flex',
          alignItems: 'center',
          fontWeight: 500
        },
        ...sx
      }}
    >
      {message}
    </Alert>
  );

  if (asSnackbar) {
    return (
      <Snackbar
        open={visible}
        autoHideDuration={feedback.autoHide ? feedback.duration : null}
        onClose={onHide}
        anchorOrigin={snackbarPosition}
        TransitionComponent={Fade}
      >
        <Box>
          {feedbackContent}
        </Box>
      </Snackbar>
    );
  }

  return (
    <Fade in={visible} timeout={300}>
      <Box sx={{ width: '100%', ...sx }}>
        {feedbackContent}
      </Box>
    </Fade>
  );
};