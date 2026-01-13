/**
 * API Integration Tests: Authentication
 *
 * Tests API key authentication and authorization
 */

import { describe, it, expect, afterAll } from 'vitest';
import { API_URL, deleteTestApiKey, createTestApiKey } from './setup';

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

describe('API Authentication', () => {
  afterAll(async () => {
    await deleteTestApiKey();
  });

  describe('Missing Authentication', () => {
    it('returns 401 without API key', async () => {
      const response = await fetch(`${API_URL}/api/v1/products`);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 with empty API key', async () => {
      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { 'X-API-Key': '' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Invalid Authentication', () => {
    it('returns 401 with invalid API key format', async () => {
      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { 'X-API-Key': 'invalid-key' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 with non-existent API key', async () => {
      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { 'X-API-Key': 'gf_live_0000000000000000000000000000000000000000000000000000000000000000' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Valid Authentication', () => {
    it('returns 200 with valid API key', async () => {
      const apiKey = await createTestApiKey();

      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { 'X-API-Key': apiKey },
      });

      expect(response.status).toBe(200);
    });

    it('accepts Bearer token format', async () => {
      const apiKey = await createTestApiKey();

      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('includes rate limit headers', async () => {
      const apiKey = await createTestApiKey();

      const response = await fetch(`${API_URL}/api/v1/products`, {
        headers: { 'X-API-Key': apiKey },
      });

      // Rate limit headers should be present
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });
});
