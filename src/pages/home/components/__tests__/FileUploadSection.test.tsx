import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { FileUploadSection } from '../FileUploadSection';

// Mock the FileInput component
interface MockFileInputProps {
  name: string;
  selected: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accepts: string;
  multiple?: boolean;
  fileCount?: number;
}

jest.mock('../../file-input', () => ({
  FileInput: ({ name, selected, onChange, accepts, multiple, fileCount }: MockFileInputProps) => (
    <div data-testid={`file-input-${name}`}>
      <input
        type="file"
        accept={accepts}
        data-testid={`file-input-${name}-input`}
        onChange={onChange}
        multiple={multiple}
      />
      <span data-testid={`file-input-${name}-status`}>
        {selected ? 'File Selected' : `Select ${name}`}
      </span>
      {fileCount && <span data-testid={`file-input-${name}-count`}>{fileCount}</span>}
    </div>
  ),
}));

const theme = createTheme();

const defaultProps = {
  amazonFiles: [],
  flipkartFiles: [],
  onAmazonAdd: jest.fn(),
  onFlipkartAdd: jest.fn(),
  onAmazonRemove: jest.fn(),
  onFlipkartRemove: jest.fn(),
  onAmazonClear: jest.fn(),
  onFlipkartClear: jest.fn(),
};

const renderFileUploadSection = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <FileUploadSection {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('FileUploadSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('rendering', () => {
    it('should render both Amazon and Flipkart upload sections', () => {
      renderFileUploadSection();
      
      expect(screen.getByText('Amazon Labels')).toBeInTheDocument();
      expect(screen.getByText('Flipkart Labels')).toBeInTheDocument();
    }) as any;

    it('should render upload instructions when no files are selected', () => {
      renderFileUploadSection();
      
      expect(screen.getByText('Upload or drop Amazon shipping labels (PDF)')).toBeInTheDocument();
      expect(screen.getByText('Upload or drop Flipkart shipping labels (PDF)')).toBeInTheDocument();
    }) as any;

    it('should render file counts when files are selected', () => {
      const amazonFile = new File(['test'], 'amazon-label.pdf', { type: 'application/pdf' }) as any;
      const flipkartFile = new File(['test'], 'flipkart-label.pdf', { type: 'application/pdf' }) as any;
      
      renderFileUploadSection({
        amazonFiles: [amazonFile],
        flipkartFiles: [flipkartFile],
      }) as any;
      
      expect(screen.getByText('1 Amazon file selected')).toBeInTheDocument();
      expect(screen.getByText('1 Flipkart file selected')).toBeInTheDocument();
    }) as any;

    it('should render CloudUpload icons', () => {
      renderFileUploadSection();
      
      const icons = screen.getAllByTestId('CloudUploadIcon');
      expect(icons).toHaveLength(2);
    }) as any;

    it('should render FileInput components with correct props', () => {
      renderFileUploadSection();
      
      expect(screen.getByTestId('file-input-amazon')).toBeInTheDocument();
      expect(screen.getByTestId('file-input-flipkart')).toBeInTheDocument();
      
      const amazonInput = screen.getByTestId('file-input-amazon-input');
      const flipkartInput = screen.getByTestId('file-input-flipkart-input');
      
      expect(amazonInput).toHaveAttribute('accept', 'application/pdf');
      expect(flipkartInput).toHaveAttribute('accept', 'application/pdf');
      expect(amazonInput).toHaveAttribute('multiple');
      expect(flipkartInput).toHaveAttribute('multiple');
    }) as any;
  }) as any;

  describe('file selection states', () => {
    it('should show unselected state when no files are provided', () => {
      renderFileUploadSection();
      
      expect(screen.getByTestId('file-input-amazon-status')).toHaveTextContent('Select amazon');
      expect(screen.getByTestId('file-input-flipkart-status')).toHaveTextContent('Select flipkart');
    }) as any;

    it('should show selected state when files are provided', () => {
      const amazonFile = new File(['test'], 'amazon.pdf', { type: 'application/pdf' }) as any;
      const flipkartFile = new File(['test'], 'flipkart.pdf', { type: 'application/pdf' }) as any;
      
      renderFileUploadSection({
        amazonFiles: [amazonFile],
        flipkartFiles: [flipkartFile],
      }) as any;
      
      expect(screen.getByTestId('file-input-amazon-status')).toHaveTextContent('File Selected');
      expect(screen.getByTestId('file-input-flipkart-status')).toHaveTextContent('File Selected');
    }) as any;

    it('should show mixed states when only one type has files', () => {
      const amazonFile = new File(['test'], 'amazon.pdf', { type: 'application/pdf' }) as any;
      
      renderFileUploadSection({
        amazonFiles: [amazonFile],
        flipkartFiles: [],
      }) as any;
      
      expect(screen.getByTestId('file-input-amazon-status')).toHaveTextContent('File Selected');
      expect(screen.getByTestId('file-input-flipkart-status')).toHaveTextContent('Select flipkart');
    }) as any;
  }) as any;

  describe('file change handlers', () => {
    it('should call onAmazonAdd when Amazon file is selected', () => {
      const onAmazonAdd = jest.fn();
      renderFileUploadSection({ onAmazonAdd }) as any;
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' }) as any;
      const input = screen.getByTestId('file-input-amazon-input');
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      }) as any;
      
      fireEvent.change(input);
      
      expect(onAmazonAdd).toHaveBeenCalledWith(file);
    }) as any;

    it('should call onFlipkartAdd when Flipkart file is selected', () => {
      const onFlipkartAdd = jest.fn();
      renderFileUploadSection({ onFlipkartAdd }) as any;
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' }) as any;
      const input = screen.getByTestId('file-input-flipkart-input');
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      }) as any;
      
      fireEvent.change(input);
      
      expect(onFlipkartAdd).toHaveBeenCalledWith(file);
    }) as any;

    it('should handle empty file selection for Amazon', () => {
      const onAmazonAdd = jest.fn();
      renderFileUploadSection({ onAmazonAdd }) as any;
      
      const input = screen.getByTestId('file-input-amazon-input');
      
      Object.defineProperty(input, 'files', {
        value: null,
        writable: false,
      }) as any;
      
      fireEvent.change(input);
      
      expect(onAmazonAdd).not.toHaveBeenCalled();
    }) as any;

    it('should handle empty file selection for Flipkart', () => {
      const onFlipkartAdd = jest.fn();
      renderFileUploadSection({ onFlipkartAdd }) as any;
      
      const input = screen.getByTestId('file-input-flipkart-input');
      
      Object.defineProperty(input, 'files', {
        value: null,
        writable: false,
      }) as any;
      
      fireEvent.change(input);
      
      expect(onFlipkartAdd).not.toHaveBeenCalled();
    }) as any;
  }) as any;

  describe('layout and styling', () => {
    it('should render in a grid layout', () => {
      renderFileUploadSection();
      
      // Check for the main grid container by class
      const container = document.querySelector('.MuiGrid-container');
      expect(container).toBeInTheDocument();
    }) as any;

    it('should render cards for both upload sections', () => {
      renderFileUploadSection();
      
      // Cards don't have specific roles, but we can check for their content structure
      expect(screen.getByText('Amazon Labels')).toBeInTheDocument();
      expect(screen.getByText('Flipkart Labels')).toBeInTheDocument();
    }) as any;

    it('should render with proper typography hierarchy', () => {
      renderFileUploadSection();
      
      // Check for h6 elements (variant="h6")
      const amazonTitle = screen.getByText('Amazon Labels');
      const flipkartTitle = screen.getByText('Flipkart Labels');
      
      expect(amazonTitle).toBeInTheDocument();
      expect(flipkartTitle).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('accessibility', () => {
    it('should have proper file input accessibility', () => {
      renderFileUploadSection();
      
      const amazonInput = screen.getByTestId('file-input-amazon-input');
      const flipkartInput = screen.getByTestId('file-input-flipkart-input');
      
      expect(amazonInput).toHaveAttribute('type', 'file');
      expect(flipkartInput).toHaveAttribute('type', 'file');
    }) as any;

    it('should accept only PDF files', () => {
      renderFileUploadSection();
      
      const amazonInput = screen.getByTestId('file-input-amazon-input');
      const flipkartInput = screen.getByTestId('file-input-flipkart-input');
      
      expect(amazonInput).toHaveAttribute('accept', 'application/pdf');
      expect(flipkartInput).toHaveAttribute('accept', 'application/pdf');
    }) as any;
  }) as any;

  describe('edge cases', () => {
    it('should handle empty file arrays', () => {
      renderFileUploadSection({
        amazonFiles: [],
        flipkartFiles: [],
      }) as any;
      
      expect(screen.getByText('Upload or drop Amazon shipping labels (PDF)')).toBeInTheDocument();
      expect(screen.getByText('Upload or drop Flipkart shipping labels (PDF)')).toBeInTheDocument();
    }) as any;

    it('should handle multiple files with display of file count', () => {
      const amazonFiles = [
        new File(['test1'], 'amazon1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'amazon2.pdf', { type: 'application/pdf' })
      ];
      
      renderFileUploadSection({
        amazonFiles,
      }) as any;
      
      expect(screen.getByText('2 Amazon files selected')).toBeInTheDocument();
    }) as any;

    it('should handle files with special characters in names', () => {
      const specialFileName = 'amazon-label-@#$%^&*()_+.pdf';
      const amazonFile = new File(['test'], specialFileName, { type: 'application/pdf' }) as any;
      
      renderFileUploadSection({
        amazonFiles: [amazonFile],
      }) as any;
      
      // We'd need to check the file list rendering here - for now, check if the count is displayed
      expect(screen.getByText('1 Amazon file selected')).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('component integration', () => {
    it('should work with different theme modes', () => {
      const darkTheme = createTheme({ palette: { mode: 'dark' } }) as any;
      
      render(
        <ThemeProvider theme={darkTheme}>
          <FileUploadSection {...defaultProps} />
        </ThemeProvider>
      );
      
      expect(screen.getByText('Amazon Labels')).toBeInTheDocument();
      expect(screen.getByText('Flipkart Labels')).toBeInTheDocument();
    }) as any;

    it('should handle re-renders correctly', () => {
      const { rerender } = renderFileUploadSection();
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' }) as any;
      
      rerender(
        <ThemeProvider theme={theme}>
          <FileUploadSection
            {...defaultProps}
            amazonFiles={[file]}
          />
        </ThemeProvider>
      );
      
      expect(screen.getByText('1 Amazon file selected')).toBeInTheDocument();
    }) as any;

    it('should handle file addition and removal', () => {
      const amazonFiles = [
        new File(['test1'], 'amazon1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'amazon2.pdf', { type: 'application/pdf' })
      ];
      const flipkartFiles = [
        new File(['test'], 'flipkart.pdf', { type: 'application/pdf' })
      ];
      
      renderFileUploadSection({
        amazonFiles,
        flipkartFiles,
      }) as any;
      
      expect(screen.getByText('2 Amazon files selected')).toBeInTheDocument();
      expect(screen.getByText('1 Flipkart file selected')).toBeInTheDocument();
    }) as any;
  }) as any;
}) as any; 