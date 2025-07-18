'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import ProductAccessView from './ProductAccessView';

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
  const { user } = useAuth();
  const router = useRouter();
  
  const [accessData, setAccessData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAccess = useRef(false);

  // Check user access when user changes
  useEffect(() => {
    const checkUserAccess = async () => {
      console.log('ProductViewNew: Starting access check', { 
        user: user?.id, 
        email: user?.email, 
        slug: product.slug,
        hasCheckedAccess: hasCheckedAccess.current
      });
      
      if (!user) {
        console.log('ProductViewNew: No user, setting hasAccess: false');
        setAccessData({ hasAccess: false });
        setLoading(false);
        return;
      }

      // Reset loading when user becomes available
      setLoading(true);
      hasCheckedAccess.current = false;

      try {
        const response = await fetch(`/api/public/products/${product.slug}/access`);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log('ProductViewNew: 401 response, redirecting to login');
            window.location.href = '/login';
            return;
          }
          console.error('Error checking access:', response.statusText);
          setLoading(false);
          return;
        }

        const data: AccessResponse = await response.json();
        console.log('ProductViewNew: Access check result:', data);
        setAccessData(data);
        
        // If user doesn't have access, redirect to checkout
        if (!data.hasAccess) {
          console.log('ProductViewNew: User has no access, redirecting to checkout');
          router.push(`/checkout/${product.slug}`);
          return;
        }
      } catch (err) {
        console.error('Error in checkUserAccess:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [user, product.slug, router]); // Add router to dependencies

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

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
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
    console.log('User has access, showing ProductAccessView');
    return <ProductAccessView product={product} userAccess={accessData.userAccess} />;
  }

  // Check if product is inactive
  if (!product.is_active) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
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

  // Check temporal availability
  const temporal = checkTemporalAvailability();
  
  if (!temporal.isTemporallyAvailable) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {temporal.isNotYetAvailable ? t('comingSoon') : t('offerExpired')}
          </h2>
          <p className="text-gray-400 mb-6">
            {temporal.isNotYetAvailable ? t('comingSoonMessage') : t('offerExpiredMessage')}
          </p>
          {temporal.isExpired && (
            <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200">
              <p className="text-sm">{t('previousAccessNote')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
