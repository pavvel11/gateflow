// lib/actions/payment.ts
// Secure Next.js 15 Server Actions for payment processing

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';
import { ProductValidationService } from '@/lib/services/product-validation';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import type { 
  CreateCheckoutSessionRequest, 
  CreateCheckoutSessionResponse,
  RefundRequest,
  RefundResponse
} from '@/types/payment';

/**
 * Create Stripe checkout session - Server Action with enhanced security
 * This function runs on the server and has access to secret keys
 */
export async function createCheckoutSession(
  data: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const supabase = await createClient();
  
  // Get authenticated user (optional - guests can also make purchases)
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
  
  // Input validation and sanitization
  if (!data.productId) {
    throw new Error('Product ID is required');
  }
  
  // Email is required for guest purchases
  if (!user && !data.email) {
    throw new Error('Email is required for guest purchases');
  }
  
  // Validate email format for guests
  if (!user && data.email && !ProductValidationService.validateEmail(data.email)) {
    throw new Error('Please enter a valid email address');
  }
  
  // Validate product and check user access
  const validationService = new ProductValidationService(supabase);
  const { product } = await validationService.validateForCheckout(data.productId, user);
  
  const stripe = getStripeServer();
  
  // Create secure Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: data.email || user?.email,
    payment_method_types: [...STRIPE_CONFIG.payment_method_types],
    mode: 'payment',
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
    success_url: data.successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: data.cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/p/${product.slug}?payment=cancelled`,
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      user_id: user?.id || '',
    },
    expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    automatic_tax: { enabled: false },
    billing_address_collection: 'auto',
  });
  
  if (!session.id || !session.url) {
    throw new Error('Failed to create checkout session');
  }
  
  // Store payment session in database for tracking
  await supabase
    .from('payment_sessions')
    .insert({
      session_id: session.id,
      provider_type: 'stripe',
      product_id: product.id,
      user_id: user?.id || null, // Nullable for guest purchases
      customer_email: data.email || user?.email || '',
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      metadata: {
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        product_slug: product.slug,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  
  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

/**
 * Process refund - Admin only Server Action
 */
export async function processRefund(data: RefundRequest): Promise<RefundResponse> {
  const supabase = await createClient();
  
  // Get authenticated user and check admin permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication required');
  }
  
  // Check if user is admin (you should implement your admin check logic)
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  if (adminError || !adminUser) {
    throw new Error('Admin access required');
  }
  
  // Get transaction details
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', data.transactionId)
    .eq('status', 'completed')
    .single();
  
  if (transactionError || !transaction) {
    throw new Error('Transaction not found or already refunded');
  }
  
  const stripe = getStripeServer();
  
  try {
    // Calculate refund amount
    const refundAmount = data.amount || transaction.amount;
    
    if (refundAmount > (transaction.amount - transaction.refunded_amount)) {
      throw new Error('Refund amount exceeds available amount');
    }
    
    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id!,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: (data.reason as 'duplicate' | 'fraudulent' | 'requested_by_customer') || 'requested_by_customer',
      metadata: {
        refunded_by: user.id,
        original_transaction_id: transaction.id,
      },
    });
    
    // Update transaction in database
    const newRefundedAmount = transaction.refunded_amount + refundAmount;
    const newStatus = newRefundedAmount >= transaction.amount ? 'refunded' : 'completed';
    
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        refunded_amount: newRefundedAmount,
        status: newStatus,
        refunded_at: new Date().toISOString(),
        refunded_by: user.id,
        refund_reason: data.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.transactionId);
    
    if (updateError) {
      throw new Error('Failed to update transaction status');
    }
    
    // If fully refunded, revoke product access
    if (newStatus === 'refunded') {
      await supabase
        .from('user_product_access')
        .delete()
        .eq('user_id', transaction.user_id)
        .eq('product_id', transaction.product_id);
    }
    
    // Revalidate admin pages
    revalidatePath('/dashboard/payments');
    revalidatePath('/dashboard/transactions');
    
    return {
      success: true,
      refundId: refund.id,
      amount: refundAmount,
      message: 'Refund processed successfully',
    };
    
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process refund',
    };
  }
}

/**
 * Check payment status and redirect if needed
 * Works for both authenticated and guest users
 */
export async function checkPaymentStatus(sessionId: string) {
  const supabase = await createClient();
  
  // Get session details
  const { data: session, error } = await supabase
    .from('payment_sessions')
    .select('*, products(slug)')
    .eq('session_id', sessionId)
    .single();
  
  if (error || !session) {
    redirect('/payment/error?reason=session_not_found');
  }
  
  if (session.status === 'completed') {
    // Redirect to product page with success message
    redirect(`/p/${session.products?.slug}?payment=success`);
  } else if (session.status === 'failed') {
    redirect('/payment/error?reason=payment_failed');
  } else if (session.status === 'cancelled') {
    redirect(`/p/${session.products?.slug}?payment=cancelled`);
  }
  
  // If still pending, show loading state or redirect to pending page
  redirect('/payment/pending');
}
