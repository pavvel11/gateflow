import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker for E2E tests
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Product Variants E2E Flow', () => {
  let adminEmail: string;
  let adminUserId: string;
  const adminPassword = 'TestPassword123!';
  let testProducts: any[] = [];
  let variantGroupId: string;

  const loginAsAdmin = async (page: Page) => {
    await acceptAllCookies(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email: adminEmail,
      password: adminPassword,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);
  };

  test.beforeAll(async () => {
    // Create admin user
    adminEmail = `e2e-variants-admin-${Date.now()}@test.com`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });

    // Create test products for E2E flow
    const productConfigs = [
      { name: 'E2E Basic License', price: 49, variant_name: 'Basic' },
      { name: 'E2E Pro License', price: 99, variant_name: 'Pro' },
      { name: 'E2E Enterprise License', price: 199, variant_name: 'Enterprise' },
    ];

    for (let i = 0; i < productConfigs.length; i++) {
      const config = productConfigs[i];
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: config.name,
          slug: `e2e-variant-${Date.now()}-${i}`,
          price: config.price,
          currency: 'PLN',
          description: `E2E test variant ${config.variant_name}`,
          is_active: true,
          icon: ['🎯', '🚀', '💎'][i]
        })
        .select()
        .single();

      if (error) throw error;
      testProducts.push(data);
    }
  });

  test.afterAll(async () => {
    for (const product of testProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test('Complete E2E: Create products → Link variants → View selector → Select variant → Checkout', async ({ page }) => {
    // Step 1: Login as admin
    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Step 2: Open variant linking modal
    const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
    await linkButton.click();

    const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Step 3: Select all 3 test products
    for (const product of testProducts) {
      const productCard = modal.locator('[class*="cursor-pointer"]').filter({ hasText: product.name });
      await productCard.click();
    }

    // Step 4: Verify 3 products selected
    await expect(modal.getByText(/Wybrane produkty \(3\)|Selected Products \(3\)/i)).toBeVisible();

    // Step 5: Set variant names
    const rightPanel = modal.locator('[class*="bg-gray-50"]').or(modal.locator('[class*="bg-gray-900"]'));
    const inputs = rightPanel.locator('input[type="text"]');
    const count = await inputs.count();
    expect(count).toBe(3);

    // Fill variant names
    await inputs.nth(0).fill('Basic');
    await inputs.nth(1).fill('Pro');
    await inputs.nth(2).fill('Enterprise');

    // Step 6: Submit and link variants
    const submitButton = modal.getByRole('button', { name: /Połącz jako warianty|Link as Variants/i });
    await submitButton.click();

    // Wait for modal to close (success)
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Step 7: Verify variant badge appears
    await page.reload();
    await page.waitForLoadState('networkidle');

    const row = page.locator('tr').filter({ hasText: 'E2E Basic License' });
    const variantBadge = row.locator('a').filter({ hasText: '🔗' });
    await expect(variantBadge).toBeVisible({ timeout: 10000 });

    // Step 8: Get variant group ID from badge link
    const href = await variantBadge.getAttribute('href');
    const groupIdMatch = href?.match(/\/v\/([a-f0-9-]+)/);
    expect(groupIdMatch).toBeTruthy();
    variantGroupId = groupIdMatch![1];

    // Step 9: Navigate to variant selector page
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Step 10: Verify variant selector displays all variants
    await expect(page.getByText('Basic')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();

    // Step 11: Verify prices
    await expect(page.getByText(/49[,.]00/)).toBeVisible();
    await expect(page.getByText(/99[,.]00/)).toBeVisible();
    await expect(page.getByText(/199[,.]00/)).toBeVisible();

    // Step 12: Click on Pro variant
    const proVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Pro' });
    await proVariant.click();

    // Step 13: Verify redirect to checkout
    await page.waitForURL(/\/checkout\//);
    expect(page.url()).toContain('/checkout/');
    expect(page.url()).toContain(testProducts[1].slug);

    // Step 14: Verify checkout page shows correct product
    await expect(page.getByText('E2E Pro License')).toBeVisible({ timeout: 10000 });
  });

  test('E2E: Variant selector respects product active status', async ({ page }) => {
    // Deactivate one product
    await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', testProducts[2].id);

    await acceptAllCookies(page);
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show only 2 active variants
    await expect(page.getByText('Basic')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Enterprise')).not.toBeVisible();

    // Reactivate for other tests
    await supabaseAdmin
      .from('products')
      .update({ is_active: true })
      .eq('id', testProducts[2].id);
  });

  test('E2E: Copy variant link from admin and access selector', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Find product row and copy button
    const row = page.locator('tr').filter({ hasText: 'E2E Basic License' });
    const copyButton = row.locator('button[title*="Kopiuj link"]').or(row.locator('button[title*="Copy Variant"]'));
    await copyButton.click();

    // Get URL from clipboard
    const copiedUrl = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });

    expect(copiedUrl).toContain(`/v/${variantGroupId}`);

    // Navigate to copied URL
    await page.goto(copiedUrl);
    await page.waitForLoadState('networkidle');

    // Should show variant selector
    await expect(page.getByText(/Wybierz opcję|Choose Your Option/i)).toBeVisible();
  });

  test('E2E: Unlink product from variant group via admin', async ({ page }) => {
    await loginAsAdmin(page);

    // Unlink the third product via API
    const response = await page.request.delete(`/api/admin/products/variants?productId=${testProducts[2].id}`);
    expect(response.ok()).toBeTruthy();

    // Verify in DB
    const { data } = await supabaseAdmin
      .from('products')
      .select('variant_group_id')
      .eq('id', testProducts[2].id)
      .single();

    expect(data!.variant_group_id).toBeNull();

    // Variant selector should now show only 2 products
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Basic')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Enterprise')).not.toBeVisible();

    // Re-link for cleanup consistency
    await supabaseAdmin
      .from('products')
      .update({ variant_group_id: variantGroupId, variant_name: 'Enterprise', variant_order: 2 })
      .eq('id', testProducts[2].id);
  });
});

test.describe('Variant Flow with Order Bumps', () => {
  let adminUserId: string;
  let mainProduct: any;
  let variantProduct: any;
  let bumpProduct: any;
  let variantGroupId: string;

  test.beforeAll(async () => {
    variantGroupId = crypto.randomUUID();

    // Create main product
    const { data: main, error: mainError } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Variant with Bump - Main',
        slug: `variant-bump-main-${Date.now()}`,
        price: 100,
        currency: 'PLN',
        description: 'Main product with order bump',
        is_active: true,
        icon: '📦',
        variant_group_id: variantGroupId,
        variant_name: 'Standard',
        variant_order: 0
      })
      .select()
      .single();

    if (mainError) throw mainError;
    mainProduct = main;

    // Create variant product
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Variant with Bump - Premium',
        slug: `variant-bump-premium-${Date.now()}`,
        price: 200,
        currency: 'PLN',
        description: 'Premium variant',
        is_active: true,
        icon: '💎',
        variant_group_id: variantGroupId,
        variant_name: 'Premium',
        variant_order: 1
      })
      .select()
      .single();

    if (variantError) throw variantError;
    variantProduct = variant;

    // Create bump product (only for main product)
    const { data: bump, error: bumpError } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Bonus Add-on',
        slug: `variant-bump-addon-${Date.now()}`,
        price: 20,
        currency: 'PLN',
        description: 'Special add-on',
        is_active: true,
        icon: '🎁'
      })
      .select()
      .single();

    if (bumpError) throw bumpError;
    bumpProduct = bump;

    // Create order bump only for main product
    await supabaseAdmin
      .from('order_bumps')
      .insert({
        main_product_id: mainProduct.id,
        bump_product_id: bumpProduct.id,
        bump_price: 15,
        bump_title: 'Add bonus content!',
        is_active: true
      });
  });

  test.afterAll(async () => {
    // Cleanup
    await supabaseAdmin.from('order_bumps').delete().eq('main_product_id', mainProduct.id);
    await supabaseAdmin.from('products').delete().eq('id', mainProduct.id);
    await supabaseAdmin.from('products').delete().eq('id', variantProduct.id);
    await supabaseAdmin.from('products').delete().eq('id', bumpProduct.id);
  });

  test('Each variant can have its own order bumps', async ({ page }) => {
    await acceptAllCookies(page);

    // Go to variant selector
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Select Standard variant (has bump)
    const standardVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Standard' });
    await standardVariant.click();

    // Should redirect to checkout
    await page.waitForURL(/\/checkout\//);
    await page.waitForLoadState('networkidle');

    // Order bump should be visible for Standard variant
    await expect(page.getByText('Add bonus content!')).toBeVisible({ timeout: 10000 });
  });

  test('Premium variant should NOT show Standard variant bump', async ({ page }) => {
    await acceptAllCookies(page);

    // Go to variant selector
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Select Premium variant (no bump configured)
    const premiumVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Premium' });
    await premiumVariant.click();

    // Should redirect to checkout
    await page.waitForURL(/\/checkout\//);
    await page.waitForLoadState('networkidle');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Order bump from Standard should NOT be visible
    await expect(page.getByText('Add bonus content!')).not.toBeVisible();
  });
});

test.describe('Variant Selector - Locale Handling', () => {
  let testProducts: any[] = [];
  let variantGroupId: string;

  test.beforeAll(async () => {
    variantGroupId = crypto.randomUUID();

    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `Locale Test ${i + 1}`,
          slug: `locale-variant-${Date.now()}-${i}`,
          price: 50 * (i + 1),
          currency: 'EUR',
          description: `Locale test ${i + 1}`,
          is_active: true,
          icon: '🌍',
          variant_group_id: variantGroupId,
          variant_name: `Option ${i + 1}`,
          variant_order: i
        })
        .select()
        .single();

      if (error) throw error;
      testProducts.push(data);
    }
  });

  test.afterAll(async () => {
    for (const product of testProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }
  });

  test('should work in Polish locale', async ({ page }) => {
    await acceptAllCookies(page);
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Wybierz opcję')).toBeVisible();
    await expect(page.getByText('Najpopularniejsze')).toBeVisible();
  });

  test('should work in English locale', async ({ page }) => {
    await acceptAllCookies(page);
    await page.goto(`/en/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Choose Your Option')).toBeVisible();
    await expect(page.getByText('Most Popular')).toBeVisible();
  });

  test('should redirect to correct locale checkout', async ({ page }) => {
    await acceptAllCookies(page);

    // Start in English
    await page.goto(`/en/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Select variant
    const variant = page.locator('[class*="cursor-pointer"]').first();
    await variant.click();

    // Should redirect to English checkout
    await page.waitForURL(/\/en\/checkout\//);
    expect(page.url()).toContain('/en/checkout/');
  });

  test('should preserve locale when selecting variant from Polish', async ({ page }) => {
    await acceptAllCookies(page);

    // Start in Polish
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Select variant
    const variant = page.locator('[class*="cursor-pointer"]').first();
    await variant.click();

    // Should redirect to Polish checkout
    await page.waitForURL(/\/pl\/checkout\//);
    expect(page.url()).toContain('/pl/checkout/');
  });
});
