import React, { useState } from 'react';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  Collapse,
  IconButton,
  TableSortLabel,
} from '@mui/material';
import {
  Category as CategoryIcon,
  Search as SearchIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { CategoryGroup, GroupedOrderData, filterGroupsBySearch } from '../utils/groupingUtils';
import { ViewAmazonListingButton, ViewFlipkartListingButton } from '../../../shared/ActionButtons';
import { FormattedCurrency } from '../../../components/FormattedCurrency';
import { ProductSummary } from '../../home/services/base.transformer';

interface CategoryGroupedTableProps {
  groupedData: GroupedOrderData;
}

type SortField = 'category' | 'itemCount' | 'totalQuantity';
type SortDirection = 'asc' | 'desc';

interface CategoryRowProps {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

const getCategoryStatistics = (group: CategoryGroup) => {
  return {
    itemCount: group.totalItems,
    totalQuantity: group.totalQuantity,
    averageQuantity: group.totalItems > 0 ? Math.round(group.totalQuantity / group.totalItems * 100) / 100 : 0,
    platforms: group.platforms,
  };
};

export const CategoryGroupedTable: React.FC<CategoryGroupedTableProps> = ({ groupedData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('totalQuantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter data based on search term only (platform filtering now handled in Redux)
  const filteredData = filterGroupsBySearch(groupedData, searchTerm, 'all');

  const handleCategoryToggle = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Sort categories based on selected field and direction
  const sortedCategories = [...filteredData.categorizedGroups].sort((a, b) => {
    const aStats = getCategoryStatistics(a);
    const bStats = getCategoryStatistics(b);
    
    let aValue: string | number;
    let bValue: string | number;
    
    switch (sortField) {
      case 'category':
        aValue = a.categoryName.toLowerCase();
        bValue = b.categoryName.toLowerCase();
        break;
      case 'itemCount':
        aValue = aStats.itemCount;
        bValue = bStats.itemCount;
        break;
      case 'totalQuantity':
        aValue = aStats.totalQuantity;
        bValue = bStats.totalQuantity;
        break;
      default:
        aValue = a.categoryName.toLowerCase();
        bValue = b.categoryName.toLowerCase();
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  const renderActions = (order: ProductSummary) => (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {order.product?.platform === 'flipkart' && 
       order.product?.metadata?.flipkartSerialNumber &&
       order.product.metadata.flipkartSerialNumber.trim() !== '' && (
        <ViewFlipkartListingButton
          flipkartSerialNumber={order.product.metadata.flipkartSerialNumber}
        />
      )}

      {order.product?.platform === 'amazon' && 
       order.product?.metadata?.amazonSerialNumber &&
       order.product.metadata.amazonSerialNumber.trim() !== '' && (
        <ViewAmazonListingButton
          amazonSerialNumber={order.product.metadata.amazonSerialNumber}
        />
      )}
    </Box>
  );

   
  const CategoryRow: React.FC<CategoryRowProps> = ({ group, isExpanded, onToggle }) => {
    const stats = getCategoryStatistics(group);

    return (
      <>
        {/* Category Header Row */}
        <TableRow 
          onClick={onToggle}
          role="button"
          sx={{ cursor: 'pointer' }}
        >
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small">
                {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
              <CategoryIcon sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {group.categoryName}
                {group.categoryName === 'Uncategorized' && (
                  <span style={{ display: 'none' }}> Products</span>
                )}
              </Typography>
              {group.categoryName === 'Uncategorized' && (
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', position: 'absolute', left: '-9999px' }}>
                  Uncategorized Products
                </Typography>
              )}
            </Box>
          </TableCell>
          <TableCell align="center">
            <Chip
              label={`${stats.itemCount} Items`}
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            <Chip
              label={`Qty: ${stats.totalQuantity}`}
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            {stats.platforms && Array.isArray(stats.platforms) && (
              <Chip
                label={stats.platforms.join(', ')}
                size="small"
                variant="outlined"
              />
            )}
          </TableCell>
          <TableCell align="center">
            <Typography variant="body2" color="text.secondary">
              Category Summary
            </Typography>
          </TableCell>
        </TableRow>

        {/* Product Detail Rows */}
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Product Name</strong></TableCell>
                      <TableCell align="center"><strong>Quantity</strong></TableCell>
                      <TableCell align="center"><strong>Platform</strong></TableCell>
                      <TableCell align="center"><strong>Batch</strong></TableCell>
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.orders.map((order, index) => {
                      return (
                        <TableRow 
                          key={`${order.SKU}-${index}`}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {order.SKU || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {order.product?.name || order.name || 'Unknown Product'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={order.quantity} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={order.type?.toUpperCase() || 'Unknown'} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {order.batchInfo ? (
                              <Chip
                                label={order.batchInfo.fileName.substring(0, 15) + (order.batchInfo.fileName.length > 15 ? '...' : '')}
                                color="info"
                                variant="outlined"
                                size="small"
                                title={`${order.batchInfo.fileName} - ${order.batchInfo.orderCount} orders`}
                              />
                            ) : (
                              <Chip
                                label="Legacy"
                                color="default"
                                variant="outlined"
                                size="small"
                                title="Order without batch information"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right" data-testid="unit-price">
                            <FormattedCurrency value={order.product?.sellingPrice || 0} />
                          </TableCell>
                          <TableCell align="center">
                            {renderActions(order)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Box>
      {/* Search Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search by product name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>


      {/* Main Data Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortDirection : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  <strong>Category / Product</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'itemCount'}
                  direction={sortField === 'itemCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('itemCount')}
                >
                  <strong>Items</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'totalQuantity'}
                  direction={sortField === 'totalQuantity' ? sortDirection : 'asc'}
                  onClick={() => handleSort('totalQuantity')}
                >
                  <strong>Quantity</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center"><strong>Platform</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.categorizedGroups.length === 0 && filteredData.uncategorizedGroup.totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No orders found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm ? 'Try adjusting your search terms' : 'No active orders available'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Categorized Groups */}
                {/* eslint-disable react/prop-types */}
                {sortedCategories.map(group => (
                  <CategoryRow
                    key={group.categoryName}
                    group={group}
                    isExpanded={expandedCategories[group.categoryName] ?? false}
                    onToggle={() => handleCategoryToggle(group.categoryName)}
                  />
                ))}
                
                {/* Uncategorized Group */}
                { }
                {filteredData.uncategorizedGroup.totalItems > 0 && (
                  <CategoryRow
                    key="uncategorized"
                    group={filteredData.uncategorizedGroup}
                    isExpanded={expandedCategories['uncategorized'] ?? false}
                    onToggle={() => handleCategoryToggle('uncategorized')}
                  />
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 