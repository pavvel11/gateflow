/**
 * useOrderBumps Hook
 *
 * Custom hook for fetching order bump configuration for a product.
 * Returns an array of all active bumps (supports multi-bump).
 */

import { useEffect, useState } from 'react';
import type { OrderBumpWithProduct } from '@/types/order-bump';

export function useOrderBumps(productId: string) {
  const [orderBumps, setOrderBumps] = useState<OrderBumpWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderBumps() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/order-bumps?productId=${productId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch order bumps');
        }

        const data = await response.json();

        if (data && data.length > 0) {
          setOrderBumps(data);
        } else {
          setOrderBumps([]);
        }
      } catch (err) {
        console.error('Error fetching order bumps:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setOrderBumps([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderBumps();
  }, [productId]);

  return { orderBumps, loading, error };
}
