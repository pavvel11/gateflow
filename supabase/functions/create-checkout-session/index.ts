// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno'

// Initialize the Stripe client with the secret key from the environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
});

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slug } = await req.json()
    if (!slug) throw new Error('Product slug is required')

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('stripe_price_id')
      .eq('slug', slug)
      .single()

    if (error) throw error
    if (!product?.stripe_price_id) throw new Error('Stripe Price ID not found for product.')

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: product.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('SITE_URL')}/product.html?payment=success`,
      cancel_url: `${Deno.env.get('SITE_URL')}/?product=${slug}`,
      metadata: { product_slug: slug }, // Pass product slug to webhook
    })

    return new Response(JSON.stringify({ sessionId: session.id, checkout_url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
