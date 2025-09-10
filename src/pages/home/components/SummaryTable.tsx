import {
  Chip
} from "@mui/material";
import React, { useMemo } from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import {
  ViewAmazonListingButton,
  ViewFlipkartListingButton,
} from "../../../shared/ActionButtons";
import { ProductSummary } from "../services/base.transformer";
import { Product } from "../../../types/product";
import { Category } from "../../../types/category";
import { Platform } from "../../todaysOrders/components/PlatformFilter";

interface SummaryTableProps {
  summary: ProductSummary[];
  products?: Product[];
  categories?: Category[];
  platformFilter?: Platform;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({
  summary,
  products,
  categories,
  platformFilter = 'all',
}: SummaryTableProps) => {
  const renderActions = (product: ProductSummary) => (
    <>
      {product.product?.platform === 'flipkart' && 
       product.product?.metadata?.flipkartSerialNumber &&
       product.product.metadata.flipkartSerialNumber.trim() !== '' && (
        <ViewFlipkartListingButton
          flipkartSerialNumber={product.product.metadata.flipkartSerialNumber}
        />
      )}

      {product.product?.platform === 'amazon' && 
       product.product?.metadata?.amazonSerialNumber &&
       product.product.metadata.amazonSerialNumber.trim() !== '' && (
        <ViewAmazonListingButton
          amazonSerialNumber={product.product.metadata.amazonSerialNumber}
        />
      )}
    </>
  );

  // Filter data based on platform
  const filteredSummary = useMemo(() => {
    if (platformFilter === 'all') return summary;
    return summary.filter(item => item.type === platformFilter);
  }, [summary, platformFilter]);

  // Get category name if available from products and categories props
  const getCategoryName = (item: ProductSummary) => {
    // Use the item's category if it already has it
    if (item.category) return item.category;
    
    // Try to find product matching the SKU
    if (products?.length && item.SKU) {
      const product = products.find(p => p.sku === item.SKU);
      if (product?.categoryId && categories?.length) {
        const category = categories.find(c => c.id === product.categoryId);
        return category?.name || 'Uncategorized';
      }
    }
    
    return 'Uncategorized';
  };

  const columns: Column<ProductSummary>[] = [
    { id: "SKU", label: "SKU", filter: true },
    { id: "name", label: "Name", filter: true },
    {
      id: "category",
      label: "Category",
      filter: true,
      format: (_, row) => {
        const categoryName = getCategoryName(row as ProductSummary);
        return categoryName !== 'Uncategorized' ? (
          <Chip
            label={categoryName}
            color="secondary"
            variant="outlined"
            size="small"
          />
        ) : (
          <Chip
            label="Uncategorized"
            color="default"
            variant="outlined"
            size="small"
          />
        );
      },
    },
    {
      id: "quantity",
      label: "Quantity",
      align: "right",
      format: (value: unknown) => <span>{(value as string).toString()}</span>,
    },
    {
      id: "type",
      label: "Platform",
      format: (value: unknown) => {
        return (
          <Chip
            label={(value as string).toUpperCase()}
            color={value === "amazon" ? "default" : "primary"}
          />
        );
      },
      filter: true,
    },
    {
      id: "actions",
      label: "Actions",
      align: "center",
      format: (_, row) => renderActions(row as ProductSummary),
    },
  ];

  return (
    <DataTable
      id="summary-table"
      columns={columns}
      data={filteredSummary}
      defaultSortColumn="quantity"
      defaultSortDirection="desc"
      rowsPerPageOptions={[10, 20, 40, 80, 100]}
      defaultRowsPerPage={20}
    />
  );
};
