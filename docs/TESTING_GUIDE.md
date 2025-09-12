# Testing Guide

This document outlines the testing strategy and commands available in the Sacred Sutra Tools project.

## Test Commands Overview

### Development Commands
- **`npm test`** - Run tests in interactive mode
- **`npm run test:watch`** - Run tests in watch mode for development
- **`npm run test:coverage`** - Run all tests with coverage report
- **`npm run test:watch:coverage`** - Run tests with coverage in watch mode

### CI/CD Optimized Commands
- **`npm run test:ci`** - Full test suite for PR validation (no watch mode)
- **`npm run test:critical`** - Core functionality tests (~40% of suite, <1 minute)
- **`npm run test:smoke`** - Basic app functionality validation (<30 seconds)
- **`npm run test:fast`** - Combination of critical + smoke tests
- **`npm run test:related`** - Tests related to changed files (git-aware)
- **`npm run test:changed`** - Tests for changed files only

### Specialized Commands
- **`npm run test:storage-rules`** - Firebase storage rules testing with emulators

## When to Use Which Command

### Pull Request Workflow
```bash
npm run test:ci
```
**Usage**: Comprehensive testing for PR validation  
**Time**: ~2-3 minutes  
**Coverage**: All tests (52+ test files)  
**Purpose**: Ensure no regressions before merge

### Master Branch Push
```bash
npm run test:fast
```
**Usage**: Quick validation after merge  
**Time**: <1 minute  
**Coverage**: Critical path + smoke tests  
**Purpose**: Fast feedback for deployment pipeline

### Release Builds
```bash
npm run test:coverage
```
**Usage**: Quality assurance for releases  
**Time**: ~3-4 minutes  
**Coverage**: All tests + coverage reporting  
**Purpose**: Maximum confidence for production releases

### Development Workflow
```bash
npm run test:watch
```
**Usage**: Local development with real-time feedback  
**Coverage**: Related to changed files  
**Purpose**: Continuous feedback during development

### Pre-commit Hooks
```bash
npm run test:related
```
**Usage**: Automatically run via lint-staged  
**Coverage**: Only tests related to staged files  
**Purpose**: Quick validation before commit

### Post-deployment Validation
```bash
npm run test:smoke
```
**Usage**: Validate deployment health  
**Time**: <30 seconds  
**Coverage**: App bootstrap and critical user flows  
**Purpose**: Ensure deployment didn't break basic functionality

## Test Categories

### Critical Tests (~40% of suite)
Focus on core business functionality:
- **Authentication**: `authSlice.test.ts`, `ProtectedRoute.test.tsx`
- **Core Services**: `product.service.test.ts`, `costPrice.service.test.ts`
- **PDF Processing**: `TrasformAmazonPages.test.ts`, `pdfConsolidation.service.test.ts`
- **State Management**: All `store/slices/**/*.test.ts`

### Smoke Tests (<5% of suite)
Basic application health:
- **App Bootstrap**: `App.test.tsx`
- **Core Routing**: Basic navigation tests
- **Essential Services**: Basic service connectivity

### Feature Tests (~55% of suite)
Specific feature functionality:
- **Components**: UI behavior and rendering
- **Pages**: Page-specific logic and integration
- **Utils**: Helper functions and utilities
- **Analytics**: Reporting and data analysis features

## Configuration Files

### `jest.config.cjs`
Main Jest configuration with performance optimizations:
- 75% worker utilization
- Test result caching
- CI-specific optimizations (bail on first failure)

### `jest.critical.config.cjs`
Optimized for critical functionality testing:
- Focused test patterns
- 50% worker utilization for speed
- Shorter timeout (15s)

### `jest.smoke.config.cjs`
Minimal configuration for smoke tests:
- Only basic functionality tests
- Fastest execution (10s timeout)
- Minimal coverage requirements

## Performance Optimizations

### Caching Strategy
- **Jest cache**: Enabled with dedicated cache directories
- **Transform cache**: Babel transformations cached
- **Module resolution**: Optimized module mapping

### Parallel Execution
- **Full suite**: 75% of available workers
- **Critical tests**: 50% of available workers
- **Smoke tests**: Optimized for minimal resource usage

### Smart Test Selection
- **Git integration**: `--findRelatedTests` for changed files
- **Pattern matching**: Focused test patterns for specific scenarios
- **Bail strategies**: Stop on first failure in CI environments

## Best Practices

### For Developers
1. Use `npm run test:watch` during development
2. Run `npm run test:critical` for quick validation
3. Use `npm run test:coverage` before submitting PRs
4. Leverage `npm run test:related` for focused testing

### For CI/CD
1. **PRs**: Use comprehensive testing (`test:ci`)
2. **Master**: Use fast testing (`test:fast`) for deployment pipeline
3. **Releases**: Use coverage testing (`test:coverage`)
4. **Post-deployment**: Use smoke testing (`test:smoke`)

### Writing Tests
1. Follow existing patterns in `__tests__` directories
2. Mock external dependencies (Firebase, PDF-lib)
3. Use descriptive test names and organize by functionality
4. Maintain 60%+ coverage threshold
5. Consider test execution time and optimization opportunities

## Troubleshooting

### Slow Test Execution
- Check test patterns to avoid running unnecessary tests
- Use `test:critical` for faster feedback during development
- Ensure Jest cache is not corrupted (`rm -rf node_modules/.cache/jest`)

### Memory Issues
- Some tests are marked with `.skip` to prevent memory issues
- Increase Node.js memory if needed: `--max-old-space-size=4096`
- Use focused test execution patterns

### CI/CD Issues
- Verify correct test command is used for each workflow stage
- Check that artifacts and dependencies are properly cached
- Ensure environment variables are set correctly

## Monitoring and Metrics

### Coverage Reports
Available in `coverage/` directory after running `npm run test:coverage`
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Data**: `coverage/lcov.info`

### Performance Tracking
Monitor test execution times:
- **Full suite**: Target <3 minutes
- **Critical tests**: Target <1 minute  
- **Smoke tests**: Target <30 seconds

### Quality Gates
- **Coverage**: Minimum 60% for all metrics
- **Test Success**: 100% pass rate required for deployment
- **Performance**: Test execution time monitoring