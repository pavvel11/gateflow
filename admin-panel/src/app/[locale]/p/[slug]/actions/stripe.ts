'use server'

import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';

export async function fetchClientSecret(productId: string): Promise<string> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting check
    const identifier = user?.id || 'anonymous';
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      identifier_param: identifier,
      action_type_param: 'checkout_creation',
      max_requests: 5,
      window_minutes: 15,
    });

    if (rateLimitError || !rateLimitOk) {
      throw new Error('Too many checkout attempts. Please try again later.');
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, slug, name, description, price, currency, is_active, available_from, available_until')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      throw new Error('Product not found or inactive');
    }

    // Validate product price
    if (product.price <= 0) {
      throw new Error('Invalid product price');
    }

    // Check temporal availability
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now);
    
    if (!isTemporallyAvailable) {
      throw new Error('Product not available for purchase');
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
          throw new Error('You already have access to this product');
        }
      }
    }

    const stripe = getStripeServer();
    
    // Create embedded checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      customer_email: user?.email || undefined, // Optional - Stripe will collect if not provided
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
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/p/${product.slug}/payment-success`,
      metadata: {
        product_id: product.id.toString(),
        user_id: user?.id || '',
        user_email: user?.email || '',
      },
    });

    if (!session.client_secret) {
      throw new Error('Failed to create checkout session');
    }

    return session.client_secret;
  } catch (error) {
    console.error('Error in fetchClientSecret:', error);
    throw error;
  }
}
