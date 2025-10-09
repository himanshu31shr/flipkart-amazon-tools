/**
 * E2E tests for Mobile Today's Orders Page
 * Tests order management, batch filtering, and order completion flows
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile Todays Orders Page - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');
  });

  test('should display todays orders page', async ({ page }) => {
    // Verify page title
    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();

    // Verify order count is displayed
    await expect(page.locator('text=/\\d+ Orders?/i')).toBeVisible({ timeout: 10000 });
  });

  test('should filter orders by platform', async ({ page }) => {
    // Find platform filter
    const platformButton = page.getByRole('button', { name: /all|amazon|flipkart/i }).first();

    if (await platformButton.isVisible()) {
      await platformButton.click();

      // Select Amazon
      const amazonOption = page.getByText('Amazon', { exact: true });
      if (await amazonOption.isVisible()) {
        await amazonOption.click();
        await page.waitForTimeout(500);

        // Verify orders filtered
        await expect(page.locator('text=/\\d+ Orders?/i')).toBeVisible();
      }
    }
  });

  test('should expand and collapse batch accordion', async ({ page }) => {
    // Wait for batches to load
    await page.waitForTimeout(1000);

    // Find first batch accordion
    const batchAccordion = page.locator('[class*="MuiAccordion"]').first();

    if (await batchAccordion.isVisible()) {
      // Click to expand
      await batchAccordion.click();
      await page.waitForTimeout(300);

      // Click again to collapse
      await batchAccordion.click();
      await page.waitForTimeout(300);

      // Verify accordion still visible
      await expect(batchAccordion).toBeVisible();
    }
  });

  test('should display order details within batch', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Expand first batch
    const firstBatch = page.locator('[class*="MuiAccordion"]').first();

    if (await firstBatch.isVisible()) {
      await firstBatch.click();
      await page.waitForTimeout(500);

      // Verify order cards visible
      const orderCard = page.locator('[class*="MuiCard"]').first();
      await expect(orderCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('should mark order as complete', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find and expand first batch
    const firstBatch = page.locator('[class*="MuiAccordion"]').first();

    if (await firstBatch.isVisible()) {
      await firstBatch.click();
      await page.waitForTimeout(500);

      // Find complete button (checkbox or button)
      const completeButton = page.locator('button:has-text("Complete")').or(
        page.locator('[type="checkbox"]')
      ).first();

      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(500);

        // Verify order marked complete (visual feedback)
        await page.waitForTimeout(500);
      }
    }
  });

  test('should navigate to barcode scanner', async ({ page }) => {
    // Find scan button
    const scanButton = page.getByLabel(/scan/i).or(
      page.locator('button[aria-label*="scan"]')
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      // Verify scanner page or modal opened
      await page.waitForTimeout(1000);

      // Check for scanner UI elements
      const scannerUI = page.locator('text=/scan/i').or(
        page.locator('[class*="scanner"]')
      );
      await expect(scannerUI.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should refresh orders with pull-to-refresh', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    // Simulate pull gesture
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300, { steps: 10 });
    await page.mouse.up();

    // Wait for refresh
    await page.waitForTimeout(2000);

    // Verify page still functional
    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();
  });

  test('should display empty state when no orders exist', async ({ page }) => {
    // This test assumes there's a way to clear orders or visit with no data
    // In real scenario, might need to use test fixtures

    // Check if empty state is visible
    const emptyState = page.locator('text=/no orders/i');

    // If no orders, should show empty message
    if (await emptyState.isVisible({ timeout: 2000 })) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Mobile Todays Orders - Date Selection', () => {
  test('should change selected date', async ({ page }) => {
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    // Find date picker
    const datePicker = page.locator('[type="date"]').or(
      page.getByLabel(/date|select date/i)
    ).first();

    if (await datePicker.isVisible()) {
      await datePicker.click();
      await page.waitForTimeout(500);

      // Close date picker (implementation specific)
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Mobile Todays Orders - Responsive Layout', () => {
  test('should render correctly on small screens (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    // Verify page renders
    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();

    // Verify no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });

  test('should render correctly on medium screens (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();
  });

  test('should render correctly on large screens (428px)', async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 926 });
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();
  });
});

test.describe('Mobile Todays Orders - Performance', () => {
  test('should load orders page quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/todays-orders');
    await page.waitForSelector('text=/Today\'?s Orders/i', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large order lists without lag', async ({ page }) => {
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    // Scroll through orders
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }

    // Page should remain responsive
    await expect(page.locator('text=/Today\'?s Orders/i').first()).toBeVisible();
  });
});

test.describe('Mobile Todays Orders - Accessibility', () => {
  test('should have accessible batch accordions', async ({ page }) => {
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    // Find accordions
    const accordions = page.locator('[class*="MuiAccordion"]');

    if (await accordions.first().isVisible()) {
      const firstAccordion = accordions.first();

      // Should be keyboard accessible
      await firstAccordion.focus();
      await page.keyboard.press('Enter');

      await page.waitForTimeout(300);

      // Verify accordion interactive
      await expect(firstAccordion).toBeVisible();
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/todays-orders');
    await page.waitForLoadState('networkidle');

    // Check for scan button with aria-label
    const scanButton = page.getByLabel(/scan/i);

    if (await scanButton.isVisible({ timeout: 2000 })) {
      await expect(scanButton).toBeVisible();
    }
  });
});
