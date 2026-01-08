/**
 * SIMPLIFIED SECURITY TEST: Coupon Race Condition (TOCTOU)
 *
 * Uproszczony test weryfikujący podatność na race condition w kuponach
 */

import { test, expect } from '@playwright/test';
import { supabaseAdmin } from './helpers/admin-auth';

test.describe('Coupon Race Condition - Simplified', () => {
  let productId: string;
  let couponId: string;
  let couponCode: string;

  test.beforeAll(async () => {
    // Get any existing product from seed data (bypass create issues)
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price')
      .eq('is_active', true)
      .limit(1);

    if (!products || products.length === 0) {
      throw new Error('No products found in database. Run seed.sql first.');
    }

    productId = products[0].id;
    console.log(`Using existing product: ${products[0].name} (${productId})`);

    // Create coupon with usage_limit_global = 1 using RPC (bypasses RLS)
    // Use more random suffix to avoid duplicates in concurrent tests
    couponCode = 'RACE' + Date.now() + '_' + Math.random().toString(36).substring(7);

    const { data: insertResult, error } = await supabaseAdmin
      .rpc('create_test_coupon', {
        p_code: couponCode,
        p_discount_type: 'percentage',
        p_discount_value: 50,
        p_usage_limit_global: 1,
        p_usage_limit_per_user: 1,
      })
      .single();

    if (error) {
      // Fallback: direct insert with service_role bypassing RLS
      const { data: coupon, error: insertError } = await supabaseAdmin
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

      if (insertError) throw insertError;
      couponId = coupon!.id;
    } else {
      couponId = insertResult;
    }

    console.log(`Created test coupon: ${couponCode} (limit=1, id=${couponId})`);
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

