/**
 * Payment verification utilities
 * 
 * SECURITY WARNING: This file contains server-side only code.
 * Contains Service Role keys and must never be executed in the browser.
 * Only use in Server Components and API Routes.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getStripeServer } from '@/lib/stripe/server';
import type { User } from '@supabase/supabase-js';

export interface PaymentVerificationResult {
  session_id: string;
  status: string;
  payment_status: string | null;
  customer_email?: string;
  amount_total?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  created?: number;
  expires_at?: number;
  access_granted?: boolean;
  already_had_access?: boolean;
  requires_login?: boolean;
  is_guest_purchase?: boolean;
  scenario?: string;
  access_expires_at?: string | null;
  send_magic_link?: boolean;
  error?: string;
}

export async function verifyPaymentSession(
  sessionId: string,
  user?: User | null
): Promise<PaymentVerificationResult> {
  // SECURITY: This function must only run on the server
  if (typeof window !== 'undefined') {
    throw new Error('verifyPaymentSession can only be called on the server');
  }

  // Validate input
  if (!sessionId || typeof sessionId !== 'string') {
    return {
      session_id: sessionId || 'invalid',
      status: 'error',
      payment_status: null,
      error: 'Invalid session ID'
    };
  }

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      session_id: sessionId,
      status: 'error',
      payment_status: null,
      error: 'Server configuration error'
    };
  }

  const stripe = getStripeServer();
  
  // Create Service Role client for secure operations
  const serviceClient = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    if (!session) {
      return {
        session_id: sessionId,
        status: 'not_found',
        payment_status: null,
        error: 'Session not found'
      };
    }

    // Check if session belongs to current user (only if user is logged in and session has valid user_id)
    if (user && session.metadata?.user_id && 
        session.metadata.user_id !== '' && 
        session.metadata.user_id !== 'null' && 
        session.metadata.user_id !== user.id) {
      return {
        session_id: session.id,
        status: session.status || 'unknown',
        payment_status: session.payment_status,
        error: 'Session does not belong to current user'
      };
    }

    // Base response
    const baseResponse: PaymentVerificationResult = {
      session_id: session.id,
      status: session.status || 'unknown',
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || undefined,
      amount_total: session.amount_total || undefined,
      currency: session.currency || undefined,
      metadata: session.metadata || undefined,
      created: session.created,
      expires_at: session.expires_at,
    };

    // If payment is complete, delegate to database function
    if (session.status === 'complete' && session.payment_status === 'paid') {
      const productId = session.metadata?.product_id;
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      if (productId && customerEmail) {
        try {
          // Validate email for disposable domains
          const { ProductValidationService } = await import('@/lib/services/product-validation');
          const isValidEmail = await ProductValidationService.validateEmail(customerEmail);
          if (!isValidEmail) {
            return {
              ...baseResponse,
              access_granted: false,
              error: 'Invalid email address detected. Temporary email addresses are not allowed for purchases. Please contact support for assistance.',
              scenario: 'email_validation_failed_server_side'
            };
          }
          
          // Extract payment intent ID
          const stripePaymentIntentId = typeof session.payment_intent === 'object'
            ? session.payment_intent?.id
            : session.payment_intent;

          // Extract bump product ID from metadata if present
          const bumpProductId = session.metadata?.bump_product_id || null;
          const hasBump = session.metadata?.has_bump === 'true';

          // Use new function that supports order bumps
          const rpcParams = {
            session_id_param: session.id,
            product_id_param: productId,
            customer_email_param: customerEmail,
            amount_total: session.amount_total || 0,
            currency_param: session.currency || 'usd',
            stripe_payment_intent_id: stripePaymentIntentId || null,
            user_id_param: user?.id || null,
            bump_product_id_param: hasBump && bumpProductId ? bumpProductId : null
          };
          
          console.log('Calling process_stripe_payment_completion_with_bump with:', JSON.stringify(rpcParams, null, 2));

          const { data: paymentResult, error: paymentError } = await serviceClient
            .rpc('process_stripe_payment_completion_with_bump', rpcParams);

          if (paymentResult) {
             console.log('Raw DB paymentResult:', JSON.stringify(paymentResult, null, 2));
          }

          if (paymentError) {
            console.error('Database payment processing error:', paymentError);
            return {
              ...baseResponse,
              access_granted: false,
              error: 'Failed to process payment'
            };
          }

          if (!paymentResult?.success) {
            return {
              ...baseResponse,
              access_granted: false,
              error: paymentResult?.error || 'Payment processing failed'
            };
          }

          // Convert database response to our interface
          return {
            ...baseResponse,
            access_granted: paymentResult.access_granted || false,
            already_had_access: paymentResult.already_had_access || false,
            requires_login: paymentResult.requires_login || false,
            is_guest_purchase: paymentResult.is_guest_purchase || false,
            scenario: paymentResult.scenario,
            access_expires_at: paymentResult.access_expires_at,
            send_magic_link: paymentResult.send_magic_link || false,
            customer_email: paymentResult.customer_email
          };

        } catch (error) {
          console.error('Payment processing error:', error);
          return {
            ...baseResponse,
            access_granted: false,
            error: 'Failed to process payment completion'
          };
        }
      }

      // Missing required data
      return {
        ...baseResponse,
        access_granted: false,
        error: !productId ? 'Product ID missing from session metadata' : 'Customer email missing from session'
      };
    }

    return baseResponse;

  } catch (error) {
    // Handle Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      if (stripeError.type === 'StripeInvalidRequestError') {
        return {
          session_id: sessionId,
          status: 'invalid',
          payment_status: null,
          error: 'Invalid session ID'
        };
      }
    }

    console.error('Payment verification error:', error);
    return {
      session_id: sessionId,
      status: 'error',
      payment_status: null,
      error: 'Payment verification failed'
    };
  }
}
