# Requirements Document: Category-Based Inventory Deduction

## Introduction

This feature introduces automated inventory deduction from category groups based on individual category configurations. When an order is processed for a product, the system will automatically reduce the inventory of the associated category group by the specified quantity and unit defined at the category level. This eliminates manual inventory tracking and ensures real-time inventory accuracy across the e-commerce platform.

For example, if Category A has a deduction unit of "pieces" with quantity 10 and belongs to Category Group A, then when an order for any product in Category A is received, the inventory for Category Group A will be automatically reduced by 10 pieces.

## Alignment with Product Vision

This feature directly supports the **Intelligent Inventory Management** key feature by automating inventory adjustments from processed orders. It aligns with the business objective of **Inventory Optimization** to maintain optimal stock levels with real-time tracking. This enhancement addresses the product principle of **Automation-First** by minimizing manual inventory updates and ensuring **Data Accuracy** through systematic inventory deduction rules.

The feature enables the success metric of **Inventory Accuracy** with real-time inventory sync and supports the scalability requirements for handling increased order volume without proportional administrative overhead.

## Requirements

### Requirement 1: Category Inventory Configuration

**User Story:** As an e-commerce business owner, I want to configure inventory deduction settings for each category, so that orders automatically reduce the correct inventory amounts from category groups.

#### Acceptance Criteria

1. WHEN a user creates or edits a category THEN the system SHALL provide fields for "Inventory Unit Type" (pieces, kg, g) and "Deduction Quantity" (numeric value)
2. IF a category is assigned to a category group THEN the system SHALL validate that the category's unit type matches the category group's inventory unit type
3. WHEN saving category configuration THEN the system SHALL require both unit type and deduction quantity to be specified if one is provided
4. WHEN a category has inventory configuration THEN the system SHALL display these settings in the category management interface with clear labels

### Requirement 2: Automatic Inventory Deduction on Order Processing

**User Story:** As an e-commerce business owner, I want inventory to be automatically deducted when orders are processed, so that I have real-time inventory tracking without manual intervention.

#### Acceptance Criteria

1. WHEN an order is processed for a product THEN the system SHALL identify the product's category and its associated category group
2. IF the category has inventory deduction configuration THEN the system SHALL reduce the category group's current inventory by the specified deduction quantity
3. WHEN multiple products in the same order belong to the same category THEN the system SHALL multiply the deduction quantity by the number of products and deduct the total amount
4. IF a category group's inventory would become negative after deduction THEN the system SHALL log a warning but continue processing the order
5. WHEN inventory deduction occurs THEN the system SHALL update the category group's last inventory update timestamp

### Requirement 3: Order Processing Integration

**User Story:** As a business user processing orders, I want to see inventory impacts during order processing, so that I can understand how orders affect my stock levels.

#### Acceptance Criteria

1. WHEN processing PDF orders (Amazon/Flipkart) THEN the system SHALL calculate total inventory impact before applying deductions
2. IF order processing includes products with configured category deductions THEN the system SHALL display a summary of inventory changes by category group
3. WHEN order processing completes THEN the system SHALL apply all calculated inventory deductions atomically
4. IF inventory deduction fails for any category group THEN the system SHALL rollback all inventory changes for that order and log the error

### Requirement 4: Inventory Status Updates

**User Story:** As an inventory manager, I want category groups to show updated inventory status after deductions, so that I can monitor stock levels and receive appropriate alerts.

#### Acceptance Criteria

1. WHEN inventory is deducted from a category group THEN the system SHALL recalculate the inventory status (healthy, low_stock, zero_stock, negative_stock)
2. IF a category group falls below its minimum threshold due to deduction THEN the system SHALL create appropriate inventory alerts
3. WHEN category group inventory status changes THEN the system SHALL update all related category statuses accordingly
4. IF a category group reaches zero or negative inventory THEN the system SHALL mark it as zero_stock or negative_stock respectively

### Requirement 5: Audit Trail and Tracking

**User Story:** As a business owner, I want to track all inventory deductions with their sources, so that I can audit inventory changes and troubleshoot discrepancies.

#### Acceptance Criteria

1. WHEN inventory deduction occurs THEN the system SHALL create an inventory movement record with order details, product information, and deduction amount
2. IF deduction is triggered by order processing THEN the movement record SHALL include order number, platform (Amazon/Flipkart), and processing timestamp
3. WHEN viewing inventory movements THEN the system SHALL display category-based deductions with clear identification of the triggering order
4. IF multiple products in one order trigger deductions THEN the system SHALL create separate movement records for each category group affected

### Requirement 6: Configuration Management

**User Story:** As an administrator, I want to manage category inventory configurations efficiently, so that I can set up and maintain deduction rules across multiple categories.

#### Acceptance Criteria

1. WHEN bulk editing categories THEN the system SHALL allow setting inventory configuration for multiple categories simultaneously
2. IF a category group's unit type is changed THEN the system SHALL validate that all associated categories have compatible unit types
3. WHEN importing category data THEN the system SHALL support inventory unit type and deduction quantity in the import format
4. IF a category is moved to a different category group THEN the system SHALL validate unit type compatibility and warn about potential impacts

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Inventory deduction logic isolated in dedicated service classes separate from order processing
- **Modular Design**: Category configuration, inventory calculation, and audit trail components are independently testable and reusable
- **Dependency Management**: Inventory deduction service depends only on category service and inventory service interfaces
- **Clear Interfaces**: Well-defined contracts between order processing, category management, and inventory tracking systems

### Performance
- **Deduction Processing**: Inventory calculations and updates must complete within 500ms for typical order sizes (1-20 products)
- **Bulk Operations**: Support processing of batch orders (50+ products) with inventory deductions within 5 seconds
- **Real-time Updates**: Inventory status changes must propagate to UI components within 1 second of deduction
- **Database Efficiency**: Use atomic transactions for inventory updates to prevent race conditions during concurrent order processing

### Security
- **Data Validation**: All category configuration inputs must be sanitized and validated before database storage
- **Access Control**: Inventory deduction configuration requires appropriate user permissions consistent with existing category management
- **Audit Security**: Inventory movement records must be immutable and include user identification for compliance tracking
- **Transaction Integrity**: Use Firebase transaction mechanisms to ensure inventory deductions are atomic and consistent

### Reliability
- **Error Handling**: System must gracefully handle invalid category configurations and continue order processing
- **Rollback Capability**: Failed inventory deductions must not leave the system in an inconsistent state
- **Data Consistency**: Inventory levels must remain accurate even during concurrent order processing from multiple users
- **Recovery Mechanisms**: System must detect and correct inventory discrepancies through reconciliation processes

### Usability
- **Configuration Clarity**: Category inventory settings must be clearly labeled and provide helpful tooltips explaining their impact
- **Visual Feedback**: Users must receive immediate feedback when configuring invalid unit type combinations
- **Error Communication**: Clear error messages when inventory deduction fails, including guidance for resolution
- **Progress Indication**: Order processing must show inventory impact calculations during long-running operations