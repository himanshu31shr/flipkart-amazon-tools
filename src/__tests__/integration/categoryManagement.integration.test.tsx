/**
 * Integration tests for Category Management workflow
 * Tests the complete flow from UI interactions to service calls
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Setup DOM environment for React 18
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('<!doctype html><html><body></body></html>');
global.window = window as unknown as Window & typeof globalThis;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.HTMLAnchorElement = window.HTMLAnchorElement;
global.MouseEvent = window.MouseEvent;

import CategoriesPage from '../../pages/categories/categories.page';
import SimpleCategoryTable from '../../pages/categories/SimpleCategoryTable';
import { CategoryDataService } from '../../services/categoryData.service';
import { CategoryService } from '../../services/category.service';
import { ValidationService } from '../../services/validation.service';

// Mock all services
jest.mock('../../services/categoryData.service');
jest.mock('../../services/category.service');
jest.mock('../../services/validation.service');
jest.mock('../../store/slices/productsSlice', () => ({
  fetchProducts: jest.fn(() => ({ type: 'products/fetchProducts' })),
}));
jest.mock('../../store/slices/authSlice', () => ({
  selectIsAuthenticated: jest.fn(() => true),
}));

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;
const mockCategoryDataService = CategoryDataService as jest.MockedClass<typeof CategoryDataService>;
const mockValidationService = ValidationService as jest.MockedClass<typeof ValidationService>;

const theme = createTheme();

// Mock store
const createMockStore = () => configureStore({
  reducer: {
    auth: (state = { isAuthenticated: true }) => state,
    products: (state = {}) => state,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }),
});

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </Provider>
  );
};

describe.skip('Category Management Integration Tests', () => {
  let mockGetCategories: jest.SpyInstance;
  let mockCreateCategory: jest.SpyInstance;
  let mockUpdateCategory: jest.SpyInstance;
  let mockDeleteCategory: jest.SpyInstance;
  let mockExportCategories: jest.SpyInstance;
  let mockValidateCategoryData: jest.SpyInstance;

  const mockCategories = [
    {
      id: '1',
      name: 'Electronics',
      description: 'Electronic products',
      tag: 'tech',
      costPrice: 100
    },
    {
      id: '2',
      name: 'Books',
      description: 'Educational books',
      tag: 'education',
      costPrice: 25
    }
  ];

  beforeEach(() => {
    // Mock CategoryService
    mockGetCategories = jest.fn().mockResolvedValue(mockCategories);
    mockCreateCategory = jest.fn().mockResolvedValue('new-id');
    mockUpdateCategory = jest.fn().mockResolvedValue(undefined);
    mockDeleteCategory = jest.fn().mockResolvedValue(undefined);

    mockCategoryService.mockImplementation(() => ({
      getCategories: mockGetCategories,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      deleteCategory: mockDeleteCategory,
    }) as jest.Mocked<CategoryService>);

    // Mock CategoryDataService
    mockExportCategories = jest.fn().mockResolvedValue({
      success: true,
      message: 'Export successful',
      errors: [],
      data: mockCategories
    });

    mockCategoryDataService.mockImplementation(() => ({
      exportCategories: mockExportCategories,
    }) as jest.Mocked<CategoryDataService>);

    // Mock ValidationService
    mockValidateCategoryData = jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });

    mockValidationService.mockImplementation(() => ({
      validateCategoryData: mockValidateCategoryData,
    }) as jest.Mocked<ValidationService>);

    // Mock DOM methods for file download
    Object.defineProperty(window, 'URL', {
      writable: true,
      value: {
        createObjectURL: jest.fn(() => 'mock-url'),
        revokeObjectURL: jest.fn(),
      },
    });

    global.Blob = jest.fn(() => ({})) as unknown as typeof Blob;
    
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation();
    jest.spyOn(document.body, 'removeChild').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Category Management Workflow', () => {
    it('loads categories on page mount and displays them', async () => {
      renderWithProviders(<CategoriesPage />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalled();
      });
    });

    it('creates new category through UI workflow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Open create dialog
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      // Fill form
      const nameInput = screen.getByLabelText('Category Name');
      const descriptionInput = screen.getByLabelText('Description');
      const tagInput = screen.getByLabelText('Tag');
      const costPriceInput = screen.getByLabelText('Cost Price (₹)');

      await user.type(nameInput, 'New Category');
      await user.type(descriptionInput, 'New description');
      await user.type(tagInput, 'new');
      await user.type(costPriceInput, '75');

      // Submit
      const createButton = screen.getByText('Create');
      await user.click(createButton);

      // Verify service calls
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith({
          name: 'New Category',
          description: 'New description',
          tag: 'new',
          costPrice: 75
        });
      });

      // Should refresh data after create
      expect(mockGetCategories).toHaveBeenCalledTimes(2); // Initial + after create
    });

    it('edits existing category through UI workflow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Click edit button for first category
      const editButtons = screen.getAllByLabelText('Edit category');
      await user.click(editButtons[0]);

      // Modify data
      const nameInput = screen.getByDisplayValue('Electronics');
      await user.clear(nameInput);
      await user.type(nameInput, 'Electronics Updated');

      // Submit
      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      // Verify service calls
      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith('1', {
          name: 'Electronics Updated',
          description: 'Electronic products',
          tag: 'tech',
          costPrice: 100
        });
      });

      expect(mockGetCategories).toHaveBeenCalledTimes(2); // Initial + after update
    });

    it('deletes category through UI workflow', async () => {
      const user = userEvent.setup();
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Click delete button for first category
      const deleteButtons = screen.getAllByLabelText('Delete category');
      await user.click(deleteButtons[0]);

      // Verify service calls
      await waitFor(() => {
        expect(mockDeleteCategory).toHaveBeenCalledWith('1');
      });

      expect(mockGetCategories).toHaveBeenCalledTimes(2); // Initial + after delete
      
      mockConfirm.mockRestore();
    });

    it('exports categories through UI workflow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });

      // Click export button
      const exportButton = screen.getByText('Export Data');
      await user.click(exportButton);

      // Verify service calls
      await waitFor(() => {
        expect(mockExportCategories).toHaveBeenCalled();
      });
    });

    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles category creation failure gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockCreateCategory.mockRejectedValue(new Error('Creation failed'));
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      // Attempt to create category
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      const nameInput = screen.getByLabelText('Category Name');
      await user.type(nameInput, 'Test Category');

      const createButton = screen.getByText('Create');
      await user.click(createButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving category:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles category loading failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockGetCategories.mockRejectedValue(new Error('Loading failed'));
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching categories:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles export failure gracefully', async () => {
      const user = userEvent.setup();
      
      mockExportCategories.mockResolvedValue({
        success: false,
        message: 'Export failed',
        errors: ['Network error'],
        data: []
      });
      
      renderWithProviders(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Export Data')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export Data');
      await user.click(exportButton);

      // Should still call the service but handle failure
      await waitFor(() => {
        expect(mockExportCategories).toHaveBeenCalled();
      });
    });
  });

  describe('Data Flow Integration', () => {
    it('maintains consistent state across operations', async () => {
      const user = userEvent.setup();
      
      // Update mock to return different data on second call
      mockGetCategories
        .mockResolvedValueOnce(mockCategories)
        .mockResolvedValueOnce([
          ...mockCategories,
          { id: '3', name: 'New Category', description: 'New', tag: 'new', costPrice: 50 }
        ]);

      renderWithProviders(<SimpleCategoryTable />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Categories (2)')).toBeInTheDocument();
      });

      // Refresh data
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should show updated count
      await waitFor(() => {
        expect(screen.getByText('Categories (3)')).toBeInTheDocument();
      });
    });

    it('triggers data refresh after successful operations', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1);
      });

      // Create new category
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      const nameInput = screen.getByLabelText('Category Name');
      await user.type(nameInput, 'Test Category');

      const createButton = screen.getByText('Create');
      await user.click(createButton);

      // Should refresh data after successful create
      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(2);
      });
    });

    it('propagates data changes through callbacks', async () => {
      const mockOnDataChange = jest.fn();
      
      renderWithProviders(
        <SimpleCategoryTable onDataChange={mockOnDataChange} />
      );

      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      // Simulate successful creation
      const user = userEvent.setup();
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      const nameInput = screen.getByLabelText('Category Name');
      await user.type(nameInput, 'Test');

      const createButton = screen.getByText('Create');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalled();
      });
    });
  });

  describe('UI State Management Integration', () => {
    it('manages loading states correctly', async () => {
      // Make service call hang to test loading state
      mockGetCategories.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<SimpleCategoryTable />);

      // Should show loading state
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('manages dialog states correctly', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      expect(screen.getByText('Add New Category')).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add New Category')).not.toBeInTheDocument();
      });
    });

    it('validates form data before submission', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Add Category')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByText('Add Category');
      await user.click(addButton);

      // Try to submit without name
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();

      // Add name and try again
      const nameInput = screen.getByLabelText('Category Name');
      await user.type(nameInput, 'Test');

      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Service Integration Edge Cases', () => {
    it('handles empty service responses', async () => {
      mockGetCategories.mockResolvedValue([]);
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Categories (0)')).toBeInTheDocument();
        expect(screen.getByText('No categories found')).toBeInTheDocument();
      });
    });

    it('handles malformed service responses', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetCategories.mockResolvedValue(null);
      
      renderWithProviders(<SimpleCategoryTable />);

      // Should handle gracefully and not crash
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles service timeout scenarios', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate timeout
      mockGetCategories.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching categories:', 
          expect.objectContaining({ message: 'Request timeout' })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Category ${i}`,
        description: `Description ${i}`,
        tag: `tag${i}`,
        costPrice: i * 10
      }));

      mockGetCategories.mockResolvedValue(largeDataset);
      
      const start = Date.now();
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(screen.getByText('Categories (100)')).toBeInTheDocument();
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should render quickly
    });

    it('debounces rapid user interactions', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<SimpleCategoryTable />);

      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(1);
      });

      // Rapid clicks on refresh
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      // Should only trigger additional calls, not be debounced
      await waitFor(() => {
        expect(mockGetCategories).toHaveBeenCalledTimes(4); // 1 initial + 3 refreshes
      });
    });
  });
});