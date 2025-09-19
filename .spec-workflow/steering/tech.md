# Technology Stack

## Project Type
Single-page web application (SPA) with Progressive Web App (PWA) capabilities for e-commerce order management and inventory tracking across Amazon and Flipkart platforms.

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript 5.7.3 with strict mode enabled
- **Runtime/Compiler**: Node.js 22.16.0 with ES modules (ESNext target)
- **Language-specific tools**: npm 11.4.1, Babel for Jest transforms, ESLint 9.17.0 for static analysis

### Key Dependencies/Libraries
- **React 18**: Modern UI library with concurrent features and strict mode
- **Material-UI (MUI) 6.1.9**: Comprehensive design system with emotion-based styling
- **Redux Toolkit 2.8.1**: State management with Redux Persist for selective data persistence
- **Firebase 11.6.1**: Backend-as-a-Service for authentication, Firestore database, and cloud storage
- **PDF-lib 1.17.1**: Client-side PDF manipulation and generation
- **PDFjs-dist 2.16.105**: PDF parsing and text extraction for invoice processing
- **React Router DOM 7.1.1**: Client-side routing with nested routes
- **React Hook Form 7.56.4**: Performant form handling with validation
- **Recharts 2.15.3**: Data visualization and analytics charts
- **Vite 6.3.2**: Build tool with hot module replacement and optimized bundling

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
- **Testing Framework**: Jest with React Testing Library, jsdom environment, and coverage reporting
- **Performance**: Vite build analysis, Firebase emulator performance testing, memory leak detection tests

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
- **Target Platform(s)**: Web browsers (Chrome, Firefox, Safari, Edge) with PWA support for mobile devices
- **Distribution Method**: GitHub Pages static hosting with automated deployment from master branch
- **Installation Requirements**: Modern web browser with JavaScript enabled, internet connection for Firebase
- **Update Mechanism**: Browser cache invalidation with service worker updates for PWA features

## Technical Requirements & Constraints

### Performance Requirements
- **Response time**: <2 seconds for dashboard queries, <5 minutes for PDF batch processing
- **Memory usage**: Efficient handling of large PDF files with chunked processing
- **Startup time**: <3 seconds initial load with code splitting and lazy loading
- **PDF Processing**: Support for 100+ page documents with progress tracking

### Compatibility Requirements  
- **Platform Support**: Modern browsers (ES2020+), responsive design for desktop/tablet/mobile
- **Dependency Versions**: Node.js 22+, Firebase SDK 11+, TypeScript 5.7+
- **Standards Compliance**: Web Content Accessibility Guidelines (WCAG), PWA manifest standards

### Security & Compliance
- **Security Requirements**: Firebase Authentication with secure rules, client-side data validation
- **Data Protection**: Firestore security rules for multi-tenant data isolation
- **PDF Security**: Client-side processing to avoid server-side file exposure
- **Storage Security**: Firebase Storage rules with user-based access controls

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

## Known Limitations

- **PDF Processing Memory**: Large PDF files (>50MB) may cause browser memory issues - mitigated through chunked processing and progress indicators
- **Offline Functionality**: Limited offline capabilities for PDF processing - Firebase offline persistence covers data operations but file uploads require connectivity  
- **Mobile PDF Handling**: Mobile browsers have reduced PDF processing performance - optimization needed for mobile-first workflows
- **Concurrent Editing**: No real-time collaborative editing for inventory adjustments - future enhancement for multi-user scenarios
- **Export Scalability**: Large dataset exports (>10k records) may timeout - chunked export implementation needed for enterprise usage