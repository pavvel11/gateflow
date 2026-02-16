/**
 * Integration Tests: Stripe API Integration (Mocked)
 *
 * Test ID: IT-STRIPE-001 to IT-STRIPE-007
 * Coverage: Stripe API integration with mocked responses
 * Focus: Error handling, network failures, API response parsing
 *
 * Tests verify fetchStripePaymentMethodConfigs/Config function behavior
 * by mocking the getStripeServer dependency via vi.mock().
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetStripeServer } = vi.hoisted(() => ({
  mockGetStripeServer: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: mockGetStripeServer,
}));

const { fetchStripePaymentMethodConfigs, fetchStripePaymentMethodConfig } =
  await import('@/lib/stripe/payment-method-configs');

describe('Stripe API Integration - Mocked', () => {
  beforeEach(() => {
    mockGetStripeServer.mockReset();
  });

  describe('fetchStripePaymentMethodConfigs', () => {
    // IT-STRIPE-001: Success with valid PMC list
    it('should return success with valid PMC list', async () => {
      const mockConfigs = [
        {
          id: 'pmc_test123',
          name: 'Default Config',
          active: true,
          livemode: false,
          created: Date.now(),
          card: { enabled: true },
          blik: { enabled: true },
        },
        {
          id: 'pmc_test456',
          name: 'EU Config',
          active: true,
          livemode: false,
          created: Date.now(),
          sepa_debit: { enabled: true },
          ideal: { enabled: true },
        },
      ];

      const mockList = vi.fn(() => Promise.resolve({ data: mockConfigs }));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfigs);
      expect(result.error).toBeUndefined();
      expect(mockList).toHaveBeenCalledWith({ limit: 100 });
    });

    // IT-STRIPE-002: Empty list
    it('should return success with empty array when no PMCs exist', async () => {
      const mockList = vi.fn(() => Promise.resolve({ data: [] }));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    // IT-STRIPE-003: API error
    it('should return error when Stripe API throws error', async () => {
      const mockList = vi.fn(() => Promise.reject(new Error('Invalid API key')));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.data).toBeUndefined();
    });

    // IT-STRIPE-004: Network timeout (simulated)
    it('should return error on network timeout', async () => {
      const mockList = vi.fn(() => Promise.reject(new Error('Request timeout')));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    // IT-STRIPE-007: Stripe not configured
    it('should return error when Stripe is not configured', async () => {
      mockGetStripeServer.mockResolvedValue(null);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured. Please configure Stripe API keys in settings.');
    });
  });

  describe('fetchStripePaymentMethodConfig', () => {
    // IT-STRIPE-005: Valid ID
    it('should return success with PMC object for valid ID', async () => {
      const mockConfig = {
        id: 'pmc_test123',
        name: 'Test Config',
        active: true,
        livemode: false,
        created: Date.now(),
        card: { enabled: true },
      };

      const mockRetrieve = vi.fn(() => Promise.resolve(mockConfig));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { retrieve: mockRetrieve },
      } as any);

      const result = await fetchStripePaymentMethodConfig('pmc_test123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockRetrieve).toHaveBeenCalledWith('pmc_test123');
    });

    // IT-STRIPE-006: Invalid ID (404)
    it('should return error for invalid PMC ID', async () => {
      const mockRetrieve = vi.fn(() =>
        Promise.reject(new Error('No such payment_method_configuration'))
      );
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { retrieve: mockRetrieve },
      } as any);

      const result = await fetchStripePaymentMethodConfig('pmc_invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No such payment_method_configuration');
    });

    // IT-STRIPE-007: Stripe not configured
    it('should return error when Stripe is not configured', async () => {
      mockGetStripeServer.mockResolvedValue(null);

      const result = await fetchStripePaymentMethodConfig('pmc_test123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle non-Error exceptions', async () => {
      const mockList = vi.fn(() => Promise.reject('String error'));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle undefined/null errors', async () => {
      const mockList = vi.fn(() => Promise.reject(null));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle Stripe rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).type = 'StripeRateLimitError';

      const mockList = vi.fn(() => Promise.reject(rateLimitError));
      mockGetStripeServer.mockResolvedValue({
        paymentMethodConfigurations: { list: mockList },
      } as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });
  });
});
