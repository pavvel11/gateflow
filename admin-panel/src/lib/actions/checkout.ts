'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

interface CreateEmbeddedCheckoutOptions {
  productId: string;
  email?: string;
}

export async function fetchClientSecret(options: CreateEmbeddedCheckoutOptions): Promise<string> {
  const origin = (await headers()).get('origin');
  const supabase = await createClient();
  
  try {
    const { productId, email } = options;

    // Input validation
    if (!productId) {
      throw new Error('Product ID is required');
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
    }

    // Get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Rate limiting check with proper IP-based limiting for anonymous users
    const rateLimitConfig = user 
      ? RATE_LIMITS.CHECKOUT_CREATION 
      : RATE_LIMITS.CHECKOUT_CREATION_ANONYMOUS;
    
    const isAllowed = await checkRateLimit(
      rateLimitConfig.actionType,
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMinutes,
      user?.id
    );

    if (!isAllowed) {
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

    // Check if user already has access (prevent duplicate purchases)
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
      customer_email: email || user?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${origin}/p/${product.slug}/payment-status?session_id={CHECKOUT_SESSION_ID}`,
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
      throw new Error('Failed to create checkout session');
    }

    return session.client_secret;
    
  } catch {
    throw error instanceof Error ? error : new Error('Failed to create checkout session');
  }
}

export async function signOutAndRedirectToCheckout() {
  const supabase = await createClient();
  
  // Sign out the user
  await supabase.auth.signOut();
  
  // Note: We can't redirect from server action, so we'll return success
  // and let the client handle the redirect
  return { success: true };
}
