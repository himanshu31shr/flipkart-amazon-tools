import React, { useState, useEffect, useRef } from 'react';
import { TextField, InputAdornment, IconButton, TextFieldProps } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

/**
 * Props for MobileSearchInput component
 */
export interface MobileSearchInputProps {
  /** Current search value */
  value: string;

  /** Callback when search value changes (debounced by 300ms) */
  onChange: (value: string) => void;

  /** Placeholder text (default: "Search...") */
  placeholder?: string;

  /** Whether to auto-focus on mount (default: true) */
  autoFocus?: boolean;

  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;

  /** Whether the input is disabled */
  disabled?: boolean;

  /** Additional TextField props */
  textFieldProps?: Partial<Omit<TextFieldProps, 'value' | 'onChange' | 'placeholder' | 'autoFocus' | 'disabled'>>;
}

/**
 * Mobile-optimized search input component with debouncing and clear button
 *
 * Features:
 * - Debounced onChange (300ms default) to prevent excessive rerenders
 * - Clear button that appears when text is present
 * - Auto-focus on mount to bring up mobile keyboard
 * - Touch-friendly IconButton with 44px minimum hit area
 * - Memory leak prevention with proper cleanup
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 *
 * <MobileSearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search products..."
 * />
 * ```
 */
export function MobileSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  autoFocus = true,
  debounceMs = 300,
  disabled = false,
  textFieldProps
}: MobileSearchInputProps) {
  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value);

  // Ref to store timeout ID for cleanup
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle input change with debouncing
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    // Update local state immediately for responsive UI
    setLocalValue(newValue);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout to call onChange after debounce delay
    debounceTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
      debounceTimeoutRef.current = null;
    }, debounceMs);
  };

  // Handle clear button click
  const handleClear = () => {
    setLocalValue('');

    // Clear any pending debounced onChange
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Call onChange immediately with empty string
    onChange('');
  };

  return (
    <TextField
      fullWidth
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      autoFocus={autoFocus}
      disabled={disabled}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: localValue ? (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Clear search"
              sx={{
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ) : null
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          minHeight: 48, // Touch-friendly height
        },
        '& .MuiInputBase-input': {
          fontSize: '1rem',
        },
        ...textFieldProps?.sx
      }}
      {...textFieldProps}
    />
  );
}

export default MobileSearchInput;
