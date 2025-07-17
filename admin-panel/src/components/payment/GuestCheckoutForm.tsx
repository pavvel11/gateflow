// components/payment/GuestCheckoutForm.tsx
// Form for guest checkout with email collection

'use client';

import { useState } from 'react';
import { Loader2, CreditCard, Info } from 'lucide-react';
import { createCheckoutSession } from '@/lib/actions/payment';
import type { Product } from '@/types';

interface GuestCheckoutFormProps {
  product: Product;
  onSuccess?: (sessionId: string, checkoutUrl: string) => void;
  onError?: (error: string) => void;
}

export default function GuestCheckoutForm({ 
  product, 
  onSuccess, 
  onError 
}: GuestCheckoutFormProps) {
  const [email, setEmail] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await createCheckoutSession({
        productId: product.id,
        email: email,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/p/${product.slug}?payment=cancelled`,
      });

      if (onSuccess) {
        onSuccess(result.sessionId, result.checkoutUrl);
      } else {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Purchase
        </h2>
        <p className="text-gray-600 mt-1">
          Enter your email to purchase {product.name}
        </p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium">{product.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{product.description}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm">Price:</span>
              <span className="font-bold text-lg">
                {formatPrice(product.price, product.currency)}
              </span>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Account Creation Option */}
          <div className="flex items-center space-x-2">
            <input
              id="create-account"
              type="checkbox"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="create-account" className="text-sm text-gray-700">
              Create an account for easy access to your purchase
            </label>
          </div>

          {createAccount && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 mr-2" />
                <p className="text-xs text-blue-700">
                  We&apos;ll create an account for you and send activation instructions to your email after purchase.
                </p>
              </div>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <input
              id="terms"
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading || !email || !agreeToTerms}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay {formatPrice(product.price, product.currency)}
              </>
            )}
          </button>

          {/* Security Notice */}
          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 Secured by Stripe. Your payment information is encrypted and secure.
          </p>
        </form>
      </div>
    </div>
  );
}
