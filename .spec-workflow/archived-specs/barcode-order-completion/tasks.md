# Tasks Document

## Implementation Guidelines
**For every task, ensure the following standards are met before marking as complete:**
- For every change you make, all tests, type checks, lint checks and build should pass; if fix these before moving on to next change.
- Make sure to follow the existing coding style and conventions.
- Make sure to follow the existing folder structure and file naming conventions.
- Make sure to follow the existing component structure and patterns.
- Make sure to follow the existing state management patterns.
- Make sure to follow the existing styling conventions and patterns.
- Make sure to follow the existing testing patterns and conventions.
- Make sure to remove all debugging code and console logs.
- Make sure to add comments and documentation where necessary.

**Quality Validation Commands:**
- `npm run type-check` - TypeScript compilation must pass
- `npm run lint` - ESLint validation must pass  
- `npm test` - All tests must pass
- `npm run build` - Production build must succeed

- [x] 1. Create barcode type definitions in src/types/barcode.ts
  - File: src/types/barcode.ts
  - Define TypeScript interfaces for OrderBarcode, BarcodeGenerationResult, and ScanningResult
  - Establish type safety for barcode functionality
  - Purpose: Provide comprehensive type coverage for all barcode operations
  - _Leverage: src/types/transaction.type.ts, src/types/inventory.ts_
  - _Requirements: 1, 5_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type systems and Firebase integration | Task: Create comprehensive TypeScript interfaces for barcode functionality including OrderBarcode for Firestore collection, BarcodeGenerationResult for PDF processing, and ScanningResult for camera operations. Follow existing patterns from src/types/transaction.type.ts and src/types/inventory.ts | Restrictions: Do not modify existing type files, maintain consistency with Firebase document patterns, follow project naming conventions | _Leverage: Existing BatchInfo interface patterns, Firestore Timestamp types, platform union types | _Requirements: Requirement 1 (automated barcode generation), Requirement 5 (integration with existing order management) | Success: All interfaces compile without errors, proper Firebase document structure, full type coverage for barcode operations | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 2. Create BarcodeService in src/services/barcode.service.ts
  - File: src/services/barcode.service.ts
  - Implement core barcode generation, storage, and lookup functionality
  - Extend FirebaseService base class following existing patterns
  - Purpose: Provide business logic layer for all barcode operations
  - _Leverage: src/services/firebase.service.ts, src/services/todaysOrder.service.ts_
  - _Requirements: 1, 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in Firebase and service layer architecture | Task: Implement BarcodeService extending FirebaseService base class with methods for generating unique barcode IDs, creating barcode records, fast lookup operations, and completion status updates. Follow patterns from src/services/todaysOrder.service.ts for Firestore operations | Restrictions: Must extend FirebaseService, implement proper error handling, ensure barcode ID uniqueness with collision detection | _Leverage: FirebaseService error handling patterns, removeUndefinedValues utility, existing collection naming conventions | _Requirements: Requirement 1 (automated barcode generation), Requirement 3 (camera-based scanning) | Success: Service implements all required methods, proper Firebase integration, unique ID generation with collision detection works | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 3. Create PDF barcode embedding utilities in src/utils/pdfBarcode.ts
  - File: src/utils/pdfBarcode.ts
  - Implement QR code generation and PDF embedding functionality
  - Add dependencies: jsbarcode for QR generation
  - Purpose: Handle QR code creation and positioning in PDF pages
  - _Leverage: existing PDF processing patterns, pdf-lib usage in merge.service.ts_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: PDF Processing Developer with expertise in pdf-lib and barcode generation | Task: Create utilities for QR code generation using jsbarcode and PDF embedding functionality. Implement bottom-left positioning with minimum viable size calculation based on page dimensions. Follow existing PDF manipulation patterns from merge.service.ts | Restrictions: Must position QR codes at bottom-left corner, ensure minimal size without scanning issues, handle PDF manipulation errors gracefully | _Leverage: pdf-lib patterns from merge.service.ts, error handling from existing PDF processing | _Requirements: Requirement 2 (QR code PDF embedding) | Success: QR codes generate correctly, embed at proper position and size, PDF manipulation is error-resistant | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 4. Enhance PDFMergerService with barcode generation in src/pages/home/services/merge.service.ts
  - File: src/pages/home/services/merge.service.ts
  - Integrate barcode generation into existing PDF processing pipeline
  - Add barcode generation calls during order processing loops
  - Purpose: Generate barcodes for each order during PDF merge operations
  - _Leverage: existing merge.service.ts structure, BarcodeService, PDFBarcodeEmbedder_
  - _Requirements: 1, 2, 5_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: PDF Processing Developer with expertise in existing Sacred Sutra Tools architecture | Task: Enhance PDFMergerService by integrating barcode generation during order processing. Add barcode generation calls in processAmazonFile and processFlipkartFile methods around lines 125-134 and 154-163. Generate unique barcodes, embed QR codes into PDF pages, and store barcode tracking data | Restrictions: Must maintain existing PDF processing functionality, handle barcode failures gracefully without blocking PDF generation, preserve current merge.service.ts patterns | _Leverage: Existing order processing loops, BarcodeService for generation, PDFBarcodeEmbedder for embedding | _Requirements: Requirement 1 (automated barcode generation), Requirement 2 (QR code embedding), Requirement 5 (integration with existing workflow) | Success: Barcodes generate during PDF processing, QR codes embed successfully, existing functionality remains unchanged | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 5. Create BarcodeScanner component in src/pages/todaysOrders/components/BarcodeScanner.tsx
  - File: src/pages/todaysOrders/components/BarcodeScanner.tsx
  - Implement camera-based QR scanning with manual entry fallback
  - Add dependencies: qr-scanner for camera functionality
  - Purpose: Provide scanning interface for order completion
  - _Leverage: Material-UI patterns from existing components, modal patterns from FilesModal.tsx_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React, Material-UI, and camera APIs | Task: Create BarcodeScanner component with camera-based QR scanning using qr-scanner library and manual entry fallback. Implement modal interface following patterns from FilesModal.tsx with proper error handling and user feedback. Include camera permissions handling and responsive design | Restrictions: Must provide manual entry fallback, handle camera permissions gracefully, follow existing Material-UI component patterns | _Leverage: FilesModal patterns for modal interface, Material-UI components from existing Today's Orders components, error handling patterns | _Requirements: Requirement 3 (camera-based order scanning) | Success: Camera scanning works reliably, manual fallback functions, responsive mobile interface, proper error handling | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 6. Integrate scanner into Today's Orders page in src/pages/todaysOrders/todaysOrder.page.tsx
  - File: src/pages/todaysOrders/todaysOrder.page.tsx
  - Add barcode scanner button to toolbar and integrate scanning modal
  - Connect scanner to order completion workflow
  - Purpose: Provide access to barcode scanning from main orders interface
  - _Leverage: existing toolbar structure, ModernFilters component patterns_
  - _Requirements: 3, 4_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React integration and existing Sacred Sutra Tools UI patterns | Task: Integrate BarcodeScanner component into Today's Orders page by adding scanner button to toolbar (around line 160-173) and connecting to order completion workflow. Follow existing button patterns from ModernFilters and integrate with current state management | Restrictions: Must maintain existing page layout and functionality, follow current toolbar design patterns, ensure proper state updates | _Leverage: ModernFilters button patterns, existing modal state management, current toolbar structure | _Requirements: Requirement 3 (camera-based scanning), Requirement 4 (order completion status management) | Success: Scanner button integrates seamlessly, modal opens correctly, order completion workflow functions properly | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 7. Enhance Redux ordersSlice with completion status in src/store/slices/ordersSlice.ts
  - File: src/store/slices/ordersSlice.ts
  - Add completion status selectors and actions for barcode functionality
  - Implement optimistic updates for order completion
  - Purpose: Manage completion status in application state
  - _Leverage: existing ordersSlice structure, async thunk patterns_
  - _Requirements: 4, 5_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend State Management Developer with expertise in Redux Toolkit and existing order management patterns | Task: Enhance ordersSlice by adding completion status selectors (selectCompletedOrders, selectPendingOrders, selectCompletionStats), markOrderCompleted async thunk, and optimistic update logic. Follow existing async thunk patterns from lines 84-100 and selector patterns | Restrictions: Must maintain existing ordersSlice functionality, follow current async thunk patterns, ensure proper optimistic updates | _Leverage: Existing updateOrders thunk patterns, current selector creation patterns, BarcodeService for completion operations | _Requirements: Requirement 4 (order completion status management), Requirement 5 (integration with existing order management) | Success: Completion status managed properly, selectors work correctly, optimistic updates provide smooth UX | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 8. Add completion status indicators to CategoryGroupedTable in src/pages/todaysOrders/components/CategoryGroupedTable.tsx
  - File: src/pages/todaysOrders/components/CategoryGroupedTable.tsx
  - Add completion badges and status indicators to order display
  - Implement completion status filtering options
  - Purpose: Display completion status in main orders interface
  - _Leverage: existing Chip components, status indicator patterns_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in Material-UI data display and existing table component patterns | Task: Enhance CategoryGroupedTable to display completion status badges using Material-UI Chip components, add completion indicators to order rows, and implement filtering for completed/pending orders. Follow existing chip patterns and table structure around lines 52-80 | Restrictions: Must maintain existing table functionality and layout, follow current chip and status indicator patterns, ensure responsive design | _Leverage: Existing Chip components from Material-UI, current table row patterns, platform filter implementation | _Requirements: Requirement 4 (order completion status management) | Success: Completion status displays clearly, filtering works correctly, table performance remains good | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 9. Enhance ModernFilters with completion status filtering in src/pages/todaysOrders/components/ModernFilters.tsx
  - File: src/pages/todaysOrders/components/ModernFilters.tsx
  - Add completion status filter options (completed/pending/all)
  - Integrate with existing filter state management
  - Purpose: Allow filtering orders by completion status
  - _Leverage: existing filter component structure, platform filter patterns_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in filter UI components and existing filter patterns | Task: Enhance ModernFilters component by adding completion status filter options (All/Completed/Pending) following existing platform filter patterns. Integrate with current filter state management and maintain existing filter UI consistency | Restrictions: Must maintain existing filter functionality and design patterns, follow current filter component structure, ensure proper state integration | _Leverage: Existing platform filter implementation, current filter UI patterns, state management integration | _Requirements: Requirement 4 (order completion status management) | Success: Completion filters integrate seamlessly, maintain existing UI consistency, filter state management works correctly | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 10. Create BarcodeService unit tests in src/services/__tests__/barcode.service.test.ts
  - File: src/services/__tests__/barcode.service.test.ts
  - Write comprehensive tests for barcode generation, lookup, and completion operations
  - Mock Firebase dependencies following existing test patterns
  - Purpose: Ensure BarcodeService reliability and catch regressions
  - _Leverage: src/services/__tests__/todaysOrder.service.test.ts patterns_
  - _Requirements: 1, 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in service testing and Firebase mocking | Task: Create comprehensive unit tests for BarcodeService covering barcode generation, collision detection, lookup operations, and completion status updates. Follow existing test patterns from todaysOrder.service.test.ts for Firebase mocking and service testing | Restrictions: Must mock all Firebase dependencies, test both success and failure scenarios, maintain test isolation | _Leverage: Existing service test patterns, Firebase mocking utilities, test setup from todaysOrder.service.test.ts | _Requirements: Requirement 1 (automated barcode generation), Requirement 3 (camera-based scanning) | Success: All service methods tested comprehensively, edge cases covered, tests run independently and consistently | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 11. Create BarcodeScanner component tests in src/pages/todaysOrders/components/__tests__/BarcodeScanner.test.tsx
  - File: src/pages/todaysOrders/components/__tests__/BarcodeScanner.test.tsx
  - Write tests for camera functionality, manual entry, and error handling
  - Mock camera API and qr-scanner library
  - Purpose: Ensure scanner component reliability across different scenarios
  - _Leverage: existing component test patterns from CategoryGroupedTable.test.tsx_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer with expertise in React component testing and camera API mocking | Task: Create comprehensive tests for BarcodeScanner component covering camera permissions, scanning functionality, manual entry fallback, and error scenarios. Mock qr-scanner library and camera APIs following existing component test patterns | Restrictions: Must mock external dependencies, test user interactions thoroughly, ensure accessibility compliance | _Leverage: Existing React Testing Library patterns, component test utilities, mock patterns from other component tests | _Requirements: Requirement 3 (camera-based order scanning) | Success: Component behavior tested thoroughly, camera scenarios covered, user interaction flows validated | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 12. Create integration tests for PDF barcode embedding in src/pages/home/services/__tests__/merge.service.integration.test.ts
  - File: src/pages/home/services/__tests__/merge.service.integration.test.ts
  - Write end-to-end tests for PDF processing with barcode generation
  - Test with sample Amazon and Flipkart PDFs
  - Purpose: Validate complete PDF processing workflow with barcodes
  - _Leverage: existing merge.service.ts test patterns if available_
  - _Requirements: 1, 2, 5_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration Test Engineer with expertise in PDF processing testing and Firebase integration | Task: Create integration tests for enhanced PDFMergerService covering complete workflow from PDF upload through barcode generation to QR embedding. Test with sample Amazon and Flipkart PDFs to ensure proper barcode integration | Restrictions: Must test real PDF processing, ensure test PDFs are included, validate QR code generation and embedding | _Leverage: Sample PDF files, existing PDF processing test utilities, Firebase test configuration | _Requirements: Requirement 1 (automated barcode generation), Requirement 2 (QR code embedding), Requirement 5 (integration with existing workflow) | Success: End-to-end PDF processing with barcodes works correctly, QR codes embedded properly, existing functionality preserved | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 13. Update package.json with new dependencies
  - File: package.json
  - Add jsbarcode and qr-scanner dependencies
  - Add type definitions for new libraries
  - Purpose: Install required packages for barcode functionality
  - _Leverage: existing dependency management patterns_
  - _Requirements: 2, 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in npm dependency management | Task: Update package.json to include jsbarcode (^3.12.1) and qr-scanner (^1.4.2) dependencies plus @types/jsbarcode dev dependency. Follow existing dependency versioning patterns and ensure compatibility with current tech stack | Restrictions: Must use specific versions for compatibility, maintain existing dependency structure, do not modify unrelated dependencies | _Leverage: Existing package.json structure, current TypeScript configuration, dependency versioning patterns | _Requirements: Requirement 2 (QR code PDF embedding), Requirement 3 (camera-based scanning) | Success: Dependencies installed correctly, TypeScript compilation works, no version conflicts | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 14. Create Firestore security rules for order-barcodes collection
  - File: firestore.rules (if exists) or documentation for manual setup
  - Add security rules for new barcode collection
  - Ensure proper user access control and data isolation
  - Purpose: Secure barcode data access according to user permissions
  - _Leverage: existing Firestore security rule patterns_
  - _Requirements: All_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Firebase Security Engineer with expertise in Firestore security rules | Task: Create security rules for order-barcodes collection ensuring proper user access control, data isolation, and preventing unauthorized access. Follow existing security rule patterns for other collections | Restrictions: Must prevent unauthorized access, ensure user can only access their own barcodes, maintain consistency with existing rules | _Leverage: Existing Firestore security rule patterns, user authentication patterns, collection access control | _Requirements: All requirements (proper security for all barcode operations) | Success: Barcode collection properly secured, user access controlled, unauthorized access prevented | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 15. Create database indexes for efficient barcode lookup
  - File: firestore.indexes.json (if exists) or documentation for manual setup
  - Add composite indexes for barcode queries
  - Optimize for fast lookup during scanning operations
  - Purpose: Ensure fast barcode lookup performance for scanning workflow
  - _Leverage: existing Firestore indexing patterns_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Database Performance Engineer with expertise in Firestore indexing and query optimization | Task: Create optimal database indexes for order-barcodes collection to ensure fast lookup during scanning operations. Design indexes for barcode ID lookup, completion status queries, and user-based filtering | Restrictions: Must optimize for read performance, consider query patterns, avoid over-indexing | _Leverage: Existing Firestore indexing patterns, query optimization strategies, performance monitoring | _Requirements: Requirement 3 (camera-based order scanning) | Success: Barcode lookups perform within 100ms, indexes support all query patterns, optimal performance achieved | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_

- [x] 16. Final integration testing and documentation
  - Files: Multiple (integration testing and documentation updates)
  - Test complete end-to-end workflow from PDF upload to order completion
  - Document new barcode functionality and user workflow
  - Purpose: Validate entire feature works together and provide user guidance
  - _Leverage: existing testing infrastructure and documentation patterns_
  - _Requirements: All_
  - _Prompt: Implement the task for spec barcode-order-completion, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer and Technical Writer with expertise in end-to-end testing and user documentation | Task: Perform comprehensive integration testing of complete barcode workflow (PDF upload → barcode generation → QR embedding → scanning → completion) and create user documentation explaining the new functionality | Restrictions: Must test complete user journey, ensure all components work together, provide clear user instructions | _Leverage: Existing test infrastructure, documentation templates, user workflow patterns | _Requirements: All requirements (complete feature validation) | Success: End-to-end workflow functions perfectly, all edge cases handled, comprehensive user documentation provided | Instructions: Mark this task as in-progress [-] in tasks.md when starting, then mark as complete [x] when finished_