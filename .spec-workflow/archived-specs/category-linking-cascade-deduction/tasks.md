# Tasks Document

- [ ] 1. Extend Category type with linking support
  - File: src/types/category.ts
  - Add CategoryLink interface and extend Category interface with linkedCategories field
  - Maintain backward compatibility with existing Category usage
  - Purpose: Establish type safety for category linking functionality
  - _Leverage: existing Category interface patterns_
  - _Requirements: 1.1, 1.2_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in interface design and backward compatibility | Task: Extend the Category interface in src/types/category.ts to support category linking by adding CategoryLink interface and linkedCategories field, following requirements 1.1 and 1.2 | Restrictions: Must maintain backward compatibility with existing Category usage, do not modify existing fields, follow project naming conventions from structure.md | _Leverage: existing Category interface patterns and TypeScript conventions | _Requirements: 1.1 (category linking interface), 1.2 (cascade deduction using existing inventoryDeductionQuantity) | Success: CategoryLink interface is properly defined, Category interface extended without breaking changes, TypeScript compilation passes with full type coverage | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 2. Add circular dependency validation utility
  - File: src/utils/circularDependencyValidator.ts
  - Implement validation logic to detect circular dependencies in category links
  - Include both direct (A→B→A) and indirect (A→B→C→A) cycle detection
  - Purpose: Prevent invalid category linking configurations
  - _Leverage: existing validation patterns from src/utils/_
  - _Requirements: 3.1, 3.4_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Algorithm Developer with expertise in graph algorithms and validation utilities | Task: Create circular dependency validation utility in src/utils/circularDependencyValidator.ts following requirements 3.1 and 3.4, implementing both direct and indirect cycle detection | Restrictions: Must complete validation within 500ms for 100+ category hierarchies, use iterative approaches to prevent stack overflow, follow existing validation patterns | _Leverage: existing validation utilities and error handling patterns from src/utils/ | _Requirements: 3.1 (circular dependency prevention), 3.4 (validation for complex chains) | Success: Validates circular dependencies correctly, meets performance requirements, handles edge cases gracefully, follows existing validation patterns | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 3. Enhance CategoryService with linking methods
  - File: src/services/category.service.ts
  - Add methods for CRUD operations on category links (add, update, remove, get)
  - Integrate circular dependency validation into link creation
  - Purpose: Provide service layer for category linking operations
  - _Leverage: existing CategoryService patterns and Firebase operations_
  - _Requirements: 1.1, 3.1, 4.2_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Service Developer with expertise in Firebase and business logic | Task: Enhance CategoryService in src/services/category.service.ts with category linking methods following requirements 1.1, 3.1, and 4.2, integrating circular dependency validation | Restrictions: Must maintain existing CategoryService API compatibility, use Firebase transactions for data consistency, follow existing service patterns | _Leverage: existing CategoryService patterns, Firebase operations, and validation utilities | _Requirements: 1.1 (category linking interface), 3.1 (circular dependency prevention), 4.2 (intuitive management interface) | Success: All CRUD operations for links implemented, circular dependency validation integrated, maintains API compatibility, follows existing patterns | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 4. Update InventoryOrderProcessor for cascade deductions
  - File: src/services/inventoryOrderProcessor.service.ts
  - Modify calculateCategoryDeductions method to process linked categories
  - Use linked categories' existing inventoryDeductionQuantity for cascade deductions
  - Purpose: Enable automatic cascade deductions during order processing
  - _Leverage: existing InventoryOrderProcessor logic and CategoryService_
  - _Requirements: 1.2, 1.5_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Business Logic Developer with expertise in inventory processing and cascade operations | Task: Update InventoryOrderProcessor in src/services/inventoryOrderProcessor.service.ts to handle cascade deductions following requirements 1.2 and 1.5, using linked categories' existing inventoryDeductionQuantity | Restrictions: Must maintain existing order processing flow, ensure atomic deduction operations, handle mixed units correctly, maintain audit trail | _Leverage: existing InventoryOrderProcessor logic, CategoryService methods, and CategoryGroupService updateInventory | _Requirements: 1.2 (use existing inventoryDeductionQuantity), 1.5 (automatic cascade deductions) | Success: Cascade deductions work correctly during order processing, maintains existing functionality, handles all unit types, provides proper audit trail | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 5. Create CategoryLinkManager component
  - File: src/pages/categories/components/CategoryLinkManager.tsx
  - Build UI component for managing category-to-category links
  - Include add/remove link functionality with validation feedback
  - Purpose: Provide user interface for category linking management
  - _Leverage: existing category management components and Material-UI patterns_
  - _Requirements: 4.1, 4.2, 4.5_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React UI Developer with expertise in Material-UI and form handling | Task: Create CategoryLinkManager component in src/pages/categories/components/CategoryLinkManager.tsx following requirements 4.1, 4.2, and 4.5 for category link management UI | Restrictions: Must follow existing component patterns, use Material-UI design system, handle validation errors gracefully, maintain responsive design | _Leverage: existing category management components, Material-UI patterns, and validation error display components | _Requirements: 4.1 (add/remove links with validation), 4.2 (intuitive interface), 4.5 (enable/disable functionality) | Success: Component renders correctly, handles CRUD operations for links, displays validation errors clearly, follows existing UI patterns | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 6. Create DeductionPreviewModal component
  - File: src/pages/categories/components/DeductionPreviewModal.tsx
  - Build modal component to preview cascade deduction effects
  - Show primary and cascade deductions with inventory impact analysis
  - Purpose: Allow users to preview deduction effects before processing orders
  - _Leverage: existing modal patterns and inventory display components_
  - _Requirements: 2.1, 2.3, 2.4_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React UI Developer with expertise in data visualization and modal components | Task: Create DeductionPreviewModal component in src/pages/categories/components/DeductionPreviewModal.tsx following requirements 2.1, 2.3, and 2.4 for deduction preview functionality | Restrictions: Must use existing modal patterns, handle loading states, display warnings for stockouts, maintain performance with large data sets | _Leverage: existing modal patterns, inventory display components, and warning indicator components | _Requirements: 2.1 (preview primary and cascade deductions), 2.3 (highlight potential stockouts), 2.4 (cumulative impact display) | Success: Modal displays deduction preview accurately, highlights warnings effectively, provides clear user experience, follows existing UI patterns | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 7. Integrate linking UI into CategoryForm
  - File: src/pages/categories/CategoryForm.tsx
  - Add CategoryLinkManager component to existing category form
  - Ensure proper form state management and validation integration
  - Purpose: Integrate linking functionality into existing category management workflow
  - _Leverage: existing CategoryForm patterns and form state management_
  - _Requirements: 4.1, 4.2_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Integration Developer with expertise in form management and component integration | Task: Integrate CategoryLinkManager into existing CategoryForm in src/pages/categories/CategoryForm.tsx following requirements 4.1 and 4.2 | Restrictions: Must maintain existing form functionality, preserve form validation patterns, ensure proper state management, avoid breaking existing category management | _Leverage: existing CategoryForm patterns, form state management, and component integration approaches | _Requirements: 4.1 (link management interface), 4.2 (intuitive interface integration) | Success: CategoryLinkManager integrates seamlessly, form validation works correctly, existing functionality preserved, user experience is intuitive | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 8. Add comprehensive unit tests for CategoryService linking methods
  - File: src/services/__tests__/category.service.link.test.ts
  - Test all category linking CRUD operations with various scenarios
  - Include circular dependency validation testing
  - Purpose: Ensure reliability of category linking service methods
  - _Leverage: existing service testing patterns and test utilities_
  - _Requirements: 1.1, 3.1, 3.4_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in service testing and Jest testing framework | Task: Create comprehensive unit tests in src/services/__tests__/category.service.link.test.ts for category linking methods following requirements 1.1, 3.1, and 3.4 | Restrictions: Must test both success and failure scenarios, mock external dependencies properly, maintain test isolation, achieve >95% code coverage | _Leverage: existing service testing patterns, test utilities, and mocking approaches from src/services/__tests__/ | _Requirements: 1.1 (linking CRUD operations), 3.1 (circular dependency prevention), 3.4 (complex chain validation) | Success: All linking methods tested thoroughly, circular dependency validation covered, edge cases handled, high test coverage achieved | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 9. Add unit tests for InventoryOrderProcessor cascade deduction
  - File: src/services/__tests__/inventoryOrderProcessor.cascade.test.ts
  - Test cascade deduction logic with various linking scenarios
  - Include mixed units, multiple links, and error handling tests
  - Purpose: Ensure reliability of cascade deduction processing
  - _Leverage: existing InventoryOrderProcessor testing patterns_
  - _Requirements: 1.2, 1.5_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in business logic testing and complex scenario validation | Task: Create unit tests in src/services/__tests__/inventoryOrderProcessor.cascade.test.ts for cascade deduction logic following requirements 1.2 and 1.5 | Restrictions: Must test complex scenarios with multiple links, validate mixed unit handling, ensure atomic operations, mock all external dependencies | _Leverage: existing InventoryOrderProcessor testing patterns and complex scenario testing approaches | _Requirements: 1.2 (use existing inventoryDeductionQuantity), 1.5 (automatic cascade processing) | Success: Cascade deduction logic thoroughly tested, complex scenarios covered, mixed units validated, atomic operation behavior verified | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 10. Add unit tests for UI components
  - File: src/pages/categories/components/__tests__/CategoryLinkManager.test.tsx
  - Test CategoryLinkManager component functionality and user interactions
  - Include validation error display and form state management tests
  - Purpose: Ensure UI components work correctly and handle errors gracefully
  - _Leverage: existing component testing patterns with React Testing Library_
  - _Requirements: 4.1, 4.2, 4.5_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer with expertise in React Testing Library and component testing | Task: Create comprehensive component tests in src/pages/categories/components/__tests__/CategoryLinkManager.test.tsx following requirements 4.1, 4.2, and 4.5 | Restrictions: Must test user interactions, validation error display, accessibility features, component state management, avoid testing implementation details | _Leverage: existing component testing patterns with React Testing Library and testing utilities | _Requirements: 4.1 (add/remove functionality), 4.2 (intuitive interface), 4.5 (enable/disable links) | Success: Component behavior thoroughly tested, user interactions validated, error handling verified, accessibility compliant, follows testing best practices | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 11. Add integration tests for end-to-end linking workflow
  - File: src/__tests__/integration/categoryLinkingIntegration.test.ts
  - Test complete workflow from link creation to order processing with cascade deductions
  - Include multiple scenarios with different business use cases
  - Purpose: Validate entire feature works correctly in realistic scenarios
  - _Leverage: existing integration testing patterns and Firebase emulator setup_
  - _Requirements: All requirements (1.1-4.5)_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration QA Engineer with expertise in end-to-end testing and Firebase testing | Task: Create comprehensive integration tests in src/__tests__/integration/categoryLinkingIntegration.test.ts covering complete category linking workflow for all requirements | Restrictions: Must test realistic business scenarios, use Firebase emulator, ensure test data isolation, validate complete workflows end-to-end | _Leverage: existing integration testing patterns, Firebase emulator setup, and realistic test data scenarios | _Requirements: All requirements (1.1-4.5) covering complete feature functionality | Success: End-to-end workflows validated, business scenarios covered, Firebase integration tested, realistic data handling verified | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_

- [ ] 12. Update documentation and type exports
  - Files: src/types/index.ts, src/services/index.ts, README updates
  - Export new interfaces and service methods for external usage
  - Update relevant documentation with category linking feature information
  - Purpose: Ensure feature is properly documented and accessible
  - _Leverage: existing documentation patterns and export conventions_
  - _Requirements: All requirements, code architecture standards_
  - _Prompt: Implement the task for spec category-linking-cascade-deduction, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Documentation Specialist with expertise in TypeScript exports and API documentation | Task: Update documentation and exports in src/types/index.ts, src/services/index.ts, and README files for category linking feature | Restrictions: Must follow existing documentation patterns, ensure proper TypeScript exports, maintain documentation consistency, do not break existing exports | _Leverage: existing documentation patterns, export conventions, and README structure | _Requirements: All requirements plus code architecture standards from steering documents | Success: All new interfaces and methods properly exported, documentation updated accurately, follows existing patterns, feature is discoverable | Instructions: Mark this task as in-progress in tasks.md when starting, then mark as complete when finished_