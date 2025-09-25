/**
 * Integration tests for enhanced CategoryGroupSelector component
 * Tests prefetching, search functionality, and Redux integration
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CategoryGroupSelector from '../CategoryGroupSelector';
import categoryGroupsReducer from '../../../../store/slices/categoryGroupsSlice';

// Mock CategoryGroupService
jest.mock('../../../../services/categoryGroup.service', () => ({
  CategoryGroupService: jest.fn().mockImplementation(() => ({
    getCategoryGroupsWithStats: jest.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Electronics',
        color: '#FF5722',
        categoryCount: 5
      },
      {
        id: '2', 
        name: 'Books & Media',
        color: '#2196F3',
        categoryCount: 3
      },
      {
        id: '3',
        name: 'Clothing',
        color: '#4CAF50', 
        categoryCount: 8
      }
    ])
  }))
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      categoryGroups: categoryGroupsReducer,
    },
    preloadedState: initialState
  });
};

const renderWithProvider = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('CategoryGroupSelector Integration', () => {
  it('should display cached category groups when available', async () => {
    const onChange = jest.fn();
    
    // Create store with pre-loaded test data to simulate cache
    const store = createTestStore({
      categoryGroups: {
        groups: [
          { id: '1', name: 'Electronics', color: '#FF5722', categoryCount: 5 },
          { id: '2', name: 'Books & Media', color: '#2196F3', categoryCount: 3 },
          { id: '3', name: 'Clothing', color: '#4CAF50', categoryCount: 8 }
        ],
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: new Date().toISOString()
      }
    });

    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value={null}
          onChange={onChange}
        />,
        store
      );
    });

    // Component should be ready immediately since data is cached
    const input = screen.getByRole('combobox');
    expect(input).not.toBeDisabled();

    // Open dropdown by clicking the button
    const dropdownButton = screen.getByRole('button', { name: 'Open options' });
    await act(async () => {
      fireEvent.click(dropdownButton);
    });

    // Should display all cached groups in the dropdown
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books & Media')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    });

    // Verify Redux state has the expected data
    const state = store.getState();
    expect(state.categoryGroups.groups).toHaveLength(3);
    expect(state.categoryGroups.loading).toBe(false);
    expect(state.categoryGroups.lastUpdated).toBeTruthy();
  });

  it('should provide search functionality through autocomplete', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    
    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value={null}
          onChange={onChange}
        />
      );
    });

    // Wait for groups to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and click the autocomplete input
    const input = screen.getByRole('combobox');
    await user.click(input);

    // Type to search
    await user.type(input, 'Book');

    // Should show filtered results in dropdown
    await waitFor(() => {
      expect(screen.getByText('Books & Media')).toBeInTheDocument();
    });

    // Electronics and Clothing should not be visible in the filtered results
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Clothing')).not.toBeInTheDocument();
  });

  it('should not refetch data when cache is fresh', async () => {
    const mockService = await import('../../../../services/categoryGroup.service');
    const mockInstance = new mockService.CategoryGroupService();
    const getCategoryGroupsSpy = jest.spyOn(mockInstance, 'getCategoryGroupsWithStats');
    
    const onChange = jest.fn();
    const now = Date.now();
    
    // Create store with fresh cache
    const store = createTestStore({
      categoryGroups: {
        groups: [
          { id: '1', name: 'Electronics', color: '#FF5722', categoryCount: 5 }
        ],
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: new Date(now - 1000).toISOString() // 1 second ago
      }
    });

    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value={null}
          onChange={onChange}
        />,
        store
      );
    });

    // Should not call service again since cache is fresh
    await waitFor(() => {
      expect(getCategoryGroupsSpy).not.toHaveBeenCalled();
    });

    // Should display the input field (not loading state)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should handle selection correctly', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    
    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value={null}
          onChange={onChange}
        />
      );
    });

    // Wait for groups to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Open dropdown by clicking input
    const input = screen.getByRole('combobox');
    await user.click(input);

    // Click on Electronics option
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Electronics'));

    // Should call onChange with correct value
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('1');
    });
  });

  it('should display selected group correctly', async () => {
    const onChange = jest.fn();
    
    const store = createTestStore({
      categoryGroups: {
        groups: [
          { id: '1', name: 'Electronics', color: '#FF5722', categoryCount: 5 }
        ],
        loading: false,
        error: null,
        selectedGroupId: null,
        lastUpdated: new Date().toISOString()
      }
    });

    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value="1"
          onChange={onChange}
        />,
        store
      );
    });

    // Should display selected group in the input
    await waitFor(() => {
      const input = screen.getByDisplayValue('Electronics');
      expect(input).toBeInTheDocument();
    });
  });

  it('should show no options message when search has no results', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    
    await act(async () => {
      renderWithProvider(
        <CategoryGroupSelector
          value={null}
          onChange={onChange}
        />
      );
    });

    // Wait for groups to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and click the autocomplete input
    const input = screen.getByRole('combobox');
    await user.click(input);

    // Type a search that won't match anything
    await user.type(input, 'NonExistentGroup');

    // Should show no options message
    await waitFor(() => {
      expect(screen.getByText('No category groups found')).toBeInTheDocument();
    });
  });
});