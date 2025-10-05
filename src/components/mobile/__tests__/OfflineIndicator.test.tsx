import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import OfflineIndicator, { useNetworkStatus } from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  // Store original navigator.onLine
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('should not show indicator when online', () => {
    render(<OfflineIndicator />);

    // Offline message should not be visible
    expect(screen.queryByText('No internet connection')).not.toBeInTheDocument();
  });

  it('should show indicator when offline', () => {
    // Set offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('No internet connection')).toBeInTheDocument();
    expect(screen.getByText('Changes will sync when reconnected')).toBeInTheDocument();
  });

  it('should show custom offline message', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <OfflineIndicator offlineMessage="Connection lost - working offline" />
    );

    expect(screen.getByText('Connection lost - working offline')).toBeInTheDocument();
  });

  it('should show "back online" message when reconnected', async () => {
    const { rerender } = render(<OfflineIndicator />);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    // Wait for offline message
    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });

    // Go back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    rerender(<OfflineIndicator />);

    // Should show "back online" message
    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
    });
  });

  it('should use custom online message', async () => {
    const { rerender } = render(
      <OfflineIndicator onlineMessage="Connected!" />
    );

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });

    // Go back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    rerender(<OfflineIndicator onlineMessage="Connected!" />);

    await waitFor(() => {
      expect(screen.getByText('Connected!')).toBeInTheDocument();
    });
  });

  it('should auto-hide online message after duration', async () => {
    jest.useFakeTimers();

    const { rerender } = render(<OfflineIndicator autoHideDuration={1000} />);

    // Go offline then online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    rerender(<OfflineIndicator autoHideDuration={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Message should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('should call onStatusChange callback', async () => {
    const mockCallback = jest.fn();

    render(<OfflineIndicator onStatusChange={mockCallback} />);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
          connectionType: 'none',
        })
      );
    });

    // Go back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
        })
      );
    });
  });

  it('should render with top position', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { container } = render(<OfflineIndicator position="top" />);

    // Check that Snackbar has top positioning style
    const snackbar = container.querySelector('.MuiSnackbar-root');
    expect(snackbar).toBeInTheDocument();
  });

  it('should have accessible ARIA labels', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineIndicator />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('useNetworkStatus', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('should return initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.connectionType).toBe('unknown');
  });

  it('should update status when going offline', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.connectionType).toBe('none');
    });
  });

  it('should update status when going back online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);

    // Go online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('should track lastChanged timestamp', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    const initialTimestamp = result.current.lastChanged;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));

    // Trigger status change
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.lastChanged.getTime()).toBeGreaterThan(
        initialTimestamp.getTime()
      );
    });
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
