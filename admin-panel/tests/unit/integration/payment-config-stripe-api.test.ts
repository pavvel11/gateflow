/**
 * Integration Tests: Stripe API Integration (Mocked)
 *
 * Test ID: IT-STRIPE-001 to IT-STRIPE-007
 * Coverage: Stripe API integration with mocked responses
 * Focus: Error handling, network failures, API response parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchStripePaymentMethodConfigs,
  fetchStripePaymentMethodConfig,
} from '@/lib/stripe/payment-method-configs';

// Mock Stripe server module
vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: vi.fn(),
}));

import { getStripeServer } from '@/lib/stripe/server';

describe('Stripe API Integration - Mocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockResolvedValue({
            data: mockConfigs,
          }),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfigs);
      expect(result.error).toBeUndefined();
      expect(mockStripe.paymentMethodConfigurations.list).toHaveBeenCalledWith({ limit: 100 });
    });

    // IT-STRIPE-002: Empty list
    it('should return success with empty array when no PMCs exist', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockResolvedValue({
            data: [],
          }),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    // IT-STRIPE-003: API error
    it('should return error when Stripe API throws error', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.data).toBeUndefined();
    });

    // IT-STRIPE-004: Network timeout (simulated)
    it('should return error on network timeout', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockRejectedValue(new Error('Request timeout')),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    // IT-STRIPE-007: Stripe not configured
    it('should return error when Stripe is not configured', async () => {
      vi.mocked(getStripeServer).mockResolvedValue(null);

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

      const mockStripe = {
        paymentMethodConfigurations: {
          retrieve: vi.fn().mockResolvedValue(mockConfig),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfig('pmc_test123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockStripe.paymentMethodConfigurations.retrieve).toHaveBeenCalledWith('pmc_test123');
    });

    // IT-STRIPE-006: Invalid ID (404)
    it('should return error for invalid PMC ID', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          retrieve: vi.fn().mockRejectedValue(new Error('No such payment_method_configuration')),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfig('pmc_invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No such payment_method_configuration');
    });

    // IT-STRIPE-007: Stripe not configured
    it('should return error when Stripe is not configured', async () => {
      vi.mocked(getStripeServer).mockResolvedValue(null);

      const result = await fetchStripePaymentMethodConfig('pmc_test123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripe not configured');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle non-Error exceptions', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockRejectedValue('String error'),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle undefined/null errors', async () => {
      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockRejectedValue(null),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle Stripe rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).type = 'StripeRateLimitError';

      const mockStripe = {
        paymentMethodConfigurations: {
          list: vi.fn().mockRejectedValue(rateLimitError),
        },
      };

      vi.mocked(getStripeServer).mockResolvedValue(mockStripe as any);

      const result = await fetchStripePaymentMethodConfigs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });
  });
});
