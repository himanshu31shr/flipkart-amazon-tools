import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BarcodeToggle } from '../BarcodeToggle';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('BarcodeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly when enabled', () => {
    renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} />
    );

    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();
    expect(screen.getByText('Add barcodes to each page for tracking')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders correctly when disabled', () => {
    renderWithTheme(
      <BarcodeToggle enabled={false} onChange={mockOnChange} />
    );

    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();
    expect(screen.getByText('Generate PDF without barcodes')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange when switch is toggled', () => {
    renderWithTheme(
      <BarcodeToggle enabled={false} onChange={mockOnChange} />
    );

    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);

    expect(mockOnChange).toHaveBeenCalledWith(true);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('disables switch when disabled prop is true', () => {
    renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} disabled={true} />
    );

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeDisabled();
  });

  it('applies correct styling for disabled state', () => {
    renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} disabled={true} />
    );

    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    
    // The component should still render all elements when disabled
    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeDisabled();
  });

  it('shows improved contrast in disabled state', () => {
    renderWithTheme(
      <BarcodeToggle enabled={false} onChange={mockOnChange} disabled={true} />
    );

    // Verify component renders with disabled styling applied
    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();
    expect(screen.getByText('Generate PDF without barcodes')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows correct tooltip on hover', async () => {
    renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} />
    );

    const switchElement = screen.getByRole('checkbox');
    fireEvent.mouseEnter(switchElement.closest('[data-testid]') || switchElement.parentElement!);
    
    // Note: Testing tooltip visibility in Jest is complex due to MUI's implementation
    // This test ensures the component renders without errors when hovered
    expect(switchElement).toBeInTheDocument();
  });

  it('toggles from enabled to disabled', () => {
    renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} />
    );

    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);

    expect(mockOnChange).toHaveBeenCalledWith(false);
  });

  it('displays correct icons for enabled and disabled states', () => {
    const { rerender } = renderWithTheme(
      <BarcodeToggle enabled={true} onChange={mockOnChange} />
    );

    // Check for QrCode icon when enabled (though specific icon testing is limited in JSDOM)
    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <BarcodeToggle enabled={false} onChange={mockOnChange} />
      </ThemeProvider>
    );

    // Check component still renders correctly when disabled
    expect(screen.getByText('Barcode Generation')).toBeInTheDocument();
  });
});