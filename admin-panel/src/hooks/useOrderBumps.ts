/**
 * useOrderBumps Hook
 *
 * Custom hook for fetching order bump configuration for a product
 */

import { useEffect, useState } from 'react';
import type { OrderBumpWithProduct } from '@/types/order-bump';

export function useOrderBumps(productId: string) {
  const [orderBump, setOrderBump] = useState<OrderBumpWithProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderBump() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Call Supabase function via API
        const response = await fetch(`/api/order-bumps?productId=${productId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch order bump');
        }

        const data = await response.json();

        // get_product_order_bumps returns array, we take first one
        if (data && data.length > 0) {
          setOrderBump(data[0]);
        } else {
          setOrderBump(null);
        }
      } catch (err) {
        console.error('Error fetching order bump:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setOrderBump(null);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderBump();
  }, [productId]);

  return { orderBump, loading, error };
}
