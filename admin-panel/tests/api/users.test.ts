/**
 * API Integration Tests: Users
 *
 * Tests the /api/v1/users endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import { get, post, patch, del, deleteTestApiKey } from './setup';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserAccess {
  id: string;
  user_id: string;
  product_id: string;
  granted_at: string;
  expires_at: string | null;
  source: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  pagination?: { cursor: string | null; has_more: boolean };
}

describe('Users API', () => {
  afterAll(async () => {
    await deleteTestApiKey();
  });

  describe('GET /api/v1/users', () => {
    it('returns a list of users', async () => {
      const { status, data } = await get<ApiResponse<User[]>>('/api/v1/users');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination', async () => {
      const { status, data } = await get<ApiResponse<User[]>>('/api/v1/users?limit=10');

      expect(status).toBe(200);
      expect(data.data!.length).toBeLessThanOrEqual(10);
      expect(data.pagination).toBeDefined();
    });

    it('supports email search', async () => {
      const { status, data } = await get<ApiResponse<User[]>>('/api/v1/users?search=test');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns 404 for non-existent user', async () => {
      const { status, data } = await get<ApiResponse<User>>('/api/v1/users/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error!.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid UUID', async () => {
      const { status, data } = await get<ApiResponse<User>>('/api/v1/users/invalid-uuid');

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('User Access Management', () => {
    // Note: These tests require existing users and products
    // In a real test suite, we'd create test fixtures

    describe('POST /api/v1/users/:id/access', () => {
      it('validates required fields', async () => {
        const { status, data } = await post<ApiResponse<UserAccess>>(
          '/api/v1/users/00000000-0000-0000-0000-000000000000/access',
          {}
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('returns 404 for non-existent user', async () => {
        const { status, data } = await post<ApiResponse<UserAccess>>(
          '/api/v1/users/00000000-0000-0000-0000-000000000000/access',
          { product_id: '00000000-0000-0000-0000-000000000001' }
        );

        // Could be 404 (user not found) or 400 (product not found)
        expect([400, 404]).toContain(status);
        expect(data.error).toBeDefined();
      });
    });

    describe('DELETE /api/v1/users/:id/access/:accessId', () => {
      it('returns 404 for non-existent access', async () => {
        const { status, data } = await del<ApiResponse<null>>(
          '/api/v1/users/00000000-0000-0000-0000-000000000000/access/00000000-0000-0000-0000-000000000001'
        );

        expect(status).toBe(404);
        expect(data.error).toBeDefined();
      });
    });

    describe('PATCH /api/v1/users/:id/access/:accessId', () => {
      it('returns 404 for non-existent access', async () => {
        const { status, data } = await patch<ApiResponse<UserAccess>>(
          '/api/v1/users/00000000-0000-0000-0000-000000000000/access/00000000-0000-0000-0000-000000000001',
          { expires_at: new Date(Date.now() + 86400000).toISOString() }
        );

        expect(status).toBe(404);
        expect(data.error).toBeDefined();
      });
    });
  });
});
