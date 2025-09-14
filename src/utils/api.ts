export const CACHE_DURATIONS = {
  orders: 5 * 60 * 1000, // 5 minutes
  products: 5 * 60 * 1000, // 5 minutes
};

export const shouldFetchData = (
  lastFetched: number | null,
  items: unknown[],
  cacheDuration: number,
  isAuthenticated: boolean = true
): boolean => {
  // Don't fetch if not authenticated
  if (!isAuthenticated) return false;
  
  if (!lastFetched) return true;
  if (items.length === 0) return true;
  return Date.now() - lastFetched > cacheDuration;
};
