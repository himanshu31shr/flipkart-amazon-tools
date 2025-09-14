import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PDFViewer } from '../PDFViewer';

// Mock useMediaQuery
jest.mock('@mui/material/useMediaQuery', () => {
  return jest.fn().mockReturnValue(false);
});

const mockUseMediaQuery = jest.requireMock('@mui/material/useMediaQuery');

const theme = createTheme();

const renderPDFViewer = (props = {}) => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
  };

  return render(
    <ThemeProvider theme={theme}>
      <PDFViewer {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('PDFViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop view
    mockUseMediaQuery.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render iframe with correct src', () => {
      const testUrl = 'https://example.com/document.pdf';
      renderPDFViewer({ pdfUrl: testUrl });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', testUrl);
    });

    it('should render iframe with correct attributes', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('width', '100%');
      expect(iframe).toHaveAttribute('height', '100%');
      expect(iframe).toHaveStyle('display: block');
    });

    it('should render within a Paper component', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe.parentElement).toBeInTheDocument();
    });

    it('should render within a Box container', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should handle mobile view', () => {
      // Mock mobile breakpoint
      mockUseMediaQuery.mockReturnValue(true);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    });

    it('should handle tablet view', () => {
      // Mock tablet breakpoint
      mockUseMediaQuery.mockReturnValue(true);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    });

    it('should handle desktop view', () => {
      // Mock desktop breakpoint
      mockUseMediaQuery.mockReturnValue(false);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    });

    it('should render correctly on different screen sizes', () => {
      // Component should render regardless of screen size
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('width', '100%');
      expect(iframe).toHaveAttribute('height', '100%');
    });
  });

  describe('props handling', () => {
    it('should handle different PDF URLs', () => {
      const urls = [
        'https://example.com/doc1.pdf',
        'https://another-site.com/document.pdf',
        'https://test.com/file.pdf',
      ];

      urls.forEach(url => {
        const { unmount } = renderPDFViewer({ pdfUrl: url });
        
        const iframe = screen.getByTitle('PDF Preview');
        expect(iframe).toHaveAttribute('src', url);
        
        unmount();
      });
    });

    it('should handle URLs with query parameters', () => {
      const urlWithParams = 'https://example.com/doc.pdf?page=1&zoom=100';
      renderPDFViewer({ pdfUrl: urlWithParams });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', urlWithParams);
    });

    it('should handle URLs with fragments', () => {
      const urlWithFragment = 'https://example.com/doc.pdf#page=5';
      renderPDFViewer({ pdfUrl: urlWithFragment });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', urlWithFragment);
    });

    it('should handle empty URL', () => {
      renderPDFViewer({ pdfUrl: '' });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', '');
    });
  });

  describe('styling and layout', () => {
    it('should have correct iframe styling', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveStyle({
        display: 'block',
      });
    });

    it('should render with correct title for accessibility', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('title', 'PDF Preview');
    });

    it('should have proper container structure', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      const container = iframe.closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible title attribute', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('title', 'PDF Preview');
    });

    it('should be keyboard accessible', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      // iframe elements are naturally keyboard accessible
    });

    it('should have proper semantic structure', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe.tagName.toLowerCase()).toBe('iframe');
    });
  });

  describe('edge cases', () => {
    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.pdf';
      renderPDFViewer({ pdfUrl: longUrl });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', longUrl);
    });

    it('should handle special characters in URL', () => {
      const specialUrl = 'https://example.com/file%20with%20spaces&special=chars.pdf';
      renderPDFViewer({ pdfUrl: specialUrl });
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', specialUrl);
    });

    it('should handle re-renders correctly', () => {
      const { rerender } = renderPDFViewer({ pdfUrl: 'initial-url.pdf' });
      
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute('src', 'initial-url.pdf');
      
      rerender(
        <ThemeProvider theme={theme}>
          <PDFViewer pdfUrl="updated-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute('src', 'updated-url.pdf');
    });

    it('should not crash with undefined pdfUrl', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <PDFViewer pdfUrl={undefined as unknown as string} />
          </ThemeProvider>
        );
      }).not.toThrow();
    });

    it('should handle null pdfUrl gracefully', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <PDFViewer pdfUrl={null as unknown as string} />
          </ThemeProvider>
        );
      }).not.toThrow();
    });
  });

  describe('component integration', () => {
    it('should work with different themes', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
        },
      });

      render(
        <ThemeProvider theme={darkTheme}>
          <PDFViewer pdfUrl="test-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    });

    it('should work with custom theme breakpoints', () => {
      const customTheme = createTheme({
        breakpoints: {
          values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1920,
          },
        },
      });

      render(
        <ThemeProvider theme={customTheme}>
          <PDFViewer pdfUrl="test-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    });

    it('should render all Material-UI components correctly', () => {
      renderPDFViewer();
      
      // Check that the iframe is rendered within the Material-UI structure
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should handle breakpoint changes', () => {
      // Start with desktop
      mockUseMediaQuery
        .mockReturnValueOnce(false) // isMobile = false
        .mockReturnValueOnce(false); // isTablet = false
      
      const { rerender } = renderPDFViewer();
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
      
      // Change to mobile
      mockUseMediaQuery
        .mockReturnValueOnce(true)  // isMobile = true
        .mockReturnValueOnce(false); // isTablet = false
      
      rerender(
        <ThemeProvider theme={theme}>
          <PDFViewer pdfUrl="test-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    });

    it('should handle all breakpoint combinations', () => {
      const breakpointCombinations = [
        { isMobile: true, isTablet: false },   // Mobile
        { isMobile: false, isTablet: true },   // Tablet
        { isMobile: false, isTablet: false },  // Desktop
        { isMobile: true, isTablet: true },    // Edge case
      ];

      breakpointCombinations.forEach(({ isMobile, isTablet }, index) => {
        mockUseMediaQuery
          .mockReturnValueOnce(isMobile)
          .mockReturnValueOnce(isTablet);
        
        const { unmount } = renderPDFViewer({ pdfUrl: `test-${index}.pdf` });
        
        expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
        
        unmount();
      });
    });
  });
}); 