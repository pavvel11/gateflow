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
    const linkButton = page.getByRole('button', { name: /Połącz jako warianty|Link as Variants/i });
    await linkButton.click();

    const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Use search to filter E2E products
    const searchInput = modal.locator('input[type="text"]').first();
    await searchInput.fill('E2E');
    await page.waitForTimeout(500);

    // Step 3: Select all 3 test products (use slug to ensure unique match)
    for (const product of testProducts) {
      const productCard = modal.locator('.cursor-pointer').filter({ hasText: product.slug });
      await expect(productCard).toBeVisible({ timeout: 5000 });
      await productCard.click();
      await page.waitForTimeout(200);
    }

    // Step 4: Verify 3 products selected
    await expect(modal.getByText(/Wybrane produkty \(3\)|Selected Products \(3\)/i)).toBeVisible({ timeout: 5000 });

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

    // Search for the test product to ensure it's visible
    const productSearch = page.locator('input[placeholder*="Szukaj"]').or(page.locator('input[placeholder*="Search"]'));
    if (await productSearch.isVisible()) {
      await productSearch.fill('E2E Basic');
      await page.waitForTimeout(500);
    }

    // Use slug to find exact product row (more unique than name)
    const row = page.locator('tr').filter({ hasText: testProducts[0].slug });
    await expect(row).toBeVisible({ timeout: 10000 });
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

    // Step 10: Verify variant selector displays all variants (use heading role for specificity)
    await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible();

    // Step 11: Verify prices (format: zł49.00 PLN)
    await expect(page.getByText('zł49.00 PLN')).toBeVisible();
    await expect(page.getByText('zł99.00 PLN')).toBeVisible();
    await expect(page.getByText('zł199.00 PLN')).toBeVisible();

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
    // Create a fresh variant group for this test to avoid interference
    const testGroupId = crypto.randomUUID();

    // Link test products to this new group
    for (let i = 0; i < testProducts.length; i++) {
      await supabaseAdmin
        .from('products')
        .update({
          variant_group_id: testGroupId,
          variant_name: ['Basic', 'Pro', 'Enterprise'][i],
          variant_order: i,
          is_active: true // Ensure all start as active
        })
        .eq('id', testProducts[i].id);
    }

    // Now deactivate the Enterprise product
    await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', testProducts[2].id);

    await acceptAllCookies(page);
    await page.goto(`/pl/v/${testGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show only 2 active variants (use heading role for specificity)
    await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).not.toBeVisible();

    // Reactivate and cleanup
    await supabaseAdmin
      .from('products')
      .update({ is_active: true, variant_group_id: null, variant_name: null, variant_order: 0 })
      .in('id', testProducts.map(p => p.id));
  });

  test('E2E: Copy variant link from admin and access selector', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Ensure products are linked to a variant group
    const testGroupId = crypto.randomUUID();
    for (let i = 0; i < testProducts.length; i++) {
      await supabaseAdmin
        .from('products')
        .update({
          variant_group_id: testGroupId,
          variant_name: ['Basic', 'Pro', 'Enterprise'][i],
          variant_order: i,
          is_active: true
        })
        .eq('id', testProducts[i].id);
    }

    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Search for test product
    const productSearch = page.locator('input[placeholder*="Szukaj"]').or(page.locator('input[placeholder*="Search"]'));
    if (await productSearch.isVisible()) {
      await productSearch.fill('E2E Basic');
      await page.waitForTimeout(500);
    }

    // Find product row and copy button
    const row = page.locator('tr').filter({ hasText: testProducts[0].slug });
    await expect(row).toBeVisible({ timeout: 10000 });
    const copyButton = row.locator('button[title*="Kopiuj link"]').or(row.locator('button[title*="Copy Variant"]'));
    await expect(copyButton).toBeVisible({ timeout: 5000 });
    await copyButton.click();

    // Get URL from clipboard
    const copiedUrl = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });

    expect(copiedUrl).toContain(`/v/${testGroupId}`);

    // Navigate to copied URL
    await page.goto(copiedUrl);
    await page.waitForLoadState('networkidle');

    // Should show variant selector
    await expect(page.getByText(/Wybierz opcję|Choose Your Option/i)).toBeVisible();
  });

  test('E2E: Unlink product from variant group via admin', async ({ page }) => {
    // Create a fresh variant group for this test
    const testGroupId = crypto.randomUUID();
    for (let i = 0; i < testProducts.length; i++) {
      await supabaseAdmin
        .from('products')
        .update({
          variant_group_id: testGroupId,
          variant_name: ['Basic', 'Pro', 'Enterprise'][i],
          variant_order: i,
          is_active: true
        })
        .eq('id', testProducts[i].id);
    }

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
    await page.goto(`/pl/v/${testGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).not.toBeVisible();

    // Cleanup
    await supabaseAdmin
      .from('products')
      .update({ variant_group_id: null, variant_name: null, variant_order: 0 })
      .in('id', testProducts.map(p => p.id));
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
    // Verify we have test products
    expect(testProducts.length).toBe(2);
    expect(variantGroupId).toBeTruthy();

    await acceptAllCookies(page);
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check for either the expected content or error state
    const pageContent = await page.content();
    if (pageContent.includes('😕') || pageContent.includes('not found')) {
      console.log('Page shows error - products may not exist');
      console.log('variantGroupId:', variantGroupId);
      console.log('testProducts:', testProducts.map(p => p.id));
    }

    await expect(page.getByText('Wybierz opcję')).toBeVisible({ timeout: 10000 });
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
