import { useState, useCallback, useRef, useEffect } from 'react';
import { ScanFeedbackState, ScanFeedbackConfig } from '../../types/barcode';

interface UseScanFeedbackOptions {
  /** Default feedback duration in milliseconds (default: 2000) */
  defaultDuration?: number;
  /** Whether to auto-hide feedback (default: true) */
  autoHide?: boolean;
}

interface UseScanFeedbackReturn {
  /** Current feedback configuration */
  feedback: ScanFeedbackConfig;
  /** Whether feedback is currently visible */
  isVisible: boolean;
  /** Show success feedback */
  showSuccess: (message?: string, duration?: number) => void;
  /** Show error feedback */
  showError: (message?: string, duration?: number) => void;
  /** Show warning feedback */
  showWarning: (message?: string, duration?: number) => void;
  /** Show info feedback */
  showInfo: (message?: string, duration?: number) => void;
  /** Show throttled feedback */
  showThrottled: (message?: string, duration?: number) => void;
  /** Show duplicate feedback */
  showDuplicate: (message?: string, duration?: number) => void;
  /** Hide feedback immediately */
  hideFeedback: () => void;
  /** Reset to idle state */
  resetToIdle: () => void;
}

const DEFAULT_MESSAGES: Record<ScanFeedbackState, string> = {
  idle: '',
  scanning: 'Scanning...',
  success: 'Barcode scanned successfully!',
  error: 'Failed to scan barcode',
  throttled: 'Please wait before scanning again',
  duplicate: 'Barcode already scanned'
};

/**
 * Custom hook for managing visual feedback during barcode scanning
 * Provides consistent, accessible feedback with automatic timing control
 */
export const useScanFeedback = (
  options: UseScanFeedbackOptions = {}
): UseScanFeedbackReturn => {
  const { 
    defaultDuration = 2000, 
    autoHide = true 
  } = options;

  const [feedback, setFeedback] = useState<ScanFeedbackConfig>({
    state: 'idle',
    message: '',
    duration: defaultDuration,
    autoHide,
    severity: 'info'
  });

  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clear existing timeout
   */
  const clearFeedbackTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Show feedback with specified configuration
   */
  const showFeedback = useCallback((
    state: ScanFeedbackState,
    severity: 'success' | 'error' | 'warning' | 'info',
    message?: string,
    duration?: number
  ) => {
    clearFeedbackTimeout();

    const finalDuration = duration ?? defaultDuration;
    const finalMessage = message ?? DEFAULT_MESSAGES[state];

    const newFeedback: ScanFeedbackConfig = {
      state,
      message: finalMessage,
      duration: finalDuration,
      autoHide,
      severity
    };

    setFeedback(newFeedback);
    setIsVisible(true);

    // Auto-hide if enabled
    if (autoHide && finalDuration > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // Reset to idle after fade out
        setTimeout(() => {
          setFeedback(prev => ({ ...prev, state: 'idle', message: '' }));
        }, 300); // Allow time for fade animation
      }, finalDuration);
    }
  }, [defaultDuration, autoHide, clearFeedbackTimeout]);

  /**
   * Show success feedback
   */
  const showSuccess = useCallback((message?: string, duration?: number) => {
    showFeedback('success', 'success', message, duration);
  }, [showFeedback]);

  /**
   * Show error feedback
   */
  const showError = useCallback((message?: string, duration?: number) => {
    showFeedback('error', 'error', message, duration);
  }, [showFeedback]);

  /**
   * Show warning feedback
   */
  const showWarning = useCallback((message?: string, duration?: number) => {
    showFeedback('throttled', 'warning', message, duration);
  }, [showFeedback]);

  /**
   * Show info feedback
   */
  const showInfo = useCallback((message?: string, duration?: number) => {
    showFeedback('scanning', 'info', message, duration);
  }, [showFeedback]);

  /**
   * Show throttled feedback
   */
  const showThrottled = useCallback((message?: string, duration?: number) => {
    showFeedback('throttled', 'warning', message, duration);
  }, [showFeedback]);

  /**
   * Show duplicate feedback
   */
  const showDuplicate = useCallback((message?: string, duration?: number) => {
    showFeedback('duplicate', 'warning', message, duration);
  }, [showFeedback]);

  /**
   * Hide feedback immediately
   */
  const hideFeedback = useCallback(() => {
    clearFeedbackTimeout();
    setIsVisible(false);
    // Reset to idle after fade out
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, state: 'idle', message: '' }));
    }, 300);
  }, [clearFeedbackTimeout]);

  /**
   * Reset to idle state
   */
  const resetToIdle = useCallback(() => {
    clearFeedbackTimeout();
    setFeedback({
      state: 'idle',
      message: '',
      duration: defaultDuration,
      autoHide,
      severity: 'info'
    });
    setIsVisible(false);
  }, [clearFeedbackTimeout, defaultDuration, autoHide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFeedbackTimeout();
    };
  }, [clearFeedbackTimeout]);

  return {
    feedback,
    isVisible,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showThrottled,
    showDuplicate,
    hideFeedback,
    resetToIdle
  };
};