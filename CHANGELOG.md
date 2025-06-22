# Changelog

## 6.0.3

### Patch Changes

- [#13](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/13) [`0bd9389`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/0bd938938cf54d7cc508b22c2a78a3965ab2be6c) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Test deployment

## 6.0.2

### Patch Changes

- [#10](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/10) [`63ddc60`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/63ddc60a27df6902e143947d077b0397cac87185) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Test deployment

## 6.0.1

### Patch Changes

- [`35ff714`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/35ff714322ec2d67bd008032528402ffdc706520) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Test deployment

## 6.0.0

### Major Changes

- [#4](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/4) [`cf3095f`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/cf3095f2c19a38cf8f21f2a100f2b1b7ede20a20) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Integrated infra tools and changeset rules

## [1.0.0] - 2024-06-15

### Added

- Cost price inheritance system for products and categories
- CostPriceResolutionService to handle cost price resolution logic
- Migration script for updating existing data to use the new cost price system
- Production build script that bypasses TypeScript errors
- Comprehensive README with deployment instructions
- Script to serve production build locally for testing

### Fixed

- Fixed seed-emulator.js to properly handle active orders seeding
- Fixed DataTable tests to work with the new MobileDataRow implementation
- Fixed DOM nesting warnings by rewriting MobileDataRow to use Paper/Box instead of TableRow/TableCell
- Fixed ESLint configuration to properly ignore dist directory and generated files
- Fixed unescaped entities in MobileFilters components
- Fixed TypeScript errors in DataTable and MobileDataRow components
- Updated tests to match the new component implementations
- Updated CategoryWithInventory interface to include costPrice field
- Fixed CategoryInventoryService to include costPrice in returned objects
- Updated CategoryList component to handle costPrice correctly
- Fixed ProductTableToolbar to use the new addCategory function signature
- Updated addCategory function in productsSlice.ts to accept a CategoryFormData object

### Changed

- Updated Category interface to make costPrice optional
- Modified build process to create production builds without TypeScript errors
- Updated deployment script to use the production build

### Documentation

- Added README with comprehensive deployment instructions
- Added documentation for the cost price inheritance system
- Created CHANGELOG to track changes

## [0.9.0] - 2024-06-01

### Added

- Transaction analytics repair with cost price inheritance
- CostPriceResolutionService integration with TransactionAnalysisService
- Async price resolution with proper inheritance
- Enhanced UI to display cost price sources
- Fixed Orders tab display by adding analyzedTransactions to TransactionSummary
