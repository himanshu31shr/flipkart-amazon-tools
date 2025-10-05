# Technology Stack

## Project Type
Cross-platform application supporting web browsers and native mobile platforms (iOS/Android). Web application is a single-page application (SPA) with Progressive Web App (PWA) capabilities. Mobile applications use Capacitor 6 hybrid architecture (native container + WebView) for 95%+ code reuse from the web codebase.

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript 5.7.3 with strict mode enabled
- **Runtime/Compiler**: Node.js 22.16.0 with ES modules (ESNext target)
- **Language-specific tools**: npm 11.4.1, Babel for Jest transforms, ESLint 9.17.0 for static analysis

### Key Dependencies/Libraries
- **React 18**: Modern UI library with concurrent features and strict mode
- **Material-UI (MUI) 6.1.9**: Comprehensive design system with emotion-based styling and responsive breakpoints
- **Redux Toolkit 2.8.1**: State management with Redux Persist for selective data persistence
- **Firebase 11.6.1**: Backend-as-a-Service for authentication, Firestore database, and cloud storage
- **@capacitor-firebase/* plugins**: Native Firebase SDKs for mobile (authentication, firestore, storage)
- **Capacitor 6**: Hybrid mobile framework for native iOS/Android apps with WebView-based web content
- **PDF-lib 1.17.1**: Client-side PDF manipulation and generation
- **PDFjs-dist 2.16.105**: PDF parsing and text extraction for invoice processing
- **React Router DOM 7.1.1**: Client-side routing with nested routes
- **React Hook Form 7.56.4**: Performant form handling with validation
- **Recharts 2.15.3**: Data visualization and analytics charts
- **Vite 6.3.2**: Build tool with hot module replacement and optimized bundling
- **Playwright**: End-to-end testing with device emulation for mobile testing

### Application Architecture
**Component-Based Architecture** with Redux state management:
- **Presentation Layer**: React functional components with Material-UI design system
- **State Management**: Redux Toolkit slices with middleware for cross-cutting concerns
- **Business Logic**: Service layer with Firebase integration and PDF processing utilities
- **Data Layer**: Firestore NoSQL database with real-time subscriptions and offline persistence
- **File Processing**: Client-side PDF parsing with background processing for large files

### Data Storage
- **Primary storage**: Google Firestore (NoSQL document database) with real-time synchronization
- **Caching**: Redux Persist for inventory state, Firestore offline persistence for production
- **File Storage**: Firebase Cloud Storage with organized folder structure and metadata tracking
- **Data formats**: JSON documents in Firestore, PDF files in cloud storage, CSV export/import

### External Integrations
- **APIs**: Firebase REST APIs, GitHub Pages deployment API
- **Protocols**: WebSocket for real-time Firestore updates, HTTPS for all external communication
- **Authentication**: Firebase Authentication with email/password and optional social providers
- **PDF Processing**: Client-side parsing of Amazon/Flipkart invoice formats with platform-specific extractors

### Monitoring & Dashboard Technologies
- **Dashboard Framework**: React SPA with Material-UI components and responsive design
- **Real-time Communication**: Firestore real-time listeners for inventory updates and system alerts
- **Visualization Libraries**: Recharts for analytics dashboards, MUI data grid for inventory tables
- **State Management**: Redux with persistence for dashboard preferences and cached data

## Development Environment

### Build & Development Tools
- **Build System**: Vite with TypeScript compilation, tree-shaking, and code splitting
- **Package Management**: npm with lock file for reproducible builds and Volta for Node.js version management
- **Development workflow**: Hot module replacement, Firebase emulators for local development, concurrent dev/seed scripts
- **Bundle Optimization**: Manual chunk splitting for vendor libraries (React, MUI, Firebase, PDF processing)

### Code Quality Tools
- **Static Analysis**: TypeScript strict mode, ESLint with React and TypeScript rules
- **Formatting**: ESLint auto-fix with consistent code style enforcement
- **Testing Framework**: Jest with React Testing Library, jsdom environment, coverage reporting, and mobile viewport testing
- **End-to-End Testing**: Playwright with device emulation for web and mobile user flows
- **Performance**: Vite build analysis, Firebase emulator performance testing, memory leak detection tests, mobile performance profiling
- **Mobile Build Tools**: Xcode 15+ (iOS), Android Studio Iguana+ (Android), CocoaPods (iOS dependencies)

### Version Control & Collaboration
- **VCS**: Git with GitHub hosting and GitHub Pages deployment
- **Branching Strategy**: Feature branches with pull request workflow
- **Code Review Process**: GitHub pull requests with automated CI checks
- **Release Management**: Changesets for semantic versioning and automated changelog generation

### Dashboard Development
- **Live Reload**: Vite HMR with React Fast Refresh for instant UI updates
- **Port Management**: Configurable ports with fallback (Vite: 5173, Emulators: 8080/9099/9199)
- **Multi-Instance Support**: Firebase emulator isolation for concurrent development sessions

## Deployment & Distribution
- **Target Platform(s)**:
  - Web: Modern browsers (Chrome, Firefox, Safari, Edge) with PWA support
  - Mobile: iOS 13+ (native app), Android 7.0+ / API 24+ (native app)
- **Distribution Method**:
  - Web: GitHub Pages static hosting with automated deployment from master branch
  - iOS: Apple App Store distribution (TestFlight for beta testing)
  - Android: Google Play Store distribution (internal testing track for beta)
- **Installation Requirements**:
  - Web: Modern web browser with JavaScript enabled, internet connection for Firebase
  - Mobile: iOS 13+ or Android 7.0+ device, approximately 50MB storage space
- **Update Mechanism**:
  - Web: Browser cache invalidation with service worker updates for PWA features
  - Mobile: Over-the-air web content updates via Capacitor Live Updates, native app updates via App Store/Play Store for plugin/SDK updates

## Technical Requirements & Constraints

### Performance Requirements
- **Response time**: <2 seconds for dashboard queries on web and mobile, <5 minutes for PDF batch processing
- **Memory usage**: Efficient handling of large PDF files with chunked processing (<150MB on mobile)
- **Startup time**: <3 seconds initial load on web and mobile with code splitting and lazy loading
- **PDF Processing**: Support for 100+ page documents with progress tracking
- **Mobile Performance**: 60fps navigation transitions, <300ms page transitions, <1 second list rendering for initial viewport
- **Bundle Size**: Mobile app bundle <5MB (excluding cached data) for fast downloads

### Compatibility Requirements
- **Platform Support**:
  - Web: Modern browsers (ES2020+), responsive design for desktop/tablet/mobile
  - Mobile: iOS 13+ (WKWebView), Android 7.0+ / API 24+ (Chrome WebView)
- **Dependency Versions**: Node.js 22+, Firebase SDK 11+, TypeScript 5.7+, Capacitor 6+
- **Standards Compliance**: Web Content Accessibility Guidelines (WCAG), PWA manifest standards, iOS Human Interface Guidelines, Material Design for Android
- **Screen Sizes**: 320px (iPhone SE) to 428px (iPhone Pro Max) width, responsive breakpoints at xs/sm/md

### Security & Compliance
- **Security Requirements**: Firebase Authentication with secure rules, client-side data validation
- **Data Protection**: Firestore security rules for multi-tenant data isolation
- **PDF Security**: Client-side processing to avoid server-side file exposure
- **Storage Security**: Firebase Storage rules with user-based access controls
- **Mobile Security**: Capacitor SecureStorage for sensitive tokens, HTTPS/WSS only for network communication, platform-level permissions (camera for barcode scanning)

### Scalability & Reliability
- **Expected Load**: 1000+ products, 100+ daily orders, multi-user concurrent access
- **Availability Requirements**: 99.9% uptime through Firebase infrastructure
- **Growth Projections**: Horizontal scaling through Firestore collections and Firebase Storage

## Technical Decisions & Rationale

### Decision Log
1. **Client-Side PDF Processing**: Chosen for security and scalability - no server infrastructure needed, user data stays local during processing, reduces backend complexity and costs
2. **Firebase as Backend**: Selected for real-time capabilities, automatic scaling, and integrated authentication - eliminates need for custom backend development while providing enterprise-grade reliability
3. **Redux Toolkit over Context API**: Required for complex state interactions between inventory, orders, and analytics - provides time-travel debugging, middleware support, and predictable state updates
4. **Material-UI over Custom CSS**: Accelerates development with consistent design system, accessibility features, and responsive components - reduces design debt and maintenance overhead
5. **Vite over Create React App**: Superior development experience with faster builds, better tree-shaking, and native ESM support - reduces build times by 80% compared to Webpack-based solutions

## Mobile Architecture

### Capacitor Hybrid Approach
- **Native Container + WebView**: iOS and Android apps embed web content in native WKWebView/Chrome WebView
- **Code Reuse**: 95%+ of React/TypeScript codebase shared between web and mobile platforms
- **Native Features**: Access to device camera (barcode scanning), secure storage, native navigation, offline persistence
- **Platform Detection**: Runtime detection using Capacitor.isNativePlatform() to conditionally use native plugins vs web APIs

### Mobile-Specific Technologies
- **Firebase Integration**: @capacitor-firebase/authentication, @capacitor-firebase/firestore, @capacitor-firebase/storage for native Firebase SDKs
- **Navigation**: Bottom navigation bars and platform-specific back button handling
- **Responsive UI**: Material-UI breakpoints (useMediaQuery, theme.breakpoints.down('sm')) for mobile detection
- **Offline Support**: Firestore offline persistence with queue-based synchronization for connectivity loss scenarios
- **Performance**: Lazy loading, code splitting, skeleton screens for optimal mobile performance

### Mobile Testing Requirements
- **Unit Testing**: 80% minimum coverage for mobile components with responsive viewport testing (320px, 375px, 428px)
- **Integration Testing**: Multi-component flows (order management, product search, category management)
- **E2E Testing**: Playwright with device emulation for critical user journeys
- **Device Testing**: Minimum 3 physical devices per platform (low/mid/high-end) for real-world validation
- **Quality Gates**: Zero TypeScript errors (npm run type-check), zero ESLint errors (npm run lint), all tests pass (npm run test:ci)

## Known Limitations

- **PDF Processing Memory**: Large PDF files (>50MB) may cause browser/mobile memory issues - mitigated through chunked processing and progress indicators
- **Offline Functionality**: Limited offline capabilities for PDF processing - Firebase offline persistence covers data operations but file uploads require connectivity
- **Mobile PDF Handling**: Mobile devices have reduced PDF processing performance compared to desktop - mobile app prioritizes order/inventory management over heavy PDF processing
- **Concurrent Editing**: No real-time collaborative editing for inventory adjustments - future enhancement for multi-user scenarios
- **Export Scalability**: Large dataset exports (>10k records) may timeout - chunked export implementation needed for enterprise usage
- **Mobile Camera Access**: Barcode scanning requires camera permissions - graceful fallback to manual entry if permission denied