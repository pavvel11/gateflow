/**
 * SECURITY TEST: Webhook Amount Validation
 *
 * Tests that Stripe webhook validates payment amounts against product prices
 * to prevent price manipulation attacks.
 *
 * VULNERABILITY: Currently webhook accepts any amount_total from Stripe
 * without comparing it to the actual product.price in database.
 */

import { test, expect } from '@playwright/test';
import Stripe from 'stripe';
import { supabaseAdmin } from './helpers/admin-auth';

test.describe('Webhook Amount Validation Security', () => {
  let stripe: Stripe;
  let testProduct: { id: string; name: string; price: number; currency: string };

  test.beforeAll(async () => {
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }
    stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    // Create test product with price > 0
    const suffix = Date.now().toString();
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: `Webhook Test Product ${suffix}`,
        slug: `webhook-test-${suffix}`,
        price: 99.99,
        currency: 'USD',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    testProduct = { id: product.id, name: product.name, price: product.price, currency: product.currency };
    console.log(`Created test product: ${testProduct.name} ($${testProduct.price})`);
  });

  test.afterAll(async () => {
    if (testProduct?.id) {
      await supabaseAdmin.from('payment_transactions').delete().eq('product_id', testProduct.id);
      await supabaseAdmin.from('products').delete().eq('id', testProduct.id);
    }
  });

  test('SECURITY: Reject webhook with manipulated amount (lower than product price)', async ({ request }) => {
    // This test demonstrates the CRITICAL vulnerability:
    // Webhook accepts amount_total without verifying it matches product.price

    console.log(`Using test product: ${testProduct.name} ($${testProduct.price})`);

    // 2. Create a Stripe checkout session with MANIPULATED amount (only $1)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: testProduct.name },
          unit_amount: 100, // MANIPULATED: $1.00 instead of $99.99
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        product_id: testProduct.id,
      },
    });

    // 3. Call payment processing function directly (simulates webhook)
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: session.id,
        product_id_param: testProduct.id,
        customer_email_param: 'attacker@example.com',
        amount_total: 100, // MANIPULATED: $1.00 instead of product price
        currency_param: 'usd',
      }
    );

    console.log('\n🔍 Price manipulation test:');
    console.log(`   Product price: $${testProduct.price}`);
    console.log(`   Manipulated amount: $1.00 (100 cents)`);
    console.log(`   Result: ${error ? 'REJECTED ✅' : 'ACCEPTED ❌'}`);

    if (error) {
      console.log(`   Error: ${error.message}`);
    }

    // EXPECTED: Should reject with "Amount mismatch" error
    expect(error).toBeTruthy();
    expect(error?.message).toContain('Amount mismatch');
  });

  test('SECURITY: Accept webhook with correct amount', async ({ request }) => {
    // Positive test: Verify that correct amount is accepted

    // Call with CORRECT amount
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: 'cs_test_valid_' + Date.now(),
        product_id_param: testProduct.id,
        customer_email_param: 'valid@example.com',
        amount_total: Math.round(testProduct.price * 100), // CORRECT amount in cents
        currency_param: testProduct.currency,
      }
    );

    console.log('\n🔍 Valid amount test:');
    console.log(`   Product price: $${testProduct.price}`);
    console.log(`   Sent amount: $${testProduct.price} (${Math.round(testProduct.price * 100)} cents)`);
    console.log(`   Result: ${error ? 'REJECTED ❌' : 'ACCEPTED ✅'}`);

    // EXPECTED: Should succeed
    expect(error).toBeFalsy();
    expect(result?.success).toBe(true);
  });

  test('SECURITY: Reject currency mismatch', async ({ request }) => {
    // Test currency validation - testProduct is USD

    // Call with WRONG currency (EUR instead of USD)
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: 'cs_test_currency_' + Date.now(),
        product_id_param: testProduct.id,
        customer_email_param: 'currency-test@example.com',
        amount_total: Math.round(testProduct.price * 100),
        currency_param: 'eur', // WRONG: Product is USD!
      }
    );

    console.log('\n🔍 Currency mismatch test:');
    console.log(`   Product currency: ${testProduct.currency}`);
    console.log(`   Sent currency: EUR`);
    console.log(`   Result: ${error ? 'REJECTED ✅' : 'ACCEPTED ❌'}`);

    if (error) {
      console.log(`   Error: ${error.message}`);
    }

    // EXPECTED: Should reject with "Currency mismatch" error
    expect(error).toBeTruthy();
    expect(error?.message).toContain('Currency mismatch');
  });

  test('SECURITY: Accept PWYW with any positive amount', async ({ request }) => {
    // Pay What You Want products (price = NULL) should accept any positive amount

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price, currency')
      .eq('is_active', true)
      .is('price', null) // PWYW product
      .limit(1);

    if (!products || products.length === 0) {
      console.log('Skipping: No PWYW products found');
      return;
    }

    const product = products[0];

    // Call with custom amount (PWYW allows any amount)
    const { data: result, error } = await supabaseAdmin.rpc(
      'process_stripe_payment_completion_with_bump',
      {
        session_id_param: 'cs_test_pwyw_' + Date.now(),
        product_id_param: product.id,
        customer_email_param: 'pwyw@example.com',
        amount_total: 1500, // $15.00 custom amount
        currency_param: product.currency || 'usd',
      }
    );

    console.log('\n🔍 PWYW (Pay What You Want) test:');
    console.log(`   Product has fixed price: ${product.price !== null ? 'YES' : 'NO'}`);
    console.log(`   Custom amount: $15.00`);
    console.log(`   Result: ${error ? 'REJECTED ❌' : 'ACCEPTED ✅'}`);

    // EXPECTED: Should succeed (PWYW skips amount validation)
    expect(error).toBeFalsy();
    expect(result?.success).toBe(true);
  });
});

test.describe('Webhook Amount Validation - Recommended Fix', () => {
  test('Documentation: How to fix the vulnerability', async () => {
    const fixDocumentation = `
    VULNERABILITY FIX REQUIRED:
    ============================

    File: supabase/migrations/20250103000000_features.sql
    Function: process_stripe_payment_completion_with_bump

    CURRENT CODE (lines 648-651):
    ------------------------------
    SELECT id, auto_grant_duration_days INTO product_record
    FROM public.products
    WHERE id = product_id_param AND is_active = true;

    FIXED CODE:
    -----------
    SELECT
      id,
      auto_grant_duration_days,
      price,
      currency
    INTO product_record
    FROM public.products
    WHERE id = product_id_param AND is_active = true;

    -- Add validation after SELECT:
    IF amount_total != (product_record.price * 100) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Amount mismatch: expected ' || product_record.price || ' but got ' || (amount_total / 100.0)
      );
    END IF;

    IF upper(currency_param) != upper(product_record.currency) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Currency mismatch'
      );
    END IF;

    NOTES:
    ------
    - amount_total from Stripe is in cents (100 = $1.00)
    - product.price is in dollars ($1.00)
    - Need to multiply price * 100 for comparison
    - For PWYW products, validate amount >= custom_price_min * 100
    - For products with coupons, calculate expected_amount after discount
    `;

    console.log(fixDocumentation);
    expect(true).toBe(true); // Documentation test
  });
});
