// app/api/webhooks/stripe/route.ts
// Secure Stripe webhook handler for Next.js 15

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/stripe/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature for security
    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      console.log('Event already processed:', event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Log the event for idempotency and audit trail
    await supabase
      .from('webhook_events')
      .insert({
        event_id: event.id,
        provider_type: 'stripe',
        event_type: event.type,
        event_data: {
          id: event.id,
          type: event.type,
          created: event.created,
        },
      });

    // Process different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleChargeDispute(supabase, event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle successful checkout session completion
async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  try {
    const customerEmail = session.customer_details?.email;
    const sessionId = session.id;

    if (!customerEmail || !sessionId) {
      console.error('Missing required session data: email or session ID');
      return;
    }

    // Use the database function to complete the payment transaction
    // This function will handle user creation if needed
    const { error } = await supabase.rpc('complete_payment_transaction', {
      session_id_param: sessionId,
      customer_email_param: customerEmail,
    });

    if (error) {
      console.error('Failed to complete payment transaction:', error);
      return;
    }

    console.log('Payment processed successfully for email:', customerEmail);
  } catch (error) {
    console.error('Error handling checkout session completion:', error);
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    // Update payment transaction with PaymentIntent ID
    await supabase
      .from('payment_transactions')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', paymentIntent.metadata?.checkout_session_id);

    console.log('PaymentIntent succeeded:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment intent success:', error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    // Update payment session status to failed
    await supabase
      .from('payment_sessions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', paymentIntent.metadata?.checkout_session_id);

    console.log('PaymentIntent failed:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment intent failure:', error);
  }
}

// Handle charge disputes
async function handleChargeDispute(
  supabase: SupabaseClient,
  dispute: Stripe.Dispute
) {
  try {
    // Find the transaction and mark as disputed
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('stripe_payment_intent_id', dispute.payment_intent)
      .single();

    if (transaction) {
      await supabase
        .from('payment_transactions')
        .update({
          status: 'disputed',
          metadata: {
            ...transaction.metadata,
            dispute_id: dispute.id,
            dispute_reason: dispute.reason,
            dispute_amount: dispute.amount,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      console.log('Charge disputed:', dispute.id);
    }
  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
}
