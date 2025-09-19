import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import userEvent from '@testing-library/user-event';
import { InventoryStatusChip } from '../InventoryStatusChip';
import { InventoryStatus } from '../../../types/inventory';

// Test theme
const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('InventoryStatusChip', () => {
  describe('Basic Rendering', () => {
    it('renders with healthy status', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory status: Healthy')).toBeInTheDocument();
    });

    it('renders with low_stock status', () => {
      renderWithTheme(<InventoryStatusChip status="low_stock" />);
      
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory status: Low Stock')).toBeInTheDocument();
    });

    it('renders with zero_stock status', () => {
      renderWithTheme(<InventoryStatusChip status="zero_stock" />);
      
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory status: Out of Stock')).toBeInTheDocument();
    });

    it('renders with negative_stock status', () => {
      renderWithTheme(<InventoryStatusChip status="negative_stock" />);
      
      expect(screen.getByText('Negative Stock')).toBeInTheDocument();
      expect(screen.getByLabelText('Inventory status: Negative Stock')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" size="small" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass('MuiChip-sizeSmall');
    });

    it('renders with medium size (default)', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" size="medium" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
    });

    it('defaults to medium size when not specified', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass('MuiChip-sizeMedium');
    });
  });

  describe('Visual Variants', () => {
    it('renders with filled variant (default)', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass('MuiChip-filled');
    });

    it('renders with outlined variant', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" variant="outlined" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass('MuiChip-outlined');
    });
  });

  describe('Icon Display', () => {
    it('does not show icon by default', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      const icon = chip.querySelector('.MuiChip-icon');
      expect(icon).toBeNull();
    });

    it('shows icon when showIcon is true', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" showIcon />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      const icon = chip.querySelector('.MuiChip-icon');
      expect(icon).toBeInTheDocument();
    });

    it('shows correct icons for each status', () => {
      const statuses: InventoryStatus[] = ['healthy', 'low_stock', 'zero_stock', 'negative_stock'];
      
      statuses.forEach((status) => {
        const { unmount } = renderWithTheme(
          <InventoryStatusChip status={status} showIcon />
        );
        
        const chip = screen.getByLabelText(`Inventory status: ${
          status === 'healthy' ? 'Healthy' :
          status === 'low_stock' ? 'Low Stock' :
          status === 'zero_stock' ? 'Out of Stock' :
          'Negative Stock'
        }`);
        const icon = chip.querySelector('.MuiChip-icon');
        expect(icon).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Tooltip Functionality', () => {
    it('does not show tooltip by default', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      // Tooltip should not be present in DOM initially
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows auto-generated tooltip when tooltip is true', async () => {
      const user = userEvent.setup();
      renderWithTheme(<InventoryStatusChip status="healthy" tooltip />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      await user.hover(chip);
      
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Inventory levels are adequate');
    });

    it('shows custom tooltip text', async () => {
      const user = userEvent.setup();
      const customTooltip = 'Custom tooltip message';
      renderWithTheme(
        <InventoryStatusChip status="healthy" tooltip={customTooltip} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      await user.hover(chip);
      
      expect(await screen.findByRole('tooltip')).toHaveTextContent(customTooltip);
    });

    it('shows correct auto-generated tooltips for each status', async () => {
      const user = userEvent.setup();
      const expectedTooltips = {
        healthy: 'Inventory levels are adequate',
        low_stock: 'Inventory levels are below threshold',
        zero_stock: 'No inventory available',
        negative_stock: 'Inventory levels are below zero - requires immediate attention',
      };

      for (const [status, expectedTooltip] of Object.entries(expectedTooltips)) {
        const { unmount } = renderWithTheme(
          <InventoryStatusChip status={status as InventoryStatus} tooltip />
        );
        
        const chip = screen.getByLabelText(/Inventory status:/);
        await user.hover(chip);
        
        expect(await screen.findByRole('tooltip')).toHaveTextContent(expectedTooltip);
        
        unmount();
      }
    });
  });

  describe('Interactive Functionality', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={handleClick} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      await user.click(chip);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard navigation (Enter key)', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={handleClick} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      fireEvent.keyDown(chip, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalled();
    });

    it('handles keyboard navigation (Space key)', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={handleClick} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      fireEvent.keyDown(chip, { key: ' ' });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle other keys', () => {
      const handleClick = jest.fn();
      
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={handleClick} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      fireEvent.keyDown(chip, { key: 'Escape' });
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('sets proper accessibility attributes for interactive chips', () => {
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={jest.fn()} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveAttribute('role', 'button');
      expect(chip).toHaveAttribute('tabIndex', '0');
    });

    it('does not set interactive attributes for non-interactive chips', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).not.toHaveAttribute('role', 'button');
      expect(chip).not.toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const customClass = 'custom-chip-class';
      renderWithTheme(
        <InventoryStatusChip status="healthy" className={customClass} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveClass(customClass);
    });

    it('applies correct color classes for different statuses', () => {
      const { unmount: unmount1 } = renderWithTheme(
        <InventoryStatusChip status="healthy" />
      );
      expect(screen.getByLabelText('Inventory status: Healthy')).toHaveClass('MuiChip-colorSuccess');
      unmount1();

      const { unmount: unmount2 } = renderWithTheme(
        <InventoryStatusChip status="low_stock" />
      );
      expect(screen.getByLabelText('Inventory status: Low Stock')).toHaveClass('MuiChip-colorWarning');
      unmount2();

      const { unmount: unmount3 } = renderWithTheme(
        <InventoryStatusChip status="zero_stock" />
      );
      expect(screen.getByLabelText('Inventory status: Out of Stock')).toHaveClass('MuiChip-colorError');
      unmount3();

      // negative_stock uses custom styling, not a standard MUI color class
      renderWithTheme(<InventoryStatusChip status="negative_stock" />);
      const negativeChip = screen.getByLabelText('Inventory status: Negative Stock');
      expect(negativeChip).not.toHaveClass('MuiChip-colorError');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all statuses', () => {
      const statuses: InventoryStatus[] = ['healthy', 'low_stock', 'zero_stock', 'negative_stock'];
      const expectedLabels = [
        'Inventory status: Healthy',
        'Inventory status: Low Stock',
        'Inventory status: Out of Stock',
        'Inventory status: Negative Stock',
      ];

      statuses.forEach((status, index) => {
        const { unmount } = renderWithTheme(
          <InventoryStatusChip status={status} />
        );
        
        expect(screen.getByLabelText(expectedLabels[index])).toBeInTheDocument();
        
        unmount();
      });
    });

    it('is keyboard accessible when interactive', () => {
      renderWithTheme(
        <InventoryStatusChip status="healthy" onClick={jest.fn()} />
      );
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).toHaveAttribute('tabIndex', '0');
      
      // Should be focusable
      chip.focus();
      expect(document.activeElement).toBe(chip);
    });

    it('is not focusable when not interactive', () => {
      renderWithTheme(<InventoryStatusChip status="healthy" />);
      
      const chip = screen.getByLabelText('Inventory status: Healthy');
      expect(chip).not.toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('handles all status types without errors', () => {
      const statuses: InventoryStatus[] = ['healthy', 'low_stock', 'zero_stock', 'negative_stock'];
      
      statuses.forEach((status) => {
        expect(() => {
          renderWithTheme(<InventoryStatusChip status={status} />);
        }).not.toThrow();
      });
    });

    it('works with all combinations of props', () => {
      expect(() => {
        renderWithTheme(
          <InventoryStatusChip
            status="low_stock"
            size="small"
            variant="outlined"
            showIcon
            tooltip="Custom tooltip"
            onClick={jest.fn()}
            className="test-class"
          />
        );
      }).not.toThrow();
    });
  });
});