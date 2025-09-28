import type { PDFDocument } from "pdf-lib";
// import { degrees } from "pdf-lib"; // Temporarily commented out for testing
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { BaseTransformer, ProductSummary, TextItem } from "./base.transformer";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
import { CategorySortConfig } from "../../../utils/pdfSorting";
import { BatchInfo } from "../../../types/transaction.type";
import {
  InventoryOrderProcessor,
  InventoryDeductionPreview,
} from "../../../services/inventoryOrderProcessor.service";
import { InventoryDeductionResult } from "../../../types/inventory";
import { BarcodeService } from "../../../services/barcode.service";
import { PDFBarcodeEmbedder } from "../../../utils/pdfBarcode";
import { BarcodeGenerationResult } from "../../../types/barcode";
import { format } from "date-fns";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class FlipkartPageTransformer extends BaseTransformer {
  protected declare pdfDoc: PDFDocument;
  protected declare outputPdf: PDFDocument;
  protected pdf!: pdfjsLib.PDFDocumentProxy;
  private barcodeService: BarcodeService;
  private generatedBarcodes: BarcodeGenerationResult[] = [];

  constructor(
    filePath: Uint8Array,
    products: Product[],
    categories: Category[],
    sortConfig?: CategorySortConfig,
    batchInfo?: BatchInfo
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(filePath, products, categories as any, sortConfig, batchInfo);
    this.barcodeService = new BarcodeService();
  }

  get barcodeResults(): BarcodeGenerationResult[] {
    return this.generatedBarcodes;
  }

  async initialize(): Promise<void> {
    const { PDFDocument } = await import("pdf-lib");
    this.pdfDoc = await PDFDocument.load(this.filePath);
    this.outputPdf = await PDFDocument.create();
    const loadingTask = pdfjsLib.getDocument({ data: this.filePath });
    this.pdf = await loadingTask.promise;
  }

  async transformPages(): Promise<PDFDocument> {
    await this.initialize();

    if (!this.pdfDoc || !this.outputPdf) {
      throw new Error("PDF document is not loaded. Call initialize() first.");
    }

    const pages = this.pdfDoc.getPages();
    const processedData: Array<{
      page: number;
      pageData: {
        width: number;
        height: number;
        lowerLeftX: number;
        lowerLeftY: number;
        upperRightX: number;
        upperRightY: number;
      };
      summary: ProductSummary;
    }> = [];

    // First pass: Process all pages and collect product data
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const mediabox = page.getMediaBox();
      const width = mediabox.width;
      const height = mediabox.height;

      const lowerLeftX = 180;
      const lowerLeftY = height / 2 + 38;
      const upperRightX = width;
      const upperRightY = height - 10;

      const currPage = await this.pdf.getPage(i + 1);
      const textContent = await currPage.getTextContent();
      const items = textContent.items as TextItem[];

      const sortedItems = this.sortTextItems(items);
      const lines = this.combineTextIntoLines(sortedItems);

      let j = 1;
      const currentSummary: ProductSummary = {
        name: "",
        quantity: "0",
        type: "flipkart",
        batchInfo: this.batchInfo,
      };

      if (lines.length > 0) {
        if (lines[1] && lines[1].toLowerCase().includes("od")) {
          currentSummary.orderId = lines[1].split(" ").at(0) || undefined;
        }
        const qtyLine = lines.find((line) =>
          line.toLowerCase().includes("total qty")
        );
        if (qtyLine) {
          const qty = qtyLine.split(" ");
          currentSummary.quantity = qty.at(2) || "0";
        }
      }

      for (let k = 0; k < lines.length; ) {
        if (lines[k].startsWith("SKU") && /^\d {3}/.test(lines[k + j])) {
          const line = lines[k + j];
          const [skuInfo, ...rest] = line.split("|");
          const qty = rest.join(" ").split(" ");

          const skuSplit = skuInfo.split(" ").filter((str) => !!str);

          const sku = skuSplit.length
            ? skuSplit[skuSplit.length - 1].trim()
            : "";

          const name = qty
            .filter((item) => !!item)
            .reduce((acc, curr) => acc.trim() + " " + curr.trim(), "");

          if (currentSummary.SKU !== sku && currentSummary.SKU) {
            currentSummary.name += " && " + name;
            currentSummary.SKU += " && " + sku;
          } else {
            currentSummary.name = name;
            currentSummary.SKU = sku;
          }

          j++;
        } else {
          k++;
        }
      }

      // Find product info for category
      const skuProduct = this.products.find(
        (p) => p.sku === currentSummary.SKU
      );
      const category = this.categories.find(
        (c) => c.id === skuProduct?.categoryId
      );

      // Store category information for sorting
      currentSummary.categoryId = skuProduct?.categoryId;
      currentSummary.category = category?.name;

      processedData.push({
        page: i,
        pageData: {
          width,
          height,
          lowerLeftX,
          lowerLeftY,
          upperRightX,
          upperRightY,
        },
        summary: { ...currentSummary }, // Copy to avoid reference issues
      });

      this.summaryText.push({ ...currentSummary });
    }

    // Apply category sorting if enabled (always enabled by default)
    if (this.sortConfig?.groupByCategory && processedData.length > 0) {
      // Sort the processed data based on categories
      processedData.sort((a, b) => {
        // Use the product categories for sorting
        const catA = this.categories.find(
          (cat) => cat.id === a.summary.categoryId
        );
        const catB = this.categories.find(
          (cat) => cat.id === b.summary.categoryId
        );

        // Prioritize items with categories
        if (a.summary.categoryId && !b.summary.categoryId) return -1;
        if (!a.summary.categoryId && b.summary.categoryId) return 1;

        // If both have categories, sort by category name
        if (catA && catB) {
          if (this.sortConfig?.sortCategoriesAlphabetically) {
            return catA.name.localeCompare(catB.name);
          }
          // Default sort by category id or other criteria
        }

        // If no category or same category, sort by SKU as fallback
        const skuA = a.summary.SKU || "";
        const skuB = b.summary.SKU || "";
        return skuA.localeCompare(skuB);
      });
    } else if (processedData.length > 0) {
      // If category grouping is disabled, sort by SKU as fallback
      processedData.sort((a, b) => {
        const skuA = a.summary.SKU || "";
        const skuB = b.summary.SKU || "";
        return skuA.localeCompare(skuB);
      });
    }

    // Generate barcodes for all processed items
    const dateString = format(new Date(), "yyyy-MM-dd");
    console.log(
      `Flipkart Transformer: Processing ${processedData.length} items for date ${dateString}`
    );

    const barcodeRequests = processedData.map((item, index) => ({
      dateDocId: dateString,
      orderIndex: index,
      metadata: {
        productName: item.summary.name,
        sku: item.summary.SKU,
        quantity: parseInt(item.summary.quantity, 10) || 1,
        platform: item.summary.type,
      },
      orderId: item.summary.orderId,
    }));

    console.log("Flipkart Transformer: Barcode requests:", barcodeRequests);

    // Batch generate all barcodes
    const generatedBarcodes = await this.barcodeService.batchGenerateBarcodes(
      barcodeRequests,
      { date: dateString }
    );

    console.log(
      `Flipkart Transformer: Generated ${generatedBarcodes.length} barcodes:`,
      generatedBarcodes.map((b) => b.barcodeId)
    );

    // Store barcodes for later access
    this.generatedBarcodes = generatedBarcodes;

    // Second pass: Apply the processed data to create pages in the desired order
    for (let i = 0; i < processedData.length; i++) {
      const item = processedData[i];
      const page = pages[item.page];
      const { width, lowerLeftX, lowerLeftY, upperRightX, upperRightY } =
        item.pageData;

      // Keep original page dimensions and crop box
      page.setWidth(width - 180);
      page.setHeight(upperRightY);
      page.setCropBox(lowerLeftX, lowerLeftY, upperRightX, upperRightY);

      const [copiedPage] = await this.outputPdf.copyPages(this.pdfDoc, [
        item.page,
      ]);
      this.outputPdf.addPage(copiedPage);

      const { rgb, StandardFonts } = await import("pdf-lib");
      const pageWidth = page.getWidth();
      const fontSize = 5;

      // Find product info for adding text
      const skuProduct = this.products.find((p) => p.sku === item.summary.SKU);
      const category = this.categories.find(
        (c) => c.id === skuProduct?.categoryId
      );

      let text = `${item.summary.quantity} X [${item.summary?.name}]`;
      if (category) {
        text = `${item.summary.quantity} X [${category.name}]`;
      }

      // Using standard Helvetica font which supports basic ASCII characters
      const font = await this.outputPdf.embedFont(StandardFonts.Helvetica);
      copiedPage.drawText(text, {
        y: copiedPage.getHeight() - 10,
        x: 180 + 10,
        size: fontSize,
        color: rgb(0, 0, 0),
        lineHeight: fontSize + 2,
        font,
        maxWidth: pageWidth - 180,
      });

      // Add barcode to the page if available
      const barcode = generatedBarcodes[i];
      console.log(
        `Flipkart Transformer: Processing page ${i + 1}, barcode available:`,
        !!barcode,
        barcode?.barcodeId
      );

      if (barcode) {
        try {
          // Position barcode vertically on the right side, centered in height, rotated 90 degrees
          const barcodeSize = 15; // Increased size for better visibility

          // Generate small barcode image
          const barcodeImageBytes = PDFBarcodeEmbedder.generateBarcodeImage(
            barcode.barcodeId,
            barcodeSize
          );

          const barcodeImage = await this.outputPdf.embedPng(barcodeImageBytes);
          // Position barcode in a highly visible area first (top-left corner for testing)
          const barcodeX = pageWidth - barcodeImage.width; // 10px from left edge of content area
          const barcodeY = copiedPage.getHeight() - barcodeSize; // Near the top of content area

          // Draw barcode on the copied page (testing without rotation first)
          copiedPage.drawImage(barcodeImage, {
            x: barcodeX,
            y: barcodeY,
            height: barcodeSize,
            opacity: 1.0,
          });

          console.log(
            `Successfully placed barcode ${barcode.barcodeId} at position (${barcodeX}, ${barcodeY})`
          );
        } catch (error) {
          console.error(
            `Failed to embed barcode ${barcode.barcodeId} on Flipkart page ${
              i + 1
            }:`,
            error
          );
        }
      }
    }

    return this.outputPdf;
  }

  /**
   * Process Flipkart PDF pages for inventory deduction with category-based quantities
   *
   * This method extracts order information from Flipkart PDF pages and performs
   * automatic inventory deductions based on category configuration through the
   * InventoryOrderProcessor. It leverages the existing PDF processing logic to
   * extract product data and applies category-based deduction rules.
   *
   * Process:
   * 1. Process PDF pages using existing transform logic
   * 2. Extract order items from product summaries
   * 3. Use InventoryOrderProcessor for category-based deduction calculation
   * 4. Apply automatic deductions based on category configuration
   * 5. Return enhanced results with inventory status and deduction details
   *
   * @returns Promise<{ orderItems: ProductSummary[], inventoryResult: InventoryDeductionResult }>
   *
   * Requirements Coverage:
   * - R2: Automatic Deduction - applies category-based deduction quantities
   * - R4: Order Processing Integration - integrates Flipkart PDF processing with inventory
   * - R6: Integration with Existing Architecture - leverages existing PDF processing
   */
  async processOrdersWithInventory(): Promise<{
    orderItems: ProductSummary[];
    inventoryResult: InventoryDeductionResult;
  }> {
    await this.initialize();

    if (!this.pdfDoc || !this.outputPdf) {
      throw new Error("PDF document is not loaded. Call initialize() first.");
    }

    const pdfPages = this.pdfDoc.getPages();
    const orderItems: ProductSummary[] = [];

    // Process all pages using existing Flipkart-specific logic
    for (let i = 0; i < pdfPages.length; i++) {
      const currPage = await this.pdf.getPage(i + 1);
      const textContent = await currPage.getTextContent();
      const items = textContent.items as TextItem[];

      const sortedItems = this.sortTextItems(items);
      const lines = this.combineTextIntoLines(sortedItems);

      let j = 1;
      const currentSummary: ProductSummary = {
        name: "",
        quantity: "0",
        type: "flipkart",
        batchInfo: this.batchInfo,
      };

      // Extract order ID (following existing logic)
      if (lines.length > 0) {
        if (lines[1] && lines[1].toLowerCase().includes("od")) {
          currentSummary.orderId = lines[1].split(" ").at(0) || undefined;
        }
        const qtyLine = lines.find((line) =>
          line.toLowerCase().includes("total qty")
        );
        if (qtyLine) {
          const qty = qtyLine.split(" ");
          currentSummary.quantity = qty.at(2) || "0";
        }
      }

      // Extract product information (following existing logic)
      for (let k = 0; k < lines.length; ) {
        if (lines[k].startsWith("SKU") && /^\d {3}/.test(lines[k + j])) {
          const line = lines[k + j];
          const [skuInfo, ...rest] = line.split("|");
          const qty = rest.join(" ").split(" ");

          const skuSplit = skuInfo.split(" ").filter((str) => !!str);

          const sku = skuSplit.length
            ? skuSplit[skuSplit.length - 1].trim()
            : "";

          const name = qty
            .filter((item) => !!item)
            .reduce((acc, curr) => acc.trim() + " " + curr.trim(), "");

          if (currentSummary.SKU !== sku && currentSummary.SKU) {
            currentSummary.name += " && " + name;
            currentSummary.SKU += " && " + sku;
          } else {
            currentSummary.name = name;
            currentSummary.SKU = sku;
          }

          j++;
        } else {
          k++;
        }
      }

      // Find product and category information for inventory mapping
      const skuProduct = this.products.find(
        (p) => p.sku === currentSummary.SKU
      );
      const category = this.categories.find(
        (c) => c.id === skuProduct?.categoryId
      );

      // Store enhanced product information
      currentSummary.categoryId = skuProduct?.categoryId;
      currentSummary.category = category?.name;
      currentSummary.product = skuProduct;

      // Only add items with valid SKU and quantity
      if (
        currentSummary.SKU &&
        currentSummary.quantity &&
        parseInt(currentSummary.quantity) > 0
      ) {
        orderItems.push({ ...currentSummary });
      }
    }

    // Use InventoryOrderProcessor for category-based automatic deduction
    const inventoryOrderProcessor = new InventoryOrderProcessor();

    // Create order reference from first order item or batch info
    const orderReference =
      orderItems.length > 0 ? orderItems[0].orderId : this.batchInfo?.batchId;

    // Process orders with automatic category-based deduction
    const result =
      await inventoryOrderProcessor.processOrderWithCategoryDeduction(
        orderItems,
        orderReference
      );

    return {
      orderItems: result.orderItems,
      inventoryResult: result.inventoryResult,
    };
  }

  /**
   * Preview inventory deductions for Flipkart PDF without actually performing them
   *
   * This method extracts order information from Flipkart PDF pages and calculates
   * what inventory deductions would occur based on category configuration, but
   * does not actually perform the deductions. Useful for validation and review.
   *
   * @returns Promise<InventoryDeductionPreview> Preview of deductions that would occur
   *
   * Requirements Coverage:
   * - R6: Management Tools - provides preview capabilities for validation
   */
  async previewInventoryDeductions(): Promise<InventoryDeductionPreview> {
    await this.initialize();

    if (!this.pdfDoc || !this.outputPdf) {
      throw new Error("PDF document is not loaded. Call initialize() first.");
    }

    const pdfPages = this.pdfDoc.getPages();
    const orderItems: ProductSummary[] = [];

    // Process all pages using existing Flipkart-specific logic
    for (let i = 0; i < pdfPages.length; i++) {
      const currPage = await this.pdf.getPage(i + 1);
      const textContent = await currPage.getTextContent();
      const items = textContent.items as TextItem[];

      const sortedItems = this.sortTextItems(items);
      const lines = this.combineTextIntoLines(sortedItems);

      let j = 1;
      const currentSummary: ProductSummary = {
        name: "",
        quantity: "0",
        type: "flipkart",
        batchInfo: this.batchInfo,
      };

      // Extract order ID (following existing logic)
      if (lines.length > 0) {
        if (lines[1] && lines[1].toLowerCase().includes("od")) {
          currentSummary.orderId = lines[1].split(" ").at(0) || undefined;
        }
        const qtyLine = lines.find((line) =>
          line.toLowerCase().includes("total qty")
        );
        if (qtyLine) {
          const qty = qtyLine.split(" ");
          currentSummary.quantity = qty.at(2) || "0";
        }
      }

      // Extract product information (following existing logic)
      for (let k = 0; k < lines.length; ) {
        if (lines[k].startsWith("SKU") && /^\d {3}/.test(lines[k + j])) {
          const line = lines[k + j];
          const [skuInfo, ...rest] = line.split("|");
          const qty = rest.join(" ").split(" ");

          const skuSplit = skuInfo.split(" ").filter((str) => !!str);

          const sku = skuSplit.length
            ? skuSplit[skuSplit.length - 1].trim()
            : "";

          const name = qty
            .filter((item) => !!item)
            .reduce((acc, curr) => acc.trim() + " " + curr.trim(), "");

          if (currentSummary.SKU !== sku && currentSummary.SKU) {
            currentSummary.name += " && " + name;
            currentSummary.SKU += " && " + sku;
          } else {
            currentSummary.name = name;
            currentSummary.SKU = sku;
          }

          j++;
        } else {
          k++;
        }
      }

      // Find product and category information for inventory mapping
      const skuProduct = this.products.find(
        (p) => p.sku === currentSummary.SKU
      );
      const category = this.categories.find(
        (c) => c.id === skuProduct?.categoryId
      );

      // Store enhanced product information
      currentSummary.categoryId = skuProduct?.categoryId;
      currentSummary.category = category?.name;
      currentSummary.product = skuProduct;

      // Only add items with valid SKU and quantity
      if (
        currentSummary.SKU &&
        currentSummary.quantity &&
        parseInt(currentSummary.quantity) > 0
      ) {
        orderItems.push({ ...currentSummary });
      }
    }

    // Use InventoryOrderProcessor to preview deductions
    const inventoryOrderProcessor = new InventoryOrderProcessor();
    return await inventoryOrderProcessor.previewCategoryDeductions(orderItems);
  }
}
