import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileSearchInput } from '../MobileSearchInput';

// Mock timers for debounce testing
jest.useFakeTimers();

describe('MobileSearchInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Rendering', () => {
    it('should render search input with default placeholder', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <MobileSearchInput
          value=""
          onChange={mockOnChange}
          placeholder="Search products..."
        />
      );

      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      const { container } = render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const searchIcon = container.querySelector('[data-testid="SearchIcon"]');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<MobileSearchInput value="test query" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input.value).toBe('test query');
    });
  });

  describe('Clear Button', () => {
    it('should not show clear button when input is empty', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should show clear button when input has text', () => {
      render(<MobileSearchInput value="test" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', () => {
      render(<MobileSearchInput value="test query" onChange={mockOnChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      // onChange should be called immediately with empty string
      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should have minimum 44px touch target for clear button', () => {
      render(<MobileSearchInput value="test" onChange={mockOnChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      const styles = window.getComputedStyle(clearButton);

      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Debounced onChange', () => {
    it('should debounce onChange by 300ms by default', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');

      // Type into input
      fireEvent.change(input, { target: { value: 'test' } });

      // onChange should not be called immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Fast-forward time by 299ms (just before debounce completes)
      jest.advanceTimersByTime(299);
      expect(mockOnChange).not.toHaveBeenCalled();

      // Fast-forward remaining 1ms to complete debounce
      jest.advanceTimersByTime(1);
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });

    it('should support custom debounce delay', () => {
      render(
        <MobileSearchInput
          value=""
          onChange={mockOnChange}
          debounceMs={500}
        />
      );

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.change(input, { target: { value: 'test' } });

      // Should not be called before 500ms
      jest.advanceTimersByTime(499);
      expect(mockOnChange).not.toHaveBeenCalled();

      // Should be called after 500ms
      jest.advanceTimersByTime(1);
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });

    it('should reset debounce timer on rapid typing', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');

      // Type first character
      fireEvent.change(input, { target: { value: 't' } });
      jest.advanceTimersByTime(150);

      // Type second character before debounce completes
      fireEvent.change(input, { target: { value: 'te' } });
      jest.advanceTimersByTime(150);

      // Type third character
      fireEvent.change(input, { target: { value: 'tes' } });
      jest.advanceTimersByTime(150);

      // onChange should not have been called yet (debounce keeps resetting)
      expect(mockOnChange).not.toHaveBeenCalled();

      // Complete the final debounce
      jest.advanceTimersByTime(150);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('tes');
    });

    it('should cancel pending debounce when clear button is clicked', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');

      // Type into input
      fireEvent.change(input, { target: { value: 'test' } });

      // Wait 200ms (debounce still pending)
      jest.advanceTimersByTime(200);

      // Click clear button
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      // onChange should be called immediately with empty string
      expect(mockOnChange).toHaveBeenCalledWith('');
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      // Complete the original debounce period
      jest.advanceTimersByTime(100);

      // onChange should still only have been called once (with empty string)
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-focus', () => {
    it('should auto-focus on mount by default', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(document.activeElement).toBe(input);
    });

    it('should not auto-focus when autoFocus is false', () => {
      render(
        <MobileSearchInput
          value=""
          onChange={mockOnChange}
          autoFocus={false}
        />
      );

      const input = screen.getByPlaceholderText('Search...');
      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} disabled={true} />);

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should disable clear button when disabled', () => {
      render(
        <MobileSearchInput
          value="test"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const clearButton = screen.getByLabelText('Clear search') as HTMLButtonElement;
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should cleanup debounce timeout on unmount', () => {
      const { unmount } = render(
        <MobileSearchInput value="" onChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Search...');

      // Type into input
      fireEvent.change(input, { target: { value: 'test' } });

      // Unmount before debounce completes
      unmount();

      // Complete debounce period
      jest.advanceTimersByTime(300);

      // onChange should not be called after unmount
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount, rerender } = render(
        <MobileSearchInput value="" onChange={mockOnChange} />
      );

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.change(input, { target: { value: 'test1' } });

      // Unmount and remount
      unmount();
      rerender(<MobileSearchInput value="" onChange={mockOnChange} />);

      const newInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(newInput, { target: { value: 'test2' } });

      // Complete all debounce periods
      jest.runAllTimers();

      // Should only have been called once with the latest value
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('test2');
    });
  });

  describe('Controlled Component Pattern', () => {
    it('should sync local value with prop value changes', () => {
      const { rerender } = render(
        <MobileSearchInput value="initial" onChange={mockOnChange} />
      );

      let input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // Update prop value
      rerender(<MobileSearchInput value="updated" onChange={mockOnChange} />);

      input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
      expect(input.value).toBe('updated');
    });

    it('should show immediate UI updates while onChange is debounced', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;

      // Type into input
      fireEvent.change(input, { target: { value: 'test' } });

      // UI should update immediately (local state)
      expect(input.value).toBe('test');

      // But onChange should not be called yet
      expect(mockOnChange).not.toHaveBeenCalled();

      // Complete debounce
      jest.runAllTimers();
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have minimum 48px height for input', () => {
      const { container } = render(
        <MobileSearchInput value="" onChange={mockOnChange} />
      );

      const inputContainer = container.querySelector('.MuiOutlinedInput-root');
      expect(inputContainer).toBeInTheDocument();
    });
  });

  describe('Additional TextField Props', () => {
    it('should accept and pass through additional TextField props', () => {
      render(
        <MobileSearchInput
          value=""
          onChange={mockOnChange}
          textFieldProps={{
            'aria-label': 'Product search',
            id: 'product-search-input'
          }}
        />
      );

      const input = screen.getByLabelText('Product search');
      expect(input).toHaveAttribute('id', 'product-search-input');
    });

    it('should merge custom sx styles', () => {
      const { container } = render(
        <MobileSearchInput
          value=""
          onChange={mockOnChange}
          textFieldProps={{
            sx: {
              backgroundColor: 'red'
            }
          }}
        />
      );

      expect(container.querySelector('.MuiTextField-root')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string input', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.change(input, { target: { value: '' } });

      jest.runAllTimers();
      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should handle special characters', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      const specialChars = '!@#$%^&*()_+-={}[]|:";\'<>?,./';

      fireEvent.change(input, { target: { value: specialChars } });
      jest.runAllTimers();

      expect(mockOnChange).toHaveBeenCalledWith(specialChars);
    });

    it('should handle very long input strings', () => {
      render(<MobileSearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search...');
      const longString = 'a'.repeat(1000);

      fireEvent.change(input, { target: { value: longString } });
      jest.runAllTimers();

      expect(mockOnChange).toHaveBeenCalledWith(longString);
    });
  });
});
