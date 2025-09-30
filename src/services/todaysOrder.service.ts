import { format } from "date-fns";
import { ProductSummary } from "../pages/home/services/base.transformer";
import { FirebaseService } from "./firebase.service";
import { Product, ProductService } from "./product.service";
import { Category, CategoryService } from "./category.service";
import { BarcodeService } from "./barcode.service";

export type ActiveOrder = ProductSummary;

export interface ActiveOrderSchema {
  id: string;
  orders: ActiveOrder[];
  date: string;
  batchId?: string; // Optional batch ID for grouping orders
}

export class TodaysOrder extends FirebaseService {
  private readonly COLLECTION_NAME = "active-orders";
  private productService: ProductService;
  private categoryService: CategoryService;
  private products: Product[] = [];
  private categories: Category[] = [];

  constructor() {
    super();
    this.productService = new ProductService();
    this.categoryService = new CategoryService();
  }

  /**
   * Remove undefined values from any object
   * @param obj Object to clean
   * @returns Clean object without undefined values
   */
  private removeUndefinedValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key as keyof T] = value as T[keyof T];
      }
    }
    return cleaned;
  }

  /**
   * Remove undefined keys from an order object
   * @param order The order object to clean
   * @returns Clean order object without undefined values
   */
  private removeUndefinedKeys(order: ActiveOrder): ActiveOrder {
    // Create a new object with all defined properties
    const cleanOrder: ActiveOrder = {
      name: order.name,
      quantity: order.quantity,
      type: order.type,
    };
    
    // Add optional properties only if they are defined
    if (order.SKU !== undefined) cleanOrder.SKU = order.SKU;
    if (order.orderId !== undefined) cleanOrder.orderId = order.orderId;
    if (order.batchInfo !== undefined) cleanOrder.batchInfo = order.batchInfo;
    if (order.createdAt !== undefined) cleanOrder.createdAt = order.createdAt;
    if (order.category !== undefined) cleanOrder.category = order.category;
    if (order.categoryId !== undefined) cleanOrder.categoryId = order.categoryId;
    
    // Add barcode completion fields
    if (order.isCompleted !== undefined) cleanOrder.isCompleted = order.isCompleted;
    if (order.completedAt !== undefined) cleanOrder.completedAt = order.completedAt;
    if (order.completedBy !== undefined) cleanOrder.completedBy = order.completedBy;
    
    // Never include the product property when saving to database to avoid circular references
    // The product property is populated during read operations in mapProductToOrder method
    
    return cleanOrder;
  }

  /**
   * Clean an array of orders by removing undefined keys
   * @param orders Array of orders to clean
   * @returns Array of clean orders
   */
  private cleanOrders(orders: ActiveOrder[]): ActiveOrder[] {
    return orders.map(order => this.removeUndefinedKeys(order));
  }

  async mapProductsToActiveOrder() {
    // Load both products and categories
    this.products = await this.productService.getProducts({});
    this.categories = await this.categoryService.getCategories();
  }

  private getCategoryName(categoryId?: string): string | undefined {
    if (!categoryId) return undefined;
    const category = this.categories.find((cat) => cat.id === categoryId);
    return category?.name;
  }

  private mapProductToOrder(order: ProductSummary): void {
    const product = this.products.find(
      (p) => p.sku === order.SKU && p.platform === order.type
    );
    if (product) {
      order.product = product;
      // Populate category name from product's categoryId
      order.category = this.getCategoryName(product.categoryId);
    }
  }

  /**
   * Sync completion status from barcode service for orders
   * @param orders Array of orders to sync completion status for
   * @param dateDocId The date document ID for barcode lookup
   */
  private async syncCompletionStatus(orders: ProductSummary[], dateDocId: string): Promise<void> {
    try {
      const barcodeService = new BarcodeService();
      
      // Get all barcodes for this date
      const barcodes = await barcodeService.getBarcodesForDate(dateDocId);
      
      // Create a map using multiple keys for more reliable matching
      // This avoids issues with array index mismatches due to sorting
      const completionMap = new Map<string, { isCompleted: boolean; completedAt?: string; completedBy?: string }>();
      
      barcodes.forEach(barcode => {
        const completionData = {
          isCompleted: barcode.isCompleted,
          completedAt: barcode.completedAt,
          completedBy: barcode.completedBy
        };
        
        // Create multiple keys for robust matching
        // Priority 1: Use orderId if available (most unique)
        if (barcode.orderId) {
          const orderIdKey = `orderId:${barcode.orderId}`;
          completionMap.set(orderIdKey, completionData);
        }
        
        // Priority 2: Use product name + SKU + quantity combination
        const productKey = `product:${barcode.metadata.productName}|${barcode.metadata.sku || ''}|${barcode.metadata.quantity}`;
        completionMap.set(productKey, completionData);
        
        // Priority 3: Fallback to just product name + SKU
        const basicKey = `basic:${barcode.metadata.productName}|${barcode.metadata.sku || ''}`;
        completionMap.set(basicKey, completionData);
      });
      
      // Apply completion status to orders using hierarchical key matching
      orders.forEach((order) => {
        let completionStatus = null;
        
        // Try matching with orderId first (most reliable)
        if (order.orderId) {
          const orderIdKey = `orderId:${order.orderId}`;
          completionStatus = completionMap.get(orderIdKey);
        }
        
        // Try matching with product details + quantity
        if (!completionStatus) {
          const productKey = `product:${order.name}|${order.SKU || ''}|${parseInt(order.quantity, 10) || 1}`;
          completionStatus = completionMap.get(productKey);
        }
        
        // Fallback to basic matching
        if (!completionStatus) {
          const basicKey = `basic:${order.name}|${order.SKU || ''}`;
          completionStatus = completionMap.get(basicKey);
        }
        
        if (completionStatus) {
          order.isCompleted = completionStatus.isCompleted;
          order.completedAt = completionStatus.completedAt;
          order.completedBy = completionStatus.completedBy;
        }
      });
      
    } catch (error) {
      // Silently continue if barcode sync fails
      console.warn(`Failed to sync completion status for date ${dateDocId}:`, error);
    }
  }

  async getTodaysOrders(): Promise<ActiveOrderSchema | undefined> {
    await this.mapProductsToActiveOrder();
    const activeOrder = await this.getDocument<ActiveOrderSchema>(
      this.COLLECTION_NAME,
      format(new Date(), "yyyy-MM-dd")
    );
    if (activeOrder) {
      activeOrder.orders.forEach((order) => {
        this.mapProductToOrder(order);
      });
      // Sync completion status from barcode service
      await this.syncCompletionStatus(activeOrder.orders, activeOrder.id);
    }

    return activeOrder;
  }

  /**
   * Get orders for a specific date
   * @param date Date string in yyyy-MM-dd format
   * @returns ActiveOrderSchema for the specified date or undefined if no orders exist
   */
  async getOrdersForDate(date: string): Promise<ActiveOrderSchema | undefined> {
    await this.mapProductsToActiveOrder();
    const activeOrder = await this.getDocument<ActiveOrderSchema>(
      this.COLLECTION_NAME,
      date
    );
    if (activeOrder) {
      activeOrder.orders.forEach((order) => {
        this.mapProductToOrder(order);
      });
      // Sync completion status from barcode service
      await this.syncCompletionStatus(activeOrder.orders, activeOrder.id);
    }

    return activeOrder;
  }

  async getLastThirtyDaysOrders(): Promise<ActiveOrderSchema[]> {
    await this.mapProductsToActiveOrder();
    const orders: ActiveOrderSchema[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "yyyy-MM-dd");

      try {
        const dayOrder = await this.getDocument<ActiveOrderSchema>(
          this.COLLECTION_NAME,
          dateStr
        );

        if (dayOrder) {
          dayOrder.orders.forEach((order) => {
            this.mapProductToOrder(order);
          });
          // Sync completion status from barcode service
          await this.syncCompletionStatus(dayOrder.orders, dayOrder.id);
          orders.push(dayOrder);
        } else {
          orders.push({
            id: dateStr,
            orders: [],
            date: dateStr,
          });
        }
      } catch {
        orders.push({
          id: dateStr,
          orders: [],
          date: dateStr,
        });
      }
    }

    return orders;
  }

  /**
   * Check if all products in the order can be processed
   * @param orders List of orders to check
   * @returns Boolean indicating if all products can be processed
   */
  async checkInventoryForOrders(orders: ActiveOrder[]): Promise<boolean> {
    for (const order of orders) {
      try {
        // Skip orders without a valid SKU
        if (!order.SKU) {
          // Order missing SKU, skipping check
          return true; // Allow order to proceed
        }

        // Inventory checking removed - proceeding with order
      } catch {
        // Error checking order, but don't block the order
        return true;
      }
    }
    return true;
  }


  async updateTodaysOrder(
    order: ActiveOrderSchema
  ): Promise<ActiveOrderSchema | undefined> {
    const existingOrder = await this.getTodaysOrders();

    // Process the order
    if (existingOrder) {
      const updateData = this.removeUndefinedValues({
        ...order,
        orders: [
          ...this.cleanOrders(existingOrder.orders),
          ...this.cleanOrders(order.orders),
        ],
      });
      
      await this.updateDocument<ActiveOrderSchema>(
        this.COLLECTION_NAME,
        existingOrder.id,
        updateData as ActiveOrderSchema
      );
    } else {
      const cleanOrderData = this.removeUndefinedValues({
        ...order,
        orders: this.cleanOrders(order.orders),
      });
      await this.batchOperation<ActiveOrderSchema>(
        [cleanOrderData as ActiveOrderSchema],
        this.COLLECTION_NAME,
        "create",
        (item) => item.id
      );
    }

    // Inventory management removed

    return await this.getTodaysOrders();
  }

  /**
   * Update orders for a specific date
   * @param order ActiveOrderSchema with order data
   * @param targetDate Date string in yyyy-MM-dd format
   * @returns ActiveOrderSchema for the specified date after update
   */
  async updateOrdersForDate(
    order: ActiveOrderSchema,
    targetDate: string
  ): Promise<ActiveOrderSchema | undefined> {
    const existingOrder = await this.getOrdersForDate(targetDate);

    // Process the order
    if (existingOrder) {
      const updateData = this.removeUndefinedValues({
        ...order,
        id: targetDate,
        date: targetDate,
        orders: [
          ...this.cleanOrders(existingOrder.orders),
          ...this.cleanOrders(order.orders).filter(
            (newOrder) =>
              !this.cleanOrders(existingOrder.orders).some(
                (existing) => existing.orderId === newOrder.orderId
              )
          ),
        ],
      });
      
      await this.updateDocument<ActiveOrderSchema>(
        this.COLLECTION_NAME,
        existingOrder.id,
        updateData as ActiveOrderSchema
      );
    } else {
      const cleanOrderData = this.removeUndefinedValues({
        ...order,
        id: targetDate,
        date: targetDate,
        orders: this.cleanOrders(order.orders),
      });
      await this.batchOperation<ActiveOrderSchema>(
        [cleanOrderData as ActiveOrderSchema],
        this.COLLECTION_NAME,
        "create",
        (item) => item.id
      );
    }

    // Inventory management removed

    return await this.getOrdersForDate(targetDate);
  }
}
