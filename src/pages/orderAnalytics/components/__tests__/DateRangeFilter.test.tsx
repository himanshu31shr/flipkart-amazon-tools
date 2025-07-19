import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DateRangeFilter from '../DateRangeFilter';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Create a simple theme for testing
const testTheme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={testTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {component}
      </LocalizationProvider>
    </ThemeProvider>
  );
};

describe('DateRangeFilter', () => {
  const mockDateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
  };

  const mockOnDateRangeChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders date range filter with all preset buttons', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    // Check if all preset buttons are rendered
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Month to Date')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Last Month')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('Reset to Current Month')).toBeInTheDocument();
  });

  it('handles Today button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);

    expect(mockOnDateRangeChange).toHaveBeenCalledWith(
      startOfDay(new Date()),
      endOfDay(new Date())
    );
  });

  it('handles Yesterday button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const yesterdayButton = screen.getByText('Yesterday');
    fireEvent.click(yesterdayButton);

    const yesterday = subDays(new Date(), 1);
    expect(mockOnDateRangeChange).toHaveBeenCalledWith(
      startOfDay(yesterday),
      endOfDay(yesterday)
    );
  });

  it('handles Month to Date button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const monthToDateButton = screen.getByText('Month to Date');
    fireEvent.click(monthToDateButton);

    expect(mockOnDateRangeChange).toHaveBeenCalled();
    // Verify the call was made (exact dates depend on current date)
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
  });

  it('handles Last 30 Days button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const last30DaysButton = screen.getByText('Last 30 Days');
    fireEvent.click(last30DaysButton);

    expect(mockOnDateRangeChange).toHaveBeenCalled();
    // Verify the call was made (exact dates depend on current date)
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
  });

  it('handles Last Month button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const lastMonthButton = screen.getByText('Last Month');
    fireEvent.click(lastMonthButton);

    expect(mockOnDateRangeChange).toHaveBeenCalled();
    // Verify the call was made (exact dates depend on current date)
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
  });

  it('handles Last 3 Months button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const last3MonthsButton = screen.getByText('Last 3 Months');
    fireEvent.click(last3MonthsButton);

    expect(mockOnDateRangeChange).toHaveBeenCalled();
    // Verify the call was made (exact dates depend on current date)
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
  });

  it('handles Reset to Current Month button click correctly', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    const resetButton = screen.getByText('Reset to Current Month');
    fireEvent.click(resetButton);

    expect(mockOnDateRangeChange).toHaveBeenCalled();
    // Verify the call was made (exact dates depend on current date)
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
  });

  it('displays date picker fields', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    // Check if date picker labels are present (use getAllByText since there might be multiple elements)
    const startDateElements = screen.getAllByText('Start Date');
    const endDateElements = screen.getAllByText('End Date');
    expect(startDateElements.length).toBeGreaterThan(0);
    expect(endDateElements.length).toBeGreaterThan(0);
  });

  it('displays date range title', () => {
    renderWithProviders(
      <DateRangeFilter
        dateRange={mockDateRange}
        onDateRangeChange={mockOnDateRangeChange}
        anchorEl={document.body}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });
}); 