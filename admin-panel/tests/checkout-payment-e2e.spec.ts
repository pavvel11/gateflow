import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Enforce single worker to avoid race conditions
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Valid test NIP
const TEST_NIP_VALID = '5261040828';

/**
 * Mock Stripe.js globally for all tests
 * This prevents real Stripe API calls and iframe loading
 */
async function mockStripe(page: any) {
  await page.addInitScript(() => {
    // Mock loadStripe function (used by @stripe/stripe-js)
    // @ts-ignore
    window.loadStripe = async function() {
      return {
        elements: function() {
          return {
            _commonOptions: {
              clientSecret: 'pi_mock_secret_123'
            },
            create: function() {
              return {
                mount: function(selector) {
                  const container = document.querySelector(selector);
                  if (container) {
                    const mockEl = document.createElement('div');
                    mockEl.setAttribute('data-testid', 'mock-payment-element');
                    mockEl.innerHTML = '<div>Mock Payment Element (Test Mode)</div>';
                    container.appendChild(mockEl);
                  }
                },
                on: function() {},
                unmount: function() {},
                destroy: function() {}
              };
            },
            submit: async function() {
              return { error: null };
            }
          };
        },
        confirmPayment: async function(options) {
          const returnUrl = options.confirmParams?.return_url;
          if (returnUrl) {
            window.location.href = returnUrl;
          }
          return { error: null };
        },
        retrievePaymentIntent: async function(cs) {
          return {
            paymentIntent: {
              id: 'pi_mock_123',
              client_secret: cs,
              status: 'succeeded'
            }
          };
        }
      };
    };

    // Also mock Stripe constructor (fallback)
    // @ts-ignore
    window.Stripe = window.loadStripe;
  });

  // Mock the Stripe CDN script to prevent loading real Stripe.js
  await page.route('https://js.stripe.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// Mocked Stripe.js'
    });
  });
}

/**
 * Mock Stripe API endpoints
 */
async function mockStripeAPI(page: any) {
  await page.route('**/api/create-payment-intent', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clientSecret: 'pi_mock_secret_123',
        amount: 10000
      })
    });
  });

  await page.route('**/api/update-payment-metadata', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.route('**/api/verify-payment**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        verified: true,
        status: 'succeeded'
      })
    });
  });
}

test.describe('Checkout E2E - Guest Purchase Flow', () => {
  let testProduct: any;

  test.beforeAll(async () => {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `E2E Test Product ${Date.now()}`,
        slug: `e2e-test-${Date.now()}`,
        price: 100,
        currency: 'PLN',
        description: 'Test product for E2E checkout',
        is_active: true,
        vat_rate: 23,
        price_includes_vat: true
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProduct.id);
    }
  });

  test('should complete guest checkout with successful payment', async ({ page }) => {
    // Capture console logs and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    const guestEmail = `guest-${Date.now()}@test.com`;
    await page.fill('input[type="email"]', guestEmail);
    await page.fill('input#firstName', 'Jan');
    await page.fill('input#lastName', 'Kowalski');

    const tcCheckbox = page.locator('input[type="checkbox"]').first();
    await tcCheckbox.check();

    // Wait longer for Payment Element to load
    await page.waitForTimeout(3000);

    await page.waitForSelector('[data-testid="mock-payment-element"]', { timeout: 10000 });

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/payment\/success/, { timeout: 10000 });
  });

  test('should validate required fields before submission', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.click('button[type="submit"]');

    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: any) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('should require T&C acceptance for guest users', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input#firstName', 'Jan');
    await page.fill('input#lastName', 'Kowalski');

    await page.waitForSelector('[data-testid="mock-payment-element"]', { timeout: 5000 });
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/checkout/');
  });
});

test.describe('Checkout E2E - Invoice & GUS Integration', () => {
  let testProduct: any;

  test.beforeAll(async () => {
    const { data } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Invoice Test ${Date.now()}`,
        slug: `invoice-test-${Date.now()}`,
        price: 100,
        currency: 'PLN',
        is_active: true
      })
      .select()
      .single();
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
  });

  test('should complete checkout with invoice and GUS autofill', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.route('**/api/gus/fetch-company-data', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            nazwa: 'TEST SPÓŁKA Z O.O.',
            ulica: 'ul. Testowa',
            nrNieruchomosci: '123',
            nrLokalu: '4',
            miejscowosc: 'Warszawa',
            kodPocztowy: '00-001',
            wojewodztwo: 'MAZOWIECKIE',
            regon: '123456789',
            nip: TEST_NIP_VALID
          }
        })
      });
    });

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', `invoice-${Date.now()}@test.com`);
    await page.fill('input#firstName', 'Jan');
    await page.fill('input#lastName', 'Kowalski');

    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();

    await expect(page.locator('input#nip')).toBeVisible();

    const nipInput = page.locator('input#nip');
    await nipInput.fill(TEST_NIP_VALID);
    await nipInput.blur();

    await page.waitForTimeout(1000);

    await expect(page.locator('input#companyName')).toHaveValue('TEST SPÓŁKA Z O.O.');
    await expect(page.locator('input#address')).toHaveValue('ul. Testowa 123/4');
    await expect(page.locator('input#city')).toHaveValue('Warszawa');
    await expect(page.locator('input#postalCode')).toHaveValue('00-001');

    await expect(page.locator('text=Dane pobrane z bazy GUS')).toBeVisible();

    await page.waitForSelector('[data-testid="mock-payment-element"]', { timeout: 5000 });

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/payment\/success/, { timeout: 10000 });
  });

  test('should validate NIP before calling GUS API', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.locator('input[type="checkbox"]').nth(1).check();

    const nipInput = page.locator('input#nip');
    await nipInput.fill('1234567890');
    await nipInput.blur();

    await expect(page.locator('text=/Nieprawidłowy numer NIP/i')).toBeVisible();
    await expect(page.locator('svg.animate-spin').first()).not.toBeVisible();
  });

  test('should require NIP and company name when invoice is checked', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input#firstName', 'Jan');
    await page.fill('input#lastName', 'Kowalski');
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').nth(1).check();

    await page.waitForSelector('[data-testid="mock-payment-element"]', { timeout: 5000 });

    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/checkout/');
  });
});

test.describe('Checkout E2E - Error Scenarios', () => {
  let testProduct: any;

  test.beforeAll(async () => {
    const { data } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Error Test ${Date.now()}`,
        slug: `error-test-${Date.now()}`,
        price: 50,
        currency: 'PLN',
        is_active: true
      })
      .select()
      .single();
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
  });

  test('should handle declined payment gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.loadStripe = async function() {
        return {
          elements: function() {
            return {
              _commonOptions: { clientSecret: 'pi_mock_secret_123' },
              create: function() {
                return {
                  mount: function(selector) {
                    const container = document.querySelector(selector);
                    if (container) {
                      const mockEl = document.createElement('div');
                      mockEl.setAttribute('data-testid', 'mock-payment-element');
                      mockEl.textContent = 'Mock Payment Element';
                      container.appendChild(mockEl);
                    }
                  },
                  on: function() {},
                  unmount: function() {},
                  destroy: function() {}
                };
              },
              submit: async function() {
                return { error: null };
              }
            };
          },
          confirmPayment: async function() {
            return {
              error: {
                type: 'card_error',
                code: 'card_declined',
                message: 'Your card was declined.'
              }
            };
          },
          retrievePaymentIntent: async function(cs) {
            return {
              paymentIntent: {
                id: 'pi_mock',
                client_secret: cs,
                status: 'requires_payment_method'
              }
            };
          }
        };
      };
      // @ts-ignore
      window.Stripe = window.loadStripe;
    });

    await page.route('https://js.stripe.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '// Mocked'
      });
    });

    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'declined@test.com');
    await page.fill('input#firstName', 'Declined');
    await page.fill('input#lastName', 'Card');
    await page.locator('input[type="checkbox"]').first().check();

    await page.waitForSelector('[data-testid="mock-payment-element"]', { timeout: 5000 });

    await page.click('button[type="submit"]');

    await expect(page.locator('text=/Your card was declined/i')).toBeVisible({ timeout: 5000 });

    expect(page.url()).toContain('/checkout/');
  });

  test('should handle GUS API failure gracefully', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.route('**/api/gus/fetch-company-data', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'UNKNOWN_ERROR'
        })
      });
    });

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.locator('input[type="checkbox"]').nth(1).check();

    const nipInput = page.locator('input#nip');
    await nipInput.fill(TEST_NIP_VALID);
    await nipInput.blur();

    await page.waitForTimeout(1000);

    await expect(page.locator('text=/Nie udało się pobrać danych/i')).toBeVisible();

    await page.fill('input#companyName', 'MANUAL COMPANY');
    await page.fill('input#address', 'ul. Manual 1');
    await page.fill('input#city', 'Warsaw');

    await expect(page.locator('input#companyName')).toHaveValue('MANUAL COMPANY');
  });

  test('should show 404 for non-existent product', async ({ page }) => {
    await page.goto('/pl/checkout/non-existent-product-slug-12345');

    await expect(page.locator('text=/not found|404/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show 404 for inactive product', async ({ page }) => {
    const { data: inactiveProduct } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Inactive Product',
        slug: `inactive-${Date.now()}`,
        price: 100,
        currency: 'PLN',
        is_active: false
      })
      .select()
      .single();

    await page.goto(`/pl/checkout/${inactiveProduct.slug}`);

    await expect(page.locator('text=/not found|404/i')).toBeVisible({ timeout: 5000 });

    await supabaseAdmin.from('products').delete().eq('id', inactiveProduct.id);
  });
});

test.describe('Checkout E2E - Price Display', () => {
  let testProduct: any;

  test.beforeAll(async () => {
    const { data } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Price Test ${Date.now()}`,
        slug: `price-test-${Date.now()}`,
        price: 123,
        currency: 'PLN',
        vat_rate: 23,
        price_includes_vat: true,
        is_active: true
      })
      .select()
      .single();
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
  });

  test('should display correct price breakdown with VAT', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await expect(page.locator(`text=${testProduct.name}`)).toBeVisible();
    await expect(page.locator('text=/123.*PLN/i')).toBeVisible();
    await expect(page.locator('text=/VAT.*23%/i')).toBeVisible();
  });

  test('should show price summary section', async ({ page }) => {
    await mockStripe(page);
    await mockStripeAPI(page);

    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await expect(page.locator('text=/Price Summary|Podsumowanie ceny/i')).toBeVisible();
  });
});
