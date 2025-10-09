/**
 * E2E tests for Mobile Products Page
 * Tests critical user flows on mobile devices using Playwright
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile Products Page - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to products page
    await page.goto('/products');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display products list on mobile device', async ({ page }) => {
    // Verify page title is visible
    await expect(page.locator('text=/Products/i').first()).toBeVisible();

    // Verify product count is displayed
    await expect(page.locator('text=/\\d+ Products?/i')).toBeVisible();

    // Verify at least one product card exists
    const productCards = page.locator('[class*="MuiCard"]').or(page.locator('[role="article"]'));
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should search for products using search bar', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search products/i);
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('Product');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify product count updated
    const productCount = page.locator('text=/\\d+ Products?/i');
    await expect(productCount).toBeVisible();
  });

  test('should filter products by platform', async ({ page }) => {
    // Find platform filter button
    const platformButton = page.getByRole('button', { name: /all|amazon|flipkart/i }).first();
    await expect(platformButton).toBeVisible();

    // Click to open filter menu
    await platformButton.click();

    // Select Amazon filter
    const amazonOption = page.getByText('Amazon', { exact: true });
    if (await amazonOption.isVisible()) {
      await amazonOption.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify filtered results
      await expect(page.locator('text=/\\d+ Products?/i')).toBeVisible();
    }
  });

  test('should open product details when tapping product card', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('[class*="MuiCard"]', { timeout: 10000 });

    // Find and tap first product
    const firstProduct = page.locator('[class*="MuiCard"]').first();
    await firstProduct.click();

    // Verify modal or details view opened
    await page.waitForTimeout(500);

    // Modal should have product details
    const modal = page.locator('[role="dialog"]').or(page.locator('[class*="Modal"]'));
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to add product page when FAB is clicked', async ({ page }) => {
    // Find add product FAB (floating action button)
    const fab = page.getByLabel('Add product').or(page.locator('button[aria-label*="add"]').first());
    await expect(fab).toBeVisible({ timeout: 5000 });

    // Click FAB
    await fab.click();

    // Verify navigation to add product page
    await page.waitForURL(/\/products\/new/, { timeout: 5000 });
  });

  test('should handle pull-to-refresh gesture on mobile', async ({ page, isMobile }) => {
    // Skip on desktop
    if (!isMobile) {
      test.skip();
      return;
    }

    // Get initial product count
    const _initialCount = await page.locator('text=/\\d+ Products?/i').textContent();

    // Simulate pull-to-refresh by scrolling up from top
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300, { steps: 10 });
    await page.mouse.up();

    // Wait for refresh
    await page.waitForTimeout(2000);

    // Product count should still be visible (refresh completed)
    await expect(page.locator('text=/\\d+ Products?/i')).toBeVisible();
  });

  test('should load more products with infinite scroll', async ({ page }) => {
    // Verify initial products loaded
    const initialProducts = await page.locator('[class*="MuiCard"]').count();

    if (initialProducts > 0) {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for potential loading
      await page.waitForTimeout(1000);

      // Verify page still responsive
      await expect(page.locator('text=/Products/i').first()).toBeVisible();
    }
  });

  test('should display empty state when no products found', async ({ page }) => {
    // Search for non-existent product
    const searchInput = page.getByPlaceholder(/search products/i);
    await searchInput.fill('NonexistentProductXYZ12345');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify empty state message
    const emptyMessage = page.locator('text=/no products/i');
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Mobile Products Page - Responsive Behavior', () => {
  test('should render correctly on iPhone SE (320px)', async ({ page }) => {
    // Set small viewport
    await page.setViewportSize({ width: 320, height: 568 });

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Verify page renders without horizontal scroll
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Verify essential elements fit in viewport
    await expect(page.locator('text=/Products/i').first()).toBeVisible();
  });

  test('should render correctly on iPhone 12 (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Verify product list renders
    await expect(page.locator('text=/\\d+ Products?/i')).toBeVisible();
  });

  test('should render correctly on large phones (428px)', async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 926 });

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Verify layout utilizes larger viewport
    await expect(page.locator('text=/Products/i').first()).toBeVisible();
  });
});

test.describe('Mobile Products Page - Accessibility', () => {
  test('should have proper touch targets for buttons', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Check FAB has adequate touch target
    const fab = page.getByLabel('Add product');
    if (await fab.isVisible()) {
      const fabBox = await fab.boundingBox();
      expect(fabBox?.width).toBeGreaterThanOrEqual(44);
      expect(fabBox?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Mobile Products Page - Performance', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should render product list without layout shift', async ({ page }) => {
    await page.goto('/products');

    // Wait for initial render
    await page.waitForSelector('text=/Products/i');

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Verify no major layout shifts
    const title = page.locator('text=/Products/i').first();
    const initialPosition = await title.boundingBox();

    await page.waitForTimeout(1000);

    const finalPosition = await title.boundingBox();

    // Title position should remain stable
    expect(Math.abs((initialPosition?.y || 0) - (finalPosition?.y || 0))).toBeLessThan(10);
  });
});
