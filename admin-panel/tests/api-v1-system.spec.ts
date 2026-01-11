/**
 * Tests for System API v1
 *
 * Tests system status endpoint.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot run API tests.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Helper to login as admin via browser context
async function loginAsAdmin(page: any, email: string, password: string) {
  await page.goto('/login');

  await page.evaluate(async ({ email, password, url, anonKey }: { email: string; password: string; url: string; anonKey: string }) => {
    // @ts-ignore
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, {
    email,
    password,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  });

  await page.reload();
}

test.describe('System API v1', () => {
  let adminUserId: string;
  let adminEmail: string;
  const adminPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    // Create admin user for all tests
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `system-api-test-${randomStr}@example.com`;

    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'System API Tester' }
    });

    if (error) throw error;
    adminUserId = user!.id;

    // Make user an admin
    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });
  });

  test.afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('Authentication', () => {
    test('should return 401 for unauthenticated requests', async ({ request }) => {
      const response = await request.get('/api/v1/system/status');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  test.describe('GET /api/v1/system/status', () => {
    test('should return system status for authenticated admin', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data).toHaveProperty('status');
      expect(['healthy', 'degraded']).toContain(body.data.status);
      expect(body.data).toHaveProperty('timestamp');
      expect(body.data).toHaveProperty('version');
      expect(body.data).toHaveProperty('database');
      expect(body.data).toHaveProperty('counts');
    });

    test('should include version information', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.version).toHaveProperty('api');
      expect(body.data.version.api).toBe('v1');
      expect(body.data.version).toHaveProperty('service');
      expect(body.data.version).toHaveProperty('build');
    });

    test('should include database health', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.database).toHaveProperty('connected');
      expect(typeof body.data.database.connected).toBe('boolean');
    });

    test('should include counts for various entities', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.counts).toHaveProperty('products');
      expect(body.data.counts.products).toHaveProperty('total');
      expect(body.data.counts.products).toHaveProperty('active');

      expect(body.data.counts).toHaveProperty('users');
      expect(body.data.counts.users).toHaveProperty('total');

      expect(body.data.counts).toHaveProperty('transactions');
      expect(body.data.counts.transactions).toHaveProperty('total');
      expect(body.data.counts.transactions).toHaveProperty('completed');

      expect(body.data.counts).toHaveProperty('refund_requests');
      expect(body.data.counts.refund_requests).toHaveProperty('pending');

      expect(body.data.counts).toHaveProperty('webhooks');
      expect(body.data.counts.webhooks).toHaveProperty('active');

      expect(body.data.counts).toHaveProperty('coupons');
      expect(body.data.counts.coupons).toHaveProperty('active');

      expect(body.data.counts).toHaveProperty('api_keys');
      expect(body.data.counts.api_keys).toHaveProperty('active');
    });

    test('should include feature flags', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data).toHaveProperty('features');
      expect(body.data.features).toHaveProperty('webhooks_enabled');
      expect(body.data.features).toHaveProperty('api_keys_enabled');
    });

    test('should include environment information', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data).toHaveProperty('environment');
      expect(['development', 'test', 'production']).toContain(body.data.environment);
    });

    test('should return valid timestamp in ISO format', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      const timestamp = new Date(body.data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('should report healthy status when database is connected', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/system/status');

      expect(response.status()).toBe(200);
      const body = await response.json();

      // If database is connected, status should be healthy
      if (body.data.database.connected) {
        expect(body.data.status).toBe('healthy');
      }
    });
  });
});
