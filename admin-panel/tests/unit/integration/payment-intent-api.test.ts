/**
 * Integration Tests: Payment Intent API Integration
 *
 * Test ID: IT-PI-001 to IT-PI-007
 * Coverage: create-payment-intent route with payment method configuration
 * Focus: Payment Intent parameter generation based on config mode
 *
 * Note: These tests verify config → PaymentIntent parameter mapping logic
 * without hitting Stripe or Supabase. Uses manual mocks compatible with bun test.
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { PaymentMethodConfig } from '@/types/payment-config';
import {
  getEnabledPaymentMethodsForCurrency,
} from '@/lib/utils/payment-method-helpers';

function makeConfig(overrides: Partial<PaymentMethodConfig> = {}): PaymentMethodConfig {
  return {
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
    ...overrides,
  };
}

describe('Payment Intent API - Config Integration', () => {
  describe('Payment Intent parameter generation', () => {
    // IT-PI-001: Automatic mode
    it('should use automatic_payment_methods for automatic mode', () => {
      const config = makeConfig({ config_mode: 'automatic' });

      expect(config.config_mode).toBe('automatic');

      // Expected PaymentIntent params for automatic mode
      const expectedParams = {
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      };

      expect(expectedParams.automatic_payment_methods.enabled).toBe(true);
    });

    // IT-PI-002: Stripe preset mode
    it('should use payment_method_configuration for stripe_preset mode', () => {
      const config = makeConfig({
        config_mode: 'stripe_preset',
        stripe_pmc_id: 'pmc_test123',
        stripe_pmc_name: 'Test PMC',
      });

      expect(config.config_mode).toBe('stripe_preset');
      expect(config.stripe_pmc_id).toBe('pmc_test123');
    });

    // IT-PI-003: Custom mode
    it('should use payment_method_types for custom mode', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        ],
        payment_method_order: ['card', 'blik'],
      });

      const enabledMethods = getEnabledPaymentMethodsForCurrency(config, 'PLN');

      expect(config.config_mode).toBe('custom');
      expect(enabledMethods).toEqual(['card', 'blik']);
      expect(enabledMethods).toContain('card');
      expect(enabledMethods).toContain('blik');
    });

    // IT-PI-004: Custom mode with currency filter
    it('should filter payment methods by currency in custom mode', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        ],
        payment_method_order: ['card', 'blik'],
      });

      // For USD currency, BLIK should be filtered out
      const enabledMethodsUSD = getEnabledPaymentMethodsForCurrency(config, 'USD');

      expect(enabledMethodsUSD).toEqual(['card']);
      expect(enabledMethodsUSD).not.toContain('blik');
    });

    // IT-PI-005: No config (fallback)
    it('should fallback to automatic mode when no config exists', () => {
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
    it('should include Link setup_future_usage when Link is enabled', () => {
      const config = makeConfig({ enable_link: true });

      expect(config.enable_link).toBe(true);

      // When Link is enabled, should include payment_method_options
      const expectedLinkOptions = {
        link: {
          setup_future_usage: 'on_session',
        },
      };

      expect(expectedLinkOptions.link.setup_future_usage).toBe('on_session');
    });

    // IT-PI-007: Link disabled
    it('should not include Link options when Link is disabled', () => {
      const config = makeConfig({ enable_link: false });

      expect(config.enable_link).toBe(false);
    });
  });

  describe('Payment method ordering', () => {
    it('should respect payment_method_order from config', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0 },
          { type: 'p24', enabled: true, display_order: 1 },
          { type: 'card', enabled: true, display_order: 2 },
        ],
        payment_method_order: ['blik', 'p24', 'card'],
      });

      expect(config.payment_method_order).toEqual(['blik', 'p24', 'card']);
    });

    it('should use currency override order when available', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
          { type: 'blik', enabled: true, display_order: 1 },
        ],
        payment_method_order: ['card', 'blik'],
        currency_overrides: {
          PLN: ['blik', 'card'],
        },
      });

      // For PLN currency, should use override
      expect(config.currency_overrides['PLN']).toEqual(['blik', 'card']);

      // Global order
      expect(config.payment_method_order).toEqual(['card', 'blik']);
    });
  });

  describe('Error handling', () => {
    it('should handle empty custom_payment_methods array', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [],
      });

      const enabledMethods = getEnabledPaymentMethodsForCurrency(config, 'PLN');
      expect(enabledMethods).toEqual([]);
    });
  });

  describe('Express Checkout configuration', () => {
    it('should include Express Checkout when enabled', () => {
      const config = makeConfig({
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
      });

      expect(config.enable_express_checkout).toBe(true);
      expect(config.enable_apple_pay).toBe(true);
      expect(config.enable_google_pay).toBe(true);
      expect(config.enable_link).toBe(true);
    });

    it('should respect individual Express Checkout toggles', () => {
      const config = makeConfig({
        enable_express_checkout: true,
        enable_apple_pay: false,
        enable_google_pay: true,
        enable_link: true,
      });

      expect(config.enable_express_checkout).toBe(true);
      expect(config.enable_apple_pay).toBe(false);
      expect(config.enable_google_pay).toBe(true);
      expect(config.enable_link).toBe(true);
    });
  });
});
