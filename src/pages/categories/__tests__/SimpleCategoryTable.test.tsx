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
}) as any;

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
  }) as any;

  afterEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('Component Rendering', () => {
    it('renders the component with categories', async () => {
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (3 of 3)')).toBeInTheDocument();
      }) as any;

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    }) as any;

    it('displays category details correctly', async () => {
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      }) as any;

      // Check descriptions
      expect(screen.getByText('Electronic products')).toBeInTheDocument();
      expect(screen.getByText('Educational books')).toBeInTheDocument();
      expect(screen.getByText('Fashion items')).toBeInTheDocument();

      // Check tags
      expect(screen.getByText('tech')).toBeInTheDocument();
      expect(screen.getByText('education')).toBeInTheDocument();
      expect(screen.getByText('fashion')).toBeInTheDocument();

    }) as any;

    it('shows loading state', () => {
      mockGetCategoriesWithGroups.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderWithTheme(<SimpleCategoryTable />);
      
      expect(screen.getAllByRole('progressbar')).toHaveLength(2); // One in title, one in export button
    }) as any;

    it('shows empty state when no categories', async () => {
      mockGetCategoriesWithGroups.mockResolvedValue([]);
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (0 of 0)')).toBeInTheDocument();
      }) as any;

      // Wait for the table to render with empty state
      await waitFor(() => {
        expect(screen.getByText('No categories found')).toBeInTheDocument();
      }, { timeout: 2000 }) as any;
    }) as any;
  }) as any;

  describe('Refresh Functionality', () => {
    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(1);
      }) as any;

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 }) as any;
    }) as any;

    it('refreshes when refreshTrigger prop changes', async () => {
      const { rerender } = renderWithTheme(<SimpleCategoryTable refreshTrigger={0} />);
      
      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(1);
      }) as any;

      rerender(
        <ThemeProvider theme={theme}>
          <SimpleCategoryTable refreshTrigger={1} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(2);
      }) as any;
    }) as any;

  }) as any;

  describe('Add Category Dialog', () => {
    it('opens add category dialog when Add Category button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(<SimpleCategoryTable />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      }) as any;

      const addButton = screen.getByText('Add Category');
      
      // Add debug output to see what happens when clicking
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await user.click(addButton);
      
      // Give more time for dialog to appear
      await waitFor(() => {
        // First just check if ANY dialog appears
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs.length).toBeGreaterThan(0);
      }, { timeout: 10000 }) as any;

      // Once we confirm dialog exists, check for content
      expect(screen.getByText('Add New Category')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    }) as any;
  }) as any;

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
      }) as any;

      const rows = screen.getAllByRole('row');
      const testRow = rows.find(row => row.textContent?.includes('Test Category'));
      expect(testRow?.textContent).toMatch(/-.*-/); // Should contain dashes for empty fields
    }) as any;
  }) as any;
}) as any;