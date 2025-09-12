import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchFilter } from '../BatchFilter';
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

describe('BatchFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly with default props', () => {
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={mockBatches}
      />
    );

    expect(screen.getByLabelText('Filter by Batch')).toBeInTheDocument();
    expect(screen.getByText('Batch:')).toBeInTheDocument();
  });

  it('shows all batch options including "All Batches"', async () => {
    const user = userEvent.setup();
    
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={mockBatches}
      />
    );

    // Open the select dropdown
    const select = screen.getByRole('combobox');
    await user.click(select);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'All Batches' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Test_File_1.pdf (5 orders)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Test_File_2.pdf (3 orders)' })).toBeInTheDocument();
    });
  });

  it('calls onChange when a batch is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={mockBatches}
      />
    );

    // Open the select dropdown
    const select = screen.getByRole('combobox');
    await user.click(select);

    // Select a specific batch
    await waitFor(() => {
      const batchOption = screen.getByRole('option', { name: 'Test_File_1.pdf (5 orders)' });
      expect(batchOption).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('option', { name: 'Test_File_1.pdf (5 orders)' }));

    expect(mockOnChange).toHaveBeenCalledWith('batch1');
  });

  it('displays loading state correctly', () => {
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={mockBatches}
        loading={true}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-disabled', 'true');
  });

  it('works with custom label and size', () => {
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={mockBatches}
        label="Custom Label"
        size="small"
      />
    );

    expect(screen.getByText('Custom Label:')).toBeInTheDocument();
  });

  it('handles empty batches array', async () => {
    const user = userEvent.setup();
    
    render(
      <BatchFilter
        value="all"
        onChange={mockOnChange}
        batches={[]}
      />
    );

    // Open the select dropdown
    const select = screen.getByRole('combobox');
    await user.click(select);

    await waitFor(() => {
      const allBatchesOption = screen.getByRole('option', { name: 'All Batches' });
      expect(allBatchesOption).toBeInTheDocument();
      
      // Should only show "All Batches" option when no batches are available
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
    });
  });
});