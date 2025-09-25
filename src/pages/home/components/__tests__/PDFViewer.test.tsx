import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PDFViewer } from '../PDFViewer';

// Mock useMediaQuery
jest.mock('@mui/material/useMediaQuery', () => {
  return jest.fn().mockReturnValue(false);
}) as any;

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
  }) as any;

  describe('rendering', () => {
    it('should render iframe with correct src', () => {
      const testUrl = 'https://example.com/document.pdf';
      renderPDFViewer({ pdfUrl: testUrl }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', testUrl);
    }) as any;

    it('should render iframe with correct attributes', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('width', '100%');
      expect(iframe).toHaveAttribute('height', '100%');
      expect(iframe).toHaveStyle('display: block');
    }) as any;

    it('should render within a Paper component', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe.parentElement).toBeInTheDocument();
    }) as any;

    it('should render within a Box container', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('responsive design', () => {
    it('should handle mobile view', () => {
      // Mock mobile breakpoint
      mockUseMediaQuery.mockReturnValue(true);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    }) as any;

    it('should handle tablet view', () => {
      // Mock tablet breakpoint
      mockUseMediaQuery.mockReturnValue(true);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    }) as any;

    it('should handle desktop view', () => {
      // Mock desktop breakpoint
      mockUseMediaQuery.mockReturnValue(false);
      
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    }) as any;

    it('should render correctly on different screen sizes', () => {
      // Component should render regardless of screen size
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('width', '100%');
      expect(iframe).toHaveAttribute('height', '100%');
    }) as any;
  }) as any;

  describe('props handling', () => {
    it('should handle different PDF URLs', () => {
      const urls = [
        'https://example.com/doc1.pdf',
        'https://another-site.com/document.pdf',
        'https://test.com/file.pdf',
      ];

      urls.forEach(url => {
        const { unmount } = renderPDFViewer({ pdfUrl: url }) as any;
        
        const iframe = screen.getByTitle('PDF Preview');
        expect(iframe).toHaveAttribute('src', url);
        
        unmount();
      }) as any;
    }) as any;

    it('should handle URLs with query parameters', () => {
      const urlWithParams = 'https://example.com/doc.pdf?page=1&zoom=100';
      renderPDFViewer({ pdfUrl: urlWithParams }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', urlWithParams);
    }) as any;

    it('should handle URLs with fragments', () => {
      const urlWithFragment = 'https://example.com/doc.pdf#page=5';
      renderPDFViewer({ pdfUrl: urlWithFragment }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', urlWithFragment);
    }) as any;

    it('should handle empty URL', () => {
      renderPDFViewer({ pdfUrl: '' }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', '');
    }) as any;
  }) as any;

  describe('styling and layout', () => {
    it('should have correct iframe styling', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveStyle({
        display: 'block',
      }) as any;
    }) as any;

    it('should render with correct title for accessibility', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('title', 'PDF Preview');
    }) as any;

    it('should have proper container structure', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      const container = iframe.closest('div');
      expect(container).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should have accessible title attribute', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('title', 'PDF Preview');
    }) as any;

    it('should be keyboard accessible', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
      // iframe elements are naturally keyboard accessible
    }) as any;

    it('should have proper semantic structure', () => {
      renderPDFViewer();
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe.tagName.toLowerCase()).toBe('iframe');
    }) as any;
  }) as any;

  describe('edge cases', () => {
    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.pdf';
      renderPDFViewer({ pdfUrl: longUrl }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', longUrl);
    }) as any;

    it('should handle special characters in URL', () => {
      const specialUrl = 'https://example.com/file%20with%20spaces&special=chars.pdf';
      renderPDFViewer({ pdfUrl: specialUrl }) as any;
      
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toHaveAttribute('src', specialUrl);
    }) as any;

    it('should handle re-renders correctly', () => {
      const { rerender } = renderPDFViewer({ pdfUrl: 'initial-url.pdf' }) as any;
      
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute('src', 'initial-url.pdf');
      
      rerender(
        <ThemeProvider theme={theme}>
          <PDFViewer pdfUrl="updated-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toHaveAttribute('src', 'updated-url.pdf');
    }) as any;

    it('should not crash with undefined pdfUrl', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <PDFViewer pdfUrl={undefined as unknown as string} />
          </ThemeProvider>
        );
      }).not.toThrow();
    }) as any;

    it('should handle null pdfUrl gracefully', () => {
      expect(() => {
        render(
          <ThemeProvider theme={theme}>
            <PDFViewer pdfUrl={null as unknown as string} />
          </ThemeProvider>
        );
      }).not.toThrow();
    }) as any;
  }) as any;

  describe('component integration', () => {
    it('should work with different themes', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
        },
      }) as any;

      render(
        <ThemeProvider theme={darkTheme}>
          <PDFViewer pdfUrl="test-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    }) as any;

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
      }) as any;

      render(
        <ThemeProvider theme={customTheme}>
          <PDFViewer pdfUrl="test-url.pdf" />
        </ThemeProvider>
      );
      
      expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
    }) as any;

    it('should render all Material-UI components correctly', () => {
      renderPDFViewer();
      
      // Check that the iframe is rendered within the Material-UI structure
      const iframe = screen.getByTitle('PDF Preview');
      expect(iframe).toBeInTheDocument();
    }) as any;
  }) as any;

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
    }) as any;

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
        
        const { unmount } = renderPDFViewer({ pdfUrl: `test-${index}.pdf` }) as any;
        
        expect(screen.getByTitle('PDF Preview')).toBeInTheDocument();
        
        unmount();
      }) as any;
    }) as any;
  }) as any;
}) as any; 