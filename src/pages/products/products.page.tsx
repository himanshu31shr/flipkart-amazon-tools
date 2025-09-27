import {
  Box,
  CircularProgress,
  Typography,
  Container,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import React, { useEffect } from "react";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchProducts,
  importProducts,
  updateProduct,
  setFilters,
  bulkUpdateProducts,
} from "../../store/slices/productsSlice";
import { selectIsAuthenticated } from "../../store/slices/authSlice";
import { Product, ProductFilter } from "../../services/product.service";
import { ProductEditModal } from "./components/ProductEditModal";
import { ProductImportSection } from "./components/ProductImportSection";
import { ProductTable } from "./components/ProductTable";

export const ProductsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    items: products,
    filteredItems: filteredProducts,
    loading,
  } = useAppSelector((state) => state.products);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(
    null
  );

  useEffect(() => {
    // Only fetch products if authenticated
    if (isAuthenticated) {
      dispatch(fetchProducts({}));
    }
  }, [dispatch, isAuthenticated]);

  const handleProductImport = async (file: File, updateExisting?: boolean) => {
    try {
      await dispatch(importProducts({ file, updateExisting })).unwrap();
    } catch {
      // Error handling - could show toast notification
    }
  };

  const handleProductUpdate = async (sku: string, data: Partial<Product>) => {
    try {
      await dispatch(updateProduct({ sku, data })).unwrap();
      setEditingProduct(null);
    } catch {
      // Error handling - could show toast notification
    }
  };

  const handleBulkCategoryUpdate = async (
    skus: string[],
    categoryId: string
  ) => {
    try {
      await dispatch(
        bulkUpdateProducts({ skus, data: { categoryId } })
      ).unwrap();
    } catch {
      // Error handling - could show toast notification
    }
  };


  const handleFilterChange = (filters: ProductFilter) => {
    dispatch(setFilters(filters));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <InventoryIcon
              sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: "bold", color: "primary.dark" }}
            >
              Product Management
            </Typography>
            <Chip
              label={`${products.length} Products`}
              color="primary"
              size="medium"
              sx={{ ml: 2 }}
            />
          </Box>
          <ProductImportSection onImport={handleProductImport} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ width: "100%" }}>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              m={4}
            >
              <CircularProgress color="primary" size={40} thickness={4} />
            </Box>
          ) : (
            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: "bold", color: "primary.dark" }}
              >
                Product Catalog
              </Typography>
              <ProductTable
                products={filteredProducts}
                allProducts={products}
                onEdit={setEditingProduct}
                onFilterChange={handleFilterChange}
                onBulkCategoryUpdate={handleBulkCategoryUpdate}
              />
            </Box>
          )}
        </Box>

        {editingProduct && (
          <ProductEditModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={handleProductUpdate}
          />
        )}
      </Paper>
    </Container>
  );
};

export default ProductsPage;
