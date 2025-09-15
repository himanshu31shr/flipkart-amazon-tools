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
import { Product, ProductFilter, ProductWithCategoryGroup } from "../../../services/product.service";
import {
  ViewAmazonListingButton,
  ViewFlipkartListingButton,
} from "../../../shared/ActionButtons";
import { ProductTableToolbar } from "./ProductTableToolbar";
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCategories, selectCategories } from '../../../store/slices/productsSlice';

interface Props {
  products: Product[] | ProductWithCategoryGroup[];
  allProducts?: Product[] | ProductWithCategoryGroup[]; // All products for CSV export (optional, defaults to products)
  onEdit: (product: Product | ProductWithCategoryGroup) => void;
  onFilterChange: (filter: ProductFilter) => void;
  onBulkCategoryUpdate?: (skus: string[], categoryId: string) => void;
  onBulkGroupUpdate?: (skus: string[], groupId: string | null) => void;
}

export const ProductTable: React.FC<Props> = ({
  products,
  allProducts,
  onEdit,
  onFilterChange,
  onBulkCategoryUpdate,
  onBulkGroupUpdate,
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

  const getContrastColor = (hexColor: string): string => {
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    } catch {
      return '#000000';
    }
  };

  const isProductWithCategoryGroup = (product: Product | ProductWithCategoryGroup): product is ProductWithCategoryGroup => {
    return 'category' in product;
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
      format: (value, row) => {
        const product = row as Product | ProductWithCategoryGroup;
        if (isProductWithCategoryGroup(product) && product.category) {
          return <Chip label={product.category.name} size="small" />;
        }
        return <Chip label={getCategoryName(value as string)} size="small" />;
      },
      filterValue: (row) => {
        const product = row as Product | ProductWithCategoryGroup;
        if (isProductWithCategoryGroup(product) && product.category) {
          return product.category.name;
        }
        return getCategoryName((row as Product).categoryId);
      }
    },
    {
      id: "categoryGroup",
      label: "Group",
      filter: true,
      format: (_, row) => {
        const product = row as Product | ProductWithCategoryGroup;
        if (isProductWithCategoryGroup(product) && product.category?.categoryGroup) {
          const group = product.category.categoryGroup;
          return (
            <Chip
              label={group.name}
              size="small"
              sx={{
                backgroundColor: group.color,
                color: getContrastColor(group.color),
                fontWeight: 'medium',
              }}
            />
          );
        }
        return <Chip label="-" size="small" variant="outlined" />;
      },
      filterValue: (row) => {
        const product = row as Product | ProductWithCategoryGroup;
        return isProductWithCategoryGroup(product) && product.category?.categoryGroup 
          ? product.category.categoryGroup.name 
          : '-';
      }
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
        groupFilter={currentFilters.groupFilter}
        selectedProducts={selectedProducts}
        categories={categories}
        allProducts={allProducts || products}
        onFilterChange={handleFilterChange}
        onBulkCategoryUpdate={handleBulkCategoryUpdate}
        onBulkGroupUpdate={onBulkGroupUpdate}
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
