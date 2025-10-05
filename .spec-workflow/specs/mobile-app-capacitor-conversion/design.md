# Design Document

## Overview

This design specifies the technical architecture for converting the Sacred Sutra Tools web application into a native mobile application using Capacitor 6. The conversion will maintain maximum code reuse (95%+) by wrapping the existing React + Material-UI web app in Capacitor's native container, while creating mobile-optimized component variants for enhanced mobile UX.

The architecture leverages Capacitor's web-to-native bridge to run the existing codebase on iOS and Android devices, with minimal modifications required to the core business logic, state management, or Firebase integration. The primary changes focus on: (1) adding Capacitor configuration and native projects, (2) integrating @capacitor-firebase plugins, (3) creating mobile-responsive UI variants, and (4) implementing mobile-specific navigation patterns.

## Steering Document Alignment

### Technical Standards (tech.md)

**Component-Based Architecture**: The mobile conversion maintains the existing React 18 + Material-UI architecture, adding mobile-specific component variants within the established feature-based structure (e.g., `pages/todaysOrders/mobile/` subdirectories).

**State Management**: Redux Toolkit slices remain unchanged, as Capacitor runs the same JavaScript runtime. Redux Persist will work identically on mobile for offline state persistence.

**Firebase Integration**: Existing Firebase 11.6.1 services (Auth, Firestore, Storage) will be replaced with @capacitor-firebase/* plugins for native mobile integration, maintaining API compatibility with the web SDK to minimize code changes.

**Build System**: Vite configuration remains the primary build tool, with additional Capacitor CLI commands (`npx cap sync`, `npx cap open`) for native project synchronization. Existing code splitting and lazy loading strategies continue to work in the mobile WebView.

**Code Quality**: All existing TypeScript strict mode, ESLint rules, and Jest testing frameworks continue to apply. Mobile-specific components follow the same testing standards (80% coverage, React Testing Library).

### Project Structure (structure.md)

**Feature-First Organization**: Mobile components will follow the existing page-based structure:

```
src/pages/[feature]/
├── [Feature]Page.tsx          # Existing desktop/responsive page
├── mobile/                    # NEW: Mobile-specific components
│   ├── Mobile[Feature]Page.tsx
│   ├── components/
│   │   └── [MobileComponent].tsx
│   └── __tests__/
│       └── [MobileComponent].test.tsx
```

**Service Layer Separation**: Existing services (product.service.ts, inventory.service.ts) remain untouched. Firebase service will have minimal updates to integrate Capacitor plugins while maintaining the same public API.

**Module Boundaries**: Mobile components import from existing services and store slices, maintaining the established dependency direction: `Pages → Components → Services → Firebase`.

**Testing Structure**: Mobile components will have colocated tests in `__tests__/` directories following the existing `[ComponentName].test.tsx` naming convention.

## Code Reuse Analysis

### Existing Components to Leverage

- **DataTable Component**: Already has mobile-responsive logic with `useMediaQuery`, `MobileDataRow`, and `MobileFilters` components. Will serve as the pattern for other mobile component conversions.
- **InventoryStatusChip**: Reusable as-is with potential sizing adjustments for mobile touch targets.
- **FormattedCurrency**: Works on mobile without changes; may add responsive font sizing.
- **ErrorBoundary**: Reusable for mobile error handling and crash prevention.
- **ProtectedRoute**: Existing authentication flow works identically on mobile with Capacitor Firebase Auth plugin.

### Existing Services to Reuse

- **FirebaseService Base Class**: 95% reusable. Only needs @capacitor-firebase plugin imports instead of web SDK. Offline persistence logic (`enableIndexedDbPersistence`) already implemented.
- **ProductService, CategoryService, InventoryService**: 100% reusable. All business logic, CRUD operations, and data transformations work identically.
- **TodaysOrder, BatchService, BarcodeService**: Full reuse. Barcode scanning will use Capacitor camera API but service interfaces remain unchanged.
- **TransactionAnalysis, CostPriceResolution**: Pure business logic services with zero mobile-specific changes required.

### Integration Points

- **Redux Store**: All existing slices (ordersSlice, productsSlice, categoriesSlice) work without modification. Redux Persist configuration may need Capacitor-specific storage adapter.
- **Firebase Firestore**: Replace `firebase/firestore` imports with `@capacitor-firebase/firestore` in firebase.service.ts. Maintain existing query patterns and real-time listeners.
- **Firebase Authentication**: Replace `firebase/auth` with `@capacitor-firebase/authentication`. Existing auth state management in authSlice works identically.
- **Firebase Storage**: Replace `firebase/storage` with `@capacitor-firebase/storage` for PDF file storage operations.
- **React Router**: Existing routing structure works in mobile WebView. May add Capacitor App plugin for hardware back button handling on Android.

## Architecture

### System Architecture

The mobile app uses Capacitor's **hybrid architecture** where a native container (iOS/Android) hosts a WebView running the React application:

```mermaid
graph TB
    subgraph "Native Layer"
        iOS[iOS Native Container]
        Android[Android Native Container]
        CapBridge[Capacitor Bridge]
    end

    subgraph "Web Layer"
        WebView[WebView - WKWebView/Chrome]
        ReactApp[React Application]
        Redux[Redux Store]
    end

    subgraph "Services Layer"
        FirebasePlugins[@capacitor-firebase Plugins]
        CapPlugins[Capacitor Core Plugins]
        BusinessLogic[Existing Services]
    end

    subgraph "Backend"
        Firebase[Firebase Backend]
    end

    iOS --> CapBridge
    Android --> CapBridge
    CapBridge --> WebView
    WebView --> ReactApp
    ReactApp --> Redux
    ReactApp --> BusinessLogic
    BusinessLogic --> FirebasePlugins
    BusinessLogic --> CapPlugins
    FirebasePlugins --> Firebase
```

### Modular Design Principles

- **Single File Responsibility**: Mobile component variants (e.g., `MobileOrdersPage.tsx`) handle only mobile UI layout, delegating to existing components for data display and existing services for business logic.
- **Component Isolation**: Mobile components are isolated in `/mobile` subdirectories, avoiding pollution of existing web components. Responsive detection logic (`useMediaQuery`) determines which variant to render.
- **Service Layer Separation**: Zero changes to service layer business logic. Only Firebase SDK imports change from web to Capacitor plugins.
- **Utility Modularity**: Existing utilities (date formatting, validation, calculations) remain unchanged and work identically on mobile.

### Responsive Component Pattern

The application will use a **conditional rendering pattern** based on device detection:

```typescript
// Pattern used in page components
const MyFeaturePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileMyFeaturePage />;
  }

  return <DesktopMyFeaturePage />;
};
```

This pattern:
- Maintains single entry point per feature (existing page file)
- Allows mobile and desktop components to evolve independently
- Enables code splitting (mobile components only load on mobile devices)
- Follows existing DataTable component pattern

## Components and Interfaces

### Component 1: Capacitor Configuration

- **Purpose:** Configure Capacitor for iOS and Android platforms with Firebase plugin integration
- **Files:**
  - `capacitor.config.ts` - Main Capacitor configuration
  - `android/` - Android Studio project (auto-generated)
  - `ios/` - Xcode project (auto-generated)
- **Interfaces:**
  - `CapacitorConfig` - Platform settings, plugins, server URL
  - Native build configurations (build.gradle, Podfile)
- **Dependencies:** @capacitor/core, @capacitor/cli, @capacitor-firebase/*
- **Reuses:** Existing build output from Vite (`dist/` directory)

### Component 2: Firebase Plugin Integration

- **Purpose:** Replace web Firebase SDK with Capacitor Firebase plugins for native mobile integration
- **Files:**
  - `src/services/firebase.service.ts` (modified imports)
  - `src/services/firebase.config.ts` (plugin initialization)
- **Interfaces:**
  - Existing service interfaces remain unchanged
  - Internal implementation uses @capacitor-firebase APIs
- **Dependencies:** @capacitor-firebase/authentication, @capacitor-firebase/firestore, @capacitor-firebase/storage
- **Reuses:**
  - Existing FirebaseService base class error handling
  - Existing offline persistence logic
  - All service classes (ProductService, CategoryService, etc.)

### Component 3: Mobile Navigation System

- **Purpose:** Provide mobile-appropriate navigation with bottom tabs and hardware back button support
- **Files:**
  - `src/navigation/MobileBottomNav.tsx` (NEW)
  - `src/navigation/MobileAppShell.tsx` (NEW)
  - `src/App.tsx` (modified for mobile detection)
- **Interfaces:**
  - `MobileNavConfig` - Bottom tab configuration (labels, icons, routes)
  - Hardware back button event handler
- **Dependencies:** Material-UI BottomNavigation, @capacitor/app (for back button)
- **Reuses:**
  - Existing React Router routes and lazy loading
  - Existing ProtectedRoute authentication logic
  - Material-UI icon components

### Component 4: Mobile DataTable (Pattern Component)

- **Purpose:** Provide mobile-optimized table display with card layouts and swipe actions
- **Files:**
  - `src/components/DataTable/DataTable.tsx` (already mobile-aware)
  - `src/components/DataTable/MobileDataRow.tsx` (exists, may enhance)
  - `src/components/DataTable/MobileFilters.tsx` (exists, may enhance)
- **Interfaces:**
  - Existing `DataTableProps<T>` interface unchanged
  - `MobileDataRowProps` for card display
  - `MobileFiltersProps` for bottom sheet filters
- **Dependencies:** Material-UI responsive hooks (useMediaQuery, useTheme)
- **Reuses:**
  - Existing DataTable sorting, filtering, and pagination logic
  - Existing column configuration and formatters

### Component 5: Mobile Orders Page

- **Purpose:** Display and manage today's orders with mobile-optimized layout
- **Files:**
  - `src/pages/todaysOrders/mobile/MobileTodaysOrdersPage.tsx` (NEW)
  - `src/pages/todaysOrders/mobile/components/MobileOrderCard.tsx` (NEW)
  - `src/pages/todaysOrders/mobile/components/MobileOrderFilters.tsx` (NEW)
- **Interfaces:**
  - Uses existing `ActiveOrder` type from ordersSlice
  - `MobileOrderCardProps` for card display
- **Dependencies:** Material-UI Card, Chip, SwipeableDrawer
- **Reuses:**
  - Existing ordersSlice Redux state and actions
  - Existing order service methods
  - Existing barcode scanning components (adapt for mobile camera)
  - Existing date picker (replace with MobileDatePicker)

### Component 6: Mobile Products Page

- **Purpose:** Display product catalog with mobile-optimized search and filters
- **Files:**
  - `src/pages/products/mobile/MobileProductsPage.tsx` (NEW)
  - `src/pages/products/mobile/components/MobileProductCard.tsx` (NEW)
  - `src/pages/products/mobile/components/MobileProductSearch.tsx` (NEW)
- **Interfaces:**
  - Uses existing `Product` and `ProductWithCategoryGroup` types
  - `MobileProductCardProps` for card display
- **Dependencies:** Material-UI Card, TextField (search), InfiniteScroll or virtual scrolling
- **Reuses:**
  - Existing productsSlice state management
  - Existing ProductService CRUD operations
  - Existing InventoryStatusChip component

### Component 7: Mobile Categories Pages

- **Purpose:** Manage categories and category groups with mobile-friendly forms
- **Files:**
  - `src/pages/categories/mobile/MobileCategoriesPage.tsx` (NEW)
  - `src/pages/categoryGroups/mobile/MobileCategoryGroupsPage.tsx` (NEW)
  - `src/pages/categories/mobile/components/MobileCategoryForm.tsx` (NEW)
- **Interfaces:**
  - Uses existing `Category` and `CategoryGroup` types
  - `MobileCategoryFormProps` for mobile form inputs
- **Dependencies:** Material-UI mobile-optimized form components
- **Reuses:**
  - Existing categoriesSlice and categoryGroupsSlice
  - Existing CategoryService and CategoryGroupService
  - Existing category validation logic

## Data Models

All existing data models remain unchanged. The mobile app uses identical TypeScript interfaces and types:

### Existing Models (No Changes)

```typescript
// From types/inventory.ts
interface InventoryLevel {
  categoryGroupId: string;
  currentStock: number;
  minimumThreshold: number;
  status: InventoryStatus; // 'healthy' | 'low_stock' | 'zero_stock' | 'negative_stock'
}

// From services/product.service.ts
interface Product {
  sku: string;
  name: string;
  platform: 'amazon' | 'flipkart';
  categoryId?: string;
  categoryGroupId?: string;
  costPrice?: number;
  // ... existing fields
}

// From services/todaysOrder.service.ts
interface ActiveOrder {
  name: string;
  SKU?: string;
  quantity: number;
  type: 'amazon' | 'flipkart';
  batchInfo?: BatchInfo;
  isCompleted?: boolean;
  completedAt?: string;
  // ... existing fields
}

// From types/category.ts
interface Category {
  id?: string;
  name: string;
  description?: string;
  costPrice?: number;
  inventoryDeductionQuantity?: number;
  categoryGroupId?: string;
}
```

### New Mobile-Specific Models

```typescript
// src/types/mobile.ts (NEW)
interface MobileNavigationConfig {
  tabs: MobileTab[];
  defaultTab: string;
}

interface MobileTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  badge?: number; // For notification badges
}

interface MobileViewportConfig {
  breakpoint: 'xs' | 'sm' | 'md';
  cardWidth: string;
  spacing: number;
  touchTargetSize: number; // Minimum 44px per iOS HIG
}

interface OfflineQueueItem {
  id: string;
  type: 'order_update' | 'product_update' | 'category_update';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}
```

## Error Handling

### Error Scenarios

#### 1. Capacitor Plugin Initialization Failure
- **Scenario:** @capacitor-firebase plugins fail to initialize on app startup
- **Handling:**
  - Log error to console with plugin name and error details
  - Show user-friendly alert: "Unable to connect to backend services. Please restart the app."
  - Provide retry button that re-attempts initialization
  - Fall back to offline mode if retry fails (show cached data only)
- **User Impact:** User sees alert banner, can retry or continue with limited offline functionality
- **Implementation:** Wrap plugin initialization in try-catch blocks in firebase.config.ts

#### 2. Network Connectivity Loss During Operation
- **Scenario:** Network disconnects while user is browsing orders/products
- **Handling:**
  - Redux middleware detects failed Firebase operations
  - Queue mutations in IndexedDB offline queue
  - Display offline indicator in app bar (cloud-off icon)
  - Continue showing cached data from Firestore offline persistence
  - Auto-retry when connectivity restored (exponential backoff: 1s, 2s, 4s, 8s)
- **User Impact:** Seamless offline experience; user can continue viewing data
- **Implementation:** Enhance existing FirebaseService error handling with offline queue

#### 3. Camera Permission Denied (Barcode Scanning)
- **Scenario:** User denies camera permission when trying to scan barcode
- **Handling:**
  - Catch permission denial error from @capacitor/camera
  - Show dialog: "Camera access required for barcode scanning"
  - Provide "Open Settings" button using Capacitor App plugin to deep link to app settings
  - Offer manual order lookup as fallback (search by product name/SKU)
- **User Impact:** Clear explanation why feature unavailable; alternative workflow provided
- **Implementation:** Permission request wrapper in barcode scanner component

#### 4. Firebase Storage Quota Exceeded (PDF Uploads)
- **Scenario:** User attempts to upload PDF but Firebase Storage quota is full
- **Handling:**
  - Catch `storage/quota-exceeded` error
  - Show error message: "Storage limit reached. Please contact support or delete old files."
  - Navigate user to Storage Management page to review and delete files
  - Log error with user ID and timestamp for admin monitoring
- **User Impact:** Clear actionable error; ability to free up space
- **Implementation:** Enhance existing pdfStorageService error handling

#### 5. Invalid Firestore Data Structure
- **Scenario:** Backend data doesn't match expected TypeScript interfaces (schema mismatch)
- **Handling:**
  - Existing validateFirestoreData in FirebaseService catches type mismatches
  - Log detailed error with collection, document ID, and invalid fields
  - Skip invalid document and continue processing valid ones
  - Show warning notification: "Some data could not be loaded. Contact support if issue persists."
  - Report error to monitoring service for investigation
- **User Impact:** Partial data displayed; issue doesn't block entire page
- **Implementation:** Extend existing FirebaseService validation

#### 6. App Background State / Memory Pressure
- **Scenario:** iOS/Android kills app in background due to memory pressure
- **Handling:**
  - Use @capacitor/app plugin to detect background/foreground transitions
  - Persist critical Redux state (current filters, selected date) before backgrounding
  - On foreground, restore state and refresh data if stale (>5 minutes)
  - Clear large data caches when memory warnings received
- **User Impact:** App resumes where user left off; fresh data on return
- **Implementation:** App lifecycle listeners in App.tsx, Redux Persist configuration

#### 7. TypeScript/ESLint Errors During Build
- **Scenario:** Developer introduces type error or lint violation
- **Handling:**
  - Pre-commit hooks (Husky) block commit with failed `npm run lint-full`
  - CI pipeline fails build with detailed error messages
  - Developer must fix errors before merge
  - Production builds (`npm run build`) fail fast on type/lint errors
- **User Impact:** Users never see broken code; quality enforced automatically
- **Implementation:** Existing Husky configuration, CI pipeline setup

## Testing Strategy

### Unit Testing

**Approach:** Test mobile components in isolation using React Testing Library with mobile viewport simulation.

**Key Components to Test:**
- **MobileOrderCard**: Render with different order states (pending, completed, low stock), verify touch interactions, test swipe actions
- **MobileProductCard**: Render with inventory status badges, test tap to details modal, verify accessibility labels
- **MobileFilters**: Test bottom sheet open/close, filter selection, apply/clear actions
- **MobileBottomNav**: Test tab switching, active tab highlighting, badge display
- **Mobile DatePicker**: Test date selection, today shortcut, date range constraints

**Test Patterns:**
```typescript
// Example mobile component test with viewport simulation
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileOrderCard } from './MobileOrderCard';

describe('MobileOrderCard', () => {
  beforeEach(() => {
    // Simulate mobile viewport
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 600px)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  });

  it('should render order details in card layout', () => {
    const order = { name: 'Test Product', SKU: 'TEST-123', quantity: 2 };
    render(<MobileOrderCard order={order} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('SKU: TEST-123')).toBeInTheDocument();
  });

  it('should call onComplete when complete button tapped', () => {
    const onComplete = jest.fn();
    render(<MobileOrderCard order={mockOrder} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    expect(onComplete).toHaveBeenCalledWith(mockOrder);
  });
});
```

**Coverage Requirements:**
- Minimum 80% coverage for all new mobile components
- 100% coverage for critical paths (order completion, product search, category management)
- Snapshot tests for complex mobile layouts to detect unintended changes

### Integration Testing

**Approach:** Test multi-component interactions and Redux state integration with Firebase service mocks.

**Key Flows to Test:**

1. **Order Management Flow**:
   - Load orders page → apply filters → scan barcode → mark order complete → verify Redux state update → verify Firebase mutation queued

2. **Product Search Flow**:
   - Open products page → enter search term → verify filtered results → tap product card → verify details modal → check inventory status display

3. **Category Management Flow**:
   - Load categories → create new category → verify form validation → submit → verify Redux state update → verify Firestore write

4. **Offline Synchronization Flow**:
   - Load orders while online → go offline → mark order complete → verify queued in offline queue → go online → verify sync to Firebase

**Test Pattern:**
```typescript
// Integration test with Redux and Firebase mocks
import { renderWithProviders } from '../../test/test-utils';
import { MobileTodaysOrdersPage } from './MobileTodaysOrdersPage';

describe('MobileTodaysOrdersPage Integration', () => {
  it('should filter orders and update state correctly', async () => {
    const { store } = renderWithProviders(<MobileTodaysOrdersPage />);

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getByText(/10 orders/i)).toBeInTheDocument();
    });

    // Apply platform filter
    fireEvent.click(screen.getByText('Amazon'));

    // Verify Redux state updated
    const state = store.getState();
    expect(state.orders.platformFilter).toBe('amazon');

    // Verify filtered results displayed
    expect(screen.getByText(/5 orders/i)).toBeInTheDocument();
  });
});
```

### End-to-End Testing

**Approach:** Test complete user scenarios on actual mobile devices using Capacitor's dev server and physical device testing.

**User Scenarios to Test:**

1. **Daily Order Processing Scenario**:
   - Launch app → authenticate → navigate to Active Orders → select today's date → apply batch filter → scan barcode to complete order → verify order marked complete → pull to refresh → verify fresh data

2. **Product Lookup Scenario**:
   - Navigate to Products → tap search field → enter product SKU → verify autocomplete suggestions → tap product → view details modal → check inventory level → close modal → verify return to list

3. **Category Setup Scenario**:
   - Navigate to Categories → tap FAB to add category → enter category name → set cost price → link to category group → save → verify category appears in list → verify inventory threshold inherited

4. **Offline Work Scenario**:
   - Load orders while online → enable airplane mode → mark multiple orders complete → navigate between pages → disable airplane mode → verify offline queue processes → verify all changes synced to Firebase

**Device Testing Matrix:**
- **iOS**: iPhone SE (low-end), iPhone 13 (mid-range), iPhone 15 Pro (high-end)
- **Android**: Samsung Galaxy A series (low-end), Google Pixel 6 (mid-range), Samsung S23 (high-end)
- **Viewport Sizes**: 320px (iPhone SE), 375px (iPhone 13), 428px (iPhone 15 Pro Max), 360px (Android standard), 412px (Android large)

**Performance Metrics to Validate:**
- Initial load time <3 seconds on mid-range devices
- List rendering (100 items) <1 second
- Search filtering <200ms
- Navigation transitions <300ms, 60fps
- Memory usage <150MB during normal operation

**Accessibility Testing:**
- VoiceOver (iOS) and TalkBack (Android) navigation of all mobile pages
- Keyboard navigation support (for users with Bluetooth keyboards)
- Color contrast ratios meet WCAG 2.1 AA standards
- Touch target sizes minimum 44x44px
- Focus indicators visible on all interactive elements

### Continuous Integration Testing

**CI Pipeline Requirements:**
- Run `npm run type-check` → must pass with zero errors
- Run `npm run lint` → must pass with zero errors
- Run `npm run test:ci` → all tests must pass
- Run `npm run test:coverage` → verify ≥80% coverage
- Run `npm run build` → production build must succeed
- Build iOS and Android apps with Capacitor CLI → verify no native build errors

**Pre-commit Validation:**
- Husky pre-commit hook runs `npm run lint-full` and `npm run test:related`
- Blocks commit if any checks fail
- Ensures code quality standards maintained

## Technical Implementation Details

### Capacitor Configuration

**capacitor.config.ts:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sacredsutra.tools',
  appName: 'Sacred Sutra Tools',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2196f3', // Material UI primary blue
      showSpinner: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2196f3',
    },
  },
  server: {
    // For development with live reload
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
```

### Firebase Plugin Integration

**Modifications to firebase.config.ts:**
```typescript
// Replace web SDK imports with Capacitor plugins
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseStorage } from '@capacitor-firebase/storage';

// Initialize Firebase with native config (from GoogleService-Info.plist / google-services.json)
export const initializeFirebase = async () => {
  try {
    // Capacitor Firebase plugins auto-initialize from native config files
    await FirebaseAuthentication.init();
    await FirebaseFirestore.init();
    await FirebaseStorage.init();

    console.log('Firebase plugins initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
};
```

### Mobile Navigation Implementation

**src/navigation/MobileBottomNav.tsx:**
```typescript
import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { ShoppingCart, Inventory, Category } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Orders', icon: <ShoppingCart />, path: '/active-orders' },
    { label: 'Products', icon: <Inventory />, path: '/products' },
    { label: 'Categories', icon: <Category />, path: '/categories' },
  ];

  const currentTabIndex = tabs.findIndex(tab => location.pathname.startsWith(tab.path));

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      elevation={3}
    >
      <BottomNavigation
        value={currentTabIndex}
        onChange={(_, newValue) => navigate(tabs[newValue].path)}
        showLabels
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};
```

### Responsive Component Pattern

**Implementation in page components:**
```typescript
import { useMediaQuery, useTheme } from '@mui/material';
import { DesktopProductsPage } from './DesktopProductsPage';
import { MobileProductsPage } from './mobile/MobileProductsPage';

export const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Capacitor.isNativePlatform() can also be used for explicit mobile detection
  // const isMobileApp = Capacitor.isNativePlatform();

  if (isMobile) {
    return <MobileProductsPage />;
  }

  return <DesktopProductsPage />;
};
```

This pattern allows:
- Single entry point per feature
- Independent evolution of mobile/desktop UIs
- Code splitting (mobile bundle only loads on mobile)
- Gradual migration (can be applied page-by-page)

## Build and Deployment

### Development Workflow

1. **Web Development**: Standard `npm run dev` with Vite and Firebase emulators
2. **Mobile Development**:
   ```bash
   npm run build         # Build web assets
   npx cap sync          # Copy to native projects
   npx cap open ios      # Open in Xcode
   npx cap open android  # Open in Android Studio
   ```
3. **Live Reload**: Configure `server.url` in capacitor.config.ts to point to Vite dev server for instant updates

### Production Builds

**iOS Build Process:**
```bash
npm run build                    # Production build
npx cap sync ios                 # Sync to iOS project
npx cap open ios                 # Open Xcode
# In Xcode: Product → Archive → Distribute App → App Store Connect
```

**Android Build Process:**
```bash
npm run build                    # Production build
npx cap sync android             # Sync to Android project
npx cap open android             # Open Android Studio
# In Android Studio: Build → Generate Signed Bundle/APK → Upload to Play Console
```

### App Store Metadata Requirements

- App icons (1024x1024px for iOS, adaptive icons for Android)
- Splash screens (various sizes per platform guidelines)
- Screenshots (minimum 3 per platform, showing key features)
- Privacy policy URL
- App description and keywords
- Version number (must match package.json)

### Version Management

- Web app version in package.json
- iOS version in ios/App/App.xcodeproj (CFBundleShortVersionString)
- Android version in android/app/build.gradle (versionName, versionCode)
- Maintain version parity across all platforms for Firebase schema compatibility
