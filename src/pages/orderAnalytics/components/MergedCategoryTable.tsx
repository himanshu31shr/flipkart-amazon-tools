import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Collapse,
  IconButton,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { HistoricalCategoryData } from '../hooks/useHistoricalData';
import ComparisonIndicator from './ComparisonIndicator';
import { Category } from '../../../services/category.service';
import { ProductSummary } from '../../home/services/base.transformer';
import { FormattedCurrency } from '../../../components/FormattedCurrency';
import CategoryProductsList from './CategoryProductsList';

interface MergedCategoryTableProps {
  historicalData: HistoricalCategoryData[];
  orders: ProductSummary[];
  categories: Category[];
}

interface MergedCategoryRow {
  categoryId: string;
  categoryName: string;
  totalOrders: number;
  todayOrders: number;
  yesterdayOrders: number;
  orderChange: number;
  orderChangePercent: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

const MergedCategoryTable: React.FC<MergedCategoryTableProps> = ({ 
  historicalData, 
  orders, 
  categories 
}) => {
  const [loading, setLoading] = useState(true);
  const [mergedData, setMergedData] = useState<MergedCategoryRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Memoized category mapping
  const categoryIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      if (cat.id) {
        map[cat.id] = cat.name;
      }
    });
    return map;
  }, [categories]);

  // Memoized products for category mapping
  const productsForCategory = useMemo(() => {
    const map: Record<string, ProductSummary[]> = {};
    orders.forEach(order => {
      const categoryId = order.product?.categoryId;
      const category = categoryId ? (categoryIdToName[categoryId] || 'Uncategorized') : 'Uncategorized';
      if (!map[category]) {
        map[category] = [];
      }
      map[category].push(order);
    });
    return map;
  }, [orders, categoryIdToName]);

  // Get products for selected category (memoized)
  const getProductsForCategory = useCallback((categoryName: string): ProductSummary[] => {
    return productsForCategory[categoryName] || [];
  }, [productsForCategory]);

  // Handle row click to expand/collapse
  const handleRowClick = useCallback((categoryName: string) => {
    setExpandedRows(prev => {
      const newExpandedRows = new Set(prev);
      if (newExpandedRows.has(categoryName)) {
        newExpandedRows.delete(categoryName);
      } else {
        newExpandedRows.add(categoryName);
      }
      return newExpandedRows;
    });
  }, []);

  // Handle pagination
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Memoized financial data calculation
  const financialData = useMemo(() => {
    const data: Record<string, { revenue: number; cost: number; profit: number }> = {};
    
    // Group orders by category for batch processing
    const ordersByCategory: Record<string, ProductSummary[]> = {};
    orders.forEach(order => {
      const categoryId = order.product?.categoryId;
      const categoryName = categoryId ? (categoryIdToName[categoryId] || 'Uncategorized') : 'Uncategorized';
      
      if (!ordersByCategory[categoryName]) {
        ordersByCategory[categoryName] = [];
      }
      ordersByCategory[categoryName].push(order);
    });

    // Calculate financial data for each category
    Object.entries(ordersByCategory).forEach(([categoryName, categoryOrders]) => {
      data[categoryName] = { revenue: 0, cost: 0, profit: 0 };
      
      categoryOrders.forEach(order => {
        const quantity = parseInt(order.quantity) || 1;
        const sellingPrice = order.product?.sellingPrice || 0;
        
        // Use default cost price if not available (avoid API calls)
        const costPrice = order.product?.customCostPrice || 0;
        
        data[categoryName].revenue += sellingPrice * quantity;
        data[categoryName].cost += costPrice * quantity;
      });
      
      data[categoryName].profit = data[categoryName].revenue - data[categoryName].cost;
    });

    return data;
  }, [orders, categoryIdToName]);

  // Memoized merged data calculation
  const calculateMergedData = useMemo(() => {
    if (!historicalData.length) return [];

    const merged: MergedCategoryRow[] = [];
    
    // Add all categories from historical data
    historicalData.forEach(historical => {
      const financial = financialData[historical.categoryName] || { revenue: 0, cost: 0, profit: 0 };
      const profitMargin = financial.revenue > 0 ? (financial.profit / financial.revenue) * 100 : 0;
      
      merged.push({
        categoryId: historical.categoryId,
        categoryName: historical.categoryName,
        totalOrders: historical.totalOrders,
        todayOrders: historical.todayOrders,
        yesterdayOrders: historical.yesterdayOrders,
        orderChange: historical.orderChange,
        orderChangePercent: historical.orderChangePercent,
        totalRevenue: financial.revenue,
        totalCost: financial.cost,
        profit: financial.profit,
        profitMargin,
      });
    });

    return merged;
  }, [historicalData, financialData]);

  // Update merged data when calculation changes
  useEffect(() => {
    setMergedData(calculateMergedData);
    setLoading(false);
  }, [calculateMergedData]);

  // Sort data by total orders (descending)
  const sortedData = useMemo(() => {
    return [...mergedData].sort((a, b) => b.totalOrders - a.totalOrders);
  }, [mergedData]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (!mergedData.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <Box textAlign="center">
          <Box color="text.secondary" mb={2}>
            No category data available
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"></TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Orders</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Today vs Yesterday</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Revenue</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Profit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const isExpanded = expandedRows.has(row.categoryName);
              const products = getProductsForCategory(row.categoryName);
              
              return (
                <React.Fragment key={row.categoryId}>
                  <TableRow 
                    hover 
                    onClick={() => handleRowClick(row.categoryName)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(row.categoryName);
                        }}
                      >
                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell align="right">{row.totalOrders.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <ComparisonIndicator
                        value={row.orderChange}
                        percentage={row.orderChangePercent}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <FormattedCurrency value={row.totalRevenue} />
                    </TableCell>
                    <TableCell align="right">
                      <FormattedCurrency value={row.totalCost} />
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <FormattedCurrency value={row.profit} />
                        <Box fontSize="0.75rem" color="text.secondary">
                          {row.profitMargin.toFixed(1)}%
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable products row */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <CategoryProductsList
                            categoryName={row.categoryName}
                            products={products}
                            categories={categories}
                            isOpen={true}
                          />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default MergedCategoryTable; 