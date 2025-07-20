/**
 * Payment verification utilities
 * 
 * SECURITY WARNING: This file contains server-side only code.
 * Contains Service Role keys and must never be executed in the browser.
 * Only use in Server Components and API Routes.
 */

import { createClient } from '@/lib/supabase/server';
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      session_id: sessionId,
      status: 'error',
      payment_status: null,
      error: 'Server configuration error'
    };
  }

  const supabase = await createClient();
  const stripe = getStripeServer();
  
  // Create Service Role client for secure operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

    // Check if session belongs to current user (only if user is logged in)
    if (user && session.metadata?.user_id && session.metadata.user_id !== user.id) {
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

    // If payment is complete, save transaction and handle access
    if (session.status === 'complete' && session.payment_status === 'paid') {
      const productId = session.metadata?.product_id;
      const productSlug = session.metadata?.product_slug;
      
      if (productId && productSlug) {
        try {
          // Get product details
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, slug, auto_grant_duration_days, price, currency')
            .eq('id', productId)
            .single();

          if (productError || !product) {
            return {
              ...baseResponse,
              access_granted: false,
              error: 'Product not found'
            };
          }

          // STEP 1: Save payment transaction for audit trail (SECURE - uses Service Role)
          const transactionAmount = session.amount_total || 0;
          const customerEmail = session.customer_details?.email || session.customer_email;
          
          if (!customerEmail) {
            return {
              ...baseResponse,
              access_granted: false,
              error: 'No customer email found in session'
            };
          }

          // Save transaction (works for both logged-in and guest users)
          try {
            const { data: existingTransaction } = await serviceClient
              .from('payment_transactions')
              .select('id')
              .eq('session_id', session.id)
              .single();

            if (!existingTransaction) {
              await serviceClient
                .from('payment_transactions')
                .insert({
                  session_id: session.id,
                  user_id: user?.id || null, // Can be null for guest purchases
                  product_id: product.id,
                  customer_email: customerEmail,
                  amount: transactionAmount,
                  currency: product.currency,
                  stripe_payment_intent_id: typeof session.payment_intent === 'object' ? session.payment_intent?.id : session.payment_intent,
                  status: 'completed',
                  metadata: {
                    stripe_session_id: session.id,
                    product_slug: productSlug,
                    session_metadata: session.metadata,
                    amount_display: `${(transactionAmount / 100).toFixed(2)} ${(product.currency || 'usd').toUpperCase()}`
                  }
                });

            }
          } catch {
            // Don't fail the entire process if transaction saving fails
          }

          // STEP 2: Handle access granting based on user status
          
          // SCENARIO 1: User is logged in
          if (user) {
            // Check if access already exists
            const { data: existingAccess } = await supabase
              .from('user_product_access')
              .select('access_expires_at')
              .eq('user_id', user.id)
              .eq('product_id', productId)
              .single();

            if (existingAccess) {
              const expiresAt = existingAccess.access_expires_at 
                ? new Date(existingAccess.access_expires_at) 
                : null;
              const isExpired = expiresAt && expiresAt < new Date();
              
              if (!isExpired) {
                return {
                  ...baseResponse,
                  access_granted: true,
                  already_had_access: true,
                  scenario: 'logged_in_user'
                };
              }
            }

            // Calculate access expiry
            let accessExpiresAt: string | null = null;
            if (product.auto_grant_duration_days) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + product.auto_grant_duration_days);
              accessExpiresAt = expiryDate.toISOString();
            }

            // Grant access to logged-in user
            const { error: accessError } = await supabase
              .from('user_product_access')
              .upsert({
                user_id: user.id,
                product_id: productId,
                access_granted_at: new Date().toISOString(),
                access_expires_at: accessExpiresAt,
                access_duration_days: product.auto_grant_duration_days,
              }, {
                onConflict: 'user_id,product_id'
              });

            if (accessError) {
              return {
                ...baseResponse,
                access_granted: false,
                error: 'Failed to grant access'
              };
            }

            return {
              ...baseResponse,
              access_granted: true,
              already_had_access: false,
              access_expires_at: accessExpiresAt,
              scenario: 'logged_in_user'
            };
          }

          // SCENARIO 2 & 3: No current user - check if email exists in user database
          const { data: existingUser, error: userError } = await serviceClient
            .from('auth.users')
            .select('id, email')
            .eq('email', customerEmail)
            .single();

          if (!userError && existingUser) {
            // SCENARIO 2: Email exists in database - grant access to that user
            const { error } = await serviceClient.rpc('grant_product_access_service_role', {
              user_id_param: existingUser.id,
              product_id_param: product.id
            });

            if (error) {
              console.error('Failed to grant access to existing user:', error);
              return {
                ...baseResponse,
                access_granted: false,
                error: 'Failed to grant access to existing user'
              };
            }

            console.log('Granting access to existing user scenario - sending magic link');
            return {
              ...baseResponse,
              access_granted: true,
              requires_login: true,
              customer_email: customerEmail,
              scenario: 'existing_user_email',
              send_magic_link: true
            };
          }

          // SCENARIO 3: Email not in database - save as guest purchase
          const { error: guestError } = await serviceClient
            .from('guest_purchases')
            .insert({
              customer_email: customerEmail,
              product_id: product.id,
              session_id: session.id,
              transaction_amount: transactionAmount,
              claimed_by_user_id: null,
              access_expires_at: null
            });

          if (guestError) {
            // Check if it's a duplicate session_id error (already processed)
            if (guestError.code === '23505') {
              return {
                ...baseResponse,
                access_granted: false,
                is_guest_purchase: true,
                requires_login: true,
                customer_email: customerEmail,
                scenario: 'guest_purchase_duplicate',
                send_magic_link: true
              };
            }
            
            return {
              ...baseResponse,
              access_granted: false,
              error: 'Failed to save guest purchase'
            };
          }

          console.log('Guest purchase scenario - sending magic link');
          return {
            ...baseResponse,
            access_granted: false,
            is_guest_purchase: true,
            requires_login: true,
            customer_email: customerEmail,
            scenario: 'guest_purchase',
            send_magic_link: true
          };

        } catch {
          return {
            ...baseResponse,
            access_granted: false,
            error: 'Failed to process payment completion'
          };
        }
      }
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

    return {
      session_id: sessionId,
      status: 'error',
      payment_status: null,
      error: 'Payment verification failed'
    };
  }
}
