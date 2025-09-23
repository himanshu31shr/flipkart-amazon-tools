import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import { CategoryForm } from '../CategoryForm';

// Mock Firebase services
jest.mock('../../../services/firebase.service');
jest.mock('../../../services/categoryGroup.service');

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CategoryForm - Inventory Deduction Configuration', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    categoryGroups: [
      {
        id: 'group-1',
        name: 'Test Group',
        description: 'Test Description',
        color: '#FF0000',
        currentInventory: 100,
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: 10,
      }
    ],
    existingTags: ['tag1', 'tag2'],
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('Initial State', () => {
    it('renders inventory deduction configuration section', () => {
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      expect(screen.getByText('Category Inventory Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure how inventory is managed for products in this category')).toBeInTheDocument();
    }) as any;

    it('shows deduction quantity field', () => {
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      expect(deductionField).toBeInTheDocument();
      expect(deductionField).toHaveValue(null);
    }) as any;

    it('shows informational alert when no deduction quantity set', () => {
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      expect(screen.getByText(/No automatic deduction/)).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Deduction Quantity Input', () => {
    it('accepts positive numbers for quantity', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      await user.clear(deductionField);
      await user.type(deductionField, '5');
      
      expect(deductionField).toHaveValue(5);
    }) as any;

    it('shows example alert when quantity is specified', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      await user.clear(deductionField);
      await user.type(deductionField, '3');
      
      await waitFor(() => {
        expect(screen.getByText(/Example/)).toBeInTheDocument();
        expect(screen.getByText(/3 pcs/)).toBeInTheDocument();
      }) as any;
    }) as any;

    it('updates helper text with correct unit', async () => {
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/deduction quantity per order \(pcs\)/i)).toBeInTheDocument();
    }) as any;
  }) as any;


  describe('Form Validation', () => {
    it('accepts minimum value of 0 for deduction quantity', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      await user.clear(deductionField);
      await user.type(deductionField, '0');
      
      expect(deductionField).toHaveValue(0);
    }) as any;
  }) as any;


  describe('Editing Existing Category', () => {
    const categoryWithDeduction = {
      id: 'cat-1',
      name: 'Existing Category',
      inventoryDeductionQuantity: 15,
      inventoryType: 'qty' as const,
      inventoryUnit: 'pcs' as const,
    };

    it('shows enabled state when editing category with deduction', () => {
      renderWithTheme(
        <CategoryForm {...defaultProps} defaultValues={categoryWithDeduction} />
      );
      
      const deductionQuantityField = screen.getByLabelText(/deduction quantity per order/i);
      expect(deductionQuantityField).toHaveValue(15);
      expect(screen.getByText(/Example/)).toBeInTheDocument();
    }) as any;

    it('pre-fills deduction quantity when editing', async () => {
      renderWithTheme(
        <CategoryForm {...defaultProps} defaultValues={categoryWithDeduction} />
      );
      
      const deductionQuantityField = screen.getByLabelText(/deduction quantity per order/i);
      expect(deductionQuantityField).toHaveValue(15);
      
      await waitFor(() => {
        expect(screen.getByText(/15 pcs/)).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe('Visual Feedback', () => {
    it('shows appropriate alert for zero deduction', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      await user.clear(deductionField);
      await user.type(deductionField, '0');
      
      await waitFor(() => {
        expect(screen.getByText(/No automatic deduction/)).toBeInTheDocument();
      }) as any;
    }) as any;

    it('shows success alert for positive deduction', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryForm {...defaultProps} />);
      
      const deductionField = screen.getByLabelText(/deduction quantity per order/i);
      await user.clear(deductionField);
      await user.type(deductionField, '10');
      
      await waitFor(() => {
        expect(screen.getByText(/Example/)).toBeInTheDocument();
        expect(screen.getByText(/10 pcs/)).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;
}) as any;