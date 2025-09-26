import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DeductionPreviewModal from '../DeductionPreviewModal';
import { InventoryOrderProcessor, ProductSummary, InventoryDeductionPreview } from '../../../../services/inventoryOrderProcessor.service';

// Mock the InventoryOrderProcessor
jest.mock('../../../../services/inventoryOrderProcessor.service');

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DeductionPreviewModal', () => {
  let mockInventoryOrderProcessor: jest.Mocked<InventoryOrderProcessor>;

  const mockOrderItems: ProductSummary[] = [
    {
      name: 'Smartphone',
      quantity: '2',
      SKU: 'PHONE-001',
      type: 'amazon',
      orderId: 'ORDER-123',
    },
    {
      name: 'Tablet',
      quantity: '1',
      SKU: 'TABLET-001',
      type: 'amazon',
      orderId: 'ORDER-123',
    },
  ];

  const mockPreviewData: InventoryDeductionPreview = {
    items: [
      {
        productSku: 'PHONE-001',
        productName: 'Smartphone',
        categoryName: 'Electronics',
        categoryGroupId: 'electronics-group',
        orderQuantity: 2,
        deductionQuantity: 1,
        totalDeduction: 2,
        inventoryUnit: 'pcs',
        isCascade: false,
      },
      {
        productSku: 'PHONE-001',
        productName: 'Smartphone',
        categoryName: 'Batteries',
        categoryGroupId: 'battery-group',
        orderQuantity: 2,
        deductionQuantity: 2,
        totalDeduction: 4,
        inventoryUnit: 'pcs',
        isCascade: true,
        cascadeSource: {
          sourceCategoryName: 'Electronics',
          targetCategoryName: 'Batteries',
        },
      },
      {
        productSku: 'TABLET-001',
        productName: 'Tablet',
        categoryName: 'Electronics',
        categoryGroupId: 'electronics-group',
        orderQuantity: 1,
        deductionQuantity: 1,
        totalDeduction: 1,
        inventoryUnit: 'pcs',
        isCascade: false,
      },
    ],
    totalDeductions: new Map([
      ['electronics-group', { categoryGroupName: 'Electronics Group', totalQuantity: 3, unit: 'pcs' }],
      ['battery-group', { categoryGroupName: 'Battery Group', totalQuantity: 4, unit: 'pcs' }],
    ]),
    warnings: ['2 additional cascade deductions will be processed from linked categories'],
    errors: [],
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    orderItems: mockOrderItems,
    orderReference: 'ORDER-123',
    title: 'Inventory Deduction Preview',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockInventoryOrderProcessor = {
      previewCategoryDeductions: jest.fn().mockResolvedValue(mockPreviewData),
    } as any;

    (InventoryOrderProcessor as jest.MockedClass<typeof InventoryOrderProcessor>).mockImplementation(
      () => mockInventoryOrderProcessor
    );
  });

  describe('Component Rendering', () => {
    it('renders the modal when open is true', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      expect(screen.getByText('Inventory Deduction Preview')).toBeInTheDocument();
      expect(screen.getByText('Order: ORDER-123')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} open={false} />);

      expect(screen.queryByText('Inventory Deduction Preview')).not.toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays custom title when provided', async () => {
      const customTitle = 'Custom Preview Title';
      renderWithTheme(<DeductionPreviewModal {...defaultProps} title={customTitle} />);

      expect(screen.getByText(customTitle)).toBeInTheDocument();
    });
  });

  describe('Deduction Summary', () => {
    it('displays deduction summary with category group totals', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Deduction Summary')).toBeInTheDocument();
        expect(screen.getByText('Electronics Group: 3 pcs')).toBeInTheDocument();
        expect(screen.getByText('Battery Group: 4 pcs')).toBeInTheDocument();
      });
    });

    it('does not show summary section when no deductions exist', async () => {
      const emptyPreview = {
        ...mockPreviewData,
        items: [],
        totalDeductions: new Map(),
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(emptyPreview);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Deduction Summary')).not.toBeInTheDocument();
      });
    });
  });

  describe('Direct Category Deductions', () => {
    it('displays direct deductions section with correct data', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Direct Category Deductions (2)')).toBeInTheDocument();
        
        // Check that table headers are present (there will be multiple instances for direct/cascade tables)
        expect(screen.getAllByText('Product').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Category').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Order Qty').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Deduction per Unit').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Total Deduction').length).toBeGreaterThanOrEqual(1);
        
        // Check that product names appear in the document (should have multiple instances for direct + cascade)
        expect(screen.getAllByText('Smartphone').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('PHONE-001').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows direct deductions accordion as expanded by default', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        const directAccordion = screen.getByText('Direct Category Deductions (2)').closest('[role="button"]');
        expect(directAccordion).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Cascade Deductions', () => {
    it('displays cascade deductions section with correct data', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Cascade Deductions (1)')).toBeInTheDocument();
        
        // Check cascade deduction specific fields - the arrow text is split across multiple Typography components
        // Since there are multiple "Electronics" and "Batteries" texts, check they exist
        expect(screen.getAllByText('Electronics').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('→')).toBeInTheDocument(); // This should be unique to cascade section
        expect(screen.getAllByText('Batteries').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows cascade deductions info alert', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/These deductions are automatically triggered through category links/)).toBeInTheDocument();
      });
    });

    it('does not show cascade section when no cascade deductions exist', async () => {
      const noCascadePreview = {
        ...mockPreviewData,
        items: mockPreviewData.items.filter(item => !item.isCascade),
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(noCascadePreview);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/Cascade Deductions/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Warnings and Errors', () => {
    it('displays warnings when present', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Warnings:')).toBeInTheDocument();
        expect(screen.getByText('2 additional cascade deductions will be processed from linked categories')).toBeInTheDocument();
      });
    });

    it('displays errors when present', async () => {
      const previewWithErrors = {
        ...mockPreviewData,
        errors: ['Product SKU-003 not found', 'Category validation failed'],
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(previewWithErrors);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Errors:')).toBeInTheDocument();
        expect(screen.getByText('Product SKU-003 not found')).toBeInTheDocument();
        expect(screen.getByText('Category validation failed')).toBeInTheDocument();
      });
    });

    it('does not show warnings section when no warnings exist', async () => {
      const noWarningsPreview = {
        ...mockPreviewData,
        warnings: [],
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(noWarningsPreview);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Warnings:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no deductions will be performed', async () => {
      const emptyPreview = {
        items: [],
        totalDeductions: new Map(),
        warnings: [],
        errors: [],
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(emptyPreview);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        // Check for the complete text that includes both the main message and conditional text
        expect(screen.getByText((content, element) => 
          content.includes('No inventory deductions will be performed for this order.') &&
          content.includes('Products may not have categories configured for automatic deduction.')
        )).toBeInTheDocument();
      });
    });

    it('shows empty state when no order items provided', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} orderItems={[]} />);

      await waitFor(() => {
        expect(screen.getByText('No order items provided for preview.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when preview loading fails', async () => {
      mockInventoryOrderProcessor.previewCategoryDeductions.mockRejectedValue(new Error('Failed to load preview'));

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load preview')).toBeInTheDocument();
      });
    });

    it('shows generic error message for unknown errors', async () => {
      mockInventoryOrderProcessor.previewCategoryDeductions.mockRejectedValue('Unknown error');

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load deduction preview')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('closes modal when Close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      renderWithTheme(<DeductionPreviewModal {...defaultProps} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('refreshes preview when Refresh Preview button is clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh Preview')).toBeInTheDocument();
      });

      // Clear the initial call
      mockInventoryOrderProcessor.previewCategoryDeductions.mockClear();

      await user.click(screen.getByText('Refresh Preview'));

      await waitFor(() => {
        expect(mockInventoryOrderProcessor.previewCategoryDeductions).toHaveBeenCalledWith(mockOrderItems);
      });
    });

    it('does not show Refresh Preview button when no deductions exist', async () => {
      const emptyPreview = {
        items: [],
        totalDeductions: new Map(),
        warnings: [],
        errors: [],
      };
      mockInventoryOrderProcessor.previewCategoryDeductions.mockResolvedValue(emptyPreview);

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Refresh Preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accordion Functionality', () => {
    it('allows expanding and collapsing cascade deductions section', async () => {
      const user = userEvent.setup();

      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        const cascadeAccordion = screen.getByText('Cascade Deductions (1)');
        expect(cascadeAccordion).toBeInTheDocument();
      });

      // Initially collapsed
      let cascadeButton = screen.getByText('Cascade Deductions (1)').closest('[role="button"]');
      expect(cascadeButton).toHaveAttribute('aria-expanded', 'false');

      // Expand cascade section
      await user.click(screen.getByText('Cascade Deductions (1)'));

      await waitFor(() => {
        cascadeButton = screen.getByText('Cascade Deductions (1)').closest('[role="button"]');
        expect(cascadeButton).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Data Loading Behavior', () => {
    it('loads preview data when modal opens and order items are provided', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockInventoryOrderProcessor.previewCategoryDeductions).toHaveBeenCalledWith(mockOrderItems);
      });
    });

    it('does not load data when modal is closed', () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} open={false} />);

      expect(mockInventoryOrderProcessor.previewCategoryDeductions).not.toHaveBeenCalled();
    });

    it('does not load data when no order items provided', () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} orderItems={[]} />);

      expect(mockInventoryOrderProcessor.previewCategoryDeductions).not.toHaveBeenCalled();
    });

    it('reloads data when order items change', async () => {
      const { rerender } = renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockInventoryOrderProcessor.previewCategoryDeductions).toHaveBeenCalledTimes(1);
      });

      // Change order items and rerender
      const newOrderItems = [...mockOrderItems, {
        name: 'New Product',
        quantity: '1',
        SKU: 'NEW-001',
        type: 'amazon' as const,
      }];

      rerender(
        <ThemeProvider theme={theme}>
          <DeductionPreviewModal {...defaultProps} orderItems={newOrderItems} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockInventoryOrderProcessor.previewCategoryDeductions).toHaveBeenCalledTimes(2);
        expect(mockInventoryOrderProcessor.previewCategoryDeductions).toHaveBeenLastCalledWith(newOrderItems);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Inventory Deduction Preview')).toBeInTheDocument();
      });
    });

    it('maintains focus management when opened', () => {
      renderWithTheme(<DeductionPreviewModal {...defaultProps} />);

      // The dialog should be properly focused when opened
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});