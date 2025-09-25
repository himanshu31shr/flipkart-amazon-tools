import React from 'react';
import { render, screen } from '@testing-library/react';
import { BatchGroupedTable } from '../BatchGroupedTable';
import { ActiveOrder } from '../../../../services/todaysOrder.service';

const createMockOrder = (overrides: Partial<ActiveOrder> = {}): ActiveOrder => ({
  name: 'Test Product',
  quantity: '1',
  type: 'amazon',
  SKU: 'TEST-001',
  orderId: 'order-1',
  category: 'Test Category',
  categoryId: 'cat-1',
  batchInfo: {
    batchId: 'batch1',
    uploadedAt: '2024-01-15T10:00:00Z',
    fileName: 'Test_File.pdf',
    platform: 'amazon',
    orderCount: 5,
    metadata: {
      userId: 'user1',
      selectedDate: '2024-01-15',
      processedAt: '2024-01-15T10:00:00Z',
    },
  },
  ...overrides,
}) as any;

const mockBatchGroups = {
  'batch1': [
    createMockOrder({ name: 'Product 1', SKU: 'SKU-001' }),
    createMockOrder({ name: 'Product 2', SKU: 'SKU-002' }),
  ],
  'batch2': [
    createMockOrder({ 
      name: 'Product 3', 
      SKU: 'SKU-003', 
      type: 'flipkart',
      batchInfo: {
        batchId: 'batch2',
        uploadedAt: '2024-01-15T11:00:00Z',
        fileName: 'Flipkart_File.pdf',
        platform: 'flipkart',
        orderCount: 3,
        metadata: {
          userId: 'user1',
          selectedDate: '2024-01-15',
          processedAt: '2024-01-15T11:00:00Z',
        },
      },
    }),
  ],
  'no-batch': [
    createMockOrder({ 
      name: 'Legacy Product', 
      SKU: 'SKU-LEGACY', 
      batchInfo: undefined 
    }),
  ],
};

describe('BatchGroupedTable', () => {
  it('renders batch groups correctly', () => {
    render(
      <BatchGroupedTable
        batchGroups={mockBatchGroups}
        platformFilter="all"
      />
    );

    // Should show batch names/titles
    expect(screen.getByText('Test_File.pdf')).toBeInTheDocument();
    expect(screen.getByText('Flipkart_File.pdf')).toBeInTheDocument();
    expect(screen.getByText('Legacy Orders')).toBeInTheDocument();
  }) as any;

  it('displays order counts correctly', () => {
    render(
      <BatchGroupedTable
        batchGroups={mockBatchGroups}
        platformFilter="all"
      />
    );

    // Should show order counts - use getAllByText since counts appear in multiple places
    expect(screen.getAllByText('2 orders')).toHaveLength(1);
    expect(screen.getAllByText('1 orders').length).toBeGreaterThanOrEqual(1);
  }) as any;

  it('filters by platform correctly', () => {
    render(
      <BatchGroupedTable
        batchGroups={mockBatchGroups}
        platformFilter="amazon"
      />
    );

    // Should only show Amazon orders
    expect(screen.getByText('Test_File.pdf')).toBeInTheDocument();
    expect(screen.getByText('Legacy Orders')).toBeInTheDocument();
    
    // Flipkart batch should not be visible since it has no Amazon orders after filtering
    expect(screen.queryByText('Flipkart_File.pdf')).not.toBeInTheDocument();
  }) as any;

  it('expands and shows order details', async () => {
    
    render(
      <BatchGroupedTable
        batchGroups={mockBatchGroups}
        platformFilter="all"
      />
    );

    // Click to expand first batch
    const firstBatchAccordion = screen.getByText('Test_File.pdf').closest('div[role="button"]');
    expect(firstBatchAccordion).toBeInTheDocument();
    
    // The first accordion should be expanded by default, so check for product names
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  }) as any;

  it('shows platform chips correctly', () => {
    render(
      <BatchGroupedTable
        batchGroups={mockBatchGroups}
        platformFilter="all"
      />
    );

    // Should show platform chips in the order table
    const amazonChips = screen.getAllByText('amazon');
    const flipkartChips = screen.getAllByText('flipkart');
    
    expect(amazonChips.length).toBeGreaterThan(0);
    expect(flipkartChips.length).toBeGreaterThan(0);
  }) as any;

  it('handles empty batch groups', () => {
    render(
      <BatchGroupedTable
        batchGroups={{}}
        platformFilter="all"
      />
    );

    expect(screen.getByText('No orders found for the selected filters.')).toBeInTheDocument();
  }) as any;

  it('sorts batches by upload time with legacy last', () => {
    const batchGroupsWithTimes = {
      'batch-new': [
        createMockOrder({ 
          batchInfo: {
            batchId: 'batch-new',
            uploadedAt: '2024-01-15T12:00:00Z', // Newest
            fileName: 'Newest_File.pdf',
            platform: 'amazon',
            orderCount: 1,
            metadata: {
              userId: 'user1',
              selectedDate: '2024-01-15',
              processedAt: '2024-01-15T12:00:00Z',
            },
          },
        }),
      ],
      'batch-old': [
        createMockOrder({ 
          batchInfo: {
            batchId: 'batch-old',
            uploadedAt: '2024-01-15T09:00:00Z', // Oldest
            fileName: 'Oldest_File.pdf',
            platform: 'amazon',
            orderCount: 1,
            metadata: {
              userId: 'user1',
              selectedDate: '2024-01-15',
              processedAt: '2024-01-15T09:00:00Z',
            },
          },
        }),
      ],
      'no-batch': [
        createMockOrder({ batchInfo: undefined }),
      ],
    };

    render(
      <BatchGroupedTable
        batchGroups={batchGroupsWithTimes}
        platformFilter="all"
      />
    );

    // Get all the batch titles to check order
    const accordions = screen.getAllByRole('button');
    const titles = accordions.map(accordion => accordion.textContent);
    
    // Newest should be first, oldest second, legacy last
    expect(titles[0]).toContain('Newest_File.pdf');
    expect(titles[1]).toContain('Oldest_File.pdf');
    expect(titles[2]).toContain('Legacy Orders');
  }) as any;
}) as any;