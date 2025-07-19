'use client';

import { useState, useEffect, useRef } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { embeddedCheckoutOptionsWithSecret } from '@/lib/stripe/config';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaidProductViewProps {
  product: Product;
}

export default function PaidProductView({ product }: PaidProductViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false); // Track if we've already fetched

  // Fetch client secret only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchClientSecret = async () => {
      // Prevent multiple calls
      if (hasFetched.current) {
        return;
      }
      
      hasFetched.current = true;
      
      try {
        const response = await fetch('/api/create-embedded-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            email: user?.email, // Optional for guests
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create checkout session');
        }

        const { clientSecret } = await response.json();
        
        if (isMounted) {
          setClientSecret(clientSecret);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize payment');
          setLoading(false);
        }
      }
    };

    // Add small delay to ensure parent component is stable
    const timeoutId = setTimeout(fetchClientSecret, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [product.id, user?.email]); // Keep dependencies but add delay

  const handlePaymentSuccess = () => {
    // Redirect to success page
    router.push(`/p/${product.slug}/payment-status`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
          <div className="flex">
            {/* Product Info */}
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
            
            {/* Loading Payment */}
            <div className="w-1/2 pl-8 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-white">Loading secure payment...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
          <div className="flex">
            {/* Product Info */}
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
            
            {/* Error */}
            <div className="w-1/2 pl-8">
              <div className="bg-red-800/50 border border-red-500/30 rounded-lg p-4 mb-4">
                <h2 className="text-white font-semibold mb-2">Payment Error</h2>
                <p className="text-red-200">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="flex">
          {/* Product Info */}
          <div className="w-1/2 pr-8 border-r border-white/10">
            <div className="flex items-center mb-6">
              <div className="text-5xl mr-6">{product.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{product.name}</h1>
                <p className="text-gray-300">{product.description}</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-6">
              {formatPrice(product.price, product.currency)} {product.currency}
            </div>
            {user && (
              <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                  Paying as: <span className="text-white font-medium">{user.email}</span>
                </p>
              </div>
            )}
          </div>
          
          {/* Embedded Checkout */}
          <div className="w-1/2 pl-8">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={embeddedCheckoutOptionsWithSecret(clientSecret, handlePaymentSuccess)}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
