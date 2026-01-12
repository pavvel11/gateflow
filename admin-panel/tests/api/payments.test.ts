/**
 * API Integration Tests: Payments
 *
 * Tests the /api/v1/payments endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import { get, post, deleteTestApiKey } from './setup';

interface Payment {
  id: string;
  user_email: string;
  product_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id: string | null;
  created_at: string;
}

interface PaymentStats {
  total_revenue: number;
  total_transactions: number;
  avg_transaction_value: number;
  refund_rate: number;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  pagination?: { cursor: string | null; has_more: boolean };
}

describe('Payments API', () => {
  afterAll(async () => {
    await deleteTestApiKey();
  });

  describe('GET /api/v1/payments', () => {
    it('returns a list of payments', async () => {
      const { status, data } = await get<ApiResponse<Payment[]>>('/api/v1/payments');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination', async () => {
      const { status, data } = await get<ApiResponse<Payment[]>>('/api/v1/payments?limit=10');

      expect(status).toBe(200);
      expect(data.data!.length).toBeLessThanOrEqual(10);
      expect(data.pagination).toBeDefined();
    });

    it('supports status filter', async () => {
      const { status, data } = await get<ApiResponse<Payment[]>>('/api/v1/payments?status=completed');

      expect(status).toBe(200);
      data.data!.forEach(payment => {
        expect(payment.status).toBe('completed');
      });
    });

    it('supports date range filter', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      const { status, data } = await get<ApiResponse<Payment[]>>(
        `/api/v1/payments?date_from=${dateFrom}&date_to=${dateTo}`
      );

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('supports email filter', async () => {
      const { status, data } = await get<ApiResponse<Payment[]>>('/api/v1/payments?email=test@example.com');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('returns 404 for non-existent payment', async () => {
      const { status, data } = await get<ApiResponse<Payment>>('/api/v1/payments/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error!.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid UUID', async () => {
      const { status, data } = await get<ApiResponse<Payment>>('/api/v1/payments/invalid-uuid');

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/v1/payments/stats', () => {
    it('returns payment statistics', async () => {
      const { status, data } = await get<ApiResponse<PaymentStats>>('/api/v1/payments/stats');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(typeof data.data!.total_revenue).toBe('number');
      expect(typeof data.data!.total_transactions).toBe('number');
    });

    it('supports period filter', async () => {
      const { status, data } = await get<ApiResponse<PaymentStats>>('/api/v1/payments/stats?period=30d');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    it('returns 404 for non-existent payment', async () => {
      const { status, data } = await post<ApiResponse<Payment>>(
        '/api/v1/payments/00000000-0000-0000-0000-000000000000/refund',
        { reason: 'Customer request' }
      );

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it('validates refund amount', async () => {
      const { status, data } = await post<ApiResponse<Payment>>(
        '/api/v1/payments/00000000-0000-0000-0000-000000000000/refund',
        { amount: -100 } // Invalid negative amount
      );

      // Should be 400 or 404
      expect([400, 404]).toContain(status);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/v1/payments/export', () => {
    it('initiates payment export', async () => {
      const { status, data } = await post<ApiResponse<{ export_id: string; status: string }>>(
        '/api/v1/payments/export',
        {
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0],
          format: 'csv',
        }
      );

      // Could be 200/201 (export started) or 400 (no data to export)
      expect([200, 201, 400]).toContain(status);
    });
  });
});
