import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SimpleCategoryTable from '../SimpleCategoryTable';
import { CategoryService } from '../../../services/category.service';
import { CategoryGroupService } from '../../../services/categoryGroup.service';

// Mock the CategoryService
jest.mock('../../../services/category.service');

// Mock CategoryGroupService
jest.mock('../../../services/categoryGroup.service');

// Mock CategoryGroupSelector
jest.mock('../../categoryGroups/components/CategoryGroupSelector', () => {
  return function MockCategoryGroupSelector({ onChange }: { onChange: (value: string | null) => void }) {
    return (
      <div data-testid="category-group-selector">
        <button onClick={() => onChange('group-1')}>Select Group 1</button>
        <button onClick={() => onChange(null)}>Remove Group</button>
      </div>
    );
  };
});

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;
const mockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;

const theme = createTheme();

const mockCategories = [
  {
    id: '1',
    name: 'Electronics',
    description: 'Electronic products',
    tag: 'tech',
    categoryGroup: {
      id: 'group-1',
      name: 'Tech Group',
      color: '#1976d2'
    }
  },
  {
    id: '2',
    name: 'Books',
    description: 'Educational books',
    tag: 'education'
  },
  {
    id: '3',
    name: 'Clothing',
    description: 'Fashion items',
    tag: 'fashion',
    categoryGroup: {
      id: 'group-2',
      name: 'Fashion Group',
      color: '#d32f2f'
    }
  }
];

const mockGroups = [
  {
    id: 'group-1',
    name: 'Tech Group',
    color: '#1976d2',
  },
  {
    id: 'group-2', 
    name: 'Fashion Group',
    color: '#d32f2f',
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SimpleCategoryTable', () => {
  let mockGetCategoriesWithGroups: jest.SpyInstance;
  let mockCreateCategory: jest.SpyInstance;
  let mockUpdateCategory: jest.SpyInstance;
  let mockDeleteCategory: jest.SpyInstance;
  let mockAssignCategoryToGroup: jest.SpyInstance;
  let mockAssignMultipleCategoriesToGroup: jest.SpyInstance;
  let mockGetCategoryGroups: jest.SpyInstance;

  beforeEach(() => {
    mockGetCategoriesWithGroups = jest.fn().mockResolvedValue(mockCategories);
    mockCreateCategory = jest.fn().mockResolvedValue('new-id');
    mockUpdateCategory = jest.fn().mockResolvedValue(undefined);
    mockDeleteCategory = jest.fn().mockResolvedValue(undefined);
    mockAssignCategoryToGroup = jest.fn().mockResolvedValue(undefined);
    mockAssignMultipleCategoriesToGroup = jest.fn().mockResolvedValue(undefined);
    mockGetCategoryGroups = jest.fn().mockResolvedValue(mockGroups);

    mockCategoryService.mockImplementation(() => ({
      getCategoriesWithGroups: mockGetCategoriesWithGroups,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      deleteCategory: mockDeleteCategory,
      assignCategoryToGroup: mockAssignCategoryToGroup,
      assignMultipleCategoriesToGroup: mockAssignMultipleCategoriesToGroup,
    }) as jest.Mocked<CategoryService>);

    mockCategoryGroupService.mockImplementation(() => ({
      getCategoryGroups: mockGetCategoryGroups,
    }) as jest.Mocked<CategoryGroupService>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with categories', async () => {
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (3 of 3)')).toBeInTheDocument();
      });

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    });

    it('displays category details correctly', async () => {
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Check descriptions
      expect(screen.getByText('Electronic products')).toBeInTheDocument();
      expect(screen.getByText('Educational books')).toBeInTheDocument();
      expect(screen.getByText('Fashion items')).toBeInTheDocument();

      // Check tags
      expect(screen.getByText('tech')).toBeInTheDocument();
      expect(screen.getByText('education')).toBeInTheDocument();
      expect(screen.getByText('fashion')).toBeInTheDocument();

    });

    it('shows loading state', () => {
      mockGetCategoriesWithGroups.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderWithTheme(<SimpleCategoryTable />);
      
      expect(screen.getAllByRole('progressbar')).toHaveLength(2); // One in title, one in export button
    });

    it('shows empty state when no categories', async () => {
      mockGetCategoriesWithGroups.mockResolvedValue([]);
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (0 of 0)')).toBeInTheDocument();
      });

      // Wait for the table to render with empty state
      await waitFor(() => {
        expect(screen.getByText('No categories found')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    });

    it('refreshes when refreshTrigger prop changes', async () => {
      const { rerender } = renderWithTheme(<SimpleCategoryTable refreshTrigger={0} />);
      
      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(1);
      });

      rerender(
        <ThemeProvider theme={theme}>
          <SimpleCategoryTable refreshTrigger={1} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(2);
      });
    });

    it('calls onDataChange when data changes', async () => {
      const user = userEvent.setup();
      const mockOnDataChange = jest.fn();
      
      renderWithTheme(
        <SimpleCategoryTable onDataChange={mockOnDataChange} />
      );

      // Wait for categories to load first
      await waitFor(() => {
        expect(screen.getByText('Categories (3 of 3)')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Category');
      
      await act(async () => {
        await user.click(addButton);
      });

      // First, check if dialog appears with debug info
      await waitFor(() => {
        const dialogs = screen.queryAllByRole('dialog');
        if (dialogs.length === 0) {
          console.log('No dialogs found yet, DOM state:', document.body.innerHTML.slice(0, 500));
        }
        expect(dialogs.length).toBeGreaterThan(0);
      }, { timeout: 15000 });
      
      // Check for dialog title 
      await waitFor(() => {
        expect(screen.getByText('Add New Category')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Use getByRole instead of getByLabelText for better reliability
      await waitFor(() => {
        const nameInput = screen.getByRole('textbox', { name: /category name/i });
        expect(nameInput).toBeInTheDocument();
      }, { timeout: 15000 });

      // Fill form using role-based selectors
      const nameInput = screen.getByRole('textbox', { name: /category name/i });
      await act(async () => {
        await user.type(nameInput, 'Test Category');
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalled();
      }, { timeout: 5000 });
    }, 25000);
  });

  describe('Add Category Dialog', () => {
    it('opens add category dialog when Add Category button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Category');
      
      // Add debug output to see what happens when clicking
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await user.click(addButton);
      
      // Give more time for dialog to appear
      await waitFor(() => {
        // First just check if ANY dialog appears
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      }, { timeout: 10000 });

      // Once we confirm dialog exists, check for content
      expect(screen.getByText('Add New Category')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('creates new category with valid data', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      // Wait for categories to load first
      await waitFor(() => {
        expect(screen.getByText('Categories (3 of 3)')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByText('Add Category');
      await act(async () => {
        await user.click(addButton);
      });

      // Wait for dialog to appear
      await waitFor(() => {
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      }, { timeout: 15000 });
      
      // Check for dialog title first
      await waitFor(() => {
        expect(screen.getByText('Add New Category')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Use role-based selectors for all form fields
      await waitFor(() => {
        const nameInput = screen.getByRole('textbox', { name: /category name/i });
        expect(nameInput).toBeInTheDocument();
      }, { timeout: 15000 });

      // Fill form using role-based selectors
      const nameInput = screen.getByRole('textbox', { name: /category name/i });
      const descriptionInput = screen.getByRole('textbox', { name: /description/i });
      const tagInput = screen.getByRole('textbox', { name: /tag/i });
      await act(async () => {
        await user.type(nameInput, 'Test Category');
        await user.type(descriptionInput, 'Test description');
        await user.type(tagInput, 'test');
      });

      // Submit
      const createButton = screen.getByText('Create');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith({
          name: 'Test Category',
          description: 'Test description',
          tag: 'test'
        });
      }, { timeout: 5000 });
    }, 25000);

    it('disables create button when name is empty', async () => {
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Category');
      fireEvent.click(addButton);

      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      expect(screen.getByText('Add New Category')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add New Category')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Category Dialog', () => {
    it('opens edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit category');
      await user.click(editButtons[0]);

      expect(screen.getByText('Edit Category')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Electronic products')).toBeInTheDocument();
    });

    it('updates category with modified data', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Click edit button for first category
      const editButtons = screen.getAllByLabelText('Edit category');
      await user.click(editButtons[0]);

      // Modify name
      const nameInput = screen.getByDisplayValue('Electronics');
      await user.clear(nameInput);
      await user.type(nameInput, 'Electronics Updated');

      // Submit
      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith('1', {
          name: 'Electronics Updated',
          description: 'Electronic products',
          tag: 'tech'
        });
      });
    });
  });

  describe('Delete Category', () => {
    it('deletes category when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteCategory).toHaveBeenCalledWith('1');
      });

      mockConfirm.mockRestore();
    });

    it('does not delete category when delete is cancelled', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm to return false
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      await user.click(deleteButtons[0]);

      expect(mockDeleteCategory).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetCategoriesWithGroups.mockRejectedValue(new Error('Fetch failed'));
      mockGetCategoryGroups.mockRejectedValue(new Error('Groups fetch failed'));
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching categories:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles create error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();
      
      mockCreateCategory.mockRejectedValue(new Error('Create failed'));
      
      renderWithTheme(<SimpleCategoryTable />);
      
      // Wait for categories to load first
      await waitFor(() => {
        expect(screen.getByText('Categories (3 of 3)')).toBeInTheDocument();
      });

      // Open dialog and fill form
      const addButton = screen.getByText('Add Category');
      await act(async () => {
        await user.click(addButton);
      });

      await waitFor(() => {
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      }, { timeout: 15000 });
      
      // Check for dialog title first
      await waitFor(() => {
        expect(screen.getByText('Add New Category')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Use role-based selector for form field
      await waitFor(() => {
        const nameInput = screen.getByRole('textbox', { name: /category name/i });
        expect(nameInput).toBeInTheDocument();
      }, { timeout: 15000 });

      const nameInput = screen.getByRole('textbox', { name: /category name/i });
      await act(async () => {
        await user.type(nameInput, 'Test Category');
      });

      const createButton = screen.getByText('Create');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving category:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    }, 25000);

    it('handles delete error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();
      
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteCategory.mockRejectedValue(new Error('Delete failed'));
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting category:', expect.any(Error));
      });

      consoleSpy.mockRestore();
      mockConfirm.mockRestore();
    });
  });

  describe('Data Validation', () => {


    it('shows dash for empty description and tag', async () => {
      mockGetCategoriesWithGroups.mockResolvedValue([
        {
          id: '1',
          name: 'Test Category',
          description: '',
          tag: '',
        }
      ]);

      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Category')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const testRow = rows.find(row => row.textContent?.includes('Test Category'));
      expect(testRow?.textContent).toMatch(/-.*-/); // Should contain dashes for empty fields
    });
  });
});