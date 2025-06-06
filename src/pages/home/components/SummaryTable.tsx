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

interface SummaryTableProps {
  summary: ProductSummary[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({
  summary,
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

  const columns: Column<ProductSummary>[] = [
    { id: "SKU", label: "SKU", filter: true },
    { id: "name", label: "Name", filter: true },
    {
      id: "category",
      label: "Category",
      filter: true,
      format: (value: unknown) => {
        const categoryName = value as string;
        return categoryName ? (
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
      data={summary}
      defaultSortColumn="sku"
      defaultSortDirection="asc"
      rowsPerPageOptions={[10, 20, 40, 80, 100]}
      defaultRowsPerPage={20}
    />
  );
};
