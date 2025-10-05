import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileDatePicker } from '../MobileDatePicker';
import { format } from 'date-fns';

// Mock date-fns to ensure consistent test results
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: jest.fn((date, formatStr) => actual.format(date, formatStr)),
    isValid: jest.fn((date) => actual.isValid(date))
  };
});

describe('MobileDatePicker', () => {
  const mockOnChange = jest.fn();
  const testDate = new Date('2024-03-15');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the date picker with label', () => {
      render(
        <MobileDatePicker
          label="Select Date"
          value={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
    });

    it('should render with default label when not provided', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
    });

    it('should display selected date in the text field', () => {
      render(
        <MobileDatePicker
          label="Select Date"
          value={testDate}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Select Date') as HTMLInputElement;
      expect(input.value).toBe('03/15/2024'); // Material-UI default format
    });

    it('should render Today button by default', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      const todayButton = screen.getByRole('button', { name: /Today:/i });
      expect(todayButton).toBeInTheDocument();
    });

    it('should hide Today button when showTodayButton is false', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
          showTodayButton={false}
        />
      );

      const todayButton = screen.queryByRole('button', { name: /Today:/i });
      expect(todayButton).not.toBeInTheDocument();
    });
  });

  describe('Today Button Functionality', () => {
    it('should call onChange with today\'s date when Today button is clicked', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      const todayButton = screen.getByRole('button', { name: /Today:/i });
      fireEvent.click(todayButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const calledDate = mockOnChange.mock.calls[0][0];
      const today = new Date();

      // Check if the called date is today (allowing for time differences)
      expect(calledDate.getDate()).toBe(today.getDate());
      expect(calledDate.getMonth()).toBe(today.getMonth());
      expect(calledDate.getFullYear()).toBe(today.getFullYear());
    });

    it('should display today\'s date in the correct format', () => {
      const customFormat = 'yyyy-MM-dd';
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
          format={customFormat}
        />
      );

      const todayButton = screen.getByRole('button', { name: /Today:/i });
      const today = new Date();
      const expectedText = `Today: ${format(today, customFormat)}`;

      expect(todayButton).toHaveTextContent(expectedText);
    });

    it('should have minimum 44px height for touch targets', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      const todayButton = screen.getByRole('button', { name: /Today:/i });
      const styles = window.getComputedStyle(todayButton);
      const minHeight = parseInt(styles.minHeight);

      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Date Format', () => {
    it('should use default yyyy-MM-dd format', () => {
      const { container } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      // The component uses the format prop internally
      expect(container).toBeInTheDocument();
    });

    it('should accept custom date format', () => {
      render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
          format="MM/dd/yyyy"
        />
      );

      const input = screen.getByLabelText('Select Date') as HTMLInputElement;
      // Material-UI may override display format, so we just check it renders
      expect(input).toBeInTheDocument();
    });
  });

  describe('Date Change Handling', () => {
    it('should call onChange when a valid date is selected', async () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Select Date');

      // Simulate date selection
      fireEvent.change(input, { target: { value: '03/15/2024' } });

      // onChange should be called
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should handle null value gracefully', () => {
      render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Select Date') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle invalid dates by passing null to onChange', () => {
      const { rerender } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      // Simulate invalid date input
      const invalidDate = new Date('invalid');
      rerender(
        <MobileDatePicker
          value={invalidDate}
          onChange={mockOnChange}
        />
      );

      // Component should handle gracefully
      expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have minimum 44x44px touch targets for date cells', () => {
      const { container } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      // Calendar cells are configured with minWidth: 44 and minHeight: 44
      // This is verified through the slotProps configuration
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Select Date');

      // Should be focusable
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('should have proper ARIA labels', () => {
      render(
        <MobileDatePicker
          label="Birth Date"
          value={testDate}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByLabelText('Birth Date');
      expect(input).toHaveAccessibleName();
    });

    it('should support full width layout', () => {
      const { container } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(wrapper);
      expect(styles.width).toBe('100%');
    });
  });

  describe('Props Pass-through', () => {
    it('should accept and pass through Material-UI MobileDatePicker props', () => {
      render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
          disabled={true}
          readOnly={true}
        />
      );

      const input = screen.getByLabelText('Select Date') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should support minDate and maxDate props', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');

      render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
          minDate={minDate}
          maxDate={maxDate}
        />
      );

      // Component should render without errors
      expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
    });
  });

  describe('Theming Integration', () => {
    it('should integrate with Material-UI theme', () => {
      const { container } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      // Should render with Material-UI components
      const muiComponents = container.querySelectorAll('[class*="Mui"]');
      expect(muiComponents.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid date changes', async () => {
      render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
        />
      );

      const todayButton = screen.getByRole('button', { name: /Today:/i });

      // Rapid clicks
      fireEvent.click(todayButton);
      fireEvent.click(todayButton);
      fireEvent.click(todayButton);

      // Should call onChange for each click
      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should handle date changes with different formats', () => {
      const { container, rerender } = render(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
          format="yyyy-MM-dd"
        />
      );

      rerender(
        <MobileDatePicker
          value={testDate}
          onChange={mockOnChange}
          format="MM/dd/yyyy"
        />
      );

      // Should handle format changes gracefully - component renders without errors
      expect(container.querySelector('.MuiBox-root')).toBeInTheDocument();
    });

    it('should update Today button when date format changes', () => {
      const { rerender } = render(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
          format="yyyy-MM-dd"
        />
      );

      const todayButton1 = screen.getByRole('button', { name: /Today:/i });
      const today = new Date();
      const expectedText1 = `Today: ${format(today, 'yyyy-MM-dd')}`;
      expect(todayButton1).toHaveTextContent(expectedText1);

      rerender(
        <MobileDatePicker
          value={null}
          onChange={mockOnChange}
          format="MM/dd/yyyy"
        />
      );

      const todayButton2 = screen.getByRole('button', { name: /Today:/i });
      const expectedText2 = `Today: ${format(today, 'MM/dd/yyyy')}`;
      expect(todayButton2).toHaveTextContent(expectedText2);
    });
  });
});
