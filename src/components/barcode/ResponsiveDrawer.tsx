import React from 'react';
import {
  Dialog,
  DialogProps,
  Drawer,
  DrawerProps,
  Slide,
  useTheme,
  useMediaQuery,
  Paper
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';

interface ResponsiveDrawerProps {
  /** Whether the drawer/dialog is open */
  open: boolean;
  /** Callback when drawer/dialog should close */
  onClose: () => void;
  /** Content to render inside */
  children: React.ReactNode;
  /** Whether to use drawer on mobile (default: true) */
  useDrawerOnMobile?: boolean;
  /** Whether to use dialog on desktop (default: true) */
  useDialogOnDesktop?: boolean;
  /** Whether to show full screen on mobile (default: true) */
  fullScreenMobile?: boolean;
  /** Custom mobile breakpoint (default: 'md') */
  mobileBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Dialog props to pass through */
  dialogProps?: Partial<DialogProps>;
  /** Drawer props to pass through */
  drawerProps?: Partial<DrawerProps>;
  /** Custom styles */
  sx?: object;
}

/**
 * Slide transition for mobile drawer
 */
const SlideTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

/**
 * ResponsiveDrawer component that adapts between Dialog and Drawer based on screen size
 * Provides mobile-first bottom sheet experience with desktop dialog fallback
 */
export const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  open,
  onClose,
  children,
  useDrawerOnMobile = true,
  useDialogOnDesktop = true,
  fullScreenMobile = true,
  mobileBreakpoint = 'md',
  dialogProps = {},
  drawerProps = {},
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));

  // Determine which component to use
  const useDrawer = isMobile ? useDrawerOnMobile : !useDialogOnDesktop;

  if (useDrawer) {
    // Mobile: Use Drawer as bottom sheet
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        PaperProps={{
          sx: {
            borderTopLeftRadius: isMobile ? 16 : 0,
            borderTopRightRadius: isMobile ? 16 : 0,
            maxHeight: isMobile && fullScreenMobile ? '90vh' : '80vh',
            minHeight: isMobile ? '50vh' : 'auto',
            ...sx
          }
        }}
        SlideProps={{
          direction: 'up'
        }}
        {...drawerProps}
      >
        {/* Handle bar for mobile */}
        {isMobile && (
          <Paper
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'grey.400',
              mx: 'auto',
              mt: 1,
              mb: 2,
              cursor: 'pointer'
            }}
            onClick={onClose}
            aria-label="Close scanner"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClose();
              }
            }}
          />
        )}
        {children}
      </Drawer>
    );
  } else {
    // Desktop: Use Dialog
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile && fullScreenMobile}
        TransitionComponent={isMobile ? SlideTransition : undefined}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            maxHeight: '90vh',
            ...sx
          }
        }}
        {...dialogProps}
      >
        {children}
      </Dialog>
    );
  }
};