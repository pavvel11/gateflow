import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiting';
import { calculatePricing, toStripeCents, STRIPE_MINIMUM_AMOUNT } from '@/hooks/usePricing';
import { getStripeServer } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting: 60 requests per 5 minutes (allows PWYW price changes + form retries)
    const rateLimitOk = await checkRateLimit('create_payment_intent', 60, 5, user?.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const {
      productId,
      email,
      firstName,
      lastName,
      termsAccepted,
      bumpProductId,
      couponCode,
      needsInvoice,
      nip,
      companyName,
      address,
      city,
      postalCode,
      country,
      successUrl,
      customAmount  // Pay What You Want
    } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Use email from request if provided, otherwise from user session
    // For guests without email, we'll let Stripe collect it via billing details
    const finalEmail = email || user?.email || null;

    // 1. Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // 2. Check if user already has access
    if (user) {
      const { data: existingAccess } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingAccess) {
        return NextResponse.json(
          { error: 'You already have access to this product' },
          { status: 400 }
        );
      }
    }

    // 3. Validate PWYW (Pay What You Want) custom pricing
    const STRIPE_MAX_AMOUNT = 999999.99; // Stripe's maximum amount limit
    if (customAmount !== undefined) {
      // SECURITY: Explicitly reject zero or negative amounts
      if (customAmount <= 0) {
        return NextResponse.json(
          { error: 'Custom amount must be greater than zero' },
          { status: 400 }
        );
      }

      // Security: Reject customAmount if product doesn't allow custom pricing
      if (!product.allow_custom_price) {
        return NextResponse.json(
          { error: 'This product does not allow custom pricing' },
          { status: 400 }
        );
      }

      // Validate minimum price
      const minPrice = product.custom_price_min || STRIPE_MINIMUM_AMOUNT;
      if (customAmount < minPrice) {
        return NextResponse.json(
          { error: `Amount must be at least ${minPrice} ${product.currency}` },
          { status: 400 }
        );
      }

      // Validate maximum price (Stripe limit)
      if (customAmount > STRIPE_MAX_AMOUNT) {
        return NextResponse.json(
          { error: `Amount must be no more than ${STRIPE_MAX_AMOUNT} ${product.currency}` },
          { status: 400 }
        );
      }
    }

    // 4. Fetch and validate bump product if selected
    // SECURITY: Must validate that bumpProductId is a valid order bump for this product
    let bumpProduct = null;
    let bumpPrice = 0;
    if (bumpProductId) {
      // Use the same RPC function that frontend uses to get valid bumps
      const { data: validBumps } = await supabase.rpc('get_product_order_bumps', {
        product_id_param: productId,
      });

      // Find if the requested bump is in the valid bumps list
      const validBump = validBumps?.find((b: any) => b.bump_product_id === bumpProductId);

      if (validBump && validBump.bump_currency === product.currency) {
        // Fetch full product data for metadata
        const { data: bump } = await supabase
          .from('products')
          .select('*')
          .eq('id', bumpProductId)
          .single();

        if (bump) {
          bumpProduct = bump;
          // SECURITY: Use the bump_price from order_bumps, not the product's regular price
          bumpPrice = validBump.bump_price;
        }
      }
      // If bumpProductId is not a valid bump for this product, silently ignore it
      // (could also return 400 error, but ignoring is more user-friendly)
    }

    // 5. Fetch and validate coupon using secure DB function
    // SECURITY: Must use verify_coupon RPC which checks all constraints:
    // - usage_limit_global, usage_limit_per_user
    // - expires_at, starts_at
    // - allowed_emails, allowed_product_ids
    // - Race condition prevention with reservations
    let appliedCoupon = null;
    if (couponCode) {
      const { data: couponResult, error: couponError } = await supabase.rpc('verify_coupon', {
        code_param: couponCode.toUpperCase(),
        product_id_param: productId,
        customer_email_param: finalEmail || null,
        currency_param: product.currency,
      });

      if (couponError) {
        console.error('Coupon verification error:', couponError);
        return NextResponse.json(
          { error: 'Failed to verify coupon. Please try again.' },
          { status: 500 }
        );
      } else if (couponResult?.valid) {
        appliedCoupon = {
          id: couponResult.id,
          code: couponResult.code,
          discount_type: couponResult.discount_type,
          discount_value: couponResult.discount_value,
          exclude_order_bumps: couponResult.exclude_order_bumps,
        };
      } else {
        // SECURITY: Don't silently ignore invalid coupon - user expects discount!
        // This prevents charging full price when user thought they had a discount
        return NextResponse.json(
          { error: couponResult?.error || 'Coupon code is no longer valid. Please remove it and try again.' },
          { status: 400 }
        );
      }
    }

    // 6. Calculate pricing using centralized function
    const pricing = calculatePricing({
      productPrice: product.price,
      productCurrency: product.currency,
      customAmount,
      bumpPrice: bumpPrice, // SECURITY: Use validated bump_price from order_bumps, not product.price
      bumpSelected: !!bumpProduct,
      coupon: appliedCoupon ? {
        discount_type: appliedCoupon.discount_type,
        discount_value: appliedCoupon.discount_value,
        code: appliedCoupon.code,
        exclude_order_bumps: appliedCoupon.exclude_order_bumps,
      } : null,
    });

    const totalAmount = toStripeCents(pricing.totalGross);

    // 7. Create PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalAmount,
      currency: product.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
      // Enable Link for one-click checkout with saved payment methods
      // 'off_session' = payment method can be reused for future payments (enables one-click checkout)
      // This allows Link to save customer payment details for faster checkout on return visits
      payment_method_options: {
        link: {
          setup_future_usage: 'off_session',
        },
      },
      metadata: {
        product_id: productId,
        product_name: product.name,
        user_id: user?.id || '',
        email: finalEmail || '',
        first_name: firstName || '',
        last_name: lastName || '',
        terms_accepted: termsAccepted ? 'true' : '',
        bump_product_id: bumpProduct?.id || '',  // Only set if bump was validated and applied
        bump_product_name: bumpProduct?.name || '',
        coupon_code: appliedCoupon?.code || '',
        coupon_discount: appliedCoupon ? `${appliedCoupon.discount_value}${appliedCoupon.discount_type === 'percentage' ? '%' : product.currency}` : '',
        needs_invoice: needsInvoice ? 'true' : 'false',
        nip: nip || '',
        company_name: companyName || '',
        address: address || '',
        city: city || '',
        postal_code: postalCode || '',
        country: country || '',
        success_url: successUrl || '',
        custom_amount: pricing.isPwyw ? pricing.basePrice.toString() : '',
        is_pwyw: pricing.isPwyw ? 'true' : 'false',
      },
    };

    // Only set receipt_email if we have an email
    if (finalEmail) {
      paymentIntentParams.receipt_email = finalEmail;
    }

    const stripe = await getStripeServer();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured. Please configure Stripe in admin settings.' },
        { status: 503 }
      );
    }
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Save pending payment transaction for abandoned cart recovery
    try {
      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          session_id: paymentIntent.id, // Use Payment Intent ID as session_id
          user_id: user?.id || null,
          product_id: productId,
          customer_email: finalEmail || 'pending@gateflow.app', // Fallback for guests without email
          amount: totalAmount,
          currency: product.currency,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          metadata: paymentIntentParams.metadata
        });

      if (insertError) {
        // Log error but don't fail the payment intent creation
        console.error('Failed to save pending transaction:', insertError);
      }
    } catch (dbError) {
      // Don't fail payment intent creation if DB insert fails
      console.error('Error saving pending transaction:', dbError);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
