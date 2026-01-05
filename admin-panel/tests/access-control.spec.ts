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

test.describe('Access Control - Inactive Product', () => {
  test.describe.configure({ mode: 'serial' });

  let testProduct: any;
  let userWithAccess: any;
  const password = 'TestPassword123!';

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
    // Create test product (initially ACTIVE)
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Inactive Product Test ${Date.now()}`,
        slug: `inactive-test-${Date.now()}`,
        price: 30,
        currency: 'USD',
        description: 'Test product for inactive access control',
        is_active: true
      })
      .select()
      .single();

    if (productError) throw productError;
    testProduct = product;

    // Create user WITH access
    const email1 = `inactive-user-${Date.now()}@test.com`;
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
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
    if (userWithAccess) {
      await supabaseAdmin.auth.admin.deleteUser(userWithAccess.id);
    }
  });

  test('user should have access to ACTIVE product', async ({ page }) => {
    await loginAsUser(page, userWithAccess.email);

    const response = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ productSlugs: [slug] })
      });
      return await response.json();
    }, { slug: testProduct.slug });

    expect(response.accessResults[testProduct.slug]).toBe(true);
  });

  test('user should STILL have access after product is DEACTIVATED', async ({ page }) => {
    // Deactivate the product
    await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', testProduct.id);

    await loginAsUser(page, userWithAccess.email);

    const response = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ productSlugs: [slug] })
      });
      return await response.json();
    }, { slug: testProduct.slug });

    // ✅ User should STILL have access even though product is inactive
    expect(response.accessResults[testProduct.slug]).toBe(true);
  });

  test('user should LOSE access when access_expires_at passes', async ({ page }) => {
    // Set access to expire in 2 seconds (constraint prevents past dates)
    const expiresIn2Seconds = new Date(Date.now() + 2000).toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('user_product_access')
      .update({ access_expires_at: expiresIn2Seconds })
      .eq('user_id', userWithAccess.id)
      .eq('product_id', testProduct.id);

    if (updateError) {
      console.error('Failed to update access_expires_at:', updateError);
      throw updateError;
    }

    // First check - user should still have access (not expired yet)
    await loginAsUser(page, userWithAccess.email);

    const responseBefore = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ productSlugs: [slug] })
      });
      return await response.json();
    }, { slug: testProduct.slug });

    expect(responseBefore.accessResults[testProduct.slug]).toBe(true);

    // Wait for expiration (3 seconds to be safe)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Second check - user should NOT have access (expired)
    const responseAfter = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ productSlugs: [slug] })
      });
      return await response.json();
    }, { slug: testProduct.slug });

    // ❌ User should NOT have access - temporal access expired
    expect(responseAfter.accessResults[testProduct.slug]).toBe(false);
  });

  test('user should LOSE access when product is DELETED', async ({ page }) => {
    // Re-grant access (remove expiry)
    await supabaseAdmin
      .from('user_product_access')
      .update({ access_expires_at: null })
      .eq('user_id', userWithAccess.id)
      .eq('product_id', testProduct.id);

    // Delete the product
    await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', testProduct.id);

    await loginAsUser(page, userWithAccess.email);

    const response = await page.evaluate(async ({ slug }) => {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ productSlugs: [slug] })
      });
      return await response.json();
    }, { slug: testProduct.slug });

    // ❌ User should NOT have access - product was deleted
    expect(response.accessResults[testProduct.slug]).toBe(false);

    // Mark as deleted so afterAll doesn't try to delete again
    testProduct = null;
  });
});

test.describe('Element Protection - data-has-access / data-no-access visibility', () => {
  test.describe.configure({ mode: 'serial' });

  let testProduct: any;
  let userWithAccess: any;
  let userWithoutAccess: any;
  const password = 'TestPassword123!';

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
    // Create test product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Element Protection Test ${Date.now()}`,
        slug: `element-test-${Date.now()}`,
        price: 10,
        currency: 'USD',
        description: 'Test product for element protection',
        is_active: true
      })
      .select()
      .single();

    if (productError) throw productError;
    testProduct = product;

    // Create user WITH access
    const email1 = `elem-user-with-${Date.now()}@test.com`;
    const { data: { user: user1 }, error: createError1 } = await supabaseAdmin.auth.admin.createUser({
      email: email1,
      password,
      email_confirm: true,
    });
    if (createError1) throw createError1;
    userWithAccess = { ...user1, email: email1 };

    // Grant access
    await supabaseAdmin
      .from('user_product_access')
      .insert({
        user_id: userWithAccess.id,
        product_id: testProduct.id,
      });

    // Create user WITHOUT access
    const email2 = `elem-user-without-${Date.now()}@test.com`;
    const { data: { user: user2 }, error: createError2 } = await supabaseAdmin.auth.admin.createUser({
      email: email2,
      password,
      email_confirm: true,
    });
    if (createError2) throw createError2;
    userWithoutAccess = { ...user2, email: email2 };
  });

  test.afterAll(async () => {
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

  test('user WITH access should see data-has-access and NOT see data-no-access', async ({ page }) => {
    await loginAsUser(page, userWithAccess.email);

    // Create a test page with element protection
    const testPageContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Element Protection Test</title></head>
      <body>
        <div data-gatekeeper-product="${testProduct.slug}" data-testid="protected-section">
          <div data-has-access data-testid="has-access-content">
            <h2>Premium Content - You have access!</h2>
          </div>
          <div data-no-access data-testid="no-access-fallback">
            <h2>You need access to see this content</h2>
          </div>
        </div>
        <script src="/api/gatekeeper"></script>
      </body>
      </html>
    `;

    // Navigate to test page served by http-server
    await page.goto(`http://localhost:3002/element-protection.html?testProduct=${testProduct.slug}&apiUrl=http://localhost:3000`);

    // Wait for gatekeeper to process
    await page.waitForTimeout(3000);

    // User WITH access should see data-has-access content
    const hasAccessContent = page.locator('[data-testid="has-access-content"]');
    const noAccessContent = page.locator('[data-testid="no-access-fallback"]');

    // data-has-access should be visible
    await expect(hasAccessContent).toBeVisible({ timeout: 10000 });

    // data-no-access should be hidden
    await expect(noAccessContent).not.toBeVisible();
  });

  test('user WITHOUT access should see data-no-access and NOT see data-has-access', async ({ page }) => {
    await loginAsUser(page, userWithoutAccess.email);

    // Navigate to test page
    await page.goto(`http://localhost:3002/element-protection.html?testProduct=${testProduct.slug}&apiUrl=http://localhost:3000`);

    // Wait for gatekeeper to process
    await page.waitForTimeout(3000);

    const hasAccessContent = page.locator('[data-testid="has-access-content"]');
    const noAccessContent = page.locator('[data-testid="no-access-fallback"]');

    // data-no-access should be visible for user without access
    await expect(noAccessContent).toBeVisible({ timeout: 10000 });

    // data-has-access should be hidden
    await expect(hasAccessContent).not.toBeVisible();
  });

  test('anonymous user should see data-no-access fallback', async ({ page }) => {
    // No login - anonymous user

    await page.goto(`http://localhost:3002/element-protection.html?testProduct=${testProduct.slug}&apiUrl=http://localhost:3000`);

    // Wait for gatekeeper to process
    await page.waitForTimeout(3000);

    const hasAccessContent = page.locator('[data-testid="has-access-content"]');
    const noAccessContent = page.locator('[data-testid="no-access-fallback"]');

    // Anonymous user should see no-access fallback
    await expect(noAccessContent).toBeVisible({ timeout: 10000 });

    // data-has-access should be hidden
    await expect(hasAccessContent).not.toBeVisible();
  });
});
