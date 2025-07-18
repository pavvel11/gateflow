// components/payment/PaymentButton.tsx
// Payment button with email input for guest checkout

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createCheckoutSession } from '@/lib/actions/payment';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types';

interface PaymentButtonProps {
  product: Product;
  className?: string;
  successUrl?: string;
  cancelUrl?: string;
  children?: React.ReactNode;
}

export default function PaymentButton({ 
  product, 
  className = '',
  successUrl,
  cancelUrl,
  children 
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const { addToast } = useToast();
  const { user } = useAuth();
  const t = useTranslations('productView.guestCheckout');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePayment = async () => {
    if (isLoading) return;

    // Validate email for guest checkout
    if (!user && !email) {
      setEmailError(t('emailRequired'));
      return;
    }

    if (!user && email && !validateEmail(email)) {
      setEmailError(t('emailInvalid'));
      return;
    }

    setEmailError('');
    setIsLoading(true);

    try {
      // Create checkout session using Server Action
      const result = await createCheckoutSession({
        productId: product.id,
        email: user ? undefined : email, // Only send email for guest checkout
        successUrl,
        cancelUrl,
      });

      // Redirect to Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start payment process';
      addToast(errorMessage, 'error');
      setIsLoading(false);
    }
  };

  const defaultClassName = `
    w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
    text-white font-semibold py-3 px-6 rounded-lg 
    transition-colors duration-200 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}
  `;

  // Show email form for guest checkout
  if (!user) {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="guest-email" className="block text-sm font-medium text-gray-300 mb-2">
            {t('emailLabel')}
          </label>
          <input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            placeholder={t('emailPlaceholder')}
            className={`
              w-full px-4 py-3 bg-gray-800 border rounded-lg text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${emailError ? 'border-red-500' : 'border-gray-600'}
            `}
            disabled={isLoading}
            autoComplete="email"
          />
          {emailError && (
            <p className="mt-2 text-sm text-red-400">{emailError}</p>
          )}
        </div>
        
        <button
          onClick={handlePayment}
          disabled={isLoading || !email}
          className={className || defaultClassName}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `${t('continueToPayment')} - ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency,
            }).format(product.price)}`
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={isLoading}
      className={className || defaultClassName}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        children || (
          <span>
            Buy Now - {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency,
            }).format(product.price)}
          </span>
        )
      )}
    </button>
  );
}
