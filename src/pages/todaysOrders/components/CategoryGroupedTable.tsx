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
  Card,
  CardContent,
  Grid,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Category as CategoryIcon,
  Search as SearchIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
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
  const completed = group.orders.filter(order => order.isCompleted === true).length;
  const pending = group.totalItems - completed;
  const completionRate = group.totalItems > 0 ? (completed / group.totalItems) * 100 : 0;
  
  return {
    itemCount: group.totalItems,
    totalQuantity: group.totalQuantity,
    averageQuantity: group.totalItems > 0 ? Math.round(group.totalQuantity / group.totalItems * 100) / 100 : 0,
    platforms: group.platforms,
    completion: {
      completed,
      pending,
      completionRate: Math.round(completionRate * 100) / 100
    }
  };
};

export const CategoryGroupedTable: React.FC<CategoryGroupedTableProps> = ({ groupedData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  const renderCompletionStatus = (order: ProductSummary) => {
    if (order.isCompleted) {
      return (
        <Chip
          icon={<CompletedIcon />}
          label="Completed"
          color="success"
          size="small"
          variant="filled"
          title={`Completed at: ${order.completedAt ? new Date(order.completedAt).toLocaleString() : 'Unknown'}`}
        />
      );
    }
    
    return (
      <Chip
        icon={<PendingIcon />}
        label="Pending"
        color="warning"
        size="small"
        variant="outlined"
        title="Order not yet completed"
      />
    );
  };

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

   
  const MobileCategoryCard: React.FC<CategoryRowProps> = ({ group, isExpanded, onToggle }) => {
    const stats = getCategoryStatistics(group);

    return (
      <Card sx={{ mb: 2, overflow: 'visible' }}>
        <CardContent sx={{ p: 2 }}>
          {/* Category Header */}
          <Box 
            onClick={onToggle}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <CategoryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                {group.categoryName}
              </Typography>
            </Box>
            <IconButton size="small">
              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>

          {/* Category Statistics */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Items:</Typography>
                <Chip label={stats.itemCount} size="small" variant="outlined" />
              </Stack>
            </Grid>
            <Grid item xs={6}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Qty:</Typography>
                <Chip label={stats.totalQuantity} size="small" variant="outlined" />
              </Stack>
            </Grid>
            <Grid item xs={6}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Completed:</Typography>
                <Chip 
                  label={stats.completion.completed} 
                  size="small" 
                  color="success" 
                  variant="outlined"
                />
              </Stack>
            </Grid>
            <Grid item xs={6}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Pending:</Typography>
                <Chip 
                  label={stats.completion.pending} 
                  size="small" 
                  color="warning" 
                  variant="outlined"
                />
              </Stack>
            </Grid>
          </Grid>

          {/* Platforms */}
          {stats.platforms && Array.isArray(stats.platforms) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                Platforms:
              </Typography>
              <Chip 
                label={stats.platforms.join(', ')} 
                size="small" 
                variant="outlined"
              />
            </Box>
          )}

          {/* Expanded Order Details */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Orders:
              </Typography>
              <Stack spacing={1}>
                {group.orders.map((order, index) => (
                  <Card 
                    key={`${order.SKU}-${index}`} 
                    variant="outlined" 
                    sx={{ p: 1.5 }}
                  >
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {order.product?.name || order.name || 'Unknown Product'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">SKU:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {order.SKU || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Quantity:</Typography>
                        <Chip 
                          label={order.quantity} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Platform:</Typography>
                        <Chip 
                          label={order.type?.toUpperCase() || 'Unknown'} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Price:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          <FormattedCurrency value={order.product?.sellingPrice || 0} />
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {renderCompletionStatus(order)}
                          {renderActions(order)}
                        </Box>
                      </Grid>
                      {order.batchInfo && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Batch:</Typography>
                          <Chip
                            label={order.batchInfo.fileName.substring(0, 20) + (order.batchInfo.fileName.length > 20 ? '...' : '')}
                            color="info"
                            variant="outlined"
                            size="small"
                            title={`${order.batchInfo.fileName} - ${order.batchInfo.orderCount} orders`}
                            sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

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
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
              <Chip
                icon={<CompletedIcon />}
                label={`${stats.completion.completed}`}
                size="small"
                color="success"
                variant="outlined"
                title={`${stats.completion.completed} completed orders`}
              />
              <Chip
                icon={<PendingIcon />}
                label={`${stats.completion.pending}`}
                size="small"
                color="warning"
                variant="outlined"
                title={`${stats.completion.pending} pending orders`}
              />
            </Box>
          </TableCell>
          <TableCell align="center">
            <Typography variant="body2" color="text.secondary">
              Category Summary
            </Typography>
          </TableCell>
        </TableRow>

        {/* Product Detail Rows */}
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
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
                      <TableCell align="center"><strong>Status</strong></TableCell>
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
                          <TableCell align="center">
                            {renderCompletionStatus(order)}
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
          placeholder={isMobile ? "Search products..." : "Search by product name, SKU, or category..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          size={isMobile ? "small" : "medium"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize={isMobile ? "small" : "medium"} />
              </InputAdornment>
            ),
          }}
        />
      </Box>


      {/* Conditional Mobile/Desktop Layout */}
      {isMobile ? (
        /* Mobile Card Layout */
        <Box>
          {filteredData.categorizedGroups.length === 0 && filteredData.uncategorizedGroup.totalItems === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No orders found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try adjusting your search terms' : 'No active orders available'}
              </Typography>
            </Paper>
          ) : (
            <Box>
              {/* Categorized Groups */}
              {/* eslint-disable react/prop-types */}
              {sortedCategories.map(group => (
                <MobileCategoryCard
                  key={group.categoryName}
                  group={group}
                  isExpanded={expandedCategories[group.categoryName] ?? false}
                  onToggle={() => handleCategoryToggle(group.categoryName)}
                />
              ))}
              
              {/* Uncategorized Group */}
              {filteredData.uncategorizedGroup.totalItems > 0 && (
                <MobileCategoryCard
                  key="uncategorized"
                  group={filteredData.uncategorizedGroup}
                  isExpanded={expandedCategories['uncategorized'] ?? false}
                  onToggle={() => handleCategoryToggle('uncategorized')}
                />
              )}
            </Box>
          )}
        </Box>
      ) : (
        /* Desktop Table Layout */
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
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.categorizedGroups.length === 0 && filteredData.uncategorizedGroup.totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
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
      )}
    </Box>
  );
}; 