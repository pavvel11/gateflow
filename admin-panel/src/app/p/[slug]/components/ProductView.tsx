'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/constants';

interface ProductViewProps {
  product: Product;
}

export default function ProductView({ product }: ProductViewProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: null,
    text: '',
  });
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Handle magic link form submission for free products
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: 'info', text: 'Sending magic link...' });
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Set redirect URL with proper encoding of parameters to ensure they're preserved
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(`/auth/product-access?product=${product.slug}`)}`,
        },
      });
      
      if (error) {
        setMessage({ type: 'error', text: `Error: ${error.message}` });
      } else {
        setMessage({ type: 'success', text: 'Success! Check your email for the magic link.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle payment form submission for paid products
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: 'info', text: 'Redirecting to payment...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { slug: product.slug },
      });
      
      if (error) {
        setMessage({ type: 'error', text: `Error: ${error.message}` });
      } else if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
      {/* Background aurora effect */}
      <div 
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
        style={{
          animation: 'aurora 20s infinite linear',
        }}
      />
      
      <style jsx>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      
      <div className="flex w-full max-w-5xl bg-white/5 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden relative z-10">
        {/* Product Section */}
        <div className="p-12 w-1/2 flex flex-col justify-between border-r border-white/10">
          <div className="flex items-center">
            <div className="text-5xl mr-6">
              {product.icon}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white m-0">{product.name}</h3>
              <p className="text-gray-300 mt-1 mb-0">{product.description}</p>
            </div>
          </div>
          
          <div className="text-3xl font-bold text-white mt-5">
            {product.price === 0 ? 'FREE' : 
              `${formatPrice(product.price, product.currency)} ${product.currency}`}
          </div>
        </div>
        
        {/* Form Section */}
        <div className="p-12 w-1/2">
          {product.price === 0 ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Get your free product</h2>
              <p className="text-gray-400 mb-6">Enter your email below to receive a secure download link.</p>
              <form onSubmit={handleMagicLinkSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full bg-black/20 border border-white/10 text-white rounded-lg py-3 px-4 focus:bg-black/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Purchase Access</h2>
              <p className="text-gray-400 mb-6">Click below to proceed to a secure payment page.</p>
              <form onSubmit={handlePaymentSubmit}>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </form>
            </>
          )}
          
          {/* Message area */}
          {message.type && (
            <div 
              className={`mt-4 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-800/50 text-green-200 border border-green-500/30' :
                message.type === 'error' ? 'bg-red-800/50 text-red-200 border border-red-500/30' :
                'bg-blue-800/50 text-blue-200 border border-blue-500/30'
              }`}
            >
              {message.text}
            </div>
          )}
          
          <div className="text-center mt-6 text-xs text-gray-500">
            Secured by GateFlow
          </div>
        </div>
      </div>
    </div>
  );
}
