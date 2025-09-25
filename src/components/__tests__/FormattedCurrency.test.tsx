import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedCurrency } from '../FormattedCurrency';

describe('FormattedCurrency', () => {
  it('should render formatted currency value', () => {
    render(<FormattedCurrency value={99.99} />);
    
    // Check if the formatted currency is displayed
    expect(screen.getByText('₹99.99')).toBeInTheDocument();
  }) as any;

  it('should render zero value correctly', () => {
    render(<FormattedCurrency value={0} />);
    
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
  }) as any;

  it('should render negative values correctly', () => {
    render(<FormattedCurrency value={-50.25} />);
    
    expect(screen.getByText('-₹50.25')).toBeInTheDocument();
  }) as any;

  it('should render large numbers with proper formatting', () => {
    render(<FormattedCurrency value={1000000} />);
    
    // US formatting uses commas every 3 digits, not Indian lakh system
    expect(screen.getByText('₹1,000,000.00')).toBeInTheDocument();
  }) as any;

  it('should apply default color when no color prop is provided', () => {
    render(<FormattedCurrency value={100} />);
    
    const element = screen.getByText('₹100.00');
    expect(element).toHaveStyle('color: inherit');
  }) as any;

  it('should apply custom color when color prop is provided', () => {
    render(<FormattedCurrency value={100} color="red" />);
    
    const element = screen.getByText('₹100.00');
    expect(element).toHaveStyle('color: red');
  }) as any;

  it('should handle decimal values correctly', () => {
    render(<FormattedCurrency value={123.456} />);
    
    // Should round to 2 decimal places
    expect(screen.getByText('₹123.46')).toBeInTheDocument();
  }) as any;

  it('should render as a span element', () => {
    render(<FormattedCurrency value={50} />);
    
    const element = screen.getByText('₹50.00');
    expect(element.tagName).toBe('SPAN');
  }) as any;

  it('should handle very small decimal values', () => {
    render(<FormattedCurrency value={0.01} />);
    
    expect(screen.getByText('₹0.01')).toBeInTheDocument();
  }) as any;

  it('should handle edge case with undefined color', () => {
    render(<FormattedCurrency value={100} color={undefined} />);
    
    const element = screen.getByText('₹100.00');
    expect(element).toHaveStyle('color: inherit');
  }) as any;
}) as any; 