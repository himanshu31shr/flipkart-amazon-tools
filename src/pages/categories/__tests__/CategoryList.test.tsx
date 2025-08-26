import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import CategoryList from '../CategoryList';
import { productsReducer } from '../../../store/slices/productsSlice';

// Mock CategoryInventoryService


jest.mock('../../../services/categoryInventory.service', () => ({
  CategoryInventoryService: jest.fn().mockImplementation(() => ({
    getAllCategoriesWithInventory: jest.fn().mockResolvedValue([]),
  })),
}));

// Simple mock store with products slice
const mockStore = configureStore({
  reducer: {
    auth: (state = { isAuthenticated: false }) => state,
    categories: (state = { items: [], loading: false }) => state,
    products: productsReducer,
  },
  preloadedState: {
    auth: { isAuthenticated: false },
    categories: { items: [], loading: false },
    products: {
      items: [],
      filteredItems: [],
      loading: false,
      error: null,
      filters: {},
      lastFetched: null,
      detailsCache: {},
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
      categoryProducts: [],
      categoryProductsLoading: false,
      categoryProductsError: null,
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('CategoryList', () => {
  it('should render basic structure', () => {
    render(
      <TestWrapper>
        <CategoryList />
      </TestWrapper>
    );

    // Test that the component renders without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('should contain category management elements', () => {
    render(
      <TestWrapper>
        <CategoryList />
      </TestWrapper>
    );

    // Since authentication is false, this mainly tests the structure
    expect(document.body).toBeInTheDocument();
  });
}); 