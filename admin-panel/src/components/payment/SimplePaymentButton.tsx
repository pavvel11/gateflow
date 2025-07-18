'use client';

import React, { useState } from 'react';
import type { Product } from '@/types';

interface SimplePaymentButtonProps {
  product: Product;
  userEmail?: string;
  onSuccess?: () => void;
}

export default function SimplePaymentButton({ 
  product, 
  userEmail
}: SimplePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          userEmail: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
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
      
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}
      
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Creating checkout...
          </div>
        ) : (
          `Pay ${product.price === 0 ? 'Free' : `$${(product.price / 100).toFixed(2)}`}`
        )}
      </button>
      
      <div className="text-center mt-4 text-xs text-gray-500">
        Secured by Stripe
      </div>
    </div>
  );
}
