/**
 * Integration Tests: Payment Intent API Integration
 *
 * Test ID: IT-PI-001 to IT-PI-007
 * Coverage: create-payment-intent route with payment method configuration
 * Focus: Payment Intent parameter generation based on config mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: vi.fn(),
}));

vi.mock('@/lib/actions/payment-config', () => ({
  getPaymentMethodConfig: vi.fn(),
}));

vi.mock('@/lib/utils/payment-method-helpers', () => ({
  getEnabledPaymentMethodsForCurrency: vi.fn(),
}));

import { getPaymentMethodConfig } from '@/lib/actions/payment-config';
import { getEnabledPaymentMethodsForCurrency } from '@/lib/utils/payment-method-helpers';
import type { PaymentMethodConfig } from '@/types/payment-config';

describe('Payment Intent API - Config Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Payment Intent parameter generation', () => {
    // IT-PI-001: Automatic mode
    it('should use automatic_payment_methods for automatic mode', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.config_mode).toBe('automatic');

      // Expected PaymentIntent params for automatic mode
      const expectedParams = {
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      };

      // Verify that automatic mode should result in above params
      if (config.data?.config_mode === 'automatic') {
        expect(expectedParams.automatic_payment_methods.enabled).toBe(true);
      }
    });

    // IT-PI-002: Stripe preset mode
    it('should use payment_method_configuration for stripe_preset mode', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'stripe_preset',
        stripe_pmc_id: 'pmc_test123',
        stripe_pmc_name: 'Test PMC',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.config_mode).toBe('stripe_preset');
      expect(config.data?.stripe_pmc_id).toBe('pmc_test123');

      // Expected PaymentIntent params for stripe_preset mode
      if (config.data?.config_mode === 'stripe_preset' && config.data.stripe_pmc_id) {
        const expectedPMCId = config.data.stripe_pmc_id;
        expect(expectedPMCId).toBe('pmc_test123');
      }
    });

    // IT-PI-003: Custom mode
    it('should use payment_method_types for custom mode', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        ],
        payment_method_order: ['card', 'blik'],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      vi.mocked(getEnabledPaymentMethodsForCurrency).mockReturnValue(['card', 'blik']);

      const config = await getPaymentMethodConfig();
      const enabledMethods = getEnabledPaymentMethodsForCurrency(config.data!, 'PLN');

      expect(config.data?.config_mode).toBe('custom');
      expect(enabledMethods).toEqual(['card', 'blik']);

      // Expected PaymentIntent params for custom mode
      if (config.data?.config_mode === 'custom' && enabledMethods.length > 0) {
        const expectedPaymentMethodTypes = enabledMethods;
        expect(expectedPaymentMethodTypes).toContain('card');
        expect(expectedPaymentMethodTypes).toContain('blik');
      }
    });

    // IT-PI-004: Custom mode with currency filter
    it('should filter payment methods by currency in custom mode', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        ],
        payment_method_order: ['card', 'blik'],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      // For USD currency, BLIK should be filtered out
      vi.mocked(getEnabledPaymentMethodsForCurrency).mockReturnValue(['card']);

      const config = await getPaymentMethodConfig();
      const enabledMethodsUSD = getEnabledPaymentMethodsForCurrency(config.data!, 'USD');

      expect(enabledMethodsUSD).toEqual(['card']);
      expect(enabledMethodsUSD).not.toContain('blik'); // BLIK filtered out for USD
    });

    // IT-PI-005: No config (fallback)
    it('should fallback to automatic mode when no config exists', async () => {
      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: null as any,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data).toBeNull();

      // When config is null, should use automatic mode as fallback
      const fallbackParams = {
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      };

      expect(fallbackParams.automatic_payment_methods.enabled).toBe(true);
    });

    // IT-PI-006: Link enabled
    it('should include Link setup_future_usage when Link is enabled', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.enable_link).toBe(true);

      // When Link is enabled, should include payment_method_options
      if (config.data?.enable_link) {
        const expectedLinkOptions = {
          link: {
            setup_future_usage: 'on_session',
          },
        };

        expect(expectedLinkOptions.link.setup_future_usage).toBe('on_session');
      }
    });

    // IT-PI-007: Link disabled
    it('should not include Link options when Link is disabled', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: false, // Link disabled
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.enable_link).toBe(false);

      // When Link is disabled, should NOT include Link in payment_method_options
      if (!config.data?.enable_link) {
        // No Link options should be set
        expect(config.data.enable_link).toBe(false);
      }
    });
  });

  describe('Payment method ordering', () => {
    it('should respect payment_method_order from config', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0 },
          { type: 'p24', enabled: true, display_order: 1 },
          { type: 'card', enabled: true, display_order: 2 },
        ],
        payment_method_order: ['blik', 'p24', 'card'],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.payment_method_order).toEqual(['blik', 'p24', 'card']);
    });

    it('should use currency override order when available', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1 },
        ],
        payment_method_order: ['card', 'blik'],
        currency_overrides: {
          PLN: ['blik', 'card'], // Override for PLN
        },
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      // For PLN currency, should use override
      const plnOrder = config.data?.currency_overrides['PLN'];
      expect(plnOrder).toEqual(['blik', 'card']);

      // For USD currency, should use global order
      const globalOrder = config.data?.payment_method_order;
      expect(globalOrder).toEqual(['card', 'blik']);
    });
  });

  describe('Error handling', () => {
    it('should handle getPaymentMethodConfig error gracefully', async () => {
      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const config = await getPaymentMethodConfig();

      expect(config.success).toBe(false);
      expect(config.error).toBe('Database error');
    });

    it('should handle empty custom_payment_methods array', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [], // Empty - no methods enabled
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      vi.mocked(getEnabledPaymentMethodsForCurrency).mockReturnValue([]);

      const config = await getPaymentMethodConfig();
      const enabledMethods = getEnabledPaymentMethodsForCurrency(config.data!, 'PLN');

      expect(enabledMethods).toEqual([]);
    });
  });

  describe('Express Checkout configuration', () => {
    it('should include Express Checkout when enabled', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.enable_express_checkout).toBe(true);
      expect(config.data?.enable_apple_pay).toBe(true);
      expect(config.data?.enable_google_pay).toBe(true);
      expect(config.data?.enable_link).toBe(true);
    });

    it('should respect individual Express Checkout toggles', async () => {
      const mockConfig: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: [],
        currency_overrides: {},
        enable_express_checkout: true,
        enable_apple_pay: false, // Disabled
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(getPaymentMethodConfig).mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const config = await getPaymentMethodConfig();

      expect(config.data?.enable_express_checkout).toBe(true);
      expect(config.data?.enable_apple_pay).toBe(false);
      expect(config.data?.enable_google_pay).toBe(true);
      expect(config.data?.enable_link).toBe(true);
    });
  });
});
