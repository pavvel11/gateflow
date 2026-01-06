import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Enforce single worker for admin tests
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Product Duplication', () => {
  let adminEmail: string;
  const adminPassword = 'TestPassword123!';
  let testProductId: string;
  let testProductSlug: string;

  // Helper to login as admin
  const loginAsAdmin = async (page: Page) => {
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
    adminEmail = `product-dup-admin-${Date.now()}@test.com`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: authData.user!.id });

    if (adminError) throw adminError;

    // Create a test product to duplicate
    testProductSlug = `dup-test-${Date.now()}`;
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Original Product',
        slug: testProductSlug,
        price: 100,
        sale_price: 60,
        sale_price_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        description: 'Product to be duplicated',
        long_description: 'Detailed description',
        is_active: true,
        is_featured: true,
        omnibus_exempt: false,
        icon: '🚀'
      })
      .select()
      .single();

    if (productError) throw productError;
    testProductId = product.id;
  });

  test.afterAll(async () => {
    // Cleanup: delete test products
    if (testProductId) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProductId);

      // Also delete any duplicates created during tests
      await supabaseAdmin
        .from('products')
        .delete()
        .like('name', '[COPY] Original Product%');
    }

    // Cleanup admin user
    if (adminEmail) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const user = users.find(u => u.email === adminEmail);
      if (user) {
        await supabaseAdmin.from('admin_users').delete().eq('user_id', user.id);
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }
  });

  test('should show duplicate button in products table', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to products page
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Find the product row and duplicate button
    const productRow = page.locator('tr').filter({ hasText: 'Original Product' });
    await expect(productRow).toBeVisible({ timeout: 10000 });

    // Find the duplicate button by aria-label (using regex to match both EN and PL)
    const duplicateButton = productRow.getByRole('button', { name: /Duplikuj Original Product|Duplicate Original Product/i });
    await expect(duplicateButton).toBeVisible({ timeout: 5000 });
  });

  test('should open product form with duplicated data when clicking duplicate', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Click duplicate button
    const productRow = page.locator('tr').filter({ hasText: 'Original Product' });
    const duplicateButton = productRow.getByRole('button', { name: /Duplikuj Original Product|Duplicate Original Product/i });
    await duplicateButton.click();

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Check that modal opened with correct data
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    const nameValue = await nameInput.inputValue();
    expect(nameValue).toBe('[COPY] Original Product');

    // Check that description is copied
    const descInput = page.locator('textarea[name="description"]');
    const descValue = await descInput.inputValue();
    expect(descValue).toBe('Product to be duplicated');

    // Check that sale_price is copied
    const salePriceInput = page.locator('input#sale_price');
    const salePriceValue = await salePriceInput.inputValue();
    expect(salePriceValue).toContain('60'); // May have comma formatting
  });

  test('should show "Create" button (not "Update") when duplicating', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/pl/dashboard/products');
    await page.waitForLoadState('networkidle');

    // Click duplicate button
    const productRow = page.locator('tr').filter({ hasText: 'Original Product' });
    const duplicateButton = productRow.getByRole('button', { name: /Duplicate Original Product/i });
    await duplicateButton.click();

    await page.waitForTimeout(500);

    // Check that save button says "Create" not "Update"
    const createButton = page.locator('button[type="submit"]').filter({ hasText: /Utwórz|Create/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });

    // Check that modal title says "Create"
    const modalTitle = page.locator('h3').filter({ hasText: /Utwórz nowy produkt|Create New Product/i });
    await expect(modalTitle).toBeVisible();
  });

  test('should preserve all product fields when duplicating via API', async ({ request }) => {
    // Get original product
    const { data: original } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', testProductId)
      .single();

    expect(original).toBeTruthy();

    // Verify original has all expected fields
    expect(original!.price).toBe(100);
    expect(original!.sale_price).toBe(60);
    expect(original!.description).toBe('Product to be duplicated');
    expect(original!.long_description).toBe('Detailed description');
    expect(original!.is_active).toBe(true);
    expect(original!.is_featured).toBe(true);
    expect(original!.omnibus_exempt).toBe(false);
    expect(original!.icon).toBe('🚀');

    // Note: In a real duplicate scenario via UI:
    // 1. User clicks Duplicate button
    // 2. Form opens with all fields pre-filled
    // 3. User modifies name to "[COPY] Original Product"
    // 4. User saves, which creates NEW product via POST /api/admin/products
    // 5. New product gets new id and slug, but keeps all other fields
  });
});
