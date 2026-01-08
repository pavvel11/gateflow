'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import DigitalContentRenderer from '@/components/DigitalContentRenderer';
import Confetti from 'react-confetti';

/**
 * SECURITY FIX (V7): Validate return URL to prevent open redirect attacks.
 * Only allows relative paths starting with / (not //).
 * Rejects: external URLs, protocol-relative URLs (//evil.com), javascript: URLs
 */
function validateReturnUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const decoded = decodeURIComponent(url).trim();

    // Must start with exactly one / (not //)
    if (!decoded.startsWith('/') || decoded.startsWith('//')) {
      return null;
    }

    // Reject javascript:, data:, vbscript: URLs (case insensitive)
    const lowerDecoded = decoded.toLowerCase();
    if (lowerDecoded.includes('javascript:') ||
        lowerDecoded.includes('data:') ||
        lowerDecoded.includes('vbscript:')) {
      return null;
    }

    // Reject URLs with protocol indicators
    if (decoded.includes('://')) {
      return null;
    }

    return decoded;
  } catch {
    // If decoding fails, reject the URL
    return null;
  }
}

interface ProductAccessViewProps {
  product: Product;
  userAccess?: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  } | null;
}

interface SecureProductData {
  product: Product;
  userAccess: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
    // Backend-computed security status
    is_expired: boolean;
    is_expiring_soon: boolean;
    days_until_expiration: number | null;
  };
}

export default function ProductAccessView({ product }: ProductAccessViewProps) {
  const t = useTranslations('productView');
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [secureData, setSecureData] = useState<SecureProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch secure product data from API
  useEffect(() => {
    const fetchSecureData = async () => {
      try {
        const response = await fetch(`/api/public/products/${product.slug}/content`);
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }
          if (response.status === 403) {
            setError('Access denied or expired');
            return;
          }
          throw new Error('Failed to fetch content');
        }

        const data = await response.json();
        setSecureData(data);
      } catch (err) {
        console.error('Error fetching secure data:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if not showing confetti
    if (!showConfetti) {
      fetchSecureData();
    }
  }, [product.slug, showConfetti]);

  // Handle redirect type products
  useEffect(() => {
    if (secureData?.product.content_delivery_type === 'redirect') {
      const redirectUrl = secureData.product.content_config.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  }, [secureData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if this is a fresh access grant (from payment success)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    
    if (paymentSuccess) {
      setShowConfetti(true);
      
      // Set window dimensions for confetti
      const { innerWidth, innerHeight } = window;
      setDimensions({ width: innerWidth, height: innerHeight });

      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };

      window.addEventListener('resize', handleResize, { passive: true });
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (showConfetti && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showConfetti && countdown === 0) {
      // Check for return URL - SECURITY FIX (V7): Validate URL to prevent open redirect
      const urlParams = new URLSearchParams(window.location.search);
      const rawReturnUrl = urlParams.get('return_url');
      const safeReturnUrl = validateReturnUrl(rawReturnUrl);

      if (safeReturnUrl) {
        window.location.href = safeReturnUrl;
        return;
      }
      // No valid return URL, stop confetti and show content
      setShowConfetti(false);
    }
  }, [showConfetti, countdown]);

  // Show success animation
  if (showConfetti) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative">
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={800}
          gravity={0.25}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: 5 }}
        />
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

  // Show loading state while fetching content
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading secure content...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Error</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show no content state
  if (!secureData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">No content available</div>
      </div>
    );
  }

  const { product: secureProduct, userAccess: secureUserAccess } = secureData;

  // Show loading state for redirect products
  if (secureProduct.content_delivery_type === 'redirect') {
    const redirectUrl = secureProduct.content_config.redirect_url;
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
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
        
        <div className="max-w-md mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Redirecting...</h2>
          <p className="text-gray-400 text-sm mb-4">You&apos;re being redirected to your content.</p>
          {redirectUrl && (
            <a 
              href={redirectUrl}
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Go to Content
            </a>
          )}
        </div>
      </div>
    );
  }

  // Show the actual product content
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
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-6xl mr-4">{secureProduct.icon}</div>
            <h1 className="text-3xl font-bold text-white">{secureProduct.name}</h1>
          </div>
          
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
              <svg className="w-5 h-5 text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-300 font-medium">
                {secureUserAccess.is_expired ? 'Access Expired' : 'Access Granted'}
              </span>
              {secureProduct.is_featured && (
                <svg className="w-4 h-4 text-yellow-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
            
            {/* Show access expiration info */}
            {secureUserAccess.access_expires_at && (
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                secureUserAccess.is_expired 
                  ? 'bg-red-500/20 border border-red-500/30' 
                  : secureUserAccess.is_expiring_soon
                    ? 'bg-yellow-500/20 border border-yellow-500/30'
                    : 'bg-blue-500/20 border border-blue-500/30'
              }`}>
                <svg className={`w-5 h-5 mr-2 ${
                  secureUserAccess.is_expired 
                    ? 'text-red-400' 
                    : secureUserAccess.is_expiring_soon
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`font-medium ${
                  secureUserAccess.is_expired 
                    ? 'text-red-300' 
                    : secureUserAccess.is_expiring_soon
                      ? 'text-yellow-300'
                      : 'text-blue-300'
                }`}>
                  {secureUserAccess.is_expired 
                    ? `Expired ${formatDate(secureUserAccess.access_expires_at)}`
                    : `Expires ${formatDate(secureUserAccess.access_expires_at)}`
                  }
                </span>
              </div>
            )}
          </div>
          
          {/* Show inactive product warning */}
          {!secureProduct.is_active && (
            <div className="inline-flex items-center px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full mt-2">
              <svg className="w-5 h-5 text-yellow-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833-.23 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-300 font-medium">Legacy Access</span>
            </div>
          )}
        </div>
        
        <div className="bg-white/10 border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Product Description</h2>
          <p className="text-gray-300">{secureProduct.description}</p>
        </div>
        
        {/* Render digital content based on content_delivery_type */}
        <DigitalContentRenderer 
          contentItems={secureProduct.content_config.content_items || []} 
          productName={secureProduct.name}
        />
        
        <div className="text-center mt-8 text-sm text-gray-500">
          Secured by GateFlow • {new Date().toLocaleDateString()}
          {!secureProduct.is_active && (
            <div className="mt-2 text-xs text-yellow-400">
              This product is no longer available to new customers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
