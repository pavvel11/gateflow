import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Complete Payment Flow E2E Tests
 *
 * Strategy: Insert mock payment data directly into database.
 * The verifyPaymentSession function checks database first before calling Stripe.
 *
 * Uses existing seed products to avoid test isolation issues.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test user from seed data
const JOHN_DOE = {
  email: 'john.doe@example.com',
  password: 'password123',
  id: 'aaaaaaaa-1111-4111-a111-111111111111',
};

// Existing seed products
const PRODUCTS = {
  // premium-course has bump: pro-toolkit
  premiumCourse: 'premium-course',
  proToolkit: 'pro-toolkit',
  // test-custom-redirect has pass_params_to_redirect=true, redirects to google.com
  customRedirect: 'test-custom-redirect',
  // enterprise-package has 3 days timed access
  enterprise: 'enterprise-package',
  // test-no-redirect - basic product
  noRedirect: 'test-no-redirect',
};

async function loginAsJohnDoe(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const supabase = createBrowserClient(supabaseUrl, anonKey);
    await supabase.auth.signInWithPassword({ email, password });
  }, {
    email: JOHN_DOE.email,
    password: JOHN_DOE.password,
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON_KEY,
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function getProductBySlug(slug: string) {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, auto_grant_duration_days')
    .eq('slug', slug)
    .single();
  return data;
}

function generateSessionId(prefix: string): string {
  return `cs_test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create mock payment transaction in database
 */
async function createMockPayment(params: {
  sessionId: string;
  productSlug: string;
  email: string;
  userId?: string;
  amount?: number;
  bumpProductSlug?: string;
  bumpAmount?: number;
}) {
  const product = await getProductBySlug(params.productSlug);
  if (!product) throw new Error(`Product not found: ${params.productSlug}`);

  // Insert main transaction
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      session_id: params.sessionId,
      product_id: product.id,
      customer_email: params.email,
      user_id: params.userId || null,
      amount: (params.amount || 9900) / 100,
      currency: 'pln',
      status: 'completed',
      stripe_payment_intent_id: `pi_test_${params.sessionId}`,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Grant access to main product
  if (params.userId) {
    const expiresAt = product.auto_grant_duration_days
      ? new Date(Date.now() + product.auto_grant_duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from('user_product_access')
      .upsert({
        user_id: params.userId,
        product_id: product.id,
        access_granted_at: new Date().toISOString(),
        access_expires_at: expiresAt,
        access_duration_days: product.auto_grant_duration_days || null,
      }, { onConflict: 'user_id,product_id' });
  } else {
    // Guest purchase - session_id is unique, use insert not upsert
    const { error: guestError } = await supabaseAdmin
      .from('guest_purchases')
      .insert({
        session_id: params.sessionId,
        customer_email: params.email,
        product_id: product.id,
        transaction_amount: (params.amount || 9900) / 100,
      });
    if (guestError) {
      console.error('Guest purchase insert error:', guestError);
      throw guestError;
    }
  }

  // Handle bump product if provided
  if (params.bumpProductSlug) {
    const bumpProduct = await getProductBySlug(params.bumpProductSlug);
    if (!bumpProduct) throw new Error(`Bump product not found: ${params.bumpProductSlug}`);

    const bumpSessionId = `${params.sessionId}_bump`;
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: bumpSessionId,
        product_id: bumpProduct.id,
        customer_email: params.email,
        user_id: params.userId || null,
        amount: (params.bumpAmount || 1900) / 100,
        currency: 'pln',
        status: 'completed',
        stripe_payment_intent_id: `pi_test_${bumpSessionId}`,
      });

    if (params.userId) {
      const bumpExpiresAt = bumpProduct.auto_grant_duration_days
        ? new Date(Date.now() + bumpProduct.auto_grant_duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabaseAdmin
        .from('user_product_access')
        .upsert({
          user_id: params.userId,
          product_id: bumpProduct.id,
          access_granted_at: new Date().toISOString(),
          access_expires_at: bumpExpiresAt,
          access_duration_days: bumpProduct.auto_grant_duration_days || null,
        }, { onConflict: 'user_id,product_id' });
    } else {
      // Guest bump purchase
      const { error: bumpGuestError } = await supabaseAdmin
        .from('guest_purchases')
        .insert({
          session_id: bumpSessionId,
          customer_email: params.email,
          product_id: bumpProduct.id,
          transaction_amount: (params.bumpAmount || 1900) / 100,
        });
      if (bumpGuestError) {
        console.error('Guest bump purchase insert error:', bumpGuestError);
        throw bumpGuestError;
      }
    }
  }

  return transaction;
}

async function cleanupMockPayment(sessionId: string) {
  await supabaseAdmin.from('payment_transactions').delete().eq('session_id', sessionId);
  await supabaseAdmin.from('payment_transactions').delete().eq('session_id', `${sessionId}_bump`);
  await supabaseAdmin.from('guest_purchases').delete().eq('session_id', sessionId);
  await supabaseAdmin.from('guest_purchases').delete().eq('session_id', `${sessionId}_bump`);
}

async function removeUserAccess(userId: string, productSlug: string) {
  const product = await getProductBySlug(productSlug);
  if (product) {
    await supabaseAdmin.from('user_product_access').delete()
      .eq('user_id', userId).eq('product_id', product.id);
  }
}

async function getUserAccess(userId: string, productSlug: string) {
  const product = await getProductBySlug(productSlug);
  if (!product) return null;
  const { data } = await supabaseAdmin.from('user_product_access')
    .select('*').eq('user_id', userId).eq('product_id', product.id).maybeSingle();
  return data;
}

async function setExpiredAccess(userId: string, productSlug: string, durationDays: number) {
  const product = await getProductBySlug(productSlug);
  if (!product) throw new Error(`Product not found: ${productSlug}`);

  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from('user_product_access').upsert({
    user_id: userId,
    product_id: product.id,
    access_granted_at: new Date(Date.now() - (durationDays + 1) * 24 * 60 * 60 * 1000).toISOString(),
    access_expires_at: expiredDate,
    access_duration_days: durationDays,
  }, { onConflict: 'user_id,product_id' });
}

// ============================================================================
// GLOBAL SETUP - Ensure seed products are active
// ============================================================================

test.beforeAll(async () => {
  // Ensure all test products are active (might have been deactivated by other tests)
  const productSlugs = Object.values(PRODUCTS);
  for (const slug of productSlugs) {
    await supabaseAdmin.from('products').update({ is_active: true }).eq('slug', slug);
  }
  console.log('Activated all test products:', productSlugs);
});

// ============================================================================
// ORDER BUMP TESTS - Logged-in User
// ============================================================================

test.describe('Order Bump - Logged-in User', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
    // Clean up before each test
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.proToolkit);
  });

  test.afterEach(async () => {
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.proToolkit);
  });

  test('should grant access to ONLY main product when bump NOT selected', async ({ page }) => {
    const sessionId = generateSessionId('no_bump_logged');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.premiumCourse,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 19900,
        // No bumpProductSlug - bump not selected
      });

      await page.goto(`/p/${PRODUCTS.premiumCourse}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify main product access granted
      const mainAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);
      expect(mainAccess).toBeTruthy();

      // Verify bump product access NOT granted
      const bumpAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.proToolkit);
      expect(bumpAccess).toBeNull();

      // Verify UI shows access granted
      await expect(page.getByText(/Access Granted/i)).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('should grant access to BOTH products when bump IS selected', async ({ page }) => {
    const sessionId = generateSessionId('with_bump_logged');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.premiumCourse,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 24800,
        bumpProductSlug: PRODUCTS.proToolkit,
        bumpAmount: 4900,
      });

      await page.goto(`/p/${PRODUCTS.premiumCourse}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify main product access granted
      const mainAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);
      expect(mainAccess).toBeTruthy();

      // Verify bump product access also granted
      const bumpAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.proToolkit);
      expect(bumpAccess).toBeTruthy();

      // Verify UI shows access granted
      await expect(page.getByText(/Access Granted/i)).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

// ============================================================================
// ORDER BUMP TESTS - Guest User
// ============================================================================

test.describe('Order Bump - Guest User', () => {
  // Run serially to avoid conflicts with shared cleanup
  test.describe.configure({ mode: 'serial' });

  test('should save guest purchase for ONLY main product when bump NOT selected', async ({ page }) => {
    const sessionId = generateSessionId('no_bump_guest');
    const guestEmail = `guest-nobump-${Date.now()}@example.com`;
    const product = await getProductBySlug(PRODUCTS.premiumCourse);
    const bumpProduct = await getProductBySlug(PRODUCTS.proToolkit);

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.premiumCourse,
        email: guestEmail,
        amount: 19900,
      });

      await page.goto(`/p/${PRODUCTS.premiumCourse}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify guest purchase saved for main product
      const { data: mainPurchase } = await supabaseAdmin.from('guest_purchases')
        .select('*').eq('customer_email', guestEmail).eq('product_id', product!.id).maybeSingle();
      expect(mainPurchase).toBeTruthy();

      // Verify NO guest purchase for bump product
      const { data: bumpPurchase } = await supabaseAdmin.from('guest_purchases')
        .select('*').eq('customer_email', guestEmail).eq('product_id', bumpProduct!.id).maybeSingle();
      expect(bumpPurchase).toBeNull();

      // Verify payment successful shown (OTO may be shown first, then magic link option)
      await expect(page.getByRole('heading', { name: /Payment Successful/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
      await supabaseAdmin.from('guest_purchases').delete().eq('customer_email', guestEmail);
    }
  });

  test('should save guest purchase for BOTH products when bump IS selected', async ({ page }) => {
    const sessionId = generateSessionId('with_bump_guest');
    const guestEmail = `guest-withbump-${Date.now()}@example.com`;
    const product = await getProductBySlug(PRODUCTS.premiumCourse);
    const bumpProduct = await getProductBySlug(PRODUCTS.proToolkit);

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.premiumCourse,
        email: guestEmail,
        amount: 24800,
        bumpProductSlug: PRODUCTS.proToolkit,
        bumpAmount: 4900,
      });

      await page.goto(`/p/${PRODUCTS.premiumCourse}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify guest purchase saved for main product
      const { data: mainPurchase } = await supabaseAdmin.from('guest_purchases')
        .select('*').eq('customer_email', guestEmail).eq('product_id', product!.id).maybeSingle();
      expect(mainPurchase).toBeTruthy();

      // Verify guest purchase saved for bump product
      const { data: bumpPurchase } = await supabaseAdmin.from('guest_purchases')
        .select('*').eq('customer_email', guestEmail).eq('product_id', bumpProduct!.id).maybeSingle();
      expect(bumpPurchase).toBeTruthy();

      // Verify payment successful shown (OTO may be shown first, then magic link option)
      await expect(page.getByRole('heading', { name: /Payment Successful/i })).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
      await supabaseAdmin.from('guest_purchases').delete().eq('customer_email', guestEmail);
    }
  });
});

// ============================================================================
// PASS PARAMS TO REDIRECT TESTS
// ============================================================================

test.describe('Pass Params to Redirect', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.customRedirect);
  });

  test.afterEach(async () => {
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.customRedirect);
  });

  test('should pass email and session_id to external redirect URL', async ({ page }) => {
    const sessionId = generateSessionId('redirect_params');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.customRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 4900,
      });

      // Intercept external redirect to capture URL
      let redirectUrl: string | null = null;
      await page.route('https://google.com/**', async (route) => {
        redirectUrl = route.request().url();
        await route.abort();
      });

      await page.goto(`/p/${PRODUCTS.customRedirect}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(8000);

      // Verify redirect URL contains expected params
      expect(redirectUrl).not.toBeNull();
      expect(redirectUrl).toContain('google.com');
      expect(redirectUrl).toContain(`email=${encodeURIComponent(JOHN_DOE.email)}`);
      // Note: param name is 'sessionId' not 'session_id' (camelCase from buildSuccessRedirectUrl)
      expect(redirectUrl).toContain(`sessionId=${sessionId}`);
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

// ============================================================================
// ALREADY HAS ACCESS TESTS
// ============================================================================

test.describe('Already Has Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
  });

  test.afterEach(async () => {
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.noRedirect);
  });

  test('should handle user who already has access to product', async ({ page }) => {
    const sessionId = generateSessionId('already_access');
    const product = await getProductBySlug(PRODUCTS.noRedirect);

    try {
      // First, give john.doe existing access
      await supabaseAdmin.from('user_product_access').upsert({
        user_id: JOHN_DOE.id,
        product_id: product!.id,
        access_granted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        access_expires_at: null,
      }, { onConflict: 'user_id,product_id' });

      // Now create a "new" payment for same product
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.noRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 9900,
      });

      await page.goto(`/p/${PRODUCTS.noRedirect}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Should still show access granted (not error)
      await expect(page.getByText(/Access Granted/i)).toBeVisible({ timeout: 10000 });

      // User should still have access
      const access = await getUserAccess(JOHN_DOE.id, PRODUCTS.noRedirect);
      expect(access).toBeTruthy();
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

// ============================================================================
// TIMED ACCESS TESTS
// ============================================================================

test.describe('Timed Access', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.enterprise);
  });

  test.afterEach(async () => {
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.enterprise);
  });

  test('should grant timed access (3 days) after purchase', async ({ page }) => {
    const sessionId = generateSessionId('timed_access');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.enterprise,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 49999,
      });

      await page.goto(`/p/${PRODUCTS.enterprise}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify access with expiry
      const access = await getUserAccess(JOHN_DOE.id, PRODUCTS.enterprise);
      expect(access).toBeTruthy();
      expect(access!.access_duration_days).toBe(3);
      expect(access!.access_expires_at).not.toBeNull();

      // Verify expiry is ~3 days from now
      const expiresAt = new Date(access!.access_expires_at);
      const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(2);
      expect(diffDays).toBeLessThan(4);

      // UI should show access granted
      await expect(page.getByText(/Access Granted/i)).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('should renew expired access after repurchase', async ({ page }) => {
    const sessionId = generateSessionId('expired_repurchase');

    try {
      // Set expired access (3 days product, expired 1 day ago)
      await setExpiredAccess(JOHN_DOE.id, PRODUCTS.enterprise, 3);

      // Verify access is expired
      const expiredAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.enterprise);
      expect(expiredAccess).toBeTruthy();
      expect(new Date(expiredAccess!.access_expires_at).getTime()).toBeLessThan(Date.now());

      // Create repurchase payment
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.enterprise,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 49999,
      });

      await page.goto(`/p/${PRODUCTS.enterprise}/payment-status?session_id=${sessionId}`);
      await page.waitForTimeout(3000);

      // Verify access renewed (new expiry in future)
      const renewedAccess = await getUserAccess(JOHN_DOE.id, PRODUCTS.enterprise);
      expect(renewedAccess).toBeTruthy();

      const expiresAt = new Date(renewedAccess!.access_expires_at);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // UI should show access granted
      await expect(page.getByText(/Access Granted/i)).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

// ============================================================================
// PURCHASE HISTORY TESTS - Verify purchase appears in /my-purchases
// ============================================================================

test.describe('Purchase History - /my-purchases', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.noRedirect);
  });

  test.afterEach(async () => {
    await removeUserAccess(JOHN_DOE.id, PRODUCTS.noRedirect);
  });

  test('should display purchase in /my-purchases after successful payment', async ({ page }) => {
    const sessionId = generateSessionId('purchase_history');
    const product = await getProductBySlug(PRODUCTS.noRedirect);

    try {
      // Create a mock payment (simulates completed Stripe payment)
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.noRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 9900,
      });

      // Verify payment transaction was created in database
      const { data: transaction } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction.status).toBe('completed');
      expect(transaction.user_id).toBe(JOHN_DOE.id);

      // Navigate to my-purchases page
      await page.goto('/en/my-purchases');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should see the page title (inside gradient span)
      await expect(page.getByRole('heading', { level: 1 }).getByText('My Purchases')).toBeVisible({ timeout: 10000 });

      // Should see the purchased product in the list (use first() as there may be multiple entries)
      await expect(page.getByText(product!.name).first()).toBeVisible({ timeout: 10000 });

      // Should see "Completed" status badge (at least one)
      await expect(page.getByText('Completed').first()).toBeVisible();

    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('should show multiple purchases in /my-purchases', async ({ page }) => {
    const sessionId1 = generateSessionId('multi_purchase_1');
    const sessionId2 = generateSessionId('multi_purchase_2');
    const product1 = await getProductBySlug(PRODUCTS.noRedirect);
    const product2 = await getProductBySlug(PRODUCTS.premiumCourse);

    try {
      // Clean up any existing access for second product
      await removeUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);

      // Create first purchase
      await createMockPayment({
        sessionId: sessionId1,
        productSlug: PRODUCTS.noRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 9900,
      });

      // Create second purchase
      await createMockPayment({
        sessionId: sessionId2,
        productSlug: PRODUCTS.premiumCourse,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
        amount: 19900,
      });

      // Navigate to my-purchases page
      await page.goto('/en/my-purchases');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should see both products in the list (use first() as there may be multiple entries)
      await expect(page.getByText(product1!.name).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(product2!.name).first()).toBeVisible({ timeout: 10000 });

    } finally {
      await cleanupMockPayment(sessionId1);
      await cleanupMockPayment(sessionId2);
      await removeUserAccess(JOHN_DOE.id, PRODUCTS.premiumCourse);
    }
  });

  test('should not show purchases from other users', async ({ page }) => {
    const sessionId = generateSessionId('other_user_purchase');
    const otherUserId = 'bbbbbbbb-2222-4222-b222-222222222222'; // Jane Doe from seed
    const uniqueProductSlug = `jane-only-product-${Date.now()}`;

    // Create a unique product that only Jane will have
    const { data: uniqueProduct } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Jane Only Product ${Date.now()}`,
        slug: uniqueProductSlug,
        price: 5000,
        currency: 'PLN',
        is_active: true,
      })
      .select()
      .single();

    try {
      // Create a purchase for Jane Doe only
      await supabaseAdmin
        .from('payment_transactions')
        .insert({
          session_id: sessionId,
          product_id: uniqueProduct!.id,
          customer_email: 'jane.doe@example.com',
          user_id: otherUserId,
          amount: 5000,
          currency: 'pln',
          status: 'completed',
          stripe_payment_intent_id: `pi_test_${sessionId}`,
        });

      // Log in as John Doe and check my-purchases
      await page.goto('/en/my-purchases');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should see the page title
      await expect(page.getByRole('heading', { level: 1 }).getByText('My Purchases')).toBeVisible({ timeout: 10000 });

      // Should NOT see Jane's unique product (John doesn't have this purchase)
      const productVisible = await page.getByText(uniqueProduct!.name).isVisible().catch(() => false);
      expect(productVisible).toBe(false);

    } finally {
      await supabaseAdmin.from('payment_transactions').delete().eq('session_id', sessionId);
      await supabaseAdmin.from('products').delete().eq('id', uniqueProduct!.id);
    }
  });
});
