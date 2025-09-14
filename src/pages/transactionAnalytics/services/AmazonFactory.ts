import Papa from "papaparse";
import { Transaction } from "../../../types/transaction.type";
import { AmazonCsvData } from "../../../types/types";
import { AbstractFactory } from "./ReportExtractionFactory";

interface AmazonRawData {
  data: AmazonCsvData[];
  error: Map<string, string>;
  meta: Map<string, string | object | Array<string>>;
}

export class AmazonFactory implements AbstractFactory {
  public file: File;
  public transactions: Transaction[] = [];
  private ordersData: AmazonRawData | undefined;

  constructor(file: File) {
    this.file = file;
    this.rowToTransaction = this.rowToTransaction.bind(this);
    this.transformTransactions = this.transformTransactions.bind(this);
    this.parseCsvData = this.parseCsvData.bind(this);
    this.reponseAdapter = this.reponseAdapter.bind(this);
    this.process = this.process.bind(this);
  }

  private parseCurrencyValue(value: string | null | undefined): number {
    if (!value) return 0;
    // Remove currency symbol, commas, and spaces
    const cleaned = value.replace(/[₹,\s]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private async parseCsvData(): Promise<void> {
    this.ordersData = (await new Promise<Papa.ParseResult<unknown>>((resolve, reject) => {
      Papa.parse(this.file, {
        complete: resolve,
        header: true,
        skipEmptyLines: true,
        beforeFirstChunk: function(chunk) {
          const linesToSkip = 11;
          let eof = chunk.indexOf("\n");
          for (let i = 1; i < linesToSkip && eof > 0; ++i) {
            eof = chunk.indexOf("\n", eof + 1);
          }
          return chunk.substring(eof + 1);
        },
        error: reject,
      });
    })) as unknown as AmazonRawData;
  }

  private transformTransactions(): void {
    if (!this.ordersData) {
      throw new Error("No data to transform");
    }

    this.transactions = this.ordersData.data
      .filter((row) => row && typeof row === "object" && row.type)
      .map(this.rowToTransaction)
      .filter((transaction): transaction is Transaction => !!transaction && !!transaction.type && !!transaction.sku);
  }

  private rowToTransaction(row: AmazonCsvData): Transaction | null {
    const sku = row["Sku"] || row["sku"] || "";
    const type = row["type"]?.toLowerCase();

    // Skip non-order transactions
    if (!type || !["order", "shipped", "refund"].includes(type)) {
      return null;
    }

    // Parse all currency values
    const sellingPrice = this.parseCurrencyValue(row["product sales"]);
    const sellingFees = this.parseCurrencyValue(row["selling fees"]);
    const fbaFees = this.parseCurrencyValue(row["fba fees"]);
    const otherFees = this.parseCurrencyValue(row["other transaction fees"]);
    const total = this.parseCurrencyValue(row["total"]);

    return {
      transactionId: row["order id"],
      platform: "amazon",
      orderDate: row["date/time"],
      sku: sku,
      quantity: Number(row["quantity"]) || 0,
      sellingPrice,
      description: row["description"] || "",
      type: type,
      marketplace: "Amazon",
      total,
      productSales: row["product sales"] || "0",
      sellingFees: Math.abs(sellingFees).toString(),
      fbaFees: Math.abs(fbaFees).toString(),
      otherTransactionFees: Math.abs(otherFees).toString(),
      other: row["other"] || "0",
      expenses: {
        shippingFee: 0,
        marketplaceFee: Math.abs(sellingFees),
        otherFees: Math.abs(fbaFees) + Math.abs(otherFees)
      },
      product: {
        name: row["description"] || "",
        sku: sku,
        description: row["description"] || "",
        platform: "amazon",
        metadata: {},
        visibility: "visible",
        sellingPrice: sellingPrice,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      hash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };
  }

  reponseAdapter(): Transaction[] {
    return this.transactions;
  }

  async process(): Promise<Transaction[]> {
    await this.parseCsvData();
    this.transformTransactions();
    return this.reponseAdapter();
  }
}
