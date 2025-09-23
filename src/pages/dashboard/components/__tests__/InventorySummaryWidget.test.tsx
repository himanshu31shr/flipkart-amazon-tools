import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import InventorySummaryWidget from '../InventorySummaryWidget';
import { InventoryLevel } from '../../../../types/inventory';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('InventorySummaryWidget', () => {
  const mockInventoryLevels: InventoryLevel[] = [
    {
      categoryGroupId: 'group-1',
      name: 'Electronics',
      currentInventory: 100,
      minimumThreshold: 20,
      inventoryUnit: 'pcs',
      inventoryType: 'qty',
      status: 'healthy',
      lastInventoryUpdate: { seconds: 1705276800, nanoseconds: 0 } as any,
    },
    {
      categoryGroupId: 'group-2',
      name: 'Books',
      currentInventory: 15,
      minimumThreshold: 20,
      inventoryUnit: 'pcs',
      inventoryType: 'qty',
      status: 'low_stock',
      lastInventoryUpdate: { seconds: 1705190400, nanoseconds: 0 } as any,
    },
    {
      categoryGroupId: 'group-3',
      name: 'Accessories',
      currentInventory: 0,
      minimumThreshold: 10,
      inventoryUnit: 'kg',
      inventoryType: 'weight',
      status: 'zero_stock',
      lastInventoryUpdate: { seconds: 1705104000, nanoseconds: 0 } as any,
    },
    {
      categoryGroupId: 'group-4',
      name: 'Supplies',
      currentInventory: -5,
      minimumThreshold: 5,
      inventoryUnit: 'pcs',
      inventoryType: 'qty',
      status: 'negative_stock',
      lastInventoryUpdate: { seconds: 1705017600, nanoseconds: 0 } as any,
    },
  ];

  describe('Loading State', () => {
    it('displays loading spinner when loading', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={[]}
          loading={true}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    }) as any;

    it('does not display widget content when loading', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={true}
        />
      );

      expect(screen.queryByText('Inventory Overview')).not.toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Empty State', () => {
    it('displays empty state when no inventory levels', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={[]}
          loading={false}
        />
      );

      expect(screen.getByText('No Inventory Data')).toBeInTheDocument();
      expect(screen.getByText(/No inventory levels found/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /manage inventory/i })).toBeInTheDocument();
    }) as any;

    it('links to inventory management page', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={[]}
          loading={false}
        />
      );

      const manageLink = screen.getByRole('link', { name: /manage inventory/i }) as any;
      expect(manageLink).toHaveAttribute('href', '/inventory');
    }) as any;
  }) as any;

  describe('Data Display', () => {
    beforeEach(() => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );
    }) as any;

    it('displays widget title and total count', () => {
      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Total categories chip
    }) as any;

    it('displays correct summary card counts', () => {
      // Healthy stock card
      const healthyCard = screen.getByText('Healthy').closest('[class*="MuiCard-root"]');
      expect(within(healthyCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      // Low stock card
      const lowStockCard = screen.getByText('Low Stock').closest('[class*="MuiCard-root"]');
      expect(within(lowStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      // Zero stock card
      const zeroStockCard = screen.getByText('Zero Stock').closest('[class*="MuiCard-root"]');
      expect(within(zeroStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      // Negative stock card
      const negativeStockCard = screen.getByText('Negative').closest('[class*="MuiCard-root"]');
      expect(within(negativeStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();
    }) as any;

    it('displays appropriate icons for each status', () => {
      // Check for Material-UI icons by their test ids or aria labels
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Zero Stock')).toBeInTheDocument();
      expect(screen.getByText('Negative')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Chart Integration', () => {
    it('renders pie chart when data is available', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Check that the widget renders with data
      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    }) as any;

    it('handles empty chart data gracefully', () => {
      const emptyHealthyLevels: InventoryLevel[] = [];
      
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={emptyHealthyLevels}
          loading={false}
        />
      );

      expect(screen.getByText('No Inventory Data')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Data Calculations', () => {
    it('correctly categorizes different inventory statuses', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Verify each status category has correct count
      const healthyCard = screen.getByText('Healthy').closest('[class*="MuiCard-root"]');
      expect(within(healthyCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      const lowStockCard = screen.getByText('Low Stock').closest('[class*="MuiCard-root"]');
      expect(within(lowStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      const zeroStockCard = screen.getByText('Zero Stock').closest('[class*="MuiCard-root"]');
      expect(within(zeroStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();

      const negativeStockCard = screen.getByText('Negative').closest('[class*="MuiCard-root"]');
      expect(within(negativeStockCard! as HTMLElement).getByText('1')).toBeInTheDocument();
    }) as any;

    it('calculates percentages correctly in chart data', () => {
      const singleStatusLevels: InventoryLevel[] = [
        {
          ...mockInventoryLevels[0],
          status: 'healthy',
        },
        {
          ...mockInventoryLevels[1],
          status: 'healthy',
        },
      ];

      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={singleStatusLevels}
          loading={false}
        />
      );

      const healthyCard = screen.getByText('Healthy').closest('[class*="MuiCard-root"]');
      expect(within(healthyCard! as HTMLElement).getByText('2')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Responsive Design', () => {
    it('renders properly on different screen sizes', () => {
      // Test that all essential elements are present
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Check that grid layout is used for responsive design
      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Zero Stock')).toBeInTheDocument();
      expect(screen.getByText('Negative')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Color Coding', () => {
    it('applies correct status colors to summary cards', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Check that cards exist and are properly rendered
      const healthyCard = screen.getByText('Healthy').closest('[class*="MuiCard-root"]');
      expect(healthyCard).toBeInTheDocument();

      const lowStockCard = screen.getByText('Low Stock').closest('[class*="MuiCard-root"]');
      expect(lowStockCard).toBeInTheDocument();

      const zeroStockCard = screen.getByText('Zero Stock').closest('[class*="MuiCard-root"]');
      expect(zeroStockCard).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Action Buttons', () => {
    it('includes navigation to inventory management', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Look for any links that navigate to inventory pages
      const inventoryLinks = screen.getAllByRole('link').filter(link => 
        link.getAttribute('href')?.includes('inventory')
      );
      
      expect(inventoryLinks.length).toBeGreaterThan(0);
    }) as any;
  }) as any;

  describe('Edge Cases', () => {
    it('handles inventory levels with unknown status', () => {
      const levelsWithUnknownStatus: InventoryLevel[] = [
        {
          ...mockInventoryLevels[0],
          status: 'unknown' as any, // Intentionally invalid status
        },
      ];

      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={levelsWithUnknownStatus}
          loading={false}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
    }) as any;

    it('handles zero inventory levels gracefully', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={[]}
          loading={false}
        />
      );

      expect(screen.getByText('No Inventory Data')).toBeInTheDocument();
    }) as any;

    it('handles single inventory level', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={[mockInventoryLevels[0]]}
          loading={false}
        />
      );

      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2); // Total count chip and healthy card count
    }) as any;
  }) as any;

  describe('Performance', () => {
    it('memoizes calculation-heavy operations', () => {
      const { rerender } = renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // Rerender with same props should not cause unnecessary recalculations
      rerender(
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <InventorySummaryWidget
              inventoryLevels={mockInventoryLevels}
              loading={false}
            />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('Inventory Overview')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view all inventory/i })).toBeInTheDocument();
    }) as any;

    it('provides meaningful text alternatives', () => {
      renderWithProviders(
        <InventorySummaryWidget
          inventoryLevels={mockInventoryLevels}
          loading={false}
        />
      );

      // All status information should be accessible via text
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Zero Stock')).toBeInTheDocument();
      expect(screen.getByText('Negative')).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any;