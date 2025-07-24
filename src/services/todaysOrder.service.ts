import { format } from "date-fns";
import { ProductSummary } from "../pages/home/services/base.transformer";
import { FirebaseService } from "./firebase.service";
import { Product, ProductService } from "./product.service";
import { CategoryInventoryService } from "./categoryInventory.service";
import { Category, CategoryService } from "./category.service";

export type ActiveOrder = ProductSummary;

export interface ActiveOrderSchema {
  id: string;
  orders: ActiveOrder[];
  date: string;
}

export class TodaysOrder extends FirebaseService {
  private readonly COLLECTION_NAME = "active-orders";
  private productService: ProductService;
  private categoryInventoryService: CategoryInventoryService;
  private categoryService: CategoryService;
  private products: Product[] = [];
  private categories: Category[] = [];

  constructor() {
    super();
    this.productService = new ProductService();
    this.categoryInventoryService = new CategoryInventoryService();
    this.categoryService = new CategoryService();
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
    if (order.createdAt !== undefined) cleanOrder.createdAt = order.createdAt;
    if (order.category !== undefined) cleanOrder.category = order.category;
    
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
   * Check if there's sufficient inventory for all products in the order
   * @param orders List of orders to check
   * @returns Boolean indicating if all products have sufficient inventory
   */
  async checkInventoryForOrders(orders: ActiveOrder[]): Promise<boolean> {
    for (const order of orders) {
      try {
        // Skip orders without a valid SKU
        if (!order.SKU) {
          // Order missing SKU, skipping inventory check
          return true; // Allow order to proceed
        }

        const hasSufficient = await this.productService.hasSufficientInventory(
          order.SKU,
          Number(order.quantity) || 1
        );
        if (!hasSufficient) {
          return false;
        }
      } catch {
        // Error checking inventory, but don't block the order
        return true;
      }
    }
    return true;
  }

  /**
   * Reduce inventory for all products in the order
   * Also updates category inventory for each product
   * @param orders List of orders to process
   */
  async reduceInventoryForOrders(orders: ActiveOrder[]): Promise<void> {
    for (const order of orders) {
      try {
        // Skip orders without a valid SKU
        if (!order.SKU) {
          // Order missing SKU, skipping inventory reduction
          return;
        }

        const quantity = Number(order.quantity) || 1;

        // Reduce product inventory
        const updatedProduct =
          await this.productService.reduceInventoryForOrder(
            order.SKU,
            quantity
          );

        // Also reduce category inventory if product has a category
        if (updatedProduct.categoryId) {
          try {
            await this.categoryInventoryService.updateCategoryInventory(
              updatedProduct.categoryId,
              -quantity,
              `Order fulfillment for SKU: ${order.SKU}`,
              "system"
            );
            // Successfully reduced category inventory
          } catch {
            // Failed to update category inventory, but don't fail the entire operation
          }
        } else {
          // Product has no categoryId - skipping category inventory update
        }
      } catch {
        // Error reducing inventory, but don't fail the entire operation
      }
    }
  }

  async updateTodaysOrder(
    order: ActiveOrderSchema
  ): Promise<ActiveOrderSchema | undefined> {
    const existingOrder = await this.getTodaysOrders();

    // Process the order
    if (existingOrder) {
      await this.updateDocument<ActiveOrderSchema>(
        this.COLLECTION_NAME,
        existingOrder.id,
        {
          ...order,
          orders: [
            ...this.cleanOrders(existingOrder.orders),
            ...this.cleanOrders(order.orders),
          ],
        }
      );
    } else {
      const cleanOrderData = {
        ...order,
        orders: this.cleanOrders(order.orders),
      };
      await this.batchOperation<ActiveOrderSchema>(
        [cleanOrderData],
        this.COLLECTION_NAME,
        "create",
        (item) => item.id
      );
    }

    // Reduce inventory after the order is successfully processed
    await this.reduceInventoryForOrders(order.orders);

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
      await this.updateDocument<ActiveOrderSchema>(
        this.COLLECTION_NAME,
        existingOrder.id,
        {
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
        }
      );
    } else {
      const cleanOrderData = {
        ...order,
        id: targetDate,
        date: targetDate,
        orders: this.cleanOrders(order.orders),
      };
      await this.batchOperation<ActiveOrderSchema>(
        [cleanOrderData],
        this.COLLECTION_NAME,
        "create",
        (item) => item.id
      );
    }

    // Reduce inventory after the order is successfully processed
    await this.reduceInventoryForOrders(order.orders);

    return await this.getOrdersForDate(targetDate);
  }
}
