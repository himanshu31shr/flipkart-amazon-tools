import type { PDFDocument, PDFPage } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { BaseTransformer, ProductSummary, TextItem } from "./base.transformer";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
import {
  CategorySortConfig,
  sortProductsByCategory,
} from "../../../utils/pdfSorting";

export class AmazonPDFTransformer extends BaseTransformer {
  protected filePath: Uint8Array;
  protected declare pdfDoc: PDFDocument;
  protected declare outputPdf: PDFDocument;
  protected pdf!: pdfjsLib.PDFDocumentProxy;

  constructor(
    filePath: Uint8Array,
    products: Product[],
    categories: Category[],
    sortConfig?: CategorySortConfig
  ) {
    super(filePath, products, categories, sortConfig);
    this.filePath = filePath;
  }

  async initialize(): Promise<void> {
    const { PDFDocument } = await import("pdf-lib");
    this.pdfDoc = await PDFDocument.load(this.filePath);
    this.outputPdf = await PDFDocument.create();
    const loadingTask = pdfjsLib.getDocument({ data: this.filePath });
    this.pdf = await loadingTask.promise;
  }

  recurseQuantity(segments: string[], startIdx = -1): number {
    const defaultIndex = -1;
    for (let i = startIdx > -1 ? startIdx : 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.includes("₹")) {
        return this.recurseQuantity(segments, i + 1);
      } else if (startIdx > -1 && !segment.includes("₹")) {
        return i;
      }
    }
    return defaultIndex;
  }

  private extractProductInfo(lines: string[]): ProductSummary {
    const index = lines.findIndex((line) => line.startsWith("1 "));
    if (index === -1) {
      return {
        name: "",
        quantity: "",
        type: "amazon",
      };
    }

    const order = lines.find((line) => line.includes("Order Number"));
    let extractedOrderNumber = "";
    if (order) {
      const orderNumber = order.split(" ");

      const orderNumberPattern = /\b\d{3}-\d{7}-\d{7}\b/;
      for (const part of orderNumber) {
        const match = part.match(orderNumberPattern);
        if (match) {
          extractedOrderNumber = match[0];
          break;
        }
      }
    }

    const productDetails = lines.slice(index, index + 4).join(" ");
    // eslint-disable-next-line prefer-const
    let [name, ...info] = productDetails.split("|");
    if (name.indexOf("₹") !== -1) {
      name = name.substring(0, name.indexOf("₹") - 1);
    }

    let sku;
    if (
      /[A-Za-z0-9]{2}-[A-Za-z0-9]{4}-[A-Z|a-z|0-9]{4}/gi.test(productDetails)
    ) {
      const reg = new RegExp(
        /[A-Za-z0-9]{2}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}/,
        "ig"
      );
      sku = productDetails.match(reg)?.[0];
    }

    if (/SS[a-z0-9]{2}.*/gi.test(productDetails)) {
      const reg = new RegExp(/SS[a-zA-Z]{2,4}[0-9]{6,7}/, "ig");
      sku = productDetails.match(reg)?.[0];
    }

    let quantity = "1";

    if (info.length > 0) {
      const rest = info
        .join(" ")
        .split(" ")
        .filter((str) => !!str && /[()]/.test(str) === false);

      const idx = this.recurseQuantity(rest);
      if (idx > -1) {
        quantity = rest[idx] || "1";
      }
    }

    return {
      name: name.replace(/1 /, "").trim(),
      quantity,
      SKU: sku || "",
      type: "amazon",
      orderId: extractedOrderNumber || undefined,
    };
  }

  private async addFooterText(
    copiedPage: PDFPage,
    product: ProductSummary
  ): Promise<void> {
    const { rgb, StandardFonts } = await import("pdf-lib");
    const pageWidth = copiedPage.getWidth();
    const fontSize = 12;
    let text = `${product.quantity} X [${product?.name}]`;

    const skuProduct = this.products.find((p) => p.sku === product.SKU);

    const category = this.categories.find(
      (c) => c.id === skuProduct?.categoryId
    );

    // Store category information for sorting
    const productSummary: ProductSummary = {
      name: skuProduct?.name || product.name,
      quantity: product.quantity,
      type: "amazon",
      SKU: product.SKU,
      categoryId: skuProduct?.categoryId,
      category: category?.name,
    };

    if (category) {
      text = `${product.quantity} X [${
        category.name
      }] ${skuProduct?.name.substring(0, 80)}`;
    }

    this.summaryText.push(productSummary);

    // Using standard Helvetica font which supports basic ASCII characters
    const font = await this.outputPdf.embedFont(StandardFonts.Helvetica);
    copiedPage.drawText(text, {
      y: copiedPage.getHeight() - 20,
      x: 10,
      size: fontSize,
      color: rgb(0, 0, 0),
      lineHeight: fontSize + 2,
      font,
      maxWidth: pageWidth,
    });
  }

  async transform(): Promise<PDFDocument> {
    await this.initialize();
    const pages = this.pdfDoc.getPages();
    let j = 0;

    // Process all pages first to gather the complete product data
    const productsData: {
      page: number;
      product: ProductSummary;
      pageIndex: number;
    }[] = [];

    for (let i = 0; i < pages.length; i++) {
      if (i % 2 === 1) {
        const page = await this.pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items as TextItem[];

        const sortedItems = this.sortTextItems(items);
        const lines = this.combineTextIntoLines(sortedItems);
        const product = this.extractProductInfo(lines);

        // Store the product and associated page index for later processing
        productsData.push({
          page: i - 1, // The actual page we want to copy
          product,
          pageIndex: j,
        });

        j++;
      }
    }

    // Apply category sorting if enabled (always enabled by default)
    if (this.sortConfig?.groupByCategory) {
      // Extract products for sorting
      const productsForSorting = productsData.map((data) => {
        // Find the actual product from the products array
        const matchedProduct = this.products.find(
          (p) => p.sku === data.product.SKU
        );
        if (matchedProduct) {
          // Return the matched product with the correct type
          return matchedProduct;
        }
        // Create a minimal product object if no match found
        return {
          sku: data.product.SKU || "",
          name: data.product.name,
          description: "",
          platform: "amazon" as const,
          visibility: "visible" as const,
          sellingPrice: 0,
          customCostPrice: null,
          metadata: {},
          categoryId: data.product.categoryId,
        };
      });

      // Sort products by category
      const sortedProducts = sortProductsByCategory(
        productsForSorting,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.categories as any,
        this.sortConfig
      );

      // Reorder productsData based on the sorted products
      const sortedProductsData: typeof productsData = [];
      for (const sortedProduct of sortedProducts) {
        const originalProductData = productsData.find(
          (data) =>
            data.product.SKU === sortedProduct.sku &&
            data.product.name === sortedProduct.name
        );

        if (originalProductData) {
          sortedProductsData.push(originalProductData);
        }
      }

      // Use the sorted data for processing
      if (sortedProductsData.length === productsData.length) {
        productsData.length = 0; // Clear array
        productsData.push(...sortedProductsData);
      }
    } else {
      // If category grouping is disabled, sort by SKU as fallback
      productsData.sort((a, b) => {
        const skuA = a.product.SKU || "";
        const skuB = b.product.SKU || "";
        return skuA.localeCompare(skuB);
      });
    }

    // Now process the pages in the determined order
    for (const data of productsData) {
      const [copiedPage] = await this.outputPdf.copyPages(this.pdfDoc, [
        data.page,
      ]);
      await this.addFooterText(copiedPage, data.product);
      this.outputPdf.addPage(copiedPage);
    }

    return this.outputPdf;
  }
}
