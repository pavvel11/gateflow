import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Enforce single worker
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const INBUCKET_URL = 'http://127.0.0.1:54324';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Guest Purchase Claim Flow', () => {
  let testProduct: any;
  const guestEmail = `guest-claim-${Date.now()}@test.com`;

  test.beforeAll(async () => {
    // Create test product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Guest Claim Test ${Date.now()}`,
        slug: `guest-claim-${Date.now()}`,
        price: 15,
        currency: 'USD',
        description: 'Test product for guest purchase claim',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = data;
  });

  test.afterAll(async () => {
    // Cleanup
    if (testProduct) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProduct.id);
    }
  });

  test.skip('should automatically grant access when guest registers with same email (mocked)', async ({ page }) => {
    // SKIPPED: Browser session mocking has issues with Next.js SSR
    // For full test, use real Mailpit with `npx supabase start`
    // Mock guest registration by creating user with password instead of magic link
    // STEP 1: Simulate guest purchase
    // Create guest_purchase record directly (simulating successful Stripe payment)
    const { error: purchaseError } = await supabaseAdmin
      .from('guest_purchases')
      .insert({
        email: guestEmail,
        product_id: testProduct.id,
        stripe_payment_intent_id: `pi_test_${Date.now()}`,
      });

    expect(purchaseError).toBeNull();

    // Verify guest purchase exists
    const { data: guestPurchase, error: verifyError } = await supabaseAdmin
      .from('guest_purchases')
      .select('*')
      .eq('email', guestEmail)
      .eq('product_id', testProduct.id)
      .single();

    expect(verifyError).toBeNull();
    expect(guestPurchase).toBeTruthy();

    // STEP 2: User registers with same email (mocked - create user directly)
    const mockPassword = 'TestPassword123!';
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      password: mockPassword,
      email_confirm: true,
    });

    expect(userError).toBeNull();
    expect(user).toBeTruthy();

    // STEP 4: Verify user_product_access was automatically created by trigger
    // Wait a moment for trigger to execute
    await page.waitForTimeout(2000);

    const { data: userAccess, error: accessError } = await supabaseAdmin
      .from('user_product_access')
      .select('*')
      .eq('user_id', user!.id)
      .eq('product_id', testProduct.id)
      .single();

    expect(accessError).toBeNull();
    expect(userAccess).toBeTruthy();
    expect(userAccess.user_id).toBe(user!.id);
    expect(userAccess.product_id).toBe(testProduct.id);

    // STEP 5: Sign in (exact same as admin tests)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email: guestEmail,
      password: mockPassword,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);

    // STEP 6: Navigate to product and verify access
    await page.goto(`/p/${testProduct.slug}`);
    await page.waitForTimeout(2000);

    // Should have access (not redirected to checkout)
    await expect(page).toHaveURL(new RegExp(`/p/${testProduct.slug}`));

    const bodyText = await page.locator('body').textContent();
    // Should NOT see purchase prompts
    expect(bodyText?.includes('Purchase Access')).toBeFalsy();

    // STEP 7: Cleanup - delete test user
    await supabaseAdmin.auth.admin.deleteUser(user!.id);
  });

  test.skip('should NOT grant access if email does not match', async ({ page, request }) => {
    // SKIPPED: Requires local Supabase with Inbucket for magic link emails
    const guestEmail2 = `guest-different-${Date.now()}@test.com`;
    const registerEmail = `register-different-${Date.now()}@test.com`;

    // Create guest purchase with one email
    const { error: purchaseError } = await supabaseAdmin
      .from('guest_purchases')
      .insert({
        email: guestEmail2,
        product_id: testProduct.id,
        stripe_payment_intent_id: `pi_test_${Date.now()}`,
      });

    expect(purchaseError).toBeNull();

    // Register with different email
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(registerEmail);

    const submitButton = page.getByRole('button', { name: /send|magic|login|sign in/i }).first();
    await submitButton.click();

    await expect(page.locator('text=/check.*email|sent|link/i')).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(3000);

    const emailLocalPart = registerEmail.split('@')[0];
    let messages: any[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await request.get(`${INBUCKET_URL}/api/v1/mailbox/${emailLocalPart}`);
      if (response.ok()) {
        const data = await response.json();
        if (data && data.length > 0) {
          messages = data;
          break;
        }
      }
      await page.waitForTimeout(2000);
    }

    if (messages.length > 0) {
      const latestMessage = messages[0];
      const messageResponse = await request.get(
        `${INBUCKET_URL}/api/v1/mailbox/${emailLocalPart}/${latestMessage.id}`
      );

      const messageData = await messageResponse.json();
      const emailBody = messageData.body.text;

      const linkMatch = emailBody.match(/(https?:\/\/[^\s]+\/auth\/v1\/verify[^\s<>"]+)/);

      if (linkMatch) {
        const magicLink = linkMatch[1];
        await page.goto(magicLink);
        await page.waitForTimeout(3000);

        // Get registered user
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(registerEmail);

        if (!userError && user) {
          await page.waitForTimeout(2000);

          // Should NOT have access (different email)
          const { data: userAccess } = await supabaseAdmin
            .from('user_product_access')
            .select('*')
            .eq('user_id', user.id)
            .eq('product_id', testProduct.id)
            .single();

          expect(userAccess).toBeNull();

          // Cleanup
          await supabaseAdmin.auth.admin.deleteUser(user.id);
        }
      }
    }

    // Cleanup guest purchase
    await supabaseAdmin
      .from('guest_purchases')
      .delete()
      .eq('email', guestEmail2)
      .eq('product_id', testProduct.id);
  });

  test.skip('should claim multiple products if guest bought multiple', async ({ page, request }) => {
    // SKIPPED: Requires local Supabase with Inbucket for magic link emails
    const multiEmail = `multi-purchase-${Date.now()}@test.com`;

    // Create second test product
    const { data: product2, error: product2Error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Multi Test Product ${Date.now()}`,
        slug: `multi-test-${Date.now()}`,
        price: 25,
        currency: 'USD',
        description: 'Second test product',
        is_active: true
      })
      .select()
      .single();

    expect(product2Error).toBeNull();

    // Create two guest purchases
    await supabaseAdmin
      .from('guest_purchases')
      .insert([
        {
          email: multiEmail,
          product_id: testProduct.id,
          stripe_payment_intent_id: `pi_test_multi1_${Date.now()}`,
        },
        {
          email: multiEmail,
          product_id: product2.id,
          stripe_payment_intent_id: `pi_test_multi2_${Date.now()}`,
        },
      ]);

    // Register with magic link
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(multiEmail);

    const submitButton = page.getByRole('button', { name: /send|magic|login|sign in/i }).first();
    await submitButton.click();

    await expect(page.locator('text=/check.*email|sent|link/i')).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(3000);

    const emailLocalPart = multiEmail.split('@')[0];
    let messages: any[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await request.get(`${INBUCKET_URL}/api/v1/mailbox/${emailLocalPart}`);
      if (response.ok()) {
        const data = await response.json();
        if (data && data.length > 0) {
          messages = data;
          break;
        }
      }
      await page.waitForTimeout(2000);
    }

    expect(messages.length).toBeGreaterThan(0);

    const latestMessage = messages[0];
    const messageResponse = await request.get(
      `${INBUCKET_URL}/api/v1/mailbox/${emailLocalPart}/${latestMessage.id}`
    );

    const messageData = await messageResponse.json();
    const emailBody = messageData.body.text;

    const linkMatch = emailBody.match(/(https?:\/\/[^\s]+\/auth\/v1\/verify[^\s<>"]+)/);
    expect(linkMatch).toBeTruthy();

    const magicLink = linkMatch![1];
    await page.goto(magicLink);
    await page.waitForTimeout(3000);

    // Get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(multiEmail);
    expect(userError).toBeNull();
    expect(user).toBeTruthy();

    await page.waitForTimeout(2000);

    // Should have access to BOTH products
    const { data: accesses, error: accessError } = await supabaseAdmin
      .from('user_product_access')
      .select('*')
      .eq('user_id', user!.id)
      .in('product_id', [testProduct.id, product2.id]);

    expect(accessError).toBeNull();
    expect(accesses).toBeTruthy();
    expect(accesses!.length).toBe(2);

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(user!.id);
    await supabaseAdmin.from('products').delete().eq('id', product2.id);
  });
});
