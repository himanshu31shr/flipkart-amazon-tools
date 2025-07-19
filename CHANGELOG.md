# Changelog

## 7.0.0

### Major Changes

- [#26](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/26) [`0b089c1`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/0b089c1f458e9d388866101a00dd15a302e1608e) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Added order analytics page to have historical data

## 6.1.1

### Patch Changes

- [#24](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/24) [`abfbf85`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/abfbf85ed26e886cc8cb924e83daa08861f6d425) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Fixed stotage management not able to show files

## 6.1.0

### Minor Changes

- [#22](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/22) [`5aa96c8`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/5aa96c8a4b0d3eca2df879dc3cd122f3d3b36027) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Updated generated pdf files to be visible to all the users

## 6.0.6

### Patch Changes

- [#20](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/20) [`a2d8a8e`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/a2d8a8e4e8bd30fd1cc376c792fc825f2ba5a528) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Added comprehensive category data export/import functionality with CSV support, real-time validation, batch processing, and automatic UI refresh. Enables complete category backup and migration while preserving all data relationships and providing seamless user experience.

## 6.0.5

### Patch Changes

- [#18](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/18) [`d0e3d2a`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/d0e3d2a6cb52e3cb58b3a726ede03b3d07825df6) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - Fix PDF display showing incorrect date when date selection changes

  Resolved issue where the TodaysFilesWidget was hardcoded to show current date files instead of respecting the selected date. PDF files now display consistently with the selected date in the Today's Orders page.

  This fix ensures users see the correct PDF files when they select different dates, eliminating confusion between order data and file display.

## 6.0.4

### Patch Changes

- [#16](https://github.com/himanshu31shr/flipkart-amazon-tools/pull/16) [`85eb1bf`](https://github.com/himanshu31shr/flipkart-amazon-tools/commit/85eb1bfbff2fd77ff82cf6c41c054706e3f055d1) Thanks [@himanshu31shr](https://github.com/himanshu31shr)! - testing

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
