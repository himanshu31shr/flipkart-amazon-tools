/**
 * Authentication helpers for E2E tests
 * Provides login functionality and auth state management
 */
import { Page } from '@playwright/test';

/**
 * Demo credentials for E2E testing
 * These credentials match the Firebase emulator seed data
 * Override with environment variables if needed
 */
const DEMO_CREDENTIALS = {
  email: process.env.E2E_TEST_EMAIL || 'demo@sacredsutra.com',
  password: process.env.E2E_TEST_PASSWORD || 'demo123456',
};

/**
 * Logs in to the application using demo credentials
 * Handles Material-UI TextField components and Redux authentication flow
 */
export async function login(page: Page, credentials = DEMO_CREDENTIALS) {
  // For E2E tests, we bypass Firebase Auth and set Redux state directly
  // This avoids Playwright's localhost connection limitations with Firebase emulators

  // Navigate to any page to ensure Redux store is initialized
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Wait for app to initialize
  await page.waitForTimeout(1000);

  // Inject authentication state directly into Redux store
  const authInjected = await page.evaluate((email) => {
    console.log('[E2E] Attempting to inject auth for:', email);
    console.log('[E2E] navigator.webdriver:', window.navigator.webdriver);

    const mockUser = {
      uid: 'e2e-test-user-id',
      email: email,
      emailVerified: true,
      displayName: 'E2E Test User',
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: 'mock-refresh-token',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mock-id-token',
      getIdTokenResult: async () => ({ token: 'mock-id-token' } as any),
      reload: async () => {},
      toJSON: () => ({}) as any,
      phoneNumber: null,
      photoURL: null,
      providerId: 'firebase',
    };

    // Dispatch login action to Redux store
    const event = new CustomEvent('e2e:set-auth', {
      detail: {
        isAuthenticated: true,
        user: mockUser,
        loading: false,
        error: null,
      },
    });
    window.dispatchEvent(event);
    console.log('[E2E] Auth event dispatched');

    // Also set localStorage for persistence
    localStorage.setItem('auth', JSON.stringify({
      isAuthenticated: true,
      user: mockUser,
    }));

    return true;
  }, credentials.email);

  console.log('E2E auth injection result:', authInjected);

  // Wait for auth state to propagate
  await page.waitForTimeout(1000);

  // Inject mock data for E2E tests (since we can't access Firestore emulators)
  await page.evaluate(() => {
    // Mock products
    const mockProducts = [
      { id: '1', name: 'Test Product 1', sku: 'TEST-001', platform: 'amazon', quantity: 10 },
      { id: '2', name: 'Test Product 2', sku: 'TEST-002', platform: 'flipkart', quantity: 20 },
      { id: '3', name: 'Test Product 3', sku: 'TEST-003', platform: 'amazon', quantity: 15 },
    ];

    // Mock orders
    const mockOrders = [
      { id: '1', productName: 'Test Product 1', quantity: 2, platform: 'amazon', date: new Date().toISOString() },
      { id: '2', productName: 'Test Product 2', quantity: 1, platform: 'flipkart', date: new Date().toISOString() },
    ];

    // Store in localStorage for Redux persistence
    localStorage.setItem('products', JSON.stringify(mockProducts));
    localStorage.setItem('orders', JSON.stringify(mockOrders));

    console.log('[E2E] Mock data injected - products:', mockProducts.length);
  });

  await page.waitForTimeout(500);

  // Verify we can access protected routes
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // If still on login page, the mock didn't work
  if (page.url().includes('/login')) {
    console.warn('⚠️  E2E auth mock failed - still on login page');
  } else {
    console.log('✅ E2E auth successful - accessing protected route');
  }
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

export async function logout(page: Page) {
  // Find and click logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

  if (await logoutButton.isVisible({ timeout: 2000 })) {
    await logoutButton.click();
    await page.waitForURL('/login', { timeout: 5000 });
  }
}

/**
 * Setup authenticated session for tests
 * Call this in beforeEach to ensure user is logged in
 */
export async function setupAuthenticatedSession(page: Page) {
  await login(page);

  // Verify authentication succeeded
  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    throw new Error('Failed to authenticate user for E2E tests');
  }
}
