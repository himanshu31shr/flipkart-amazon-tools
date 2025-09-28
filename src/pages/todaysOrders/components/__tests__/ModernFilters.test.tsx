import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModernFilters } from '../ModernFilters';
import { BatchInfo } from '../../../../types/transaction.type';

const mockBatches: BatchInfo[] = [
  {
    batchId: 'batch1',
    uploadedAt: '2024-01-15T10:00:00Z',
    fileName: 'Test_File_1.pdf',
    platform: 'amazon',
    orderCount: 5,
    metadata: {
      userId: 'user1',
      selectedDate: '2024-01-15',
      processedAt: '2024-01-15T10:00:00Z',
    },
  },
  {
    batchId: 'batch2',
    uploadedAt: '2024-01-15T11:00:00Z',
    fileName: 'Test_File_2.pdf',
    platform: 'flipkart',
    orderCount: 3,
    metadata: {
      userId: 'user1',
      selectedDate: '2024-01-15',
      processedAt: '2024-01-15T11:00:00Z',
    },
  },
];

const defaultProps = {
  viewMode: 'grouped' as const,
  onViewModeChange: jest.fn(),
  platformFilter: 'all' as const,
  onPlatformFilterChange: jest.fn(),
  batchFilter: 'all',
  onBatchFilterChange: jest.fn(),
  batches: mockBatches,
  batchesLoading: false,
  completionFilter: 'all' as const,
  onCompletionFilterChange: jest.fn(),
  onFilesClick: jest.fn(),
  onClearAllFilters: jest.fn(),
  totalCount: 100,
  filteredCount: 100,
};

describe('ModernFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  }) as any;

  it('renders correctly with default props', () => {
    render(<ModernFilters {...defaultProps} />);
    
    expect(screen.getByText('100 orders')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  }) as any;

  it('shows filtered count when filters are applied', () => {
    render(
      <ModernFilters 
        {...defaultProps} 
        platformFilter="amazon"
        totalCount={100}
        filteredCount={50}
      />
    );
    
    expect(screen.getByText('50 of 100 orders')).toBeInTheDocument();
    expect(screen.getByText('Filtered')).toBeInTheDocument();
  }) as any;

  it('displays active filters as chips', () => {
    render(
      <ModernFilters 
        {...defaultProps} 
        platformFilter="amazon"
        batchFilter="batch1"
      />
    );
    
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Test_File_1.pdf')).toBeInTheDocument();
  }) as any;

  it('shows clear filters button when filters are active', () => {
    render(
      <ModernFilters 
        {...defaultProps} 
        platformFilter="amazon"
      />
    );
    
    expect(screen.getByText('Clear')).toBeInTheDocument();
  }) as any;

  it('calls onClearAllFilters when clear button is clicked', () => {
    render(
      <ModernFilters 
        {...defaultProps} 
        platformFilter="amazon"
      />
    );
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(defaultProps.onClearAllFilters).toHaveBeenCalledTimes(1);
  }) as any;

  it('toggles view mode correctly', () => {
    render(<ModernFilters {...defaultProps} viewMode="individual" />);
    
    const categoryViewButton = screen.getByText('Category');
    fireEvent.click(categoryViewButton);
    
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('grouped');
  }) as any;

  it('expands and collapses filter details', () => {
    render(<ModernFilters {...defaultProps} />);
    
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Check that the filter components are visible when expanded
    expect(screen.getByLabelText('platform filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by Batch')).toBeInTheDocument();
  }) as any;

  it('calls onFilesClick when files button is clicked', () => {
    render(<ModernFilters {...defaultProps} />);
    
    const filesButton = screen.getByLabelText('Files & Uploads');
    fireEvent.click(filesButton);
    
    expect(defaultProps.onFilesClick).toHaveBeenCalledTimes(1);
  }) as any;

  it('truncates long batch names in chips', () => {
    const longBatchName = {
      ...mockBatches[0],
      fileName: 'This_Is_A_Very_Long_Filename_That_Should_Be_Truncated.pdf'
    };

    render(
      <ModernFilters 
        {...defaultProps} 
        batchFilter="batch1"
        batches={[longBatchName, ...mockBatches.slice(1)]}
      />
    );
    
    expect(screen.getByText('This_Is_A_Very_Long_...')).toBeInTheDocument();
  }) as any;

  it('displays completion filter as active filter chip when set', () => {
    render(
      <ModernFilters 
        {...defaultProps} 
        completionFilter="completed"
      />
    );
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
  }) as any;

}) as any;