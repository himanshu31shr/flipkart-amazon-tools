import type { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { BaseTransformer, ProductSummary, TextItem } from "./base.transformer";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
import { CategorySortConfig } from "../../../utils/pdfSorting";
import { BatchInfo } from "../../../types/transaction.type";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class FlipkartPageTransformer extends BaseTransformer {
  protected declare pdfDoc: PDFDocument;
  protected declare outputPdf: PDFDocument;
  protected pdf!: pdfjsLib.PDFDocumentProxy;

  constructor(
    filePath: Uint8Array,
    products: Product[],
    categories: Category[],
    sortConfig?: CategorySortConfig,
    batchInfo?: BatchInfo
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(filePath, products, categories as any, sortConfig, batchInfo);
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

    // Second pass: Apply the processed data to create pages in the desired order
    for (const item of processedData) {
      const page = pages[item.page];
      const { width, lowerLeftX, lowerLeftY, upperRightX, upperRightY } =
        item.pageData;

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
        text = `${item.summary.quantity} X [${
          category.name
        }] ${skuProduct?.name.substring(0, 80)}`;
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
    }

    return this.outputPdf;
  }
}
