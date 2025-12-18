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
import { useOrderBumps } from '@/hooks/useOrderBumps';

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

  // Order bump state
  const { orderBump } = useOrderBumps(product.id);
  const [bumpSelected, setBumpSelected] = useState(false);

  // Check if currency matches (Stripe requires same currency for all line items)
  const isCurrencyMatching = orderBump && product.currency.toLowerCase() === orderBump.bump_currency.toLowerCase();

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

  // Handle immediate redirect to product or dashboard
  const handleRedirectToProduct = useCallback(() => {
    if (bumpSelected) {
      router.push('/my-products');
    } else {
      router.push(`/p/${product.slug}`);
    }
  }, [product.slug, router, bumpSelected]);

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
          bumpProductId: bumpSelected && orderBump ? orderBump.bump_product_id : undefined,
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
  }, [product.id, user?.email, bumpSelected, orderBump]);

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

      {/* Order Bump - special offer */}
      {orderBump && isCurrencyMatching && !hasAccess && !error && (
        <div 
          onClick={() => setBumpSelected(!bumpSelected)}
          className={`
            relative mb-6 group cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ease-out
            ${bumpSelected 
              ? 'border-amber-400/50 bg-amber-950/20 shadow-[0_0_40px_-10px_rgba(251,191,36,0.15)]' 
              : 'border-white/10 bg-white/5 hover:border-amber-400/30 hover:bg-white/10'}
          `}
        >
          {/* Glow effects */}
          <div className={`absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl transition-opacity duration-500 ${bumpSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
          
          <div className="relative p-5 flex items-start gap-4">
            {/* Custom Checkbox */}
            <div className={`
              mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
              ${bumpSelected 
                ? 'border-amber-400 bg-amber-400 text-slate-900 scale-110' 
                : 'border-white/30 group-hover:border-amber-400/50 bg-white/5'}
            `}>
              <svg className={`w-4 h-4 transition-transform duration-300 ${bumpSelected ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  {orderBump.bump_product_icon && (
                    <span className="text-2xl">{orderBump.bump_product_icon}</span>
                  )}
                  <div>
                    <h3 className={`text-lg font-bold transition-colors ${bumpSelected ? 'text-amber-100' : 'text-white group-hover:text-amber-50'}`}>
                      {orderBump.bump_title}
                    </h3>
                    
                    {/* Duration Badge */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                        ${bumpSelected 
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/20' 
                          : 'bg-white/5 text-gray-400 border-white/10 group-hover:border-amber-400/10'}
                      `}>
                        {orderBump.bump_access_duration && orderBump.bump_access_duration > 0 ? (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {orderBump.bump_access_duration} Days Access
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Lifetime Access
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="text-left sm:text-right mt-2 sm:mt-0 bg-black/20 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                  {orderBump.original_price > orderBump.bump_price && (
                    <div className="text-xs text-gray-400 line-through decoration-gray-500 mb-0.5">
                      {formatPrice(orderBump.original_price, orderBump.bump_currency)} {orderBump.bump_currency}
                    </div>
                  )}
                  <div className="text-xl font-black text-amber-400 leading-none tracking-tight filter drop-shadow-lg">
                    {formatPrice(orderBump.bump_price, orderBump.bump_currency)} {orderBump.bump_currency}
                  </div>
                  {orderBump.original_price > orderBump.bump_price && (
                    <div className="text-[10px] font-bold text-green-400 mt-1 uppercase tracking-wide">
                      Save {formatPrice(orderBump.original_price - orderBump.bump_price, orderBump.bump_currency)}
                    </div>
                  )}
                </div>
              </div>

              {orderBump.bump_description && (
                <p className={`text-sm leading-relaxed transition-colors ${bumpSelected ? 'text-amber-100/80' : 'text-gray-400 group-hover:text-gray-300'}`}>
                  {orderBump.bump_description}
                </p>
              )}
            </div>
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
            key={`${product.id}-${bumpSelected}`}
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
