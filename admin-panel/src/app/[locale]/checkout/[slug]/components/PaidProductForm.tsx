'use client';

import { useCallback } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

// Create Stripe promise outside component to avoid recreation
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaidProductFormProps {
  product: Product;
}

export default function PaidProductForm({ product }: PaidProductFormProps) {
  const { user } = useAuth();

  // Fetch client secret for Stripe checkout
  const fetchClientSecret = useCallback(async () => {
    const response = await fetch('/api/create-embedded-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        email: user?.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.clientSecret;
  }, [product.id, user?.email]);

  const renderProductInfo = () => (
    <div className="w-1/2 pr-8 border-r border-white/10">
      <div className="flex items-center mb-6">
        <div className="text-5xl mr-6">{product.icon}</div>
        <div>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          <p className="text-gray-300">{product.description}</p>
        </div>
      </div>
      <div className="text-3xl font-bold text-white">
        {formatPrice(product.price, product.currency)} {product.currency}
      </div>
    </div>
  );

  const renderCheckoutForm = () => (
    <div className="w-1/2 pl-8">
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Complete Your Purchase</h2>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="flex">
          {renderProductInfo()}
          {renderCheckoutForm()}
        </div>
      </div>
    </div>
  );
}
