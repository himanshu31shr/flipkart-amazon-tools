import { TodaysOrder } from "../../../services/todaysOrder.service";
import { AmazonPDFTransformer } from "./TrasformAmazonPages";
import { FlipkartPageTransformer } from "./TrasformFlipkartPages";
import { ProductSummary } from "./base.transformer";
import type { PDFDocument } from "pdf-lib";
import { format } from "date-fns";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";

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
  }: {
    amzon: Uint8Array | null;
    flp: Uint8Array | null;
  }): Promise<PDFDocument | undefined> {
    await this.initialize();

    if (!this.outpdf) {
      return;
    }

    await this.amazon(amzon);
    await this.flipkart(flp);

    await new TodaysOrder().updateTodaysOrder({
      orders: this.summaryText,
      date: format(new Date(), "yyyy-MM-dd"),
      id: format(new Date(), "yyyy-MM-dd"),
    });

    return this.outpdf;
  }

  private async amazon(amzon: Uint8Array | null) {
    if (!amzon || !this.outpdf) {
      return;
    }
    const amz = new AmazonPDFTransformer(amzon, this.products, this.categories);
    const pages = await amz.transform();
    for (let i = 0; i < pages.getPageIndices().length; i++) {
      const [page] = await this.outpdf.copyPages(pages, [i]);
      this.outpdf.addPage(page);
    }
    this.summaryText.push(...amz.summary);
  }

  private async flipkart(flp: Uint8Array | null) {
    if (!flp || !this.outpdf) {
      return;
    }
    const flipkartService = new FlipkartPageTransformer(flp, this.products, this.categories);
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
