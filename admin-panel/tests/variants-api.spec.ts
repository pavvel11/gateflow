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

test.describe('Product Variants API', () => {
  let adminUserId: string;
  let adminEmail: string;
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
    adminEmail = `variants-api-admin-${Date.now()}@test.com`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: adminUserId });

    if (adminError) throw adminError;

    // Create test products for variant testing
    for (let i = 0; i < 4; i++) {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `Variant Test Product ${i + 1}`,
          slug: `variant-test-${Date.now()}-${i}`,
          price: (i + 1) * 50,
          currency: 'PLN',
          description: `Test product ${i + 1} for variants`,
          is_active: true,
          icon: '📦'
        })
        .select()
        .single();

      if (error) throw error;
      testProducts.push(product);
    }
  });

  test.afterAll(async () => {
    // Cleanup test products
    for (const product of testProducts) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', product.id);
    }

    // Cleanup admin user
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('POST /api/admin/products/variants - Link Variants', () => {
    test('should fail without authentication', async ({ request }) => {
      const response = await request.post('/api/admin/products/variants', {
        data: {
          productIds: [testProducts[0].id, testProducts[1].id]
        }
      });

      expect(response.status()).toBe(401);
    });

    test('should fail with less than 2 products', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/products/variants', {
        data: {
          productIds: [testProducts[0].id]
        }
      });

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('At least 2 products');
    });

    test('should fail with empty productIds array', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/products/variants', {
        data: {
          productIds: []
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should successfully link 2 products as variants', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/products/variants', {
        data: {
          productIds: [testProducts[0].id, testProducts[1].id],
          variantNames: {
            [testProducts[0].id]: 'Basic Plan',
            [testProducts[1].id]: 'Pro Plan'
          }
        }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.variantGroupId).toBeDefined();
      expect(json.message).toContain('2 products linked');

      // Verify in database
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, variant_group_id, variant_name, variant_order')
        .in('id', [testProducts[0].id, testProducts[1].id]);

      expect(products).toHaveLength(2);
      expect(products![0].variant_group_id).toBe(json.variantGroupId);
      expect(products![1].variant_group_id).toBe(json.variantGroupId);
    });

    test('should set variant_order correctly', async ({ page }) => {
      await loginAsAdmin(page);

      // First unlink products 2 and 3
      await supabaseAdmin
        .from('products')
        .update({ variant_group_id: null, variant_name: null, variant_order: 0 })
        .in('id', [testProducts[2].id, testProducts[3].id]);

      const response = await page.request.post('/api/admin/products/variants', {
        data: {
          productIds: [testProducts[2].id, testProducts[3].id]
        }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();

      // Verify variant_order
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, variant_order')
        .eq('variant_group_id', json.variantGroupId)
        .order('variant_order');

      expect(products![0].variant_order).toBe(0);
      expect(products![1].variant_order).toBe(1);
    });

    test('should link 3+ products as variants', async ({ page }) => {
      await loginAsAdmin(page);

      // First unlink existing variants
      for (const product of testProducts) {
        await supabaseAdmin
          .from('products')
          .update({ variant_group_id: null, variant_name: null, variant_order: 0 })
          .eq('id', product.id);
      }

      const response = await page.request.post('/api/admin/products/variants', {
        data: {
          productIds: [testProducts[0].id, testProducts[1].id, testProducts[2].id],
          variantNames: {
            [testProducts[0].id]: 'Starter',
            [testProducts[1].id]: 'Professional',
            [testProducts[2].id]: 'Enterprise'
          }
        }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.message).toContain('3 products linked');

      // Verify all 3 have the same group ID
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('variant_group_id, variant_name')
        .eq('variant_group_id', json.variantGroupId);

      expect(products).toHaveLength(3);
      expect(products!.map(p => p.variant_name).sort()).toEqual(['Enterprise', 'Professional', 'Starter']);
    });
  });

  test.describe('GET /api/admin/products/variants - Get Variants', () => {
    test('should return variants by productId', async ({ request }) => {
      const response = await request.get(`/api/admin/products/variants?productId=${testProducts[0].id}`);

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.variants).toBeDefined();
      expect(json.variants.length).toBeGreaterThanOrEqual(2);
    });

    test('should return variants by groupId', async ({ request }) => {
      // Get current group ID
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('variant_group_id')
        .eq('id', testProducts[0].id)
        .single();

      const response = await request.get(`/api/admin/products/variants?groupId=${product!.variant_group_id}`);

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.variantGroupId).toBe(product!.variant_group_id);
      expect(json.variants.length).toBeGreaterThanOrEqual(2);
    });

    test('should return empty array for product without variants', async ({ request }) => {
      // Product 3 (index 3) should not be in a variant group after previous tests
      await supabaseAdmin
        .from('products')
        .update({ variant_group_id: null })
        .eq('id', testProducts[3].id);

      const response = await request.get(`/api/admin/products/variants?productId=${testProducts[3].id}`);

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.variants).toEqual([]);
    });

    test('should fail without productId or groupId', async ({ request }) => {
      const response = await request.get('/api/admin/products/variants');

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('productId or groupId is required');
    });

    test('should return variants ordered by variant_order', async ({ request }) => {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('variant_group_id')
        .eq('id', testProducts[0].id)
        .single();

      const response = await request.get(`/api/admin/products/variants?groupId=${product!.variant_group_id}`);
      const json = await response.json();

      // Check that variants are ordered
      for (let i = 1; i < json.variants.length; i++) {
        expect(json.variants[i].variant_order).toBeGreaterThanOrEqual(json.variants[i - 1].variant_order);
      }
    });
  });

  test.describe('DELETE /api/admin/products/variants - Unlink Variant', () => {
    test('should fail without authentication', async ({ request }) => {
      const response = await request.delete(`/api/admin/products/variants?productId=${testProducts[0].id}`);

      expect(response.status()).toBe(401);
    });

    test('should fail without productId', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.delete('/api/admin/products/variants');

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('productId is required');
    });

    test('should successfully unlink a product from variant group', async ({ page }) => {
      await loginAsAdmin(page);

      // First verify product is in a group
      const { data: before } = await supabaseAdmin
        .from('products')
        .select('variant_group_id')
        .eq('id', testProducts[0].id)
        .single();

      expect(before!.variant_group_id).not.toBeNull();

      // Unlink
      const response = await page.request.delete(`/api/admin/products/variants?productId=${testProducts[0].id}`);

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify in database
      const { data: after } = await supabaseAdmin
        .from('products')
        .select('variant_group_id, variant_name, variant_order')
        .eq('id', testProducts[0].id)
        .single();

      expect(after!.variant_group_id).toBeNull();
      expect(after!.variant_name).toBeNull();
      expect(after!.variant_order).toBe(0);
    });
  });
});

test.describe('get_variant_group RPC Function', () => {
  let testProducts: any[] = [];
  let variantGroupId: string;

  test.beforeAll(async () => {
    variantGroupId = crypto.randomUUID();

    // Create test products - first 2 active, third inactive
    for (let i = 0; i < 3; i++) {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert({
          name: `RPC Variant Test ${i + 1}`,
          slug: `rpc-variant-${Date.now()}-${i}`,
          price: (i + 1) * 100,
          currency: 'EUR',
          description: `RPC test product ${i + 1}`,
          is_active: i < 2, // Only first 2 are active
          icon: '🎯',
          image_url: i === 0 ? 'https://example.com/image.jpg' : null,
          variant_group_id: variantGroupId,
          variant_name: `Tier ${i + 1}`,
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

  test('should return only ACTIVE variants for a group', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_variant_group', { p_group_id: variantGroupId });

    expect(error).toBeNull();
    // Only 2 active variants should be returned (third is inactive)
    expect(data).toHaveLength(2);
  });

  test('should return correct fields', async () => {
    const { data } = await supabaseAdmin
      .rpc('get_variant_group', { p_group_id: variantGroupId });

    const firstVariant = data![0];
    expect(firstVariant).toHaveProperty('id');
    expect(firstVariant).toHaveProperty('name');
    expect(firstVariant).toHaveProperty('slug');
    expect(firstVariant).toHaveProperty('variant_name');
    expect(firstVariant).toHaveProperty('variant_order');
    expect(firstVariant).toHaveProperty('price');
    expect(firstVariant).toHaveProperty('currency');
    expect(firstVariant).toHaveProperty('description');
    expect(firstVariant).toHaveProperty('image_url');
    expect(firstVariant).toHaveProperty('is_active');
  });

  test('should order variants by variant_order', async () => {
    const { data } = await supabaseAdmin
      .rpc('get_variant_group', { p_group_id: variantGroupId });

    expect(data![0].variant_name).toBe('Tier 1');
    expect(data![1].variant_name).toBe('Tier 2');
  });

  test('should return empty array for non-existent group', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_variant_group', { p_group_id: crypto.randomUUID() });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('should NOT include inactive variants (filtered by RPC)', async () => {
    const { data } = await supabaseAdmin
      .rpc('get_variant_group', { p_group_id: variantGroupId });

    // Third product is inactive - should NOT be in results
    const inactiveVariant = data!.find(v => v.variant_name === 'Tier 3');
    expect(inactiveVariant).toBeUndefined();

    // All returned variants should be active
    expect(data!.every(v => v.is_active === true)).toBe(true);
  });
});
