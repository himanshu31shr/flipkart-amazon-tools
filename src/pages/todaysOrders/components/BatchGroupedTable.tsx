import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { ActiveOrder } from '../../../services/todaysOrder.service';
import { Platform } from './PlatformFilter';

interface BatchGroup {
  batchId: string;
  batchInfo?: {
    fileName: string;
    uploadedAt: string;
    platform: 'amazon' | 'flipkart' | 'mixed';
    orderCount: number;
  };
  orders: ActiveOrder[];
}

interface BatchGroupedTableProps {
  batchGroups: Record<string, ActiveOrder[]>;
  platformFilter: Platform;
}

export const BatchGroupedTable: React.FC<BatchGroupedTableProps> = ({
  batchGroups,
  platformFilter
}) => {
  // Convert the grouped data to an array and filter by platform
  const filteredBatchGroups: BatchGroup[] = Object.entries(batchGroups)
    .map(([batchId, orders]) => ({
      batchId,
      batchInfo: orders[0]?.batchInfo ? {
        fileName: orders[0].batchInfo.fileName,
        uploadedAt: orders[0].batchInfo.uploadedAt,
        platform: orders[0].batchInfo.platform,
        orderCount: orders[0].batchInfo.orderCount
      } : undefined,
      orders: orders.filter(order => {
        if (platformFilter === 'all') return true;
        return order.type === platformFilter;
      })
    }))
    .filter(group => group.orders.length > 0) // Only show groups with filtered orders
    .sort((a, b) => {
      // Sort by upload time (newest first), with 'no-batch' last
      if (a.batchId === 'no-batch') return 1;
      if (b.batchId === 'no-batch') return -1;
      
      const timeA = a.batchInfo?.uploadedAt ? new Date(a.batchInfo.uploadedAt).getTime() : 0;
      const timeB = b.batchInfo?.uploadedAt ? new Date(b.batchInfo.uploadedAt).getTime() : 0;
      return timeB - timeA;
    });

  if (filteredBatchGroups.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No orders found for the selected filters.
        </Typography>
      </Paper>
    );
  }

  const getBatchTitle = (group: BatchGroup): string => {
    if (group.batchId === 'no-batch') {
      return 'Legacy Orders';
    }
    return group.batchInfo?.fileName || `Batch ${group.batchId.slice(-8)}`;
  };

  const getBatchSubtitle = (group: BatchGroup): string => {
    if (group.batchId === 'no-batch') {
      return 'Orders without batch information';
    }
    
    const uploadTime = group.batchInfo?.uploadedAt 
      ? format(new Date(group.batchInfo.uploadedAt), 'MMM dd, yyyy HH:mm')
      : 'Unknown time';
    
    return `Uploaded ${uploadTime} • ${group.orders.length} orders`;
  };

  const getPlatformColor = (platform: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (platform) {
      case 'amazon': return 'warning';
      case 'flipkart': return 'info';
      case 'mixed': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box>
      {filteredBatchGroups.map((group, index) => (
        <Accordion key={group.batchId} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {getBatchTitle(group)}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={`${group.orders.length} orders`} 
                  size="small" 
                  color="primary" 
                />
                {group.batchInfo && (
                  <Chip 
                    label={group.batchInfo.platform} 
                    size="small" 
                    color={getPlatformColor(group.batchInfo.platform)}
                  />
                )}
              </Box>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ ml: 'auto' }}
              >
                {getBatchSubtitle(group)}
              </Typography>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product Name</strong></TableCell>
                    <TableCell><strong>SKU</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Platform</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.orders.map((order, orderIndex) => (
                    <TableRow key={`${group.batchId}-${orderIndex}`}>
                      <TableCell>{order.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {order.SKU || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.type} 
                          size="small" 
                          color={getPlatformColor(order.type)}
                        />
                      </TableCell>
                      <TableCell>{order.category || 'Uncategorized'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};