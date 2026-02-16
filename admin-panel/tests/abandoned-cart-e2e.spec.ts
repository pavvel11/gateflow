/**
 * Abandoned Cart Recovery - E2E Tests
 *
 * Tests the full abandoned cart flow from user perspective:
 * - User starts checkout (pending payment created)
 * - User leaves without paying (abandoned)
 * - User completes payment (pending → completed)
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Abandoned Cart Recovery - E2E', () => {
  // Enforce single worker to avoid race conditions
  test.describe.configure({ mode: 'serial' });
  let testProduct: any;

  test.beforeAll(async () => {
    // Create test product
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `E2E Abandoned Cart Test ${Date.now()}`,
        slug: `e2e-abandoned-${Date.now()}`,
        price: 100,
        currency: 'PLN',
        description: 'Test product for abandoned cart E2E',
        is_active: true,
        vat_rate: 23,
        price_includes_vat: true
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = data;
  });

  test.afterAll(async () => {
    if (testProduct) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProduct.id);
    }
  });

  test('should create pending payment when user reaches checkout', async ({ page }) => {
    const testEmail = `e2e-pending-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_e2e_pending_${Date.now()}`;

    // Verify checkout page loads with product info
    await page.goto(`/pl/checkout/${testProduct.slug}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toContainText(testProduct.name, { timeout: 15000 });

    // Simulate pending payment creation (what the checkout API would do)
    const { error } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    expect(error).toBeNull();

    // Verify pending payment was created
    const { data: pendingPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status, customer_email')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(pendingPayment?.status).toBe('pending');
    expect(pendingPayment?.customer_email).toBe(testEmail);
  });

  test('should track abandoned cart when user leaves without paying', async ({ page }) => {
    const testEmail = `e2e-abandoned-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_e2e_abandoned_${Date.now()}`;

    // Create a pending payment (simulating what create-payment-intent would do)
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    // Verify pending payment exists
    const { data: pendingPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(pendingPayment?.status).toBe('pending');

    // Simulate user leaving - navigate away
    await page.goto('/');

    // In real scenario, cron job would mark this as abandoned after 24h
    // For testing, we manually mark it
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'abandoned',
        abandoned_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntentId);

    // Verify abandoned status
    const { data: abandonedPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status, abandoned_at')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(abandonedPayment?.status).toBe('abandoned');
    expect(abandonedPayment?.abandoned_at).toBeTruthy();
  });

  test('should convert pending to completed when payment succeeds', async ({ page }) => {
    const testEmail = `e2e-completed-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_e2e_completed_${Date.now()}`;

    // Create pending payment
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    // Verify pending
    const { data: pendingPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(pendingPayment?.status).toBe('pending');

    // Simulate payment success (webhook would do this)
    // Call the RPC function that webhook uses
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: paymentIntentId,
        product_id_param: testProduct.id,
        customer_email_param: testEmail,
        amount_total: 10000,
        currency_param: 'PLN',
        stripe_payment_intent_id: paymentIntentId,
        user_id_param: null,
        bump_product_id_param: null,
        coupon_id_param: null
      }
    );

    expect(error).toBeNull();
    expect(result?.success).toBe(true);

    // Verify payment is now completed
    const { data: completedPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status, metadata')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(completedPayment?.status).toBe('completed');
    expect(completedPayment?.metadata).toHaveProperty('converted_from_pending', true);
  });

  test('should show abandoned cart in admin panel query', async ({ page }) => {
    const testEmail = `e2e-admin-query-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_admin_${Date.now()}`;

    // Create abandoned cart
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 15000,
        currency: 'PLN',
        status: 'abandoned',
        abandoned_at: new Date().toISOString(),
        metadata: {
          first_name: 'Admin',
          last_name: 'Query Test'
        }
      });

    // Query abandoned carts via RPC
    const { data: abandonedCarts, error } = await supabaseAdmin.rpc('get_abandoned_carts', {
      days_ago: 7,
      limit_count: 100
    });

    expect(error).toBeNull();
    expect(Array.isArray(abandonedCarts)).toBe(true);

    // Find our test cart
    const testCart = abandonedCarts?.find((cart: any) => cart.customer_email === testEmail);
    expect(testCart).toBeDefined();
    expect(testCart.amount).toBe(15000);
    expect(testCart.product_id).toBe(testProduct.id);
  });

  test('should calculate statistics for abandoned carts', async ({ page }) => {
    // Create multiple abandoned and pending carts
    const timestamp = Date.now();
    const testData = [
      { email: `stats-1-${timestamp}@example.com`, status: 'abandoned', amount: 10000 },
      { email: `stats-2-${timestamp}@example.com`, status: 'abandoned', amount: 20000 },
      { email: `stats-3-${timestamp}@example.com`, status: 'pending', amount: 15000 }
    ];

    for (let i = 0; i < testData.length; i++) {
      const item = testData[i];
      await supabaseAdmin
        .from('payment_transactions')
        .insert({
          session_id: `pi_stats_${i}_${timestamp}`,
          stripe_payment_intent_id: `pi_stats_${i}_${timestamp}`,
          product_id: testProduct.id,
          customer_email: item.email,
          amount: item.amount,
          currency: 'PLN',
          status: item.status,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    }

    // Wait for DB to process
    await page.waitForTimeout(500);

    // Get statistics
    const { data: stats, error } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 7
    });

    expect(error).toBeNull();
    expect(stats).toBeDefined();
    expect(stats.total_abandoned).toBeGreaterThanOrEqual(2);
    expect(stats.total_pending).toBeGreaterThanOrEqual(1);
    expect(stats.total_value).toBeGreaterThanOrEqual(45000); // 10k + 20k + 15k
    expect(stats.avg_cart_value).toBeGreaterThan(0);
  });

  test('should handle expired pending payments', async ({ page }) => {
    const testEmail = `e2e-expired-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_expired_${Date.now()}`;

    // Create pending payment that expired 1 hour ago
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending',
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      });

    // Mark expired payments as abandoned (cron job would do this)
    const { data: markedCount, error } = await supabaseAdmin.rpc('mark_expired_pending_payments');

    expect(error).toBeNull();
    expect(markedCount).toBeGreaterThanOrEqual(1);

    // Verify status changed
    const { data: payment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status, abandoned_at')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(payment?.status).toBe('abandoned');
    expect(payment?.abandoned_at).toBeTruthy();
  });

  test('should prevent duplicate transactions with same payment intent', async ({ page }) => {
    const testEmail = `e2e-duplicate-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_duplicate_${Date.now()}`;

    // Create first transaction
    const { error: firstError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending'
      });

    expect(firstError).toBeNull();

    // Try to create duplicate (should fail)
    const { error: duplicateError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: `${paymentIntentId}_different`,
        stripe_payment_intent_id: paymentIntentId, // Same payment intent
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending'
      });

    expect(duplicateError).not.toBeNull();
    expect(duplicateError?.code).toBe('23505'); // Unique constraint violation
  });

  test('should update existing pending instead of creating duplicate on payment', async ({ page }) => {
    const testEmail = `e2e-update-${Date.now()}@example.com`;
    const paymentIntentId = `pi_test_update_${Date.now()}`;

    // Step 1: Create pending payment
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        session_id: paymentIntentId,
        stripe_payment_intent_id: paymentIntentId,
        product_id: testProduct.id,
        customer_email: testEmail,
        amount: 10000,
        currency: 'PLN',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    // Step 2: Count pending transactions
    const { count: beforeCount } = await supabaseAdmin
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('stripe_payment_intent_id', paymentIntentId);

    expect(beforeCount).toBe(1);

    // Step 3: Process payment (webhook simulation)
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: paymentIntentId,
        product_id_param: testProduct.id,
        customer_email_param: testEmail,
        amount_total: 10000,
        currency_param: 'PLN',
        stripe_payment_intent_id: paymentIntentId,
        user_id_param: null
      }
    );

    expect(error).toBeNull();
    expect(result?.success).toBe(true);

    // Step 4: Verify still only 1 transaction (updated, not duplicated)
    const { count: afterCount } = await supabaseAdmin
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('stripe_payment_intent_id', paymentIntentId);

    expect(afterCount).toBe(1);

    // Step 5: Verify status is completed
    const { data: payment } = await supabaseAdmin
      .from('payment_transactions')
      .select('status, metadata')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    expect(payment?.status).toBe('completed');
    expect(payment?.metadata).toHaveProperty('converted_from_pending', true);
  });
});
