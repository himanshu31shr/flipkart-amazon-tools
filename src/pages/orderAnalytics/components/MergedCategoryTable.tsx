import React, { useMemo, useEffect, useState } from 'react';
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
import { CostPriceResolutionService } from '../../../services/costPrice.service';
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
  const costPriceService = useMemo(() => new CostPriceResolutionService(), []);
  const [loading, setLoading] = useState(true);
  const [mergedData, setMergedData] = useState<MergedCategoryRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Map categoryId to category name
  const categoryIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      if (cat.id) {
        map[cat.id] = cat.name;
      }
    });
    return map;
  }, [categories]);

  // Get products for selected category
  const getProductsForCategory = (categoryName: string): ProductSummary[] => {
    return orders.filter(order => {
      const categoryId = order.product?.categoryId;
      const category = categoryId ? (categoryIdToName[categoryId] || 'Uncategorized') : 'Uncategorized';
      return category === categoryName;
    });
  };

  // Handle row click to expand/collapse
  const handleRowClick = (categoryName: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(categoryName)) {
      newExpandedRows.delete(categoryName);
    } else {
      newExpandedRows.add(categoryName);
    }
    setExpandedRows(newExpandedRows);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const mergeData = async () => {
      setLoading(true);
      
      // Create a map of historical data by categoryId
      const historicalMap = new Map<string, HistoricalCategoryData>();
      historicalData.forEach(item => {
        historicalMap.set(item.categoryId, item);
      });

      // Calculate financial data for each category
      const financialData: Record<string, { revenue: number; cost: number; profit: number }> = {};
      
      for (const order of orders) {
        const categoryId = order.product?.categoryId;
        const categoryName = categoryId ? (categoryIdToName[categoryId] || 'Uncategorized') : 'Uncategorized';
        
        if (!financialData[categoryName]) {
          financialData[categoryName] = { revenue: 0, cost: 0, profit: 0 };
        }

        if (order.product?.sku) {
          const resolution = await costPriceService.getProductCostPrice(order.product.sku);
          const costPrice = resolution.value;
          const quantity = parseInt(order.quantity) || 1;
          const sellingPrice = order.product.sellingPrice || 0;

          financialData[categoryName].revenue += sellingPrice * quantity;
          financialData[categoryName].cost += costPrice * quantity;
          financialData[categoryName].profit = financialData[categoryName].revenue - financialData[categoryName].cost;
        }
      }

      // Merge historical and financial data
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

      // Add categories that only exist in financial data (if any)
      Object.entries(financialData).forEach(([categoryName, financial]) => {
        const exists = merged.some(item => item.categoryName === categoryName);
        if (!exists) {
          const profitMargin = financial.revenue > 0 ? (financial.profit / financial.revenue) * 100 : 0;
          merged.push({
            categoryId: `financial-${categoryName}`,
            categoryName,
            totalOrders: 0,
            todayOrders: 0,
            yesterdayOrders: 0,
            orderChange: 0,
            orderChangePercent: 0,
            totalRevenue: financial.revenue,
            totalCost: financial.cost,
            profit: financial.profit,
            profitMargin,
          });
        }
      });

      setMergedData(merged);
      setLoading(false);
    };

    mergeData();
  }, [historicalData, orders, categories, categoryIdToName, costPriceService]);

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