import type { PDFDocument, PDFPage } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { Category } from "../../../services/category.service";
import { Product } from "../../../services/product.service";
import {
  CategorySortConfig
} from "../../../utils/pdfSorting";
import { BaseTransformer, ProductSummary, TextItem } from "./base.transformer";
import { BatchInfo } from "../../../types/transaction.type";
import { InventoryOrderProcessor, InventoryDeductionPreview } from "../../../services/inventoryOrderProcessor.service";
import { InventoryDeductionResult } from "../../../types/inventory";
import { BarcodeService } from "../../../services/barcode.service";
import { PDFBarcodeEmbedder } from "../../../utils/pdfBarcode";
import { BarcodeGenerationResult } from "../../../types/barcode";
import { format } from "date-fns";

export class AmazonPDFTransformer extends BaseTransformer {
  protected filePath: Uint8Array;
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
    super(filePath, products, categories, sortConfig, batchInfo);
    this.filePath = filePath;
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
        batchInfo: this.batchInfo,
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
      type: "amazon" as const,
      orderId: extractedOrderNumber || undefined,
      batchInfo: this.batchInfo,
    };
  }

  private async addFooterText(
    copiedPage: PDFPage,
    product: ProductSummary
  ): Promise<void> {
    const { rgb, StandardFonts } = await import("pdf-lib");
    const pageWidth = copiedPage.getWidth();
    const fontSize = 12;
    let text = `${product.quantity} X [${product?.name?.substring(0, 80)}]`;

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
      orderId: product.orderId,
      batchInfo: product.batchInfo  // 🔥 FIX: Include batchInfo in summary!
    };

    if (category) {
      text = `${product.quantity} X [${
        category.name
      }] ${skuProduct?.name?.substring(0, 80)}`;
    }

    this.summaryText.push(productSummary);

    // Using standard Helvetica font which supports basic ASCII characters
    const font = await this.outputPdf.embedFont(StandardFonts.Helvetica);
    copiedPage.drawText(text, {
      y: copiedPage.getHeight() - 20,
      x: 40,
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

    // Track processed pages to prevent duplication
    const processedPages = new Set<number>();
    const productsData: {
      page: number;
      product: ProductSummary;
      pageIndex: number;
      dataPageIndex: number; // Track which data page this came from
    }[] = [];


    for (let i = 0; i < pages.length; i++) {
      if (i % 2 === 1) { // Even pages (0-indexed) contain data for scraping
        const labelPageIndex = i - 1; // Odd pages contain labels for final PDF
        
        // Validate that we haven't processed this label page yet
        if (processedPages.has(labelPageIndex)) {
          continue;
        }

        // Validate that the label page exists
        if (labelPageIndex < 0 || labelPageIndex >= pages.length) {
          continue;
        }

        const page = await this.pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items as TextItem[];

        const sortedItems = this.sortTextItems(items);
        const lines = this.combineTextIntoLines(sortedItems);
        const product = this.extractProductInfo(lines);

        // Store the product and associated page index for later processing
        productsData.push({
          page: labelPageIndex, // The actual label page we want to copy
          product,
          pageIndex: j,
          dataPageIndex: i, // Track the data page for debugging
        });

        processedPages.add(labelPageIndex);
        j++;
      }
    }


    // Apply sorting with improved error handling and consistency
    try {
      if (this.sortConfig?.groupByCategory && productsData.length > 0) {
        
        // Enrich product data with category information for sorting
        const enrichedData = productsData.map((data, index) => {
          const matchedProduct = this.products.find(p => p.sku === data.product.SKU);
          const category = this.categories.find(c => c.id === matchedProduct?.categoryId);
          
          return {
            ...data,
            originalIndex: index, // Preserve original order for fallback
            categoryName: category?.name || 'Uncategorized',
            categoryId: matchedProduct?.categoryId || '',
            matchedProduct
          };
        });

        // Sort by category, then by SKU within category
        enrichedData.sort((a, b) => {
          // First sort by category
          if (a.categoryName !== b.categoryName) {
            // Put 'Uncategorized' last
            if (a.categoryName === 'Uncategorized') return 1;
            if (b.categoryName === 'Uncategorized') return -1;
            return a.categoryName.localeCompare(b.categoryName);
          }
          
          // Within same category, sort by SKU
          const skuA = a.product.SKU || '';
          const skuB = b.product.SKU || '';
          return skuA.localeCompare(skuB);
        });

        // Extract the sorted productsData, ensuring we maintain all original data
        const sortedProductsData = enrichedData.map(({ ...rest }) => {
           
          const { originalIndex, categoryName, categoryId, matchedProduct, ...cleanData } = rest;
          return cleanData;
        });
        
        // Validate that sorting didn't lose any data
        if (sortedProductsData.length === productsData.length) {
          // Replace original data with sorted data
          productsData.length = 0;
          productsData.push(...sortedProductsData);
        }
      } else {
        // Fallback: sort by SKU only
        productsData.sort((a, b) => {
          const skuA = a.product.SKU || "";
          const skuB = b.product.SKU || "";
          return skuA.localeCompare(skuB);
        });
      }
    } catch {
      // Continue with original order if sorting fails
    }

    // Validate that all pages exist before processing
    const totalPages = this.pdfDoc.getPageCount();
    const validProductsData = productsData.filter(data => data.page >= 0 && data.page < totalPages);
    
    // Final check for unique pages before processing
    const finalPageSet = new Set<number>();
    const duplicatePages: number[] = [];
    
    validProductsData.forEach(data => {
      if (finalPageSet.has(data.page)) {
        duplicatePages.push(data.page);
      } else {
        finalPageSet.add(data.page);
      }
    });
    
    // Remove duplicates if any found (should not happen with our new logic)
    const uniqueValidData = duplicatePages.length > 0 
      ? validProductsData.filter((data, index, array) => 
          array.findIndex(item => item.page === data.page) === index)
      : validProductsData;

    // Generate barcodes for all valid products
    const dateString = format(new Date(), "yyyy-MM-dd");
    console.log(`Amazon Transformer: Processing ${uniqueValidData.length} items for date ${dateString}`);
    
    const barcodeRequests = uniqueValidData.map((data, index) => ({
      dateDocId: dateString,
      orderIndex: index,
      metadata: {
        productName: data.product.name,
        sku: data.product.SKU,
        quantity: parseInt(data.product.quantity, 10) || 1,
        platform: data.product.type
      },
      orderId: data.product.orderId
    }));

    // Batch generate all barcodes
    const generatedBarcodes = await this.barcodeService.batchGenerateBarcodes(
      barcodeRequests,
      { date: dateString }
    );
    
    // Store barcodes for later access
    this.generatedBarcodes = generatedBarcodes;

    // Now process the pages in the determined order
    for (let i = 0; i < uniqueValidData.length; i++) {
      const data = uniqueValidData[i];
      try {
        const [copiedPage] = await this.outputPdf.copyPages(this.pdfDoc, [data.page]);
        
        // Increase page height to accommodate barcode
        // const currentSize = copiedPage.getSize();
        // const barcodeAreaHeight = 80;
        // const newHeight = currentSize.height + barcodeAreaHeight;
        // copiedPage.setSize(currentSize.width, newHeight);
        
        await this.addFooterText(copiedPage, data.product);
        
        // Add barcode to the page if available
        const barcode = generatedBarcodes[i];
        
        if (barcode) {
            // Generate barcode image
            const barcodeImageBytes = PDFBarcodeEmbedder.generateBarcodeImage(barcode.barcodeId, 64);
            const barcodeImage = await this.outputPdf.embedPng(barcodeImageBytes);
            
            // Position barcode at bottom-left of the page
            const barcodeSize = 15;
            const barcodeX = 40; // 10px from left edge of content area
            const barcodeY = copiedPage.getHeight() - 40; // Near the top of content area

            // Draw barcode on the copied page
            copiedPage.drawImage(barcodeImage, {
              x: barcodeX,
              y: barcodeY,
              height: barcodeSize,
              opacity: 1.0
            });
        }
        
        this.outputPdf.addPage(copiedPage);
      } catch {
        // Continue processing other pages even if one fails
      }
    }

    return this.outputPdf;
  }

  /**
   * Process Amazon PDF pages for inventory deduction with category-based quantities
   * 
   * This method extracts order information from Amazon PDF pages and performs
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
   * - R4: Order Processing Integration - integrates Amazon PDF processing with inventory
   * - R6: Integration with Existing Architecture - leverages existing PDF processing
   */
  async processOrdersWithInventory(): Promise<{
    orderItems: ProductSummary[];
    inventoryResult: InventoryDeductionResult;
  }> {
    await this.initialize();
    const pages = this.pdfDoc.getPages();
    
    // Track processed pages to prevent duplication
    const processedPages = new Set<number>();
    const orderItems: ProductSummary[] = [];

    // Process all even pages (0-indexed) that contain data for scraping
    for (let i = 0; i < pages.length; i++) {
      if (i % 2 === 1) { // Even pages (0-indexed) contain data for scraping
        const labelPageIndex = i - 1; // Odd pages contain labels
        
        // Validate that we haven't processed this label page yet
        if (processedPages.has(labelPageIndex)) {
          continue;
        }

        // Validate that the label page exists
        if (labelPageIndex < 0 || labelPageIndex >= pages.length) {
          continue;
        }

        const page = await this.pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items as TextItem[];

        const sortedItems = this.sortTextItems(items);
        const lines = this.combineTextIntoLines(sortedItems);
        const product = this.extractProductInfo(lines);

        // Only add items with valid SKU and quantity
        if (product.SKU && product.quantity && parseInt(product.quantity) > 0) {
          orderItems.push(product);
        }

        processedPages.add(labelPageIndex);
      }
    }

    // Use InventoryOrderProcessor for category-based automatic deduction
    const inventoryOrderProcessor = new InventoryOrderProcessor();
    
    // Create order reference from batch info if available
    const orderReference = this.batchInfo?.batchId;
    
    // Process orders with automatic category-based deduction
    const result = await inventoryOrderProcessor.processOrderWithCategoryDeduction(
      orderItems, 
      orderReference
    );

    return {
      orderItems: result.orderItems,
      inventoryResult: result.inventoryResult
    };
  }

  /**
   * Preview inventory deductions for Amazon PDF without actually performing them
   * 
   * This method extracts order information from Amazon PDF pages and calculates
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
    const pages = this.pdfDoc.getPages();
    
    // Track processed pages to prevent duplication
    const processedPages = new Set<number>();
    const orderItems: ProductSummary[] = [];

    // Process all even pages (0-indexed) that contain data for scraping
    for (let i = 0; i < pages.length; i++) {
      if (i % 2 === 1) { // Even pages (0-indexed) contain data for scraping
        const labelPageIndex = i - 1; // Odd pages contain labels
        
        // Validate that we haven't processed this label page yet
        if (processedPages.has(labelPageIndex)) {
          continue;
        }

        // Validate that the label page exists
        if (labelPageIndex < 0 || labelPageIndex >= pages.length) {
          continue;
        }

        const page = await this.pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items as TextItem[];

        const sortedItems = this.sortTextItems(items);
        const lines = this.combineTextIntoLines(sortedItems);
        const product = this.extractProductInfo(lines);

        // Only add items with valid SKU and quantity
        if (product.SKU && product.quantity && parseInt(product.quantity) > 0) {
          orderItems.push(product);
        }

        processedPages.add(labelPageIndex);
      }
    }

    // Use InventoryOrderProcessor to preview deductions
    const inventoryOrderProcessor = new InventoryOrderProcessor();
    return await inventoryOrderProcessor.previewCategoryDeductions(orderItems);
  }
}
