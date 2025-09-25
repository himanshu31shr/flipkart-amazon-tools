import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductImportSection } from '../ProductImportSection';

// Mock file for testing
const createMockFile = (name: string, type: string, content: string = 'test content') => {
  const blob = new Blob([content], { type }) as any;
  return new File([blob], name, { type }) as any;
};

describe('ProductImportSection', () => {
  let mockOnImport: jest.Mock;

  beforeEach(() => {
    mockOnImport = jest.fn().mockResolvedValue(undefined);
  }) as any;

  afterEach(() => {
    jest.clearAllMocks();
  }) as any;

  describe('basic rendering', () => {
    it('should render import button', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument();
    }) as any;

    it('should render update existing products checkbox', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      expect(screen.getByRole('checkbox', { name: /update existing products/i })).toBeInTheDocument();
    }) as any;

    it('should have checkbox unchecked by default', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      expect(checkbox).not.toBeChecked();
    }) as any;

    it('should render helpful tooltip text', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const infoIcon = screen.getByTestId('InfoIcon');
      expect(infoIcon).toHaveAttribute('aria-label', expect.stringMatching(/when checked, existing products will be updated/i));
    }) as any;

    it('should render info icon for tooltip', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const infoIcon = screen.getByTestId('InfoIcon');
      expect(infoIcon).toBeInTheDocument();
    }) as any;
  }) as any;

  describe('checkbox functionality', () => {
    it('should toggle checkbox when clicked', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      
      // Initially unchecked
      expect(checkbox).not.toBeChecked();
      
      // Click to check
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Click to uncheck
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    }) as any;

    it('should toggle checkbox when label is clicked', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const label = screen.getByText(/update existing products/i);
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      
      // Initially unchecked
      expect(checkbox).not.toBeChecked();
      
      // Click label to check
      fireEvent.click(label);
      expect(checkbox).toBeChecked();
    }) as any;
  }) as any;

  describe('file upload functionality', () => {
    it('should call onImport with updateExisting false when checkbox is unchecked', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(xlsxFile, false);
      }) as any;
    }) as any;

    it('should call onImport with updateExisting true when checkbox is checked', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      const fileInput = screen.getByLabelText(/import products/i);
      
      // Check the checkbox first
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(xlsxFile, true);
      }) as any;
    }) as any;

    it('should accept Excel .xlsx files', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(xlsxFile, false);
      }) as any;
      
      expect(screen.queryByText(/please upload an excel file/i)).not.toBeInTheDocument();
    }) as any;

    it('should accept Excel .xls files', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const xlsFile = createMockFile('test.xls', 'application/vnd.ms-excel');
      
      fireEvent.change(fileInput, { target: { files: [xlsFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(xlsFile, false);
      }) as any;
      
      expect(screen.queryByText(/please upload an excel file/i)).not.toBeInTheDocument();
    }) as any;

    it('should accept text .txt files', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const txtFile = createMockFile('test.txt', 'text/plain');
      
      fireEvent.change(fileInput, { target: { files: [txtFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(txtFile, false);
      }) as any;
      
      expect(screen.queryByText(/please upload an excel file/i)).not.toBeInTheDocument();
    }) as any;

    it('should reject invalid file types', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const invalidFile = createMockFile('test.pdf', 'application/pdf');
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.getByText(/please upload an excel file/i)).toBeInTheDocument();
      }) as any;
      
      expect(mockOnImport).not.toHaveBeenCalled();
    }) as any;

    it('should handle no file selected', () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      
      fireEvent.change(fileInput, { target: { files: [] } }) as any;
      
      expect(mockOnImport).not.toHaveBeenCalled();
    }) as any;
  }) as any;

  describe('error handling', () => {
    it('should display error message when onImport fails', async () => {
      const errorMessage = 'Import failed';
      mockOnImport.mockRejectedValue(new Error(errorMessage));
      
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.getByText(/failed to import products/i)).toBeInTheDocument();
      }) as any;
    }) as any;

    it('should clear error message when dismissed', async () => {
      mockOnImport.mockRejectedValue(new Error('Import failed'));
      
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.getByText(/failed to import products/i)).toBeInTheDocument();
      }) as any;
      
      // Simulate the snackbar auto-close behavior
      await waitFor(() => {
        expect(screen.queryByText(/failed to import products/i)).not.toBeInTheDocument();
      }, { timeout: 7000 }) as any; // autoHideDuration is 6000ms + buffer
    }, 10000); // Increase test timeout

    it('should clear error when new valid file is selected', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i);
      
      // First, trigger an error with invalid file
      const invalidFile = createMockFile('test.pdf', 'application/pdf');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.getByText(/please upload an excel file/i)).toBeInTheDocument();
      }) as any;
      
      // Then select a valid file
      const validFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [validFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.queryByText(/please upload an excel file/i)).not.toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe('input reset functionality', () => {
    it('should reset file input after successful import', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i) as HTMLInputElement;
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
      }) as any;
      
      // Input should be reset
      expect(fileInput.value).toBe('');
    }) as any;

    it('should reset file input after failed import', async () => {
      mockOnImport.mockRejectedValue(new Error('Import failed'));
      
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const fileInput = screen.getByLabelText(/import products/i) as HTMLInputElement;
      const xlsxFile = createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      fireEvent.change(fileInput, { target: { files: [xlsxFile] } }) as any;
      
      await waitFor(() => {
        expect(screen.getByText(/failed to import products/i)).toBeInTheDocument();
      }) as any;
      
      // Input should be reset even after error
      expect(fileInput.value).toBe('');
    }) as any;
  }) as any;

  describe('integration scenarios', () => {
    it('should handle multiple file uploads with different checkbox states', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      const fileInput = screen.getByLabelText(/import products/i);
      
      // First upload with checkbox unchecked
      const file1 = createMockFile('test1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [file1] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(file1, false);
      }) as any;
      
      // Check the checkbox
      fireEvent.click(checkbox);
      
      // Second upload with checkbox checked
      const file2 = createMockFile('test2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [file2] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(file2, true);
      }) as any;
      
      expect(mockOnImport).toHaveBeenCalledTimes(2);
    }) as any;

    it('should maintain checkbox state across multiple operations', async () => {
      render(<ProductImportSection onImport={mockOnImport} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /update existing products/i }) as any;
      const fileInput = screen.getByLabelText(/import products/i);
      
      // Check the checkbox
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Upload a file
      const file1 = createMockFile('test1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [file1] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(file1, true);
      }) as any;
      
      // Checkbox should still be checked
      expect(checkbox).toBeChecked();
      
      // Upload another file
      const file2 = createMockFile('test2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      fireEvent.change(fileInput, { target: { files: [file2] } }) as any;
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(file2, true);
      }) as any;
      
      // Checkbox should still be checked
      expect(checkbox).toBeChecked();
    }) as any;
  }) as any;
}) as any; 