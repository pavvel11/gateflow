/**
 * API Integration Tests: Coupons
 *
 * Tests the /api/v1/coupons endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import { get, post, patch, del, testData, cleanup, deleteTestApiKey } from './setup';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  expires_at: string | null;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  pagination?: { cursor: string | null; has_more: boolean };
}

describe('Coupons API', () => {
  const createdCouponIds: string[] = [];

  afterAll(async () => {
    await cleanup({ coupons: createdCouponIds });
    await deleteTestApiKey();
  });

  describe('GET /api/v1/coupons', () => {
    it('returns a list of coupons', async () => {
      const { status, data } = await get<ApiResponse<Coupon[]>>('/api/v1/coupons');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination', async () => {
      const { status, data } = await get<ApiResponse<Coupon[]>>('/api/v1/coupons?limit=5');

      expect(status).toBe(200);
      expect(data.pagination).toBeDefined();
    });

    it('supports status filter', async () => {
      const { status, data } = await get<ApiResponse<Coupon[]>>('/api/v1/coupons?status=active');

      expect(status).toBe(200);
      data.data!.forEach(coupon => {
        expect(coupon.is_active).toBe(true);
      });
    });
  });

  describe('POST /api/v1/coupons', () => {
    it('creates a percentage coupon', async () => {
      const couponData = testData.coupon({ discount_type: 'percentage', discount_value: 15 });
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', couponData);

      expect(status).toBe(201);
      expect(data.data).toBeDefined();
      expect(data.data!.code).toBe(couponData.code);
      expect(data.data!.discount_type).toBe('percentage');
      expect(data.data!.discount_value).toBe(15);

      if (data.data?.id) {
        createdCouponIds.push(data.data.id);
      }
    });

    it('creates a fixed discount coupon', async () => {
      const couponData = testData.coupon({ discount_type: 'fixed', discount_value: 50 });
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', couponData);

      expect(status).toBe(201);
      expect(data.data!.discount_type).toBe('fixed');
      expect(data.data!.discount_value).toBe(50);

      if (data.data?.id) {
        createdCouponIds.push(data.data.id);
      }
    });

    it('creates coupon with expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const couponData = testData.coupon({ expires_at: expiresAt });
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', couponData);

      expect(status).toBe(201);
      expect(data.data!.expires_at).toBeDefined();

      if (data.data?.id) {
        createdCouponIds.push(data.data.id);
      }
    });

    it('creates coupon with max uses limit', async () => {
      const couponData = testData.coupon({ max_uses: 100 });
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', couponData);

      expect(status).toBe(201);
      expect(data.data!.max_uses).toBe(100);

      if (data.data?.id) {
        createdCouponIds.push(data.data.id);
      }
    });

    it('validates percentage discount max 100', async () => {
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon({
        discount_type: 'percentage',
        discount_value: 150, // Invalid
      }));

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('validates code uniqueness', async () => {
      const couponData = testData.coupon();

      // Create first coupon
      const first = await post<ApiResponse<Coupon>>('/api/v1/coupons', couponData);
      if (first.data.data?.id) {
        createdCouponIds.push(first.data.data.id);
      }

      // Try to create second with same code
      const { status, data } = await post<ApiResponse<Coupon>>('/api/v1/coupons', {
        ...testData.coupon(),
        code: couponData.code, // Same code
      });

      expect(status).toBe(409);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/v1/coupons/:id', () => {
    it('returns a single coupon', async () => {
      // Create a coupon first
      const { data: createData } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon());
      const couponId = createData.data!.id;
      createdCouponIds.push(couponId);

      const { status, data } = await get<ApiResponse<Coupon>>(`/api/v1/coupons/${couponId}`);

      expect(status).toBe(200);
      expect(data.data!.id).toBe(couponId);
    });

    it('returns 404 for non-existent coupon', async () => {
      const { status, data } = await get<ApiResponse<Coupon>>('/api/v1/coupons/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error!.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/coupons/:id', () => {
    it('updates coupon discount value', async () => {
      // Create a coupon first
      const { data: createData } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon());
      const couponId = createData.data!.id;
      createdCouponIds.push(couponId);

      const { status, data } = await patch<ApiResponse<Coupon>>(`/api/v1/coupons/${couponId}`, {
        discount_value: 25,
      });

      expect(status).toBe(200);
      expect(data.data!.discount_value).toBe(25);
    });

    it('deactivates coupon', async () => {
      const { data: createData } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon());
      const couponId = createData.data!.id;
      createdCouponIds.push(couponId);

      const { status, data } = await patch<ApiResponse<Coupon>>(`/api/v1/coupons/${couponId}`, {
        is_active: false,
      });

      expect(status).toBe(200);
      expect(data.data!.is_active).toBe(false);
    });
  });

  describe('DELETE /api/v1/coupons/:id', () => {
    it('deletes a coupon', async () => {
      const { data: createData } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon());
      const couponId = createData.data!.id;

      const { status } = await del<ApiResponse<null>>(`/api/v1/coupons/${couponId}`);
      expect(status).toBe(204);

      // Verify it's gone
      const { status: getStatus } = await get<ApiResponse<Coupon>>(`/api/v1/coupons/${couponId}`);
      expect(getStatus).toBe(404);
    });
  });

  describe('GET /api/v1/coupons/:id/stats', () => {
    it('returns coupon usage stats', async () => {
      const { data: createData } = await post<ApiResponse<Coupon>>('/api/v1/coupons', testData.coupon());
      const couponId = createData.data!.id;
      createdCouponIds.push(couponId);

      const { status, data } = await get<ApiResponse<{ usage_count: number; total_discount: number }>>(`/api/v1/coupons/${couponId}/stats`);

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(typeof data.data!.usage_count).toBe('number');
    });
  });
});
