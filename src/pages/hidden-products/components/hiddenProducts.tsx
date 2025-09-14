import { ArrowUpwardOutlined } from "@mui/icons-material";
import { Box, CircularProgress } from "@mui/material";
import React from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import { FormattedCurrency } from "../../../components/FormattedCurrency";
import { Product } from "../../../services/product.service";
import {
  ShowProductEditPageButton,
  ViewAmazonListingButton,
  ViewFlipkartListingButton,
} from "../../../shared/ActionButtons";
import { useAppSelector } from "../../../store/hooks";

interface HiddenProductsProps {
  mode?: "hidden" | "price";
}

export const HiddenProducts: React.FC<HiddenProductsProps> = ({
  mode = "price",
}) => {
  const { items: products, loading } = useAppSelector(
    (state) => state.products
  );

  let hiddenProducts = [];

  if (mode === "price") {
    hiddenProducts = products
      .filter(
        (product: Product) =>
          product?.competitionAnalysis &&
          Number(product?.competitionAnalysis?.competitorPrice) > 0
          &&
          product.sellingPrice > Number(product.competitionAnalysis.competitorPrice)
      )
  } else {
    hiddenProducts = products.filter(
      (product: Product) => !product?.existsOnSellerPage
    );
  }

  const columns: Column<Product>[] = [
    { id: "sku", label: "SKU", filter: true },
    { id: "name", label: "Name", filter: true },
    {
      id: "platform",
      label: "Platform",
      filter: true,
    },
    {
      id: "sellingPrice",
      label: "Selling Price",
      align: "center",
      format: (value, row?: Product) => (
        <>
          <FormattedCurrency value={value as number} />
          <Box
            gap={1}
            color="red"
            fontSize={12}
            display={"flex"}
            alignContent={"center"}
            justifyContent={"center"}
          >
            <FormattedCurrency
              value={
                (row?.sellingPrice ?? 0) -
                Number(row?.competitionAnalysis?.competitorPrice)
              }
            />
            <ArrowUpwardOutlined style={{ fontSize: 12 }} />
          </Box>
        </>
      ),
    },
    {
      id: "competitorPrice",
      label: "Competitor Price",
      align: "right",
      format: (value, row?: Product) =>
        row?.competitionAnalysis?.competitorPrice ? (
          <FormattedCurrency
            value={Number(row.competitionAnalysis.competitorPrice)}
          />
        ) : null,
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
      {product.metadata?.flipkartSerialNumber && product.platform === "flipkart" && (
        <ViewFlipkartListingButton
          flipkartSerialNumber={product.metadata.flipkartSerialNumber}
        />
      )}

      {product.metadata?.amazonSerialNumber && product.platform === "amazon" && (
        <ViewAmazonListingButton
          amazonSerialNumber={product.metadata.amazonSerialNumber}
        />
      )}

      <ShowProductEditPageButton sku={product.sku} platform={product.platform} />
    </>
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <DataTable
        columns={columns}
        data={hiddenProducts}
        defaultSortColumn="sku"
        defaultSortDirection="asc"
        rowsPerPageOptions={[10, 25, 50]}
        defaultRowsPerPage={10}
      />
    </Box>
  );
};
