'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import AccessGrantedView from './AccessGrantedView';
import Confetti from 'react-confetti';

interface ProductViewProps {
  product: Product;
}

export default function ProductView({ product }: ProductViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: null,
    text: '',
  });
  
  // Initialize Supabase client
  const supabase = createClient();

  // Set window dimensions for confetti
  useEffect(() => {
    const { innerWidth, innerHeight } = window;
    setDimensions({ width: innerWidth, height: innerHeight });

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if user has access to the product on initial load
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_product_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking access:', error);
        }

        if (data) {
          setHasAccess(true);
          setShowFullContent(true); // User already had access, so show content directly
        }
      } catch (err) {
        console.error('Error in checkUserAccess:', err);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkUserAccess();
  }, [user, product.id, supabase]);
  
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
  
  // Start countdown timer when access is granted
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (hasAccess && !showFullContent && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (hasAccess && countdown === 0 && !showFullContent) {
      setShowFullContent(true);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hasAccess, countdown, showFullContent]);
  
  // Handle free access for logged-in users
  const requestFreeAccess = async () => {
    try {
      setLoading(true);
      
      // First check if user already has access
      const { data: existingAccess } = await supabase
        .from('user_product_access')
        .select('id')
        .eq('user_id', user?.id)
        .eq('product_id', product.id)
        .single();

      if (existingAccess) {
        addToast('You already have access to this product!', 'info');
        setHasAccess(true);
        return;
      }

      const { error } = await supabase
        .from('user_product_access')
        .insert([{
          user_id: user?.id,
          product_id: product.id,
        }]);

      if (error) {
        console.error('Error requesting access:', error);
        if (error.code === '23505') {
          addToast('You already have access to this product!', 'info');
          setHasAccess(true);
        } else {
          addToast('Failed to request access. Please try again.', 'error');
        }
        return;
      }

      addToast('Access granted successfully!', 'success');
      setHasAccess(true); // Update local state to show countdown
      setCountdown(3); // Reset countdown to 3 seconds
      setShowFullContent(false); // Make sure full content is not shown yet to trigger countdown
    } catch (err) {
      console.error('Error in requestFreeAccess:', err);
      addToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // The main layout for the product purchase/access view
  const ProductActionLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
      <div 
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
        style={{ animation: 'aurora 20s infinite linear' }}
      />
      <style jsx>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="flex w-full max-w-5xl bg-white/5 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden relative z-10">
        {/* Product Details Section */}
        <div className="p-12 w-1/2 flex flex-col justify-between border-r border-white/10">
          <div>
            <div className="flex items-center">
              <div className="text-5xl mr-6">{product.icon}</div>
              <div>
                <h3 className="text-2xl font-semibold text-white m-0">{product.name}</h3>
                <p className="text-gray-300 mt-1 mb-0">{product.description}</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-5">
            {product.price === 0 ? 'FREE' : `${formatPrice(product.price, product.currency)} ${product.currency}`}
          </div>
        </div>
        
        {/* Action/Form Section */}
        <div className="p-12 w-1/2">
          {children}
        </div>
      </div>
    </div>
  );

  // View 1: Checking access state
  if (checkingAccess) {
    return (
      <ProductActionLayout>
        <h2 className="text-2xl font-semibold text-white mb-2">Loading...</h2>
        <p className="text-gray-400 mb-6">Checking your access to this product...</p>
        <div className="w-full bg-gray-600 rounded-lg py-3.5 px-4 text-center text-white animate-pulse">
          Checking access...
        </div>
      </ProductActionLayout>
    );
  }

  // View 2: User has access
  if (hasAccess) {
    // View 2a: Show the full content after countdown or if access was pre-existing
    if (showFullContent) {
      return <AccessGrantedView product={product} />;
    }
    
    // View 2b: Show the countdown and confetti because access was just granted
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={800}
          gravity={0.25}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: 5 }}
        />
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
          style={{ animation: 'aurora 20s infinite linear' }}
        />
        <style jsx>{`
          @keyframes aurora {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-2">Access Granted!</h2>
          <p className="text-gray-300 mb-6">You now have full access to {product.name}.</p>
          <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
          <p className="text-gray-400 mt-2">Loading content...</p>
        </div>
      </div>
    );
  }

  // View 3: User does not have access yet
  
  // Check if product is inactive - show special message
  if (!product.is_active) {
    return (
      <ProductActionLayout>
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Product No Longer Available</h2>
          <p className="text-gray-400 mb-6">
            This product is no longer available for new customers.
          </p>
          <div className="bg-yellow-800/30 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
            <p className="text-sm">
              If you previously had access to this product, please log in to view your content.
            </p>
          </div>
        </div>
      </ProductActionLayout>
    );
  }

  return (
    <ProductActionLayout>
      {product.price === 0 ? (
        // View 3a: Free product flow
        user ? (
          // Logged in, but no access
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">Get your free product</h2>
            <p className="text-gray-400 mb-6">Click below to get instant access to this free product.</p>
            <button
              onClick={requestFreeAccess}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Getting Access...' : 'Get Instant Access'}
            </button>
          </>
        ) : (
          // Not logged in
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
        )
      ) : (
        // View 3b: Paid product flow
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
    </ProductActionLayout>
  );
}
