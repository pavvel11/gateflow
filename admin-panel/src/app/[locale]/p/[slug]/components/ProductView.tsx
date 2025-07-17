'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import PaymentButton from '@/components/payment/PaymentButton';
import SecureAccessGrantedView from './SecureAccessGrantedView';
import ProductAvailabilityBanner from './ProductAvailabilityBanner';
import Confetti from 'react-confetti';

interface ProductViewProps {
  product: Product;
}

interface AccessResponse {
  hasAccess: boolean;
  reason?: 'no_access' | 'expired' | 'inactive' | 'temporal';
  userAccess?: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  };
  product?: {
    name: string;
    slug: string;
    price: number;
    available_from?: string;
    available_until?: string;
  };
}

export default function ProductView({ product }: ProductViewProps) {
  const t = useTranslations('productView');
  const { user } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [userAccess, setUserAccess] = useState<{
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: null,
    text: '',
  });

  // Helper function to get return_url from URL parameters
  const getReturnUrl = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('return_url');
  }, []);

  // Helper function to handle redirect to return_url
  const handleReturnUrlRedirect = useCallback(() => {
    const returnUrl = getReturnUrl();
    if (returnUrl) {
      try {
        // Decode the return URL and redirect
        const decodedUrl = decodeURIComponent(returnUrl);
        console.log('Redirecting to return_url:', decodedUrl);
        window.location.href = decodedUrl;
        return true; // Indicate that redirect is happening
      } catch (error) {
        console.error('Error redirecting to return_url:', error);
      }
    }
    return false; // No redirect happened
  }, [getReturnUrl]);

  // Check temporal availability
  const checkTemporalAvailability = () => {
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isNotYetAvailable = availableFrom && availableFrom > now;
    const isExpired = availableUntil && availableUntil < now;
    
    return {
      isTemporallyAvailable: (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now),
      isNotYetAvailable,
      isExpired
    };
  };

  const temporalStatus = checkTemporalAvailability();

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
        const response = await fetch(`/api/public/products/${product.slug}/access`);
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, redirect to login
            window.location.href = '/login';
            return;
          }
          console.error('Error checking access:', response.statusText);
          setCheckingAccess(false);
          return;
        }

        const data: AccessResponse = await response.json();
        
        if (data.hasAccess) {
          setHasAccess(true);
          setUserAccess(data.userAccess || null);
          
          // Check if we should redirect to return_url for existing access
          const redirected = handleReturnUrlRedirect();
          if (!redirected) {
            // No redirect, show full content directly
            setShowFullContent(true);
          }
        } else {
          setHasAccess(false);
          setUserAccess(null);
          setShowFullContent(false);
          // Handle different access denial reasons if needed
        }
      } catch (err) {
        console.error('Error in checkUserAccess:', err);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkUserAccess();
  }, [user, product.slug, handleReturnUrlRedirect]);
  
  // Handle magic link form submission for free products
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: 'info', text: t('sendingMagicLink') });
    
    try {
      // Import supabase client for auth operations
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get current return_url from URL parameters
      const returnUrl = getReturnUrl();
      
      // Build redirect URL with return_url preserved
      let redirectUrl = `/auth/product-access?product=${product.slug}`;
      if (returnUrl) {
        redirectUrl += `&return_url=${encodeURIComponent(returnUrl)}`;
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Set redirect URL with proper encoding of parameters to ensure they're preserved
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectUrl)}`,
        },
      });
      
      if (error) {
        setMessage({ type: 'error', text: t('error', { message: error.message }) });
      } else {
        setMessage({ type: 'success', text: t('checkEmailForMagicLink') });
      }
    } catch {
      setMessage({ type: 'error', text: t('unexpectedError') });
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
      // Check if we should redirect to return_url
      const redirected = handleReturnUrlRedirect();
      if (!redirected) {
        // No redirect, show full content
        setShowFullContent(true);
      }
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hasAccess, countdown, showFullContent, handleReturnUrlRedirect]);
  
  // Handle free access for logged-in users
  const requestFreeAccess = async () => {
    try {
      setLoading(true);
      
      // Grant access via API
      const response = await fetch(`/api/public/products/${product.slug}/grant-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          addToast('Please log in to access this product', 'error');
          return;
        }
        addToast(errorData.error || 'Failed to request access. Please try again.', 'error');
        return;
      }

      const data = await response.json();
      
      if (data.alreadyHadAccess) {
        addToast('You already have access to this product!', 'info');
        setHasAccess(true);
        return;
      }

      addToast(data.message || 'Access granted successfully!', 'success');
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
            {product.price === 0 ? t('free') : `${formatPrice(product.price, product.currency)} ${product.currency}`}
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
        <h2 className="text-2xl font-semibold text-white mb-2">{t('loading')}</h2>
        <p className="text-gray-400 mb-6">{t('checkingAccess')}</p>
        <div className="w-full bg-gray-600 rounded-lg py-3.5 px-4 text-center text-white animate-pulse">
          {t('checkingAccessButton')}
        </div>
      </ProductActionLayout>
    );
  }

  // View 2: User has access
  if (hasAccess) {
    // Double check if access is still valid before showing content
    const now = new Date();
    const expiresAt = userAccess?.access_expires_at ? new Date(userAccess.access_expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;
    
    if (isExpired) {
      // Access has expired, reset states and show purchase form
      setHasAccess(false);
      setUserAccess(null);
      setShowFullContent(false);
      // Fall through to show purchase form
    } else {
      // View 2a: Show the full content after countdown or if access was pre-existing
      if (showFullContent) {
        return <SecureAccessGrantedView product={product} userAccess={userAccess} />;
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
            <h2 className="text-3xl font-bold text-white mb-2">{t('accessGranted')}</h2>
            <p className="text-gray-300 mb-6">{t('accessGrantedMessage', { productName: product.name })}</p>
            <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
            <p className="text-gray-400 mt-2">{t('loadingContent')}</p>
          </div>
        </div>
      );
    }
  }

  // View 3: User does not have access yet
  
  // Handle temporal availability for products that exist but aren't temporally available
  if (temporalStatus.isNotYetAvailable) {
    return (
      <ProductActionLayout>
        {/* Show availability banner for coming soon products */}
        <div className="mb-6">
          <ProductAvailabilityBanner 
            product={product}
            isAuthenticated={!!user}
          />
        </div>
        
        <div className="text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-2xl font-semibold text-white mb-2">{t('comingSoon')}</h2>
          <p className="text-gray-400 mb-6">
            {t('comingSoonMessage')}
          </p>
        </div>
      </ProductActionLayout>
    );
  }
  
  // Handle expired temporal products
  if (temporalStatus.isExpired && !hasAccess) {
    return (
      <ProductActionLayout>
        {/* Show availability banner for expired products */}
        <div className="mb-6">
          <ProductAvailabilityBanner 
            product={product}
            isAuthenticated={!!user}
          />
        </div>
        
        <div className="text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-2xl font-semibold text-white mb-2">{t('offerExpired')}</h2>
          <p className="text-gray-400 mb-6">
            {t('offerExpiredMessage')}
          </p>
          <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200">
            <p className="text-sm">
              {t('previousAccessNote')}
            </p>
          </div>
        </div>
      </ProductActionLayout>
    );
  }

  // Check if product is inactive - show special message
  if (!product.is_active) {
    return (
      <ProductActionLayout>
        {/* Show availability banner for inactive products with temporal info */}
        {(product.available_from || product.available_until) && (
          <div className="mb-6">
            <ProductAvailabilityBanner 
              product={product}
              isAuthenticated={!!user}
            />
          </div>
        )}
        
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">{t('productNoLongerAvailable')}</h2>
          <p className="text-gray-400 mb-6">
            {t('productNoLongerAvailableMessage')}
          </p>
          <div className="bg-yellow-800/30 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
            <p className="text-sm">
              {t('previousAccessNote')}
            </p>
          </div>
        </div>
      </ProductActionLayout>
    );
  }

  return (
    <ProductActionLayout>
      {/* Add availability banner for temporal products */}
      {(product.available_from || product.available_until) && temporalStatus.isTemporallyAvailable && (
        <div className="mb-6">
          <ProductAvailabilityBanner 
            product={product}
            isAuthenticated={!!user}
          />
        </div>
      )}
      
      {product.price === 0 ? (
        // View 3a: Free product flow
        user ? (
          // Logged in, but no access
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('getYourFreeProduct')}</h2>
            <p className="text-gray-400 mb-6">{t('clickForInstantAccess')}</p>
            <button
              onClick={requestFreeAccess}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? t('gettingAccess') : t('getInstantAccess')}
            </button>
          </>
        ) : (
          // Not logged in
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('getYourFreeProduct')}</h2>
            <p className="text-gray-400 mb-6">{t('enterEmailForDownload')}</p>
            <form onSubmit={handleMagicLinkSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  {t('emailAddressLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full bg-black/20 border border-white/10 text-white rounded-lg py-3 px-4 focus:bg-black/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                  placeholder={t('emailPlaceholder')}
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
                {loading ? t('sending') : t('sendMagicLink')}
              </button>
            </form>
          </>
        )
      ) : (
        // View 3b: Paid product flow
        <>
          <h2 className="text-2xl font-semibold text-white mb-2">{t('purchaseAccess')}</h2>
          <p className="text-gray-400 mb-6">{t('clickForPayment')}</p>
          <PaymentButton
            product={product}
            successUrl={`${window.location.origin}/p/${product.slug}?payment=success`}
            cancelUrl={`${window.location.origin}/p/${product.slug}?payment=cancelled`}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('proceedToPayment')} - {formatPrice(product.price, product.currency)}
          </PaymentButton>
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
        {t('securedBy')}
      </div>
    </ProductActionLayout>
  );
}
