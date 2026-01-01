import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';
import { checkProductAccess } from '@/lib/api/product-access';

interface AccessResponse {
  hasAccess: boolean;
  reason?: 'no_access' | 'expired' | 'inactive' | 'temporal';
  userAccess?: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  };
}

export function useProductAccess(product: Product) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessData, setAccessData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Build checkout URL preserving OTO params
  const buildCheckoutUrl = (slug: string) => {
    const params = new URLSearchParams();
    const email = searchParams.get('email');
    const coupon = searchParams.get('coupon');
    const oto = searchParams.get('oto');

    if (email) params.set('email', email);
    if (coupon) params.set('coupon', coupon);
    if (oto) params.set('oto', oto);

    const queryString = params.toString();
    return `/checkout/${slug}${queryString ? `?${queryString}` : ''}`;
  };

  useEffect(() => {
    const checkUserAccess = async () => {
      // Don't do anything while auth is still loading
      if (authLoading) {
        return;
      }

      if (!user) {
        // For non-logged users, check if product is available before redirecting to checkout
        const now = new Date();
        const availableFrom = product.available_from ? new Date(product.available_from) : null;
        const availableUntil = product.available_until ? new Date(product.available_until) : null;
        const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now);
        
        if (!product.is_active) {
          // Product is inactive - set access data to show appropriate message
          setAccessData({
            hasAccess: false,
            reason: 'inactive'
          });
          setLoading(false);
          return;
        }
        
        if (!isTemporallyAvailable) {
          // Product is not temporally available - set access data to show appropriate message
          setAccessData({
            hasAccess: false,
            reason: 'temporal'
          });
          setLoading(false);
          return;
        }
        
        // Product is available - redirect to checkout (preserving OTO params)
        setLoading(false);
        router.push(buildCheckoutUrl(product.slug));
        return;
      }

      // Reset loading when user becomes available
      setLoading(true);

      try {
        const data = await checkProductAccess(product.slug);
        setAccessData(data);
        
        // If user doesn't have access, check the reason before redirecting
        if (!data.hasAccess) {
          // Only redirect to checkout if the product is available for new purchases
          if (data.reason === 'no_access') {
            router.push(buildCheckoutUrl(product.slug));
            return;
          }
          // For other reasons (inactive, temporal, expired), show appropriate message
          // Component will handle this in the render logic
        }
      } catch (error) {
        console.error('Error checking product access:', error);
        // Handle any errors silently - component will show fallback
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [user, product.slug, product.is_active, product.available_from, product.available_until, router, authLoading]);

  return {
    accessData,
    loading: authLoading || loading,
    user
  };
}