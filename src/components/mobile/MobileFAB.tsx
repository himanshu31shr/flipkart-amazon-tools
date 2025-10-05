import React from 'react';
import { Fab, FabProps } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { getSafeAreaInsets } from '../../utils/mobile';

export interface MobileFABProps extends Omit<FabProps, 'sx'> {
  /** Position of FAB (default: 'bottom-right') */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';

  /** Bottom offset in pixels (default: 16, accounts for bottom nav) */
  bottomOffset?: number;
}

/**
 * Mobile-optimized Floating Action Button with safe area support
 * Positioned above bottom navigation with 56x56px Material Design standard size
 */
export function MobileFAB({
  position = 'bottom-right',
  bottomOffset = 80, // 64px bottom nav + 16px spacing
  children = <AddIcon />,
  color = 'primary',
  ...props
}: MobileFABProps) {
  const safeAreaInsets = getSafeAreaInsets();

  const getPositionStyles = () => {
    const base = {
      position: 'fixed' as const,
      bottom: `calc(${bottomOffset}px + ${safeAreaInsets.bottom})`,
      zIndex: 1050, // Above bottom nav (1100), below modals
    };

    switch (position) {
      case 'bottom-left':
        return { ...base, left: 16 };
      case 'bottom-center':
        return { ...base, left: '50%', transform: 'translateX(-50%)' };
      default: // bottom-right
        return { ...base, right: 16 };
    }
  };

  return (
    <Fab
      color={color}
      sx={getPositionStyles()}
      {...props}
    >
      {children}
    </Fab>
  );
}

export default MobileFAB;
