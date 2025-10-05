# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flipkart-Amazon Tools** (Sacred Sutra Tools) is a cross-platform e-commerce management application designed for businesses selling on Amazon and Flipkart platforms. Available as a web application and native mobile apps (iOS/Android via Capacitor 6).

### Primary Purpose
- **PDF Invoice Processing**: Automatically parse Amazon and Flipkart order invoices/labels
- **Inventory Management**: Track products with category-based organization and cost inheritance
- **Order Analytics**: Comprehensive sales analysis and profitability tracking
- **Multi-Platform Integration**: Unified dashboard for Amazon and Flipkart operations
- **Mobile App**: Native iOS and Android apps for on-the-go order and inventory management

### Mobile Implementation Status
**Current Progress**: 13 of 66 tasks completed (19.7%)
**Setup Status**: ✅ Complete (using Firebase emulators for development)

- 📄 [MOBILE_IMPLEMENTATION_STATUS.md](MOBILE_IMPLEMENTATION_STATUS.md) - Detailed progress tracking
- 🔧 [EMULATOR_DEVELOPMENT.md](EMULATOR_DEVELOPMENT.md) - **START HERE** - Develop without native Firebase config files
- 📱 [NATIVE_PLATFORM_SETUP.md](NATIVE_PLATFORM_SETUP.md) - Production setup (only needed for App Store deployment)

## Development Commands

### Development Server
- `npm run dev` - Start development server with Firebase emulators and Vite (recommended)
- `npm run dev:vite-only` - Start only Vite dev server
- `npm run dev:emulator` - Start Vite with emulator configuration

### Build & Production  
- `npm run build` - TypeScript compile and production build
- `npm run build:prod` - Production build only
- `npm run preview` - Preview production build locally

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode  
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI (no watch)

### Code Quality
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run lint-full` - Run both type checking and linting

### Firebase Emulators
- `npm run emulator:start` - Start Auth, Firestore, and Storage emulators
- `npm run emulator:ui` - Start emulators with web UI
- `npm run emulator:import` - Start emulators with imported data
- `npm run emulator:export` - Export emulator data
- `npm run seed:emulator` - Seed emulators with test data

### Deployment
- `npm run deploy` - Deploy to GitHub Pages
- `npm run deploy:all` - Deploy all Firebase services

### Mobile App Development (Capacitor)
- `npm run cap:sync` - Sync web build to native iOS/Android projects
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run mobile:dev` - Build web assets and sync to native projects

### Release Management
- `npm run changeset` - Create a changeset for version management
- `npm run version` - Apply changesets and version packages
- `npm run release` - Publish releases

### Testing Requirements

**Task Completion Criteria**
Before marking any task as complete, ensure:

1. **All Tests Pass**
   - Run full test suite: `npm test`
   - Integration tests pass: `npm run test:ci`
   - Coverage report shows ≥80%: `npm run test:coverage`

2. **Code Quality Checks**
   - TypeScript compilation: `npm run type-check`
   - ESLint validation: `npm run lint`
   - Full quality check: `npm run lint-full`

3. **Test Coverage Requirements**
   - Unit tests for all business logic
   - Component tests for UI elements
   - Integration tests for PDF processing
   - Edge cases and error conditions covered
   - Async operations properly tested

4. **Testing Guidelines**
   - No skipped or pending tests
   - Clear test descriptions
   - Both positive and negative cases included
   - Performance tests for large operations
   - All Firebase emulator tests passing

## Architecture Overview

### Core Technologies
- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Mobile**: Capacitor 6 for native iOS/Android apps (hybrid architecture)
- **State Management**: Redux Toolkit with Redux Persist
- **Backend**: Firebase (Auth, Firestore, Storage) with Capacitor plugins on mobile
- **PDF Processing**: PDF-lib, PDFjs-dist for Amazon/Flipkart invoice parsing
- **Testing**: Jest + React Testing Library + Playwright (E2E)
- **Build Tools**: Vite, TypeScript, ESLint, Xcode (iOS), Android Studio (Android)

### Core Features & Pages

**Main Application Flow**:
- **Home Page (`/`)**: PDF upload and merge functionality for Amazon/Flipkart invoices
- **Dashboard (`/dashboard`)**: Inventory alerts, low stock warnings, and key metrics
- **Products (`/products`)**: Product catalog management with SKU tracking
- **Categories (`/categories`)**: Category management with cost price inheritance
- **Today's Orders (`/todays-orders`)**: Current day order processing and tracking
- **Order Analytics (`/order-analytics`)**: Historical sales data and profitability analysis
- **Inventory Management (`/inventory`)**: Stock tracking and management
- **Storage Management**: PDF file storage and organization

### PDF Processing Architecture

**Amazon Invoice Processing**:
- `TrasformAmazonPages.ts` - Processes Amazon order labels and data pages
- Odd pages contain shipping labels (for final PDF)
- Even pages contain order data (for inventory tracking)
- Extracts: Product names, quantities, SKUs, order numbers

**Flipkart Invoice Processing**:
- `TrasformFlipkartPages.ts` - Processes Flipkart order documents  
- Extracts similar product data with different parsing logic
- Handles Flipkart-specific PDF structure and format

**PDF Consolidation**:
- `pdfConsolidation.service.ts` - Merges multiple files before processing
- Category-based sorting and organization
- Automatic storage with configurable retention

### Project Structure

```
src/
├── pages/
│   ├── home/                    # PDF upload and processing
│   │   ├── services/           # Amazon/Flipkart transformers
│   │   └── components/         # Upload UI, PDF viewer
│   ├── dashboard/              # Main dashboard with widgets
│   ├── products/               # Product management
│   ├── categories/             # Category management  
│   ├── todaysOrders/          # Current orders processing
│   ├── orderAnalytics/        # Sales analytics and reports
│   ├── inventory/             # Stock management
│   └── storage-management/    # File storage interface
├── services/                   # Business logic services
├── store/                      # Redux state management
└── types/                      # TypeScript definitions
```

### Key Services Architecture

**E-commerce Integration Services**:
- `product.service.ts` - Product catalog and SKU management
- `category.service.ts` - Category management with cost inheritance
- `transaction.service.ts` - Order processing and tracking
- `costPrice.service.ts` - Profitability calculations

**PDF Processing Services**:
- `pdfConsolidation.service.ts` - Multi-file PDF merging
- `pdfStorageService.ts` - Organized storage with metadata
- Platform-specific transformers for Amazon and Flipkart

**Analytics Services**:
- `transactionAnalysis.service.ts` - Sales performance analysis
- `allOrdersForAnalytics.service.ts` - Historical data aggregation

### State Management (Redux)

**Key Slices**:
- `pdfMergerSlice` - PDF upload and processing state  
- `productsSlice` - Product inventory management
- `categoriesSlice` - Category and cost price management
- `transactionsSlice` - Order processing data
- `orderAnalyticsSlice` - Sales analytics and reports
- `ordersSlice` - Today's orders tracking

### Business Logic Features

**Cost Price Inheritance System**:
- Products inherit cost prices from categories when not set
- `CostPriceResolutionService` handles resolution logic
- Enables accurate profit/margin calculations

**Category-Based Organization**:
- Hierarchical product categorization
- Automatic PDF sorting by category
- Category-level inventory thresholds and alerts

**Multi-Platform Support**:
- Unified processing for Amazon and Flipkart orders
- Platform-specific data extraction and formatting
- Consolidated analytics across platforms

### Firebase Setup

**Emulator Configuration** (Development):
- **Auth Emulator**: Port 9099
- **Firestore Emulator**: Port 8080
- **Storage Emulator**: Port 9199
- **Emulator UI**: Port 4000

Environment variables are automatically set when using `npm run dev`.

### Key Development Rules

**TDD Approach**: Follow strict Test-Driven Development as defined in `.cursor/rules/tdd-rules.mdc`:
- Always write failing tests first
- Follow Red-Green-Refactor cycle
- Use Jest testing framework

**Changeset Management**: Use comprehensive changeset workflow per `.cursor/rules/changeset-generation.mdc`:
- Create changesets for all user-facing changes
- Follow semantic versioning (major/minor/patch)
- Include clear descriptions and migration guides

### Environment Configuration

Create `.env.local` with Firebase configuration:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### Migration Commands

- `npm run migrate:cost-price` - Migrate to cost price inheritance system
- `npm run migrate:cost-price:rollback` - Rollback cost price migration

## Mobile App Architecture

### Capacitor Hybrid Approach
Sacred Sutra Tools is available as a **native mobile application** for iOS and Android using Capacitor's hybrid architecture:
- **Native Container**: iOS (WKWebView) and Android (Chrome WebView) native shells
- **Web Content**: Existing React app runs inside native WebView with 95%+ code reuse
- **Native Plugins**: @capacitor-firebase/* plugins provide native Firebase SDK access
- **Platform Detection**: Mobile-specific UI components render when `isMobile` is true

### Mobile-Specific Features
**First Release (MVP)**:
- **Active Orders Page**: Mobile-optimized order cards, barcode scanning, pull-to-refresh
- **Products Page**: Search, infinite scroll, mobile card layouts, product details modal
- **Categories Pages**: Category/group management with mobile-friendly forms

**Mobile Navigation**:
- Bottom navigation tabs (Orders, Products, Categories)
- Hardware back button support (Android)
- Safe area handling for notched devices (iOS)

**Mobile Components Pattern**:
```
src/pages/[feature]/
├── [Feature]Page.tsx          # Detects mobile, renders appropriate version
├── mobile/                    # Mobile-specific components
│   ├── Mobile[Feature]Page.tsx
│   └── components/
└── components/                # Shared desktop components
```

**Responsive Detection**:
- Use `useMediaQuery(theme.breakpoints.down('sm'))` for viewport detection
- Use `Capacitor.isNativePlatform()` for native app detection
- Mobile breakpoint: 600px (Material-UI 'sm')

### Mobile Development Workflow
1. **Web Development**: Standard `npm run dev` with hot reload
2. **Mobile Development**:
   - Build: `npm run build`
   - Sync: `npm run cap:sync`
   - Open native IDE: `npm run cap:open:ios` or `npm run cap:open:android`
3. **Live Reload**: Configure `server.url` in capacitor.config.ts for instant updates on device

### Mobile Testing Requirements
- **Unit Tests**: Mobile components with viewport simulation (80% coverage)
- **Integration Tests**: Page flows with Redux/Firebase mocks
- **Responsive Tests**: Verify rendering at 320px, 375px, 428px viewports
- **E2E Tests**: Playwright with mobile device emulation (iPhone, Android)
- **Device Testing**: Minimum 3 physical devices per platform (low/mid/high-end)

### Firebase on Mobile
- **@capacitor-firebase/authentication**: Native Firebase Auth for iOS/Android
- **@capacitor-firebase/firestore**: Native Firestore with offline persistence
- **@capacitor-firebase/storage**: Native Cloud Storage for PDF files
- API compatibility maintained with web SDK (same method signatures in services)

### Mobile Build Configuration
- **iOS**: Xcode project in `ios/`, requires macOS, iOS 13+ deployment target
- **Android**: Gradle project in `android/`, minSdkVersion 24 (Android 7.0+)
- **App Icons**: 1024x1024 source, adaptive icons for Android
- **Splash Screens**: Brand colors (#2196f3 blue), platform-specific sizes

### Platform-Specific Considerations
- **iOS**: Safe areas (notch/home indicator), WKWebView, App Store guidelines
- **Android**: Back button handling, status bar color, Play Store requirements
- **Offline**: Queue mutations when offline, sync when connectivity restored
- **Permissions**: Camera (barcode scanning), storage (file access) with clear descriptions

## Important Implementation Notes

**PDF Processing Patterns**:
- Amazon PDFs: Odd pages = labels, Even pages = data
- Flipkart PDFs: Different structure requiring specialized parsing
- Always validate page existence before processing
- Use unique page tracking to prevent duplicates

**Error Handling**:
- Graceful degradation for PDF parsing errors
- Comprehensive logging for debugging invoice processing
- Fallback mechanisms for failed transformations

**Performance Considerations**:
- Large PDF files require memory management
- Progress tracking for multi-file operations  
- Background processing for bulk operations

- Whenever is include spec, check if spec mcp server can be used here.