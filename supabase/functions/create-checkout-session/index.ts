// supabase/functions/create-checkout-session/index.ts
// Minimal, secure checkout session creator
// Maximally leverages Stripe for payment processing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno'

// Types for request validation
interface CreateCheckoutRequest {
  slug?: string
  productId?: string
  email?: string
  successUrl?: string
  cancelUrl?: string
  providerId?: string
}

// Types for response
interface CreateCheckoutResponse {
  sessionId: string
  checkout_url: string
}

// Types for database entities
interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  price: number
  currency: string
  is_active: boolean
}

interface ProviderConfig {
  secret_key?: string
  webhook_secret?: string
  [key: string]: unknown
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: CreateCheckoutRequest = await req.json()
    const { slug, productId, email, successUrl, cancelUrl, providerId = 'stripe' } = requestData
    
    // Validate required parameters
    if (!slug && !productId) {
      throw new Error('Product slug or productId is required')
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get product details with validation
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, description, price, currency, is_active')
      .eq(slug ? 'slug' : 'id', slug || productId)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      throw new Error('Product not found or inactive')
    }

    // Validate product price (must be greater than 0 for paid products)
    if (product.price <= 0) {
      throw new Error('Invalid product price')
    }

    // Get payment provider configuration from environment variables (secure)
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!secretKey) {
      throw new Error('Stripe secret key not configured in environment')
    }

    // Process payment session creation
    const result = await createPaymentSession(
      supabaseAdmin,
      product,
      { secret_key: secretKey }, // Simple config object
      providerId,
      email,
      successUrl,
      cancelUrl
    )

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// Create payment session based on provider
async function createPaymentSession(
  supabaseAdmin: ReturnType<typeof createClient>,
  product: Product,
  providerConfig: ProviderConfig,
  providerId: string,
  email?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CreateCheckoutResponse> {
  
  if (providerId === 'stripe') {
    return await createStripeSession(
      supabaseAdmin,
      product,
      providerConfig,
      email,
      successUrl,
      cancelUrl
    )
  }
  
  // Future: Add support for other payment providers
  throw new Error(`Payment provider ${providerId} not yet supported`)
}

// Create Stripe checkout session
async function createStripeSession(
  supabaseAdmin: ReturnType<typeof createClient>,
  product: Product,
  _providerConfig: ProviderConfig, // Not used when using env vars
  email?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CreateCheckoutResponse> {
  
  // Get Stripe secret key from environment variables (secure)
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secretKey) {
    throw new Error('Stripe secret key not configured in environment')
  }

  // Initialize Stripe
  const stripe = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  })

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: {
            name: product.name,
            description: product.description || '',
          },
          unit_amount: Math.round(product.price * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl || `${Deno.env.get('SITE_URL')}/product.html?payment=success`,
    cancel_url: cancelUrl || `${Deno.env.get('SITE_URL')}/?product=${product.slug}`,
    customer_email: email,
    // Minimal metadata - only what's needed
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
    },
    // Let Stripe handle tax calculation, shipping, etc.
    automatic_tax: { enabled: false },
    // Expire session after 24 hours
    expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
  })

  if (!session.id || !session.url) {
    throw new Error('Failed to create Stripe checkout session')
  }

  // Store minimal session data in database
  const { error: sessionError } = await supabaseAdmin
    .from('payment_sessions')
    .insert({
      session_id: session.id,
      provider_type: 'stripe',
      product_id: product.id,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      customer_email: email || '',
      metadata: {
        success_url: successUrl,
        cancel_url: cancelUrl,
        product_slug: product.slug,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

  if (sessionError) {
    console.error('Error saving payment session:', sessionError)
    // Don't fail the request - session is created in Stripe
  }

  return {
    sessionId: session.id,
    checkout_url: session.url,
  }
}
