/**
 * Tests for Analytics API v1
 *
 * Tests dashboard, revenue, and top-products endpoints.
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

test.describe('Analytics API v1', () => {
  let adminUserId: string;
  let adminEmail: string;
  const adminPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    // Create admin user for all tests
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `analytics-api-test-${randomStr}@example.com`;

    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Analytics API Tester' }
    });

    if (error) throw error;
    adminUserId = user!.id;

    // Make user an admin
    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });
  });

  test.afterAll(async () => {
    // Cleanup admin user
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('Authentication', () => {
    test('should return 401 for unauthenticated requests to dashboard', async ({ request }) => {
      const response = await request.get('/api/v1/analytics/dashboard');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    test('should return 401 for unauthenticated requests to revenue', async ({ request }) => {
      const response = await request.get('/api/v1/analytics/revenue');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    test('should return 401 for unauthenticated requests to top-products', async ({ request }) => {
      const response = await request.get('/api/v1/analytics/top-products');

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  test.describe('GET /api/v1/analytics/dashboard', () => {
    test('should return dashboard overview', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/dashboard');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('revenue');
      expect(body.data.revenue).toHaveProperty('today');
      expect(body.data.revenue).toHaveProperty('this_week');
      expect(body.data.revenue).toHaveProperty('this_month');
      expect(body.data.revenue).toHaveProperty('total');
      expect(body.data.revenue).toHaveProperty('by_currency');

      expect(body.data).toHaveProperty('transactions');
      expect(body.data.transactions).toHaveProperty('today');
      expect(body.data.transactions).toHaveProperty('total');

      expect(body.data).toHaveProperty('products');
      expect(body.data.products).toHaveProperty('active');
      expect(body.data.products).toHaveProperty('total');

      expect(body.data).toHaveProperty('users');
      expect(body.data.users).toHaveProperty('total');
      expect(body.data.users).toHaveProperty('with_access');

      expect(body.data).toHaveProperty('refunds');
      expect(body.data.refunds).toHaveProperty('pending_count');

      expect(body.data).toHaveProperty('recent_activity');
      expect(Array.isArray(body.data.recent_activity)).toBe(true);

      expect(body.data).toHaveProperty('generated_at');
    });

    test('should support product_id filter', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Use a fake product ID - should still work, just return zeros
      const response = await page.request.get('/api/v1/analytics/dashboard?product_id=11111111-1111-4111-a111-111111111111');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.product_id).toBe('11111111-1111-4111-a111-111111111111');
    });
  });

  test.describe('GET /api/v1/analytics/revenue', () => {
    test('should return revenue stats with default period', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/revenue');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('summary');
      expect(body.data.summary).toHaveProperty('total_revenue');
      expect(body.data.summary).toHaveProperty('total_transactions');
      expect(body.data.summary).toHaveProperty('average_order_value');
      expect(body.data.summary).toHaveProperty('by_currency');

      expect(body.data).toHaveProperty('breakdown');
      expect(Array.isArray(body.data.breakdown)).toBe(true);

      expect(body.data).toHaveProperty('comparison');
      expect(body.data.comparison).toHaveProperty('revenue_change_percent');
      expect(body.data.comparison).toHaveProperty('transaction_change_percent');

      expect(body.data).toHaveProperty('filters');
      expect(body.data.filters.period).toBe('month');
    });

    test('should support different periods', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const periods = ['day', 'week', 'month', 'quarter', 'year'];

      for (const period of periods) {
        const response = await page.request.get(`/api/v1/analytics/revenue?period=${period}`);

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body.data.filters.period).toBe(period);
      }
    });

    test('should support custom date range', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      const response = await page.request.get(
        `/api/v1/analytics/revenue?start_date=${startDate}&end_date=${endDate}`
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.start_date).toContain('2025-01-01');
    });

    test('should support group_by parameter', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/revenue?period=year&group_by=month');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.group_by).toBe('month');
    });

    test('should return comparison with previous period', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/revenue?period=month');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.comparison).toHaveProperty('previous_period');
      expect(body.data.comparison.previous_period).toHaveProperty('start');
      expect(body.data.comparison.previous_period).toHaveProperty('end');
      expect(body.data.comparison.previous_period).toHaveProperty('revenue');
    });
  });

  test.describe('GET /api/v1/analytics/top-products', () => {
    test('should return top products list', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('products');
      expect(Array.isArray(body.data.products)).toBe(true);

      expect(body.data).toHaveProperty('summary');
      expect(body.data.summary).toHaveProperty('total_products');
      expect(body.data.summary).toHaveProperty('total_revenue');
      expect(body.data.summary).toHaveProperty('total_sales');

      expect(body.data).toHaveProperty('filters');
      expect(body.data.filters).toHaveProperty('period');
      expect(body.data.filters).toHaveProperty('limit');
      expect(body.data.filters).toHaveProperty('sort_by');
    });

    test('should respect limit parameter', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products?limit=5');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.limit).toBe(5);
      expect(body.data.products.length).toBeLessThanOrEqual(5);
    });

    test('should support sort_by parameter', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products?sort_by=sales');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.sort_by).toBe('sales');
    });

    test('should reject invalid sort_by value', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products?sort_by=invalid');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    test('should include rank and share percentages', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products');

      expect(response.status()).toBe(200);
      const body = await response.json();

      if (body.data.products.length > 0) {
        const firstProduct = body.data.products[0];
        expect(firstProduct).toHaveProperty('rank');
        expect(firstProduct).toHaveProperty('revenue_share');
        expect(firstProduct).toHaveProperty('sales_share');
        expect(firstProduct.rank).toBe(1);
      }
    });

    test('should support different periods', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/analytics/top-products?period=year');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.data.filters.period).toBe('year');
    });
  });
});
