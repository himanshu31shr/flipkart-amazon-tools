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
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Collapse,
  IconButton,
  TableSortLabel,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Category as CategoryIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
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

type SortField = 'category' | 'itemCount' | 'totalQuantity' | 'totalRevenue';
type SortDirection = 'asc' | 'desc';
type Platform = 'all' | 'amazon' | 'flipkart';

interface CategoryRowProps {
  group: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

const getCategoryStatistics = (group: CategoryGroup) => {
  return {
    itemCount: group.totalItems,
    totalQuantity: group.totalQuantity,
    totalRevenue: group.totalRevenue,
    averageQuantity: group.totalItems > 0 ? Math.round(group.totalQuantity / group.totalItems * 100) / 100 : 0,
    averageRevenue: group.totalItems > 0 ? Math.round(group.totalRevenue / group.totalItems * 100) / 100 : 0,
    platforms: group.platforms,
  };
};

export const CategoryGroupedTable: React.FC<CategoryGroupedTableProps> = ({ groupedData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter data based on search term and platform
  const filteredData = filterGroupsBySearch(groupedData, searchTerm, platformFilter);

  const handlePlatformChange = (
    event: React.MouseEvent<HTMLElement>,
    newPlatform: Platform | null,
  ) => {
    if (newPlatform) {
      setPlatformFilter(newPlatform);
    }
  };

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
      case 'totalRevenue':
        aValue = aStats.totalRevenue;
        bValue = bStats.totalRevenue;
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
          <TableCell align="right">
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              <FormattedCurrency value={stats.totalRevenue} />
            </Typography>
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
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="right"><strong>Revenue</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.orders.map((order, index) => {
                      const revenue = (order.product?.sellingPrice || 0) * (parseInt(order.quantity) || 0);
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
                          <TableCell align="right" data-testid="unit-price">
                            <FormattedCurrency value={order.product?.sellingPrice || 0} />
                          </TableCell>
                          <TableCell align="right" data-testid="revenue">
                            <Typography sx={{ fontWeight: 500 }}>
                              <FormattedCurrency value={revenue} />
                            </Typography>
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
      {/* Search and Filter Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search by product name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, mr: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={platformFilter}
          exclusive
          onChange={handlePlatformChange}
          aria-label="platform filter"
        >
          <ToggleButton value="all" aria-label="all platforms">
            All
          </ToggleButton>
          <ToggleButton value="amazon" aria-label="amazon">
            Amazon
          </ToggleButton>
          <ToggleButton value="flipkart" aria-label="flipkart">
            Flipkart
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CategoryIcon sx={{ color: '#1976d2', fontSize: 32, mb: 1 }} />
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                {filteredData.summary.totalCategories}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ShoppingCartIcon sx={{ color: '#2e7d32', fontSize: 32, mb: 1 }} />
              <Typography variant="h6" color="success.dark" sx={{ fontWeight: 'bold' }}>
                {filteredData.summary.totalOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ed6c02' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <AttachMoneyIcon sx={{ color: '#ed6c02', fontSize: 32, mb: 1 }} />
              <Typography variant="h6" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                <FormattedCurrency value={filteredData.summary.totalRevenue} />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #9c27b0' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUpIcon sx={{ color: '#9c27b0', fontSize: 32, mb: 1 }} />
              <Typography variant="h6" color="secondary" sx={{ fontWeight: 'bold' }}>
                {Math.round(filteredData.summary.totalRevenue / Math.max(filteredData.summary.totalOrders, 1))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Order Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'totalRevenue'}
                  direction={sortField === 'totalRevenue' ? sortDirection : 'asc'}
                  onClick={() => handleSort('totalRevenue')}
                >
                  <strong>Revenue</strong>
                </TableSortLabel>
              </TableCell>
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