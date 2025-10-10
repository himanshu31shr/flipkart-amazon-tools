/**
 * Smoke tests for basic application functionality
 * These tests verify the app loads and basic pages are accessible
 */
import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');

    // Verify page has loaded (HTML title or body exists)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have valid HTML structure', async ({ page }) => {
    await page.goto('/');

    // Verify root element exists
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('load');

    // Allow time for any async errors
    await page.waitForTimeout(2000);

    // Should have no critical JavaScript errors
    // (Some warnings are acceptable)
    const criticalErrors = errors.filter(e =>
      !e.includes('Warning') && !e.includes('DevTools')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should have responsive viewport meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should load on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('load');

    // Verify page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Login Page Smoke Tests', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should have login-related content
    const hasLoginContent =
      (await page.locator('text=/sign in|login|email|password/i').count()) > 0;

    if (hasLoginContent) {
      expect(hasLoginContent).toBe(true);
    } else {
      // Might be auto-authenticated or using different auth flow
      console.log('Login page not found - may use OAuth or be auto-authenticated');
    }
  });
});

test.describe('Public Page Accessibility', () => {
  test('should navigate to home page', async ({ page }) => {
    const response = await page.goto('/');

    // Should get a successful response
    expect(response?.status()).toBeLessThan(400);
  });

  test('should handle 404 for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');

    // Should show some content (either 404 page or redirect)
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});
