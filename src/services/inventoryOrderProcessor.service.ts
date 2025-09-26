import { InventoryService } from './inventory.service';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { Category } from '../types/category';
import { Product } from '../types/product';
import { BatchInfo } from '../types/transaction.type';
import { 
  InventoryDeductionItem,
  InventoryDeductionResult
} from '../types/inventory';

/**
 * Product summary interface for order processing
 * Represents a product item extracted from order processing (Amazon/Flipkart PDFs)
 */
export interface ProductSummary {
  name: string;
  quantity: string;
  SKU?: string;
  type: 'amazon' | 'flipkart';
  orderId?: string;
  batchInfo?: BatchInfo;
  // Enhanced for inventory deduction
  categoryId?: string;
  categoryGroupId?: string;
  category?: string;
  product?: Product;
  categoryDeductionQuantity?: number;
  inventoryDeductionRequired?: boolean;
}

/**
 * Preview of inventory deductions before processing
 */
export interface InventoryDeductionPreview {
  items: Array<{
    productSku: string;
    productName: string;
    categoryName: string;
    categoryGroupId: string;
    orderQuantity: number;
    deductionQuantity: number;
    totalDeduction: number;
    inventoryUnit: string;
    isCascade?: boolean; // New field to identify cascade deductions
    cascadeSource?: { // Information about cascade source
      sourceCategoryName: string;
      targetCategoryName: string;
    };
  }>;
  totalDeductions: Map<string, { categoryGroupName: string; totalQuantity: number; unit: string }>;
  warnings: string[];
  errors: string[];
}

/**
 * InventoryOrderProcessor Service
 * 
 * Orchestrates automatic inventory deduction based on category configuration during order processing.
 * This service bridges the gap between PDF order processing and inventory management by:
 * - Calculating category-based deduction quantities
 * - Mapping order items to inventory deductions
 * - Coordinating with existing InventoryService for actual deductions
 * - Providing preview capabilities for validation
 * 
 * Requirements Coverage:
 * - R2: Automatic Deduction - calculates deductions based on category configuration
 * - R4: Order Processing Integration - integrates with Amazon/Flipkart PDF processing
 * - R6: Integration with Existing Architecture - leverages existing services
 */
export class InventoryOrderProcessor {
  private readonly inventoryService: InventoryService;
  private readonly categoryService: CategoryService;
  private readonly productService: ProductService;

  /**
   * Initialize InventoryOrderProcessor with required service dependencies
   */
  constructor() {
    this.inventoryService = new InventoryService();
    this.categoryService = new CategoryService();
    this.productService = new ProductService();
  }

  /**
   * Process orders with automatic category-based inventory deduction
   * 
   * This method is the main entry point for automatic inventory deduction during order processing.
   * It takes order items (typically from Amazon/Flipkart PDF processing), calculates the required
   * inventory deductions based on category configuration, and performs the deductions.
   * 
   * Process:
   * 1. Enhance order items with category and product information
   * 2. Calculate category-based deduction quantities
   * 3. Map to InventoryDeductionItem format
   * 4. Delegate to InventoryService for actual deductions
   * 5. Return comprehensive results
   * 
   * @param orderItems Array of ProductSummary objects from order processing
   * @param orderReference Optional order reference for audit trail
   * @returns Promise<{ orderItems: ProductSummary[], inventoryResult: InventoryDeductionResult }>
   * 
   * Requirements Coverage:
   * - R2: Automatic Deduction - performs automatic deduction based on category config
   * - R4: Order Processing Integration - integrates with existing order processing flow
   * - R5: Audit Trail - maintains audit trail with order references
   */
  async processOrderWithCategoryDeduction(
    orderItems: ProductSummary[],
    orderReference?: string
  ): Promise<{
    orderItems: ProductSummary[];
    inventoryResult: InventoryDeductionResult;
  }> {
    // Input validation
    if (!orderItems || orderItems.length === 0) {
      return {
        orderItems: [],
        inventoryResult: {
          deductions: [],
          warnings: [],
          errors: []
        }
      };
    }

    try {
      // Step 1: Enhance order items with category and product information
      const enhancedOrderItems = await this.enhanceOrderItemsWithCategoryInfo(orderItems);

      // Step 2: Calculate category-based deductions
      const inventoryDeductionItems = await this.calculateCategoryDeductions(enhancedOrderItems, orderReference);

      // Step 3: Perform inventory deductions if any items require deduction
      let inventoryResult: InventoryDeductionResult = {
        deductions: [],
        warnings: [],
        errors: []
      };

      if (inventoryDeductionItems.length > 0) {
        inventoryResult = await this.inventoryService.deductInventoryFromOrder(inventoryDeductionItems);
      }

      return {
        orderItems: enhancedOrderItems,
        inventoryResult
      };
    } catch (error) {
      console.error('Error processing order with category deduction:', error);
      return {
        orderItems,
        inventoryResult: {
          deductions: [],
          warnings: [],
          errors: [{
            categoryGroupId: 'unknown',
            error: `Order processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            requestedQuantity: 0,
            reason: 'Processing error'
          }]
        }
      };
    }
  }

  /**
   * Preview category deductions without performing actual inventory updates
   * Enhanced to show both primary and cascade deductions
   * 
   * This method allows users to see what inventory deductions would occur
   * before actually processing an order, enabling validation and review.
   * 
   * @param orderItems Array of ProductSummary objects to preview
   * @returns Promise<InventoryDeductionPreview> Preview of what would be deducted
   * 
   * Requirements Coverage:
   * - R6: Management Tools - provides preview capabilities for validation
   */
  async previewCategoryDeductions(orderItems: ProductSummary[]): Promise<InventoryDeductionPreview> {
    const preview: InventoryDeductionPreview = {
      items: [],
      totalDeductions: new Map(),
      warnings: [],
      errors: []
    };

    if (!orderItems || orderItems.length === 0) {
      return preview;
    }

    try {
      // Enhance order items with category information
      const enhancedOrderItems = await this.enhanceOrderItemsWithCategoryInfo(orderItems);

      // Process each item for both primary and cascade deductions
      for (const item of enhancedOrderItems) {
        const orderQuantity = parseInt(item.quantity || '1');

        // Step 1: Process primary deduction preview
        await this.addPrimaryDeductionToPreview(item, orderQuantity, preview);

        // Step 2: Process cascade deduction preview
        if (item.categoryId) {
          await this.addCascadeDeductionsToPreview(item, orderQuantity, preview);
        }
      }

      // Add warnings for items without deduction configuration
      const itemsWithoutDeduction = enhancedOrderItems.filter(item => !item.inventoryDeductionRequired);
      if (itemsWithoutDeduction.length > 0) {
        preview.warnings.push(`${itemsWithoutDeduction.length} items will not trigger automatic inventory deduction (not configured)`);
      }

      // Add summary information about cascade deductions
      const cascadeItems = preview.items.filter(item => item.isCascade);
      if (cascadeItems.length > 0) {
        preview.warnings.push(`${cascadeItems.length} additional cascade deductions will be processed from linked categories`);
      }

    } catch (error) {
      preview.errors.push(`Preview calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return preview;
  }

  /**
   * Add primary deduction to preview (existing logic)
   * @private
   */
  private async addPrimaryDeductionToPreview(
    item: ProductSummary,
    orderQuantity: number,
    preview: InventoryDeductionPreview
  ): Promise<void> {
    if (item.inventoryDeductionRequired && item.categoryDeductionQuantity && item.product?.categoryGroupId) {
      const totalDeduction = orderQuantity * item.categoryDeductionQuantity;

      if (totalDeduction > 0) {
        const unit = await this.getCategoryInventoryUnit(item.categoryId || '') || 'pcs';

        // Add primary deduction to preview items
        preview.items.push({
          productSku: item.SKU || 'Unknown',
          productName: item.name,
          categoryName: item.category || 'Unknown',
          categoryGroupId: item.product.categoryGroupId,
          orderQuantity,
          deductionQuantity: item.categoryDeductionQuantity,
          totalDeduction,
          inventoryUnit: unit,
          isCascade: false
        });

        // Aggregate by category group
        this.aggregateDeductionInPreview(item.product.categoryGroupId, totalDeduction, unit, preview);
      }
    }
  }

  /**
   * Add cascade deductions to preview (new functionality)
   * @private
   */
  private async addCascadeDeductionsToPreview(
    item: ProductSummary,
    orderQuantity: number,
    preview: InventoryDeductionPreview
  ): Promise<void> {
    try {
      // Get all active linked categories for this item's category
      const linkedCategories = await this.categoryService.getLinkedCategories(item.categoryId!, false);

      for (const linkedCategory of linkedCategories) {
        // Skip if linked category doesn't have deduction configured
        if (!linkedCategory.inventoryDeductionQuantity || linkedCategory.inventoryDeductionQuantity <= 0) {
          continue;
        }

        // Skip if linked category doesn't have category group assigned
        if (!linkedCategory.categoryGroupId) {
          continue;
        }

        // Calculate cascade deduction quantity
        const cascadeDeduction = orderQuantity * linkedCategory.inventoryDeductionQuantity;

        if (cascadeDeduction > 0) {
          const unit = linkedCategory.inventoryUnit || 'pcs';

          // Add cascade deduction to preview items
          preview.items.push({
            productSku: item.SKU || 'Unknown',
            productName: item.name,
            categoryName: linkedCategory.name,
            categoryGroupId: linkedCategory.categoryGroupId,
            orderQuantity,
            deductionQuantity: linkedCategory.inventoryDeductionQuantity,
            totalDeduction: cascadeDeduction,
            inventoryUnit: unit,
            isCascade: true,
            cascadeSource: {
              sourceCategoryName: item.category || 'Unknown',
              targetCategoryName: linkedCategory.name
            }
          });

          // Aggregate by category group
          this.aggregateDeductionInPreview(linkedCategory.categoryGroupId, cascadeDeduction, unit, preview);
        }
      }
    } catch (error) {
      console.error(`Error adding cascade deductions to preview for category ${item.categoryId}:`, error);
      preview.warnings.push(`Could not calculate cascade deductions for ${item.category || 'Unknown'} category`);
    }
  }

  /**
   * Helper to aggregate deductions by category group for preview
   * @private
   */
  private aggregateDeductionInPreview(
    groupId: string,
    quantity: number,
    unit: string,
    preview: InventoryDeductionPreview
  ): void {
    if (preview.totalDeductions.has(groupId)) {
      const existing = preview.totalDeductions.get(groupId)!;
      existing.totalQuantity += quantity;
    } else {
      // For preview, we'll use a simple group name format
      // In a full implementation, this would call CategoryGroupService
      const groupName = `Group ${groupId}`;
      preview.totalDeductions.set(groupId, {
        categoryGroupName: groupName,
        totalQuantity: quantity,
        unit
      });
    }
  }

  /**
   * Enhance order items with category and product information
   * @private
   */
  private async enhanceOrderItemsWithCategoryInfo(orderItems: ProductSummary[]): Promise<ProductSummary[]> {
    const [products, categories] = await Promise.all([
      this.productService.getProducts(),
      this.categoryService.getCategories()
    ]);

    return orderItems.map(item => {
      // Find product by SKU
      const product = products.find(p => p.sku === item.SKU);
      
      // Find category
      const category = product ? categories.find(c => c.id === product.categoryId) : undefined;

      // Check if category has deduction configured
      // The category must have deduction quantity AND be assigned to a category group
      const inventoryDeductionRequired = !!(
        category?.inventoryDeductionQuantity && 
        category.inventoryDeductionQuantity > 0 &&
        category.categoryGroupId
      );

      return {
        ...item,
        categoryId: product?.categoryId,
        category: category?.name,
        product,
        categoryDeductionQuantity: category?.inventoryDeductionQuantity || undefined,
        categoryGroupId: category?.categoryGroupId,
        inventoryDeductionRequired
      };
    });
  }

  /**
   * Calculate inventory deduction items based on category configuration
   * Enhanced to support cascade deductions through category linking
   * @private
   */
  private async calculateCategoryDeductions(
    enhancedOrderItems: ProductSummary[],
    orderReference?: string
  ): Promise<InventoryDeductionItem[]> {
    const deductionItems: InventoryDeductionItem[] = [];

    // Process each order item for both primary and cascade deductions
    for (const item of enhancedOrderItems) {
      const orderQuantity = parseInt(item.quantity || '1');

      // Step 1: Process primary deduction (existing logic)
      await this.processPrimaryDeduction(item, orderQuantity, orderReference, deductionItems);

      // Step 2: Process cascade deductions from linked categories (new functionality)
      if (item.categoryId) {
        await this.processCascadeDeductions(item, orderQuantity, orderReference, deductionItems);
      }
    }

    return deductionItems;
  }

  /**
   * Process primary deduction for an order item (original logic)
   * @private
   */
  private async processPrimaryDeduction(
    item: ProductSummary,
    orderQuantity: number,
    orderReference: string | undefined,
    deductionItems: InventoryDeductionItem[]
  ): Promise<void> {
    const categoryGroupId = item.categoryGroupId;

    if (!item.inventoryDeductionRequired || !item.categoryDeductionQuantity || !categoryGroupId) {
      return;
    }

    const totalDeduction = orderQuantity * item.categoryDeductionQuantity;

    if (totalDeduction > 0) {
      // Get inventory unit from the category data we already have
      const inventoryUnit = await this.getCategoryInventoryUnit(item.categoryId || '') || 'pcs';

      const deductionItem = {
        categoryGroupId: categoryGroupId,
        quantity: totalDeduction,
        unit: inventoryUnit as 'kg' | 'g' | 'pcs',
        productSku: item.SKU || '',
        orderReference: item.orderId || orderReference,
        transactionReference: item.batchInfo?.batchId,
        platform: item.type
      };

      deductionItems.push(deductionItem);
    }
  }

  /**
   * Process cascade deductions for linked categories (new functionality)
   * @private
   */
  private async processCascadeDeductions(
    item: ProductSummary,
    orderQuantity: number,
    orderReference: string | undefined,
    deductionItems: InventoryDeductionItem[]
  ): Promise<void> {
    try {
      // Get all active linked categories for this item's category
      const linkedCategories = await this.categoryService.getLinkedCategories(item.categoryId!, false);

      for (const linkedCategory of linkedCategories) {
        // Skip if linked category doesn't have deduction configured
        if (!linkedCategory.inventoryDeductionQuantity || linkedCategory.inventoryDeductionQuantity <= 0) {
          continue;
        }

        // Skip if linked category doesn't have category group assigned
        if (!linkedCategory.categoryGroupId) {
          continue;
        }

        // Calculate cascade deduction quantity
        const cascadeDeduction = orderQuantity * linkedCategory.inventoryDeductionQuantity;

        if (cascadeDeduction > 0) {
          const inventoryUnit = linkedCategory.inventoryUnit || 'pcs';

          // Create cascade deduction item (maintains compatibility with existing interface)
          const cascadeDeductionItem = {
            categoryGroupId: linkedCategory.categoryGroupId,
            quantity: cascadeDeduction,
            unit: inventoryUnit as 'kg' | 'g' | 'pcs',
            productSku: item.SKU || '',
            orderReference: item.orderId || orderReference,
            transactionReference: item.batchInfo?.batchId,
            platform: item.type
          };

          deductionItems.push(cascadeDeductionItem);
        }
      }
    } catch (error) {
      console.error(`Error processing cascade deductions for category ${item.categoryId}:`, error);
      // Don't throw - cascade failures shouldn't break primary deduction processing
    }
  }

  /**
   * Get category inventory unit by category ID
   * @private
   */
  private async getCategoryInventoryUnit(categoryId: string): Promise<string | undefined> {
    if (!categoryId) return undefined;
    
    try {
      const category = await this.categoryService.getCategory(categoryId);
      return category?.inventoryUnit;
    } catch {
      return undefined;
    }
  }

  /**
   * Get category group name by ID
   * @private
   */
  private async getCategoryGroupName(groupId: string): Promise<string> {
    try {
      // This would require CategoryGroupService - for now return ID
      // In a real implementation, we'd inject CategoryGroupService
      return `Group ${groupId}`;
    } catch {
      return `Unknown Group (${groupId})`;
    }
  }

  /**
   * Get categories that are configured for automatic inventory deduction
   * @returns Promise<Category[]> Categories with deduction enabled
   */
  async getCategoriesWithDeductionEnabled(): Promise<Category[]> {
    return this.categoryService.getCategoriesWithInventoryDeduction();
  }

  /**
   * Check if automatic deduction is enabled for a specific product
   * @param productSku SKU of the product to check
   * @returns Promise<boolean> True if automatic deduction is enabled
   */
  async isAutomaticDeductionEnabled(productSku: string): Promise<boolean> {
    try {
      const products = await this.productService.getProducts();
      const product = products.find(p => p.sku === productSku);
      
      if (!product?.categoryId) {
        return false;
      }

      return this.categoryService.isCategoryReadyForDeduction(product.categoryId);
    } catch {
      return false;
    }
  }

  /**
   * Get deduction configuration summary for all categories
   * @returns Promise<Array<{categoryId: string, categoryName: string, summary: string}>>
   */
  async getDeductionConfigurationSummary(): Promise<Array<{
    categoryId: string;
    categoryName: string;
    summary: string;
  }>> {
    try {
      const categories = await this.categoryService.getCategories();
      const summaries = [];

      for (const category of categories) {
        if (category.id) {
          const summary = await this.categoryService.getDeductionValidationSummary(category.id);
          summaries.push({
            categoryId: category.id,
            categoryName: category.name,
            summary
          });
        }
      }

      return summaries;
    } catch (error) {
      console.error('Error getting deduction configuration summary:', error);
      return [];
    }
  }
}