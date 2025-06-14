import type { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { BaseTransformer, ProductSummary, TextItem } from "./base.transformer";
import { Product } from "../../../services/product.service";
import { Category } from "../../../services/category.service";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class FlipkartPageTransformer extends BaseTransformer {
  protected declare pdfDoc: PDFDocument;
  protected declare outputPdf: PDFDocument;
  protected pdf!: pdfjsLib.PDFDocumentProxy;

  constructor(
    filePath: Uint8Array,
    products: Product[],
    categories: Category[]
  ) {
    super(filePath, products, categories);
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

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const mediabox = page.getMediaBox();
      const width = mediabox.width;
      const height = mediabox.height;

      const lowerLeftX = 180;
      const lowerLeftY = height / 2 + 38;
      const upperRightX = width;
      const upperRightY = height - 10;

      page.setWidth(width - 180);
      page.setHeight(upperRightY);

      page.setCropBox(lowerLeftX, lowerLeftY, upperRightX, upperRightY);
      const [copiedPage] = await this.outputPdf.copyPages(this.pdfDoc, [i]);
      this.outputPdf.addPage(copiedPage);

      const currPage = await this.pdf.getPage(i + 1);
      const textContent = await currPage.getTextContent();
      const items = textContent.items as TextItem[];

      const sortedItems = this.sortTextItems(items);
      const lines = this.combineTextIntoLines(sortedItems);

      let j = 1;
      const currentSUmmary: ProductSummary = {
        name: "",
        quantity: "0",
        type: "flipkart",
      };

      for (let k = 0; k < lines.length; ) {
        if (lines[k].startsWith("SKU") && /^\d {3}/.test(lines[k + j])) {
          const line = lines[k + j];
          const [skuInfo, ...rest] = line.split("|");
          const qty = rest.join(" ").split(" ");
          const lastInt = qty.at(qty.length - 1) || "";

          const skuSplit = skuInfo.split(" ").filter((str) => !!str);

          const sku = skuSplit.length
            ? skuSplit[skuSplit.length - 1].trim()
            : "";

          if (/^\d/.test(lastInt)) {
            currentSUmmary.quantity = (
              parseInt(qty.at(qty.length - 1) || "0", 10) +
              parseInt(currentSUmmary.quantity, 10)
            ).toString();
          }

          const name = qty
            .filter((item) => !!item)
            .reduce((acc, curr) => acc.trim() + " " + curr.trim(), "");

          if (currentSUmmary.SKU !== sku && currentSUmmary.SKU) {
            currentSUmmary.name += " && " + name;
            currentSUmmary.SKU += " && " + sku;
          } else {
            currentSUmmary.name = name;
            currentSUmmary.SKU = sku;
          }

          j++;
        } else {
          k++;
        }
      }

      const { rgb, StandardFonts } = await import("pdf-lib");
      const pageWidth = page.getWidth();
      const fontSize = 5;
      let text = `${currentSUmmary.quantity} X [${currentSUmmary?.name}]`;

      const skuProduct = this.products.find(
        (p) => p.sku === currentSUmmary.SKU
      );

      const category = this.categories.find(
        (c) => c.id === skuProduct?.categoryId
      );
      if (category) {
        text = `${currentSUmmary.quantity} X [${
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

      this.summaryText.push(currentSUmmary);
    }

    return this.outputPdf;
  }
}
