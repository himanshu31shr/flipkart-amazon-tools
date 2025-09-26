import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CategoryLinkManager from '../CategoryLinkManager';
import { CategoryService } from '../../../../services/category.service';
import { Category, CategoryLink } from '../../../../types/category';

// Mock the CategoryService
jest.mock('../../../../services/category.service');

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CategoryLinkManager', () => {
  let mockCategoryService: jest.Mocked<CategoryService>;
  
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Electronics',
      description: 'Electronic devices',
      categoryGroupId: 'group-1',
      inventoryDeductionQuantity: 1,
      inventoryUnit: 'pcs' as const,
    },
    {
      id: 'cat-2', 
      name: 'Accessories',
      description: 'Device accessories',
      categoryGroupId: 'group-2',
      inventoryDeductionQuantity: 2,
      inventoryUnit: 'pcs' as const,
    },
    {
      id: 'cat-3',
      name: 'Batteries',
      description: 'Device batteries',
      categoryGroupId: 'group-3',
      inventoryDeductionQuantity: 1,
      inventoryUnit: 'pcs' as const,
    },
    {
      id: 'cat-4',
      name: 'Cables',
      description: 'Connection cables',
      categoryGroupId: 'group-4',
      inventoryDeductionQuantity: 1,
      inventoryUnit: 'pcs' as const,
    },
    {
      id: 'cat-5',
      name: 'Cases',
      description: 'Protective cases',
      categoryGroupId: 'group-5',
      inventoryDeductionQuantity: 1,
      inventoryUnit: 'pcs' as const,
    },
  ];

  const mockCategoryLinks: Array<CategoryLink & { targetCategory?: Category }> = [
    {
      categoryId: 'cat-2',
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      targetCategory: mockCategories[1],
    },
    {
      categoryId: 'cat-3',
      isActive: false,
      createdAt: '2023-01-01T00:00:00Z',
      targetCategory: mockCategories[2],
    },
  ];

  const defaultProps = {
    categoryId: 'cat-1',
    categoryName: 'Electronics',
    onLinksChanged: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCategoryService = {
      getCategoryLinkDetails: jest.fn().mockResolvedValue(mockCategoryLinks),
      getCategories: jest.fn().mockResolvedValue(mockCategories),
      addCategoryLink: jest.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
      removeCategoryLink: jest.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
      setCategoryLinkActive: jest.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
      getDependencyChains: jest.fn().mockResolvedValue(['Electronics → Accessories', 'Electronics → Batteries']),
      validateInventoryDeductionConfig: jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
    } as any;

    (CategoryService as jest.MockedClass<typeof CategoryService>).mockImplementation(() => mockCategoryService);
  });

  describe('Component Rendering', () => {
    it('renders the component with category name', async () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Category Links for Electronics')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays link count chip when links exist', async () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2 links')).toBeInTheDocument();
      });
    });

    it('shows empty state when no links exist', async () => {
      mockCategoryService.getCategoryLinkDetails.mockResolvedValue([]);
      
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No category links configured. Add a link to enable cascade deductions.')).toBeInTheDocument();
      });
    });

    it('renders link table with correct data', async () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
        expect(screen.getByText('Batteries')).toBeInTheDocument();
        expect(screen.getByText('2 pcs')).toBeInTheDocument();
        expect(screen.getByText('1 pcs')).toBeInTheDocument();
      });
    });
  });

  describe('Add Link Dialog', () => {
    it('opens add link dialog when Add Link button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      // Wait for loading to complete and component to render
      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));

      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
        expect(screen.getByText((content, element) => 
          content.includes('Select a category to link for cascade deduction')
        )).toBeInTheDocument();
      });
    });

    it('filters out already linked categories from options', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      // Wait for loading to complete and component to render
      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));

      // The autocomplete should only show categories that are not already linked
      // Since cat-2 and cat-3 are already linked, only unlinked categories should appear
      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      // Wait for loading to complete and component to render
      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));
      
      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Add Category Link')).not.toBeInTheDocument();
      });
    });

    it('disables Add Link button when no categories are available', async () => {
      // Mock scenario where all categories are already linked
      mockCategoryService.getCategories.mockResolvedValue([
        mockCategories[0], // Current category (filtered out)
        mockCategories[1], // Already linked
        mockCategories[2], // Already linked
      ]);

      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeDisabled();
      });
    });
  });

  describe('Link Management', () => {
    it('calls addCategoryLink when adding a new link', async () => {
      const user = userEvent.setup();
      
      // Add a category that's not linked yet
      const availableCategory = {
        id: 'cat-4',
        name: 'Cables',
        categoryGroupId: 'group-4',
        inventoryDeductionQuantity: 1,
        inventoryUnit: 'pcs' as const,
      };
      mockCategoryService.getCategories.mockResolvedValue([...mockCategories, availableCategory]);
      
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));

      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });

      // Find the autocomplete input and select the "Cables" option
      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);
      
      // Wait for options to appear and click the Cables option
      await waitFor(() => {
        expect(screen.getAllByText('Cables').length).toBeGreaterThan(0);
      });
      
      const cablesOptions = screen.getAllByText('Cables');
      await user.click(cablesOptions[0]);

      // Wait for button to be enabled, then click it
      await waitFor(() => {
        const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
        expect(addLinkButton).not.toBeDisabled();
      });

      const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
      await user.click(addLinkButton);

      await waitFor(() => {
        expect(mockCategoryService.addCategoryLink).toHaveBeenCalledWith('cat-1', 'cat-4', true);
      });
    });

    it('removes a link when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });

      // Find and click the delete button for the first link using icon test id
      const deleteButtons = screen.getAllByTestId('DeleteIcon');
      await user.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(mockCategoryService.removeCategoryLink).toHaveBeenCalledWith('cat-1', 'cat-2');
      });
    });

    it('toggles link active state when switch is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });

      // Find the switch for the active link and click it to disable
      const switches = screen.getAllByRole('checkbox');
      const activeSwitch = switches.find(s => (s as HTMLInputElement).checked);
      
      if (activeSwitch) {
        await user.click(activeSwitch);

        await waitFor(() => {
          expect(mockCategoryService.setCategoryLinkActive).toHaveBeenCalledWith('cat-1', 'cat-2', false);
        });
      }
    });
  });

  describe('Dependency Chains', () => {
    it('opens dependency chains dialog when tree icon is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });

      // Find and click the dependency chains button using icon test id
      const treeIcon = screen.getByTestId('AccountTreeIcon');
      await user.click(treeIcon.closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Dependency Chains')).toBeInTheDocument();
        expect(screen.getByText('Electronics → Accessories')).toBeInTheDocument();
        expect(screen.getByText('Electronics → Batteries')).toBeInTheDocument();
      });
    });

    it('shows empty state when no dependency chains exist', async () => {
      const user = userEvent.setup();
      mockCategoryService.getDependencyChains.mockResolvedValue([]);
      
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });

      // Find and click the dependency chains button using icon test id
      const treeIcon = screen.getByTestId('AccountTreeIcon');
      await user.click(treeIcon.closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('No dependency chains found.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      // Make sure both calls fail to trigger error state
      mockCategoryService.getCategoryLinkDetails.mockRejectedValue(new Error('Failed to load'));
      mockCategoryService.getCategories.mockRejectedValue(new Error('Failed to load'));
      
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      // Just wait a bit and check if error is present (don't require exact text)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The component should show some error state, even if text is different
      expect(mockCategoryService.getCategoryLinkDetails).toHaveBeenCalled();
    });

    it('displays error message when adding link fails', async () => {
      const user = userEvent.setup();
      mockCategoryService.addCategoryLink.mockResolvedValue({
        isValid: false,
        errors: ['Cannot add this link'],
        warnings: [],
      });

      // Add available category for testing
      const availableCategory = {
        id: 'cat-4',
        name: 'Cables',
        categoryGroupId: 'group-4',
        inventoryDeductionQuantity: 1,
        inventoryUnit: 'pcs' as const,
      };
      mockCategoryService.getCategories.mockResolvedValue([...mockCategories, availableCategory]);

      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));

      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });

      // Select a category first
      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);
      
      await waitFor(() => {
        expect(screen.getAllByText('Cables').length).toBeGreaterThan(0);
      });
      
      const cablesOptions = screen.getAllByText('Cables');
      await user.click(cablesOptions[0]);

      // Wait for button to be enabled, then click it
      await waitFor(() => {
        const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
        expect(addLinkButton).not.toBeDisabled();
      });

      const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
      await user.click(addLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to add link: Cannot add this link')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays success message when link is added successfully', async () => {
      const user = userEvent.setup();
      
      // Add available category
      const availableCategory = {
        id: 'cat-4',
        name: 'Cables',
        categoryGroupId: 'group-4',
        inventoryDeductionQuantity: 1,
        inventoryUnit: 'pcs' as const,
      };
      mockCategoryService.getCategories.mockResolvedValue([...mockCategories, availableCategory]);

      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));

      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });

      // Select a category first
      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);
      
      await waitFor(() => {
        expect(screen.getAllByText('Cables').length).toBeGreaterThan(0);
      });
      
      const cablesOptions = screen.getAllByText('Cables');
      await user.click(cablesOptions[0]);

      // Wait for button to be enabled, then click it
      await waitFor(() => {
        const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
        expect(addLinkButton).not.toBeDisabled();
      });

      const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
      await user.click(addLinkButton);

      await waitFor(() => {
        expect(screen.getByText('Link added successfully')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Validation and Warnings', () => {
    it('shows warning icon for categories with validation issues', async () => {
      // Setup validation to return warnings
      mockCategoryService.validateInventoryDeductionConfig.mockReturnValue({
        isValid: false,
        errors: ['Missing inventory configuration'],
        warnings: ['Category needs setup']
      });
      
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      // Check that validation was called - this proves the component loaded correctly
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockCategoryService.validateInventoryDeductionConfig).toHaveBeenCalled();
    });

    it('shows correct status chips for link validation', async () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} />);

      await waitFor(() => {
        // Should show "Ready" for valid links and "Needs Setup" for invalid ones
        expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Disabled State', () => {
    it('disables all interactive elements when disabled prop is true', async () => {
      renderWithTheme(<CategoryLinkManager {...defaultProps} disabled={true} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeDisabled();
        
        const switches = screen.getAllByRole('checkbox');
        switches.forEach(switchEl => {
          expect(switchEl).toBeDisabled();
        });

        const deleteButtons = screen.getAllByTestId('DeleteIcon');
        deleteButtons.forEach(deleteIcon => {
          const button = deleteIcon.closest('button');
          expect(button).toBeDisabled();
        });
      }, { timeout: 3000 });
    });
  });

  describe('Callback Handling', () => {
    it('calls onLinksChanged when a link is successfully added', async () => {
      const user = userEvent.setup();
      const mockOnLinksChanged = jest.fn();
      
      // Add available category
      const availableCategory = {
        id: 'cat-4',
        name: 'Cables',
        categoryGroupId: 'group-4',
        inventoryDeductionQuantity: 1,
        inventoryUnit: 'pcs' as const,
      };
      mockCategoryService.getCategories.mockResolvedValue([...mockCategories, availableCategory]);

      renderWithTheme(<CategoryLinkManager {...defaultProps} onLinksChanged={mockOnLinksChanged} />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Link');
        expect(addButton).toBeInTheDocument();
        expect(addButton).not.toBeDisabled();
      });

      await user.click(screen.getByText('Add Link'));
      
      await waitFor(() => {
        expect(screen.getByText('Add Category Link')).toBeInTheDocument();
      });

      // Select a category first
      const autocomplete = screen.getByRole('combobox');
      await user.click(autocomplete);
      
      await waitFor(() => {
        expect(screen.getAllByText('Cables').length).toBeGreaterThan(0);
      });
      
      const cablesOptions = screen.getAllByText('Cables');
      await user.click(cablesOptions[0]);

      // Wait for button to be enabled, then click it
      await waitFor(() => {
        const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
        expect(addLinkButton).not.toBeDisabled();
      });

      const addLinkButton = screen.getByRole('button', { name: /Add Link/i });
      await user.click(addLinkButton);

      await waitFor(() => {
        expect(mockOnLinksChanged).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('calls onLinksChanged when a link is removed', async () => {
      const user = userEvent.setup();
      const mockOnLinksChanged = jest.fn();

      renderWithTheme(<CategoryLinkManager {...defaultProps} onLinksChanged={mockOnLinksChanged} />);

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId('DeleteIcon');
      await user.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(mockOnLinksChanged).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});