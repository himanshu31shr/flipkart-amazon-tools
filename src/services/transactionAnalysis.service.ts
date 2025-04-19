import {
  ProductPrice,
  Transaction,
  TransactionSummary,
} from "../types/transaction.type";

export class TransactionAnalysisService {
  private transactions: Transaction[];
  private productPrices: Map<string, ProductPrice>;

  constructor(transactions: Transaction[], productPrices: ProductPrice[] = []) {
    this.transactions = transactions;
    this.productPrices = new Map(productPrices.map((p) => [p.sku, p]));
  }

  private parseNumber(value: string | null | undefined): number {
    if (!value) return 0;
    const num = Number(value.replace(/[,₹]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  private isExpense(type: string | null | undefined): boolean {
    if (!type) return false;
    return [
      "adjustment",
      "refund",
      "service fee",
      "shipping services",
    ].includes(type.toLowerCase());
  }

  private isSale(type: string | null | undefined): boolean {
    if (!type) return false;
    return type.toLowerCase() === "order";
  }

  private calculateProductProfit(
    sku: string | null | undefined,
    saleAmount: number,
    quantity: number
  ): { profit: number; profitPerUnit: number } {
    if (!sku) return { profit: 0, profitPerUnit: 0 };

    const pricing = this.productPrices.get(sku);
    if (!pricing) {
      return { profit: 0, profitPerUnit: 0 };
    }

    const totalCost = pricing.costPrice * quantity;
    const profit = saleAmount - totalCost;
    return {
      profit,
      profitPerUnit: quantity > 0 ? profit / quantity : 0,
    };
  }

  analyze(): TransactionSummary {
    const summary: TransactionSummary = {
      totalSales: 0,
      totalExpenses: 0,
      expensesByCategory: {},
      salesByProduct: {},
      totalProfit: 0,
      totalUnits: 0,
      totalCost: 0,
    };

    for (const transaction of this.transactions) {
      if (!transaction || !transaction.type) continue;

      const type = transaction.type;
      const sku = transaction.sku;
      const amount = this.parseNumber(transaction.productSales);
      const quantity = this.parseNumber(transaction.quantity);
      const total = this.parseNumber(transaction.total);
      const sellingFees = this.parseNumber(transaction.sellingFees);
      const otherFees = this.parseNumber(transaction.otherTransactionFees);
      const fbaFees = this.parseNumber(transaction.fbaFees);
      const other = this.parseNumber(transaction.other);

      if (this.isExpense(type)) {
        const category = type.toLowerCase();
        const expenseAmount = Math.abs(total);
        summary.expensesByCategory[category] =
          (summary.expensesByCategory[category] || 0) + expenseAmount;
        summary.totalExpenses += expenseAmount;
      }

      if (this.isSale(type) && sku) {
        summary.totalSales += amount;

        // Sum up all fees for this sale
        const totalFees =
          Math.abs(sellingFees) +
          Math.abs(otherFees) +
          Math.abs(fbaFees) +
          Math.abs(other);
        summary.totalExpenses += totalFees;

        if (!summary.salesByProduct[sku]) {
          summary.salesByProduct[sku] = {
            units: 0,
            amount: 0,
            profit: 0,
            profitPerUnit: 0,
            description: transaction.description,
          };
        }

        const productSummary = summary.salesByProduct[sku];
        productSummary.units += quantity;
        productSummary.amount += amount;
        summary.totalUnits += quantity;
        summary.totalCost +=
          (this.productPrices.get(sku)?.costPrice || 0) * quantity;
      }
    }

    summary.totalProfit = summary.totalSales - summary.totalExpenses - summary.totalCost;
    return summary;
  }

  updateProductPrices(prices: ProductPrice[]): void {
    this.productPrices = new Map(prices.map((p) => [p.sku, p]));
  }

  getProductPrices(): ProductPrice[] {
    return Array.from(this.productPrices.values());
  }
}
