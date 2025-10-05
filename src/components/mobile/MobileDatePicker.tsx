import React from 'react';
import { MobileDatePicker as MuiMobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Button, Box, TextFieldProps } from '@mui/material';
import { format as formatDate, isValid } from 'date-fns';

/**
 * Props for MobileDatePicker component
 * Simplified to work with Date type for better TypeScript compatibility
 */
export interface MobileDatePickerProps {
  /** Current selected date value */
  value: Date | null;

  /** Callback when date changes */
  onChange: (date: Date | null) => void;

  /** Label for the date picker input */
  label?: string;

  /** Whether to show the "Today" quick action button (default: true) */
  showTodayButton?: boolean;

  /** Date format string (default: "yyyy-MM-dd") */
  format?: string;

  /** Whether the picker is disabled */
  disabled?: boolean;

  /** Whether the picker is read-only */
  readOnly?: boolean;

  /** Minimum selectable date */
  minDate?: Date;

  /** Maximum selectable date */
  maxDate?: Date;

  /** Additional TextField props */
  textFieldProps?: Partial<TextFieldProps>;
}

/**
 * Mobile-optimized date picker component with project-specific defaults
 *
 * Features:
 * - Wraps Material-UI MobileDatePicker with AdapterDateFns
 * - Default format: "yyyy-MM-dd"
 * - Optional "Today" quick action button for fast date selection
 * - Touch-optimized calendar with 44x44px minimum touch targets
 * - Keyboard accessible
 * - Graceful error handling for invalid dates
 *
 * @example
 * ```tsx
 * <MobileDatePicker
 *   label="Select Date"
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   showTodayButton={true}
 * />
 * ```
 */
export function MobileDatePicker({
  value,
  onChange,
  showTodayButton = true,
  format: dateFormat = 'yyyy-MM-dd',
  label = 'Select Date',
  disabled,
  readOnly,
  minDate,
  maxDate,
  textFieldProps
}: MobileDatePickerProps) {
  const handleTodayClick = () => {
    const today = new Date();
    onChange(today);
  };

  // Validate date and handle errors gracefully
  const handleDateChange = (newDate: Date | null) => {
    // If date is invalid, pass null to onChange
    if (newDate && !isValid(newDate)) {
      onChange(null);
      return;
    }
    onChange(newDate);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <MuiMobileDatePicker
          label={label}
          value={value}
          onChange={handleDateChange}
          format={dateFormat}
          disabled={disabled}
          readOnly={readOnly}
          minDate={minDate}
          maxDate={maxDate}
          slotProps={{
            textField: {
              fullWidth: true,
              ...textFieldProps,
              sx: {
                '& .MuiInputBase-input': {
                  fontSize: '1rem',
                  minHeight: 24
                },
                ...textFieldProps?.sx
              }
            }
          }}
        />

        {/* Today Quick Action Button */}
        {showTodayButton && (
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleTodayClick}
              fullWidth
              disabled={disabled}
              sx={{
                minHeight: 44, // Touch-friendly height
                textTransform: 'none'
              }}
            >
              Today: {formatDate(new Date(), dateFormat)}
            </Button>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}

export default MobileDatePicker;
