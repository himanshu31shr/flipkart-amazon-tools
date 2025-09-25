import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableRowComponent } from '../TableRowComponent';
import { Column } from '../DataTable';

interface TestRowData {
  id: string;
  name: string;
  status: string;
}

const mockColumns: Column<TestRowData>[] = [
  { id: 'id', label: 'ID', filter: true },
  { id: 'name', label: 'Name', filter: true },
  { id: 'status', label: 'Status', filter: false },
];

const mockRow: TestRowData = {
  id: 'test-1',
  name: 'Test Item',
  status: 'Active',
};

describe('TableRowComponent', () => {
  const defaultProps = {
    row: mockRow,
    columns: mockColumns,
    index: 0,
    getRowId: (row: TestRowData) => row.id,
  };

  it('should render table row with data', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent {...defaultProps} />
        </tbody>
      </table>
    );

    expect(screen.getByText('test-1')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  }) as any;

  it('should call onClick when row is clicked', () => {
    const mockOnClick = jest.fn();
    
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps} 
            onClick={mockOnClick}
          />
        </tbody>
      </table>
    );

    const row = screen.getByRole('row');
    fireEvent.click(row);

    expect(mockOnClick).toHaveBeenCalledWith(mockRow);
  }) as any;

  it('should render checkbox when enableSelection is true', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={false}
            onSelect={jest.fn()}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  }) as any;

  it('should not render checkbox when enableSelection is false', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent {...defaultProps} />
        </tbody>
      </table>
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  }) as any;

  it('should call onSelect when checkbox is clicked but not trigger row onClick', () => {
    const mockOnClick = jest.fn();
    const mockOnSelect = jest.fn();
    
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={false}
            onSelect={mockOnSelect}
            onClick={mockOnClick}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // onSelect should be called with the row ID and checked state
    expect(mockOnSelect).toHaveBeenCalledWith('test-1', true);
    
    // onClick should NOT be called when clicking checkbox
    expect(mockOnClick).not.toHaveBeenCalled();
  }) as any;

  it('should stop propagation when clicking checkbox cell', () => {
    const mockOnClick = jest.fn();
    const mockOnSelect = jest.fn();
    
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={false}
            onSelect={mockOnSelect}
            onClick={mockOnClick}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    // Click on the checkbox cell (not just the checkbox input)
    const checkboxCell = screen.getByRole('checkbox').closest('td');
    fireEvent.click(checkboxCell!);

    // Row onClick should not be triggered when clicking checkbox cell
    expect(mockOnClick).not.toHaveBeenCalled();
  }) as any;

  it('should check checkbox when selected is true', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={true}
            onSelect={jest.fn()}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  }) as any;

  it('should uncheck checkbox when selected is false', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={false}
            onSelect={jest.fn()}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  }) as any;

  it('should handle checkbox change event correctly', () => {
    const mockOnSelect = jest.fn();
    
    // Test checking
    const { rerender } = render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={false}
            onSelect={mockOnSelect}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    const checkbox = screen.getByRole('checkbox');
    
    // Simulate clicking the checkbox (which triggers change)
    fireEvent.click(checkbox);
    expect(mockOnSelect).toHaveBeenCalledWith('test-1', true);

    // Clear the mock and test unchecking by re-rendering with selected=true
    mockOnSelect.mockClear();
    
    rerender(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            enableSelection={true}
            selected={true}
            onSelect={mockOnSelect}
            rowId="test-1"
          />
        </tbody>
      </table>
    );

    // Click again to uncheck
    const checkboxAgain = screen.getByRole('checkbox');
    fireEvent.click(checkboxAgain);
    expect(mockOnSelect).toHaveBeenCalledWith('test-1', false);
  }) as any;

  it('should apply hover cursor when onClick is provided', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent 
            {...defaultProps}
            onClick={jest.fn()}
          />
        </tbody>
      </table>
    );

    const row = screen.getByRole('row');
    expect(row).toHaveStyle('cursor: pointer');
  }) as any;

  it('should not apply pointer cursor when onClick is not provided', () => {
    render(
      <table>
        <tbody>
          <TableRowComponent {...defaultProps} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('row');
    expect(row).toHaveStyle('cursor: default');
  }) as any;
}) as any; 