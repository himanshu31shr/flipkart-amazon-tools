import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Chip,
  IconButton,
  Checkbox,
  Snackbar,
  Alert,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import { FormattedCurrency } from "../../../components/FormattedCurrency";
import { Product, ProductFilter } from "../../../services/product.service";
import {
  ViewAmazonListingButton,
  ViewFlipkartListingButton,
} from "../../../shared/ActionButtons";
import { ProductTableToolbar } from "./ProductTableToolbar";
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCategories, selectCategories } from '../../../store/slices/productsSlice';

interface Props {
  products: Product[];
  allProducts?: Product[]; // All products for CSV export (optional, defaults to products)
  onEdit: (product: Product) => void;
  onFilterChange: (filter: ProductFilter) => void;
  onBulkCategoryUpdate?: (skus: string[], categoryId: string) => void;
}

export const ProductTable: React.FC<Props> = ({
  products,
  allProducts,
  onEdit,
  onFilterChange,
  onBulkCategoryUpdate,
}) => {
  const dispatch = useAppDispatch();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<ProductFilter>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const categories = useAppSelector(selectCategories);

  const handleFilterChange = (filters: ProductFilter) => {
    setCurrentFilters(filters);
    onFilterChange(filters);
  };

  const handleSelectProduct = (sku: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(sku)) {
        return prev.filter(p => p !== sku);
      }
      return [...prev, sku];
    });
  };

  const handleBulkCategoryUpdate = async (skus: string[], categoryId: string) => {
    if (onBulkCategoryUpdate) {
      try {
        await onBulkCategoryUpdate(skus, categoryId);
        
        // Clear selected products after successful assignment
        setSelectedProducts([]);
        
        // Show success notification
        const categoryName = getCategoryName(categoryId);
        setSnackbarMessage(`Successfully assigned ${skus.length} product(s) to category "${categoryName}"`);
        setSnackbarOpen(true);
      } catch {
        // Show error notification
        setSnackbarMessage('Failed to assign category to products');
        setSnackbarOpen(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "-";
    if (!Array.isArray(categories)) {
        return "-";
    }
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "-";
  };

  const columns: Column<Product>[] = [
    {
      id: "select",
      label: "",
      format: (_, row?: Product) => row ? (
        <Checkbox
          checked={selectedProducts.includes(row.sku)}
          onChange={() => handleSelectProduct(row.sku)}
        />
      ) : null,
    },
    { id: "sku", label: "SKU", filter: true },
    { id: "name", label: "Name", filter: true },
    {
      id: "categoryId",
      label: "Category",
      filter: true,
      format: (value) => <Chip label={getCategoryName(value as string)} size="small" />,
      filterValue: (row) => getCategoryName(row.categoryId)
    },
    {
      id: "platform",
      label: "Platform",
      format: (value: unknown) => {
        const platform = value as string;
        return (
          <Chip
            label={platform.toUpperCase()}
            color={value === "amazon" ? "default" : "primary"}
          />
        );
      },
      filter: true,
    },
    {
      id: "sellingPrice",
      label: "Selling Price",
      align: "right",
      format: (value) => <FormattedCurrency value={value as number} />,
    },
    {
      id: "actions",
      label: "Actions",
      align: "center",
      format: (_, row) => renderActions(row as Product),
    },
  ];

  const renderActions = (product: Product) => (
    <>
      <IconButton
        size="small"
        aria-label={`edit-${product.sku}`}
        onClick={() => onEdit(product)}
      >
        <EditIcon />
      </IconButton>
      {product.metadata?.flipkartSerialNumber && (
        <ViewFlipkartListingButton
          flipkartSerialNumber={product.metadata.flipkartSerialNumber}
        />
      )}

      {product.metadata?.amazonSerialNumber && (
        <ViewAmazonListingButton
          amazonSerialNumber={product.metadata.amazonSerialNumber}
        />
      )}
    </>
  );

  return (
    <Box sx={{ width: "100%" }}>
      <ProductTableToolbar
        platform={currentFilters.platform}
        search={currentFilters.search}
        selectedProducts={selectedProducts}
        categories={categories}
        allProducts={allProducts || products}
        onFilterChange={handleFilterChange}
        onBulkCategoryUpdate={handleBulkCategoryUpdate}
      />

      <DataTable
        columns={columns}
        data={products}
        defaultSortColumn="sku"
        defaultSortDirection="asc"
        rowsPerPageOptions={[10, 25, 50]}
        defaultRowsPerPage={10}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
