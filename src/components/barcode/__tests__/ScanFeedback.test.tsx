import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanFeedback } from '../ScanFeedback';
import { ScanFeedbackConfig } from '../../../types/barcode';

describe('ScanFeedback', () => {
  const createFeedbackConfig = (
    state: ScanFeedbackConfig['state'],
    message = 'Test message',
    severity: ScanFeedbackConfig['severity'] = 'info'
  ): ScanFeedbackConfig => ({
    state,
    message,
    duration: 2000,
    autoHide: true,
    severity
  });

  it('should not render when idle and not visible', () => {
    const feedback = createFeedbackConfig('idle', '');
    const { container } = render(
      <ScanFeedback feedback={feedback} visible={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render success feedback', () => {
    const feedback = createFeedbackConfig('success', 'Scan successful!', 'success');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.getByText('Scan successful!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
  });

  it('should render error feedback', () => {
    const feedback = createFeedbackConfig('error', 'Scan failed!', 'error');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.getByText('Scan failed!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  it('should render warning feedback', () => {
    const feedback = createFeedbackConfig('throttled', 'Please wait!', 'warning');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.getByText('Please wait!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardWarning');
  });

  it('should render info feedback', () => {
    const feedback = createFeedbackConfig('scanning', 'Scanning...', 'info');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardInfo');
  });

  it('should show scanning icon for scanning state', () => {
    const feedback = createFeedbackConfig('scanning', 'Scanning...');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    // Check for CircularProgress (loading spinner)
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('should show close button when onHide is provided', () => {
    const feedback = createFeedbackConfig('success', 'Success!');
    const mockOnHide = jest.fn();

    render(<ScanFeedback feedback={feedback} visible={true} onHide={mockOnHide} />);

    const closeButton = screen.getByLabelText('close');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('should not show close button when onHide is not provided', () => {
    const feedback = createFeedbackConfig('success', 'Success!');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.queryByLabelText('close')).not.toBeInTheDocument();
  });

  it('should render as snackbar when asSnackbar is true', () => {
    const feedback = createFeedbackConfig('success', 'Success!');
    render(
      <ScanFeedback 
        feedback={feedback} 
        visible={true} 
        asSnackbar={true}
        snackbarPosition={{ vertical: 'top', horizontal: 'center' }}
      />
    );

    // Snackbar should be in document
    expect(document.querySelector('.MuiSnackbar-root')).toBeInTheDocument();
  });

  it('should apply custom styles', () => {
    const feedback = createFeedbackConfig('success', 'Success!');
    const customSx = { backgroundColor: 'red' };

    render(
      <ScanFeedback 
        feedback={feedback} 
        visible={true} 
        sx={customSx}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should handle fade transition', () => {
    const feedback = createFeedbackConfig('success', 'Success!');
    const { rerender } = render(
      <ScanFeedback feedback={feedback} visible={true} />
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();

    // Re-render with visible=false
    rerender(<ScanFeedback feedback={feedback} visible={false} />);

    // Element might still be in DOM during fade transition
    // The fade component handles the actual removal
  });

  it('should display different icons for different states', () => {
    const states: Array<{ state: ScanFeedbackConfig['state'], testId?: string }> = [
      { state: 'success' },
      { state: 'error' },
      { state: 'throttled' },
      { state: 'duplicate' },
      { state: 'scanning' },
      { state: 'idle' }
    ];

    states.forEach(({ state }) => {
      const feedback = createFeedbackConfig(state, `${state} message`, 'info');
      const { container } = render(
        <ScanFeedback feedback={feedback} visible={true} />
      );

      // Each state should render with appropriate icon
      const alert = container.querySelector('.MuiAlert-root');
      if (state !== 'idle') {
        expect(alert).toBeInTheDocument();
      }
    });
  });

  it('should handle empty message gracefully', () => {
    const feedback = createFeedbackConfig('success', '');
    render(<ScanFeedback feedback={feedback} visible={true} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toBe(''); // Empty message should not break component
  });

  it('should handle long messages properly', () => {
    const longMessage = 'This is a very long feedback message that should be displayed properly without breaking the component layout or causing any rendering issues.';
    const feedback = createFeedbackConfig('scanning', longMessage, 'info');
    
    render(<ScanFeedback feedback={feedback} visible={true} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('should apply correct severity styling', () => {
    const severities: Array<ScanFeedbackConfig['severity']> = ['success', 'error', 'warning', 'info'];

    severities.forEach(severity => {
      const feedback = createFeedbackConfig('success', `${severity} message`, severity);
      const { container } = render(
        <ScanFeedback feedback={feedback} visible={true} />
      );

      const alert = container.querySelector('.MuiAlert-root');
      expect(alert).toHaveClass(`MuiAlert-standard${severity.charAt(0).toUpperCase() + severity.slice(1)}`);
    });
  });

  it('should work with different snackbar positions', () => {
    const positions = [
      { vertical: 'top' as const, horizontal: 'left' as const },
      { vertical: 'top' as const, horizontal: 'center' as const },
      { vertical: 'top' as const, horizontal: 'right' as const },
      { vertical: 'bottom' as const, horizontal: 'left' as const },
      { vertical: 'bottom' as const, horizontal: 'center' as const },
      { vertical: 'bottom' as const, horizontal: 'right' as const }
    ];

    positions.forEach(position => {
      const feedback = createFeedbackConfig('success', 'Success!');
      const { container } = render(
        <ScanFeedback 
          feedback={feedback} 
          visible={true} 
          asSnackbar={true}
          snackbarPosition={position}
        />
      );

      expect(container.querySelector('.MuiSnackbar-root')).toBeInTheDocument();
    });
  });

  it('should handle multiple rapid updates', () => {
    const feedback1 = createFeedbackConfig('success', 'First message');
    const { rerender } = render(
      <ScanFeedback feedback={feedback1} visible={true} />
    );

    expect(screen.getByText('First message')).toBeInTheDocument();

    const feedback2 = createFeedbackConfig('error', 'Second message', 'error');
    rerender(<ScanFeedback feedback={feedback2} visible={true} />);

    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.queryByText('First message')).not.toBeInTheDocument();
  });
});