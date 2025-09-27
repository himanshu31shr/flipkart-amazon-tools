import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SimpleCategoryTable from '../SimpleCategoryTable';
import { CategoryService } from '../../../services/category.service';
import { CategoryGroupService } from '../../../services/categoryGroup.service';
import categoryGroupsReducer from '../../../store/slices/categoryGroupsSlice';

// Mock the CategoryService
jest.mock('../../../services/category.service');

// Mock CategoryGroupService
jest.mock('../../../services/categoryGroup.service', () => ({
  CategoryGroupService: jest.fn().mockImplementation(() => ({
    getCategoryGroupsWithStats: jest.fn().mockResolvedValue([
      {
        id: 'group-1',
        name: 'Tech Group',
        color: '#1976d2',
        categoryCount: 5
      },
      {
        id: 'group-2',
        name: 'Fashion Group',
        color: '#d32f2f',
        categoryCount: 3
      }
    ])
  }))
}));

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

// Mock CategoryGroupFilterSelector
jest.mock('../../categoryGroups/components/CategoryGroupFilterSelector', () => {
  return function MockCategoryGroupFilterSelector({ 
    value, 
    onChange 
  }: { 
    value: string | 'all' | 'assigned' | 'unassigned'; 
    onChange: (value: string | 'all' | 'assigned' | 'unassigned') => void;
  }) {
    return (
      <div data-testid="category-group-filter-selector">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value as any)}
          data-testid="filter-select"
        >
          <option value="all">All Categories</option>
          <option value="assigned">With Groups</option>
          <option value="unassigned">Without Groups</option>
          <option value="group-1">Tech Group</option>
          <option value="group-2">Fashion Group</option>
        </select>
      </div>
    );
  };
}) as any;

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;
const mockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;

const theme = createTheme();

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      categoryGroups: categoryGroupsReducer,
    },
    preloadedState: initialState
  });
};

const mockCategories = [
  {
    id: '1',
    name: 'Electronics',
    description: 'Electronic products',
    tag: 'tech',
    linkedCategories: [
      { categoryId: '2', isActive: true },
      { categoryId: '3', isActive: false }
    ],
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
    tag: 'education',
    linkedCategories: [
      { categoryId: '1', isActive: true }
    ]
  },
  {
    id: '3',
    name: 'Clothing',
    description: 'Fashion items',
    tag: 'fashion',
    linkedCategories: [],
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

const renderWithTheme = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </Provider>
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
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (3)')).toBeInTheDocument();
      }) as any;

      expect(screen.getAllByText('Electronics')).toHaveLength(2); // Name and linked category
      expect(screen.getAllByText('Books')).toHaveLength(2); // Name and linked category  
      expect(screen.getAllByText('Clothing')).toHaveLength(2); // Name and linked category
    }) as any;

    it('displays category details correctly', async () => {
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
      await waitFor(() => {
        expect(screen.getAllByText('Electronics')).toHaveLength(2); // Name and linked category
      }) as any;

      // Check linked categories (replaced tags column)
      expect(screen.getAllByText('Books')).toHaveLength(2); // Name and linked category
      expect(screen.getByText('None')).toBeInTheDocument(); // Clothing has no links

      // Check category groups
      expect(screen.getByText('Tech Group')).toBeInTheDocument();
      expect(screen.getByText('Fashion Group')).toBeInTheDocument();

    }) as any;

    it('shows loading state', () => {
      mockGetCategoriesWithGroups.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const store = createTestStore({
        categoryGroups: {
          groups: [],
          loading: true,
          error: null,
          selectedGroupId: null,
          lastUpdated: null
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
      expect(screen.getAllByRole('progressbar')).toHaveLength(2); // One in title, one in export button
    }) as any;

    it('shows empty state when no categories', async () => {
      mockGetCategoriesWithGroups.mockResolvedValue([]);
      
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
      await waitFor(() => {
        expect(screen.getByText('Categories (0)')).toBeInTheDocument();
      }) as any;

      // The DataTable shows no data row instead of a custom empty state message
      // So we just verify the categories count is 0
      expect(screen.getByText('Categories (0)')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Refresh Functionality', () => {
    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
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
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      const { rerender } = renderWithTheme(<SimpleCategoryTable refreshTrigger={0} />, store);
      
      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(1);
      }) as any;

      rerender(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <SimpleCategoryTable refreshTrigger={1} />
          </ThemeProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(mockGetCategoriesWithGroups).toHaveBeenCalledTimes(2);
      }) as any;
    }) as any;

  }) as any;

  describe('Add Category Dialog', () => {
    it('opens add category dialog when Add Category button is clicked', async () => {
      const user = userEvent.setup();
      
      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
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


    it('shows "None" for empty linkedCategories', async () => {
      mockGetCategoriesWithGroups.mockResolvedValue([
        {
          id: '1',
          name: 'Test Category',
          description: '',
          tag: '',
          linkedCategories: [],
        }
      ]);

      const store = createTestStore({
        categoryGroups: {
          groups: mockGroups,
          loading: false,
          error: null,
          selectedGroupId: null,
          lastUpdated: new Date().toISOString()
        }
      });
      renderWithTheme(<SimpleCategoryTable />, store);
      
      await waitFor(() => {
        expect(screen.getByText('Test Category')).toBeInTheDocument();
      }) as any;

      // Check that "None" appears for empty linkedCategories
      const rows = screen.getAllByRole('row');
      const testRow = rows.find(row => row.textContent?.includes('Test Category'));
      expect(testRow?.textContent).toMatch(/None/); // Should contain "None" for empty linkedCategories
    }) as any;
  }) as any;
}) as any;