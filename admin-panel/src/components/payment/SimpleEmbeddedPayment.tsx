'use client';

import React, { useRef, useEffect } from 'react';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Product } from '@/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Global flag to prevent multiple instances
let isEmbeddedCheckoutActive = false;

interface SimpleEmbeddedPaymentProps {
  product: Product;
  userEmail?: string;
  onSuccess?: () => void;
}

export default function SimpleEmbeddedPayment({ 
  product, 
  userEmail,
  onSuccess 
}: SimpleEmbeddedPaymentProps) {
  const hasInitialized = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    if (isEmbeddedCheckoutActive) {
      return;
    }
    
    hasInitialized.current = true;
    isEmbeddedCheckoutActive = true;

    return () => {
      isEmbeddedCheckoutActive = false;
      hasInitialized.current = false;
    };
  }, []);

  // If another instance is active, show loading
  if (isEmbeddedCheckoutActive && !hasInitialized.current) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-white mb-4">Complete your purchase</h2>
        
        {userEmail && (
          <div className="bg-black/20 border border-white/10 rounded-lg p-4 mb-4">
            <p className="text-gray-300 text-sm">
              Paying as: <span className="text-white font-medium">{userEmail}</span>
            </p>
          </div>
        )}
        
        <div className="bg-black/20 border border-white/10 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing payment...</p>
        </div>
      </div>
    );
  }

  // Fetch client secret function - exactly like in Stripe docs
  const fetchClientSecret = async () => {
    const response = await fetch('/api/create-embedded-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: product.id,
        userEmail: userEmail,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    return data.clientSecret;
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-white mb-4">Complete your purchase</h2>
      
      {userEmail && (
        <div className="bg-black/20 border border-white/10 rounded-lg p-4 mb-4">
          <p className="text-gray-300 text-sm">
            Paying as: <span className="text-white font-medium">{userEmail}</span>
          </p>
        </div>
      )}
      
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ 
          fetchClientSecret,
          onComplete: () => {
            isEmbeddedCheckoutActive = false;
            onSuccess?.();
          }
        }}
        key={`checkout-${product.id}`}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}