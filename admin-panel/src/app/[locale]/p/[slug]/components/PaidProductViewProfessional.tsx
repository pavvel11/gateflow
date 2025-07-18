'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckoutErrorType } from '@/types/checkout';

// Create Stripe promise outside component to avoid recreation
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaidProductViewProps {
  product: Product;
}

enum CheckoutState {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

interface CheckoutError {
  message: string;
  type: CheckoutErrorType;
}

export default function PaidProductViewProfessional({ product }: PaidProductViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [state, setState] = useState<CheckoutState>(CheckoutState.IDLE);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<number>(0);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  // Memoize checkout request to prevent unnecessary re-renders
  const checkoutRequest = useMemo(() => {
    return {
      productId: product.id,
      email: user?.email,
    };
  }, [product.id, user]);

  const initializeCheckout = useCallback(async () => {
    if (!mountedRef.current || initializingRef.current) return;

    try {
      initializingRef.current = true;
      
      setState(CheckoutState.LOADING);
      setError(null);
      setClientSecret(null); // Clear previous client secret

      const response = await fetch('/api/create-embedded-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutRequest),
      });

      if (!mountedRef.current) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      setClientSecret(data.clientSecret);
      setState(CheckoutState.READY);
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError({ 
        message: errorMessage, 
        type: CheckoutErrorType.UNKNOWN_ERROR 
      });
      setState(CheckoutState.ERROR);
    } finally {
      initializingRef.current = false;
    }
  }, [checkoutRequest]);

  // Initialize checkout on mount
  useEffect(() => {
    if (state === CheckoutState.IDLE && !initializingRef.current) {
      initializeCheckout();
    }
  }, [state, initializeCheckout]);

  // Handle component mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      initializingRef.current = false;
    };
  }, []);

  const handleRetry = useCallback(() => {
    initializingRef.current = false;
    setState(CheckoutState.IDLE);
    setError(null);
    setClientSecret(null);
    setCheckoutKey(prev => prev + 1);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    router.push(`/p/${product.slug}/payment-status`);
  }, [router, product.slug]);

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

  const renderLoadingState = () => (
    <div className="w-1/2 pl-8 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Loading secure payment...</p>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="w-1/2 pl-8 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <p className="text-red-300 mb-4">{error?.message}</p>
        <button
          onClick={handleRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderCheckoutForm = () => (
    <div className="w-1/2 pl-8">
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Complete Your Purchase</h2>
        {clientSecret && (
          <EmbeddedCheckoutProvider
            key={`${clientSecret}-${checkoutKey}`} // Unique key for each checkout instance
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: handlePaymentSuccess,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );

  const renderPaymentSection = () => {
    switch (state) {
      case CheckoutState.LOADING:
        return renderLoadingState();
      case CheckoutState.ERROR:
        return renderErrorState();
      case CheckoutState.READY:
        return renderCheckoutForm();
      default:
        return renderLoadingState();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="flex">
          {renderProductInfo()}
          {renderPaymentSection()}
        </div>
      </div>
    </div>
  );
}
