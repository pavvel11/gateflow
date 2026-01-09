/**
 * API v1 Comparison Tests
 *
 * Compares old /api/admin/* endpoints with new /api/v1/* endpoints
 * to ensure backward compatibility (excluding expected differences like pagination format).
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

// SKIP: Deprecated /api/admin/* endpoints are now blocked (return 503)
// These comparison tests are no longer needed - v1 migration is complete
test.describe.skip('API v1 Comparison with Old Endpoints', () => {
  let adminUserId: string;
  let adminEmail: string;
  const adminPassword = 'TestPassword123!';
  let testProductId: string;

  test.beforeAll(async () => {
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `comparison-test-${randomStr}@example.com`;

    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Comparison Tester' }
    });

    if (error) throw error;
    adminUserId = user!.id;

    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });

    // Create a test product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Comparison Test Product ${randomStr}`,
        slug: `comparison-test-${randomStr}`,
        description: 'Product for comparison testing',
        price: 9900,
        currency: 'PLN',
        is_active: true,
      })
      .select('id')
      .single();

    if (productError) throw productError;
    testProductId = product.id;
  });

  test.afterAll(async () => {
    if (testProductId) {
      await supabaseAdmin.from('products').delete().eq('id', testProductId);
    }
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test.describe('Products API Comparison', () => {
    test('GET products - both endpoints return same products', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get('/api/admin/products');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get('/api/v1/products?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Old returns { products: [...] }, new returns { data: [...], pagination: {...} }
      const oldProducts = oldBody.products || oldBody;
      const newProducts = newBody.data;

      // Check that the test product exists in both
      const oldTestProduct = oldProducts.find((p: any) => p.id === testProductId);
      const newTestProduct = newProducts.find((p: any) => p.id === testProductId);

      expect(oldTestProduct).toBeDefined();
      expect(newTestProduct).toBeDefined();

      // Compare key fields
      expect(newTestProduct.name).toBe(oldTestProduct.name);
      expect(newTestProduct.slug).toBe(oldTestProduct.slug);
      expect(newTestProduct.price).toBe(oldTestProduct.price);
      expect(newTestProduct.is_active).toBe(oldTestProduct.is_active);
    });

    test('GET single product - both endpoints return same data', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get(`/api/admin/products/${testProductId}`);
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get(`/api/v1/products/${testProductId}`);
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Old returns product directly or in { product: {...} }
      const oldProduct = oldBody.product || oldBody;
      const newProduct = newBody.data;

      // Compare key fields
      expect(newProduct.id).toBe(oldProduct.id);
      expect(newProduct.name).toBe(oldProduct.name);
      expect(newProduct.slug).toBe(oldProduct.slug);
      expect(newProduct.price).toBe(oldProduct.price);
      expect(newProduct.currency).toBe(oldProduct.currency);
      expect(newProduct.is_active).toBe(oldProduct.is_active);
    });
  });

  test.describe('Users API Comparison', () => {
    test('GET users - both endpoints return users', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get('/api/users');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get('/api/v1/users?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Both should return users
      const oldUsers = Array.isArray(oldBody) ? oldBody : (oldBody.users || oldBody.data || []);
      const newUsers = newBody.data;

      expect(Array.isArray(oldUsers)).toBe(true);
      expect(Array.isArray(newUsers)).toBe(true);
    });
  });

  test.describe('Coupons API Comparison', () => {
    let testCouponId: string;
    let testCouponCode: string;

    test.beforeAll(async () => {
      const randomStr = Math.random().toString(36).substring(7);
      testCouponCode = `COMPARE${randomStr.toUpperCase()}`;

      const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .insert({
          code: testCouponCode,
          discount_type: 'percentage',
          discount_value: 10,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      testCouponId = coupon.id;
    });

    test.afterAll(async () => {
      if (testCouponId) {
        await supabaseAdmin.from('coupons').delete().eq('id', testCouponId);
      }
    });

    test('GET coupons - both endpoints return same coupons', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get('/api/admin/coupons');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get('/api/v1/coupons?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      const oldCoupons = oldBody.coupons || oldBody.data || oldBody;
      const newCoupons = newBody.data;

      // Find test coupon in both
      const oldTestCoupon = oldCoupons.find((c: any) => c.id === testCouponId);
      const newTestCoupon = newCoupons.find((c: any) => c.id === testCouponId);

      expect(oldTestCoupon).toBeDefined();
      expect(newTestCoupon).toBeDefined();

      // Compare key fields
      expect(newTestCoupon.code).toBe(oldTestCoupon.code);
      expect(newTestCoupon.discount_type).toBe(oldTestCoupon.discount_type);
      expect(newTestCoupon.discount_value).toBe(oldTestCoupon.discount_value);
      expect(newTestCoupon.is_active).toBe(oldTestCoupon.is_active);
    });

    test('new API adds GET single coupon endpoint (not in old API)', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API does NOT have GET /api/admin/coupons/:id
      // This is a new feature in v1 API

      // New endpoint works
      const newResponse = await page.request.get(`/api/v1/coupons/${testCouponId}`);
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      expect(newBody.data.id).toBe(testCouponId);
      expect(newBody.data.code).toBe(testCouponCode);
    });
  });

  test.describe('Webhooks API Comparison', () => {
    let testWebhookId: string;

    test.beforeAll(async () => {
      const randomStr = Math.random().toString(36).substring(7);

      const { data: webhook, error } = await supabaseAdmin
        .from('webhook_endpoints')
        .insert({
          url: `https://example.com/compare-webhook-${randomStr}`,
          events: ['payment.completed'],
          is_active: true,
          secret: `whsec_compare_${randomStr}`,
        })
        .select('id')
        .single();

      if (error) throw error;
      testWebhookId = webhook.id;
    });

    test.afterAll(async () => {
      if (testWebhookId) {
        await supabaseAdmin.from('webhook_endpoints').delete().eq('id', testWebhookId);
      }
    });

    test('GET webhooks - both endpoints return same webhooks', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get('/api/admin/webhooks');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get('/api/v1/webhooks?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      const oldWebhooks = oldBody.webhooks || oldBody.endpoints || oldBody.data || oldBody;
      const newWebhooks = newBody.data;

      // Find test webhook in both
      const oldTestWebhook = oldWebhooks.find((w: any) => w.id === testWebhookId);
      const newTestWebhook = newWebhooks.find((w: any) => w.id === testWebhookId);

      expect(oldTestWebhook).toBeDefined();
      expect(newTestWebhook).toBeDefined();

      // Compare key fields
      expect(newTestWebhook.url).toBe(oldTestWebhook.url);
      expect(newTestWebhook.is_active).toBe(oldTestWebhook.is_active);
    });
  });

  test.describe('Refund Requests API Comparison', () => {
    let testTransactionId: string;
    let testRefundRequestId: string;

    test.beforeAll(async () => {
      const randomStr = Math.random().toString(36).substring(7);

      // Create transaction
      const { data: tx, error: txError } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          customer_email: `compare-${randomStr}@example.com`,
          amount: 9900,
          currency: 'PLN',
          status: 'completed',
          stripe_payment_intent_id: `pi_compare_${randomStr}`,
          product_id: testProductId,
          user_id: adminUserId,
          session_id: `cs_compare_${randomStr}`,
        })
        .select('id')
        .single();

      if (txError) throw txError;
      testTransactionId = tx.id;

      // Create refund request
      const { data: refund, error: refundError } = await supabaseAdmin
        .from('refund_requests')
        .insert({
          transaction_id: testTransactionId,
          user_id: adminUserId,
          customer_email: `compare-${randomStr}@example.com`,
          product_id: testProductId,
          requested_amount: 9900,
          currency: 'PLN',
          reason: 'Comparison test',
          status: 'pending',
        })
        .select('id')
        .single();

      if (refundError) throw refundError;
      testRefundRequestId = refund.id;
    });

    test.afterAll(async () => {
      if (testRefundRequestId) {
        await supabaseAdmin.from('refund_requests').delete().eq('id', testRefundRequestId);
      }
      if (testTransactionId) {
        await supabaseAdmin.from('payment_transactions').delete().eq('id', testTransactionId);
      }
    });

    test('GET refund requests - both endpoints return requests', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint (uses RPC, returns different format)
      const oldResponse = await page.request.get('/api/admin/refund-requests');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint
      const newResponse = await page.request.get('/api/v1/refund-requests?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Old API uses RPC which may return data differently
      // Both should at least return arrays
      const oldRequests = Array.isArray(oldBody.requests) ? oldBody.requests : [];
      const newRequests = newBody.data;

      expect(Array.isArray(newRequests)).toBe(true);

      // New endpoint should contain our test request
      const newTestRequest = newRequests.find((r: any) => r.id === testRefundRequestId);
      expect(newTestRequest).toBeDefined();
      expect(newTestRequest.status).toBe('pending');
    });
  });

  test.describe('Response Format Differences', () => {
    test('new API uses standardized pagination format', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/products');
      const body = await response.json();

      // Verify new pagination format
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('has_more');
      expect(body.pagination).toHaveProperty('next_cursor');
    });

    test('new API uses standardized success response format', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get(`/api/v1/products/${testProductId}`);
      const body = await response.json();

      // Single item response wraps in { data: {...} }
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('id');
    });

    test('new API uses standardized error response format', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const response = await page.request.get('/api/v1/products/invalid-uuid');
      expect(response.status()).toBe(400);

      const body = await response.json();

      // Error response format
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });

  test.describe('Feature Parity', () => {
    test('both APIs support filtering products by active status', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint with filter
      const oldResponse = await page.request.get('/api/admin/products?status=active');
      expect(oldResponse.status()).toBe(200);

      // New endpoint with filter
      const newResponse = await page.request.get('/api/v1/products?status=active');
      expect(newResponse.status()).toBe(200);
    });

    test('both APIs support searching products', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint with search
      const oldResponse = await page.request.get('/api/admin/products?search=comparison');
      expect(oldResponse.status()).toBe(200);

      // New endpoint with search
      const newResponse = await page.request.get('/api/v1/products?search=comparison');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Verify search works - should find our test product
      const found = newBody.data.some((p: any) => p.name.includes('Comparison'));
      expect(found).toBe(true);
    });

    test('both APIs support filtering coupons by status', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint
      const oldResponse = await page.request.get('/api/admin/coupons?status=active');
      expect(oldResponse.status()).toBe(200);

      // New endpoint
      const newResponse = await page.request.get('/api/v1/coupons?status=active');
      expect(newResponse.status()).toBe(200);
    });
  });

  test.describe('Payments API Comparison', () => {
    let testTransactionId: string;

    test.beforeAll(async () => {
      const randomStr = Math.random().toString(36).substring(7);

      const { data: tx, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          customer_email: `payment-compare-${randomStr}@example.com`,
          amount: 4900,
          currency: 'PLN',
          status: 'completed',
          stripe_payment_intent_id: `pi_payment_compare_${randomStr}`,
          product_id: testProductId,
          user_id: adminUserId,
          session_id: `cs_payment_compare_${randomStr}`,
        })
        .select('id')
        .single();

      if (error) throw error;
      testTransactionId = tx.id;
    });

    test.afterAll(async () => {
      if (testTransactionId) {
        await supabaseAdmin.from('payment_transactions').delete().eq('id', testTransactionId);
      }
    });

    test('GET transactions - both endpoints return same payments', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint: /api/admin/payments/transactions
      const oldResponse = await page.request.get('/api/admin/payments/transactions');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint: /api/v1/payments
      const newResponse = await page.request.get('/api/v1/payments?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Old returns array directly, new returns { data: [...], pagination: {...} }
      const oldTransactions = Array.isArray(oldBody) ? oldBody : (oldBody.transactions || oldBody.data || []);
      const newTransactions = newBody.data;

      // Find test transaction in both
      const oldTestTx = oldTransactions.find((t: any) => t.id === testTransactionId);
      const newTestTx = newTransactions.find((t: any) => t.id === testTransactionId);

      expect(oldTestTx).toBeDefined();
      expect(newTestTx).toBeDefined();

      // Compare key fields
      expect(newTestTx.customer_email).toBe(oldTestTx.customer_email);
      expect(newTestTx.amount).toBe(oldTestTx.amount);
      expect(newTestTx.currency).toBe(oldTestTx.currency);
      expect(newTestTx.status).toBe(oldTestTx.status);
    });

    test('both APIs support filtering by status', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint with status filter
      const oldResponse = await page.request.get('/api/admin/payments/transactions?status=completed');
      expect(oldResponse.status()).toBe(200);

      // New endpoint with status filter
      const newResponse = await page.request.get('/api/v1/payments?status=completed');
      expect(newResponse.status()).toBe(200);
    });

    test('new API adds GET single payment endpoint (not in old API)', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API does NOT have GET /api/admin/payments/transactions/:id
      // This is a new feature in v1 API

      // New endpoint works
      const newResponse = await page.request.get(`/api/v1/payments/${testTransactionId}`);
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      expect(newBody.data.id).toBe(testTransactionId);
    });
  });

  test.describe('Webhooks Logs API Comparison', () => {
    let testWebhookId: string;
    let testLogId: string;

    test.beforeAll(async () => {
      const randomStr = Math.random().toString(36).substring(7);

      // Create webhook endpoint
      const { data: webhook, error: webhookError } = await supabaseAdmin
        .from('webhook_endpoints')
        .insert({
          url: `https://example.com/logs-compare-${randomStr}`,
          events: ['payment.completed'],
          is_active: true,
          secret: `whsec_logs_compare_${randomStr}`,
        })
        .select('id')
        .single();

      if (webhookError) throw webhookError;
      testWebhookId = webhook.id;

      // Create webhook log
      const { data: log, error: logError } = await supabaseAdmin
        .from('webhook_logs')
        .insert({
          endpoint_id: testWebhookId,
          event_type: 'payment.completed',
          http_status: 200,
          status: 'success',
          payload: { test: 'data' },
          response_body: 'OK',
          duration_ms: 150,
        })
        .select('id')
        .single();

      if (logError) throw logError;
      testLogId = log.id;
    });

    test.afterAll(async () => {
      if (testLogId) {
        await supabaseAdmin.from('webhook_logs').delete().eq('id', testLogId);
      }
      if (testWebhookId) {
        await supabaseAdmin.from('webhook_endpoints').delete().eq('id', testWebhookId);
      }
    });

    test('GET webhook logs - both endpoints return same logs', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint: /api/admin/webhooks/logs
      const oldResponse = await page.request.get('/api/admin/webhooks/logs');
      expect(oldResponse.status()).toBe(200);
      const oldBody = await oldResponse.json();

      // New endpoint: /api/v1/webhooks/logs
      const newResponse = await page.request.get('/api/v1/webhooks/logs?limit=100');
      expect(newResponse.status()).toBe(200);
      const newBody = await newResponse.json();

      // Old returns array directly, new returns { data: [...], pagination: {...} }
      const oldLogs = Array.isArray(oldBody) ? oldBody : (oldBody.logs || oldBody.data || []);
      const newLogs = newBody.data;

      // Find test log in both
      const oldTestLog = oldLogs.find((l: any) => l.id === testLogId);
      const newTestLog = newLogs.find((l: any) => l.id === testLogId);

      expect(oldTestLog).toBeDefined();
      expect(newTestLog).toBeDefined();

      // Compare key fields
      expect(newTestLog.event_type).toBe(oldTestLog.event_type);
      expect(newTestLog.http_status).toBe(oldTestLog.http_status);
      expect(newTestLog.status).toBe(oldTestLog.status);
    });

    test('both APIs support filtering logs by status', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint with status filter
      const oldResponse = await page.request.get('/api/admin/webhooks/logs?status=success');
      expect(oldResponse.status()).toBe(200);

      // New endpoint with status filter
      const newResponse = await page.request.get('/api/v1/webhooks/logs?status=success');
      expect(newResponse.status()).toBe(200);
    });

    test('both APIs support filtering logs by endpoint', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old endpoint with endpointId filter
      const oldResponse = await page.request.get(`/api/admin/webhooks/logs?endpointId=${testWebhookId}`);
      expect(oldResponse.status()).toBe(200);

      // New endpoint with endpoint_id filter
      const newResponse = await page.request.get(`/api/v1/webhooks/logs?endpoint_id=${testWebhookId}`);
      expect(newResponse.status()).toBe(200);
    });
  });

  test.describe('CRUD Operations Comparison', () => {
    test('Products: both APIs support updating products', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const newDescription = `Updated description ${Date.now()}`;

      // Old API uses PUT
      const oldResponse = await page.request.put(`/api/admin/products/${testProductId}`, {
        data: { description: newDescription },
      });
      expect(oldResponse.status()).toBe(200);

      // New API uses PATCH
      const newResponse = await page.request.patch(`/api/v1/products/${testProductId}`, {
        data: { description: 'Another updated description' },
      });
      expect(newResponse.status()).toBe(200);
    });

    test('Coupons: both APIs support updating coupons', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);
      const testCode = `CRUDTEST${randomStr.toUpperCase()}`;

      // Create a coupon for this test
      const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .insert({
          code: testCode,
          discount_type: 'percentage',
          discount_value: 15,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      try {
        // Old API uses PATCH
        const oldResponse = await page.request.patch(`/api/admin/coupons/${coupon.id}`, {
          data: { discount_value: 20 },
        });
        expect(oldResponse.status()).toBe(200);

        // New API also uses PATCH
        const newResponse = await page.request.patch(`/api/v1/coupons/${coupon.id}`, {
          data: { discount_value: 25 },
        });
        expect(newResponse.status()).toBe(200);
      } finally {
        await supabaseAdmin.from('coupons').delete().eq('id', coupon.id);
      }
    });

    test('Webhooks: both APIs support updating webhooks', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);

      // Create a webhook for this test
      const { data: webhook, error } = await supabaseAdmin
        .from('webhook_endpoints')
        .insert({
          url: `https://example.com/crud-test-${randomStr}`,
          events: ['payment.completed'],
          is_active: true,
          secret: `whsec_crud_test_${randomStr}`,
        })
        .select('id')
        .single();

      if (error) throw error;

      try {
        // Old API uses PUT
        const oldResponse = await page.request.put(`/api/admin/webhooks/${webhook.id}`, {
          data: { description: 'Updated via old API' },
        });
        expect(oldResponse.status()).toBe(200);

        // New API uses PATCH
        const newResponse = await page.request.patch(`/api/v1/webhooks/${webhook.id}`, {
          data: { description: 'Updated via new API' },
        });
        expect(newResponse.status()).toBe(200);
      } finally {
        await supabaseAdmin.from('webhook_endpoints').delete().eq('id', webhook.id);
      }
    });

    test('Products: both APIs support creating products', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);
      let oldProductId: string | null = null;
      let newProductId: string | null = null;

      try {
        // Old API POST (returns 201)
        const oldResponse = await page.request.post('/api/admin/products', {
          data: {
            name: `Old API Product ${randomStr}`,
            slug: `old-api-product-${randomStr}`,
            description: 'Created via old API',
            price: 1000,
            currency: 'PLN',
            is_active: true,
          },
        });
        expect(oldResponse.status()).toBe(201);
        const oldBody = await oldResponse.json();
        oldProductId = oldBody.product?.id || oldBody.id;

        // New API POST (also returns 201)
        const newResponse = await page.request.post('/api/v1/products', {
          data: {
            name: `New API Product ${randomStr}`,
            slug: `new-api-product-${randomStr}`,
            description: 'Created via new API',
            price: 2000,
            currency: 'PLN',
            is_active: true,
          },
        });
        expect(newResponse.status()).toBe(201);
        const newBody = await newResponse.json();
        newProductId = newBody.data?.id;
      } finally {
        if (oldProductId) {
          await supabaseAdmin.from('products').delete().eq('id', oldProductId);
        }
        if (newProductId) {
          await supabaseAdmin.from('products').delete().eq('id', newProductId);
        }
      }
    });

    test('Coupons: both APIs support creating coupons', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);
      let oldCouponId: string | null = null;
      let newCouponId: string | null = null;

      try {
        // Old API POST (returns 201)
        const oldResponse = await page.request.post('/api/admin/coupons', {
          data: {
            code: `OLD${randomStr.toUpperCase()}`,
            discount_type: 'percentage',
            discount_value: 10,
            is_active: true,
          },
        });
        expect(oldResponse.status()).toBe(201);
        const oldBody = await oldResponse.json();
        oldCouponId = oldBody.coupon?.id || oldBody.id;

        // New API POST (also returns 201)
        const newResponse = await page.request.post('/api/v1/coupons', {
          data: {
            code: `NEW${randomStr.toUpperCase()}`,
            discount_type: 'percentage',
            discount_value: 15,
            is_active: true,
          },
        });
        expect(newResponse.status()).toBe(201);
        const newBody = await newResponse.json();
        newCouponId = newBody.data?.id;
      } finally {
        if (oldCouponId) {
          await supabaseAdmin.from('coupons').delete().eq('id', oldCouponId);
        }
        if (newCouponId) {
          await supabaseAdmin.from('coupons').delete().eq('id', newCouponId);
        }
      }
    });

    test('Webhooks: both APIs support creating webhooks', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);
      let oldWebhookId: string | null = null;
      let newWebhookId: string | null = null;

      try {
        // Old API POST
        const oldResponse = await page.request.post('/api/admin/webhooks', {
          data: {
            url: `https://example.com/old-api-webhook-${randomStr}`,
            events: ['payment.completed'],
            is_active: true,
          },
        });
        expect(oldResponse.status()).toBe(200);
        const oldBody = await oldResponse.json();
        oldWebhookId = oldBody.webhook?.id || oldBody.endpoint?.id || oldBody.id;

        // New API POST
        const newResponse = await page.request.post('/api/v1/webhooks', {
          data: {
            url: `https://example.com/new-api-webhook-${randomStr}`,
            events: ['payment.completed'],
            is_active: true,
          },
        });
        expect(newResponse.status()).toBe(201);
        const newBody = await newResponse.json();
        newWebhookId = newBody.data?.id;
      } finally {
        if (oldWebhookId) {
          await supabaseAdmin.from('webhook_endpoints').delete().eq('id', oldWebhookId);
        }
        if (newWebhookId) {
          await supabaseAdmin.from('webhook_endpoints').delete().eq('id', newWebhookId);
        }
      }
    });

    test('Products: new API DELETE works correctly', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Use a very unique short slug
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Create product via API
      const createResponse = await page.request.post('/api/v1/products', {
        data: {
          name: `DelTest ${uniqueId}`,
          slug: `del-${uniqueId}`,
          description: 'Test product for deletion',
          price: 1000,
          currency: 'PLN',
          is_active: true,
        },
      });

      // If creation fails, log the error for debugging
      if (createResponse.status() !== 201) {
        const errorBody = await createResponse.json();
        console.log('Product creation failed:', errorBody);
      }
      expect(createResponse.status()).toBe(201);

      const createBody = await createResponse.json();
      const productId = createBody.data.id;

      // New API DELETE returns 204 No Content
      const newResponse = await page.request.delete(`/api/v1/products/${productId}`);
      expect(newResponse.status()).toBe(204);

      // Verify product is deleted
      const getResponse = await page.request.get(`/api/v1/products/${productId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('Coupons: new API DELETE works correctly', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);

      // Create coupon via new API
      const createResponse = await page.request.post('/api/v1/coupons', {
        data: {
          code: `DELNEW${randomStr.toUpperCase()}`,
          discount_type: 'percentage',
          discount_value: 10,
          is_active: true,
        },
      });
      expect(createResponse.status()).toBe(201);
      const createBody = await createResponse.json();
      const couponId = createBody.data.id;

      // New API DELETE returns 204 No Content
      const newResponse = await page.request.delete(`/api/v1/coupons/${couponId}`);
      expect(newResponse.status()).toBe(204);

      // Verify coupon is deleted
      const getResponse = await page.request.get(`/api/v1/coupons/${couponId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('Webhooks: new API DELETE works correctly', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      const randomStr = Math.random().toString(36).substring(7);

      // Create webhook via new API
      const createResponse = await page.request.post('/api/v1/webhooks', {
        data: {
          url: `https://example.com/delete-new-${randomStr}`,
          events: ['payment.completed'],
          is_active: true,
        },
      });
      expect(createResponse.status()).toBe(201);
      const createBody = await createResponse.json();
      const webhookId = createBody.data.id;

      // New API DELETE returns 204 No Content
      const newResponse = await page.request.delete(`/api/v1/webhooks/${webhookId}`);
      expect(newResponse.status()).toBe(204);

      // Verify webhook is deleted
      const getResponse = await page.request.get(`/api/v1/webhooks/${webhookId}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Migrated Endpoints (Previously P3)', () => {
    test('order-bumps endpoint exists in both old and new API', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API has order-bumps
      const oldResponse = await page.request.get('/api/admin/order-bumps');
      expect(oldResponse.status()).toBe(200);

      // New API also has order-bumps (migrated)
      const newResponse = await page.request.get('/api/v1/order-bumps');
      expect(newResponse.status()).toBe(200);
      const newJson = await newResponse.json();
      expect(newJson).toHaveProperty('data');
    });

    test('variant-groups endpoint exists in both old and new API', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API has variant-groups
      const oldResponse = await page.request.get('/api/admin/variant-groups');
      expect(oldResponse.status()).toBe(200);

      // New API also has variant-groups (migrated)
      const newResponse = await page.request.get('/api/v1/variant-groups');
      expect(newResponse.status()).toBe(200);
      const newJson = await newResponse.json();
      expect(newJson).toHaveProperty('data');
    });

    test('payments/sessions endpoint exists only in old API (mirrors transactions)', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API has checkout sessions (actually fetches from payment_transactions)
      // Note: Uses inner join with products, so may fail without data
      const oldResponse = await page.request.get('/api/admin/payments/sessions');
      // Should return 200 or 500 if join fails, but endpoint exists
      expect([200, 500]).toContain(oldResponse.status());

      // New API does NOT have separate sessions endpoint - uses /payments instead
      // /api/v1/payments/sessions matches /api/v1/payments/[id] with "sessions" as ID
      // Returns 400 (invalid UUID) which indicates no dedicated sessions endpoint
      const newResponse = await page.request.get('/api/v1/payments/sessions');
      // 400 = validation error (treating "sessions" as invalid ID)
      // 404 = not found (if separate routing existed)
      expect([400, 404]).toContain(newResponse.status());
    });

    test('payments/export endpoint exists in both old and new API', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API export uses POST method (not GET)
      const oldResponse = await page.request.post('/api/admin/payments/export', {
        data: { status: 'all' },
      });
      // Should return CSV or error, but endpoint exists
      expect([200, 500]).toContain(oldResponse.status());

      // New API also has export endpoint (migrated)
      const newResponse = await page.request.post('/api/v1/payments/export', {
        data: { status: 'all' },
      });
      expect(newResponse.status()).toBe(200);
      // Should return CSV
      const contentType = newResponse.headers()['content-type'];
      expect(contentType).toContain('text/csv');
    });

    test('payments/stats endpoint exists in both old and new API', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Old API has stats
      const oldResponse = await page.request.get('/api/admin/payments/stats');
      expect(oldResponse.status()).toBe(200);

      // New API also has stats (migrated)
      const newResponse = await page.request.get('/api/v1/payments/stats');
      expect(newResponse.status()).toBe(200);
      const newJson = await newResponse.json();
      expect(newJson.data).toHaveProperty('total_transactions');
      expect(newJson.data).toHaveProperty('total_revenue');
    });
  });

  test.describe('v1 Endpoint CRUD Tests', () => {
    test('order-bumps: full CRUD cycle works', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Create a second product for order bump
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const createProductResponse = await page.request.post('/api/v1/products', {
        data: {
          name: `Bump Product ${uniqueId}`,
          slug: `bump-${uniqueId}`,
          description: 'Product for order bump testing',
          price: 500,
          currency: 'PLN',
          is_active: true,
        },
      });
      expect(createProductResponse.status()).toBe(201);
      const bumpProductId = (await createProductResponse.json()).data.id;

      try {
        // CREATE order bump
        const createResponse = await page.request.post('/api/v1/order-bumps', {
          data: {
            main_product_id: testProductId,
            bump_product_id: bumpProductId,
            bump_title: 'Test Bump Title',
            bump_description: 'Test bump description',
            bump_price: 300,
            is_active: true,
          },
        });
        expect(createResponse.status()).toBe(201);
        const createBody = await createResponse.json();
        expect(createBody.data).toHaveProperty('id');
        const orderBumpId = createBody.data.id;

        // READ single order bump
        const getResponse = await page.request.get(`/api/v1/order-bumps/${orderBumpId}`);
        expect(getResponse.status()).toBe(200);
        const getBody = await getResponse.json();
        expect(getBody.data.bump_title).toBe('Test Bump Title');

        // UPDATE order bump
        const updateResponse = await page.request.patch(`/api/v1/order-bumps/${orderBumpId}`, {
          data: {
            bump_title: 'Updated Bump Title',
            bump_price: 400,
          },
        });
        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody.data.bump_title).toBe('Updated Bump Title');
        expect(updateBody.data.bump_price).toBe(400);

        // DELETE order bump
        const deleteResponse = await page.request.delete(`/api/v1/order-bumps/${orderBumpId}`);
        expect(deleteResponse.status()).toBe(204);

        // Verify deleted
        const verifyResponse = await page.request.get(`/api/v1/order-bumps/${orderBumpId}`);
        expect(verifyResponse.status()).toBe(404);
      } finally {
        // Cleanup bump product
        await page.request.delete(`/api/v1/products/${bumpProductId}`);
      }
    });

    test('variant-groups: full CRUD cycle works', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Create a second product for variant group
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const createProductResponse = await page.request.post('/api/v1/products', {
        data: {
          name: `Variant Product ${uniqueId}`,
          slug: `variant-${uniqueId}`,
          description: 'Product for variant testing',
          price: 1500,
          currency: 'PLN',
          is_active: true,
        },
      });
      expect(createProductResponse.status()).toBe(201);
      const secondProductId = (await createProductResponse.json()).data.id;

      try {
        // CREATE variant group
        const createResponse = await page.request.post('/api/v1/variant-groups', {
          data: {
            name: 'Test Variant Group',
            slug: `test-vg-${uniqueId}`,
            products: [
              { product_id: testProductId, variant_name: 'Basic', is_featured: true },
              { product_id: secondProductId, variant_name: 'Premium', is_featured: false },
            ],
          },
        });
        expect(createResponse.status()).toBe(201);
        const createBody = await createResponse.json();
        expect(createBody.data).toHaveProperty('id');
        const groupId = createBody.data.id;

        // READ single variant group
        const getResponse = await page.request.get(`/api/v1/variant-groups/${groupId}`);
        expect(getResponse.status()).toBe(200);
        const getBody = await getResponse.json();
        expect(getBody.data.name).toBe('Test Variant Group');
        expect(getBody.data.products).toHaveLength(2);

        // UPDATE variant group
        const updateResponse = await page.request.patch(`/api/v1/variant-groups/${groupId}`, {
          data: {
            name: 'Updated Variant Group',
          },
        });
        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody.data.name).toBe('Updated Variant Group');

        // DELETE variant group
        const deleteResponse = await page.request.delete(`/api/v1/variant-groups/${groupId}`);
        expect(deleteResponse.status()).toBe(204);

        // Verify deleted
        const verifyResponse = await page.request.get(`/api/v1/variant-groups/${groupId}`);
        expect(verifyResponse.status()).toBe(404);
      } finally {
        // Cleanup second product
        await page.request.delete(`/api/v1/products/${secondProductId}`);
      }
    });

    test('OTO (One-Time Offer): full cycle works', async ({ page }) => {
      await loginAsAdmin(page, adminEmail, adminPassword);

      // Create OTO product
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const createProductResponse = await page.request.post('/api/v1/products', {
        data: {
          name: `OTO Product ${uniqueId}`,
          slug: `oto-${uniqueId}`,
          description: 'Product for OTO testing',
          price: 2000,
          currency: 'PLN',
          is_active: true,
        },
      });
      expect(createProductResponse.status()).toBe(201);
      const otoProductId = (await createProductResponse.json()).data.id;

      try {
        // GET OTO config (initially none)
        const getEmptyResponse = await page.request.get(`/api/v1/products/${testProductId}/oto`);
        expect(getEmptyResponse.status()).toBe(200);
        const emptyBody = await getEmptyResponse.json();
        expect(emptyBody.data.has_oto).toBe(false);

        // PUT (create) OTO config
        const putResponse = await page.request.put(`/api/v1/products/${testProductId}/oto`, {
          data: {
            oto_product_id: otoProductId,
            discount_type: 'percentage',
            discount_value: 25,
            duration_minutes: 30,
          },
        });
        expect(putResponse.status()).toBe(200);

        // GET OTO config (now exists)
        const getResponse = await page.request.get(`/api/v1/products/${testProductId}/oto`);
        expect(getResponse.status()).toBe(200);
        const getBody = await getResponse.json();
        expect(getBody.data.has_oto).toBe(true);

        // DELETE OTO config
        const deleteResponse = await page.request.delete(`/api/v1/products/${testProductId}/oto`);
        expect(deleteResponse.status()).toBe(204);

        // Verify deleted
        const verifyResponse = await page.request.get(`/api/v1/products/${testProductId}/oto`);
        expect(verifyResponse.status()).toBe(200);
        const verifyBody = await verifyResponse.json();
        expect(verifyBody.data.has_oto).toBe(false);
      } finally {
        // Cleanup OTO product
        await page.request.delete(`/api/v1/products/${otoProductId}`);
      }
    });
  });
});
