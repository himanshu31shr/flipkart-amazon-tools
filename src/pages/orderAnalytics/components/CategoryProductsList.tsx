import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
} from '@mui/material';
import { ProductSummary } from '../../home/services/base.transformer';
import { Category } from '../../../services/category.service';

interface CategoryProductsListProps {
  categoryName: string;
  products: ProductSummary[];
  categories: Category[];
  isOpen: boolean;
}

const CategoryProductsList: React.FC<CategoryProductsListProps> = ({
  categoryName,
  products,
  categories,
  isOpen,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Map categoryId to category name for display
  const categoryIdToName: Record<string, string> = {};
  categories.forEach(cat => {
    if (cat.id) categoryIdToName[cat.id] = cat.name;
  });

  // Sort products by quantity (descending)
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const quantityA = parseInt(a.quantity) || 0;
      const quantityB = parseInt(b.quantity) || 0;
      return quantityB - quantityA;
    });
  }, [products]);

  // Paginate products
  const paginatedProducts = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedProducts.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedProducts, page, rowsPerPage]);

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // Reset page when products change
  React.useEffect(() => {
    setPage(0);
  }, [products]);

  if (!isOpen) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2, mb: 1 }}>
        Products in &quot;{categoryName}&quot; Category
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {sortedProducts.length} products found
      </Typography>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">SKU</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProducts.map((product, index) => {
              const quantity = parseInt(product.quantity) || 0;
              const price = product.product?.sellingPrice || 0;
              const totalValue = quantity * price;
              
              return (
                <TableRow key={`${product.product?.sku}-${index}`} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {product.product?.name || 'Unknown Product'}
                      </Typography>
                      {product.product?.categoryId && (
                        <Chip
                          label={categoryIdToName[product.product.categoryId] || 'Unknown Category'}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontFamily="monospace">
                      {product.product?.sku || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {quantity.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      ₹{price.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      ₹{totalValue.toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      {sortedProducts.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            '.MuiTablePagination-selectLabel': {
              fontSize: '0.875rem',
            },
            '.MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
            },
          }}
        />
      )}
      
      {sortedProducts.length === 0 && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No products found in this category
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CategoryProductsList; 