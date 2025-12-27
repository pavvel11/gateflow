import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const {
      productId,
      email,
      bumpProductId,
      couponCode,
      needsInvoice,
      nip,
      companyName,
      successUrl
    } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user (if any)
    const { data: { user } } = await supabase.auth.getUser();

    // Email is required for guests, optional for logged-in users
    const finalEmail = email || user?.email;
    if (!finalEmail) {
      return NextResponse.json(
        { error: 'Email is required for guest checkout' },
        { status: 400 }
      );
    }

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

    // 3. Calculate price
    let totalAmount = product.price * 100; // Convert to cents
    let bumpProduct = null;

    // Add bump product if selected
    if (bumpProductId) {
      const { data: bump } = await supabase
        .from('products')
        .select('*')
        .eq('id', bumpProductId)
        .eq('is_active', true)
        .single();

      if (bump && bump.currency === product.currency) {
        bumpProduct = bump;
        totalAmount += bump.price * 100;
      }
    }

    // Apply coupon discount
    let appliedCoupon = null;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        // Verify coupon is valid for this product
        const isValidForProduct = coupon.applies_to_all_products ||
          (coupon.applicable_product_ids && coupon.applicable_product_ids.includes(productId));

        if (isValidForProduct) {
          appliedCoupon = coupon;
          if (coupon.discount_type === 'percentage') {
            totalAmount = Math.round(totalAmount * (1 - coupon.discount_value / 100));
          } else {
            totalAmount -= coupon.discount_value * 100;
          }
        }
      }
    }

    // Ensure total is at least minimum (e.g., 50 cents)
    totalAmount = Math.max(totalAmount, 50);

    // 4. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: product.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: finalEmail,
      metadata: {
        product_id: productId,
        product_name: product.name,
        user_id: user?.id || '',
        email: finalEmail,
        bump_product_id: bumpProductId || '',
        bump_product_name: bumpProduct?.name || '',
        coupon_code: appliedCoupon?.code || '',
        coupon_discount: appliedCoupon ? `${appliedCoupon.discount_value}${appliedCoupon.discount_type === 'percentage' ? '%' : product.currency}` : '',
        needs_invoice: needsInvoice ? 'true' : 'false',
        nip: nip || '',
        company_name: companyName || '',
        success_url: successUrl || '',
      },
    });

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
