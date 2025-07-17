// lib/stripe/client.ts
// Secure Stripe client configuration for React components

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Cache the Stripe promise to avoid creating multiple instances
let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe instance with publishable key from environment
 * This is safe to use on the client side as it only contains the publishable key
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};
