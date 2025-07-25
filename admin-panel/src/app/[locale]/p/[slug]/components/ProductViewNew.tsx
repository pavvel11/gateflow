'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import ProductAccessView from './ProductAccessView';
import FloatingToolbar from '@/components/FloatingToolbar';

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
}

export default function ProductView({ product }: ProductViewProps) {
  const t = useTranslations('productView');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [accessData, setAccessData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAccess = useRef(false);

  // Debug log at component start
  console.log('ProductViewNew render:', {
    authLoading,
    user: user ? 'logged in' : 'not logged in',
    loading,
    productSlug: product.slug,
    hasAccessData: !!accessData
  });

  // Check user access when user changes
  useEffect(() => {
    const checkUserAccess = async () => {
      console.log('ProductViewNew: checkUserAccess called', { 
        authLoading, 
        user: user ? 'logged in' : 'not logged in',
        productSlug: product.slug,
        isActive: product.is_active,
        availableFrom: product.available_from,
        availableUntil: product.available_until
      });
      
      // Don't do anything while auth is still loading
      if (authLoading) {
        console.log('ProductViewNew: Auth still loading, returning');
        return;
      }
      
      if (!user) {
        console.log('ProductViewNew: No user, checking product availability');
        // For non-logged users, check if product is available before redirecting to checkout
        const now = new Date();
        const availableFrom = product.available_from ? new Date(product.available_from) : null;
        const availableUntil = product.available_until ? new Date(product.available_until) : null;
        const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now);
        
        console.log('ProductViewNew: Temporal check', {
          now: now.toISOString(),
          availableFrom: availableFrom?.toISOString(),
          availableUntil: availableUntil?.toISOString(),
          isTemporallyAvailable,
          isActive: product.is_active
        });
        
        if (!product.is_active) {
          console.log('ProductViewNew: Product inactive, setting accessData');
          // Product is inactive - set access data to show appropriate message
          setAccessData({
            hasAccess: false,
            reason: 'inactive'
          });
          setLoading(false);
          return;
        }
        
        if (!isTemporallyAvailable) {
          console.log('ProductViewNew: Product not temporally available, setting accessData');
          // Product is not temporally available - set access data to show appropriate message
          setAccessData({
            hasAccess: false,
            reason: 'temporal'
          });
          setLoading(false);
          return;
        }
        
        console.log('ProductViewNew: Product available, redirecting to checkout');
        // Product is available - redirect to checkout
        setLoading(false);
        router.push(`/checkout/${product.slug}`);
        return;
      }

      // Reset loading when user becomes available
      setLoading(true);
      hasCheckedAccess.current = false;

      try {
        const response = await fetch(`/api/public/products/${product.slug}/access`);
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }
          setLoading(false);
          return;
        }

        const data: AccessResponse = await response.json();
        setAccessData(data);
        
        // If user doesn't have access, check the reason before redirecting
        if (!data.hasAccess) {
          // Only redirect to checkout if the product is available for new purchases
          if (data.reason === 'no_access') {
            router.push(`/checkout/${product.slug}`);
            return;
          }
          // For other reasons (inactive, temporal, expired), show appropriate message
          // Component will handle this in the render logic below
        }
      } catch {
        // Handle any errors silently
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [user, product.slug, product.is_active, product.available_from, product.available_until, router, authLoading]);

  // Loading state - show loading while auth is loading OR while we're checking access
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Unified Floating Toolbar */}
        <FloatingToolbar position="top-right" />
        
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has access
  if (accessData?.hasAccess) {
    return (
      <div>
        {/* Unified Floating Toolbar */}
        <FloatingToolbar position="top-right" />
        
        <ProductAccessView product={product} />
      </div>
    );
  }

  // Handle different reasons for lack of access
  if (accessData && !accessData.hasAccess) {
    if (accessData.reason === 'inactive') {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          {/* Unified Floating Toolbar */}
          <FloatingToolbar position="top-right" />
          
          <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
            {/* Product Header */}
            <div className="text-6xl mb-4">{product.icon || '📦'}</div>
            <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
            {product.description && (
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{product.description}</p>
            )}
            <div className="text-xl font-semibold text-blue-300 mb-8">
              {product.price === 0 ? 'FREE' : `$${product.price}`}
            </div>
            
            {/* Status Message */}
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('productNoLongerAvailable')}</h2>
            <p className="text-gray-400 mb-6">{t('productNoLongerAvailableMessage')}</p>
            <div className="bg-yellow-800/30 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
              <p className="text-sm">{t('previousAccessNote')}</p>
            </div>
          </div>
        </div>
      );
    }

    if (accessData.reason === 'temporal') {
      const now = new Date();
      const availableFrom = product.available_from ? new Date(product.available_from) : null;
      const availableUntil = product.available_until ? new Date(product.available_until) : null;
      const isNotYetAvailable = availableFrom && availableFrom > now;
      const isExpired = availableUntil && availableUntil < now;
      
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          {/* Unified Floating Toolbar */}
          <FloatingToolbar position="top-right" />
          
          <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
            {/* Product Header */}
            <div className="text-6xl mb-4">{product.icon || '📦'}</div>
            <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
            {product.description && (
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{product.description}</p>
            )}
            <div className="text-xl font-semibold text-blue-300 mb-8">
              {product.price === 0 ? 'FREE' : `$${product.price}`}
            </div>
            
            {/* Status Message */}
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isNotYetAvailable ? t('comingSoon') : t('offerExpired')}
            </h2>
            <p className="text-gray-400 mb-6">
              {isNotYetAvailable ? t('comingSoonMessage') : t('offerExpiredMessage')}
            </p>
            
            {/* Date Information */}
            {availableFrom && isNotYetAvailable && (
              <div className="bg-blue-800/30 border border-blue-500/30 rounded-lg p-4 text-blue-200 mb-6">
                <p className="text-sm">Available from: {availableFrom.toLocaleDateString()}</p>
              </div>
            )}
            
            {availableUntil && isExpired && (
              <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200 mb-6">
                <p className="text-sm">Was available until: {availableUntil.toLocaleDateString()}</p>
              </div>
            )}
            
            {isExpired && (
              <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200">
                <p className="text-sm">{t('previousAccessNote')}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (accessData.reason === 'expired') {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          {/* Unified Floating Toolbar */}
          <FloatingToolbar position="top-right" />
          
          <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
            {/* Product Header */}
            <div className="text-6xl mb-4">{product.icon || '📦'}</div>
            <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
            {product.description && (
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{product.description}</p>
            )}
            <div className="text-xl font-semibold text-blue-300 mb-8">
              {product.price === 0 ? 'FREE' : `$${product.price}`}
            </div>
            
            {/* Status Message */}
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('accessExpired')}</h2>
            <p className="text-gray-400 mb-6">{t('accessExpiredMessage')}</p>
            <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200">
              <p className="text-sm">{t('canPurchaseAgain')}</p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Fallback for edge cases or while waiting for redirect
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Redirecting...</p>
      </div>
    </div>
  );
}
