import { Timestamp, where } from "firebase/firestore";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FirebaseService } from "./firebase.service";
import { CategoryService } from "./category.service";

export interface Product {
  id?: string;
  sku: string;
  name: string;
  description: string;
  platform: "amazon" | "flipkart";
  visibility: "visible" | "hidden";
  sellingPrice: number;
  categoryId?: string; // Reference to category document ID
  categoryGroupId?: string; // Reference to category group document ID
  metadata: {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    lastImportedFrom?: string;
    listingStatus?: string;
    moq?: string;
    flipkartSerialNumber?: string;
    amazonSerialNumber?: string;
    existsOnSellerPage?: boolean;
  };
  competitionAnalysis?: {
    competitorName: string;
    competitorPrice: string;
    ourPrice: number;
    visibility: string;
    existsOnSellerPage: boolean;
    totalSellers: number;
  };
  existsOnSellerPage?: boolean;
}

export interface ProductWithCategoryGroup extends Product {
  category?: {
    id: string;
    name: string;
    categoryGroup?: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export interface ProductFilter {
  platform?: "amazon" | "flipkart";
  search?: string;
  visibility?: "visible" | "hidden";
  categoryId?: string;
  groupId?: string;
  groupFilter?: 'all' | 'assigned' | 'unassigned' | string;
}

interface RawFlipkartData {
  "Seller SKU Id": string;
  "Product Title": string;
  "Listing Status": string;
  "Your Selling Price": string;
  "Minimum Order Quantity": string;
  "Flipkart Serial Number": string;
}

interface RawAmazonData {
  "item-name": string;
  "item-description": string;
  "listing-id": string;
  "seller-sku": string;
  price: string;
  quantity: string;
  "open-date": string;
  "image-url": string;
  "item-is-marketplace": string;
  "product-id-type": string;
  "zshop-shipping-fee": string;
  "item-note": string;
  "item-condition": string;
  "zshop-category1": string;
  "zshop-browse-path": string;
  "zshop-storefront-feature": string;
  asin1: string;
  asin2: string;
  asin3: string;
  "will-ship-internationally": string;
  "expedited-shipping": string;
  "zshop-boldface": string;
  "product-id": string;
  "bid-for-featured-placement": string;
  "add-delete": string;
  "pending-quantity": string;
  "fulfillment-channel": string;
  "Business Price": string;
  "Quantity Price Type": string;
  "maximum-retail-price": string;
}

export class ProductService extends FirebaseService {
  private readonly COLLECTION_NAME = "products";
  private categoryService: CategoryService;

  constructor() {
    super();
    this.categoryService = new CategoryService();
  }

  async parseProducts(file: File): Promise<Product[]> {
    if (this.isAmazonFormat(file)) {
      return this.parseAmazonProducts(file);
    }

    if (this.isFlipkartFormat(file)) {
      return this.processFlipkartProducts(file);
    }

    throw new Error("Unsupported file format");
  }

  private async parseAmazonProducts(file: File): Promise<Product[]> {
    const amazonProducts = await new Promise<RawAmazonData[]>(
      (resolve, reject) => {
        if (!file) {
          reject(new Error("File is not set"));
        }

        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            const data = results.data as RawAmazonData[];
            if (!Array.isArray(data) || data.length === 0) {
              throw new Error("File is empty");
            }
            return resolve(data.filter((row) => row["seller-sku"]));
          },
          error: (error) => {
            reject(error);
          },
        });
      }
    );

    return this.amazonAdapter(amazonProducts);
  }

  private async processFlipkartProducts(file: File): Promise<Product[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("File is empty");
    }

    // Skip the first row if it contains field descriptions (not actual data)
    // Check if first row contains description-like text
    const firstRow = rawData[0] as Record<string, unknown>;
    const skipFirstRow = firstRow && 
      (firstRow["Seller SKU Id"] === "Your Identifier for a product" ||
       String(firstRow["Product Title"]).includes("Title of your product"));

    const dataRows = skipFirstRow ? rawData.slice(1) : rawData;

    if (dataRows.length === 0) {
      throw new Error("File contains no product data");
    }

    return this.flipkartAdapter(dataRows as unknown as RawFlipkartData[]);
  }

  private isAmazonFormat(file: File): boolean {
    return file.type === "text/plain";
  }

  private isFlipkartFormat(file: File): boolean {
    return (
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel"
    );
  }

  private amazonAdapter(data: RawAmazonData[]): Product[] {
    return data.map((row) => ({
      sku: row["seller-sku"],
      name: row["item-name"],
      description: row["item-description"],
      platform: "amazon" as const,
      sellingPrice: Number(row["price"]) || 0,
      metadata: {
        listingStatus: "active",
        moq: "1",
        amazonSerialNumber: row["asin1"],
      },
      visibility: "visible",
    }));
  }

  private flipkartAdapter(data: Array<RawFlipkartData>): Product[] {
    return data.map((row) => ({
      sku: row["Seller SKU Id"],
      name: row["Product Title"],
      description: row["Product Title"] || "", // Use Product Title for both name and description
      sellingPrice: Number(row["Your Selling Price"]) || 0,
      platform: "flipkart" as const,
      metadata: {
        listingStatus: row["Listing Status"],
        moq: row["Minimum Order Quantity"] || "1",
        flipkartSerialNumber: row["Flipkart Serial Number"],
      },
      visibility: "visible",
    }));
  }

  async saveProducts(products: Product[]): Promise<void> {
    const allSkus = await this.getDocuments<Product>(this.COLLECTION_NAME);
    const newProducts = products.filter(
      (product) =>
        allSkus.filter(
          (sku) => sku.sku === product.sku && sku.platform === product.platform
        ).length === 0
    );

    return this.batchOperation(
      newProducts,
      this.COLLECTION_NAME,
      "create",
      (product) => product.sku
    );
  }

  /**
   * Save products with option to update existing ones
   * @param products Array of products to save
   * @param updateExisting Whether to update existing products (default: false)
   * @returns Object with counts of created and updated products
   */
  async saveOrUpdateProducts(
    products: Product[], 
    updateExisting: boolean = false
  ): Promise<{ created: number; updated: number }> {
    const allExistingProducts = await this.getDocuments<Product>(this.COLLECTION_NAME);
    
    // Create a map for faster lookup of existing products
    const existingProductsMap = new Map<string, Product>();
    allExistingProducts.forEach(product => {
      const key = `${product.sku}-${product.platform}`;
      existingProductsMap.set(key, product);
    });

    const newProducts: Product[] = [];
    const productsToUpdate: Array<{ sku: string; updateData: Partial<Product> }> = [];

    products.forEach(product => {
      const key = `${product.sku}-${product.platform}`;
      const existingProduct = existingProductsMap.get(key);

      if (existingProduct) {
        if (updateExisting) {
          // Create selective update data - only update import-relevant fields
          const updateData: Partial<Product> = {
            // Update fields that typically come from import files
            sellingPrice: product.sellingPrice,
            metadata: {
              ...existingProduct.metadata,
              listingStatus: product.metadata.listingStatus,
              moq: product.metadata.moq,
              updatedAt: Timestamp.now(),
              lastImportedFrom: product.platform === 'amazon' ? 'Amazon Import' : 'Flipkart Import',
            }
          };

          // Update platform-specific serial numbers
          if (product.platform === 'amazon' && product.metadata.amazonSerialNumber) {
            updateData.metadata!.amazonSerialNumber = product.metadata.amazonSerialNumber;
          } else if (product.platform === 'flipkart' && product.metadata.flipkartSerialNumber) {
            updateData.metadata!.flipkartSerialNumber = product.metadata.flipkartSerialNumber;
          }

          // Only update name if the existing product doesn't have a custom description
          // (indicating it might still be using the default from import)
          if (!existingProduct.description || existingProduct.description === existingProduct.name) {
            updateData.name = product.name;
          }

          productsToUpdate.push({
            sku: product.sku,
            updateData
          });
        }
        // If updateExisting is false, skip existing products (current behavior)
      } else {
        // Add new products with timestamps
        newProducts.push({
          ...product,
          metadata: {
            ...product.metadata,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            lastImportedFrom: product.platform === 'amazon' ? 'Amazon Import' : 'Flipkart Import',
          }
        });
      }
    });

    // Perform batch operations
    const operations: Promise<void>[] = [];

    // Create new products
    if (newProducts.length > 0) {
      operations.push(
        this.batchOperation(
          newProducts,
          this.COLLECTION_NAME,
          "create",
          (product) => product.sku
        )
      );
    }

    // Update existing products
    if (productsToUpdate.length > 0) {
      const updatePromises = productsToUpdate.map(({ sku, updateData }) =>
        this.updateDocument(this.COLLECTION_NAME, sku, updateData)
      );
      operations.push(...updatePromises);
    }

    await Promise.all(operations);

    return {
      created: newProducts.length,
      updated: productsToUpdate.length
    };
  }

  async updateProduct(sku: string, data: Partial<Product>): Promise<void> {
    return this.updateDocument(this.COLLECTION_NAME, sku, data);
  }

  async getProducts(filters?: ProductFilter): Promise<Product[]> {
    const constraints = [];

    if (filters?.platform) {
      constraints.push(where("platform", "==", filters.platform));
    }

    if (filters?.search) {
      constraints.push(where("name", ">=", filters.search));
      constraints.push(where("name", "<=", filters.search + "\uf8ff"));
    }

    if (filters?.visibility) {
      constraints.push(where("visibility", "==", filters.visibility));
    }

    if (filters?.categoryId) {
      constraints.push(where("categoryId", "==", filters.categoryId));
    }

    // Get all products and merge the document ID as SKU
    const products = await this.getDocuments<Product>(
      this.COLLECTION_NAME,
      constraints
    );
    
    // Handle case where getDocuments returns undefined (e.g., in tests or emulator issues)
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    return products.map((product) => ({
      ...product,
      sku: product.id ?? product.sku,
    }));
  }

  async mapTransactionToProduct(sku: string): Promise<Product | null> {
    const products = await this.getDocuments<Product>(this.COLLECTION_NAME, [
      where("sku", "==", sku),
    ]);
    return products[0] || null;
  }

  async deleteProduct(sku: string): Promise<void> {
    return this.deleteDocument(this.COLLECTION_NAME, sku);
  }

  async getProductDetails(sku: string): Promise<Product> {
    const product = await this.getDocument<Product>(this.COLLECTION_NAME, sku);

    if (!product) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    return product as Product;
  }

  /**
   * Get products with category and group information populated
   */
  async getProductsWithCategoryGroups(filters?: ProductFilter): Promise<ProductWithCategoryGroup[]> {
    // First get all products with base filters (excluding group filters)
    const baseFilters: ProductFilter = { ...filters };
    delete baseFilters.groupId;
    delete baseFilters.groupFilter;
    
    const products = await this.getProducts(baseFilters);
    
    // Get all categories with group information
    const categoriesWithGroups = await this.categoryService.getCategoriesWithGroups();
    
    // Create a map for faster lookup
    const categoryMap = new Map();
    categoriesWithGroups.forEach(category => {
      if (category.id) {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          categoryGroup: category.categoryGroup
        });
      }
    });

    // Enrich products with category and group information
    const enrichedProducts: ProductWithCategoryGroup[] = products.map(product => ({
      ...product,
      category: product.categoryId ? categoryMap.get(product.categoryId) : undefined
    }));

    // Apply group-based filtering
    if (filters?.groupFilter && filters.groupFilter !== 'all') {
      return enrichedProducts.filter(product => {
        if (filters.groupFilter === 'assigned') {
          return product.category?.categoryGroup;
        } else if (filters.groupFilter === 'unassigned') {
          return !product.category?.categoryGroup;
        } else if (filters.groupId) {
          return product.category?.categoryGroup?.id === filters.groupId;
        } else {
          // Specific group ID passed as groupFilter
          return product.category?.categoryGroup?.id === filters.groupFilter;
        }
      });
    }

    return enrichedProducts;
  }

  /**
   * Get products by category group
   */
  async getProductsByGroup(groupId: string): Promise<ProductWithCategoryGroup[]> {
    return this.getProductsWithCategoryGroups({ groupFilter: groupId });
  }

  /**
   * Get products without any group assignment
   */
  async getUnassignedProducts(): Promise<ProductWithCategoryGroup[]> {
    return this.getProductsWithCategoryGroups({ groupFilter: 'unassigned' });
  }
}
