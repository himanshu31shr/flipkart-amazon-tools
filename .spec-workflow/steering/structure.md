# Project Structure

## Directory Organization

```
sacred-sutra-tools/
├── src/                          # Main source code
│   ├── pages/                    # Feature-based page components
│   │   ├── home/                 # PDF upload and processing
│   │   ├── dashboard/            # Analytics dashboard
│   │   ├── inventory/            # Inventory management
│   │   ├── products/             # Product catalog
│   │   ├── categories/           # Category management
│   │   ├── categoryGroups/       # Category group management
│   │   ├── orderAnalytics/       # Sales analytics
│   │   ├── todaysOrders/         # Current orders
│   │   └── auth/                 # Authentication pages
│   ├── components/               # Shared UI components
│   │   ├── DataTable/            # Reusable data table
│   │   ├── InventoryStatusChip/  # Status display components
│   │   └── [ComponentName]/      # Self-contained component modules
│   ├── services/                 # Business logic services
│   │   ├── firebase.service.ts   # Base Firebase integration
│   │   ├── product.service.ts    # Product CRUD operations
│   │   ├── inventory.service.ts  # Inventory management
│   │   └── [domain].service.ts   # Domain-specific services
│   ├── store/                    # Redux state management
│   │   ├── slices/               # Redux Toolkit slices
│   │   ├── actions/              # Redux actions
│   │   ├── middleware/           # Custom middleware
│   │   └── utils/                # Store utilities
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Shared utility functions
│   ├── shared/                   # Cross-cutting concerns
│   └── __tests__/                # Global test utilities
├── scripts/                      # Build and utility scripts
│   ├── migrations/               # Database migration scripts
│   └── seed-emulator.js          # Development data seeding
├── .spec-workflow/               # Specification workflow
│   ├── steering/                 # Project steering documents
│   ├── specs/                    # Feature specifications
│   └── templates/                # Document templates
└── public/                       # Static assets
```

## Naming Conventions

### Files
- **Components**: `PascalCase` (e.g., `InventoryDashboard.tsx`, `ManualAdjustmentModal.tsx`)
- **Pages**: `PascalCase` with `.page.tsx` suffix (e.g., `home.page.tsx`, `dashboard.page.tsx`)
- **Services**: `camelCase` with `.service.ts` suffix (e.g., `product.service.ts`, `firebase.service.ts`)
- **Types**: `camelCase` with `.ts` suffix (e.g., `inventory.ts`, `categoryGroup.ts`)
- **Tests**: `[filename].test.tsx` or `[filename].test.ts` (e.g., `InventoryDashboard.test.tsx`)
- **Utilities**: `camelCase` with `.ts` suffix (e.g., `dateUtils.ts`, `validationUtils.ts`)

### Code
- **Classes/Types**: `PascalCase` (e.g., `FirebaseService`, `InventoryItem`)
- **Interfaces**: `PascalCase` with `I` prefix or descriptive name (e.g., `Product`, `InventoryLevel`)
- **Functions/Methods**: `camelCase` (e.g., `calculateTotalCost`, `processOrderData`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `FIREBASE_COLLECTIONS`, `PDF_PROCESSING_CONFIG`)
- **Variables**: `camelCase` (e.g., `currentUser`, `inventoryItems`)

## Import Patterns

### Import Order
1. **External dependencies**: React, Material-UI, Firebase, third-party libraries
2. **Internal services**: Business logic services from `src/services/`
3. **Store dependencies**: Redux slices, actions, selectors
4. **Components**: Shared components from `src/components/`
5. **Types**: TypeScript interfaces and types
6. **Utilities**: Helper functions and constants
7. **Relative imports**: Local components within the same feature
8. **Style imports**: CSS/Material-UI styling (when applicable)

### Module Organization
```typescript
// External dependencies
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';

// Internal services
import { productService } from '../../../services/product.service';
import { inventoryService } from '../../../services/inventory.service';

// Store dependencies
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectInventoryItems } from '../../../store/slices/inventorySlice';

// Shared components
import { DataTable } from '../../../components/DataTable';

// Types
import type { Product } from '../../../types/product';

// Relative imports
import { InventoryToolbar } from './InventoryToolbar';
```

## Code Structure Patterns

### Page Component Organization
```typescript
// 1. Imports (following import order above)
// 2. Type definitions (props, local interfaces)
// 3. Main component function
// 4. Custom hooks and local state
// 5. Effect hooks and lifecycle methods
// 6. Event handlers and business logic
// 7. Render logic with JSX
// 8. Default export
```

### Service Class Organization
```typescript
// 1. Imports and dependencies
// 2. Class definition extending FirebaseService
// 3. Constructor and initialization
// 4. Public API methods (CRUD operations)
// 5. Private helper methods
// 6. Error handling utilities
// 7. Type guards and validation methods
```

### Feature Module Organization
```
pages/[feature]/
├── [Feature]Page.tsx           # Main page component
├── components/                 # Feature-specific components
│   ├── [Component].tsx         # Individual components
│   ├── __tests__/              # Component tests
│   │   └── [Component].test.tsx
│   └── index.ts                # Barrel exports
├── services/                   # Feature-specific services (if needed)
├── __tests__/                  # Page-level tests
│   └── [Feature]Page.test.tsx
└── index.ts                    # Page barrel export
```

## Code Organization Principles

1. **Feature-First Structure**: Pages organized by business domain/feature rather than technical layer
2. **Colocation**: Tests, components, and utilities close to their usage point
3. **Barrel Exports**: Use index.ts files to create clean import paths and public APIs
4. **Service Layer Separation**: Business logic isolated in services, not mixed with UI components
5. **Type Safety**: Comprehensive TypeScript coverage with domain-specific type definitions

## Module Boundaries

### Core Architecture Layers
- **Presentation Layer**: Pages and components handle UI logic only
- **Service Layer**: Business logic, Firebase integration, and data transformation
- **State Management**: Redux store manages application state and cross-component communication
- **Type Layer**: Shared TypeScript definitions ensure type safety across layers

### Dependency Direction
```
Pages → Components → Services → Firebase
  ↓         ↓           ↓
Store ← Middleware ← Actions
  ↓
Types (shared by all layers)
```

### Boundary Rules
- **Pages cannot import from other pages**: Use shared components or services instead
- **Components are pure**: No direct Firebase calls, use services through props or context
- **Services are stateless**: Business logic without UI dependencies
- **Store is domain-focused**: Slices organized by business domain (inventory, products, orders)

## Code Size Guidelines

### File Size Limits
- **Components**: Maximum 300 lines (prefer composition over large components)
- **Services**: Maximum 400 lines (split into domain-specific services)
- **Pages**: Maximum 200 lines (extract complex logic to custom hooks or components)
- **Utility functions**: Maximum 50 lines per function

### Function Complexity
- **Component functions**: Maximum 150 lines (extract custom hooks for complex logic)
- **Service methods**: Maximum 100 lines (break into smaller, focused methods)
- **Event handlers**: Maximum 30 lines (extract business logic to services)
- **Nesting depth**: Maximum 4 levels (use early returns and guard clauses)

## Testing Structure

### Test Organization
- **Unit tests**: Colocated with source files in `__tests__/` directories
- **Integration tests**: Cross-service interactions in `src/__tests__/`
- **Performance tests**: Large-scale operations in `src/__tests__/performance/`
- **Test utilities**: Shared test setup in `src/__tests__/setup/`

### Test Naming Convention
```typescript
describe('[ComponentName/ServiceName]', () => {
  describe('[methodName/functionality]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});
```

### Test Categories
- **Critical tests**: Core business logic, data integrity (jest.critical.config.cjs)
- **Smoke tests**: Basic functionality verification (jest.smoke.config.cjs)
- **Full test suite**: Comprehensive coverage (jest.config.cjs)

## Component Architecture

### Shared Components Structure
```
components/[ComponentName]/
├── [ComponentName].tsx         # Main component implementation
├── __tests__/                  # Component-specific tests
│   └── [ComponentName].test.tsx
├── index.ts                    # Export definitions
└── types.ts                    # Component-specific types (if complex)
```

### Component Design Patterns
- **Composition over inheritance**: Build complex UIs from simple, reusable components
- **Props interface design**: Clear, typed interfaces with optional props having defaults
- **Custom hooks**: Extract stateful logic for reusability across components
- **Error boundaries**: Graceful error handling for PDF processing and data operations

## Service Architecture

### Service Inheritance Pattern
```typescript
// Base service with common Firebase operations
export class FirebaseService {
  protected db: Firestore;
  protected handleError(error: unknown): never;
  protected validateData(data: DocumentData): void;
}

// Domain-specific services extending base functionality
export class ProductService extends FirebaseService {
  async createProduct(product: ProductInput): Promise<Product>;
  async updateInventory(productId: string, quantity: number): Promise<void>;
}
```

### Service Responsibilities
- **Data transformation**: Convert between Firebase documents and application types
- **Business logic**: Cost calculations, inventory updates, PDF processing
- **Error handling**: Consistent error management across the application
- **Validation**: Input validation before Firebase operations

## Documentation Standards

### Code Documentation
- **Public APIs**: JSDoc comments for all exported functions and classes
- **Complex algorithms**: Inline comments explaining PDF parsing and cost calculations
- **Business rules**: Clear comments for domain-specific logic (cost inheritance, category rules)
- **Type definitions**: Comprehensive TypeScript interfaces with descriptions

### Module Documentation
- **Feature READMEs**: Each major feature directory includes implementation notes
- **Service documentation**: Public method signatures and usage examples
- **Component stories**: Usage examples for complex shared components
- **Migration guides**: Documentation for database schema changes and data migrations