import { TodaysOrder, ActiveOrderSchema } from "../../../services/todaysOrder.service";
import { AmazonPDFTransformer } from "./TrasformAmazonPages";
import { FlipkartPageTransformer } from "./TrasformFlipkartPages";
import { ProductSummary } from "./base.transformer";
import type { PDFDocument } from "pdf-lib";
import { format } from "date-fns";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
import { CategorySortConfig } from "../../../utils/pdfSorting";
import { batchService } from "../../../services/batch.service";
import { createBatchInfo } from "../../../utils/batchUtils";
import { getAuth } from "firebase/auth";
import { BatchInfo } from "../../../types/transaction.type";

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
    selectedDate,
    fileNames,
  }: {
    amzon: Uint8Array[];
    flp: Uint8Array[];
    sortConfig?: CategorySortConfig;
    selectedDate?: Date;
    fileNames?: string[];
  }): Promise<PDFDocument | undefined> {
    await this.initialize();

    if (!this.outpdf) {
      return;
    }

    // Use selectedDate if provided, otherwise use current date
    const targetDate = selectedDate || new Date();
    const dateString = format(targetDate, "yyyy-MM-dd");

    // Create batch if we have files (for any upload, including today's orders)
    let batchId: string | undefined;
    let batchInfo: BatchInfo | undefined = undefined;
    
    if (amzon.length > 0 || flp.length > 0) {
      // Pre-create batch based on file types
      const platforms: ("amazon" | "flipkart")[] = [];
      if (amzon.length > 0) platforms.push("amazon");
      if (flp.length > 0) platforms.push("flipkart");
      const platform: "amazon" | "flipkart" | "mixed" =
        platforms.length === 1 ? platforms[0] : "mixed";

      const fileName = this.generateBatchFileName(dateString, fileNames);
      batchInfo = this.createBatchInfoObject(fileName, platform, dateString, 0);
      batchId = await this.createBatchFromInfo(batchInfo);
    }

    // Process all Amazon files with batch info
    for (const amazonFile of amzon) {
      await this.processAmazonFile(amazonFile, sortConfig, batchInfo);
    }

    // Process all Flipkart files with batch info
    for (const flipkartFile of flp) {
      await this.processFlipkartFile(flipkartFile, sortConfig, batchInfo);
    }

    // Update batch order count if batch was created
    if (batchId && this.summaryText.length > 0) {
      await this.updateBatchOrderCount(batchId, this.summaryText.length);
    }

    const orderData: ActiveOrderSchema = {
      orders: this.summaryText,
      date: dateString,
      id: dateString,
    };

    // Only include batchId if it exists (avoid undefined fields in Firestore)
    if (batchId) {
      orderData.batchId = batchId;
    }

    // Use date-specific method if selectedDate is provided, otherwise use current method for backward compatibility
    if (selectedDate) {
      await new TodaysOrder().updateOrdersForDate(orderData, dateString);
    } else {
      await new TodaysOrder().updateTodaysOrder(orderData);
    }

    return this.outpdf;
  }

  private async processAmazonFile(
    amazonFile: Uint8Array,
    sortConfig?: CategorySortConfig,
    batchInfo?: BatchInfo
  ) {
    if (!amazonFile || !this.outpdf) {
      return;
    }
    
    const amz = new AmazonPDFTransformer(
      amazonFile,
      this.products,
      this.categories,
      sortConfig,
      batchInfo
    );
    const pages = await amz.transform();
    for (let i = 0; i < pages.getPageIndices().length; i++) {
      const [page] = await this.outpdf.copyPages(pages, [i]);
      this.outpdf.addPage(page);
    }
    this.summaryText.push(...amz.summary);
  }

  private async processFlipkartFile(
    flipkartFile: Uint8Array,
    sortConfig?: CategorySortConfig,
    batchInfo?: BatchInfo
  ) {
    if (!flipkartFile || !this.outpdf) {
      return;
    }
    const flipkartService = new FlipkartPageTransformer(
      flipkartFile,
      this.products,
      this.categories,
      sortConfig,
      batchInfo
    );
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

  /**
   * Create a BatchInfo object
   */
  private createBatchInfoObject(
    fileName: string,
    platform: "amazon" | "flipkart" | "mixed",
    selectedDate: string,
    orderCount: number
  ): BatchInfo | undefined {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.warn("User not authenticated, cannot create batch info");
        return undefined;
      }

      return createBatchInfo(
        fileName,
        undefined, // fileId will be set later if needed
        platform,
        currentUser.uid,
        selectedDate,
        orderCount,
        "PDF batch upload" // description
      );
    } catch (error) {
      console.error("Error creating batch info:", error);
      return undefined;
    }
  }

  /**
   * Remove undefined values from any object
   * @param obj Object to clean
   * @returns Clean object without undefined values
   */
  private removeUndefinedValues<T extends Record<string, unknown>>(
    obj: T
  ): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key as keyof T] = value as T[keyof T];
      }
    }
    return cleaned;
  }

  /**
   * Create a batch from BatchInfo object
   */
  private async createBatchFromInfo(
    batchInfo: BatchInfo | undefined
  ): Promise<string | undefined> {
    if (!batchInfo) return undefined;

    try {
      const result = await batchService.createBatch(batchInfo);

      if (result.success) {
        console.log("Batch created successfully:", result.batchId);
        return result.batchId;
      } else {
        console.error("Failed to create batch:", result.error);
        return undefined;
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      return undefined;
    }
  }

  /**
   * Update batch order count
   */
  private async updateBatchOrderCount(
    batchId: string,
    orderCount: number
  ): Promise<void> {
    try {
      const result = await batchService.updateBatchOrderCount(
        batchId,
        orderCount
      );

      if (result.success) {
        console.log(`Batch ${batchId} updated with ${orderCount} orders`);
      } else {
        console.error("Failed to update batch order count:", result.error);
      }
    } catch (error) {
      console.error("Error updating batch order count:", error);
    }
  }

  /**
   * Generate a filename for the batch
   */
  private generateBatchFileName(
    selectedDate: string,
    fileNames?: string[]
  ): string {
    if (fileNames && fileNames.length > 0) {
      return fileNames.join(", ");
    }

    // Generate default filename with timestamp
    const timestamp = Date.now();
    return `Batch_${selectedDate}_${timestamp}.pdf`;
  }
}
