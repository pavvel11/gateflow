'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/client';
import { useToast } from '@/contexts/ToastContext';
import { elementsOptions } from '@/lib/stripe/config';
import type { Product } from '@/types';

interface StripePaymentFormProps {
  product: Product;
  clientSecret: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface CheckoutFormProps {
  product: Product;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Inner form component that uses Stripe hooks
function CheckoutForm({ product, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?product=${product.slug}`,
        },
        redirect: 'if_required', // Stay on page if no redirect needed
      });

      if (error) {
        // Payment failed
        const errorMessage = error.message || 'Payment failed. Please try again.';
        addToast(errorMessage, 'error');
        onError?.(errorMessage);
      } else {
        // Payment succeeded
        addToast('Payment successful! Redirecting...', 'success');
        onSuccess?.();
        
        // Redirect to product page with success parameter
        router.push(`/p/${product.slug}?payment=success`);
      }
    } catch {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      addToast(errorMessage, 'error');
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
        <div className="flex justify-between items-center">
          <span>{product.name}</span>
          <span className="font-semibold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency,
            }).format(product.price)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
          `Pay ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: product.currency,
          }).format(product.price)}`
        )}
      </button>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Your payment is secured by Stripe. We never store your payment information.
      </p>
    </form>
  );
}

// Main component that provides Elements context
export default function StripePaymentForm({ 
  product, 
  clientSecret, 
  onSuccess, 
  onError 
}: StripePaymentFormProps) {
  const stripePromise = getStripe();

  const options = elementsOptions(clientSecret);

  return (
    <div className="max-w-md mx-auto">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          product={product} 
          onSuccess={onSuccess} 
          onError={onError} 
        />
      </Elements>
    </div>
  );
}
