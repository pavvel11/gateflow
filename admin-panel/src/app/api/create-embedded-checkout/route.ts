import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { productId, email } = await request.json();

    // Input validation
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Email is optional - Stripe will collect it in embedded form
    if (email) {
      // Validate email format if provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting check
    const identifier = user?.id || 'anonymous';
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      identifier_param: identifier,
      action_type_param: 'checkout_creation',
      max_requests: 50,
      window_minutes: 1,
    });

    if (rateLimitError || !rateLimitOk) {
      return NextResponse.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 });
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, slug, name, description, price, currency, is_active, available_from, available_until')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 });
    }

    // Validate product price
    if (product.price <= 0) {
      return NextResponse.json({ error: 'Invalid product price' }, { status: 400 });
    }

    // Check temporal availability
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now);
    
    if (!isTemporallyAvailable) {
      return NextResponse.json({ error: 'Product not available for purchase' }, { status: 400 });
    }

    // Check if user already has access (prevent duplicate purchases) - only for logged in users
    if (user) {
      const { data: existingAccess } = await supabase
        .from('user_product_access')
        .select('access_expires_at')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existingAccess) {
        const expiresAt = existingAccess.access_expires_at ? new Date(existingAccess.access_expires_at) : null;
        const isExpired = expiresAt && expiresAt < now;
        
        if (!isExpired) {
          return NextResponse.json({ error: 'You already have access to this product' }, { status: 400 });
        }
      }
    }

    const stripe = getStripeServer();
    
    // Create embedded checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      customer_email: email || undefined, // Optional - Stripe will collect if not provided
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: Math.round(product.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/p/${product.slug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        product_id: product.id,
        product_slug: product.slug,
        user_id: user?.id || '',
      },
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      automatic_tax: { enabled: false },
      billing_address_collection: 'auto',
    });

    if (!session.client_secret) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    // Payment session tracking is handled by Stripe webhooks
    // No need to store session data here - webhook will handle completion

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
    
  } catch (error) {
    console.error('Create embedded checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
