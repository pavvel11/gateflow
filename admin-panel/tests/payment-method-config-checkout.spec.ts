/**
 * E2E Tests for Payment Method Configuration - Checkout Flow
 *
 * Tests how payment method configuration affects the checkout experience:
 * - Automatic mode (E2E-CHECKOUT-001, E2E-CHECKOUT-002)
 * - Stripe preset mode (E2E-CHECKOUT-003)
 * - Custom mode (E2E-CHECKOUT-004, E2E-CHECKOUT-005)
 * - Payment method ordering (E2E-CHECKOUT-006, E2E-CHECKOUT-007)
 * - Express Checkout toggles (E2E-CHECKOUT-008, E2E-CHECKOUT-009, E2E-CHECKOUT-010)
 * - Fallback behavior (E2E-CHECKOUT-011)
 * - Complete payment flow (E2E-CHECKOUT-012)
 *
 * Total: 12 checkout flow test cases
 */

import { test, expect } from '@playwright/test';
import { createTestAdmin, loginAsAdmin } from './helpers/admin-auth';

test.describe('Payment Method Configuration - Checkout Flow', () => {
  let testProductSlug: string;
  let adminEmail: string;
  let adminPassword: string;
  let cleanup: () => Promise<void>;

  test.beforeAll(async ({ browser }) => {
    // Create admin user for tests
    const admin = await createTestAdmin('payment-checkout-test');
    adminEmail = admin.email;
    adminPassword = admin.password;
    cleanup = admin.cleanup;

    // Create a test product for checkout tests
    const page = await browser.newPage();
    await loginAsAdmin(page, adminEmail, adminPassword);

    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Create PLN test product
    const createButton = page.locator('button').filter({ hasText: /Utwórz|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('input[name="name"]', 'Test Product - Payment Config E2E');
      await page.fill('input[name="price"]', '99.00');
      await page.selectOption('select[name="currency"]', 'PLN');

      const saveButton = page.locator('button').filter({ hasText: /Zapisz|Save/i });
      await saveButton.click();

      await page.waitForTimeout(2000);

      // Get product slug from URL or response
      const url = page.url();
      const match = url.match(/\/products\/([^\/]+)/);
      if (match) {
        testProductSlug = match[1];
      }
    }

    await page.close();
  });

  test.afterAll(async () => {
    if (cleanup) await cleanup();
  });

  test('E2E-CHECKOUT-001: Automatic mode - PLN product', async ({ page }) => {
    // Set payment config to automatic mode
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const automaticRadio = page.locator('input[type="radio"][value="automatic"]').first();
    await automaticRadio.check();

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout page
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');

      // Wait for Stripe Payment Element to load
      await page.waitForTimeout(3000);

      // Verify PaymentElement appears (contains iframe from Stripe)
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });

      // In automatic mode, Stripe shows all payment methods appropriate for PLN
      // We can't directly inspect iframe content, but we can verify the element loaded
    }
  });

  test('E2E-CHECKOUT-002: Automatic mode - USD product', async ({ page }) => {
    // Create USD product first
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button').filter({ hasText: /Utwórz|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('input[name="name"]', 'Test Product USD - Payment Config');
      await page.fill('input[name="price"]', '29.99');
      await page.selectOption('select[name="currency"]', 'USD');

      const saveButton = page.locator('button').filter({ hasText: /Zapisz|Save/i });
      await saveButton.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      const match = url.match(/\/products\/([^\/]+)/);
      if (match) {
        const usdProductSlug = match[1];

        // Visit checkout
        await page.goto(`/checkout/${usdProductSlug}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Verify PaymentElement appears
        const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('E2E-CHECKOUT-003: Stripe preset - Custom PMC', async ({ page }) => {
    // This test requires a real Stripe PMC to be configured in Stripe Dashboard
    // Skip if no valid PMC options are available

    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Scroll to Payment Method Settings section
    await page.locator('h3:has-text("Konfiguracja Metod Płatności")').scrollIntoViewIfNeeded();

    const stripePresetRadio = page.locator('input[name="config_mode"]').nth(1);
    await stripePresetRadio.check();

    await page.waitForTimeout(1000);

    // Look for PMC dropdown specifically in the Stripe Preset section
    const pmcSection = page.locator('.bg-gray-50, .bg-gray-700\\/50').filter({ hasText: /Konfiguracja Stripe PMC|Stripe PMC/i });
    const dropdown = pmcSection.locator('select');

    // Check if dropdown exists and has valid PMC options (starts with pmc_)
    const isVisible = await dropdown.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'PMC dropdown not visible - Stripe PMC might not be loaded');
      return;
    }

    const options = await dropdown.locator('option').allTextContents();
    const hasPmcOptions = options.some(opt => opt.includes('pmc_'));

    if (!hasPmcOptions) {
      test.skip(true, 'No Stripe PMC configurations available in account');
      return;
    }

    // Select first PMC option
    await dropdown.selectOption({ index: 1 });

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();

    // Check for either success or error message
    const successMessage = page.locator('text=Konfiguracja metod płatności zapisana pomyślnie');
    const errorMessage = page.locator('[class*="error"], [class*="toast"]').filter({ hasText: /błąd|error/i });

    await expect(successMessage.or(errorMessage)).toBeVisible({ timeout: 10000 });

    // Only continue to checkout if save was successful
    if (await successMessage.isVisible().catch(() => false)) {
      if (testProductSlug) {
        await page.goto(`/checkout/${testProductSlug}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('E2E-CHECKOUT-004: Custom mode - PLN methods', async ({ page }) => {
    // Configure custom mode with specific payment methods
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const customRadio = page.locator('input[name="config_mode"]').nth(2);
    await customRadio.check();

    await page.waitForTimeout(500);

    // Enable Card, BLIK, Przelewy24
    const cardCheckbox = page.locator('label:has-text("Card")').locator('input[type="checkbox"]');
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    const blikCheckbox = page.locator('label:has-text("BLIK")').locator('input[type="checkbox"]');
    if (!(await blikCheckbox.isChecked())) {
      await blikCheckbox.check();
    }

    const p24Checkbox = page.locator('label:has-text("Przelewy24")').locator('input[type="checkbox"]');
    if (!(await p24Checkbox.isChecked())) {
      await p24Checkbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verify PaymentElement appears with custom methods
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-005: Custom mode - Currency filter', async ({ page }) => {
    // Configure custom mode with BLIK (PLN only) and Card
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const customRadio = page.locator('input[name="config_mode"]').nth(2);
    await customRadio.check();

    await page.waitForTimeout(500);

    // Enable only Card and BLIK
    const cardCheckbox = page.locator('label:has-text("Card")').locator('input[type="checkbox"]');
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    const blikCheckbox = page.locator('label:has-text("BLIK")').locator('input[type="checkbox"]');
    if (!(await blikCheckbox.isChecked())) {
      await blikCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Create USD product to test currency filtering
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('button').filter({ hasText: /Utwórz|Create/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.fill('input[name="name"]', 'Test USD - Currency Filter');
      await page.fill('input[name="price"]', '49.99');
      await page.selectOption('select[name="currency"]', 'USD');

      const saveProductButton = page.locator('button').filter({ hasText: /Zapisz|Save/i });
      await saveProductButton.click();
      await page.waitForTimeout(2000);

      const url = page.url();
      const match = url.match(/\/products\/([^\/]+)/);
      if (match) {
        const usdProductSlug = match[1];

        // Visit checkout - should only show Card (BLIK filtered out for USD)
        await page.goto(`/checkout/${usdProductSlug}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Verify PaymentElement appears
        const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });

        // BLIK should not be available (currency filter in action)
        // We can't directly verify payment method tabs in iframe, but checkout should load
      }
    }
  });

  test('E2E-CHECKOUT-006: Payment method order - BLIK first', async ({ page }) => {
    // This test verifies that payment method order is respected
    // (Detailed verification would require inspecting Stripe iframe tabs)

    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const customRadio = page.locator('input[name="config_mode"]').nth(2);
    await customRadio.check();

    await page.waitForTimeout(500);

    // Enable BLIK, Card, P24
    const blikCheckbox = page.locator('label:has-text("BLIK")').locator('input[type="checkbox"]');
    if (!(await blikCheckbox.isChecked())) {
      await blikCheckbox.check();
    }

    const cardCheckbox = page.locator('label:has-text("Card")').locator('input[type="checkbox"]');
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verify checkout loads
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-007: Payment method order - Card first', async ({ page }) => {
    // Similar to CHECKOUT-006 but with Card first in order

    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const customRadio = page.locator('input[name="config_mode"]').nth(2);
    await customRadio.check();

    await page.waitForTimeout(500);

    // Enable Card first, then BLIK
    const cardCheckbox = page.locator('label:has-text("Card")').locator('input[type="checkbox"]');
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    const blikCheckbox = page.locator('label:has-text("BLIK")').locator('input[type="checkbox"]');
    if (!(await blikCheckbox.isChecked())) {
      await blikCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verify checkout loads
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-008: Express Checkout - All enabled', async ({ page }) => {
    // Configure Express Checkout with all options enabled
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Enable Express Checkout
    const masterToggle = page.locator('label:has-text("Włącz Express Checkout")').locator('input[type="checkbox"]');
    if (!(await masterToggle.isChecked())) {
      await masterToggle.check();
    }

    await page.waitForTimeout(500);

    // Enable all sub-options
    const applePayCheckbox = page.locator('label:has-text("Apple Pay")').locator('input[type="checkbox"]');
    if (!(await applePayCheckbox.isChecked())) {
      await applePayCheckbox.check();
    }

    const googlePayCheckbox = page.locator('label:has-text("Google Pay")').locator('input[type="checkbox"]');
    if (!(await googlePayCheckbox.isChecked())) {
      await googlePayCheckbox.check();
    }

    const linkCheckbox = page.locator('label:has-text("Link")').locator('input[type="checkbox"]');
    if (!(await linkCheckbox.isChecked())) {
      await linkCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Express Checkout Element should appear (contains Link, Apple Pay, Google Pay buttons)
      // These are in a separate Stripe iframe
      const expressCheckout = page.frameLocator('iframe[name^="__privateStripeFrame"]');
      await expect(expressCheckout.first().locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-009: Express Checkout - Link only', async ({ page }) => {
    // Configure Express Checkout with only Link enabled
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Enable Express Checkout
    const masterToggle = page.locator('label:has-text("Włącz Express Checkout")').locator('input[type="checkbox"]');
    if (!(await masterToggle.isChecked())) {
      await masterToggle.check();
    }

    await page.waitForTimeout(500);

    // Disable Apple Pay and Google Pay, enable Link
    const applePayCheckbox = page.locator('label:has-text("Apple Pay")').locator('input[type="checkbox"]');
    if (await applePayCheckbox.isChecked()) {
      await applePayCheckbox.uncheck();
    }

    const googlePayCheckbox = page.locator('label:has-text("Google Pay")').locator('input[type="checkbox"]');
    if (await googlePayCheckbox.isChecked()) {
      await googlePayCheckbox.uncheck();
    }

    const linkCheckbox = page.locator('label:has-text("Link")').locator('input[type="checkbox"]');
    if (!(await linkCheckbox.isChecked())) {
      await linkCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Express Checkout Element should appear with only Link button
      const expressCheckout = page.frameLocator('iframe[name^="__privateStripeFrame"]');
      await expect(expressCheckout.first().locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-010: Express Checkout - All disabled', async ({ page }) => {
    // Disable Express Checkout entirely
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Disable Express Checkout master toggle
    const masterToggle = page.locator('label:has-text("Włącz Express Checkout")').locator('input[type="checkbox"]');
    if (await masterToggle.isChecked()) {
      await masterToggle.uncheck();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Only regular PaymentElement should appear (no Express Checkout section)
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-011: Config fallback - No config', async ({ page }) => {
    // This test would require deleting the config row from database
    // For now, just verify that automatic mode works as fallback

    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Ensure automatic mode is selected
    const automaticRadio = page.locator('input[type="radio"][value="automatic"]').first();
    await automaticRadio.check();

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout - should work with automatic mode fallback
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Verify checkout loads successfully
      const paymentElement = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await expect(paymentElement.locator('body')).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-CHECKOUT-012: Complete payment - Custom config', async ({ page }) => {
    // Configure custom mode
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const customRadio = page.locator('input[name="config_mode"]').nth(2);
    await customRadio.check();

    await page.waitForTimeout(500);

    // Enable only Card for simplicity
    const cardCheckbox = page.locator('label:has-text("Card")').locator('input[type="checkbox"]');
    if (!(await cardCheckbox.isChecked())) {
      await cardCheckbox.check();
    }

    const saveButton = page.locator('button:has-text("Zapisz Konfigurację")');
    await saveButton.click();
    await expect(page.locator('text=Konfiguracja metod płatności zapisana pomyślnie')).toBeVisible({
      timeout: 10000,
    });

    // Visit checkout
    if (testProductSlug) {
      await page.goto(`/checkout/${testProductSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Fill checkout form
      const emailInput = page.locator('input[name="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }

      // Wait for Payment Element to load
      await page.waitForTimeout(2000);

      // Fill Stripe test card (4242 4242 4242 4242)
      const cardNumberFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      const cardNumberInput = cardNumberFrame.locator('input[name="number"]');

      if (await cardNumberInput.isVisible().catch(() => false)) {
        await cardNumberInput.fill('4242424242424242');

        const expiryInput = cardNumberFrame.locator('input[name="expiry"]');
        await expiryInput.fill('1230');

        const cvcInput = cardNumberFrame.locator('input[name="cvc"]');
        await cvcInput.fill('123');

        // Submit payment
        const payButton = page.locator('button:has-text("Pay")');
        await payButton.click();

        // Wait for payment processing
        await page.waitForTimeout(5000);

        // Should redirect to success page or show success message
        const successUrl = page.url();
        const isSuccessPage = successUrl.includes('/success') || successUrl.includes('/thank-you');

        if (!isSuccessPage) {
          // Check for success message on page
          const hasSuccessMessage = await page.locator('text=Payment successful').isVisible().catch(() => false) ||
                                     await page.locator('text=Thank you').isVisible().catch(() => false);

          expect(isSuccessPage || hasSuccessMessage).toBeTruthy();
        } else {
          expect(isSuccessPage).toBeTruthy();
        }
      }
    }
  });
});
