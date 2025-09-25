import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { InventoryDashboard } from '../InventoryDashboard';

// Create a minimal mock store
const mockStore = configureStore({ 
  reducer: {
    inventory: (state = {
      inventoryLevels: [],
      filteredInventoryLevels: [],
      inventoryMovements: [],
      filteredInventoryMovements: [],
      inventoryAlerts: [],
      activeInventoryAlerts: [],
      loading: {
        inventoryLevels: false,
        inventoryMovements: false,
        inventoryAlerts: false,
        deduction: false,
        adjustment: false,
        alertCreation: false,
        alertAcknowledgment: false,
        alertResolution: false,
      },
      error: {
        inventoryLevels: null,
        inventoryMovements: null,
        inventoryAlerts: null,
        deduction: null,
        adjustment: null,
        alertCreation: null,
        alertAcknowledgment: null,
        alertResolution: null,
      },
      filters: { inventory: {}, movements: {} },
      pagination: {
        inventoryLevels: { currentPage: 1, pageSize: 50, totalItems: 0, hasNextPage: false },
        inventoryMovements: { currentPage: 1, pageSize: 50, totalItems: 0, hasNextPage: false },
      },
      lastFetched: { inventoryLevels: null, inventoryMovements: null, inventoryAlerts: null },
      selectedInventoryLevel: null,
      selectedMovement: null,
      selectedAlert: null,
      lastDeductionResult: null,
    }) => state,
    auth: (state = {
      user: null,
      loading: false,
      error: null,
      isAuthenticated: true,
      authStateLoaded: true,
      isLoading: false,
    }) => state,
    categoryGroups: (state = {
      groups: [],
      loading: false,
      error: null,
    }) => state,
  },
}) as any;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Provider store={mockStore}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

describe('InventoryDashboard Basic Tests', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <InventoryDashboard />
      </TestWrapper>
    );
    
    // Check that the main heading is present
    expect(screen.getByText('Inventory Management')).toBeInTheDocument();
  }) as any;
  
  test('displays basic UI elements', () => {
    render(
      <TestWrapper>
        <InventoryDashboard />
      </TestWrapper>
    );
    
    // Check for key sections
    expect(screen.getByText('Inventory Management')).toBeInTheDocument();
    expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
    expect(screen.getByText('Healthy Stock')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Zero Stock')).toBeInTheDocument();
    expect(screen.getByText('Negative Stock')).toBeInTheDocument();
  }) as any;
  
  test('displays quick action buttons', () => {
    render(
      <TestWrapper>
        <InventoryDashboard />
      </TestWrapper>
    );
    
    expect(screen.getByText('Manual Adjustment')).toBeInTheDocument();
    expect(screen.getByText('Inventory Levels')).toBeInTheDocument();
    expect(screen.getByText('Activity History')).toBeInTheDocument();
  }) as any;
  
  test('shows empty state messages when no data', () => {
    render(
      <TestWrapper>
        <InventoryDashboard />
      </TestWrapper>
    );
    
    // With empty data, should show appropriate messages
    expect(screen.getByText('No inventory levels found.')).toBeInTheDocument();
  }) as any;
}) as any;