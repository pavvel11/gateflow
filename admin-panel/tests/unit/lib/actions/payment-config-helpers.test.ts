/**
 * Unit Tests: Payment Config Server Actions Helpers
 *
 * Test ID: UT-ACTION-001 to UT-ACTION-007
 * Coverage: Helper functions for payment method ordering and filtering
 * Technique: Decision Table Testing, Equivalence Partitioning, Boundary Value Analysis
 */

import { describe, it, expect } from 'vitest';
import {
  getEffectivePaymentMethodOrder,
  getEnabledPaymentMethodsForCurrency,
} from '@/lib/utils/payment-method-helpers';
import type { PaymentMethodConfig, PaymentMethodMetadata } from '@/types/payment-config';

describe('payment-config-helpers', () => {
  describe('getEffectivePaymentMethodOrder', () => {
    // UT-ACTION-001: Currency override exists (Decision Table)
    it('should return currency-specific order when override exists', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: ['card', 'p24', 'blik'],
        currency_overrides: {
          PLN: ['blik', 'p24', 'card'],
          EUR: ['sepa_debit', 'ideal', 'card'],
        },
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = getEffectivePaymentMethodOrder(config, 'PLN');
      expect(result).toEqual(['blik', 'p24', 'card']);
    });

    // UT-ACTION-002: No override (Decision Table)
    it('should return global order when no currency override exists', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: ['card', 'p24', 'blik'],
        currency_overrides: {
          EUR: ['sepa_debit', 'ideal', 'card'],
        },
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = getEffectivePaymentMethodOrder(config, 'PLN');
      expect(result).toEqual(['card', 'p24', 'blik']);
    });

    // UT-ACTION-003: Empty overrides (BVA - Empty)
    it('should return global order when currency_overrides is empty', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
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

      const result = getEffectivePaymentMethodOrder(config, 'PLN');
      expect(result).toEqual(['card', 'blik']);
    });

    it('should be case insensitive for currency code', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: ['card'],
        currency_overrides: {
          PLN: ['blik', 'card'],
        },
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(getEffectivePaymentMethodOrder(config, 'pln')).toEqual(['blik', 'card']);
      expect(getEffectivePaymentMethodOrder(config, 'Pln')).toEqual(['blik', 'card']);
      expect(getEffectivePaymentMethodOrder(config, 'PLN')).toEqual(['blik', 'card']);
    });

    it('should return empty array when payment_method_order is empty and no override', () => {
      const config: PaymentMethodConfig = {
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

      expect(getEffectivePaymentMethodOrder(config, 'USD')).toEqual([]);
    });

    it('should handle multiple currency overrides correctly', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [],
        payment_method_order: ['card'],
        currency_overrides: {
          PLN: ['blik', 'p24'],
          EUR: ['sepa_debit', 'ideal'],
          USD: ['card', 'cashapp'],
        },
        enable_express_checkout: true,
        enable_apple_pay: true,
        enable_google_pay: true,
        enable_link: true,
        available_payment_methods: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(getEffectivePaymentMethodOrder(config, 'PLN')).toEqual(['blik', 'p24']);
      expect(getEffectivePaymentMethodOrder(config, 'EUR')).toEqual(['sepa_debit', 'ideal']);
      expect(getEffectivePaymentMethodOrder(config, 'USD')).toEqual(['card', 'cashapp']);
      expect(getEffectivePaymentMethodOrder(config, 'GBP')).toEqual(['card']); // Fallback
    });
  });

  describe('getEnabledPaymentMethodsForCurrency', () => {
    // UT-ACTION-004: Custom mode (EP - Valid)
    it('should return filtered and sorted payment methods for custom mode', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: true,
            display_order: 2,
            currency_restrictions: [],
          },
          {
            type: 'blik',
            enabled: true,
            display_order: 0,
            currency_restrictions: ['PLN'],
          },
          {
            type: 'p24',
            enabled: true,
            display_order: 1,
            currency_restrictions: ['PLN', 'EUR'],
          },
        ],
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

      const result = getEnabledPaymentMethodsForCurrency(config, 'PLN');

      // Should return methods in display_order: blik (0), p24 (1), card (2)
      expect(result).toEqual(['blik', 'p24', 'card']);
    });

    // UT-ACTION-005: Non-custom mode (Decision Table)
    it('should return empty array for non-custom mode (automatic)', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'automatic',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: true,
            display_order: 0,
          },
        ],
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

      const result = getEnabledPaymentMethodsForCurrency(config, 'PLN');
      expect(result).toEqual([]);
    });

    it('should return empty array for non-custom mode (stripe_preset)', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'stripe_preset',
        stripe_pmc_id: 'pmc_12345',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: true,
            display_order: 0,
          },
        ],
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

      const result = getEnabledPaymentMethodsForCurrency(config, 'USD');
      expect(result).toEqual([]);
    });

    // UT-ACTION-006: All disabled (BVA - Zero)
    it('should return empty array when all methods are disabled', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: false,
            display_order: 0,
          },
          {
            type: 'blik',
            enabled: false,
            display_order: 1,
          },
        ],
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

      const result = getEnabledPaymentMethodsForCurrency(config, 'PLN');
      expect(result).toEqual([]);
    });

    // UT-ACTION-007: Currency filter (EP - Filter)
    it('should filter out methods that do not support the currency', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: true,
            display_order: 0,
            currency_restrictions: [], // All currencies
          },
          {
            type: 'blik',
            enabled: true,
            display_order: 1,
            currency_restrictions: ['PLN'], // PLN only
          },
          {
            type: 'sepa_debit',
            enabled: true,
            display_order: 2,
            currency_restrictions: ['EUR'], // EUR only
          },
        ],
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

      const resultUSD = getEnabledPaymentMethodsForCurrency(config, 'USD');
      // Only card (no currency restrictions)
      expect(resultUSD).toEqual(['card']);

      const resultPLN = getEnabledPaymentMethodsForCurrency(config, 'PLN');
      // Card + BLIK
      expect(resultPLN).toEqual(['card', 'blik']);

      const resultEUR = getEnabledPaymentMethodsForCurrency(config, 'EUR');
      // Card + SEPA
      expect(resultEUR).toEqual(['card', 'sepa_debit']);
    });

    it('should be case insensitive for currency code in filtering', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'blik',
            enabled: true,
            display_order: 0,
            currency_restrictions: ['PLN'],
          },
        ],
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

      expect(getEnabledPaymentMethodsForCurrency(config, 'pln')).toEqual(['blik']);
      expect(getEnabledPaymentMethodsForCurrency(config, 'Pln')).toEqual(['blik']);
      expect(getEnabledPaymentMethodsForCurrency(config, 'PLN')).toEqual(['blik']);
    });

    it('should handle empty custom_payment_methods array', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
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

      expect(getEnabledPaymentMethodsForCurrency(config, 'PLN')).toEqual([]);
    });

    it('should correctly sort by display_order', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'card',
            enabled: true,
            display_order: 5,
          },
          {
            type: 'blik',
            enabled: true,
            display_order: 1,
          },
          {
            type: 'p24',
            enabled: true,
            display_order: 3,
          },
        ],
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

      const result = getEnabledPaymentMethodsForCurrency(config, 'USD');
      // Should be sorted: blik (1), p24 (3), card (5)
      expect(result).toEqual(['blik', 'p24', 'card']);
    });

    it('should handle multiple currency restrictions per method', () => {
      const config: PaymentMethodConfig = {
        id: 1,
        config_mode: 'custom',
        custom_payment_methods: [
          {
            type: 'p24',
            enabled: true,
            display_order: 0,
            currency_restrictions: ['PLN', 'EUR'],
          },
          {
            type: 'klarna',
            enabled: true,
            display_order: 1,
            currency_restrictions: ['USD', 'EUR', 'GBP'],
          },
        ],
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

      expect(getEnabledPaymentMethodsForCurrency(config, 'PLN')).toEqual(['p24']);
      expect(getEnabledPaymentMethodsForCurrency(config, 'EUR')).toEqual(['p24', 'klarna']);
      expect(getEnabledPaymentMethodsForCurrency(config, 'USD')).toEqual(['klarna']);
      expect(getEnabledPaymentMethodsForCurrency(config, 'GBP')).toEqual(['klarna']);
    });
  });
});
