# E2E Tests for Sacred Sutra Tools Mobile App

This directory contains End-to-End (E2E) tests for the mobile application using Playwright. These tests validate critical user flows on real mobile devices and browsers.

## 📋 Overview

The E2E test suite covers:
- **Mobile Products Page**: Product listing, search, filtering, infinite scroll
- **Mobile Today's Orders Page**: Order management, batch filtering, date selection
- **Responsive Behavior**: Tests across 3 viewport sizes (320px, 375px, 428px)
- **Accessibility**: Touch targets, keyboard navigation, ARIA labels
- **Performance**: Page load times, scroll performance, layout stability

## 🚀 Running E2E Tests

### Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run only mobile device tests
npm run test:e2e:mobile

# Debug tests interactively
npm run test:e2e:debug
```

### CI/CD Integration

```bash
# Run tests in CI mode (no browser UI, with retries)
npx playwright test --config=playwright.config.ts
```

## 📱 Test Coverage

### Mobile Products Page (`mobile-products.spec.ts`)

**Critical User Flows (8 tests)**:
- ✅ Display products list on mobile
- ✅ Search products using search bar
- ✅ Filter products by platform (Amazon/Flipkart)
- ✅ Open product details modal
- ✅ Navigate to add product page
- ✅ Pull-to-refresh gesture
- ✅ Infinite scroll loading
- ✅ Empty state handling

**Responsive Behavior (3 tests)**:
- ✅ iPhone SE (320px width)
- ✅ iPhone 12 (390px width)
- ✅ Large phones (428px width)

**Accessibility (2 tests)**:
- ✅ Touch target sizes (44x44 minimum)
- ✅ Keyboard navigation support

**Performance (2 tests)**:
- ✅ Page load time (<5 seconds)
- ✅ No layout shift during render

**Total: 15 tests**

### Mobile Today's Orders Page (`mobile-todays-orders.spec.ts`)

**Critical Flows (8 tests)**:
- ✅ Display orders page
- ✅ Filter orders by platform
- ✅ Expand/collapse batch accordions
- ✅ Display order details within batch
- ✅ Mark order as complete
- ✅ Navigate to barcode scanner
- ✅ Pull-to-refresh gesture
- ✅ Empty state when no orders

**Date Selection (1 test)**:
- ✅ Change selected date via date picker

**Responsive Layout (3 tests)**:
- ✅ Small screens (320px)
- ✅ Medium screens (375px)
- ✅ Large screens (428px)

**Performance (2 tests)**:
- ✅ Fast page load (<5 seconds)
- ✅ Smooth scrolling with large lists

**Accessibility (2 tests)**:
- ✅ Keyboard-accessible accordions
- ✅ Proper ARIA labels

**Total: 16 tests**

## 🎯 Test Device Matrix

Tests run on the following emulated devices:

| Device | Viewport | Platform | Purpose |
|--------|----------|----------|---------|
| Desktop Chrome | 1920x1080 | Desktop | Baseline compatibility |
| iPhone SE | 375x667 | iOS | Small screen testing |
| iPhone 12 | 390x844 | iOS | Standard iPhone |
| iPhone 14 Pro Max | 430x932 | iOS | Large screen testing |
| Pixel 5 | 393x851 | Android | Android validation |

## 🔍 Test Patterns

### Mobile Device Detection

```typescript
test('should do something on mobile', async ({ page, isMobile }) => {
  if (!isMobile) {
    test.skip(); // Skip on desktop
    return;
  }
  // Mobile-specific test logic
});
```

### Viewport Size Testing

```typescript
test('should render on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/products');
  // Assertions
});
```

### Touch Gesture Simulation

```typescript
// Pull-to-refresh
await page.mouse.move(200, 100);
await page.mouse.down();
await page.mouse.move(200, 300, { steps: 10 });
await page.mouse.up();
```

### Accessibility Validation

```typescript
// Touch target size validation
const button = page.getByLabel('Add product');
const box = await button.boundingBox();
expect(box?.width).toBeGreaterThanOrEqual(44);
expect(box?.height).toBeGreaterThanOrEqual(44);
```

## 📊 Performance Thresholds

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Page Load Time | < 5 seconds | Industry standard for mobile web |
| Layout Shift | < 10px | Prevents disorienting user experience |
| Scroll Performance | Smooth (no lag) | Critical for infinite scroll UX |

## 🐛 Debugging Failed Tests

### View Test Results

After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Debug Specific Test

```bash
# Debug a single test
npx playwright test e2e/mobile-products.spec.ts:10 --debug

# Run with trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- **Screenshot**: Taken at point of failure
- **Video**: Full test recording (on failure only)
- **Trace**: Complete interaction timeline

Find artifacts in `test-results/` directory.

## 🔧 Configuration

### playwright.config.ts

Key settings:
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Workers**: Parallel execution (CI: 1, local: auto)
- **Base URL**: http://localhost:5173
- **Web Server**: Automatically starts `npm run dev`

### Modifying Configuration

Edit `playwright.config.ts` to:
- Add new device profiles
- Change timeout values
- Adjust retry strategies
- Enable/disable video recording

## 📝 Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name - Flow Description', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-url');
    await page.waitForLoadState('networkidle');
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    const element = page.getByLabel('Button Label');

    // Act
    await element.click();

    // Assert
    await expect(page.locator('text=/Success/i')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByLabel()`, `getByRole()`, `getByText()` over CSS selectors
2. **Wait for stability**: Use `waitForLoadState('networkidle')` before assertions
3. **Test real user flows**: Focus on critical paths users actually take
4. **Mobile-first**: Test on smallest viewport first (320px)
5. **Explicit waits**: Use `waitFor()` instead of arbitrary `setTimeout()`
6. **Accessibility**: Verify keyboard navigation and ARIA labels
7. **Performance**: Measure and assert on load times

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices for E2E Testing](https://playwright.dev/docs/best-practices)
- [Mobile Emulation Guide](https://playwright.dev/docs/emulation)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 🤝 Contributing

When adding new mobile features:

1. **Write E2E test first** (TDD approach)
2. **Cover critical path** (happy path + error cases)
3. **Test on mobile devices** (use `--project='Mobile*'`)
4. **Verify accessibility** (touch targets, keyboard nav)
5. **Check performance** (load times, smoothness)

## 📞 Support

For E2E test issues:
- Check `test-results/` for failure artifacts
- Review Playwright logs in terminal
- Use `--debug` mode for step-by-step execution
- Open issue with test name and failure screenshot
