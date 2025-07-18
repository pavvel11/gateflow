// lib/stripe/server.ts
// Secure Stripe server configuration for Next.js Server Actions and API routes

import Stripe from 'stripe';

let stripe: Stripe | null = null;

/**
 * Get Stripe instance with secret key from environment
 * Only for use in server-side code (Server Actions, API routes)
 */
export const getStripeServer = (): Stripe => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    
    stripe = new Stripe(secretKey, {
      // Use default API version for this Stripe SDK
      typescript: true,
    });
  }
  
  return stripe;
};

/**
 * Verify webhook signature for security
 */
export const verifyWebhookSignature = (
  body: string | Buffer,
  signature: string
): Stripe.Event => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  
  return getStripeServer().webhooks.constructEvent(body, signature, webhookSecret);
};
