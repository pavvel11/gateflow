import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Variant Selector Page', () => {
  let testProducts: any[] = [];
  let variantGroupId: string;

  test.beforeAll(async () => {
    variantGroupId = crypto.randomUUID();

    // Create test products with different prices and features
    const productConfigs = [
      { name: 'Basic Plan', price: 49, variant_name: 'Basic', description: 'Perfect for beginners', image_url: null, is_active: true },
      { name: 'Pro Plan', price: 99, variant_name: 'Professional', description: 'For growing businesses', image_url: 'https://example.com/pro.jpg', is_active: true },
      { name: 'Enterprise Plan', price: 299, variant_name: 'Enterprise', description: 'Full-featured solution', image_url: null, is_active: true },
      { name: 'Legacy Plan', price: 29, variant_name: 'Legacy', description: 'Discontinued', image_url: null, is_active: false },
    ];

    for (let i = 0; i < productConfigs.length; i++) {
      const config = productConfigs[i];
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: config.name,
          slug: `variant-selector-${Date.now()}-${i}`,
          price: config.price,
          currency: 'PLN',
          description: config.description,
          is_active: config.is_active,
          icon: '📦',
          image_url: config.image_url,
          variant_group_id: variantGroupId,
          variant_name: config.variant_name,
          variant_order: i
        })
        .select()
        .single();

      if (error) throw error;
      testProducts.push(product);
    }
  });

  test.afterAll(async () => {
    for (const product of testProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    await acceptAllCookies(page);
  });

  test('should display variant selector page with all variants', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show page title
    await expect(page.locator('h1')).toContainText(/Wybierz opcję|Choose Your Option/i);

    // Should display all active variants (3 out of 4)
    const variantCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /PLN/ });
    await expect(variantCards).toHaveCount(3);
  });

  test('should display "Most Popular" badge on first variant', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // First variant should have the "Most Popular" badge
    const popularBadge = page.locator('span').filter({ hasText: /Najpopularniejsze|Most Popular/i });
    await expect(popularBadge).toBeVisible();
  });

  test('should display variant names correctly', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Basic')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
  });

  test('should display prices correctly', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Check that prices are displayed with currency code (format: zł49.00 PLN)
    await expect(page.getByText('zł49.00 PLN')).toBeVisible();
    await expect(page.getByText('zł99.00 PLN')).toBeVisible();
    await expect(page.getByText('zł299.00 PLN')).toBeVisible();
  });

  test('should display descriptions', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Perfect for beginners')).toBeVisible();
    await expect(page.getByText('For growing businesses')).toBeVisible();
    await expect(page.getByText('Full-featured solution')).toBeVisible();
  });

  test('should NOT display inactive variants', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Legacy plan is inactive, should not be visible
    await expect(page.getByText('Legacy')).not.toBeVisible();
    await expect(page.getByText('Discontinued')).not.toBeVisible();
  });

  test('should redirect to checkout when clicking a variant', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Click on the first variant (Basic Plan)
    const firstVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Basic' }).first();
    await firstVariant.click();

    // Should redirect to checkout page
    await page.waitForURL(/\/checkout\//);
    expect(page.url()).toContain('/checkout/');
  });

  test('should redirect to correct product checkout', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Click on Enterprise variant
    const enterpriseVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Enterprise' }).first();
    await enterpriseVariant.click();

    // Should redirect to the Enterprise product's checkout
    await page.waitForURL(/\/checkout\//);
    expect(page.url()).toContain(testProducts[2].slug);
  });

  test('should show Select button on variants', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    const selectButtons = page.getByRole('button', { name: /Wybierz|Select/i });
    await expect(selectButtons).toHaveCount(3);
  });

  test('should show error page for non-existent group', async ({ page }) => {
    const fakeGroupId = crypto.randomUUID();
    await page.goto(`/pl/v/${fakeGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.getByText(/Nie znaleziono|Not Found/i)).toBeVisible();
  });

  test('should show secure payment footer', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Bezpieczna płatność|Secure payment/i)).toBeVisible();
  });

  test('should work in English locale', async ({ page }) => {
    await page.goto(`/en/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Check English translations
    await expect(page.getByText('Choose Your Option')).toBeVisible();
    await expect(page.getByText('Most Popular')).toBeVisible();
    await expect(page.getByText('Secure payment')).toBeVisible();
  });

  test('should display image when variant has image_url', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    // Pro Plan has an image_url
    const proVariant = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Professional' });
    const image = proVariant.locator('img');

    // Image should be present for Pro Plan
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src', 'https://example.com/pro.jpg');
  });

  test('should have correct styling for first variant (highlighted)', async ({ page }) => {
    await page.goto(`/pl/v/${variantGroupId}`);
    await page.waitForLoadState('networkidle');

    const firstVariant = page.locator('[class*="cursor-pointer"]').first();

    // First variant should have purple/indigo border (highlighted)
    await expect(firstVariant).toHaveClass(/border-purple-500|ring-purple/);
  });

  test('should show loading state initially', async ({ page }) => {
    // Block the RPC call to see loading state
    await page.route('**/rest/v1/rpc/get_variant_group**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto(`/pl/v/${variantGroupId}`);

    // Should show loading spinner
    const spinner = page.locator('.animate-spin');
    await expect(spinner).toBeVisible();
  });
});

test.describe('Variant Selector - Edge Cases', () => {
  let singleProduct: any;
  let singleGroupId: string;

  test.beforeAll(async () => {
    singleGroupId = crypto.randomUUID();

    // Create a single product in a variant group (edge case)
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Single Variant Product',
        slug: `single-variant-${Date.now()}`,
        price: 100,
        currency: 'USD',
        description: 'Only one variant',
        is_active: true,
        icon: '🎁',
        variant_group_id: singleGroupId,
        variant_name: 'Only Option',
        variant_order: 0
      })
      .select()
      .single();

    if (error) throw error;
    singleProduct = data;
  });

  test.afterAll(async () => {
    if (singleProduct) {
      await supabaseAdmin.from('products').delete().eq('id', singleProduct.id);
    }
  });

  test('should display single variant correctly', async ({ page }) => {
    await acceptAllCookies(page);
    await page.goto(`/en/v/${singleGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show the single variant
    await expect(page.getByText('Only Option')).toBeVisible();
    await expect(page.getByText('$100.00')).toBeVisible();
  });

  test('should still show Most Popular badge on single variant', async ({ page }) => {
    await acceptAllCookies(page);
    await page.goto(`/en/v/${singleGroupId}`);
    await page.waitForLoadState('networkidle');

    const popularBadge = page.locator('span').filter({ hasText: /Most Popular/i });
    await expect(popularBadge).toBeVisible();
  });
});

test.describe('Variant Selector - All Inactive Variants', () => {
  let inactiveProducts: any[] = [];
  let inactiveGroupId: string;

  test.beforeAll(async () => {
    inactiveGroupId = crypto.randomUUID();

    // Create products that are all inactive
    for (let i = 0; i < 2; i++) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `Inactive Product ${i + 1}`,
          slug: `inactive-variant-${Date.now()}-${i}`,
          price: 50,
          currency: 'PLN',
          description: 'Inactive',
          is_active: false,
          icon: '⏸️',
          variant_group_id: inactiveGroupId,
          variant_name: `Inactive ${i + 1}`,
          variant_order: i
        })
        .select()
        .single();

      if (error) throw error;
      inactiveProducts.push(data);
    }
  });

  test.afterAll(async () => {
    for (const product of inactiveProducts) {
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    }
  });

  test('should show error when all variants are inactive', async ({ page }) => {
    await acceptAllCookies(page);
    await page.goto(`/pl/v/${inactiveGroupId}`);
    await page.waitForLoadState('networkidle');

    // Should show not found/error since no active variants
    await expect(page.getByText(/Nie znaleziono|Not Found/i)).toBeVisible();
  });
});
