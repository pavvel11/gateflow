import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Payment Status Redirect E2E Tests
 *
 * Strategy: Insert mock payment data directly into database.
 * The verifyPaymentSession function checks database first before calling Stripe.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const JOHN_DOE = {
  email: 'john.doe@example.com',
  password: 'password123',
  id: 'aaaaaaaa-1111-4111-a111-111111111111',
};

const GUEST_EMAIL = 'guest-test@example.com';

const PRODUCTS = {
  otoActive: 'test-oto-active',
  productRedirect: 'test-product-redirect',
  customRedirect: 'test-custom-redirect',
  otoOwned: 'test-oto-owned',
  noRedirect: 'test-no-redirect',
  otoTarget: 'test-oto-target',
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
    .select('id, name, slug')
    .eq('slug', slug)
    .single();
  return data;
}

async function createMockPayment(params: {
  sessionId: string;
  productSlug: string;
  email: string;
  userId?: string;
  amount?: number;
}) {
  const product = await getProductBySlug(params.productSlug);
  if (!product) throw new Error(`Product not found: ${params.productSlug}`);

  const { data: transaction, error: txError } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      session_id: params.sessionId,
      product_id: product.id,
      customer_email: params.email,
      user_id: params.userId || null,
      amount: (params.amount || 1999) / 100,
      currency: 'usd',
      status: 'completed',
      stripe_payment_intent_id: `pi_test_${params.sessionId}`,
    })
    .select()
    .single();

  if (txError) throw txError;

  if (params.userId) {
    await supabaseAdmin
      .from('user_product_access')
      .upsert({
        user_id: params.userId,
        product_id: product.id,
        access_granted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });
  }

  return transaction;
}

async function cleanupMockPayment(sessionId: string) {
  await supabaseAdmin
    .from('payment_transactions')
    .delete()
    .eq('session_id', sessionId);
}

function generateSessionId(prefix: string): string {
  return `cs_test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Global setup - ensure all test products are active
test.beforeAll(async () => {
  const productSlugs = Object.values(PRODUCTS);
  for (const slug of productSlugs) {
    await supabaseAdmin.from('products').update({ is_active: true }).eq('slug', slug);
  }
  console.log('Activated test products:', productSlugs);
});

test.describe('Payment Status Redirect - Logged-in User', () => {
  // Run tests serially because they share john.doe's product access data
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsJohnDoe(page);
  });

  test('test-oto-active: should show OTO offer after purchase', async ({ page }) => {
    const sessionId = generateSessionId('oto_active');
    const otoTarget = await getProductBySlug(PRODUCTS.otoTarget);

    // Remove access to OTO target so OTO will be shown
    await supabaseAdmin
      .from('user_product_access')
      .delete()
      .eq('user_id', JOHN_DOE.id)
      .eq('product_id', otoTarget!.id);

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.otoActive,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
      });

      await page.goto(`/p/${PRODUCTS.otoActive}/payment-status?session_id=${sessionId}`);

      // Should show OTO offer
      await expect(page.getByText('Exclusive one-time offer!')).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /Yes, I want this/i })).toBeVisible();
    } finally {
      // Restore access
      await supabaseAdmin
        .from('user_product_access')
        .upsert({
          user_id: JOHN_DOE.id,
          product_id: otoTarget!.id,
          access_granted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_id,product_id' });
      await cleanupMockPayment(sessionId);
    }
  });

  test('test-product-redirect: should redirect to internal product', async ({ page }) => {
    const sessionId = generateSessionId('product_redirect');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.productRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
      });

      await page.goto(`/p/${PRODUCTS.productRedirect}/payment-status?session_id=${sessionId}`);

      // Should redirect to premium-course (either see payment success first or direct redirect)
      await page.waitForURL(/\/p\/premium-course/, { timeout: 15000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('test-custom-redirect: should redirect to external URL', async ({ page }) => {
    const sessionId = generateSessionId('custom_redirect');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.customRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
      });

      let redirectUrl: string | null = null;
      await page.route('https://google.com/**', async (route) => {
        redirectUrl = route.request().url();
        await route.abort();
      });

      await page.goto(`/p/${PRODUCTS.customRedirect}/payment-status?session_id=${sessionId}`);

      // Wait for external redirect attempt
      await page.waitForTimeout(8000);
      expect(redirectUrl).toContain('google.com');
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('test-oto-owned: should skip OTO (user owns OTO product)', async ({ page }) => {
    const sessionId = generateSessionId('oto_owned');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.otoOwned,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
      });

      await page.goto(`/p/${PRODUCTS.otoOwned}/payment-status?session_id=${sessionId}`);

      // Wait for page to load and potentially redirect
      await page.waitForTimeout(3000);

      // Should NOT show OTO offer (was skipped because user owns OTO target)
      await expect(page.getByText('Exclusive one-time offer!')).not.toBeVisible();
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('test-no-redirect: should redirect to product page', async ({ page }) => {
    const sessionId = generateSessionId('no_redirect');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.noRedirect,
        email: JOHN_DOE.email,
        userId: JOHN_DOE.id,
      });

      await page.goto(`/p/${PRODUCTS.noRedirect}/payment-status?session_id=${sessionId}`);

      // Should eventually land on product page (payment-status → product page)
      await page.waitForURL(new RegExp(`/p/${PRODUCTS.noRedirect}($|[?#])`), { timeout: 15000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

test.describe('Payment Status Redirect - Guest User', () => {
  test('test-oto-active (guest): should show OTO offer', async ({ page }) => {
    const sessionId = generateSessionId('guest_oto');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.otoActive,
        email: GUEST_EMAIL,
      });

      await page.goto(`/p/${PRODUCTS.otoActive}/payment-status?session_id=${sessionId}`);

      // Should show OTO offer for guest
      await expect(page.getByText('Exclusive one-time offer!')).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });

  test('test-no-redirect (guest): should show success page', async ({ page }) => {
    const sessionId = generateSessionId('guest_no_redirect');

    try {
      await createMockPayment({
        sessionId,
        productSlug: PRODUCTS.noRedirect,
        email: GUEST_EMAIL,
      });

      await page.goto(`/p/${PRODUCTS.noRedirect}/payment-status?session_id=${sessionId}`);

      // Should show success or magic link section
      await expect(page.getByRole('heading', { name: /Payment|Successful|Magic Link/i })).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanupMockPayment(sessionId);
    }
  });
});

test.describe('Payment Status - Edge Cases', () => {
  test('should handle invalid session_id gracefully', async ({ page }) => {
    await page.goto(`/p/${PRODUCTS.noRedirect}/payment-status?session_id=cs_invalid_123`);
    await expect(page.getByRole('heading', { name: /Failed|Error/i })).toBeVisible({ timeout: 15000 });
  });
});
