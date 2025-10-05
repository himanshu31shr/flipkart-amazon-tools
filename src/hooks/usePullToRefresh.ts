import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Configuration options for pull-to-refresh behavior
 */
export interface PullToRefreshConfig {
  /** Minimum distance in pixels to trigger refresh (default: 80) */
  threshold?: number;

  /** Maximum pull distance in pixels (default: 120) */
  maxPullDistance?: number;

  /** Enable/disable pull-to-refresh (default: true) */
  enabled?: boolean;

  /** Resistance factor (1 = no resistance, higher = more resistance) (default: 2.5) */
  resistance?: number;
}

/**
 * Pull-to-refresh state
 */
export interface PullToRefreshState {
  /** Current pull distance */
  pullDistance: number;

  /** Whether currently pulling */
  isPulling: boolean;

  /** Whether refresh is in progress */
  isRefreshing: boolean;

  /** Pull progress percentage (0-100) */
  progress: number;

  /** Whether pull threshold has been exceeded */
  shouldRefresh: boolean;
}

/**
 * Custom hook for implementing pull-to-refresh functionality
 *
 * @param onRefresh - Async callback to execute when refresh is triggered
 * @param config - Configuration options
 * @returns Pull-to-refresh state and container ref
 *
 * @example
 * const { state, containerRef } = usePullToRefresh(async () => {
 *   await fetchData();
 * });
 *
 * return (
 *   <div ref={containerRef}>
 *     {state.isRefreshing && <Spinner />}
 *     <Content />
 *   </div>
 * );
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  config: PullToRefreshConfig = {}
): {
  state: PullToRefreshState;
  containerRef: React.RefObject<HTMLDivElement | null>;
} {
  const {
    threshold = 80,
    maxPullDistance = 120,
    enabled = true,
    resistance = 2.5,
  } = config;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<PullToRefreshState>({
    pullDistance: 0,
    isPulling: false,
    isRefreshing: false,
    progress: 0,
    shouldRefresh: false,
  });

  // Touch tracking
  const touchStartY = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      pullDistance: 0,
      isPulling: false,
      shouldRefresh: false,
      progress: 0,
    }));
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    scrollTop.current = container.scrollTop;

    // Only start tracking if at top of scroll
    if (scrollTop.current === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !containerRef.current || touchStartY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Only track pull if scrolled to top and pulling down
    if (scrollTop.current === 0 && deltaY > 0) {
      // Prevent default scrolling behavior while pulling
      e.preventDefault();

      // Apply resistance to pull distance
      const resistedDistance = Math.min(deltaY / resistance, maxPullDistance);
      const progress = Math.min((resistedDistance / threshold) * 100, 100);
      const shouldRefresh = resistedDistance >= threshold;

      setState({
        pullDistance: resistedDistance,
        isPulling: true,
        isRefreshing: false,
        progress,
        shouldRefresh,
      });
    }
  }, [enabled, threshold, maxPullDistance, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !state.isPulling) {
      reset();
      return;
    }

    touchStartY.current = 0;

    if (state.shouldRefresh) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setState({
          pullDistance: 0,
          isPulling: false,
          isRefreshing: false,
          progress: 0,
          shouldRefresh: false,
        });
      }
    } else {
      reset();
    }
  }, [enabled, state.isPulling, state.shouldRefresh, onRefresh, reset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { state, containerRef };
}

/**
 * Get inline styles for pull-to-refresh indicator
 * Use this to animate the pull indicator
 *
 * @param pullDistance - Current pull distance
 * @returns CSS-in-JS style object
 *
 * @example
 * const { state } = usePullToRefresh(...);
 * const indicatorStyle = getPullToRefreshIndicatorStyle(state.pullDistance);
 * return <div style={indicatorStyle}>↓</div>;
 */
export function getPullToRefreshIndicatorStyle(pullDistance: number): React.CSSProperties {
  return {
    transform: `translateY(${pullDistance}px)`,
    transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
    opacity: Math.min(pullDistance / 60, 1),
  };
}

/**
 * Get rotation angle for pull-to-refresh indicator based on progress
 * Useful for rotating arrow icons during pull
 *
 * @param progress - Pull progress percentage (0-100)
 * @param shouldRefresh - Whether pull threshold has been exceeded
 * @returns Rotation angle in degrees
 *
 * @example
 * const { state } = usePullToRefresh(...);
 * const rotation = getPullToRefreshRotation(state.progress, state.shouldRefresh);
 * return <ArrowIcon style={{ transform: `rotate(${rotation}deg)` }} />;
 */
export function getPullToRefreshRotation(progress: number, shouldRefresh: boolean): number {
  if (shouldRefresh) {
    return 180; // Flip arrow when ready to refresh
  }
  return progress * 1.8; // Gradually rotate 0° to 180° based on progress
}
