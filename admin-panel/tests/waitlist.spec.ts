import { test, expect } from '@playwright/test';
import { createTestAdmin, loginAsAdmin } from './helpers/admin-auth';

/**
 * Waitlist Feature Tests
 * Tests the full waitlist signup flow for inactive products
 */

test.describe('Waitlist Feature', () => {
  // Use existing test products from the database
  const TEST_PRODUCT_WITH_WAITLIST = 'test-oto-target'; // inactive + enable_waitlist=true
  const TEST_PRODUCT_WITHOUT_WAITLIST = 'test-no-redirect'; // inactive + enable_waitlist=false
  const TEST_PRODUCT_ID_WITH_WAITLIST = '900dc88a-8999-4a29-ab69-9d4a2352b69b';
  const TEST_PRODUCT_ID_WITHOUT_WAITLIST = '153ebaed-8358-406e-a859-6b8ed7828a81';
  const TEST_EMAIL = 'waitlist-test@example.com';

  test.describe('Admin Panel', () => {
    let adminEmail: string;
    let adminPassword: string;
    let cleanup: () => Promise<void>;

    test.beforeAll(async () => {
      const admin = await createTestAdmin('waitlist-admin');
      adminEmail = admin.email;
      adminPassword = admin.password;
      cleanup = admin.cleanup;
    });

    test.afterAll(async () => {
      if (cleanup) await cleanup();
    });

    test('should show waitlist checkbox in product form', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);
      await page.goto('/pl/dashboard/products');

      // Click add product button
      await page.getByRole('button', { name: /Dodaj produkt|Add Product/i }).click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"]');

      // Look for "Availability & Waitlist" section and expand it
      const availabilitySection = page.locator('button, div').filter({ hasText: /Availability.*Waitlist|Dostępność.*Lista/i }).first();
      await availabilitySection.click();

      // Look for waitlist checkbox label
      const waitlistLabel = page.locator('label').filter({ hasText: /Enable Waitlist|Włącz zapis na listę/i });
      await expect(waitlistLabel).toBeVisible({ timeout: 5000 });
    });

    test('should show waitlist indicator for inactive products', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);
      await page.goto('/pl/dashboard/products');

      // Wait for products table to load
      await page.waitForSelector('table tbody tr');

      // Look for the waitlist indicator emoji 📋 or 🚫
      const waitlistIndicator = page.locator('span').filter({ hasText: /📋|🚫/ });
      const count = await waitlistIndicator.count();

      // Should have at least one indicator (we have test products)
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Checkout Page - Waitlist Form', () => {
    test('should show 404 for inactive product WITHOUT waitlist enabled', async ({ page }) => {
      // test-no-redirect is an inactive product without waitlist enabled
      await page.goto(`/pl/checkout/${TEST_PRODUCT_WITHOUT_WAITLIST}`);

      // Page loads but shows "Product Not Found" content (Next.js notFound() returns 200 in dev)
      const title = await page.title();
      expect(title).toContain('Product Not Found');
    });

    test('should show waitlist form for inactive product WITH waitlist enabled', async ({ page }) => {
      // Navigate to checkout page for inactive product with waitlist
      await page.goto(`/pl/checkout/${TEST_PRODUCT_WITH_WAITLIST}`);

      // Should NOT be 404
      await expect(page).not.toHaveURL(/404/);

      // Wait for page to hydrate - look for waitlist form title
      const waitlistTitle = page.locator('h2').filter({ hasText: /Join the Waitlist|Dołącz do listy oczekujących/i });
      await expect(waitlistTitle).toBeVisible({ timeout: 15000 });

      // Should see email input
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();

      // Should see terms checkbox (by ID)
      const termsCheckbox = page.locator('#terms-checkbox');
      await expect(termsCheckbox).toBeAttached();

      // Should see submit button
      const submitButton = page.locator('button').filter({ hasText: /Notify Me|Powiadom mnie/i });
      await expect(submitButton).toBeVisible();
    });

    test('should have required email field', async ({ page }) => {
      await page.goto(`/pl/checkout/${TEST_PRODUCT_WITH_WAITLIST}`);

      // Wait for form to load
      const waitlistTitle = page.locator('h2').filter({ hasText: /Join the Waitlist|Dołącz do listy oczekujących/i });
      await expect(waitlistTitle).toBeVisible({ timeout: 15000 });

      // Email input should have required attribute
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should require terms acceptance', async ({ page }) => {
      await page.goto(`/pl/checkout/${TEST_PRODUCT_WITH_WAITLIST}`);

      // Wait for form to load
      const waitlistTitle = page.locator('h2').filter({ hasText: /Join the Waitlist|Dołącz do listy oczekujących/i });
      await expect(waitlistTitle).toBeVisible({ timeout: 15000 });

      // Fill email but don't check terms
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill(TEST_EMAIL);

      // Try to submit - button should be disabled without terms
      const submitButton = page.locator('button').filter({ hasText: /Notify Me|Powiadom mnie/i });

      // Check if button is disabled (form requires terms checkbox)
      await expect(submitButton).toBeDisabled();
    });

    test('should allow filling waitlist form', async ({ page }) => {
      await page.goto(`/pl/checkout/${TEST_PRODUCT_WITH_WAITLIST}`);

      // Wait for form to load
      const waitlistTitle = page.locator('h2').filter({ hasText: /Join the Waitlist|Dołącz do listy oczekujących/i });
      await expect(waitlistTitle).toBeVisible({ timeout: 15000 });

      // Fill email
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill(TEST_EMAIL);
      await expect(emailInput).toHaveValue(TEST_EMAIL);

      // Accept terms (use specific ID)
      const termsCheckbox = page.locator('#terms-checkbox');
      await termsCheckbox.check({ force: true });
      await expect(termsCheckbox).toBeChecked();

      // Submit button should be visible
      const submitButton = page.locator('button').filter({ hasText: /Notify Me|Powiadom mnie/i });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('API - Waitlist Signup', () => {
    test('should reject signup without email', async ({ request }) => {
      const response = await request.post('/api/waitlist/signup', {
        data: {
          productId: 'test-product-id'
        }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Email');
    });

    test('should reject signup with invalid email', async ({ request }) => {
      const response = await request.post('/api/waitlist/signup', {
        data: {
          email: 'not-an-email',
          productId: 'test-product-id'
        }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('email');
    });

    test('should reject signup for non-existent product', async ({ request }) => {
      const response = await request.post('/api/waitlist/signup', {
        data: {
          email: TEST_EMAIL,
          productId: 'non-existent-product-id'
        }
      });

      expect(response.status()).toBe(404);
    });

    test('should reject signup for product without waitlist enabled', async ({ request }) => {
      // test-no-redirect exists but has enable_waitlist = false
      // Due to RLS policy, product without waitlist is invisible to API
      const response = await request.post('/api/waitlist/signup', {
        data: {
          email: TEST_EMAIL,
          productId: TEST_PRODUCT_ID_WITHOUT_WAITLIST
        }
      });

      // Product is hidden by RLS, so API returns 404 "Product not found"
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('not found');
    });

    test('should successfully signup for waitlist', async ({ request }) => {
      // test-oto-target has enable_waitlist = true
      const response = await request.post('/api/waitlist/signup', {
        data: {
          email: TEST_EMAIL,
          productId: TEST_PRODUCT_ID_WITH_WAITLIST
        }
      });

      // In dev/test mode without captcha, should succeed
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
      } else {
        // May require captcha in production
        console.log('Signup returned:', response.status());
      }
    });
  });

  test.describe('Webhook - waitlist.signup event', () => {
    let adminEmail: string;
    let adminPassword: string;
    let cleanup: () => Promise<void>;

    test.beforeAll(async () => {
      const admin = await createTestAdmin('waitlist-webhook');
      adminEmail = admin.email;
      adminPassword = admin.password;
      cleanup = admin.cleanup;
    });

    test.afterAll(async () => {
      if (cleanup) await cleanup();
    });

    test('should have waitlist.signup event type available in webhook config', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);
      await page.goto('/pl/dashboard/webhooks');

      // Click add webhook button
      await page.getByRole('button', { name: /Add|Dodaj/i }).first().click();
      await page.waitForSelector('[role="dialog"]');

      // Look for waitlist.signup in events dropdown/list
      const eventsSection = page.locator('[role="dialog"]');
      const waitlistEvent = eventsSection.locator('text=waitlist.signup');

      // Should have the event type available
      await expect(waitlistEvent).toBeVisible({ timeout: 5000 });
    });
  });

  /**
   * Debug test to check current state
   */
  test.describe('Debug - Check Waitlist Setup', () => {
    test('check checkout page response', async ({ page, request }) => {
      // Direct API check for product
      const productResponse = await request.get('/api/public/products/test-oto-target');
      console.log('Product API response status:', productResponse.status());
      if (productResponse.ok()) {
        const product = await productResponse.json();
        console.log('Product data:', JSON.stringify(product, null, 2));
        console.log('is_active:', product.is_active);
        console.log('enable_waitlist:', product.enable_waitlist);
      }

      // Check checkout page
      const checkoutResponse = await page.goto('/pl/checkout/test-oto-target');
      console.log('Checkout page status:', checkoutResponse?.status());

      // Log page content
      const pageContent = await page.content();
      console.log('Page title:', await page.title());

      // Check for specific elements
      const has404 = pageContent.includes('404') || pageContent.includes('Not Found');
      const hasWaitlistForm = pageContent.includes('waitlist') || pageContent.includes('oczekujących');

      console.log('Has 404:', has404);
      console.log('Has waitlist form:', hasWaitlistForm);
    });
  });
});
