import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiting';
import { calculatePricing, toStripeCents, STRIPE_MINIMUM_AMOUNT } from '@/hooks/usePricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

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
    if (customAmount !== undefined && customAmount > 0) {
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

    // 4. Fetch bump product if selected
    let bumpProduct = null;
    if (bumpProductId) {
      const { data: bump } = await supabase
        .from('products')
        .select('*')
        .eq('id', bumpProductId)
        .eq('is_active', true)
        .single();

      if (bump && bump.currency === product.currency) {
        bumpProduct = bump;
      }
    }

    // 5. Fetch and validate coupon
    let appliedCoupon = null;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        const isValidForProduct = coupon.applies_to_all_products ||
          (coupon.applicable_product_ids && coupon.applicable_product_ids.includes(productId));

        if (isValidForProduct) {
          appliedCoupon = coupon;
        }
      }
    }

    // 6. Calculate pricing using centralized function
    const pricing = calculatePricing({
      productPrice: product.price,
      productCurrency: product.currency,
      customAmount,
      bumpPrice: bumpProduct?.price,
      bumpSelected: !!bumpProduct,
      coupon: appliedCoupon ? {
        discount_type: appliedCoupon.discount_type,
        discount_value: appliedCoupon.discount_value,
        code: appliedCoupon.code,
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
      // Disable Link to prevent LinkAuthenticationElement from showing
      payment_method_options: {
        link: {
          setup_future_usage: 'none',
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
        bump_product_id: bumpProductId || '',
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

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

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
