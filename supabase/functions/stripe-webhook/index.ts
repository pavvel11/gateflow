// supabase/functions/stripe-webhook/index.ts
// Minimal, secure Stripe webhook handler
// Maximally leverages Stripe mechanisms for security

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@10.17.0?target=deno'

// Types for type safety
interface PaymentSession {
  id: string
  session_id: string
  product_id: string
  amount: number
  currency: string
  customer_email: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  metadata: Record<string, unknown>
}

interface WebhookEvent {
  event_id: string
  provider_type: string
  event_type: string
  event_data: Record<string, unknown>
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Validate content type
  const contentType = req.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return new Response('Invalid content type', { status: 400 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()
  if (!body) {
    return new Response('Empty request body', { status: 400 })
  }

  try {
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

    // Get Stripe configuration from environment variables (secure)
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!secretKey || !webhookSecret) {
      console.error('Missing required Stripe environment variables')
      return new Response('Payment provider not configured', { status: 500 })
    }

    // Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16', // Updated to latest stable API version
    })

    // Verify webhook signature (this is the critical security step)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      console.log('Event already processed:', event.id)
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
    }

    // Log the event for idempotency
    await supabaseAdmin
      .from('webhook_events')
      .insert({
        event_id: event.id,
        provider_type: 'stripe',
        event_type: event.type,
        event_data: { 
          id: event.id,
          type: event.type,
          created: event.created
        }
      })

    // Process only checkout.session.completed events
    if (event.type === 'checkout.session.completed') {
      await processCheckoutSessionCompleted(supabaseAdmin, event.data.object as Stripe.Checkout.Session)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})

// Process successful checkout session
async function processCheckoutSessionCompleted(
  supabaseAdmin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
) {
  try {
    const customerEmail = session.customer_details?.email
    const sessionId = session.id
    
    if (!customerEmail || !sessionId) {
      console.error('Missing required session data')
      return
    }

    // Find the payment session in our database
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .single()

    if (sessionError || !paymentSession) {
      console.error('Payment session not found:', sessionId)
      return
    }

    // Get user by email using listUsers with email filter
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return
    }

    const user = users.users.find(u => u.email === customerEmail)
    let userId = user?.id

    // If user doesn't exist, create them (this is safe because Stripe verified the email)
    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true, // Email is verified by Stripe
        user_metadata: {
          created_via: 'stripe_payment'
        }
      })
      
      if (createError) {
        console.error('Failed to create user:', createError)
        return
      }
      
      userId = newUser.user.id
    }

    if (!userId) {
      console.error('Unable to get or create user ID')
      return
    }

    // Use database transaction for atomicity
    const { error: transactionError } = await supabaseAdmin.rpc('complete_payment_transaction', {
      session_id_param: sessionId,
      user_id_param: userId,
      customer_email_param: customerEmail
    })

    if (transactionError) {
      console.error('Transaction failed:', transactionError)
      return
    }

    console.log('Payment processed successfully for user:', userId)
  } catch (error) {
    console.error('Error processing checkout session:', error)
  }
}
