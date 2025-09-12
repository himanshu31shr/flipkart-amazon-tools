import {
  Chip
} from "@mui/material";
import React from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import {
  ViewAmazonListingButton,
  ViewFlipkartListingButton,
} from "../../../shared/ActionButtons";
import { ProductSummary } from "../services/base.transformer";
import { Product } from "../../../types/product";
import { Category } from "../../../types/category";

interface SummaryTableProps {
  summary: ProductSummary[];
  products?: Product[];
  categories?: Category[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({
  summary,
  products,
  categories,
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

  // No longer need platform filtering since it's handled in Redux
  const filteredSummary = summary;

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
      id: "batchInfo",
      label: "Batch",
      filter: true,
      format: (_, row) => {
        const item = row as ProductSummary;
        if (!item.batchInfo) {
          return (
            <Chip
              label="Legacy"
              color="default"
              variant="outlined"
              size="small"
            />
          );
        }
        return (
          <Chip
            label={item.batchInfo.fileName.substring(0, 20) + (item.batchInfo.fileName.length > 20 ? '...' : '')}
            color="info"
            variant="outlined"
            size="small"
            title={`${item.batchInfo.fileName} - ${item.batchInfo.orderCount} orders`}
          />
        );
      },
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
