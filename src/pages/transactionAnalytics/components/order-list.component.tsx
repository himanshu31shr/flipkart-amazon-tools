import React from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import { Transaction } from "../../../types/transaction.type";

interface OrderListProps {
  transactions: Transaction[];
}

interface OrderTableData {
  transactionId: string;
  sku: string;
  productName: string;
  platform: string;
  sellingPrice: number;
  total: number;
  productCost: number;
  costPriceSource: string;
  type: string;
}

const OrderList: React.FC<OrderListProps> = ({ transactions }) => {
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  const tableData: OrderTableData[] = transactions.map(transaction => {
    // Cost price calculation removed
    const resolvedCostPrice = 0;
    const costPriceSource = 'none';
    
    return {
      transactionId: transaction.transactionId || '',
      sku: transaction.sku || '',
      productName: transaction.product.name || transaction.description || 'Unknown Product',
      platform: transaction.platform || '',
      sellingPrice: transaction.sellingPrice || 0,
      total: transaction.total || 0,
      productCost: resolvedCostPrice,
      costPriceSource: costPriceSource,
      type: transaction.type || ''
    };
  });

  const columns: Column<OrderTableData>[] = [
    { id: 'transactionId', label: '#', filter: true },
    { id: 'sku', label: 'SKU', filter: true },
    { id: 'productName', label: 'Product Name', filter: true },
    { id: 'platform', label: 'Platform', filter: true },
    { 
      id: 'sellingPrice', 
      label: 'Selling Price', 
      align: 'right',
      filter: true,
      format: (value) => formatCurrency(value as number)
    },
    { 
      id: 'total', 
      label: 'Earnings', 
      align: 'right',
      format: (value) => formatCurrency(value as number)
    },
    { 
      id: 'productCost', 
      label: 'Product Cost', 
      align: 'right',
      format: (value) => formatCurrency(value as number)
    },
    {
      id: 'costPriceSource',
      label: 'Price Source',
      filter: true,
      format: (value) => {
        const source = value as string;
        let textColor = 'inherit';
        if (source === 'product') textColor = '#1976d2';
        if (source === 'category') textColor = '#9c27b0';
        
        return (
          <span style={{ 
            fontWeight: source === 'default' ? 'normal' : 'bold', 
            color: textColor 
          }}>
            {source}
          </span>
        );
      }
    },
    { id: 'type', label: 'Type', filter: true },
  ];

  return (
    <DataTable
      columns={columns}
      data={tableData}
      defaultSortColumn="transactionId"
      defaultSortDirection="asc"
      rowsPerPageOptions={[15, 30, 50]}
      defaultRowsPerPage={30}
    />
  );
};

export default OrderList;
