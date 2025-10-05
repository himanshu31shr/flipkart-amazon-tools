import { useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
  /** Callback to load more data */
  onLoadMore: () => void | Promise<void>;

  /** Whether data is currently loading */
  isLoading: boolean;

  /** Whether there is more data to load */
  hasMore: boolean;

  /** Distance from bottom in pixels to trigger load (default: 100) */
  threshold?: number;
}

/**
 * Hook for infinite scroll functionality using Intersection Observer
 * Triggers loadMore callback when user scrolls near bottom of container
 *
 * @example
 * const { sentinelRef } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   isLoading,
 *   hasMore
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={sentinelRef} />
 *   </div>
 * );
 */
export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 100
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && !isLoading && hasMore) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoading, hasMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: `${threshold}px`,
      threshold: 0.1
    });

    observerRef.current.observe(sentinel);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersect, threshold]);

  return { sentinelRef };
}

export default useInfiniteScroll;
