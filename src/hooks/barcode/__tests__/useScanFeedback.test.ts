import { renderHook, act } from '@testing-library/react';
import { useScanFeedback } from '../useScanFeedback';

// Mock timers for testing feedback duration
jest.useFakeTimers();

describe('useScanFeedback', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useScanFeedback());

    expect(result.current.feedback.state).toBe('idle');
    expect(result.current.feedback.message).toBe('');
    expect(result.current.isVisible).toBe(false);
  });

  it('should show success feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess('Scan successful!');
    });

    expect(result.current.feedback.state).toBe('success');
    expect(result.current.feedback.message).toBe('Scan successful!');
    expect(result.current.feedback.severity).toBe('success');
    expect(result.current.isVisible).toBe(true);
  });

  it('should show error feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showError('Scan failed!');
    });

    expect(result.current.feedback.state).toBe('error');
    expect(result.current.feedback.message).toBe('Scan failed!');
    expect(result.current.feedback.severity).toBe('error');
    expect(result.current.isVisible).toBe(true);
  });

  it('should show warning feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showWarning('Please wait!');
    });

    expect(result.current.feedback.state).toBe('throttled');
    expect(result.current.feedback.message).toBe('Please wait!');
    expect(result.current.feedback.severity).toBe('warning');
    expect(result.current.isVisible).toBe(true);
  });

  it('should show info feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showInfo('Scanning...');
    });

    expect(result.current.feedback.state).toBe('scanning');
    expect(result.current.feedback.message).toBe('Scanning...');
    expect(result.current.feedback.severity).toBe('info');
    expect(result.current.isVisible).toBe(true);
  });

  it('should show throttled feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showThrottled('Already scanned');
    });

    expect(result.current.feedback.state).toBe('throttled');
    expect(result.current.feedback.message).toBe('Already scanned');
    expect(result.current.feedback.severity).toBe('warning');
    expect(result.current.isVisible).toBe(true);
  });

  it('should show duplicate feedback', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showDuplicate('Duplicate scan');
    });

    expect(result.current.feedback.state).toBe('duplicate');
    expect(result.current.feedback.message).toBe('Duplicate scan');
    expect(result.current.feedback.severity).toBe('warning');
    expect(result.current.isVisible).toBe(true);
  });

  it('should use default messages when none provided', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess();
    });

    expect(result.current.feedback.message).toBe('Barcode scanned successfully!');

    act(() => {
      result.current.showError();
    });

    expect(result.current.feedback.message).toBe('Failed to scan barcode');
  });

  it('should auto-hide feedback after duration', () => {
    const { result } = renderHook(() => useScanFeedback({ defaultDuration: 1000 }));

    act(() => {
      result.current.showSuccess('Success!');
    });

    expect(result.current.isVisible).toBe(true);

    // Advance time by duration
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isVisible).toBe(false);

    // Advance time for fade animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.feedback.state).toBe('idle');
  });

  it('should hide feedback immediately when hideFeedback is called', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess('Success!');
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.hideFeedback();
    });

    expect(result.current.isVisible).toBe(false);

    // Advance time for fade animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.feedback.state).toBe('idle');
  });

  it('should reset to idle immediately', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showError('Error!');
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.feedback.state).toBe('error');

    act(() => {
      result.current.resetToIdle();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.feedback.state).toBe('idle');
    expect(result.current.feedback.message).toBe('');
  });

  it('should handle custom duration', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess('Success!', 5000);
    });

    expect(result.current.feedback.duration).toBe(5000);

    // Should still be visible after default duration
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isVisible).toBe(true);

    // Should hide after custom duration
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should clear existing timeout when new feedback is shown', () => {
    const { result } = renderHook(() => useScanFeedback({ defaultDuration: 2000 }));

    act(() => {
      result.current.showSuccess('First message');
    });

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isVisible).toBe(true);

    // Show new feedback
    act(() => {
      result.current.showError('Second message');
    });

    expect(result.current.feedback.message).toBe('Second message');
    expect(result.current.feedback.state).toBe('error');

    // Original timeout should be cleared, new one should take effect
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should respect autoHide setting', () => {
    const { result } = renderHook(() => useScanFeedback({ autoHide: false }));

    act(() => {
      result.current.showSuccess('Success!');
    });

    expect(result.current.isVisible).toBe(true);

    // Should not auto-hide even after duration
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.feedback.state).toBe('success');
  });

  it('should handle zero duration', () => {
    const { result } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess('Success!', 0);
    });

    expect(result.current.isVisible).toBe(true);

    // Should not auto-hide with zero duration
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should cleanup timers on unmount', () => {
    const { result, unmount } = renderHook(() => useScanFeedback());

    act(() => {
      result.current.showSuccess('Success!');
    });

    // Unmount should clear any pending timers
    expect(() => unmount()).not.toThrow();
  });

  it('should handle rapid successive feedback calls', () => {
    const { result } = renderHook(() => useScanFeedback());

    // Rapid successive calls
    act(() => {
      result.current.showSuccess('Success 1');
      result.current.showError('Error 1');
      result.current.showWarning('Warning 1');
      result.current.showInfo('Info 1');
    });

    // Should show the last message
    expect(result.current.feedback.message).toBe('Info 1');
    expect(result.current.feedback.state).toBe('scanning');
    expect(result.current.isVisible).toBe(true);
  });

  it('should maintain feedback configuration consistency', () => {
    const { result } = renderHook(() => useScanFeedback({ 
      defaultDuration: 3000, 
      autoHide: true 
    }));

    act(() => {
      result.current.showSuccess('Test message');
    });

    const feedback = result.current.feedback;
    expect(feedback.duration).toBe(3000);
    expect(feedback.autoHide).toBe(true);
    expect(feedback.state).toBe('success');
    expect(feedback.severity).toBe('success');
  });
});