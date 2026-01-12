/**
 * API Integration Test Setup
 *
 * These tests run against a live server (dev or test).
 * Before running: npm run dev (in another terminal)
 *
 * Environment variables:
 * - TEST_API_URL: Base URL (default: http://localhost:3000)
 * - TEST_API_KEY: API key for authentication (created in beforeAll)
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
export const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Supabase client for test setup (using service role for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Test API key storage
let testApiKey: string | null = null;
let testApiKeyId: string | null = null;

/**
 * Create a test API key with full access
 */
export async function createTestApiKey(): Promise<string> {
  if (testApiKey) return testApiKey;

  // Create API key directly in database for testing
  const { data, error } = await supabase.rpc('create_api_key', {
    p_name: `test-key-${Date.now()}`,
    p_scopes: ['*'],
    p_rate_limit_per_minute: 1000,
  });

  if (error) {
    throw new Error(`Failed to create test API key: ${error.message}`);
  }

  testApiKey = data.api_key;
  testApiKeyId = data.id;
  return testApiKey!;
}

/**
 * Delete test API key after tests
 */
export async function deleteTestApiKey(): Promise<void> {
  if (!testApiKeyId) return;

  await supabase.from('api_keys').delete().eq('id', testApiKeyId);
  testApiKey = null;
  testApiKeyId = null;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; data: T; headers: Headers }> {
  const apiKey = await createTestApiKey();

  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers);
  headers.set('X-API-Key', apiKey);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  return {
    status: response.status,
    data: data as T,
    headers: response.headers,
  };
}

/**
 * GET request helper
 */
export function get<T = unknown>(path: string) {
  return apiRequest<T>(path, { method: 'GET' });
}

/**
 * POST request helper
 */
export function post<T = unknown>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request helper
 */
export function patch<T = unknown>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request helper
 */
export function del<T = unknown>(path: string) {
  return apiRequest<T>(path, { method: 'DELETE' });
}

/**
 * Test data factory
 */
export const testData = {
  product: (overrides = {}) => ({
    name: `Test Product ${Date.now()}`,
    slug: `test-product-${Date.now()}`,
    price: 99.99,
    currency: 'PLN',
    description: 'Test product description',
    is_active: true,
    ...overrides,
  }),

  coupon: (overrides = {}) => ({
    code: `TEST${Date.now()}`,
    discount_type: 'percentage' as const,
    discount_value: 10,
    is_active: true,
    ...overrides,
  }),

  webhook: (overrides = {}) => ({
    url: 'https://webhook.site/test-endpoint',
    events: ['payment.completed'],
    is_active: true,
    ...overrides,
  }),
};

/**
 * Cleanup helper - delete created resources
 */
export async function cleanup(resources: { products?: string[]; coupons?: string[]; webhooks?: string[] }) {
  const promises: Promise<unknown>[] = [];

  if (resources.products?.length) {
    resources.products.forEach(id => {
      promises.push(del(`/api/v1/products/${id}`));
    });
  }

  if (resources.coupons?.length) {
    resources.coupons.forEach(id => {
      promises.push(del(`/api/v1/coupons/${id}`));
    });
  }

  if (resources.webhooks?.length) {
    resources.webhooks.forEach(id => {
      promises.push(del(`/api/v1/webhooks/${id}`));
    });
  }

  await Promise.allSettled(promises);
}
