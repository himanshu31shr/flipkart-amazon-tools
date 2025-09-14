import { CACHE_DURATIONS, shouldFetchData } from '../api';

describe('api utilities', () => {
  describe('CACHE_DURATIONS', () => {
    it('should have correct cache durations', () => {
      expect(CACHE_DURATIONS.orders).toBe(5 * 60 * 1000); // 5 minutes
      expect(CACHE_DURATIONS.products).toBe(5 * 60 * 1000); // 5 minutes
    });

  });

  describe('shouldFetchData', () => {
    const mockCacheDuration = 5 * 60 * 1000; // 5 minutes
    const mockItems = [{ id: 1 }, { id: 2 }];

    beforeEach(() => {
      // Mock Date.now to have consistent test results
      jest.spyOn(Date, 'now').mockReturnValue(1000000); // Fixed timestamp
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true when lastFetched is null', () => {
      expect(shouldFetchData(null, mockItems, mockCacheDuration)).toBe(true);
    });

    it('should return true when items array is empty', () => {
      const lastFetched = Date.now() - 1000; // 1 second ago
      expect(shouldFetchData(lastFetched, [], mockCacheDuration)).toBe(true);
    });

    it('should return true when cache has expired', () => {
      const lastFetched = Date.now() - (mockCacheDuration + 1000); // Cache expired
      expect(shouldFetchData(lastFetched, mockItems, mockCacheDuration)).toBe(true);
    });

    it('should return false when cache is still valid', () => {
      const lastFetched = Date.now() - (mockCacheDuration - 1000); // Cache still valid
      expect(shouldFetchData(lastFetched, mockItems, mockCacheDuration)).toBe(false);
    });

    it('should return false when lastFetched is exactly at cache duration', () => {
      const lastFetched = Date.now() - mockCacheDuration; // Exactly at cache duration
      expect(shouldFetchData(lastFetched, mockItems, mockCacheDuration)).toBe(false);
    });

    it('should handle edge case with zero cache duration', () => {
      const lastFetched = Date.now() - 1; // 1ms ago
      expect(shouldFetchData(lastFetched, mockItems, 0)).toBe(true);
    });

    it('should handle future lastFetched timestamp', () => {
      const lastFetched = Date.now() + 1000; // Future timestamp
      expect(shouldFetchData(lastFetched, mockItems, mockCacheDuration)).toBe(false);
    });
  });
}); 