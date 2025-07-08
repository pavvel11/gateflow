// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEvent(body, signature!, endpointSecret)
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerEmail = session.customer_details?.email
    const productSlug = session.metadata?.product_slug // Get product slug from metadata

    if (customerEmail && productSlug) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Get user ID from email
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        email: customerEmail,
      });

      if (userError || !users || users.users.length === 0) {
        console.error("Stripe Webhook: User not found for email:", customerEmail);
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
      }
      const userId = users.users[0].id;

      // Insert access record
      const { error: insertError } = await supabaseAdmin
        .from('user_product_access')
        .insert({ user_id: userId, product_slug: productSlug });

      if (insertError && insertError.code !== '23505') { // 23505 is duplicate key error
        console.error("Stripe Webhook: Error inserting user product access:", insertError);
        return new Response(JSON.stringify({ error: "Error granting access" }), { status: 500 });
      }

      // Send a magic link to the customer (optional, but good for UX)
      await supabaseAdmin.auth.signInWithOtp({
        email: customerEmail,
        options: {
          emailRedirectTo: `${Deno.env.get('SITE_URL')}/protected-product.html?product=${productSlug}`,
        },
      })
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
