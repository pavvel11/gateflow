'use client';

import { useCallback, useState, useEffect } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { signOutAndRedirectToCheckout } from '@/lib/actions/checkout';
import { useRouter } from 'next/navigation';
import { embeddedCheckoutOptions } from '@/lib/stripe/config';
import { useConfig } from '@/components/providers/config-provider';

interface PaidProductFormProps {
  product: Product;
}

export default function PaidProductForm({ product }: PaidProductFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const config = useConfig();
  const stripePromise = loadStripe(config.stripePublishableKey);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Handle sign out and redirect to checkout as guest
  const handleSignOutAndCheckout = async () => {
    try {
      await signOutAndRedirectToCheckout();
      // Reload the page to clear auth state and reload as guest
      window.location.reload();
    } catch {
      // Silent error handling - this is expected behavior for user action
    }
  };

  // Handle immediate redirect to product
  const handleRedirectToProduct = useCallback(() => {
    router.push(`/p/${product.slug}`);
  }, [product.slug, router]);

  // Countdown effect for auto-redirect
  useEffect(() => {
    if (hasAccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (hasAccess && countdown === 0) {
      handleRedirectToProduct();
    }
  }, [hasAccess, countdown, handleRedirectToProduct]);

  // Fetch client secret for Stripe checkout
  const fetchClientSecret = useCallback(async () => {
    try {
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
        
        // Special handling for already has access error
        if (errorData.error === 'You already have access to this product') {
          setHasAccess(true);
          return ''; // Return empty string to prevent checkout from loading
        }
        
        setError(errorData.error || 'Failed to create checkout session');
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      return data.clientSecret;
    } catch (err) {
      setError('Failed to load checkout. Please try again later.');
      throw err;
    }
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
      {/* User notification if logged in */}
      {user && (
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-300">Adres email</h3>
              <p className="text-white">{user.email}</p>
              <p className="text-gray-300 text-sm">Przypiszemy ten zakup do Twojego konta.</p>
            </div>
            <button
              onClick={handleSignOutAndCheckout}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Kup na inne konto
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Complete Your Purchase</h2>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-6 bg-gradient-to-r from-red-900/30 to-rose-900/30 border border-red-500/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-300 mb-1">Payment Error</h3>
                <p className="text-red-100/90 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Show success message if user already has access */}
        {hasAccess && (
          <div className="mb-4 p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-300 mb-1">Access Granted!</h3>
                  <p className="text-green-100/90 text-sm">
                    You already have access to this product.
                  </p>
                  <p className="text-green-200/70 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Auto-redirecting in {countdown} seconds...
                  </p>
                </div>
              </div>
              <button
                onClick={handleRedirectToProduct}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Go to Product
              </button>
            </div>
          </div>
        )}
        
        {/* Only show checkout if no error and user doesn't have access */}
        {!error && !hasAccess && (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={embeddedCheckoutOptions(fetchClientSecret)}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
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
