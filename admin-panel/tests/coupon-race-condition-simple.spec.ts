/**
 * SIMPLIFIED SECURITY TEST: Coupon Race Condition (TOCTOU)
 *
 * Uproszczony test weryfikujący podatność na race condition w kuponach
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

test.describe('Coupon Race Condition - Simplified', () => {
  test.describe.configure({ mode: 'serial' }); // Ensure database check runs after race test

  let productId: string;
  let couponId: string;
  let couponCode: string;
  let supabaseAdmin: SupabaseClient;

  test.beforeAll(async () => {
    // Create a fresh Supabase admin client for this test suite
    // This avoids potential connection pooling issues when running after many other tests
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Create a truly unique product for this test to avoid interference with other tests
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const slug = `race-test-product-${timestamp}-${randomSuffix}`;

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Race Condition Test Product',
        slug: slug,
        price: 100.00,
        currency: 'USD',
        is_active: true,
        enable_waitlist: false,
        vat_rate: 23,
        price_includes_vat: true,
        features: [{ title: 'Test', items: ['Race test'] }]
      })
      .select()
      .single();

    if (productError) throw productError;
    productId = product.id;
    console.log(`Created unique product for race test: ${slug} (${productId})`);

    // Create coupon with usage_limit_global = 1
    // NOTE: Code must be uppercase because verify API does .toUpperCase()
    couponCode = ('RACE' + timestamp + '_' + randomSuffix).toUpperCase();

    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: couponCode,
        discount_type: 'percentage',
        discount_value: 50,
        usage_limit_global: 1,
        usage_limit_per_user: 1,
        current_usage_count: 0,
        is_active: true,
        starts_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (couponError) {
      console.error('Failed to create test coupon:', couponError);
      throw couponError;
    }
    couponId = coupon.id;

    console.log(`Created test coupon: ${couponCode} (limit=1, id=${couponId})`);

    // Small delay to ensure DB is ready (avoids flaky first-run failures)
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test.afterAll(async () => {
    // Cleanup
    if (couponId) {
      await supabaseAdmin.from('coupon_redemptions').delete().eq('coupon_id', couponId);
      await supabaseAdmin.from('coupons').delete().eq('id', couponId);
    }
    if (productId) {
      await supabaseAdmin.from('products').delete().eq('id', productId);
    }
  });

  test('🔴 CRITICAL: Race condition allows bypassing usage_limit_global', async ({ request }) => {
    // This test demonstrates the TOCTOU (Time-of-check to Time-of-use) vulnerability

    // Verify coupon 10 times concurrently
    // EXPECTED: verify_coupon() should only allow 1 to succeed
    // ACTUAL: Multiple succeed due to missing FOR UPDATE lock

    const verifyPromises = Array(10).fill(null).map((_, i) =>
      request.post('http://localhost:3000/api/coupons/verify', {
        data: {
          code: couponCode,
          productId: productId,
          email: `user${i}@example.com`,
        }
      })
    );

    const responses = await Promise.all(verifyPromises);
    const results = await Promise.all(responses.map(r => r.json()));
    const validCount = results.filter(r => r.valid === true).length;

    console.log(`\n🔍 RACE CONDITION TEST RESULTS:`);
    console.log(`   - Coupon usage limit: 1`);
    console.log(`   - Concurrent verify requests: 10`);
    console.log(`   - Requests that passed validation: ${validCount}`);

    if (validCount > 1) {
      console.log(`   ❌ RACE CONDITION DETECTED! ${validCount} requests succeeded but limit is 1!`);
      console.log(`   → verify_coupon() lacks FOR UPDATE lock`);
      console.log(`   → Multiple requests read current_usage_count=0 simultaneously`);
      console.log(`   → All pass the check before any increments the counter`);
    } else {
      console.log(`   ✅ SAFE: Only ${validCount} request succeeded (expected)`);
    }

    // ASSERTION: Should be at most 1 valid
    // If this fails, race condition is confirmed
    expect(validCount).toBeLessThanOrEqual(1);
  });

  test('📊 Check database state after race', async () => {
    // Query coupon_redemptions to see how many times it was redeemed
    const { data: redemptions, count } = await supabaseAdmin
      .from('coupon_redemptions')
      .select('*', { count: 'exact' })
      .eq('coupon_id', couponId);

    const { data: coupon } = await supabaseAdmin
      .from('coupons')
      .select('current_usage_count')
      .eq('id', couponId)
      .single();

    console.log(`\n📊 DATABASE STATE:`);
    console.log(`   - Coupon current_usage_count: ${coupon?.current_usage_count}`);
    console.log(`   - Actual redemptions in DB: ${count}`);
    console.log(`   - Expected: 1`);

    if (count && count > 1) {
      console.log(`   ❌ ${count} redemptions found (limit was 1)`);
      console.log(`\n   PROOF OF VULNERABILITY:`);
      redemptions?.forEach((r, i) => {
        console.log(`      ${i+1}. Email: ${r.customer_email}, Time: ${r.redeemed_at}`);
      });
    }

    // This is the smoking gun - if more than 1 redemption exists, race condition occurred
    expect(count).toBeLessThanOrEqual(1);
  });
});

