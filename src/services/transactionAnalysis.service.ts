import {
  ProductPrice,
  Transaction,
  TransactionSummary,
} from "../types/transaction.type";

export class TransactionAnalysisService {
  private transactions: Transaction[];
  private productPrices?: Map<string, ProductPrice>;

  constructor(
    transactions: Transaction[],
    productPrices: Map<string, ProductPrice>
  ) {
    // Only include transactions that have a valid type
    this.transactions = transactions.filter(
      (transaction) => !!transaction && !!transaction.type
    );

    this.productPrices = productPrices;
  }

  private isExpense(type: string | null | undefined): boolean {
    if (!type) return false;
    return [
      "adjustment",
      "refund",
      "service fee",
      "shipping services",
      "returned",
      "return_requested",
    ].includes(type.toLowerCase());
  }

  private isSale(type: string | null | undefined): boolean {
    if (!type) return false;

    return [
      "order",
      "delivered",
      "in_transit",
      "return_cancelled",
    ].includes(type.toLowerCase());
  }

  /**
   * Get cost price for a product (cost tracking removed - returns 0)
   */
  private getCostPrice(): number {
    return 0;
  }

  async analyze(): Promise<TransactionSummary> {
    // Cost price functionality removed

    const summary: TransactionSummary = {
      totalSales: 0,
      totalExpenses: 0,
      expensesByCategory: {},
      salesByProduct: {},
      totalProfit: 0,
      totalUnits: 0,
      totalCost: 0,
      profitBeforeCost: 0,
      costPriceSources: {
        product: 0,
        category: 0,
        default: 0
      },
      analyzedTransactions: []
    };

    // Create a copy of transactions that will include resolved cost prices
    const analyzedTransactions: Transaction[] = [];

    for (const transaction of this.transactions) {
      // Type safety is guaranteed by the filter in constructor
      const transactionType = transaction.type || "";
      const sku = transaction.sku;
      const quantity = transaction.quantity;
      const amount = transaction.sellingPrice;
      const earnings = transaction.total || 0;

      // Cost calculation simplified (cost tracking removed)

      // Add the transaction with resolved cost price to analyzedTransactions
      analyzedTransactions.push({...transaction});

      if (this.isExpense(transactionType)) {
        const category = transactionType?.toLowerCase();
        const totalExpenses =
          transaction.expenses.shippingFee +
          transaction.expenses.marketplaceFee +
          transaction.expenses.otherFees;
        summary.expensesByCategory[category] =
          (summary.expensesByCategory[category] || 0) + totalExpenses;
        summary.totalExpenses += totalExpenses;
      }

      if (this.isSale(transactionType)) {
        summary.totalSales += amount;

        // Add expenses for this sale
        const totalExpenses =
          transaction.expenses.shippingFee +
          transaction.expenses.marketplaceFee +
          transaction.expenses.otherFees;
        summary.totalExpenses += totalExpenses;

        const resolvedCostPrice = 0; // Cost tracking removed

        if (!summary.salesByProduct[sku]) {
          const productPrice = this.productPrices?.get(sku.toLowerCase());
          summary.salesByProduct[sku] = {
            units: 0,
            amount: 0,
            profit: 0,
            profitPerUnit: 0,
            name: productPrice?.name || sku,
            costPriceSource: 'default'
          };
        }

        const productSummary = summary.salesByProduct[sku];
        productSummary.units += quantity;
        productSummary.amount += earnings;
        summary.totalUnits += quantity;

        // Calculate costs correctly using quantity * resolved cost price
        const totalCost = resolvedCostPrice * quantity;
        summary.totalCost += totalCost;
        
        // Calculate profit
        const profit = earnings - totalCost;
        productSummary.profit += profit;
        
        // Calculate profit per unit
        if (productSummary.units > 0) {
          productSummary.profitPerUnit = productSummary.profit / productSummary.units;
        }

        summary.profitBeforeCost += earnings;
        summary.totalProfit += profit;
      }
    }

    // Add the analyzed transactions to the summary
    summary.analyzedTransactions = analyzedTransactions;
    
    return summary;
  }
}
