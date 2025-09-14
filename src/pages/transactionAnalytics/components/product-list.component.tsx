import React, { useMemo } from "react";
import { DataTable, Column } from "../../../components/DataTable/DataTable";
import { Transaction, TransactionSummary } from "../../../types/transaction.type";
import { Chip, Tooltip, ChipProps } from "@mui/material";

interface ProductTableData {
  sku: string;
  description: string;
  units: number;
  sales: number;
  cost: number;
  profit: number;
  costPriceSource?: 'category' | 'product' | 'default';
}

interface Props {
  transactions: Transaction[];
  summary?: TransactionSummary;
}

const ProductList: React.FC<Props> = ({ transactions, summary }) => {
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  const getCostPriceSourceColor = (source?: string): ChipProps['color'] => {
    switch (source) {
      case 'product':
        return 'success';
      case 'category':
        return 'primary';
      case 'default':
      default:
        return 'warning';
    }
  };

  const getCostPriceSourceTooltip = (source?: string) => {
    switch (source) {
      case 'product':
        return 'Custom cost price defined directly on the product';
      case 'category':
        return 'Cost price inherited from product category';
      case 'default':
      default:
        return 'Default cost price (no custom price or category price available)';
    }
  };

  const productArray = useMemo(() => {
    const productMap = new Map<string, ProductTableData>();

    if (summary) {
      // If we have summary data with cost price sources, use it
      Object.entries(summary.salesByProduct).forEach(([sku, productSummary]) => {
        productMap.set(sku, {
          sku,
          description: productSummary.description || productSummary.name || sku,
          units: productSummary.units,
          sales: productSummary.amount,
          cost: summary.totalCost * (productSummary.units / summary.totalUnits), // Estimate
          profit: productSummary.profit,
          costPriceSource: productSummary.costPriceSource
        });
      });
    } else {
      // Fallback to calculating from transactions directly
      transactions.forEach(transaction => {
        const sku = transaction.sku;
        const existing = productMap.get(sku) || {
          sku,
          description: transaction.description || sku,
          units: 0,
          sales: 0,
          cost: 0,
          profit: 0
        };

        existing.units += transaction.quantity;
        existing.sales += transaction.sellingPrice * transaction.quantity;
        
        // Cost price calculation removed (was using customCostPrice)
        const costPrice = 0;
        existing.cost += costPrice * transaction.quantity;
        
        // Calculate profit: sales - cost - expenses
        const expenses = transaction.expenses.shippingFee + 
                        transaction.expenses.marketplaceFee + 
                        transaction.expenses.otherFees;
        const transactionProfit = (transaction.sellingPrice * transaction.quantity) - 
                                (costPrice * transaction.quantity) - 
                                expenses;
        existing.profit += transactionProfit;

        productMap.set(sku, existing);
      });
    }

    return Array.from(productMap.values());
  }, [transactions, summary]);

  const columns: Column<ProductTableData>[] = [
    { id: 'sku', label: 'SKU', filter: true },
    { id: 'description', label: 'Description', filter: true },
    { 
      id: 'units', 
      label: 'Units', 
      align: 'right',
      format: (value) => String(value)
    },
    { 
      id: 'sales', 
      label: 'Sales', 
      align: 'right',
      format: (value) => formatCurrency(value as number)
    },
    { 
      id: 'cost', 
      label: 'Cost', 
      align: 'right',
      format: (value) => formatCurrency(value as number)
    },
    { 
      id: 'profit', 
      label: 'Profit', 
      align: 'right',
      format: (value) => formatCurrency(value as number)
    },
    {
      id: 'costPriceSource',
      label: 'Price Source',
      format: (value) => {
        const source = value as string || 'default';
        return (
          <Tooltip title={getCostPriceSourceTooltip(source)}>
            <Chip 
              size="small" 
              label={source.charAt(0).toUpperCase() + source.slice(1)} 
              color={getCostPriceSourceColor(source)}
              variant="outlined"
            />
          </Tooltip>
        );
      }
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={productArray}
      defaultSortColumn="sku"
      defaultSortDirection="asc"
      rowsPerPageOptions={[10, 25, 50]}
      defaultRowsPerPage={25}
    />
  );
};

export default ProductList;
