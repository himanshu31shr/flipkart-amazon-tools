# Design Document: Category-Based Inventory Deduction

## 1. Overview

This design implements automatic inventory deduction from category groups based on category-level quantity configurations. When orders are processed, products will automatically trigger inventory deductions using predefined quantity multipliers stored at the category level.

## 2. Architecture Integration

### 2.1 Existing Infrastructure Leveraged

**Category System:**
- Existing `Category` interface already includes `inventoryType` and `inventoryUnit` fields
- CategoryGroup system provides inventory tracking at group level
- Category-to-CategoryGroup relationships already established

**Inventory System:**
- `InventoryService` provides deduction orchestration
- `InventoryDeductionItem` interface supports category group deductions
- Audit trail through `InventoryMovement` tracking

**Order Processing:**
- Amazon/Flipkart PDF transformers extract order data
- Product-to-Category mapping enables automatic lookups
- Batch processing supports bulk order handling

### 2.2 Design Principles

1. **Minimal Schema Changes**: Extend existing Category interface rather than creating new entities
2. **Service Layer Integration**: Leverage existing InventoryService for consistency
3. **Backward Compatibility**: Ensure existing inventory functionality remains unchanged
4. **Performance Optimization**: Batch deductions during order processing

## 3. Data Model Design

### 3.1 Category Interface Extension

```typescript
export interface Category {
  // ... existing fields ...
  inventoryType?: 'weight' | 'qty';
  inventoryUnit?: 'kg' | 'g' | 'pcs';
  
  // NEW FIELD for automatic deduction
  inventoryDeductionQuantity?: number; // Quantity to deduct per product order
}
```

**Field Specifications:**
- `inventoryDeductionQuantity`: Optional numeric field
- When undefined/null: No automatic deduction (backward compatibility)
- When defined: Automatic deduction using this quantity multiplier
- Validation: Must be positive number when provided

### 3.2 Enhanced Product Processing

```typescript
export interface ProductSummary {
  // ... existing fields ...
  
  // Enhanced for inventory deduction
  categoryDeductionQuantity?: number; // Calculated from category
  inventoryDeductionRequired?: boolean; // Flag for processing
}
```

## 4. Service Layer Design

### 4.1 Enhanced Category Service

**New Methods:**
```typescript
interface CategoryService {
  // NEW: Get categories with deduction configuration
  getCategoriesWithInventoryDeduction(): Promise<Category[]>;
  
  // NEW: Validate deduction configuration
  validateInventoryDeductionConfig(category: Category): ValidationResult;
  
  // NEW: Update category deduction settings
  updateInventoryDeductionQuantity(
    categoryId: string, 
    quantity: number | null
  ): Promise<void>;
}
```

### 4.2 Enhanced Inventory Integration

**Order Processing Integration:**
```typescript
interface InventoryOrderProcessor {
  // NEW: Process orders with automatic category deduction
  processOrderWithCategoryDeduction(
    orderItems: ProductSummary[],
    orderReference?: string
  ): Promise<InventoryDeductionResult>;
  
  // NEW: Preview deduction before processing
  previewCategoryDeductions(
    orderItems: ProductSummary[]
  ): Promise<InventoryDeductionPreview>;
}
```

### 4.3 PDF Transformer Enhancement

**Amazon/Flipkart Transformer Updates:**
- Enhance `processOrdersWithInventory()` to include category deduction
- Add category lookup during product processing
- Calculate deduction quantities based on category configuration

## 5. Processing Flow Design

### 5.1 Order Processing Workflow

```
1. PDF Upload & Processing
   ├── Extract product data (existing)
   ├── Map products to categories (existing)
   └── NEW: Calculate category deduction quantities

2. Inventory Deduction Calculation
   ├── For each product in order:
   │   ├── Lookup product category
   │   ├── Check inventoryDeductionQuantity
   │   └── Calculate: orderQty × categoryDeductionQty
   └── Aggregate by category group

3. Inventory Update Execution
   ├── Validate sufficient inventory
   ├── Perform deductions via InventoryService
   └── Record movements with order reference
```

### 5.2 Deduction Logic

**Per Product Calculation:**
```typescript
const calculateCategoryDeduction = (
  orderQuantity: number,
  categoryDeductionQuantity: number,
  inventoryUnit: string
): InventoryDeductionItem => {
  return {
    categoryGroupId: product.categoryGroupId,
    quantity: orderQuantity * categoryDeductionQuantity,
    unit: inventoryUnit as 'kg' | 'g' | 'pcs',
    productSku: product.sku,
    platform: orderPlatform
  };
};
```

## 6. User Interface Design

### 6.1 Category Management Enhancement

**Category Form Updates:**
- Add inventory deduction configuration section
- Fields: Enable deduction toggle, quantity input
- Validation: Ensure positive numbers, unit consistency
- Preview: Show example calculation

**Form Layout:**
```
┌─ Inventory Configuration ─────────────────┐
│ ☑ Enable automatic inventory deduction    │
│                                           │
│ Deduction Quantity: [____] pieces         │
│ (Per product ordered)                     │
│                                           │
│ Example: 1 product order = 10 pieces      │
│         deducted from category group      │
└───────────────────────────────────────────┘
```

### 6.2 Inventory Dashboard Enhancement

**New Widgets:**
- Category Deduction Overview: Show configured categories
- Recent Auto-Deductions: Display recent automatic deductions
- Deduction Alerts: Warn when deductions would cause negative inventory

### 6.3 Order Processing Feedback

**Enhanced Order Results:**
- Show automatic deductions performed
- Display warnings for insufficient inventory
- Link to inventory levels for affected category groups

## 7. Integration Points

### 7.1 PDF Transformer Integration

**Amazon Transformer (`TrasformAmazonPages.ts`):**
- Enhance `processOrdersWithInventory()` method
- Add category deduction calculation
- Include deduction items in InventoryService call

**Flipkart Transformer (`TrasformFlipkartPages.ts`):**
- Mirror Amazon transformer enhancements
- Ensure consistent deduction logic

### 7.2 Redux State Integration

**Categories Slice Enhancement:**
- Add deduction configuration to category state
- Provide selectors for deduction-enabled categories
- Update actions for deduction quantity management

**Inventory Slice Integration:**
- Track auto-deduction status
- Store deduction results for UI display
- Maintain audit trail in state

## 8. Error Handling & Edge Cases

### 8.1 Validation Scenarios

1. **Insufficient Inventory:**
   - Allow partial deduction with warning
   - Log shortfall for manual review
   - Continue processing other items

2. **Missing Category Configuration:**
   - Skip deduction for unconfigured categories
   - Log warning for review
   - Maintain order processing flow

3. **Invalid Deduction Quantities:**
   - Validate positive numbers
   - Prevent zero or negative values
   - Default to no deduction on validation failure

### 8.2 Recovery Mechanisms

1. **Rollback Support:**
   - Track deduction movements with order reference
   - Enable manual reversal of auto-deductions
   - Maintain audit trail for compliance

2. **Manual Override:**
   - Allow disabling auto-deduction per order
   - Provide manual adjustment capabilities
   - Support bulk correction operations

## 9. Performance Considerations

### 9.1 Optimization Strategies

1. **Batch Processing:**
   - Group deductions by category group
   - Single Firestore transaction per group
   - Minimize database round trips

2. **Caching:**
   - Cache category deduction configurations
   - Refresh on category updates
   - Reduce lookup overhead

3. **Async Processing:**
   - Decouple deduction from PDF processing
   - Background queue for large orders
   - Progress tracking for user feedback

### 9.2 Scalability Design

1. **Firestore Optimization:**
   - Compound indexes for efficient queries
   - Batch writes for multiple deductions
   - Pagination for large result sets

2. **Memory Management:**
   - Stream processing for large orders
   - Garbage collection optimization
   - Memory pool for calculations

## 10. Security & Compliance

### 10.1 Access Control

- Category deduction configuration requires admin privileges
- Audit trail for all configuration changes
- User identification in movement records

### 10.2 Data Integrity

- Atomic transactions for inventory updates
- Validation of all deduction calculations
- Rollback capabilities for error recovery

## 11. Testing Strategy

### 11.1 Unit Testing

- Category service deduction logic
- Inventory calculation accuracy
- Edge case validation

### 11.2 Integration Testing

- End-to-end order processing with deduction
- PDF transformer integration
- Redux state management

### 11.3 Performance Testing

- Large order processing with many categories
- Concurrent deduction operations
- Memory usage under load

## 12. Migration Strategy

### 12.1 Schema Migration

- Add `inventoryDeductionQuantity` field to existing categories
- Default to null for backward compatibility
- No data loss or breaking changes

### 12.2 Feature Rollout

1. **Phase 1:** Backend implementation with feature flag
2. **Phase 2:** UI for category configuration
3. **Phase 3:** Integration with order processing
4. **Phase 4:** Full feature activation

## 13. Success Metrics

### 13.1 Functional Metrics

- Accurate inventory deduction matching category configuration
- Zero data loss during automatic processing
- Successful integration with existing order flow

### 13.2 Performance Metrics

- Order processing time remains under 2 seconds
- Inventory updates complete within 1 second
- UI remains responsive during batch operations

### 13.3 User Experience Metrics

- Reduced manual inventory adjustment by 80%
- Improved inventory accuracy
- Positive user feedback on automation

## 14. Future Enhancements

### 14.1 Advanced Features

- Variable deduction based on product attributes
- Time-based deduction rules
- Integration with supplier reorder systems

### 14.2 Analytics Integration

- Deduction pattern analysis
- Inventory optimization recommendations
- Predictive inventory alerts