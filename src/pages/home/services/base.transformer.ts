import { PDFDocument } from "pdf-lib";
import { Product } from "../../../types/product";
import { Category } from "../../../types/category";
import { CategorySortConfig, defaultSortConfig } from "../../../utils/pdfSorting";
import { BatchInfo } from "../../../types/transaction.type";

export interface TextItem {
  str: string;
  transform: number[];
}

export interface ProductSummary {
  name: string;
  quantity: string;
  SKU?: string;
  orderId?: string;
  type: 'amazon' | 'flipkart';
  product?: Product;
  createdAt?: string;
  category?: string;
  categoryId?: string;
  batchInfo?: BatchInfo;
  // Barcode completion status
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string;
}

export class BaseTransformer {
  protected filePath: Uint8Array;
  protected pdfDoc!: PDFDocument;
  protected outputPdf!: PDFDocument;
  protected summaryText: ProductSummary[] = [];
  protected sortConfig?: CategorySortConfig;
  protected batchInfo?: BatchInfo;
  protected enableBarcodes: boolean;

  constructor(
    filePath: Uint8Array, 
    protected products: Product[], 
    protected categories: Category[],
    sortConfig?: CategorySortConfig,
    batchInfo?: BatchInfo,
    enableBarcodes: boolean = true
  ) {
    this.filePath = filePath;
    this.products = products;
    this.categories = categories;
    this.batchInfo = batchInfo;
    this.enableBarcodes = enableBarcodes;
    
    // Always use category sorting with SKU as secondary sort
    this.sortConfig = {
      ...defaultSortConfig,
      primarySort: 'category',
      secondarySort: 'sku',
      groupByCategory: true,
      ...sortConfig
    };
  }

  async initialize(): Promise<void> {}

  async transform(): Promise<PDFDocument> {
    await this.initialize();
    return this.outputPdf;
  }

  get summary(): ProductSummary[] {
    return this.summaryText;
  }

  protected sortTextItems(items: TextItem[]): TextItem[] {
    return items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) < 5) {
        return a.transform[4] - b.transform[4];
      }
      return yDiff;
    });
  }

  protected combineTextIntoLines(sortedItems: TextItem[]): string[] {
    let currentY = sortedItems[0]?.transform[5];
    let currentLine = "";
    const lines: string[] = [];

    sortedItems.forEach((item) => {
      if (Math.abs(item.transform[5] - currentY) > 5) {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = item.str;
        currentY = item.transform[5];
      } else {
        currentLine += " " + item.str;
      }
    });

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines;
  }
  
  /**
   * Sort products based on the provided sort configuration
   * @param products Products to sort
   * @returns Sorted products array
   */
  protected sortProducts(products: ProductSummary[]): ProductSummary[] {
    if (products.length <= 1) {
      return products;
    }

    // Map product summaries to enrich with category information
    const enrichedProducts = products.map(summary => {
      // Try to find product by SKU
      const matchedProduct = this.products.find(p => p.sku === summary.SKU);
      const categoryId = matchedProduct?.categoryId || '';
      const category = this.categories.find(c => c.id === categoryId);
      
      return {
        ...summary,
        categoryId,
        category: category?.name || 'Uncategorized'
      };
    });
    
    // Group products by category
    const categoryGroups: Record<string, ProductSummary[]> = {};
    
    enrichedProducts.forEach(product => {
      const categoryKey = product.category || 'Uncategorized';
      if (!categoryGroups[categoryKey]) {
        categoryGroups[categoryKey] = [];
      }
      categoryGroups[categoryKey].push(product);
    });
    
    // Determine category order
    const categoryKeys = Object.keys(categoryGroups);
    
    // Sort categories alphabetically but put Uncategorized last
    categoryKeys.sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
    
    // Combine sorted products
    const sortedProducts: ProductSummary[] = [];
    categoryKeys.forEach(categoryKey => {
      const productsInCategory = categoryGroups[categoryKey];
      // Sort by SKU within each category
      this.sortByField(productsInCategory, 'sku');
      sortedProducts.push(...productsInCategory);
    });
    
    return sortedProducts;
  }
  
  /**
   * Helper method to sort products by a specific field
   * @param products Products to sort
   * @param field Field to sort by
   * @param order Sort order (asc/desc)
   */
  protected sortByField(
    products: ProductSummary[], 
    field: 'name' | 'price' | 'sku',
    order: 'asc' | 'desc' = 'asc'
  ): void {
    products.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;
      
      switch (field) {
        case 'name':
          valueA = a.name || '';
          valueB = b.name || '';
          break;
        case 'sku':
          valueA = a.SKU || '';
          valueB = b.SKU || '';
          break;
        default:
          valueA = '';
          valueB = '';
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return order === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      return 0;
    });
  }
}
