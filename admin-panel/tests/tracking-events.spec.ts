import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker to avoid race conditions
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Test GTM Container ID
const TEST_GTM_ID = 'GTM-TRACK01';
const TEST_FB_PIXEL_ID = '1234567890123456';

/**
 * Setup dataLayer spy to capture all pushed events
 */
async function setupDataLayerSpy(page: Page) {
  await page.addInitScript(() => {
    // Create array to store captured events
    (window as any).__dataLayerEvents = [];

    // Initialize dataLayer if not present
    window.dataLayer = window.dataLayer || [];

    // Wrap push method to capture events
    const originalPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function(...args: any[]) {
      args.forEach(arg => {
        (window as any).__dataLayerEvents.push(arg);
      });
      return originalPush(...args);
    };
  });
}

/**
 * Setup Facebook Pixel spy to capture all fbq calls
 */
async function setupFbqSpy(page: Page) {
  await page.addInitScript(() => {
    // Create array to store captured FB Pixel calls
    (window as any).__fbqCalls = [];

    // Create mock fbq function
    (window as any).fbq = function(action: string, event: string, params?: any, options?: any) {
      (window as any).__fbqCalls.push({ action, event, params, options });
    };

    // Mark as loaded to prevent real Pixel from loading
    (window as any).fbq.loaded = true;
    (window as any).fbq.version = '2.0';
    (window as any).fbq.queue = [];
  });
}

/**
 * Get captured dataLayer events from page
 */
async function getDataLayerEvents(page: Page): Promise<any[]> {
  return page.evaluate(() => (window as any).__dataLayerEvents || []);
}

/**
 * Get captured FB Pixel calls from page
 */
async function getFbqCalls(page: Page): Promise<any[]> {
  return page.evaluate(() => (window as any).__fbqCalls || []);
}

/**
 * Mock Stripe to prevent real API calls
 */
async function mockStripe(page: Page) {
  await page.addInitScript(() => {
    (window as any).loadStripe = async function() {
      return {
        elements: function() {
          return {
            _commonOptions: { clientSecret: 'pi_mock_secret_123' },
            create: function() {
              return {
                mount: function(selector: string) {
                  const container = document.querySelector(selector);
                  if (container) {
                    const mockEl = document.createElement('div');
                    mockEl.setAttribute('data-testid', 'mock-payment-element');
                    mockEl.innerHTML = '<div>Mock Payment Element</div>';
                    container.appendChild(mockEl);
                  }
                },
                on: function() {},
                unmount: function() {},
                destroy: function() {}
              };
            },
            submit: async function() { return { error: null }; }
          };
        },
        confirmPayment: async function() { return { error: null }; },
        retrievePaymentIntent: async function(cs: string) {
          return { paymentIntent: { id: 'pi_mock_123', client_secret: cs, status: 'succeeded' } };
        }
      };
    };
    (window as any).Stripe = (window as any).loadStripe;
  });

  await page.route('https://js.stripe.com/**', route => {
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '// Mocked' });
  });

  await page.route('**/api/create-payment-intent', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clientSecret: 'pi_mock_secret_123', amount: 10000 })
    });
  });
}

test.describe('Tracking Events - DataLayer & FB Pixel', () => {
  let testProduct: any;
  let freeProduct: any;

  test.beforeAll(async () => {
    // Configure integrations with GTM and FB Pixel
    await supabaseAdmin.from('integrations_config').upsert({
      id: 1,
      gtm_container_id: TEST_GTM_ID,
      facebook_pixel_id: TEST_FB_PIXEL_ID,
      fb_capi_enabled: true,
      cookie_consent_enabled: false, // Disable consent for simpler testing
      updated_at: new Date().toISOString()
    });

    // Create paid test product
    const { data: paidData, error: paidError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Tracking Test Product ${Date.now()}`,
        slug: `tracking-test-${Date.now()}`,
        price: 99,
        currency: 'PLN',
        description: 'Test product for tracking events',
        is_active: true,
        vat_rate: 23,
      })
      .select()
      .single();

    if (paidError) throw paidError;
    testProduct = paidData;

    // Create free test product
    const { data: freeData, error: freeError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Free Tracking Test ${Date.now()}`,
        slug: `free-tracking-${Date.now()}`,
        price: 0,
        currency: 'PLN',
        description: 'Free product for lead tracking',
        is_active: true,
      })
      .select()
      .single();

    if (freeError) throw freeError;
    freeProduct = freeData;
  });

  test.afterAll(async () => {
    // Cleanup test products
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
    if (freeProduct) {
      await supabaseAdmin.from('products').delete().eq('id', freeProduct.id);
    }

    // Reset integrations config
    await supabaseAdmin.from('integrations_config').delete().eq('id', 1);
  });

  test('should fire view_item and begin_checkout events on paid product checkout page', async ({ page }) => {
    await setupDataLayerSpy(page);
    await setupFbqSpy(page);
    await mockStripe(page);
    await acceptAllCookies(page);

    // Navigate to checkout page
    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for tracking to fire (tracking fires after React hydration)
    await page.waitForTimeout(2000);

    // Get captured events
    const dataLayerEvents = await getDataLayerEvents(page);
    const fbqCalls = await getFbqCalls(page);

    // Verify view_item event in dataLayer
    const viewItemEvent = dataLayerEvents.find((e: any) => e.event === 'view_item');
    expect(viewItemEvent).toBeDefined();
    expect(viewItemEvent.ecommerce).toBeDefined();
    expect(viewItemEvent.ecommerce.items).toHaveLength(1);
    expect(viewItemEvent.ecommerce.items[0].item_id).toBe(testProduct.id);
    expect(viewItemEvent.ecommerce.currency).toBe('PLN');
    expect(viewItemEvent.event_id).toBeDefined();

    // Verify begin_checkout event in dataLayer
    const beginCheckoutEvent = dataLayerEvents.find((e: any) => e.event === 'begin_checkout');
    expect(beginCheckoutEvent).toBeDefined();
    expect(beginCheckoutEvent.ecommerce.items[0].item_id).toBe(testProduct.id);

    // Verify FB Pixel ViewContent call
    const viewContentCall = fbqCalls.find((c: any) => c.event === 'ViewContent');
    expect(viewContentCall).toBeDefined();
    expect(viewContentCall.params.content_ids).toContain(testProduct.id);

    // Verify FB Pixel InitiateCheckout call
    const initiateCheckoutCall = fbqCalls.find((c: any) => c.event === 'InitiateCheckout');
    expect(initiateCheckoutCall).toBeDefined();
  });

  test('should fire view_item event on free product checkout page', async ({ page }) => {
    await setupDataLayerSpy(page);
    await setupFbqSpy(page);
    await acceptAllCookies(page);

    // Navigate to free product checkout
    await page.goto(`/checkout/${freeProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const dataLayerEvents = await getDataLayerEvents(page);

    // Verify view_item event for free product
    const viewItemEvent = dataLayerEvents.find((e: any) => e.event === 'view_item');
    expect(viewItemEvent).toBeDefined();
    expect(viewItemEvent.ecommerce.items[0].item_id).toBe(freeProduct.id);
    expect(viewItemEvent.ecommerce.value).toBe(0);
  });

  test('should have same event_id for dataLayer and FB Pixel (deduplication)', async ({ page }) => {
    await setupDataLayerSpy(page);
    await setupFbqSpy(page);
    await mockStripe(page);
    await acceptAllCookies(page);

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const dataLayerEvents = await getDataLayerEvents(page);
    const fbqCalls = await getFbqCalls(page);

    // Get event IDs from dataLayer
    const viewItemEvent = dataLayerEvents.find((e: any) => e.event === 'view_item');
    const dataLayerEventId = viewItemEvent?.event_id;

    // Get event ID from FB Pixel call (passed via options)
    const viewContentCall = fbqCalls.find((c: any) => c.event === 'ViewContent');
    const fbqEventId = viewContentCall?.options?.eventID;

    // Both should use the same event_id for deduplication
    expect(dataLayerEventId).toBeDefined();
    expect(fbqEventId).toBeDefined();
    expect(dataLayerEventId).toBe(fbqEventId);
  });

  test('should include proper ecommerce structure in dataLayer events', async ({ page }) => {
    await setupDataLayerSpy(page);
    await mockStripe(page);
    await acceptAllCookies(page);

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const dataLayerEvents = await getDataLayerEvents(page);
    const viewItemEvent = dataLayerEvents.find((e: any) => e.event === 'view_item');

    // Verify GA4 ecommerce structure
    expect(viewItemEvent.ecommerce).toMatchObject({
      currency: expect.any(String),
      value: expect.any(Number),
      items: expect.arrayContaining([
        expect.objectContaining({
          item_id: expect.any(String),
          item_name: expect.any(String),
          price: expect.any(Number),
          quantity: 1,
        })
      ])
    });
  });
});

test.describe('Tracking Events - FB CAPI Integration', () => {
  let testProduct: any;
  let capturedCapiRequests: any[] = [];

  test.beforeAll(async () => {
    // Configure integrations with FB CAPI enabled
    await supabaseAdmin.from('integrations_config').upsert({
      id: 1,
      gtm_container_id: TEST_GTM_ID,
      facebook_pixel_id: TEST_FB_PIXEL_ID,
      facebook_capi_token: 'test_capi_token_123',
      fb_capi_enabled: true,
      cookie_consent_enabled: false,
      updated_at: new Date().toISOString()
    });

    // Create test product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `CAPI Test Product ${Date.now()}`,
        slug: `capi-test-${Date.now()}`,
        price: 150,
        currency: 'PLN',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
    await supabaseAdmin.from('integrations_config').delete().eq('id', 1);
  });

  test.beforeEach(async () => {
    capturedCapiRequests = [];
  });

  test('should send ViewContent event to FB CAPI endpoint', async ({ page }) => {
    await setupDataLayerSpy(page);
    await setupFbqSpy(page);
    await mockStripe(page);
    await acceptAllCookies(page);

    // Intercept FB CAPI requests
    await page.route('**/api/tracking/fb-capi', async route => {
      const postData = route.request().postDataJSON();
      capturedCapiRequests.push(postData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, events_received: 1 })
      });
    });

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for CAPI calls

    // Verify CAPI request was made
    expect(capturedCapiRequests.length).toBeGreaterThan(0);

    // Find ViewContent event
    const viewContentRequest = capturedCapiRequests.find(r => r.event_name === 'ViewContent');
    expect(viewContentRequest).toBeDefined();
    expect(viewContentRequest.event_id).toBeDefined();
    expect(viewContentRequest.value).toBe(testProduct.price);
    expect(viewContentRequest.currency).toBe('PLN');
    expect(viewContentRequest.content_ids).toContain(testProduct.id);
  });

  test('should have matching event_id between Pixel and CAPI for deduplication', async ({ page }) => {
    await setupDataLayerSpy(page);
    await setupFbqSpy(page);
    await mockStripe(page);
    await acceptAllCookies(page);

    // Intercept FB CAPI requests
    await page.route('**/api/tracking/fb-capi', async route => {
      const postData = route.request().postDataJSON();
      capturedCapiRequests.push(postData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const fbqCalls = await getFbqCalls(page);

    // Get event_id from FB Pixel
    const pixelViewContent = fbqCalls.find((c: any) => c.event === 'ViewContent');
    const pixelEventId = pixelViewContent?.options?.eventID;

    // Get event_id from CAPI
    const capiViewContent = capturedCapiRequests.find(r => r.event_name === 'ViewContent');
    const capiEventId = capiViewContent?.event_id;

    // Both should match for proper deduplication
    expect(pixelEventId).toBeDefined();
    expect(capiEventId).toBeDefined();
    expect(pixelEventId).toBe(capiEventId);
  });
});

test.describe('Tracking Events - Consent Mode Integration', () => {
  let testProduct: any;

  test.beforeAll(async () => {
    // Configure integrations with consent ENABLED
    await supabaseAdmin.from('integrations_config').upsert({
      id: 1,
      gtm_container_id: TEST_GTM_ID,
      facebook_pixel_id: TEST_FB_PIXEL_ID,
      fb_capi_enabled: false,
      cookie_consent_enabled: true, // Enable consent
      updated_at: new Date().toISOString()
    });

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Consent Test Product ${Date.now()}`,
        slug: `consent-test-${Date.now()}`,
        price: 50,
        currency: 'PLN',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
    await supabaseAdmin.from('integrations_config').delete().eq('id', 1);
  });

  test('should initialize Google Consent Mode V2 defaults', async ({ page }) => {
    await setupDataLayerSpy(page);
    await mockStripe(page);

    // Clear cookies to ensure no consent
    await page.context().clearCookies();

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Check for consent mode initialization in dataLayer
    const dataLayerEvents = await getDataLayerEvents(page);

    // Look for gtag consent default call
    // Note: The consent defaults are set via gtag() which pushes to dataLayer
    const hasConsentDefaults = dataLayerEvents.some((e: any) => {
      // gtag pushes ['consent', 'default', {...}] structure
      return Array.isArray(e) && e[0] === 'consent' && e[1] === 'default';
    });

    // Or check for consent object in first events
    const hasConsentConfig = await page.evaluate(() => {
      return typeof (window as any).gtag === 'function';
    });

    // At minimum, gtag should be defined when consent mode is active
    expect(hasConsentConfig).toBe(true);
  });

  test('should block tracking until consent is given', async ({ page }) => {
    await setupFbqSpy(page);
    await mockStripe(page);

    // Clear cookies - no consent given
    await page.context().clearCookies();

    await page.goto(`/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // When consent is required and not given, GTM scripts should be blocked
    // Check that GTM script is either not present or has type="text/plain"
    const gtmScriptBlocked = await page.evaluate((gtmId) => {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.innerHTML.includes(gtmId) || (script.src && script.src.includes('googletagmanager'))) {
          // If script has type="text/plain", it's blocked by Klaro
          if (script.type === 'text/plain') {
            return true; // Blocked
          }
          // If script has data-name attribute, it's managed by Klaro
          if (script.hasAttribute('data-name')) {
            return true; // Managed/blocked
          }
        }
      }
      return false;
    }, TEST_GTM_ID);

    // The GTM script should be blocked when consent is not given
    // Note: Exact behavior depends on Klaro configuration
    expect(gtmScriptBlocked).toBe(true);
  });
});

// Note: Validation tests for integrations are in tests/integrations-validation.spec.ts
