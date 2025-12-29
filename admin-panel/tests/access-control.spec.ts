import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Access Control (Security)', () => {
  // Enforce single worker
  test.describe.configure({ mode: 'serial' });
  let testProduct: any;
  let userWithAccess: any;
  let userWithoutAccess: any;
  const password = 'TestPassword123!';

  // Helper to login
  const loginAsUser = async (page: Page, email: string) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email,
      password,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);
  };

  test.beforeAll(async () => {
    // 1. Create test product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Access Control Test ${Date.now()}`,
        slug: `access-test-${Date.now()}`,
        price: 20,
        currency: 'USD',
        description: 'Test product for access control',
        is_active: true
      })
      .select()
      .single();

    if (productError) throw productError;
    testProduct = product;

    // 2. Create user WITH access
    const email1 = `user-with-access-${Date.now()}@test.com`;
    const { data: { user: user1 }, error: createError1 } = await supabaseAdmin.auth.admin.createUser({
      email: email1,
      password,
      email_confirm: true,
    });
    if (createError1) throw createError1;
    userWithAccess = { ...user1, email: email1 };

    // Grant access to product
    await supabaseAdmin
      .from('user_product_access')
      .insert({
        user_id: userWithAccess.id,
        product_id: testProduct.id,
      });

    // 3. Create user WITHOUT access
    const email2 = `user-no-access-${Date.now()}@test.com`;
    const { data: { user: user2 }, error: createError2 } = await supabaseAdmin.auth.admin.createUser({
      email: email2,
      password,
      email_confirm: true,
    });
    if (createError2) throw createError2;
    userWithoutAccess = { ...user2, email: email2 };
  });

  test.afterAll(async () => {
    // Cleanup
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
    if (userWithAccess) {
      await supabaseAdmin.auth.admin.deleteUser(userWithAccess.id);
    }
    if (userWithoutAccess) {
      await supabaseAdmin.auth.admin.deleteUser(userWithoutAccess.id);
    }
  });

  test('user WITH access should see protected content', async ({ page }) => {
    await loginAsUser(page, userWithAccess.email);

    // Navigate to product page
    await page.goto(`/p/${testProduct.slug}`);

    // Should see ProductAccessView (user has access)
    // Look for content that indicates access granted
    await expect(page.locator('body')).not.toContainText('Purchase Access');
    await expect(page.locator('body')).not.toContainText('Checkout');

    // Should not show error or redirect to checkout
    await expect(page).toHaveURL(new RegExp(`/p/${testProduct.slug}`));
  });

  test('user WITHOUT access should be redirected or see checkout prompt', async ({ page }) => {
    await loginAsUser(page, userWithoutAccess.email);

    // Navigate to product page
    await page.goto(`/p/${testProduct.slug}`);

    // Wait for potential redirect
    await page.waitForTimeout(2000);

    // Should either:
    // 1. Be redirected to checkout page
    // 2. See a message about no access
    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();

    const isRedirectedToCheckout = currentUrl.includes('/checkout/');
    const showsNoAccessMessage = bodyText?.includes('Purchase') ||
                                   bodyText?.includes('Get Access') ||
                                   bodyText?.includes('Redirecting');

    expect(isRedirectedToCheckout || showsNoAccessMessage).toBeTruthy();
  });

  test('guest (not logged in) should not access protected product', async ({ page }) => {
    // Navigate as guest (no login)
    await page.goto(`/p/${testProduct.slug}`);

    // Wait for redirect or message
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();

    // Should be redirected to checkout or login
    const isRedirectedToCheckout = currentUrl.includes('/checkout/');
    const isRedirectedToLogin = currentUrl.includes('/login');
    const showsPrompt = bodyText?.includes('Purchase') || bodyText?.includes('Redirecting');

    expect(isRedirectedToCheckout || isRedirectedToLogin || showsPrompt).toBeTruthy();
  });

  test('API /api/access should enforce access control', async ({ page }) => {
    // check_rate_limit function signature has been fixed
    // Test as authenticated user WITH access
    await loginAsUser(page, userWithAccess.email);

    // Call API from browser context (with cookies)
    const response1 = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          productSlugs: [slug]
        })
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json()
      };
    }, { slug: testProduct.slug });

    expect(response1.ok).toBeTruthy();
    expect(response1.body.accessResults).toBeDefined();
    expect(response1.body.accessResults[testProduct.slug]).toBe(true);

    // Test as user WITHOUT access
    await loginAsUser(page, userWithoutAccess.email);

    const response2 = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          productSlugs: [slug]
        })
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json()
      };
    }, { slug: testProduct.slug });

    expect(response2.ok).toBeTruthy();
    expect(response2.body.accessResults[testProduct.slug]).toBe(false);
  });

  test('should prevent privilege escalation via API', async ({ request }) => {
    // Attempt to access without valid token
    const response = await request.post('/api/access', {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      data: {
        productSlugs: [testProduct.slug]
      }
    });

    // Should either reject or return no access
    const body = await response.json();

    if (response.ok()) {
      // If endpoint allows anonymous, should return false for all products
      expect(body.accessResults[testProduct.slug]).toBeFalsy();
    } else {
      // Or should reject with 401
      expect(response.status()).toBe(401);
    }
  });
});
