import { TodaysOrder } from "../../../services/todaysOrder.service";
import { AmazonPDFTransformer } from "./TrasformAmazonPages";
import { FlipkartPageTransformer } from "./TrasformFlipkartPages";
import { ProductSummary } from "./base.transformer";
import type { PDFDocument } from "pdf-lib";
import { format } from "date-fns";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
import { CategorySortConfig } from "../../../utils/pdfSorting";

export class PDFMergerService {
  private outpdf: PDFDocument | undefined;
  private summaryText: ProductSummary[] = [];

  constructor(private products: Product[], private categories: Category[]) {
    this.products = products;
    this.categories = categories;
  }

  async initialize(): Promise<PDFDocument> {
    const { PDFDocument } = await import("pdf-lib");
    return (this.outpdf = await PDFDocument.create());
  }

  public async mergePdfs({
    amzon,
    flp,
    sortConfig,
    selectedDate
  }: {
    amzon: Uint8Array[];
    flp: Uint8Array[];
    sortConfig?: CategorySortConfig;
    selectedDate?: Date;
  }): Promise<PDFDocument | undefined> {
    await this.initialize();

    if (!this.outpdf) {
      return;
    }

    // Process all Amazon files
    for (const amazonFile of amzon) {
      await this.processAmazonFile(amazonFile, sortConfig);
    }

    // Process all Flipkart files
    for (const flipkartFile of flp) {
      await this.processFlipkartFile(flipkartFile, sortConfig);
    }

    // Use selectedDate if provided, otherwise use current date
    const targetDate = selectedDate || new Date();
    const dateString = format(targetDate, "yyyy-MM-dd");
    
    const orderData = {
      orders: this.summaryText,
      date: dateString,
      id: dateString,
    };

    // Use date-specific method if selectedDate is provided, otherwise use current method for backward compatibility
    if (selectedDate) {
      await new TodaysOrder().updateOrdersForDate(orderData, dateString);
    } else {
      await new TodaysOrder().updateTodaysOrder(orderData);
    }

    return this.outpdf;
  }

  private async processAmazonFile(amazonFile: Uint8Array, sortConfig?: CategorySortConfig) {
    if (!amazonFile || !this.outpdf) {
      return;
    }
    const amz = new AmazonPDFTransformer(amazonFile, this.products, this.categories, sortConfig);
    const pages = await amz.transform();
    for (let i = 0; i < pages.getPageIndices().length; i++) {
      const [page] = await this.outpdf.copyPages(pages, [i]);
      this.outpdf.addPage(page);
    }
    this.summaryText.push(...amz.summary);
  }

  private async processFlipkartFile(flipkartFile: Uint8Array, sortConfig?: CategorySortConfig) {
    if (!flipkartFile || !this.outpdf) {
      return;
    }
    const flipkartService = new FlipkartPageTransformer(flipkartFile, this.products, this.categories, sortConfig);
    const pages = await flipkartService.transformPages();
    for (let i = 0; i < pages.getPageIndices().length; i++) {
      const [page] = await this.outpdf.copyPages(pages, [i]);
      this.outpdf.addPage(page);
    }
    this.summaryText.push(...flipkartService.summary);
  }

  get summary(): ProductSummary[] {
    return this.summaryText;
  }
}
