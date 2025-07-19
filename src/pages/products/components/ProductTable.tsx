import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Chip,
  IconButton,
  Checkbox,
  Snackbar,
  Alert,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
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
import { CostPriceResolutionService } from '../../../services/costPrice.service';

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
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [productCostPrices, setProductCostPrices] = useState<Record<string, { value: number; source: string }>>({});
  const [loadingCostPrices, setLoadingCostPrices] = useState(false);

  const costPriceService = useMemo(() => new CostPriceResolutionService(), []);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Fetch cost prices for all products
  useEffect(() => {
    const fetchCostPrices = async () => {
      setLoadingCostPrices(true);
      
      try {
        const resolutions = await costPriceService.initializeCostPrices(products);
        const costPrices: Record<string, { value: number; source: string }> = {};
        
        resolutions.forEach((resolution, sku) => {
          costPrices[sku] = {
            value: resolution.value,
            source: resolution.source
          };
        });
        
        setProductCostPrices(costPrices);
      } catch (error) {
        console.error('Error fetching cost prices:', error);
        setSnackbarMessage('Failed to fetch cost prices');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingCostPrices(false);
      }
    };

    if (products.length > 0) {
      fetchCostPrices();
    }
  }, [products, costPriceService]);

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
      id: "costPrice",
      label: "Cost Price",
      align: "right",
      format: (_, row?: Product) => {
        if (!row?.sku) {
          return null;
        }
        
        if (loadingCostPrices) {
          return <CircularProgress size={20} />;
        }

        const costPriceInfo = productCostPrices[row.sku];
        
        if (!costPriceInfo || typeof costPriceInfo.value !== 'number') {
          return <FormattedCurrency value={0} />;
        }
        
        return (
          <Tooltip title={`Cost price ${costPriceInfo.value} (from ${costPriceInfo.source})`}>
            <Box>
              <FormattedCurrency value={costPriceInfo.value} />
            </Box>
          </Tooltip>
        );
      },
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
