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

// SKIP: Deprecated /api/admin/variant-groups endpoints are now blocked (return 503)
// Use /api/v1/variant-groups instead - see api-v1-webhooks.spec.ts for v1 API tests
test.describe.skip('Product Variants API (M:N Schema)', () => {
  let adminUserId: string;
  let adminEmail: string;
  const adminPassword = 'TestPassword123!';
  let testProducts: any[] = [];
  let createdGroupId: string;

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
    // Cleanup test products (cascade will delete product_variant_groups entries)
    for (const product of testProducts) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', product.id);
    }

    // Cleanup created variant groups
    if (createdGroupId) {
      await supabaseAdmin
        .from('variant_groups')
        .delete()
        .eq('id', createdGroupId);
    }

    // Cleanup admin user
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('POST /api/admin/variant-groups - Create Variant Group', () => {
    test('should fail without authentication', async ({ request }) => {
      const response = await request.post('/api/admin/variant-groups', {
        data: {
          products: [
            { product_id: testProducts[0].id },
            { product_id: testProducts[1].id }
          ]
        }
      });

      expect(response.status()).toBe(401);
    });

    test('should fail with less than 2 products', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/variant-groups', {
        data: {
          products: [{ product_id: testProducts[0].id }]
        }
      });

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('At least 2 products');
    });

    test('should fail with empty products array', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/variant-groups', {
        data: {
          products: []
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should successfully create variant group with 2 products', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/variant-groups', {
        data: {
          name: 'Test Subscription Plans',
          products: [
            { product_id: testProducts[0].id, variant_name: 'Basic Plan', is_featured: true },
            { product_id: testProducts[1].id, variant_name: 'Pro Plan' }
          ]
        }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.groupId).toBeDefined();
      expect(json.message).toContain('2 products');

      createdGroupId = json.groupId;

      // Verify in database - check variant_groups table
      const { data: group } = await supabaseAdmin
        .from('variant_groups')
        .select('id, name')
        .eq('id', json.groupId)
        .single();

      expect(group).not.toBeNull();
      expect(group!.name).toBe('Test Subscription Plans');

      // Verify product_variant_groups junction table
      const { data: pvgs } = await supabaseAdmin
        .from('product_variant_groups')
        .select('product_id, variant_name, display_order, is_featured')
        .eq('group_id', json.groupId)
        .order('display_order');

      expect(pvgs).toHaveLength(2);
      expect(pvgs![0].variant_name).toBe('Basic Plan');
      expect(pvgs![0].is_featured).toBe(true);
      expect(pvgs![0].display_order).toBe(0);
      expect(pvgs![1].variant_name).toBe('Pro Plan');
      expect(pvgs![1].display_order).toBe(1);
    });

    test('should set display_order correctly', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.post('/api/admin/variant-groups', {
        data: {
          products: [
            { product_id: testProducts[2].id, variant_name: 'First' },
            { product_id: testProducts[3].id, variant_name: 'Second' }
          ]
        }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();

      // Verify display_order
      const { data: pvgs } = await supabaseAdmin
        .from('product_variant_groups')
        .select('display_order, variant_name')
        .eq('group_id', json.groupId)
        .order('display_order');

      expect(pvgs![0].display_order).toBe(0);
      expect(pvgs![0].variant_name).toBe('First');
      expect(pvgs![1].display_order).toBe(1);
      expect(pvgs![1].variant_name).toBe('Second');

      // Cleanup this group
      await supabaseAdmin
        .from('variant_groups')
        .delete()
        .eq('id', json.groupId);
    });

    test('should allow same product in multiple groups (M:N)', async ({ page }) => {
      await loginAsAdmin(page);

      // Create first group
      const response1 = await page.request.post('/api/admin/variant-groups', {
        data: {
          name: 'Group A',
          products: [
            { product_id: testProducts[2].id, variant_name: 'In Group A' },
            { product_id: testProducts[3].id, variant_name: 'Also in A' }
          ]
        }
      });

      expect(response1.status()).toBe(200);
      const json1 = await response1.json();

      // Create second group with overlapping product
      const response2 = await page.request.post('/api/admin/variant-groups', {
        data: {
          name: 'Group B',
          products: [
            { product_id: testProducts[2].id, variant_name: 'In Group B' },
            { product_id: testProducts[0].id, variant_name: 'Also in B' }
          ]
        }
      });

      // With M:N, this should succeed
      expect(response2.status()).toBe(200);
      const json2 = await response2.json();

      // Verify product is in both groups
      const { data: pvgs } = await supabaseAdmin
        .from('product_variant_groups')
        .select('group_id, variant_name')
        .eq('product_id', testProducts[2].id);

      expect(pvgs).toHaveLength(2);
      expect(pvgs!.map(p => p.variant_name).sort()).toEqual(['In Group A', 'In Group B']);

      // Cleanup
      await supabaseAdmin.from('variant_groups').delete().eq('id', json1.groupId);
      await supabaseAdmin.from('variant_groups').delete().eq('id', json2.groupId);
    });
  });

  test.describe('GET /api/admin/variant-groups - List Variant Groups', () => {
    test('should fail without authentication', async ({ request }) => {
      const response = await request.get('/api/admin/variant-groups');
      expect(response.status()).toBe(401);
    });

    test('should return all variant groups with products', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.get('/api/admin/variant-groups');

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.groups).toBeDefined();
      expect(Array.isArray(json.groups)).toBe(true);

      // Should include our created group
      const ourGroup = json.groups.find((g: any) => g.id === createdGroupId);
      if (createdGroupId) {
        expect(ourGroup).toBeDefined();
        expect(ourGroup.name).toBe('Test Subscription Plans');
        expect(ourGroup.products).toHaveLength(2);
      }
    });

    test('should include product details in response', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.get('/api/admin/variant-groups');
      const json = await response.json();

      if (json.groups.length > 0) {
        const group = json.groups[0];
        if (group.products && group.products.length > 0) {
          const product = group.products[0];
          expect(product).toHaveProperty('product_id');
          expect(product).toHaveProperty('variant_name');
          expect(product).toHaveProperty('display_order');
          expect(product).toHaveProperty('is_featured');
          expect(product).toHaveProperty('product');
          expect(product.product).toHaveProperty('name');
          expect(product.product).toHaveProperty('slug');
          expect(product.product).toHaveProperty('price');
        }
      }
    });
  });

  test.describe('PATCH /api/admin/variant-groups - Update Variant Group', () => {
    test('should fail without authentication', async ({ request }) => {
      const response = await request.patch(`/api/admin/variant-groups?groupId=${createdGroupId}`, {
        data: { name: 'Updated Name' }
      });
      expect(response.status()).toBe(401);
    });

    test('should fail without groupId', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.patch('/api/admin/variant-groups', {
        data: { name: 'Test' }
      });

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('groupId is required');
    });

    test('should update group name', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.patch(`/api/admin/variant-groups?groupId=${createdGroupId}`, {
        data: { name: 'Updated Subscription Plans' }
      });

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify in database
      const { data: group } = await supabaseAdmin
        .from('variant_groups')
        .select('name')
        .eq('id', createdGroupId)
        .single();

      expect(group!.name).toBe('Updated Subscription Plans');
    });

    test('should update products and their order', async ({ page }) => {
      await loginAsAdmin(page);

      // Update with new order and different featured product
      const response = await page.request.patch(`/api/admin/variant-groups?groupId=${createdGroupId}`, {
        data: {
          products: [
            { product_id: testProducts[1].id, variant_name: 'Now First', display_order: 0, is_featured: true },
            { product_id: testProducts[0].id, variant_name: 'Now Second', display_order: 1, is_featured: false }
          ]
        }
      });

      expect(response.status()).toBe(200);

      // Verify order changed
      const { data: pvgs } = await supabaseAdmin
        .from('product_variant_groups')
        .select('product_id, variant_name, display_order, is_featured')
        .eq('group_id', createdGroupId)
        .order('display_order');

      expect(pvgs![0].product_id).toBe(testProducts[1].id);
      expect(pvgs![0].variant_name).toBe('Now First');
      expect(pvgs![0].is_featured).toBe(true);
      expect(pvgs![1].product_id).toBe(testProducts[0].id);
      expect(pvgs![1].variant_name).toBe('Now Second');
    });
  });

  test.describe('DELETE /api/admin/variant-groups - Delete Variant Group', () => {
    let groupToDelete: string;

    test.beforeAll(async () => {
      // Create a group specifically for deletion tests
      const { data: group } = await supabaseAdmin
        .from('variant_groups')
        .insert({ name: 'To Be Deleted' })
        .select('id')
        .single();

      groupToDelete = group!.id;

      // Add products to it
      await supabaseAdmin
        .from('product_variant_groups')
        .insert([
          { group_id: groupToDelete, product_id: testProducts[2].id, variant_name: 'Delete Test 1', display_order: 0 },
          { group_id: groupToDelete, product_id: testProducts[3].id, variant_name: 'Delete Test 2', display_order: 1 }
        ]);
    });

    test('should fail without authentication', async ({ request }) => {
      const response = await request.delete(`/api/admin/variant-groups?groupId=${groupToDelete}`);
      expect(response.status()).toBe(401);
    });

    test('should fail without groupId', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.delete('/api/admin/variant-groups');

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('groupId is required');
    });

    test('should successfully delete variant group', async ({ page }) => {
      await loginAsAdmin(page);

      const response = await page.request.delete(`/api/admin/variant-groups?groupId=${groupToDelete}`);

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify group is deleted
      const { data: group } = await supabaseAdmin
        .from('variant_groups')
        .select('id')
        .eq('id', groupToDelete)
        .single();

      expect(group).toBeNull();

      // Verify junction table entries are also deleted (cascade)
      const { data: pvgs } = await supabaseAdmin
        .from('product_variant_groups')
        .select('id')
        .eq('group_id', groupToDelete);

      expect(pvgs).toHaveLength(0);
    });
  });
});
