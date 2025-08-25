import { Product } from "../services/product.service";
import { CostPriceResolution } from "../services/costPrice.service";

// Extend Product interface to support resolvedCostPrice
declare module "../services/product.service" {
  interface Product {
    resolvedCostPrice?: CostPriceResolution;
  }
}

export interface Transaction {
  transactionId: string;
  platform: 'amazon' | 'flipkart';
  orderDate: string;
  sku: string;
  quantity: number;
  sellingPrice: number;
  description?: string;
  type?: string;
  marketplace?: string;
  orderStatus?: string;
  total?: number;
  productSales?: string | number;
  accNetSales?: number;
  sellingFees?: string | number;
  fbaFees?: string | number;
  otherTransactionFees?: string | number;
  other?: string | number;
  expenses: {
    shippingFee: number;
    marketplaceFee: number;
    otherFees: number;
  };
  product: Product;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
  hash: string;
  // New fields for batching
  batchNumber?: string; // Unique identifier for the batch of merged PDFs
  batchTimestamp?: string; // Timestamp when the batch was processed (ISO string)
}

export interface ProductPrice {
  sku: string;
  name?: string;
  description?: string;
  costPrice?: number;
  basePrice?: number;
}

export interface TransactionSummary {
  totalSales: number;
  totalExpenses: number;
  expensesByCategory: {
    [key: string]: number;
  };
  salesByProduct: {
    [sku: string]: {
      units: number;
      amount: number;
      profit: number;
      profitPerUnit: number;
      name: string;
      description?: string;
      costPriceSource?: 'category' | 'product' | 'default';
    };
  };
  totalProfit: number;
  totalUnits: number;
  totalCost: number;
  profitBeforeCost: number;
  costPriceSources?: {
    product: number;
    category: number;
    default: number;
  };
  analyzedTransactions?: Transaction[];
}

export interface PriceMapping {
  [sku: string]: ProductPrice;
}