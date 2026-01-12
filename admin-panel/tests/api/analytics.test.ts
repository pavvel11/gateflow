/**
 * API Integration Tests: Analytics
 *
 * Tests the /api/v1/analytics endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import { get, deleteTestApiKey } from './setup';

interface DashboardData {
  total_revenue: number;
  total_products: number;
  total_users: number;
  total_transactions: number;
  revenue_trend: number;
  recent_transactions: unknown[];
}

interface RevenueData {
  total: number;
  currency: string;
  period: string;
  breakdown: { date: string; amount: number }[];
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  sales_count: number;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

describe('Analytics API', () => {
  afterAll(async () => {
    await deleteTestApiKey();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('returns dashboard data', async () => {
      const { status, data } = await get<ApiResponse<DashboardData>>('/api/v1/analytics/dashboard');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(typeof data.data!.total_revenue).toBe('number');
      expect(typeof data.data!.total_products).toBe('number');
      expect(typeof data.data!.total_users).toBe('number');
    });
  });

  describe('GET /api/v1/analytics/revenue', () => {
    it('returns revenue data', async () => {
      const { status, data } = await get<ApiResponse<RevenueData>>('/api/v1/analytics/revenue');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(typeof data.data!.total).toBe('number');
    });

    it('supports period filter', async () => {
      const { status, data } = await get<ApiResponse<RevenueData>>('/api/v1/analytics/revenue?period=30d');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('supports different periods', async () => {
      const periods = ['7d', '30d', '90d', '1y'];

      for (const period of periods) {
        const { status } = await get<ApiResponse<RevenueData>>(`/api/v1/analytics/revenue?period=${period}`);
        expect(status).toBe(200);
      }
    });
  });

  describe('GET /api/v1/analytics/top-products', () => {
    it('returns top products', async () => {
      const { status, data } = await get<ApiResponse<TopProduct[]>>('/api/v1/analytics/top-products');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports limit parameter', async () => {
      const { status, data } = await get<ApiResponse<TopProduct[]>>('/api/v1/analytics/top-products?limit=5');

      expect(status).toBe(200);
      expect(data.data!.length).toBeLessThanOrEqual(5);
    });

    it('supports period filter', async () => {
      const { status, data } = await get<ApiResponse<TopProduct[]>>('/api/v1/analytics/top-products?period=30d');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });
});
