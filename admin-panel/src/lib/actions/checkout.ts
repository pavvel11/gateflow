'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';
import { ProductValidationService } from '@/lib/services/product-validation';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

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
    if (email && !ProductValidationService.validateEmail(email)) {
      throw new Error('Invalid email format');
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

    // Validate product and check user access
    const validationService = new ProductValidationService(supabase);
    const { product } = await validationService.validateForCheckout(productId, user);

    const stripe = getStripeServer();
    
    // Prepare session configuration
    const sessionConfig = {
      ui_mode: 'embedded' as const,
      payment_method_types: [...STRIPE_CONFIG.payment_method_types],
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
      mode: 'payment' as const,
      return_url: `${origin}/p/${product.slug}/payment-status?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        product_id: product.id,
        product_slug: product.slug,
        user_id: user?.id || '',
      },
      expires_at: Math.floor(Date.now() / 1000) + (STRIPE_CONFIG.session.expires_hours * 60 * 60),
      automatic_tax: STRIPE_CONFIG.session.automatic_tax,
      tax_id_collection: STRIPE_CONFIG.session.tax_id_collection,
      billing_address_collection: 'auto' as const,
    };

    // Create embedded checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session.client_secret) {
      throw new Error('Failed to create checkout session');
    }

    return session.client_secret;
    
  } catch (error) {
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
