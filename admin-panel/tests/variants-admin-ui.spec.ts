import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker for admin tests
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Variant Linking Admin UI', () => {
  let adminEmail: string;
  let adminUserId: string;
  const adminPassword = 'TestPassword123!';
  let testProducts: any[] = [];

  // Helper to login as admin
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
    // Create test admin user
    adminEmail = `variants-ui-admin-${Date.now()}@test.com`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: adminUserId });

    // Create test products
    for (let i = 0; i < 4; i++) {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `UI Variant Test ${i + 1}`,
          slug: `ui-variant-${Date.now()}-${i}`,
          price: (i + 1) * 25,
          currency: 'PLN',
          description: `Test product ${i + 1}`,
          is_active: true,
          icon: ['🎯', '🚀', '💎', '⭐'][i]
        })
        .select()
        .single();

      if (error) throw error;
      testProducts.push(product);
    }
  });

  test.afterAll(async () => {
    // Cleanup products
    for (const product of testProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }

    // Cleanup admin
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('Link Variants Button', () => {
    test('should display "Link Variants" button in products page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await expect(linkButton).toBeVisible();
    });

    test('should have purple styling for link variants button', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz|Link/i }).filter({ hasText: /warianty|Variants/i });
      await expect(linkButton).toHaveClass(/purple/);
    });
  });

  test.describe('Variant Link Modal', () => {
    test('should open modal when clicking Link Variants button', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      // Modal should appear
      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should display all products in the modal', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
      await expect(modal).toBeVisible();

      // Should show all test products
      for (const product of testProducts) {
        await expect(modal.getByText(product.name)).toBeVisible({ timeout: 10000 });
      }
    });

    test('should have search functionality in modal', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
      const searchInput = modal.locator('input[placeholder*="Szukaj produktów"]').or(modal.locator('input[placeholder*="Search products"]'));
      await expect(searchInput).toBeVisible();

      // Search for specific product
      await searchInput.fill('UI Variant Test 1');
      await page.waitForTimeout(500);

      // Should filter products
      await expect(modal.getByText('UI Variant Test 1')).toBeVisible();
      await expect(modal.getByText('UI Variant Test 2')).not.toBeVisible();
    });

    test('should allow selecting products by clicking', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // Click on first product to select
      const firstProduct = modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 1' });
      await firstProduct.click();

      // Should be highlighted
      await expect(firstProduct).toHaveClass(/border-indigo-500|bg-indigo-100/);

      // Selected count should update
      await expect(modal.getByText(/Wybrane produkty \(1\)|Selected Products \(1\)/i)).toBeVisible();
    });

    test('should show variant name input for selected products', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // Select two products
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 1' }).click();
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 2' }).click();

      // Should show variant name inputs in the right panel
      const rightPanel = modal.locator('[class*="bg-gray-50"]').or(modal.locator('[class*="bg-gray-900"]'));
      const inputs = rightPanel.locator('input[placeholder*="Nazwa wyświetlana"]').or(rightPanel.locator('input[placeholder*="Display name"]'));
      await expect(inputs).toHaveCount(2);
    });

    test('should disable submit with less than 2 products selected', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // With no products selected, submit should be disabled
      const submitButton = modal.getByRole('button', { name: /Połącz jako warianty|Link as Variants/i });
      await expect(submitButton).toBeDisabled();

      // Select one product
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 1' }).click();

      // Still should be disabled with only 1 product
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit with 2+ products selected', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // Select two products
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 1' }).click();
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 2' }).click();

      const submitButton = modal.getByRole('button', { name: /Połącz jako warianty|Link as Variants/i });
      await expect(submitButton).toBeEnabled();
    });

    test('should close modal on cancel', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });
      await expect(modal).toBeVisible();

      const cancelButton = modal.getByRole('button', { name: /Anuluj|Cancel/i });
      await cancelButton.click();

      await expect(modal).not.toBeVisible({ timeout: 5000 });
    });

    test('should successfully link products as variants', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // Select two products
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 1' }).click();
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 2' }).click();

      // Submit
      const submitButton = modal.getByRole('button', { name: /Połącz jako warianty|Link as Variants/i });
      await submitButton.click();

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Success toast should appear
      await expect(page.getByText(/Produkty połączone|Products linked/i)).toBeVisible({ timeout: 5000 });
    });

    test('should allow removing selected product', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
      await linkButton.click();

      const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

      // Select a product
      await modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'UI Variant Test 3' }).click();

      // Click remove button in selected list
      const rightPanel = modal.locator('[class*="bg-gray-50"]').or(modal.locator('[class*="bg-gray-900"]'));
      const removeButton = rightPanel.locator('button').filter({ has: page.locator('svg') }).first();
      await removeButton.click();

      // Count should be 0
      await expect(modal.getByText(/Wybrane produkty \(0\)|Selected Products \(0\)/i)).toBeVisible();
    });
  });

  test.describe('Variant Badge in Products Table', () => {
    test.beforeAll(async () => {
      // Link products 0 and 1 as variants for badge tests
      const groupId = crypto.randomUUID();
      await supabaseAdmin
        .from('products')
        .update({ variant_group_id: groupId, variant_name: 'Option 1', variant_order: 0 })
        .eq('id', testProducts[0].id);
      await supabaseAdmin
        .from('products')
        .update({ variant_group_id: groupId, variant_name: 'Option 2', variant_order: 1 })
        .eq('id', testProducts[1].id);
    });

    test('should display variant badge (🔗) for linked products', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr').filter({ hasText: 'UI Variant Test 1' });
      const variantBadge = row.locator('a').filter({ hasText: '🔗' });
      await expect(variantBadge).toBeVisible();
    });

    test('should NOT display variant badge for unlinked products', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      // Product 3 and 4 are not linked
      const row = page.locator('tr').filter({ hasText: 'UI Variant Test 4' });
      const variantBadge = row.locator('a').filter({ hasText: '🔗' });
      await expect(variantBadge).not.toBeVisible();
    });

    test('variant badge should link to variant selector page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr').filter({ hasText: 'UI Variant Test 1' });
      const variantLink = row.locator('a').filter({ hasText: '🔗' });

      const href = await variantLink.getAttribute('href');
      expect(href).toMatch(/\/v\/[a-f0-9-]+/);
    });

    test('should have copy button next to variant badge', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr').filter({ hasText: 'UI Variant Test 1' });
      const copyButton = row.locator('button[title*="Kopiuj link"]').or(row.locator('button[title*="Copy Variant"]'));
      await expect(copyButton).toBeVisible();
    });

    test('copy button should copy URL to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await loginAsAdmin(page);
      await page.goto('/pl/dashboard/products');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr').filter({ hasText: 'UI Variant Test 1' });
      const copyButton = row.locator('button[title*="Kopiuj link"]').or(row.locator('button[title*="Copy Variant"]'));
      await copyButton.click();

      // Verify clipboard content
      const clipboardText = await page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });

      expect(clipboardText).toMatch(/\/v\/[a-f0-9-]+/);
    });
  });
});

test.describe('Variant Modal - Product Already in Group', () => {
  let adminEmail: string;
  let adminUserId: string;
  const adminPassword = 'TestPassword123!';
  let linkedProducts: any[] = [];
  let unlinkedProduct: any;
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
    adminEmail = `variants-modal-admin-${Date.now()}@test.com`;
    variantGroupId = crypto.randomUUID();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });

    // Create products already linked
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `Already Linked ${i + 1}`,
          slug: `already-linked-${Date.now()}-${i}`,
          price: 100,
          currency: 'PLN',
          description: 'Already in a variant group',
          is_active: true,
          icon: '🔗',
          variant_group_id: variantGroupId,
          variant_name: `Linked ${i + 1}`,
          variant_order: i
        })
        .select()
        .single();

      if (error) throw error;
      linkedProducts.push(data);
    }

    // Create unlinked product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Not Linked Product',
        slug: `not-linked-${Date.now()}`,
        price: 50,
        currency: 'PLN',
        description: 'Not in any variant group',
        is_active: true,
        icon: '📦'
      })
      .select()
      .single();

    if (error) throw error;
    unlinkedProduct = data;
  });

  test.afterAll(async () => {
    for (const product of linkedProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }
    if (unlinkedProduct) {
      await supabaseAdmin.from('products').delete().eq('id', unlinkedProduct.id);
    }
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test('should show "In variant group" badge for already linked products', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
    await linkButton.click();

    const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

    // Already linked products should show badge
    const linkedProductCard = modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'Already Linked 1' });
    const inGroupBadge = linkedProductCard.getByText(/W grupie|In variant group/i);
    await expect(inGroupBadge).toBeVisible();
  });

  test('should dim already linked products in modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    const linkButton = page.getByRole('button', { name: /Połącz produkty jako warianty|Link Products as Variants/i });
    await linkButton.click();

    const modal = page.locator('div.fixed').filter({ hasText: /Wybrane produkty|Selected Products/i });

    const linkedProductCard = modal.locator('[class*="cursor-pointer"]').filter({ hasText: 'Already Linked 1' });
    // Should have opacity class for already linked
    await expect(linkedProductCard).toHaveClass(/opacity-50/);
  });
});
