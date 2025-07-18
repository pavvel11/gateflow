'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import EmbeddedCheckoutComponent from '@/components/payment/EmbeddedCheckout';

interface PaidProductViewProps {
  product: Product;
}

export default function PaidProductView({ product }: PaidProductViewProps) {
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStartCheckout = () => {
    if (!user) {
      // Guest checkout - validate email
      if (!guestEmail) {
        setEmailError('Email is required for guest checkout');
        return;
      }
      if (!validateEmail(guestEmail)) {
        setEmailError('Please enter a valid email address');
        return;
      }
    }
    
    setEmailError('');
    setShowCheckout(true);
  };

  const renderProductInfo = () => (
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
      
      {/* Product features or benefits */}
      <div className="space-y-3">
        <div className="flex items-center text-green-400">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-300">Instant access after purchase</span>
        </div>
        <div className="flex items-center text-green-400">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-300">Secure payment processing</span>
        </div>
        <div className="flex items-center text-green-400">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-300">Money-back guarantee</span>
        </div>
      </div>
    </div>
  );

  const renderGuestEmailForm = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="guest-email" className="block text-sm font-medium text-gray-300 mb-2">
          Email Address
        </label>
        <input
          id="guest-email"
          type="email"
          value={guestEmail}
          onChange={(e) => {
            setGuestEmail(e.target.value);
            setEmailError('');
          }}
          placeholder="Enter your email address"
          className={`
            w-full px-4 py-3 bg-gray-800 border rounded-lg text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${emailError ? 'border-red-500' : 'border-gray-600'}
          `}
          autoComplete="email"
        />
        {emailError && (
          <p className="mt-2 text-sm text-red-400">{emailError}</p>
        )}
      </div>
      
      <button
        onClick={handleStartCheckout}
        disabled={!guestEmail}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        Continue to Payment
      </button>
      
      <p className="text-xs text-gray-400 text-center">
        We&apos;ll send your purchase confirmation to this email address
      </p>
    </div>
  );

  const renderLoggedInCheckout = () => (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Purchasing as:</span>
          <span className="text-white font-medium">{user?.email}</span>
        </div>
      </div>
      
      <button
        onClick={handleStartCheckout}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        Continue to Payment
      </button>
    </div>
  );

  const renderPaymentSection = () => {
    if (showCheckout) {
      return <EmbeddedCheckoutComponent product={product} email={guestEmail} />;
    }

    return (
      <div className="w-1/2 pl-8">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Get Instant Access</h2>
          
          {user ? renderLoggedInCheckout() : renderGuestEmailForm()}
        </div>
      </div>
    );
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
