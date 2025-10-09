# Tasks Document - Mobile App Capacitor Conversion

## Phase 1: Capacitor Setup and Configuration (Tasks 1-10)

- [x] 1. Install Capacitor core packages and CLI
  - Files: package.json, package-lock.json (COMPLETE - @capacitor/core@7.4.3, @capacitor/cli@7.4.3, @capacitor/app@7.1.0)
  - Install @capacitor/core, @capacitor/cli, @capacitor/app packages
  - Purpose: Add Capacitor framework to project dependencies
  - _Leverage: Existing package.json structure, npm scripts_
  - _Requirements: 1 (Mobile App Infrastructure Setup)_
  - _Prompt: Role: DevOps Engineer specializing in mobile build tooling | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Install Capacitor 6.x core packages (@capacitor/core@latest, @capacitor/cli@latest, @capacitor/app@latest) as dependencies in package.json | Restrictions: Do not modify existing dependencies, maintain version compatibility with React 18 and Vite 6, use exact versions or caret ranges | Success: Capacitor packages installed successfully, npm install completes without errors, package-lock.json updated, no peer dependency conflicts_

- [x] 2. Initialize Capacitor configuration
  - Files: capacitor.config.ts (COMPLETE), .gitignore
  - Run npx cap init to create Capacitor project configuration
  - Configure appId, appName, webDir pointing to Vite's dist folder
  - Purpose: Establish Capacitor project structure and build settings
  - _Leverage: Existing vite.config.ts build output directory_
  - _Requirements: 1 (Mobile App Infrastructure Setup)_
  - _Prompt: Role: Mobile Build Engineer with Capacitor expertise | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Initialize Capacitor configuration using npx cap init with appId "com.sacredsutra.tools", appName "Sacred Sutra Tools", webDir "dist" to match Vite build output | Restrictions: Do not change existing build output directory, ensure appId follows reverse domain notation, configure for production builds | Success: capacitor.config.ts created with correct configuration, webDir points to dist folder, appId and appName properly set, .gitignore updated to exclude Capacitor cache files_

- [x] 3. Add iOS platform to Capacitor project
  - Files: ios/ directory (COMPLETE - exists with Xcode project), capacitor.config.ts
  - Run npx cap add ios to generate iOS project
  - Purpose: Create native iOS project structure with Xcode workspace
  - _Leverage: Capacitor CLI platform generation_
  - _Requirements: 1 (Mobile App Infrastructure Setup)_
  - _Prompt: Role: iOS Developer with Capacitor and Xcode expertise | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Add iOS platform using npx cap add ios to generate native iOS project in ios/ directory | Restrictions: Do not manually modify generated iOS project files initially, ensure Xcode version compatibility (Xcode 14+), verify iOS deployment target is iOS 13+ | Success: ios/ directory created with App.xcworkspace, Podfile, and iOS project structure, can open in Xcode successfully, no generation errors_

- [x] 4. Add Android platform to Capacitor project
  - Files: android/ directory (COMPLETE - exists with Gradle project), capacitor.config.ts
  - Run npx cap add android to generate Android project
  - Purpose: Create native Android project structure with Gradle build system
  - _Leverage: Capacitor CLI platform generation_
  - _Requirements: 1 (Mobile App Infrastructure Setup)_
  - _Prompt: Role: Android Developer with Capacitor and Android Studio expertise | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Add Android platform using npx cap add android to generate native Android project in android/ directory | Restrictions: Do not manually modify generated Android project files initially, ensure Android Studio compatibility (Bumblebee+), verify minSdkVersion is 24 (Android 7.0+) | Success: android/ directory created with build.gradle, gradle files, and Android project structure, can open in Android Studio successfully, Gradle sync completes_

- [x] 5. Install Capacitor Firebase plugins
  - Files: package.json (COMPLETE - @capacitor-firebase/authentication@7.3.1, @capacitor-firebase/firestore@7.3.1, @capacitor-firebase/storage@7.3.1, @capacitor-firebase/app@7.3.1), android/app/build.gradle, ios/App/Podfile
  - Install @capacitor-firebase/authentication, @capacitor-firebase/firestore, @capacitor-firebase/storage packages
  - Purpose: Add Firebase native SDK integration for mobile platforms
  - _Leverage: Existing Firebase web SDK configuration_
  - _Requirements: 1.3 (Firebase integration configured)_
  - _Prompt: Role: Firebase Integration Specialist with mobile SDK experience | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Install Capacitor Firebase plugins (@capacitor-firebase/authentication@latest, @capacitor-firebase/firestore@latest, @capacitor-firebase/storage@latest) and sync to native projects | Restrictions: Ensure version compatibility with Firebase 11.6.1, do not remove existing firebase web packages yet, verify peer dependencies | Success: Firebase plugins installed, npm install succeeds, npx cap sync completes without errors, native dependencies added to iOS Podfile and Android build.gradle_

- [ ] 6. Configure Firebase for iOS (GoogleService-Info.plist)
  - Files: ios/App/App/GoogleService-Info.plist (NEW)
  - Download GoogleService-Info.plist from Firebase console
  - Add to iOS project and register in Xcode
  - Purpose: Configure iOS app to connect to Firebase backend
  - _Leverage: Existing Firebase project configuration_
  - _Requirements: 1.3 (Firebase integration configured)_
  - _Prompt: Role: iOS Firebase Integration Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Download GoogleService-Info.plist from Firebase console for iOS app, place in ios/App/App/ directory, and register in Xcode project by dragging to file navigator | Restrictions: Use existing Firebase project from web app, ensure GoogleService-Info.plist is added to all targets, verify file is not added to version control (check .gitignore) | Success: GoogleService-Info.plist exists in ios/App/App/, registered in Xcode project, Firebase SDK can initialize when app runs_

- [ ] 7. Configure Firebase for Android (google-services.json)
  - Files: android/app/google-services.json (NEW), android/build.gradle, android/app/build.gradle
  - Download google-services.json from Firebase console
  - Add google-services plugin to Android build configuration
  - Purpose: Configure Android app to connect to Firebase backend
  - _Leverage: Existing Firebase project configuration_
  - _Requirements: 1.3 (Firebase integration configured)_
  - _Prompt: Role: Android Firebase Integration Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Download google-services.json from Firebase console for Android app, place in android/app/ directory, add google-services plugin to root build.gradle dependencies and apply plugin in app/build.gradle | Restrictions: Use existing Firebase project from web app, ensure google-services.json is not committed to version control, verify plugin version compatibility | Success: google-services.json exists in android/app/, google-services plugin applied, Gradle sync succeeds, Firebase SDK can initialize_

- [x] 8. Configure app icons and splash screens
  - Files: capacitor.config.ts, android/app/src/main/res/ (COMPLETE - ic_launcher icons in all densities), ios/App/App/Assets.xcassets/ (COMPLETE - AppIcon-512@2x.png)
  - Create app icon assets (1024x1024 for iOS, adaptive icons for Android)
  - Configure splash screen in Capacitor config
  - Purpose: Brand the mobile app with proper icons and splash screens
  - _Leverage: Existing favicon.ico and branding colors from vite.config.ts_
  - _Requirements: 1.4 (App icons and splash screens configured)_
  - _Prompt: Role: Mobile UI/UX Designer with asset generation experience | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create app icon (1024x1024px) and splash screen assets using existing branding (#2196f3 blue), configure SplashScreen plugin in capacitor.config.ts with 2s duration and spinner | Restrictions: Use Material UI primary blue (#2196f3), ensure icons meet platform guidelines (rounded corners for iOS, adaptive for Android), maintain brand consistency | Success: App icons display correctly on both platforms, splash screen shows on launch with brand colors, assets properly sized per platform requirements_

- [x] 9. Configure app permissions for camera and storage
  - Files: ios/App/App/Info.plist (COMPLETE - NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSPhotoLibraryAddUsageDescription), android/app/src/main/AndroidManifest.xml (COMPLETE - CAMERA, READ/WRITE_EXTERNAL_STORAGE), capacitor.config.ts
  - Add camera and storage permission declarations to native projects
  - Add permission usage descriptions for iOS Info.plist
  - Purpose: Request necessary permissions for barcode scanning and file access
  - _Leverage: Existing barcode scanning requirements from todaysOrders feature_
  - _Requirements: 1.5 (Permissions configured)_
  - _Prompt: Role: Mobile Permissions and Privacy Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Add camera permission (NSCameraUsageDescription for iOS, CAMERA for Android) with description "Required for barcode scanning orders" and storage permissions for file access | Restrictions: Provide clear, user-friendly permission descriptions, request minimum necessary permissions, follow platform privacy guidelines | Success: Permissions declared in Info.plist and AndroidManifest.xml, permission prompts show proper descriptions, app can request camera access for barcode scanning_

- [x] 10. Create npm scripts for Capacitor workflows
  - Files: package.json (COMPLETE - cap:sync, cap:open:ios, cap:open:android, mobile:dev scripts exist)
  - Add scripts: cap:sync, cap:open:ios, cap:open:android, cap:build:ios, cap:build:android
  - Purpose: Streamline Capacitor development and build workflows
  - _Leverage: Existing npm scripts structure_
  - _Requirements: 1 (Mobile App Infrastructure Setup)_
  - _Prompt: Role: DevOps Engineer specializing in build automation | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Add npm scripts in package.json for Capacitor workflows: "cap:sync" (npx cap sync), "cap:open:ios" (npx cap open ios), "cap:open:android" (npx cap open android), "mobile:dev" (npm run build && npx cap sync) | Restrictions: Do not override existing npm scripts, follow existing script naming conventions, ensure scripts work cross-platform | Success: All Capacitor scripts execute correctly, mobile:dev builds and syncs successfully, scripts properly documented in package.json_

## Phase 2: Firebase Plugin Integration (Tasks 11-16)

- [x] 11. Create Capacitor Firebase initialization module
  - Files: src/services/firebase.capacitor.ts (COMPLETE - 149 lines with full implementation), src/main.tsx (MODIFIED - initializeFirebaseCapacitor() called in useEffect)
  - Import Capacitor Firebase plugins and create initialization function
  - Purpose: Centralize Firebase plugin initialization for mobile platforms
  - _Leverage: Existing src/services/firebase.config.ts structure_
  - _Requirements: 1.6 (App launches and initializes Firebase services)_
  - _Prompt: Role: Firebase Mobile Integration Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create firebase.capacitor.ts module that imports @capacitor-firebase/* plugins and exports initializeFirebase() function to initialize Auth, Firestore, and Storage plugins with error handling | Restrictions: Must detect platform (Capacitor vs web) to conditionally initialize, handle initialization errors gracefully, maintain same public API as web config | Success: Firebase plugins initialize on app launch, error handling logs issues clearly, initialization completes within 3 seconds per requirement_

- [ ] 12. Update firebase.service.ts to use Capacitor plugins on mobile
  - Files: src/services/firebase.service.ts (MODIFY)
  - Add conditional imports for Capacitor Firebase plugins vs web SDK
  - Update FirebaseService to use Capacitor plugins when on native platform
  - Purpose: Maintain service compatibility while using native Firebase SDKs
  - _Leverage: Existing FirebaseService base class and error handling_
  - _Requirements: 2 (Responsive Mobile UI Framework)_
  - _Prompt: Role: Senior Backend Developer with Firebase multi-platform experience | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify firebase.service.ts to conditionally import and use Capacitor Firebase plugins (@capacitor-firebase/firestore) when Capacitor.isNativePlatform() is true, otherwise use web SDK, maintaining existing method signatures | Restrictions: Must not break existing web functionality, maintain backward compatibility with all service classes extending FirebaseService, preserve offline persistence logic | Success: Firebase service works on both web and mobile, all existing services (ProductService, CategoryService) work without modification, offline persistence functions correctly, type-check passes_

- [ ] 13. Update authentication service for Capacitor Firebase Auth
  - Files: src/services/auth.service.ts (MODIFY), src/store/slices/authSlice.ts (VERIFY)
  - Replace firebase/auth imports with @capacitor-firebase/authentication on mobile
  - Maintain existing auth state management and Redux integration
  - Purpose: Enable native authentication flow on mobile devices
  - _Leverage: Existing auth state management in authSlice.ts_
  - _Requirements: 2 (Responsive Mobile UI Framework), Security requirements_
  - _Prompt: Role: Authentication and Security Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Update auth.service.ts to use @capacitor-firebase/authentication plugin on mobile platforms while maintaining existing email/password authentication and auth state management in Redux authSlice | Restrictions: Must maintain same auth flow for web and mobile, preserve existing ProtectedRoute logic, ensure secure token storage using Capacitor SecureStorage, do not break existing auth state management | Success: Login/logout works on mobile, auth state persists across app restarts, ProtectedRoute guards work correctly, all auth tests pass_

- [ ] 14. Update Firestore service for Capacitor plugin
  - Files: src/services/firebase.service.ts (CONTINUE)
  - Replace Firestore web SDK methods with Capacitor Firestore plugin equivalents
  - Ensure query, listener, and batch operations work identically
  - Purpose: Enable native Firestore access with offline persistence on mobile
  - _Leverage: Existing FirebaseService query patterns and offline persistence logic_
  - _Requirements: 6 (Offline Support and Data Synchronization)_
  - _Prompt: Role: Database Engineer with Firestore and mobile SDK expertise | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Update Firestore operations in firebase.service.ts to use @capacitor-firebase/firestore plugin methods (collection, query, getDocs, setDoc, updateDoc, batch operations) on mobile, maintaining same API as web SDK | Restrictions: Must preserve existing query patterns, maintain offline persistence functionality (enableIndexedDbPersistence equivalent), ensure real-time listeners work identically, do not change service method signatures | Success: All Firestore CRUD operations work on mobile, offline persistence functions correctly, real-time updates work, all existing services (ProductService, InventoryService) work without modification_

- [ ] 15. Update Storage service for Capacitor plugin
  - Files: src/services/pdfStorageService.ts (MODIFY)
  - Replace firebase/storage with @capacitor-firebase/storage on mobile
  - Maintain PDF upload, download, and metadata operations
  - Purpose: Enable native file storage operations on mobile devices
  - _Leverage: Existing pdfStorageService.ts structure_
  - _Requirements: 1.3 (Firebase integration configured)_
  - _Prompt: Role: Cloud Storage Engineer with Firebase Storage experience | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Update pdfStorageService.ts to use @capacitor-firebase/storage plugin for upload, download, delete operations on mobile, maintaining existing metadata tracking and folder organization | Restrictions: Must handle mobile-specific file paths, maintain existing storage bucket structure, preserve metadata operations, handle storage quota errors gracefully | Success: PDF uploads work from mobile, file downloads succeed, metadata operations function correctly, storage quota errors handled per error handling requirements_

- [ ] 16. Test Firebase plugin integration end-to-end
  - Files: src/__tests__/firebase-mobile.integration.test.ts (NEW)
  - Write integration tests for Firebase Auth, Firestore, Storage on mobile
  - Test offline persistence and synchronization
  - Purpose: Verify Firebase plugins work correctly in mobile environment
  - _Leverage: Existing test utilities and Firebase emulator setup_
  - _Requirements: 8 (Code Quality and Testing Standards)_
  - _Prompt: Role: QA Integration Engineer specializing in Firebase testing | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create integration tests for Firebase Capacitor plugins covering auth flow (login/logout), Firestore CRUD operations, Storage upload/download, and offline persistence scenarios | Restrictions: Must run tests against Firebase emulators, test both online and offline scenarios, verify synchronization works correctly, maintain test isolation | Success: All Firebase plugin integration tests pass, offline persistence verified, synchronization works when connectivity restored, tests run in CI pipeline successfully_

## Phase 3: Mobile Navigation and Infrastructure (Tasks 17-24)

- [x] 17. Create mobile viewport detection utility
  - Files: src/utils/mobile.ts (NEW)
  - Create utility functions for detecting mobile platform and viewport size
  - Export isMobile, isPlatform, getViewportSize utilities
  - Purpose: Provide consistent mobile detection across application
  - _Leverage: Existing Material-UI useMediaQuery pattern in DataTable_
  - _Requirements: 2 (Responsive Mobile UI Framework)_
  - _Prompt: Role: Frontend Utilities Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create mobile.ts utility module with functions: isMobile() using useMediaQuery(theme.breakpoints.down('sm')), isPlatform() using Capacitor.getPlatform(), isMobileApp() using Capacitor.isNativePlatform() | Restrictions: Must use Material-UI breakpoints for consistency, provide React hooks for component use, support server-side rendering (check window existence), export TypeScript types for platform detection | Success: Utilities work correctly in both web and mobile, isMobile matches Material-UI sm breakpoint (600px), isPlatform returns correct platform (ios/android/web), all type-checks pass_

- [x] 18. Create mobile navigation configuration types
  - Files: src/types/mobile.ts (NEW)
  - Define TypeScript interfaces for mobile navigation config
  - Create types for MobileTab, MobileNavigationConfig, MobileViewportConfig
  - Purpose: Establish type safety for mobile navigation system
  - _Leverage: Existing TypeScript patterns in src/types/_
  - _Requirements: 7 (Mobile Navigation and User Experience)_
  - _Prompt: Role: TypeScript Developer specializing in type systems | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create mobile.ts type definitions including MobileTab interface (id, label, icon, route, badge?), MobileNavigationConfig interface (tabs, defaultTab), MobileViewportConfig interface (breakpoint, cardWidth, spacing, touchTargetSize) | Restrictions: Follow existing type naming conventions, use strict typing, include JSDoc comments for interfaces, ensure icon type accepts React.ReactNode | Success: All mobile types compile without errors, interfaces are well-documented, types support required navigation features (bottom tabs, badges, routing)_

- [x] 19. Create MobileBottomNav component
  - Files: src/navigation/MobileBottomNav.tsx (NEW), src/navigation/__tests__/MobileBottomNav.test.tsx (NEW)
  - Implement bottom navigation component using Material-UI BottomNavigation
  - Configure tabs for Active Orders, Products, Categories
  - Purpose: Provide mobile-appropriate navigation for main features
  - _Leverage: Material-UI BottomNavigation component, React Router navigation_
  - _Requirements: 7.1 (App displays bottom navigation), 2.1 (Mobile-Friendly Common Components)_
  - _Prompt: Role: React Mobile UI Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileBottomNav component using Material-UI BottomNavigation with tabs for Active Orders (ShoppingCart icon), Products (Inventory icon), Categories (Category icon), integrate with React Router for navigation, position fixed at bottom, handle active state highlighting | Restrictions: Must use Material-UI BottomNavigation and BottomNavigationAction, respect safe areas on iOS, provide minimum 44x44px touch targets, show labels on all tabs, use proper z-index for layering | Success: Bottom nav renders at bottom of screen, tabs navigate correctly, active tab is highlighted, touch targets meet 44px requirement, renders on mobile viewports only, component tests pass with 80%+ coverage_

- [x] 20. Create MobileAppShell component
  - Files: src/navigation/MobileAppShell.tsx (NEW), src/navigation/__tests__/MobileAppShell.test.tsx (NEW)
  - Create mobile app container with bottom navigation and content area
  - Add safe area handling for notched devices
  - Purpose: Provide consistent mobile layout structure across all pages
  - _Leverage: MobileBottomNav component, existing DefaultContainer pattern_
  - _Requirements: 7 (Mobile Navigation and User Experience)_
  - _Prompt: Role: Mobile Layout Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileAppShell component that wraps page content with MobileBottomNav at bottom, adds proper padding for safe areas (iOS notch, Android navigation bar), uses Box component for layout with pb to account for bottom nav height | Restrictions: Must handle iOS safe areas using env(safe-area-inset-*), account for bottom navigation height in content padding, provide proper scrolling behavior, maintain consistent spacing | Success: App shell renders correctly on mobile, content doesn't overlap with bottom nav, safe areas respected on iOS, scrolling works properly, component tests verify layout calculations_

- [x] 21. Integrate MobileAppShell into App.tsx routing
  - Files: src/App.tsx (MODIFY), src/components/ProtectedRoutes.tsx (MODIFY)
  - Add mobile detection and conditionally render MobileAppShell vs DefaultContainer
  - Route mobile users to mobile shell with bottom navigation
  - Purpose: Enable mobile navigation for native app users
  - _Leverage: Existing routing structure in App.tsx and ProtectedRoutes.tsx_
  - _Requirements: 7 (Mobile Navigation and User Experience)_
  - _Prompt: Role: React Routing Architect | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify App.tsx to detect mobile using isMobileApp() utility, conditionally render MobileAppShell instead of DefaultContainer when on mobile platform, maintain existing routing logic and ProtectedRoute authentication | Restrictions: Must not break existing web routing, preserve lazy loading for pages, maintain ProtectedRoute authentication flow, ensure mobile detection happens early in render cycle | Success: Mobile users see bottom navigation, web users see existing layout, routing works correctly on both platforms, lazy loading continues to work, authentication flow unchanged_

- [x] 22. Implement hardware back button handling for Android
  - Files: src/hooks/useBackButton.ts (NEW), src/App.tsx (MODIFY)
  - Use Capacitor App plugin to handle Android back button
  - Navigate back in router history or exit app at root level
  - Purpose: Provide native Android back button behavior
  - _Leverage: Capacitor App plugin, React Router useNavigate_
  - _Requirements: 7.3 (Back button navigates or exits app)_
  - _Prompt: Role: Android Mobile Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create useBackButton custom hook that uses Capacitor App.addListener('backButton') to handle hardware back button, navigate back using React Router navigate(-1) if history exists, otherwise call App.exitApp() to close app | Restrictions: Only activate on Android platform (check Capacitor.getPlatform()), remove listener on component unmount, handle root route properly (exit app), ensure back navigation respects navigation stack | Success: Android back button navigates correctly through app history, exits app when at root route, listener properly cleaned up, no memory leaks, works correctly with bottom navigation_

- [x] 23. Add pull-to-refresh functionality hook
  - Files: src/hooks/usePullToRefresh.ts (NEW)
  - Create reusable hook for pull-to-refresh on mobile lists
  - Integrate with Capacitor StatusBar and visual feedback
  - Purpose: Enable native pull-to-refresh gesture on mobile pages
  - _Leverage: Material-UI CircularProgress for loading indicator_
  - _Requirements: 3.9, 4.9, 7.7 (Pull to refresh functionality)_
  - _Prompt: Role: Mobile UX Engineer specializing in touch gestures | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create usePullToRefresh custom hook that detects pull-down gesture on scroll containers, shows loading indicator at top, calls provided refresh callback function, provides isRefreshing state | Restrictions: Must work with standard scroll containers, detect pull gesture only at scroll top (scrollTop === 0), provide visual feedback (pull distance indicator), work on both iOS and Android, handle rapid successive pulls | Success: Pull-to-refresh works on mobile devices, loading indicator shows during refresh, callback executes correctly, visual feedback is smooth, hook is reusable across pages_

- [x] 24. Create offline indicator component
  - Files: src/components/mobile/OfflineIndicator.tsx (NEW), src/components/mobile/__tests__/OfflineIndicator.test.tsx (NEW)
  - Build banner component that shows when app is offline
  - Detect network status using Capacitor Network plugin
  - Purpose: Inform users when app is operating in offline mode
  - _Leverage: Capacitor Network plugin, Material-UI Alert component_
  - _Requirements: 6.1 (Offline indicator displayed)_
  - _Prompt: Role: Mobile Offline-First Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create OfflineIndicator component using Material-UI Alert that monitors network status with Capacitor Network plugin (Network.addListener('networkStatusChange')), displays banner at top when offline with cloud-off icon and "Working Offline" message, auto-hides when connectivity restored | Restrictions: Must subscribe to network events, cleanup listeners on unmount, position banner at top with proper z-index, use warning/info severity, handle rapid online/offline transitions, respect safe areas | Success: Banner appears immediately when going offline, disappears when online, network listener cleanup prevents memory leaks, position doesn't overlap content, component tests cover online/offline transitions_

## Phase 4: Mobile Common Components (Tasks 25-34)

- [x] 25. Enhance DataTable component for mobile optimization
  - Files: src/components/DataTable/DataTable.tsx (MODIFY)
  - Review and optimize existing mobile detection and MobileDataRow rendering
  - Ensure rowsPerPage defaults to 5 on mobile, verify touch targets
  - Purpose: Optimize existing DataTable for mobile performance and UX
  - _Leverage: Existing MobileDataRow and MobileFilters components_
  - _Requirements: 2.1.1 (DataTable renders MobileDataRow on mobile)_
  - _Prompt: Role: React Component Optimization Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Review DataTable.tsx mobile implementation, ensure isMobile detection uses theme.breakpoints.down('sm'), verify MobileDataRow renders with card layout, confirm rowsPerPage defaults to 5 on mobile, validate touch targets are 44x44px minimum | Restrictions: Do not break existing desktop functionality, maintain existing API and props, preserve sorting and filtering logic, ensure performance with large datasets on mobile | Success: DataTable renders correctly on mobile with card layouts, pagination shows 5 items per page default, touch targets meet 44px requirement, all DataTable tests pass, type-check succeeds_

- [x] 26. Enhance MobileFilters component with bottom sheet
  - Files: src/components/DataTable/MobileFilters.tsx (MODIFY)
  - Replace current mobile filters with bottom sheet/drawer pattern
  - Add apply/clear actions and smooth animations
  - Purpose: Provide mobile-optimized filter UI with better UX
  - _Leverage: Material-UI SwipeableDrawer component_
  - _Requirements: 2.1.2 (MobileFilters uses bottom sheet UI)_
  - _Prompt: Role: Mobile UI/UX Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Enhance MobileFilters.tsx to use Material-UI SwipeableDrawer for bottom sheet presentation, add Apply and Clear buttons at bottom, implement smooth slide-up animation, provide drag handle visual indicator at top | Restrictions: Must maintain existing filter logic and props interface, ensure drawer respects safe areas on iOS, provide proper backdrop click to close, maintain filter state until Apply clicked, support swipe-down to close | Success: Filters appear in bottom sheet on mobile, apply/clear actions work correctly, smooth animations (300ms), swipe gestures functional, accessibility maintained (focus trap in drawer)_

- [x] 27. Create MobileDatePicker component wrapper
  - Files: src/components/mobile/MobileDatePicker.tsx (NEW), src/components/mobile/__tests__/MobileDatePicker.test.tsx (NEW)
  - Wrap Material-UI MobileDatePicker with project-specific defaults
  - Add "Today" quick action and mobile-optimized calendar
  - Purpose: Provide consistent mobile date picker across application
  - _Leverage: Material-UI MobileDatePicker from @mui/x-date-pickers_
  - _Requirements: 2.1.5 (Mobile date picker controls)_
  - _Prompt: Role: React Form Components Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileDatePicker component wrapping Material-UI MobileDatePicker with project defaults (AdapterDateFns, format "yyyy-MM-dd"), add "Today" toolbar button, ensure touch-optimized calendar with large date cells (minimum 44x44px) | Restrictions: Must accept same props as Material-UI MobileDatePicker, maintain Material-UI theming, provide proper TypeScript types, ensure keyboard accessible, handle invalid dates gracefully | Success: Date picker renders with mobile-optimized calendar, "Today" button works correctly, dates selectable with touch, calendar cells meet 44px touch target, component tests validate date selection and "Today" action_

- [x] 28. Create MobileSearchInput component
  - Files: src/components/mobile/MobileSearchInput.tsx (NEW), src/components/mobile/__tests__/MobileSearchInput.test.tsx (NEW)
  - Build mobile-optimized search input with clear button and auto-focus
  - Add debounced onChange handler for performance
  - Purpose: Provide consistent mobile search experience across pages
  - _Leverage: Material-UI TextField, existing debounce utilities_
  - _Requirements: 2.1.6 (Mobile-optimized search with clear button)_
  - _Prompt: Role: React Input Components Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileSearchInput component using Material-UI TextField with search icon, clear button (when text present), auto-focus on mount, debounced onChange (300ms) to prevent excessive rerenders, placeholder "Search..." | Restrictions: Must use Material-UI TextField, implement debounce without external library (use setTimeout), provide controlled component pattern, clear button should be touch-friendly (IconButton with 44px hit area), ensure no memory leaks from debounce | Success: Search input renders with search icon, clear button appears when typing, onChange debounced at 300ms, auto-focuses on mount (mobile keyboard appears), component tests verify debounce and clear functionality_

- [x] 29. Create MobileModal component for full-screen dialogs
  - Files: src/components/mobile/MobileModal.tsx (NEW), src/components/mobile/__tests__/MobileModal.test.tsx (NEW)
  - Build full-screen modal component for mobile with proper header and actions
  - Add safe area support and slide-up animation
  - Purpose: Provide consistent modal pattern for mobile pages
  - _Leverage: Material-UI Dialog with fullScreen prop_
  - _Requirements: 2.1.4 (Modals use full-screen on mobile)_
  - _Prompt: Role: Mobile Modal Component Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileModal component using Material-UI Dialog with fullScreen on mobile, add AppBar header with close button (X icon) on left, title in center, optional action button on right, content area with proper padding, slide-up transition animation | Restrictions: Must respect iOS safe areas (AppBar and content padding), close button minimum 44x44px, use Slide transition from bottom, support custom header actions, ensure focus trap within modal, provide onClose callback | Success: Modal displays full-screen on mobile, close button works correctly, slide-up animation smooth, safe areas respected, focus trapped in modal, header actions render correctly, component tests verify open/close behavior_

- [x] 30. Create MobileFloatingActionButton component
  - Files: src/components/mobile/MobileFAB.tsx (NEW), src/components/mobile/__tests__/MobileFAB.test.tsx (NEW)
  - Build Floating Action Button for primary mobile actions
  - Position for thumb reach and proper z-index layering
  - Purpose: Provide mobile-appropriate primary action button
  - _Leverage: Material-UI Fab component_
  - _Requirements: 2.1.9 (FABs for primary actions)_
  - _Prompt: Role: Mobile UI Component Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileFAB component using Material-UI Fab with default position fixed bottom-right (16px from edges), respect safe areas, accept icon and onClick props, use primary color, ensure 56x56px size (Material Design standard), proper z-index above bottom nav | Restrictions: Must position with CSS fixed, account for bottom navigation height (add bottom padding), use Material-UI Fab component, minimum 56x56px per Material Design, support custom colors and positions via props | Success: FAB renders at bottom-right with proper spacing, positioned above bottom nav, respects safe areas, touch target is 56x56px, z-index correct for layering, component tests verify positioning and click handler_

- [x] 31. Create MobileSnackbar component for notifications
  - Files: src/components/mobile/MobileSnackbar.tsx (NEW), src/components/mobile/__tests__/MobileSnackbar.test.tsx (NEW)
  - Build snackbar component positioned for mobile thumb dismissal
  - Add auto-hide and swipe-to-dismiss functionality
  - Purpose: Provide mobile-friendly notifications and error messages
  - _Leverage: Material-UI Snackbar component_
  - _Requirements: 2.1.10 (Snackbars positioned at bottom for thumb dismissal)_
  - _Prompt: Role: Mobile Notification Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileSnackbar component using Material-UI Snackbar positioned at bottom-center, add swipe-down gesture to dismiss, auto-hide after 4 seconds, support severity types (success, error, warning, info), include undo action button if provided | Restrictions: Must use Material-UI Snackbar, position at bottom accounting for safe areas and bottom nav, implement swipe gesture with touch events, provide proper z-index, support action buttons, ensure accessible with screen readers | Success: Snackbar appears at bottom, auto-hides after 4s, swipe-down dismisses, severity colors correct, action button works, positioned above bottom nav but below modals, component tests verify auto-hide and swipe dismissal_

- [x] 32. Enhance InventoryStatusChip for mobile sizing
  - Files: src/components/InventoryStatusChip/InventoryStatusChip.tsx (MODIFY)
  - Increase chip sizing for mobile with larger text and padding
  - Ensure touch-friendly spacing between chips
  - Purpose: Make inventory status indicators readable and touch-friendly on mobile
  - _Leverage: Existing InventoryStatusChip component_
  - _Requirements: 2.1.3 (InventoryStatusChip mobile sizing)_
  - _Prompt: Role: Mobile Component Enhancement Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify InventoryStatusChip.tsx to detect mobile viewport, increase font size to 14px minimum on mobile, add larger padding (8px vertical, 12px horizontal), ensure 8px spacing between multiple chips, maintain existing color coding for status types | Restrictions: Must not break desktop rendering, use responsive sizing via Material-UI theme breakpoints, maintain existing color scheme and status logic, preserve TypeScript prop types | Success: Chips are larger and more readable on mobile, text meets 14px minimum, touch spacing adequate (8px), desktop rendering unaffected, all InventoryStatusChip tests pass_

- [x] 33. Create MobileCard base component
  - Files: src/components/mobile/MobileCard.tsx (NEW), src/components/mobile/__tests__/MobileCard.test.tsx (NEW)
  - Build reusable card component for mobile list items
  - Add swipe actions support and press states
  - Purpose: Provide consistent card layout for mobile lists
  - _Leverage: Material-UI Card component_
  - _Requirements: 2.1.1 (Card-based layouts for mobile)_
  - _Prompt: Role: React Mobile Card Component Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCard component using Material-UI Card with proper elevation (2), rounded corners (8px), content padding (16px), support for header/content/actions sections, optional swipe actions (left/right), press state visual feedback (ripple effect) | Restrictions: Must use Material-UI Card and CardContent, provide consistent spacing, support optional CardHeader and CardActions, implement swipe with touch events, ensure minimum 44px height for touch, maintain accessibility (proper focus states) | Success: Card renders with proper styling, swipe actions work smoothly, press feedback visible, header/content/actions sections render correctly, accessibility maintained, component tests verify layout and swipe functionality_

- [x] 34. Create mobile infinite scroll hook
  - Files: src/hooks/useInfiniteScroll.ts (NEW), src/hooks/__tests__/useInfiniteScroll.test.ts (NEW)
  - Build hook for infinite scroll/load more functionality on mobile
  - Detect scroll position and trigger load callback
  - Purpose: Enable performant mobile list pagination with infinite scroll
  - _Leverage: Intersection Observer API_
  - _Requirements: 2.1.7 (Infinite scroll for pagination)_
  - _Prompt: Role: React Performance Optimization Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create useInfiniteScroll custom hook using Intersection Observer to detect when user scrolls near bottom of list (threshold: 100px from bottom), call loadMore callback, provide isLoading state to prevent duplicate loads, support ref to attach to scroll container | Restrictions: Must use Intersection Observer for performance, cleanup observer on unmount, debounce callback to prevent rapid fires, handle edge case of already at bottom on mount, work with standard scroll containers | Success: Infinite scroll triggers loadMore when near bottom, prevents duplicate loads during loading state, observer cleaned up properly, works with virtualized lists, hook tests verify callback timing and cleanup_

## Phase 5: Mobile Orders Page (Tasks 35-40)

- [x] 35. Create MobileOrderCard component
  - Files: src/pages/todaysOrders/mobile/components/MobileOrderCard.tsx (NEW), src/pages/todaysOrders/mobile/components/__tests__/MobileOrderCard.test.tsx (NEW)
  - Build order card with product name, SKU, quantity, platform, completion status
  - Add swipe-to-complete action and visual feedback
  - Purpose: Display individual orders in mobile-optimized card format
  - _Leverage: MobileCard base component, existing ActiveOrder type_
  - _Requirements: 3.1 (Orders in mobile card format)_
  - _Prompt: Role: React Mobile Order UI Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileOrderCard component using MobileCard base, display order name (large text), SKU and quantity (secondary text), platform badge (Amazon/Flipkart chip), completion checkbox or checkmark icon, swipe-right-to-complete action with green confirmation, batch info if present | Restrictions: Must use ActiveOrder type from ordersSlice, support onComplete callback, provide visual distinction for completed orders (gray out with checkmark), swipe action only for pending orders, minimum card height 88px for touch, ensure proper text truncation for long names | Success: Order card displays all required info legibly, swipe-to-complete works smoothly with visual feedback, completed orders visually distinct, platform badge colored correctly, card is touch-friendly with proper spacing, component tests verify rendering and completion action_

- [x] 36. Create MobileOrderFilters component
  - Files: src/pages/todaysOrders/mobile/components/MobileOrderFilters.tsx (NEW)
  - Build mobile filters for platform, batch, and completion status
  - Use bottom sheet presentation with filter chips
  - Purpose: Enable order filtering on mobile with intuitive UI
  - _Leverage: MobileFilters pattern, existing filter logic from ordersSlice_
  - _Requirements: 3.3 (Mobile-optimized filter controls)_
  - _Prompt: Role: Mobile Filter UI Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileOrderFilters component with bottom sheet containing platform filter (All/Amazon/Flipkart chips), batch selector (dropdown with batches), completion status (All/Pending/Completed chips), Apply and Clear buttons, integrate with ordersSlice setPlatformFilter, setBatchFilter, setCompletionFilter actions | Restrictions: Must use SwipeableDrawer for bottom sheet, maintain current filter state until Apply clicked, chips should toggle selection with visual feedback, batch dropdown should be searchable if many batches, ensure touch-friendly spacing (8px between chips) | Success: Filter sheet opens from bottom, all filter types functional, filters apply to order list when Apply clicked, Clear resets all filters, sheet dismisses on Apply, component tests verify filter logic integration with Redux_

- [x] 37. Create MobileTodaysOrdersPage component
  - Files: src/pages/todaysOrders/mobile/MobileTodaysOrdersPage.tsx (NEW), src/pages/todaysOrders/mobile/__tests__/MobileTodaysOrdersPage.test.tsx (NEW)
  - Build mobile orders page with date picker, filters, order list, barcode scanner
  - Implement pull-to-refresh and group by category/batch
  - Purpose: Provide full mobile experience for today's orders management
  - _Leverage: MobileOrderCard, MobileOrderFilters, MobileDatePicker, existing ordersSlice state_
  - _Requirements: 3 (Active Orders Mobile Page)_
  - _Prompt: Role: React Mobile Page Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileTodaysOrdersPage component with MobileDatePicker at top, filter button (opens MobileOrderFilters sheet), order count summary, MobileOrderCard list using infinite scroll, FAB for barcode scanner, pull-to-refresh to reload orders, integrate with ordersSlice (fetchOrders, selectFilteredOrders), support batch/category grouping with collapsible sections | Restrictions: Must use existing Redux actions (fetchOrders, fetchOrdersForDate), implement usePullToRefresh hook, use useInfiniteScroll for list, handle loading and error states, show empty state when no orders, ensure date picker defaults to today | Success: Orders page loads today's orders on mount, date picker changes fetch orders for selected date, filters work correctly, pull-to-refresh reloads data, infinite scroll loads more orders, barcode scanner FAB navigates to scanner, grouping by batch/category functions, all integration tests pass_

- [x] 38. Integrate EnhancedBarcodeScanner for mobile camera
  - Files: src/pages/todaysOrders/mobile/MobileBarcodeScannerPage.tsx (COMPLETE - 103 lines), src/components/mobile/MobileBarcodeScanner.tsx (EXISTS), src/components/ProtectedRoutes.tsx (MODIFIED - route added)
  - Adapt existing barcode scanner for mobile device camera
  - Use Capacitor Camera API for native camera access
  - Purpose: Enable barcode scanning on mobile devices for order completion
  - _Leverage: Existing EnhancedBarcodeScanner component, Capacitor Camera plugin_
  - _Requirements: 3.6 (Barcode scanner uses device camera)_
  - _Prompt: Role: Mobile Camera Integration Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileBarcodeScanner component that uses Capacitor Camera or BarcodeScanner plugin for native camera access, displays camera preview full-screen, detects barcode scan, calls completeOrderByBarcode action from ordersSlice, provides visual feedback on successful scan (checkmark animation), handles camera permission denial gracefully | Restrictions: Must request camera permission before opening scanner, provide fallback to manual search if permission denied, use native camera preview (not web getUserMedia), handle scan success/failure with visual and haptic feedback, auto-close scanner after successful scan | Success: Camera opens with native preview on mobile, barcode scanning works and completes orders, visual feedback on scan (green flash + checkmark), permission denial shows fallback option, scanner integrates with orders page via FAB, component tests verify scan flow (mocked camera)_

- [x] 39. Update todaysOrder.page.tsx with mobile detection
  - Files: src/pages/todaysOrders/todaysOrder.page.tsx (MODIFY)
  - Add mobile detection and conditionally render MobileTodaysOrdersPage vs desktop version
  - Maintain single entry point for feature
  - Purpose: Route mobile users to mobile-optimized orders page
  - _Leverage: isMobile utility, responsive component pattern_
  - _Requirements: 2 (Responsive Mobile UI Framework)_
  - _Prompt: Role: React Responsive Routing Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify todaysOrder.page.tsx to use isMobile utility from src/utils/mobile.ts, conditionally render MobileTodaysOrdersPage component when isMobile is true, otherwise render existing desktop TodaysOrderPage component, maintain same Redux state and props | Restrictions: Must not duplicate business logic, both components should use same Redux state (ordersSlice), maintain single entry point at route level, ensure lazy loading works for mobile component, preserve existing desktop functionality | Success: Mobile users see MobileTodaysOrdersPage, desktop users see existing page, both use same Redux state, no code duplication, type-check passes, existing tests continue to pass_

- [ ] 40. Create integration tests for mobile orders flow
  - Files: src/pages/todaysOrders/mobile/__tests__/MobileOrdersIntegration.test.tsx (NEW)
  - Test complete mobile orders flow: load → filter → scan → complete → refresh
  - Mock Redux store and Firebase calls
  - Purpose: Ensure mobile orders page works end-to-end
  - _Leverage: Existing test utilities, Redux mock store_
  - _Requirements: 8 (Code Quality and Testing Standards)_
  - _Prompt: Role: QA Integration Test Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create integration tests for mobile orders flow covering: page load with today's orders, date selection triggers fetchOrdersForDate, platform filter updates list, batch grouping shows sections, pull-to-refresh reloads orders, barcode scan completes order, offline mode queues completion | Restrictions: Must use React Testing Library, mock Redux store with renderWithProviders utility, mock Firebase calls, simulate mobile viewport (window.matchMedia), test user interactions not implementation, verify Redux actions dispatched | Success: All integration tests pass, tests cover critical flows (filter, scan, complete, offline), Redux state changes verified, tests run in CI pipeline, 80%+ coverage for mobile orders components_

## Phase 6: Mobile Products Page (Tasks 41-45)

- [x] 41. Create MobileProductCard component
  - Files: src/pages/products/mobile/components/MobileProductCard.tsx (NEW), src/pages/products/mobile/components/__tests__/MobileProductCard.test.tsx (NEW)
  - Build product card with name, SKU, stock level, inventory status badge
  - Add tap action to show product details
  - Purpose: Display products in mobile-optimized card format
  - _Leverage: MobileCard base component, InventoryStatusChip, existing Product type_
  - _Requirements: 4.1 (Products in mobile card layout)_
  - _Prompt: Role: React Mobile Product UI Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileProductCard component using MobileCard base, display product name (large, bold), SKU (secondary text), current stock level (prominent number with label), InventoryStatusChip for inventory status (healthy/low/zero), platform badge, tap anywhere on card to trigger onTap callback for details modal | Restrictions: Must use Product type from productsSlice, show InventoryStatusChip with proper status (use existing status calculation logic), truncate long product names with ellipsis, ensure minimum 88px card height for touch, highlight low/zero stock with visual indicator (red border for zero) | Success: Product card displays all info legibly on mobile, inventory status chip colored correctly, tap action works smoothly with ripple effect, low/zero stock visually distinct, long names truncated properly, component tests verify rendering and tap handler_

- [x] 42. Create MobileProductSearch component
  - Files: src/pages/products/mobile/components/MobileProductSearch.tsx (NEW)
  - Build mobile search with filter chips for platform and category
  - Add sort dropdown (by name, SKU, stock level)
  - Purpose: Provide mobile-friendly product search and filtering
  - _Leverage: MobileSearchInput, existing productsSlice filters_
  - _Requirements: 4.2, 4.3, 4.4 (Search and filter products)_
  - _Prompt: Role: Mobile Search and Filter Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileProductSearch component with MobileSearchInput for text search, platform filter chips (All/Amazon/Flipkart), category dropdown (populated from categoriesSlice), sort dropdown (Name/SKU/Stock Level), integrate with productsSlice setFilters action with debounced search (300ms) | Restrictions: Must use existing ProductFilter type, debounce search input to prevent excessive filtering, chips should toggle with visual feedback, dropdowns should be touch-friendly with large options, clear search should reset all filters, maintain filter state in URL query params for deep linking | Success: Search filters products in real-time (debounced), platform and category filters work correctly, sort changes order immediately, all filters integrate with Redux, filter state persists in URL, component tests verify filter logic_

- [x] 43. Create MobileProductDetailsModal component
  - Files: src/pages/products/mobile/components/MobileProductDetailsModal.tsx (NEW)
  - Build full-screen modal showing detailed product information
  - Display all product fields, edit option, and inventory history
  - Purpose: Show comprehensive product details on mobile
  - _Leverage: MobileModal base component, existing Product type_
  - _Requirements: 4.5 (Product details in mobile modal)_
  - _Prompt: Role: React Mobile Details View Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileProductDetailsModal using MobileModal component with product name in header, edit button as header action, scrollable content showing all product fields (SKU, platform, category, cost price, inventory level, status), inventory movement history section, close button in header | Restrictions: Must use MobileModal component, display all Product fields in readable format, show category name (resolve from categoryId), format currency properly with FormattedCurrency, show inventory history if available, ensure content scrollable within modal bounds, provide edit action that opens edit form | Success: Modal displays full-screen on mobile with all product details, edit button functional, inventory history rendered, scrolling works properly, modal closes on header X button, component tests verify rendering with product data_

- [x] 44. Create MobileProductsPage component
  - Files: src/pages/products/mobile/MobileProductsPage.tsx (NEW), src/pages/products/mobile/__tests__/MobileProductsPage.test.tsx (NEW)
  - Build mobile products page with search, filters, product card list
  - Implement infinite scroll and pull-to-refresh
  - Purpose: Provide full mobile experience for product management
  - _Leverage: MobileProductCard, MobileProductSearch, existing productsSlice_
  - _Requirements: 4 (Products Mobile Page)_
  - _Prompt: Role: React Mobile Page Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileProductsPage with MobileProductSearch at top (sticky), product count summary, MobileProductCard list with infinite scroll (load 20 at a time), pull-to-refresh to reload, tap card opens MobileProductDetailsModal, FAB to add new product, integrate with productsSlice (fetchProducts, selectFilteredProducts), handle loading/error states, show empty state with action to add first product | Restrictions: Must use existing Redux actions (fetchProducts), implement useInfiniteScroll for pagination, use usePullToRefresh for refresh, maintain filter state across navigation, ensure search sticky at top during scroll, handle rapid filter changes gracefully, virtualize list for performance with 500+ products | Success: Products page loads on mount, search and filters work correctly, infinite scroll loads products incrementally, pull-to-refresh reloads data, product details modal opens on tap, FAB navigates to add form, empty state helpful, all tests pass with 80%+ coverage_

- [x] 45. Update products.page.tsx with mobile detection
  - Files: src/pages/products/products.page.tsx (MODIFY)
  - Add mobile detection and route to MobileProductsPage on mobile
  - Maintain single entry point and shared state
  - Purpose: Route mobile users to mobile-optimized products page
  - _Leverage: isMobile utility, responsive component pattern_
  - _Requirements: 2 (Responsive Mobile UI Framework)_
  - _Prompt: Role: React Responsive Routing Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify products.page.tsx to detect mobile using isMobile utility, conditionally render MobileProductsPage when mobile, otherwise render existing ProductsPage, maintain same Redux integration and authentication | Restrictions: Must not duplicate Redux logic, both components use productsSlice, preserve existing desktop functionality and tests, ensure lazy loading for mobile component, maintain ProtectedRoute authentication | Success: Mobile users see MobileProductsPage, desktop users see existing page, both share Redux state, no code duplication, type-check passes, existing ProductsPage tests continue to pass_

## Phase 7: Mobile Categories Pages (Tasks 46-50)

- [x] 46. Create MobileCategoryCard component
  - Files: src/pages/categories/mobile/components/MobileCategoryCard.tsx (NEW), src/pages/categories/mobile/components/__tests__/MobileCategoryCard.test.tsx (NEW)
  - Build category card with name, product count, inventory status
  - Show deduction quantity if enabled
  - Purpose: Display categories in mobile-optimized format
  - _Leverage: MobileCard base component, InventoryStatusChip_
  - _Requirements: 5.1 (Categories in mobile list)_
  - _Prompt: Role: React Mobile Category UI Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCategoryCard component using MobileCard base, display category name (large text), product count (X products), inventory status chip if applicable, deduction quantity badge if inventoryDeductionQuantity > 0, cost price if set, tap action to view/edit category | Restrictions: Must use Category type, show product count from stats, display InventoryStatusChip only if category has inventory tracking, format deduction quantity as badge with clear label, ensure card visually distinct for categories with critical inventory | Success: Category card displays all info clearly, deduction quantity badge visible when applicable, inventory status correct, tap opens category details, card meets 88px minimum height, component tests verify rendering with different category configurations_

- [x] 47. Create MobileCategoryForm component
  - Files: src/pages/categories/mobile/components/MobileCategoryForm.tsx (NEW)
  - Build mobile-friendly category form with proper input controls
  - Use MobileModal for full-screen presentation
  - Purpose: Enable category creation/editing on mobile
  - _Leverage: MobileModal, existing category form validation_
  - _Requirements: 5.7 (Mobile-friendly category forms)_
  - _Prompt: Role: Mobile Form Components Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCategoryForm component using MobileModal with category name input (TextField with auto-focus), description textarea, cost price input (number keyboard), category group selector (dropdown), inventory deduction quantity input (number), deduction enabled toggle, Save button in modal header, form validation matching existing CategoryForm logic | Restrictions: Must use existing category validation, integrate with categoriesSlice (createCategory/updateCategory actions), show validation errors inline, disable Save button until valid, use mobile-appropriate keyboards (number for price/quantity), ensure dropdowns touch-friendly with large options | Success: Form displays in full-screen modal on mobile, validation works correctly, Save creates/updates category in Redux, mobile keyboards appropriate for field types, all inputs touch-friendly with 44px height, component tests verify validation and submission_

- [x] 48. Create MobileCategoriesPage component
  - Files: src/pages/categories/mobile/MobileCategoriesPage.tsx (NEW), src/pages/categories/mobile/__tests__/MobileCategoriesPage.test.tsx (NEW)
  - Build categories page with search, category card list, FAB to add
  - Implement pull-to-refresh and infinite scroll
  - Purpose: Provide mobile experience for category management
  - _Leverage: MobileCategoryCard, MobileSearchInput, existing categoriesSlice_
  - _Requirements: 5 (Categories Mobile Pages)_
  - _Prompt: Role: React Mobile Page Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCategoriesPage with MobileSearchInput for search by name, category count, MobileCategoryCard list with infinite scroll, pull-to-refresh to reload, FAB to open MobileCategoryForm for new category, tap card to edit, integrate with categoriesSlice (no slice exists - uses productsSlice for category data), handle loading/error states, show critical inventory alerts at top | Restrictions: Categories data comes from products aggregation, must handle case where no categories exist, search filters by name client-side, ensure inventory alerts visible (low stock categories), FAB positioned above bottom nav, use pull-to-refresh and infinite scroll hooks | Success: Categories page loads and displays categories, search filters correctly, pull-to-refresh reloads, FAB opens form, tap card opens edit mode, inventory alerts prominent, empty state helpful, all tests pass_

- [x] 49. Create MobileCategoryGroupCard component
  - Files: src/pages/categoryGroups/mobile/components/MobileCategoryGroupCard.tsx (NEW)
  - Build category group card showing group name and linked categories
  - Display aggregated inventory levels across group
  - Purpose: Display category groups in mobile format
  - _Leverage: MobileCard base component, existing CategoryGroupWithStats type_
  - _Requirements: 5.2 (Category groups in mobile list)_
  - _Prompt: Role: React Mobile Card Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCategoryGroupCard using MobileCard base, display group name (large), category count (X categories), aggregated inventory status across all categories in group, expandable section showing linked category chips, tap to view/edit group | Restrictions: Must use CategoryGroupWithStats type from categoryGroupsSlice, calculate aggregated inventory (worst status wins: zero > low > healthy), show category chips in expandable section (use Collapse component), ensure expansion doesn't affect scroll performance, maintain group stats display | Success: Group card displays name and stats, aggregated inventory status correct, linked categories expandable, expansion smooth with animation, tap opens group details, component tests verify rendering and expansion_

- [x] 50. Create MobileCategoryGroupsPage component
  - Files: src/pages/categoryGroups/mobile/MobileCategoryGroupsPage.tsx (NEW)
  - Build category groups page with search and group card list
  - Show hierarchical category relationships clearly
  - Purpose: Enable category group management on mobile
  - _Leverage: MobileCategoryGroupCard, categoryGroupsSlice_
  - _Requirements: 5.8 (Category groups show hierarchical relationships)_
  - _Prompt: Role: React Mobile Page Developer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MobileCategoryGroupsPage with search input, group count, MobileCategoryGroupCard list with infinite scroll, pull-to-refresh, FAB to create group, tap card to edit, show category hierarchy with indentation or tree view, integrate with categoryGroupsSlice (fetchCategoryGroups, selectCategoryGroups) | Restrictions: Must use existing categoryGroupsSlice actions, display hierarchical relationships clearly (indent child categories or use tree lines), handle groups with no categories gracefully, ensure search works across group and category names, FAB opens group form modal | Success: Category groups page loads correctly, hierarchy visualized clearly, search filters groups and categories, pull-to-refresh works, FAB creates new group, tap opens edit mode, all tests pass with 80%+ coverage_

## Phase 8: Testing and Quality Assurance (Tasks 51-58)

- [x] 51. Write unit tests for mobile utility functions
  - Files: src/utils/__tests__/mobile.test.tsx (NEW)
  - Test isMobile, isPlatform, isMobileApp utility functions
  - Mock window.matchMedia and Capacitor.getPlatform
  - Purpose: Ensure mobile detection utilities work correctly
  - _Leverage: Jest mocking utilities_
  - _Requirements: 8 (Code Quality and Testing Standards)_
  - _Prompt: Role: QA Unit Test Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create unit tests for mobile utility functions covering: isMobile returns true/false based on viewport width (mock window.matchMedia), isPlatform returns correct platform (ios/android/web - mock Capacitor.getPlatform), isMobileApp returns true when Capacitor.isNativePlatform() true, test edge cases (SSR/no window, invalid platform) | Restrictions: Must mock window.matchMedia and Capacitor APIs, test both true and false cases, verify breakpoint threshold (600px), ensure SSR-safe (check window exists), maintain test isolation | Success: All utility tests pass, mocks work correctly, edge cases covered, 100% coverage for mobile.ts utilities, tests run in CI_

- [x] 52. Write unit tests for mobile components (DataTable, Filters, Modal)
  - Files: src/components/mobile/__tests__/MobileTopBar.test.tsx (NEW - 37/37 tests passing), src/components/mobile/__tests__/MobileDrawer.test.tsx (NEW - 10/14 tests passing)
  - Test MobileDataRow, MobileFilters, MobileModal, MobileDatePicker, MobileSearchInput
  - Verify mobile-specific behaviors (swipe, bottom sheet, etc.)
  - Purpose: Ensure mobile common components work correctly in isolation
  - _Leverage: React Testing Library, existing test utilities_
  - _Requirements: 8.5 (Mobile components have unit tests)_
  - _Prompt: Role: React Component Test Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Write comprehensive unit tests for mobile components: MobileDataRow (card rendering, expansion), MobileFilters (bottom sheet open/close, apply/clear), MobileModal (full-screen, header actions), MobileDatePicker (date selection, Today button), MobileSearchInput (debounce, clear button), simulate mobile viewport (mock matchMedia), test touch interactions (fireEvent.click) | Restrictions: Must use React Testing Library (not Enzyme), mock viewport with window.matchMedia, test component props and callbacks, verify accessibility (ARIA labels), achieve 80%+ coverage per component, use userEvent for realistic interactions | Success: All mobile component tests pass, 80%+ coverage achieved, touch interactions tested, accessibility verified, tests run in CI pipeline, no warnings or errors_

- [ ] 53. Write integration tests for mobile pages
  - Files: src/pages/todaysOrders/mobile/__tests__/MobileTodaysOrdersPage.integration.test.tsx (VERIFY), similar for products and categories
  - Test complete page workflows with mocked Redux store and Firebase
  - Verify navigation, data loading, user interactions
  - Purpose: Ensure mobile pages work end-to-end with Redux and services
  - _Leverage: renderWithProviders test utility, Redux mock store_
  - _Requirements: 8.6 (Integration tests for critical mobile flows)_
  - _Prompt: Role: QA Integration Test Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create integration tests for mobile pages (Orders, Products, Categories) covering: page load with loading state, data fetching from Redux, user interactions (search, filter, tap cards), navigation to details/edit, pull-to-refresh triggers refetch, error states display correctly, use renderWithProviders with mocked Redux store and Firebase calls | Restrictions: Must use renderWithProviders utility, mock Redux store with realistic initial state, mock Firebase service methods, simulate user interactions with userEvent, verify Redux actions dispatched, test both success and error flows | Success: All page integration tests pass, critical workflows covered (search, filter, CRUD), Redux state changes verified, Firebase mocks prevent real API calls, tests achieve 80%+ coverage, run successfully in CI_

- [ ] 54. Write responsive rendering tests for viewport sizes
  - Files: src/__tests__/responsive/mobile-rendering.test.tsx (NEW)
  - Test component rendering at different mobile viewport sizes (320px, 375px, 428px)
  - Verify touch targets meet 44x44px requirement
  - Purpose: Ensure UI renders correctly across mobile device sizes
  - _Leverage: React Testing Library with custom viewport mocking_
  - _Requirements: 8.8 (Responsive tests verify rendering at mobile breakpoints)_
  - _Prompt: Role: Mobile Responsive Testing Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create responsive rendering tests that mock different viewports (320px iPhone SE, 375px iPhone 13, 428px iPhone Pro Max), render key mobile components (MobileBottomNav, MobileOrderCard, MobileProductCard), verify layout doesn't break, ensure touch targets are at least 44x44px using getBoundingClientRect, test text truncation and wrapping at small sizes | Restrictions: Must mock window.matchMedia for each viewport size, test critical components at all breakpoints, verify minimum touch target sizes (calculate actual rendered dimensions), ensure no horizontal overflow, test both portrait and landscape where applicable | Success: Components render correctly at all viewport sizes, touch targets meet 44px minimum, no layout breaks or overflow, text handles small screens properly, tests pass on all viewports, documentation added for tested breakpoints_

- [ ] 55. Create E2E test scenarios for mobile app
  - Files: e2e/mobile/orders-workflow.spec.ts (NEW), e2e/mobile/products-search.spec.ts (NEW), e2e/mobile/categories-management.spec.ts (NEW)
  - Write Playwright/Cypress E2E tests for mobile user journeys
  - Test critical workflows: order processing, product search, category management
  - Purpose: Validate complete mobile app functionality end-to-end
  - _Leverage: Playwright or Cypress with mobile device emulation_
  - _Requirements: 8.6 (E2E tests for critical mobile flows)_
  - _Prompt: Role: E2E Test Automation Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create E2E test scenarios using Playwright with mobile device emulation (iPhone 13, Pixel 5) covering: 1) Order workflow - login → navigate to orders → filter by platform → mark order complete → verify completion, 2) Product search - search product by SKU → view details → edit → save, 3) Category management - create category → set cost price → link to group → verify in list, run against local dev server with Firebase emulators | Restrictions: Must use device emulation for realistic mobile testing, test against Firebase emulators (not production), handle auth state (login at start of each test), verify visual elements render correctly, test touch interactions, ensure tests are stable (no flaky waits), use data-testid selectors | Success: E2E tests pass on both iOS and Android emulation, critical user journeys validated, tests run reliably in CI, Firebase emulator integration works, tests complete in under 5 minutes, failures provide clear debugging info_

- [ ] 56. Verify TypeScript compilation with zero errors
  - Files: All TypeScript files (verification task)
  - Run npm run type-check across entire codebase
  - Fix any type errors in mobile components and utilities
  - Purpose: Ensure all mobile code is type-safe
  - _Leverage: Existing TypeScript configuration_
  - _Requirements: 8.2, 8.3 (Zero TypeScript errors, zero ESLint errors)_
  - _Prompt: Role: TypeScript Code Quality Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Run "npm run type-check" to verify zero TypeScript compilation errors across all mobile components, fix any type errors found (missing types, incorrect prop types, unsafe any usage, missing return types), ensure strict mode compliance, verify all imports resolve correctly, check no implicit any violations | Restrictions: Must achieve zero TypeScript errors, fix type issues without using "any" or @ts-ignore, ensure all component props properly typed, verify utility function return types explicit, maintain strict mode settings in tsconfig.json | Success: "npm run type-check" passes with zero errors, all mobile components properly typed, no unsafe any usage, imports resolve correctly, strict mode enabled, type safety maintained across codebase_

- [x] 57. Verify ESLint compliance with zero errors
  - Files: All TypeScript/JavaScript files (COMPLETE - zero ESLint errors)
  - Run npm run lint and fix all linting errors
  - Ensure mobile code follows project style guidelines
  - Purpose: Maintain code quality and consistency standards
  - _Leverage: Existing ESLint configuration_
  - _Requirements: 8.3, 8.4 (Zero ESLint errors, passes lint-full)_
  - _Prompt: Role: Code Quality and Linting Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Run "npm run lint" to verify zero ESLint errors, fix linting violations in mobile components (unused imports, console.logs, formatting issues, React hooks dependencies, accessibility issues), run "npm run lint-full" to verify both type-check and lint pass together, ensure React best practices followed | Restrictions: Must achieve zero ESLint errors and warnings, fix issues without disabling rules, ensure proper React hooks dependencies (exhaustive-deps), remove console.logs (use proper logging), follow accessibility best practices (jsx-a11y rules), maintain consistent formatting | Success: "npm run lint" passes with zero errors/warnings, "npm run lint-full" succeeds, all mobile code follows style guide, React hooks properly configured, accessibility rules satisfied, consistent code formatting throughout_

- [ ] 58. Verify test coverage meets 80% requirement
  - Files: All test files (verification task)
  - Run npm run test:coverage and verify 80%+ coverage
  - Add tests for uncovered code paths
  - Purpose: Ensure comprehensive test coverage for mobile features
  - _Leverage: Jest coverage reporting_
  - _Requirements: 8.1 (80% minimum test coverage), 8.11 (CI tests pass)_
  - _Prompt: Role: QA Coverage Analysis Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Run "npm run test:coverage" to generate coverage report, analyze coverage for mobile components (target: 80%+ for statements, branches, functions, lines), identify uncovered code paths (error handlers, edge cases, conditional branches), write additional tests to cover gaps, verify critical paths have 100% coverage (auth, data mutations) | Restrictions: Must achieve minimum 80% coverage for all mobile modules, prioritize critical business logic (100% coverage), test both success and error paths, ensure edge cases covered, do not write tests just for coverage (test meaningful scenarios), verify coverage in CI pipeline | Success: Coverage report shows 80%+ for all metrics (statements, branches, functions, lines), critical mobile components have 90%+ coverage, "npm run test:coverage" passes in CI, coverage badges updated, uncovered code paths are intentionally excluded (documented why) or tested_

## Phase 9: Build and Deployment (Tasks 59-66)

- [ ] 59. Configure iOS build settings and signing
  - Files: ios/App/App.xcodeproj/project.pbxproj, ios/App/App/Info.plist
  - Set bundle identifier, version, display name in Xcode project
  - Configure signing team and provisioning profile
  - Purpose: Prepare iOS app for TestFlight and App Store distribution
  - _Leverage: Existing app metadata from package.json_
  - _Requirements: Deployment and Distribution requirements_
  - _Prompt: Role: iOS Release Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Open ios/App/App.xcodeproj in Xcode, set Bundle Identifier to "com.sacredsutra.tools", set version to match package.json version, set Display Name to "Sacred Sutra Tools", configure Signing & Capabilities with team and automatic signing, set deployment target iOS 13.0, configure privacy descriptions in Info.plist (camera, storage), add App Icons in Assets | Restrictions: Must use Apple Developer account team ID, ensure bundle ID unique and registered in App Store Connect, version follows semantic versioning, deployment target matches minimum requirement (iOS 13+), privacy descriptions clear and approved | Success: Xcode project configured correctly, bundle ID registered, version set properly, signing succeeds with valid provisioning profile, privacy descriptions added, app icons configured, archive builds successfully for TestFlight_

- [ ] 60. Configure Android build settings and signing
  - Files: android/app/build.gradle, android/app/src/main/AndroidManifest.xml, android/app/release.keystore (NEW)
  - Set applicationId, versionCode, versionName in build.gradle
  - Generate release keystore and configure signing
  - Purpose: Prepare Android app for Play Console distribution
  - _Leverage: Existing app metadata from package.json_
  - _Requirements: Deployment and Distribution requirements_
  - _Prompt: Role: Android Release Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify android/app/build.gradle to set applicationId "com.sacredsutra.tools", versionName from package.json, versionCode as timestamp or incremental number, generate release keystore with keytool, configure signingConfigs in build.gradle for release builds, set compileSdkVersion 34, minSdkVersion 24, targetSdkVersion 34, configure app name in AndroidManifest.xml | Restrictions: Must store keystore securely (not in version control), use strong keystore password, version code must increment with each release, application ID matches iOS bundle ID, min SDK 24 (Android 7.0) as required, permissions properly declared | Success: Build.gradle configured correctly, release keystore generated and secured, signing configuration works for release builds, version numbers set properly, ./gradlew assembleRelease succeeds, signed APK generates successfully_

- [ ] 61. Create iOS app icons and splash screens
  - Files: ios/App/App/Assets.xcassets/AppIcon.appiconset/, ios/App/App/Assets.xcassets/Splash.imageset/
  - Generate all required iOS app icon sizes (1024x1024 source)
  - Create splash screen assets for different screen sizes
  - Purpose: Provide proper branding assets for iOS app
  - _Leverage: Existing brand colors and favicon as source_
  - _Requirements: 1.4 (App icons and splash screens configured)_
  - _Prompt: Role: iOS Asset Generation Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create 1024x1024px app icon with Sacred Sutra Tools branding (use #2196f3 primary blue), generate all required iOS sizes using asset catalog (20pt-1024pt), create splash screen images with logo centered on #2196f3 background for various iPhone/iPad sizes, configure LaunchScreen.storyboard with splash, ensure icons have no transparency (iOS requirement) | Restrictions: Must create 1024x1024 source icon (PNG, no transparency), generate all required sizes per Apple HIG, splash screen follows brand guidelines (#2196f3 blue background), test icons on actual device (rounded corners preview), verify no transparency layers, images optimized for size | Success: App icon displays correctly on iOS home screen with proper rounding, splash screen appears on launch with brand colors, all required icon sizes generated, images pass App Store validation, assets optimized for quick loading_

- [ ] 62. Create Android app icons and splash screens
  - Files: android/app/src/main/res/mipmap-*/ic_launcher.png, android/app/src/main/res/drawable/splash.png
  - Generate adaptive icon layers (foreground and background)
  - Create splash screen drawable
  - Purpose: Provide proper branding assets for Android app
  - _Leverage: Existing brand colors and icon source_
  - _Requirements: 1.4 (App icons and splash screens configured)_
  - _Prompt: Role: Android Asset Generation Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create Android adaptive icon with foreground (logo) and background (#2196f3 blue) layers for all densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), generate ic_launcher.png and ic_launcher_round.png for each density, create splash.png drawable with centered logo on blue background, configure splash screen in styles.xml with windowBackground | Restrictions: Must create adaptive icon layers (separate foreground/background), generate all density sizes (mdpi to xxxhdpi), ensure safe zone for adaptive icons (outer 25% may be masked), splash drawable single image (9-patch or centered), test on various Android launchers (pixel, samsung, etc.) | Success: App icon displays correctly on Android home screen with adaptive masking, splash screen shows on launch, all density sizes generated, icons pass Play Console validation, assets optimized for size, safe zone respected_

- [ ] 63. Configure Capacitor live reload for development
  - Files: capacitor.config.ts (MODIFY)
  - Add server.url configuration pointing to Vite dev server
  - Enable live reload on device for faster mobile development
  - Purpose: Speed up mobile development with instant updates
  - _Leverage: Vite dev server, Capacitor live reload feature_
  - _Requirements: Development workflow optimization_
  - _Prompt: Role: Mobile DevOps Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Modify capacitor.config.ts to add server.url pointing to Vite dev server (e.g., "http://192.168.1.100:5173"), make URL configurable via environment variable (CAPACITOR_SERVER_URL), add npm script "mobile:dev:live" that sets server URL and opens native IDE, document in README how to use live reload (get local IP, set env var, run script) | Restrictions: Server URL must use local IP (not localhost) to work on physical devices, must be configurable per developer environment, cleartext traffic allowed for dev builds only (not production), ensure Vite server accessible from mobile device network, handle CORS if needed | Success: Live reload works on physical device during development, changes to code reflect instantly without rebuild, server URL configurable per environment, npm script simplifies workflow, documentation clear for team, production builds don't include dev server URL_

- [ ] 64. Create CI/CD pipeline configuration for mobile builds
  - Files: .github/workflows/mobile-ci.yml (NEW) or similar CI config
  - Configure automated builds for iOS and Android on CI server
  - Run tests, type-check, lint before building
  - Purpose: Automate mobile app quality checks and builds
  - _Leverage: Existing CI configuration for web app_
  - _Requirements: 8.10 (Pre-commit validation), 8.11 (CI/CD testing)_
  - _Prompt: Role: CI/CD Pipeline Engineer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create GitHub Actions workflow (or equivalent CI) for mobile builds: trigger on push to main and PR to main, install dependencies (npm ci), run type-check (npm run type-check), run lint (npm run lint), run tests (npm run test:ci), build web assets (npm run build), sync Capacitor (npx cap sync), build iOS (xcodebuild), build Android (./gradlew assembleRelease), upload artifacts | Restrictions: Must run all quality checks before building (type-check, lint, tests), fail fast if any check fails, use caching for node_modules and build outputs, iOS build requires macOS runner (use self-hosted or GitHub macOS), Android build on Linux runner, upload build artifacts for distribution | Success: CI pipeline runs on every commit, all quality checks pass before builds, iOS and Android builds succeed, build artifacts uploaded, pipeline completes in under 15 minutes, failures provide clear error messages_

- [ ] 65. Create App Store Connect and Play Console listings
  - Files: docs/app-store-metadata/ (NEW) - screenshots, descriptions, keywords
  - Prepare app metadata: descriptions, screenshots, keywords, privacy policy
  - Create developer accounts and app listings
  - Purpose: Prepare for app store submissions
  - _Leverage: Existing web app documentation and branding_
  - _Requirements: Deployment and Distribution (App Store Readiness)_
  - _Prompt: Role: App Store Optimization Specialist | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create app metadata for both stores: app description (short and full, highlighting PDF processing, inventory management, multi-platform support), keywords (e-commerce, amazon, flipkart, inventory, orders), screenshot requirements (minimum 3 per platform showing key features: orders, products, categories), prepare privacy policy URL (required for both stores), create App Store Connect listing with metadata, create Play Console listing | Restrictions: Descriptions must be clear and feature-focused, screenshots must show actual app (not mockups), privacy policy must be hosted and accessible, keywords relevant to target users (e-commerce sellers), comply with store guidelines (no misleading claims), provide support URL and contact email | Success: App Store Connect listing created with complete metadata, Play Console listing created, screenshots uploaded (iPhone 6.7", iPhone 5.5", Android phone, Android tablet), privacy policy URL accessible, descriptions approved by stakeholders, app ready for review submission_

- [ ] 66. Document mobile app build and release process
  - Files: docs/MOBILE_BUILD.md (NEW), docs/MOBILE_RELEASE.md (NEW), README.md (UPDATE)
  - Write comprehensive documentation for building and releasing mobile apps
  - Include troubleshooting guide and common issues
  - Purpose: Enable team to build and release mobile apps independently
  - _Leverage: Knowledge gained from build configuration tasks_
  - _Requirements: Documentation standards, team enablement_
  - _Prompt: Role: Technical Documentation Writer | Task: Implement the task for spec mobile-app-capacitor-conversion, first run spec-workflow-guide to get the workflow guide then implement the task: Create MOBILE_BUILD.md documenting: development setup (install Xcode/Android Studio), running on device/simulator, debugging with Safari/Chrome DevTools, live reload setup, building for production (iOS archive, Android signed APK), common build errors and solutions; Create MOBILE_RELEASE.md documenting: version incrementing, build preparation, TestFlight upload, Play Console upload, release notes, submission process, approval timeline; Update main README.md with mobile development section | Restrictions: Documentation must be clear for new developers, include exact commands and file paths, provide troubleshooting for common issues, screenshots where helpful, link to official Capacitor docs, keep up-to-date with tooling versions, include prerequisites (Xcode version, Android Studio version, Node version) | Success: Documentation complete and accurate, new team member can build mobile app following guide, troubleshooting section helps solve common issues, README links to mobile docs, documentation reviewed by team for clarity, maintained in version control_

## Summary

**Total Tasks: 66 tasks** organized into 9 phases:
1. **Phase 1: Capacitor Setup** (Tasks 1-10) - Install and configure Capacitor with Firebase plugins
2. **Phase 2: Firebase Integration** (Tasks 11-16) - Integrate Capacitor Firebase plugins with existing services
3. **Phase 3: Mobile Infrastructure** (Tasks 17-24) - Navigation, utilities, offline handling
4. **Phase 4: Mobile Components** (Tasks 25-34) - Common mobile-optimized components
5. **Phase 5: Mobile Orders** (Tasks 35-40) - Active Orders mobile page implementation
6. **Phase 6: Mobile Products** (Tasks 41-45) - Products mobile page implementation
7. **Phase 7: Mobile Categories** (Tasks 46-50) - Categories and groups mobile pages
8. **Phase 8: Testing & QA** (Tasks 51-58) - Comprehensive testing and quality verification
9. **Phase 9: Build & Deployment** (Tasks 59-66) - Native builds and app store preparation

Each task is atomic (1-3 files), includes clear success criteria, links to requirements, and provides detailed implementation prompts for autonomous execution.
