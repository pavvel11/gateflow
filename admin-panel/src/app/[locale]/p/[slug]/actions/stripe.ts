'use server'

import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
}

interface UserAccess {
  access_expires_at: string | null;
}

class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/**
 * Validates if a product is temporally available for purchase
 */
function validateProductAvailability(product: Product): void {
  const now = new Date();
  const availableFrom = product.available_from ? new Date(product.available_from) : null;
  const availableUntil = product.available_until ? new Date(product.available_until) : null;
  
  const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && 
                               (!availableUntil || availableUntil > now);
  
  if (!isTemporallyAvailable) {
    throw new CheckoutError('Product not available for purchase');
  }
}

/**
 * Checks if user already has valid access to the product
 */
function validateUserAccess(existingAccess: UserAccess | null): void {
  if (!existingAccess) return;
  
  const expiresAt = existingAccess.access_expires_at ? new Date(existingAccess.access_expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();
  
  if (!isExpired) {
    throw new CheckoutError('You already have access to this product');
  }
}

/**
 * Fetches and validates product data
 */
async function getValidatedProduct(supabase: Awaited<ReturnType<typeof createClient>>, productId: string): Promise<Product> {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id, slug, name, description, price, currency, is_active,
      available_from, available_until
    `)
    .eq('id', productId)
    .eq('is_active', true)
    .single();

  if (productError || !product) {
    throw new CheckoutError('Product not found or inactive');
  }

  if (product.price <= 0) {
    throw new CheckoutError('Invalid product price');
  }

  validateProductAvailability(product);
  return product;
}

/**
 * Checks user's existing access to the product
 */
async function checkUserProductAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, productId: string): Promise<void> {
  const { data: existingAccess } = await supabase
    .from('user_product_access')
    .select('access_expires_at')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  validateUserAccess(existingAccess);
}

/**
 * Creates Stripe checkout session with proper configuration
 */
async function createCheckoutSession(stripe: ReturnType<typeof getStripeServer>, product: Product, userEmail?: string) {
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    customer_email: userEmail,
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
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/p/${product.slug}/payment-status`,
    metadata: {
      product_id: product.id.toString(),
      user_email: userEmail || '',
    },
  });

  if (!session.client_secret) {
    throw new CheckoutError('Failed to create checkout session');
  }

  return session.client_secret;
}

/**
 * Creates Stripe checkout session for a product
 * @param productId - The ID of the product to purchase
 * @returns Promise<string> - The client secret for the checkout session
 */
export async function fetchClientSecret(productId: string): Promise<string> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Apply rate limiting based on user status
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
      throw new CheckoutError('Too many checkout attempts. Please try again later.');
    }

    // Fetch and validate product
    const product = await getValidatedProduct(supabase, productId);

    // Check existing user access (only for authenticated users)
    if (user) {
      await checkUserProductAccess(supabase, user.id, product.id);
    }

    // Create Stripe checkout session
    const stripe = getStripeServer();
    return await createCheckoutSession(stripe, product, user?.email);

  } catch (error) {
    // Re-throw CheckoutErrors as-is for proper error handling
    if (error instanceof CheckoutError) {
      throw error;
    }
    
    // Handle unexpected errors
    throw new CheckoutError('Failed to initialize checkout. Please try again.');
  }
}
