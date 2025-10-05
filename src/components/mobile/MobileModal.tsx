import React from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Box,
  Slide
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { getSafeAreaInsets } from '../../utils/mobile';

/**
 * Slide transition from bottom for mobile modal
 */
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * Optional action button configuration for modal header
 */
export interface ModalAction {
  /** Action button label */
  label: string;

  /** Callback when action button is clicked */
  onClick: () => void;

  /** Whether the action button is disabled */
  disabled?: boolean;

  /** Button color variant */
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

/**
 * Props for MobileModal component
 */
export interface MobileModalProps {
  /** Whether the modal is open */
  open: boolean;

  /** Callback when modal should be closed */
  onClose: () => void;

  /** Modal title displayed in header */
  title: string;

  /** Modal content */
  children: React.ReactNode;

  /** Optional action button in header (e.g., "Save", "Done") */
  headerAction?: ModalAction;

  /** Whether to disable the backdrop click to close (default: false) */
  disableBackdropClick?: boolean;

  /** Whether to disable the escape key to close (default: false) */
  disableEscapeKeyDown?: boolean;

  /** Additional content padding (default: 2) */
  contentPadding?: number;
}

/**
 * Full-screen mobile modal component with AppBar header
 *
 * Features:
 * - Full-screen dialog optimized for mobile
 * - AppBar header with close button (X) on left
 * - Title centered in header
 * - Optional action button on right of header
 * - Slide-up transition animation from bottom
 * - iOS safe area support
 * - Focus trap within modal
 * - 44x44px minimum touch targets
 *
 * @example
 * ```tsx
 * <MobileModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Product"
 *   headerAction={{
 *     label: 'Save',
 *     onClick: handleSave,
 *     color: 'primary'
 *   }}
 * >
 *   <ProductForm />
 * </MobileModal>
 * ```
 */
export function MobileModal({
  open,
  onClose,
  title,
  children,
  headerAction,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  contentPadding = 2
}: MobileModalProps) {
  const safeAreaInsets = getSafeAreaInsets();

  const handleClose = (_event: object, reason: string) => {
    if (reason === 'backdropClick' && disableBackdropClick) {
      return;
    }
    if (reason === 'escapeKeyDown' && disableEscapeKeyDown) {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiDialog-paper': {
          // Respect iOS safe areas
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
          paddingLeft: safeAreaInsets.left,
          paddingRight: safeAreaInsets.right,
        }
      }}
    >
      {/* AppBar Header */}
      <AppBar
        position="relative"
        color="default"
        elevation={1}
        sx={{
          // Adjust for safe area already applied to Dialog paper
          marginTop: 0
        }}
      >
        <Toolbar
          sx={{
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1
          }}
        >
          {/* Close Button (Left) */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="Close"
            sx={{
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Title (Center) */}
          <Typography
            variant="h6"
            component="h2"
            sx={{
              flex: 1,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </Typography>

          {/* Action Button or Spacer (Right) */}
          {headerAction ? (
            <Button
              color={headerAction.color || 'primary'}
              onClick={headerAction.onClick}
              disabled={headerAction.disabled}
              sx={{
                minHeight: 44,
                textTransform: 'none'
              }}
            >
              {headerAction.label}
            </Button>
          ) : (
            <Box sx={{ width: 44 }} /> // Spacer to keep title centered
          )}
        </Toolbar>
      </AppBar>

      {/* Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          p: contentPadding,
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        {children}
      </Box>
    </Dialog>
  );
}

export default MobileModal;
