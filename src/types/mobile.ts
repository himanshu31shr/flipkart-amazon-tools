import { ReactNode } from 'react';

/**
 * Mobile navigation tab configuration
 * Used in bottom navigation for mobile apps
 */
export interface MobileTab {
  /** Unique identifier for the tab */
  id: string;

  /** Display label for the tab */
  label: string;

  /** Icon component or element to display */
  icon: ReactNode;

  /** Route path to navigate to when tab is selected */
  route: string;

  /** Optional badge count to display on tab (e.g., unread notifications) */
  badge?: number;

  /** Whether this tab is disabled */
  disabled?: boolean;
}

/**
 * Mobile navigation configuration
 * Defines the bottom navigation structure for mobile apps
 */
export interface MobileNavigationConfig {
  /** Array of navigation tabs */
  tabs: MobileTab[];

  /** ID of the default tab to display on app launch */
  defaultTab: string;

  /** Whether to show labels on all tabs (true) or only active tab (false) */
  showLabels?: boolean;
}

/**
 * Mobile viewport configuration
 * Defines responsive breakpoints and sizing for mobile layouts
 */
export interface MobileViewportConfig {
  /** Material-UI breakpoint to use for mobile detection (default: 'sm' = 600px) */
  breakpoint: 'xs' | 'sm' | 'md';

  /** Card width for mobile list items in pixels */
  cardWidth?: number;

  /** Spacing between mobile components in pixels */
  spacing: number;

  /** Minimum touch target size in pixels (iOS: 44px, Android: 48px) */
  touchTargetSize: number;
}

/**
 * Platform type for conditional rendering
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * Mobile card swipe action configuration
 * Used in swipeable card components
 */
export interface SwipeAction {
  /** Unique identifier for the action */
  id: string;

  /** Display label for the action */
  label: string;

  /** Icon to display for the action */
  icon: ReactNode;

  /** Background color for the swipe action */
  backgroundColor: string;

  /** Text color for the swipe action */
  color: string;

  /** Callback function when action is triggered */
  onAction: () => void | Promise<void>;

  /** Which side the swipe action appears (left or right) */
  side: 'left' | 'right';
}

/**
 * Mobile pull-to-refresh state
 * Used in pull-to-refresh hook
 */
export interface PullToRefreshState {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;

  /** Pull distance in pixels (for visual feedback) */
  pullDistance: number;

  /** Whether pull threshold has been reached to trigger refresh */
  canRefresh: boolean;
}

/**
 * Mobile infinite scroll configuration
 * Used in infinite scroll hook
 */
export interface InfiniteScrollConfig {
  /** Distance from bottom (in pixels) to trigger load more */
  threshold: number;

  /** Whether more data is currently being loaded */
  isLoading: boolean;

  /** Whether there is more data to load */
  hasMore: boolean;

  /** Callback function to load more data */
  onLoadMore: () => void | Promise<void>;
}

/**
 * Mobile modal configuration
 * Used in full-screen mobile modals
 */
export interface MobileModalConfig {
  /** Whether modal is open */
  open: boolean;

  /** Callback when modal is closed */
  onClose: () => void;

  /** Modal title to display in header */
  title: string;

  /** Optional action button in header (e.g., "Save", "Done") */
  headerAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  };

  /** Whether modal content should scroll */
  scrollable?: boolean;
}

/**
 * Mobile bottom sheet configuration
 * Used for bottom sheet drawers (filters, actions, etc.)
 */
export interface BottomSheetConfig {
  /** Whether bottom sheet is open */
  open: boolean;

  /** Callback when sheet is closed */
  onClose: () => void;

  /** Optional callback when sheet is opened */
  onOpen?: () => void;

  /** Title to display at top of sheet */
  title?: string;

  /** Height of the bottom sheet ('auto', 'full', or specific pixel value) */
  height?: 'auto' | 'full' | number;

  /** Whether sheet can be dismissed by backdrop click */
  dismissible?: boolean;

  /** Whether to show drag handle at top */
  showHandle?: boolean;
}

/**
 * Mobile safe area insets
 * Used to handle iOS notches and Android navigation bars
 */
export interface SafeAreaInsets {
  /** Top inset (iOS notch, status bar) */
  top: number;

  /** Right inset */
  right: number;

  /** Bottom inset (iOS home indicator, Android navigation bar) */
  bottom: number;

  /** Left inset */
  left: number;
}

/**
 * Mobile barcode scanner configuration
 * Used in barcode scanner component
 */
export interface BarcodeScannerConfig {
  /** Whether scanner is active */
  active: boolean;

  /** Callback when barcode is scanned */
  onScan: (barcode: string) => void | Promise<void>;

  /** Callback when scanner encounters an error */
  onError?: (error: Error) => void;

  /** Callback when scanner is closed */
  onClose: () => void;

  /** Camera facing mode (user: front camera, environment: back camera) */
  facing?: 'user' | 'environment';

  /** Whether to show camera preview */
  showPreview?: boolean;
}

/**
 * Mobile network status
 * Used in offline indicator component
 */
export interface NetworkStatus {
  /** Whether device is currently online */
  online: boolean;

  /** Connection type (wifi, cellular, none) */
  connectionType?: 'wifi' | 'cellular' | 'none' | 'unknown';

  /** Whether connection is metered (cellular data) */
  metered?: boolean;
}
