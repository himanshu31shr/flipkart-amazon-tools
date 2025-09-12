import { Product } from "../services/product.service";
import { CostPriceResolution } from "../services/costPrice.service";

// Extend Product interface to support resolvedCostPrice
declare module "../services/product.service" {
  interface Product {
    resolvedCostPrice?: CostPriceResolution;
  }
}

/**
 * Batch information for grouping orders from the same PDF upload
 */
export interface BatchInfo {
  /** Unique identifier for the batch */
  batchId: string;
  /** ISO timestamp when the batch was uploaded */
  uploadedAt: string;
  /** Original filename of the uploaded PDF */
  fileName: string;
  /** Firebase storage file ID (optional) */
  fileId?: string;
  /** Optional description of the batch */
  description?: string;
  /** Platform type for the batch */
  platform: 'amazon' | 'flipkart' | 'mixed';
  /** Number of orders in this batch */
  orderCount: number;
  /** Additional metadata */
  metadata: {
    /** User ID who uploaded the batch */
    userId: string;
    /** Date selected for processing (YYYY-MM-DD) */
    selectedDate: string;
    /** ISO timestamp when batch was processed */
    processedAt: string;
  };
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
  /** Optional batch information for grouping orders */
  batchInfo?: BatchInfo;
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