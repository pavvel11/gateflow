/**
 * Coupons Hook for v1 API
 *
 * Provides a consistent interface for coupons operations,
 * translating between the v1 API cursor pagination and the
 * frontend's offset-based pagination UI.
 */

import { useState, useCallback } from 'react';
import { Coupon } from '@/types/coupon';
import { api, ApiError } from '@/lib/api/client';

interface UseCouponsParams {
  page?: number;
  limit?: number;
}

interface UseCouponsResult {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
  fetchCoupons: () => Promise<void>;
  createCoupon: (data: CouponCreateData) => Promise<Coupon>;
  updateCoupon: (id: string, data: CouponUpdateData) => Promise<Coupon>;
  deleteCoupon: (id: string) => Promise<void>;
  deleteCoupons: (ids: string[]) => Promise<void>;
}

interface CouponCreateData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number | null;
  expires_at?: string | null;
  allowed_product_ids?: string[] | null;
  allowed_emails?: string[] | null;
  is_active?: boolean;
  one_per_user?: boolean;
  metadata?: Record<string, unknown>;
}

interface CouponUpdateData extends Partial<CouponCreateData> {}

/**
 * Hook for coupons CRUD operations using v1 API
 */
export function useCoupons(params: UseCouponsParams = {}): UseCouponsResult {
  const {
    page = 1,
    limit = 50, // Coupons often need more items per page
  } = params;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  });

  /**
   * Fetch coupons from v1 API
   */
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // For offset pagination emulation, we fetch enough items
      const fetchLimit = Math.max(limit * page, 200);

      const response = await api.list<Coupon>('coupons', {
        limit: fetchLimit,
        sort: '-created_at', // Sort by created_at descending
      });

      const allCoupons = response.data;
      const totalItems = allCoupons.length;

      // Calculate pagination info based on fetched data
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageCoupons = allCoupons.slice(startIndex, endIndex);

      setCoupons(allCoupons); // Store all for filtering
      setPagination({
        currentPage: page,
        totalPages: Math.max(totalPages, 1),
        totalItems,
        hasMore: response.pagination.has_more || endIndex < totalItems,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load coupons. Please try again later.');
      }
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  /**
   * Create a new coupon
   */
  const createCoupon = useCallback(async (data: CouponCreateData): Promise<Coupon> => {
    return await api.create<Coupon>('coupons', data as unknown as Record<string, unknown>);
  }, []);

  /**
   * Update an existing coupon
   */
  const updateCoupon = useCallback(async (id: string, data: CouponUpdateData): Promise<Coupon> => {
    return await api.update<Coupon>('coupons', id, data as unknown as Record<string, unknown>);
  }, []);

  /**
   * Delete a coupon
   */
  const deleteCoupon = useCallback(async (id: string): Promise<void> => {
    await api.delete('coupons', id);
  }, []);

  /**
   * Delete multiple coupons
   */
  const deleteCoupons = useCallback(async (ids: string[]): Promise<void> => {
    // Delete coupons sequentially to avoid rate limiting
    for (const id of ids) {
      await api.delete('coupons', id);
    }
  }, []);

  return {
    coupons,
    loading,
    error,
    pagination,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    deleteCoupons,
  };
}
