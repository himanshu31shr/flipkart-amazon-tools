/**
 * Unit tests for MobileTopBar component
 * Tests menu/back button behavior, title display, actions, and safe area support
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MobileTopBar } from '../MobileTopBar';
import { IconButton } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import * as mobileUtils from '../../../utils/mobile';

// Mock mobile utilities
jest.mock('../../../utils/mobile', () => ({
  getSafeAreaInsets: jest.fn(() => ({
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  })),
}));

const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('MobileTopBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with title', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument();
    });

    it('should render menu button by default', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const menuButton = screen.getByLabelText('open menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should render back button when showBackButton is true', () => {
      renderWithTheme(<MobileTopBar title="Test Page" showBackButton />);

      const backButton = screen.getByLabelText('go back');
      expect(backButton).toBeInTheDocument();
      expect(screen.queryByLabelText('open menu')).not.toBeInTheDocument();
    });

    it('should not render when hidden is true', () => {
      const { container } = renderWithTheme(<MobileTopBar title="Test Page" hidden />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('Test Page')).not.toBeInTheDocument();
    });

    it('should render with custom actions', () => {
      const actions = (
        <IconButton aria-label="search">
          <SearchIcon />
        </IconButton>
      );

      renderWithTheme(<MobileTopBar title="Test Page" actions={actions} />);

      expect(screen.getByLabelText('search')).toBeInTheDocument();
    });

    it('should not render actions when not provided', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(screen.queryByLabelText('search')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onMenuClick when menu button is clicked', () => {
      const handleMenuClick = jest.fn();
      renderWithTheme(<MobileTopBar title="Test Page" onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open menu');
      fireEvent.click(menuButton);

      expect(handleMenuClick).toHaveBeenCalledTimes(1);
    });

    it('should call onBackClick when back button is clicked', () => {
      const handleBackClick = jest.fn();
      renderWithTheme(
        <MobileTopBar title="Test Page" showBackButton onBackClick={handleBackClick} />
      );

      const backButton = screen.getByLabelText('go back');
      fireEvent.click(backButton);

      expect(handleBackClick).toHaveBeenCalledTimes(1);
    });

    it('should not crash if onMenuClick is not provided', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const menuButton = screen.getByLabelText('open menu');
      expect(() => fireEvent.click(menuButton)).not.toThrow();
    });

    it('should not crash if onBackClick is not provided', () => {
      renderWithTheme(<MobileTopBar title="Test Page" showBackButton />);

      const backButton = screen.getByLabelText('go back');
      expect(() => fireEvent.click(backButton)).not.toThrow();
    });
  });

  describe('Title Display', () => {
    it('should display title text correctly', () => {
      renderWithTheme(<MobileTopBar title="My Page Title" />);

      expect(screen.getByText('My Page Title')).toBeInTheDocument();
    });

    it('should handle long titles with ellipsis', () => {
      const longTitle = 'This is a very long title that should be truncated with ellipsis';
      renderWithTheme(<MobileTopBar title={longTitle} />);

      const titleElement = screen.getByText(longTitle);
      const styles = window.getComputedStyle(titleElement);

      expect(styles.overflow).toBe('hidden');
      expect(styles.textOverflow).toBe('ellipsis');
      expect(styles.whiteSpace).toBe('nowrap');
    });

    it('should handle empty title', () => {
      renderWithTheme(<MobileTopBar title="" />);

      // Should still render the heading element even if empty
      const heading = screen.queryByRole('heading');
      expect(heading).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      renderWithTheme(<MobileTopBar title="Test & <Title> 'Special'" />);

      expect(screen.getByText("Test & <Title> 'Special'")).toBeInTheDocument();
    });
  });

  describe('Safe Area Insets', () => {
    it('should apply safe area insets from mobile utils', () => {
      (mobileUtils.getSafeAreaInsets as jest.Mock).mockReturnValue({
        top: '44px',
        right: '0px',
        bottom: '34px',
        left: '0px',
      });

      renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(mobileUtils.getSafeAreaInsets).toHaveBeenCalled();
    });

    it('should call getSafeAreaInsets on render', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(mobileUtils.getSafeAreaInsets).toHaveBeenCalledTimes(1);
    });

    it('should handle different safe area inset values', () => {
      (mobileUtils.getSafeAreaInsets as jest.Mock).mockReturnValue({
        top: '20px',
        right: '10px',
        bottom: '0px',
        left: '10px',
      });

      const { rerender } = renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(mobileUtils.getSafeAreaInsets).toHaveBeenCalled();

      // Re-render with different insets
      (mobileUtils.getSafeAreaInsets as jest.Mock).mockReturnValue({
        top: '50px',
        right: '0px',
        bottom: '30px',
        left: '0px',
      });

      rerender(
        <ThemeProvider theme={theme}>
          <MobileTopBar title="Test Page 2" />
        </ThemeProvider>
      );

      expect(mobileUtils.getSafeAreaInsets).toHaveBeenCalled();
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have minimum 44px touch target for menu button', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const menuButton = screen.getByLabelText('open menu');
      const styles = window.getComputedStyle(menuButton);

      // Material-UI applies these via sx prop, checking they're set
      expect(menuButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });

    it('should have minimum 44px touch target for back button', () => {
      renderWithTheme(<MobileTopBar title="Test Page" showBackButton />);

      const backButton = screen.getByLabelText('go back');
      expect(backButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for menu button', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const menuButton = screen.getByLabelText('open menu');
      expect(menuButton).toHaveAttribute('aria-label', 'open menu');
    });

    it('should have proper ARIA labels for back button', () => {
      renderWithTheme(<MobileTopBar title="Test Page" showBackButton />);

      const backButton = screen.getByLabelText('go back');
      expect(backButton).toHaveAttribute('aria-label', 'go back');
    });

    it('should have heading role for title', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(screen.getByRole('heading', { name: 'Test Page' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const handleMenuClick = jest.fn();
      renderWithTheme(<MobileTopBar title="Test Page" onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open menu');
      menuButton.focus();

      expect(document.activeElement).toBe(menuButton);
    });
  });

  describe('Styling and Layout', () => {
    it('should render with sticky positioning', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const appBar = screen.getByRole('banner');
      expect(appBar).toHaveClass('MuiAppBar-positionSticky');
    });

    it('should have proper elevation', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const appBar = screen.getByRole('banner');
      expect(appBar).toHaveClass('MuiPaper-elevation2');
    });

    it('should use primary color', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const appBar = screen.getByRole('banner');
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    it('should have proper z-index for layering', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const appBar = screen.getByRole('banner');
      const styles = window.getComputedStyle(appBar);

      // Z-index should be set to 1200 (above content, below drawer)
      expect(styles.zIndex).toBe('1200');
    });

    it('should render toolbar with minimum height', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const toolbar = screen.getByRole('banner').querySelector('.MuiToolbar-root');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Actions Section', () => {
    it('should render multiple action buttons', () => {
      const actions = (
        <>
          <IconButton aria-label="search">
            <SearchIcon />
          </IconButton>
          <IconButton aria-label="filter">
            <SearchIcon />
          </IconButton>
        </>
      );

      renderWithTheme(<MobileTopBar title="Test Page" actions={actions} />);

      expect(screen.getByLabelText('search')).toBeInTheDocument();
      expect(screen.getByLabelText('filter')).toBeInTheDocument();
    });

    it('should position actions on the right side', () => {
      const actions = (
        <IconButton aria-label="search">
          <SearchIcon />
        </IconButton>
      );

      renderWithTheme(<MobileTopBar title="Test Page" actions={actions} />);

      const actionsContainer = screen.getByLabelText('search').parentElement;
      expect(actionsContainer).toHaveStyle({ display: 'flex' });
    });

    it('should handle complex action components', () => {
      const ComplexAction = () => (
        <div data-testid="complex-action">
          <IconButton aria-label="action1">
            <SearchIcon />
          </IconButton>
          <IconButton aria-label="action2">
            <SearchIcon />
          </IconButton>
        </div>
      );

      renderWithTheme(<MobileTopBar title="Test Page" actions={<ComplexAction />} />);

      expect(screen.getByTestId('complex-action')).toBeInTheDocument();
      expect(screen.getByLabelText('action1')).toBeInTheDocument();
      expect(screen.getByLabelText('action2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', () => {
      const handleMenuClick = jest.fn();
      renderWithTheme(<MobileTopBar title="Test Page" onMenuClick={handleMenuClick} />);

      const menuButton = screen.getByLabelText('open menu');

      fireEvent.click(menuButton);
      fireEvent.click(menuButton);
      fireEvent.click(menuButton);

      expect(handleMenuClick).toHaveBeenCalledTimes(3);
    });

    it('should handle switching between menu and back button', () => {
      const handleMenuClick = jest.fn();
      const handleBackClick = jest.fn();

      const { rerender } = renderWithTheme(
        <MobileTopBar title="Test Page" onMenuClick={handleMenuClick} />
      );

      fireEvent.click(screen.getByLabelText('open menu'));
      expect(handleMenuClick).toHaveBeenCalledTimes(1);

      rerender(
        <ThemeProvider theme={theme}>
          <MobileTopBar title="Test Page" showBackButton onBackClick={handleBackClick} />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByLabelText('go back'));
      expect(handleBackClick).toHaveBeenCalledTimes(1);
      expect(handleMenuClick).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should handle title updates', () => {
      const { rerender } = renderWithTheme(<MobileTopBar title="Initial Title" />);

      expect(screen.getByText('Initial Title')).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <MobileTopBar title="Updated Title" />
        </ThemeProvider>
      );

      expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('should handle hiding and showing', () => {
      const { rerender, container } = renderWithTheme(<MobileTopBar title="Test Page" />);

      expect(screen.getByText('Test Page')).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <MobileTopBar title="Test Page" hidden />
        </ThemeProvider>
      );

      expect(container.firstChild).toBeNull();

      rerender(
        <ThemeProvider theme={theme}>
          <MobileTopBar title="Test Page" hidden={false} />
        </ThemeProvider>
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });
  });

  describe('Integration with Theme', () => {
    it('should use theme primary color', () => {
      const customTheme = createTheme({
        palette: {
          primary: {
            main: '#ff0000',
          },
        },
      });

      render(
        <ThemeProvider theme={customTheme}>
          <MobileTopBar title="Test Page" />
        </ThemeProvider>
      );

      const appBar = screen.getByRole('banner');
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    it('should apply theme typography for title', () => {
      renderWithTheme(<MobileTopBar title="Test Page" />);

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('MuiTypography-h6');
    });
  });
});
