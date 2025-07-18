'use client';

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface EmbeddedPaymentFormProps {
  product: Product;
  userEmail?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function EmbeddedPaymentForm({ 
  product, 
  userEmail,
  onSuccess,
  onError 
}: EmbeddedPaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/create-embedded-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          email: userEmail, // Optional - will be undefined for guests
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { client_secret } = await response.json();
      setClientSecret(client_secret);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [product.id, userEmail, onError]);

  // Auto-load checkout when component mounts
  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white mb-4">Complete your purchase</h2>
        
        {userEmail && (
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <p className="text-gray-300 text-sm">Paying as: <span className="text-white font-medium">{userEmail}</span></p>
          </div>
        )}
        
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-white">Initializing secure payment...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white mb-4">Payment Error</h2>
        <div className="bg-red-800/50 text-red-200 border border-red-500/30 rounded-lg p-4">
          <p>{error}</p>
        </div>
        <button
          onClick={fetchClientSecret}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-lg transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show embedded Stripe checkout
  if (clientSecret) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-white mb-4">Complete your purchase</h2>
        
        {userEmail && (
          <div className="bg-black/20 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-gray-300 text-sm">Paying as: <span className="text-white font-medium">{userEmail}</span></p>
          </div>
        )}
        
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ 
            clientSecret,
            onComplete: () => {
              onSuccess?.();
            }
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return null;
}
