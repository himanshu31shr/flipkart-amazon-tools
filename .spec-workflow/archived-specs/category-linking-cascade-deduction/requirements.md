# Requirements Document

## Introduction

The Category Linking Cascade Deduction feature enables businesses to model complex inventory relationships where processing orders for one category automatically triggers inventory deductions in dependent categories. This addresses real-world scenarios where manufacturing, assembling, or selling products consumes materials, components, or packaging from multiple inventory categories simultaneously.

For example, when processing orders for "Laptop Assembly," the system should automatically deduct from "Processors," "RAM Modules," "Packaging Materials," and other component categories based on predefined consumption ratios. This eliminates manual inventory adjustments and ensures accurate inventory tracking across complex product hierarchies.

## Alignment with Product Vision

This feature directly supports Sacred Sutra Tools' core objectives:

- **Operational Efficiency**: Reduces manual inventory adjustments by automating cascade deductions during order processing
- **Inventory Optimization**: Provides accurate, real-time inventory levels across all dependent categories to prevent stockouts of components and materials
- **Scalability Support**: Enables businesses to handle complex product relationships and manufacturing processes without proportional increase in administrative overhead
- **Data Accuracy**: Ensures high-fidelity inventory tracking by automatically accounting for all consumption relationships during order processing

The feature aligns with the **Automation-First** product principle by minimizing manual data entry through intelligent cascade deduction workflows, allowing users to focus on strategic inventory management rather than tracking individual component consumption.

## Requirements

### Requirement 1

**User Story:** As a business owner, I want to link categories to other categories, so that when orders are processed for primary categories, dependent inventory is automatically deducted from linked categories using their existing deduction configurations.

#### Acceptance Criteria

1. WHEN a user accesses category management THEN the system SHALL provide an interface to link categories to other categories
2. WHEN a user creates a category link THEN the system SHALL use the linked category's existing inventoryDeductionQuantity for cascade deductions
3. WHEN a user saves category links THEN the system SHALL validate that target categories have assigned category groups for inventory tracking
4. WHEN order processing occurs for a primary category THEN the system SHALL automatically deduct from linked categories using their own configured inventoryDeductionQuantity
5. WHEN cascade deductions are calculated THEN the system SHALL multiply order quantity by the linked category's existing inventoryDeductionQuantity

### Requirement 2

**User Story:** As a user, I want to preview cascade deductions before processing orders, so that I can verify inventory impacts and prevent unexpected stockouts.

#### Acceptance Criteria

1. WHEN uploading order files THEN the system SHALL provide a preview showing all primary and cascade deductions before processing
2. WHEN viewing deduction preview THEN the system SHALL display source category, target categories, deduction amounts, and resulting inventory levels
3. WHEN preview shows potential stockouts THEN the system SHALL highlight categories that would go below minimum thresholds or negative inventory
4. WHEN reviewing cascade effects THEN the system SHALL group deductions by target category and show cumulative impact from multiple source categories
5. IF preview reveals inventory issues THEN the system SHALL allow users to cancel processing or proceed with warnings

### Requirement 3

**User Story:** As a system administrator, I want the system to prevent circular dependencies in category links, so that the inventory deduction system remains stable and predictable.

#### Acceptance Criteria

1. WHEN a user attempts to create a category link THEN the system SHALL validate that the link would not create a circular dependency
2. IF a proposed link would create a circular dependency THEN the system SHALL display an error message and prevent the link creation
3. WHEN validating circular dependencies THEN the system SHALL check for both direct cycles (A→B→A) and indirect cycles (A→B→C→A)
4. WHEN a category is linked to itself THEN the system SHALL prevent this self-reference and display an appropriate error message
5. WHEN category links form complex chains THEN the system SHALL ensure dependency validation covers all levels of the chain

### Requirement 4

**User Story:** As a business user, I want to manage category links through an intuitive interface, so that I can easily maintain complex inventory relationships without technical expertise.

#### Acceptance Criteria

1. WHEN viewing category details THEN the system SHALL display all outgoing links (categories this one affects) and incoming links (categories that affect this one)
2. WHEN managing category links THEN the system SHALL provide add, edit, and delete functionality with confirmation dialogs for destructive actions
3. WHEN editing existing links THEN the system SHALL allow modification of deduction quantities and units without recreating the entire relationship
4. WHEN displaying category relationships THEN the system SHALL show target category names, current inventory levels, and configured deduction amounts
5. WHEN links are temporarily not needed THEN the system SHALL support disabling/enabling links without deletion

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: CategoryService handles link management, InventoryOrderProcessor handles deduction processing, validation utilities handle circular dependency checking
- **Modular Design**: Category linking functionality isolated in dedicated service methods that can be reused across different UI components
- **Dependency Management**: Link validation and deduction processing should not create tight coupling between category management and inventory processing
- **Clear Interfaces**: Well-defined TypeScript interfaces for CategoryLink data structure and link validation results

### Performance
- **Circular Dependency Validation**: Link validation must complete within 500ms for complex category hierarchies up to 100 categories deep
- **Cascade Deduction Processing**: Processing cascade deductions for orders with up to 50 line items must complete within 2 seconds
- **Memory Efficiency**: Link traversal algorithms should use iterative approaches to prevent stack overflow in deep category chains
- **Database Queries**: Category link relationships should be stored efficiently to minimize database reads during order processing

### Security
- **Input Validation**: All deduction quantities must be validated as positive numbers with appropriate range checking
- **Authorization**: Category link management should respect existing user roles and permissions within the application
- **Data Integrity**: Link creation and modification must use Firebase transactions to prevent inconsistent states
- **Audit Trail**: All category link changes should be logged for compliance and debugging purposes

### Reliability
- **Atomic Operations**: Cascade deductions must be processed atomically - either all deductions succeed or all are rolled back
- **Error Handling**: Individual link processing failures should not prevent processing of other valid links in the same order
- **Fallback Behavior**: If a linked category's group is unavailable, the system should log the issue and continue processing other links
- **Data Consistency**: Category links should remain consistent even if referenced categories or groups are modified or deleted

### Usability
- **Visual Feedback**: Link management interface should provide clear visual indicators for link status, validation errors, and circular dependency warnings
- **Progressive Disclosure**: Advanced link configuration options should be available but not overwhelm basic use cases
- **Error Messages**: Validation errors should provide specific, actionable guidance for resolving issues
- **Contextual Help**: Link management interface should provide tooltips and help text explaining deduction quantity calculations and unit implications