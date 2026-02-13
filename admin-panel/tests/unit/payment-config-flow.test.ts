/**
 * Payment Config Flow Tests
 *
 * Tests the full payment configuration flow:
 * - extractExpressCheckoutConfig: DB config → frontend props
 * - getEffectivePaymentConfig: product override → global config resolution
 * - create-payment-intent logic: config_mode → Stripe PaymentIntent params
 *
 * These tests verify that admin panel config correctly propagates
 * to checkout behavior without hitting Stripe or Supabase.
 */

import { describe, it, expect } from 'vitest';
import {
  extractExpressCheckoutConfig,
  isPaymentMethodValidForCurrency,
  getEffectivePaymentConfig,
  type PaymentMethodConfig,
  type ExpressCheckoutConfig,
  type ProductPaymentConfigOverride,
} from '@/types/payment-config';
import {
  getEffectivePaymentMethodOrder,
  getEnabledPaymentMethodsForCurrency,
} from '@/lib/utils/payment-method-helpers';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

/**
 * Simulates the create-payment-intent logic that builds PaymentIntent params
 * from payment config. Extracted from route.ts for testability.
 */
function buildPaymentIntentConfig(config: PaymentMethodConfig | null, currency: string) {
  const params: Record<string, any> = {};

  function applyAutomatic() {
    params.automatic_payment_methods = { enabled: true, allow_redirects: 'always' };
  }

  if (config) {
    switch (config.config_mode) {
      case 'automatic':
        applyAutomatic();
        break;
      case 'stripe_preset':
        if (config.stripe_pmc_id) {
          params.payment_method_configuration = config.stripe_pmc_id;
        } else {
          applyAutomatic();
        }
        break;
      case 'custom': {
        const enabledMethods = getEnabledPaymentMethodsForCurrency(config, currency);
        if (enabledMethods.length > 0) {
          params.payment_method_types = enabledMethods;
        } else {
          applyAutomatic();
        }
        break;
      }
    }
  } else {
    applyAutomatic();
  }

  return params;
}

// ---------------------------------------------------------------------------
// extractExpressCheckoutConfig
// ---------------------------------------------------------------------------

describe('extractExpressCheckoutConfig', () => {
  it('should return all-enabled defaults when config is null', () => {
    const result = extractExpressCheckoutConfig(null);
    expect(result).toEqual({
      enabled: true,
      applePay: true,
      googlePay: true,
      link: true,
    });
  });

  it('should return all-enabled defaults when config is undefined', () => {
    const result = extractExpressCheckoutConfig(undefined);
    expect(result).toEqual({
      enabled: true,
      applePay: true,
      googlePay: true,
      link: true,
    });
  });

  it('should map DB fields to frontend ExpressCheckoutConfig', () => {
    const config = makeConfig({
      enable_express_checkout: true,
      enable_apple_pay: false,
      enable_google_pay: true,
      enable_link: false,
    });

    const result = extractExpressCheckoutConfig(config);
    expect(result).toEqual({
      enabled: true,
      applePay: false,
      googlePay: true,
      link: false,
    });
  });

  it('should respect master toggle being disabled', () => {
    const config = makeConfig({
      enable_express_checkout: false,
      enable_apple_pay: true,
      enable_google_pay: true,
      enable_link: true,
    });

    const result = extractExpressCheckoutConfig(config);
    expect(result.enabled).toBe(false);
  });

  it('should handle all toggles disabled', () => {
    const config = makeConfig({
      enable_express_checkout: false,
      enable_apple_pay: false,
      enable_google_pay: false,
      enable_link: false,
    });

    const result = extractExpressCheckoutConfig(config);
    expect(result).toEqual({
      enabled: false,
      applePay: false,
      googlePay: false,
      link: false,
    });
  });
});

// ---------------------------------------------------------------------------
// getEffectivePaymentConfig (product override resolution)
// ---------------------------------------------------------------------------

describe('getEffectivePaymentConfig', () => {
  it('should return global config when no product override exists', () => {
    const global = makeConfig({ config_mode: 'automatic' });
    const result = getEffectivePaymentConfig(global, null);
    expect(result.config_mode).toBe('automatic');
  });

  it('should return global config when product override is disabled', () => {
    const global = makeConfig({ config_mode: 'automatic' });
    const override: ProductPaymentConfigOverride = {
      override_enabled: false,
      config_mode: 'custom',
      custom_payment_methods: [{ type: 'card', enabled: true, display_order: 0 }],
    };

    const result = getEffectivePaymentConfig(global, override);
    expect(result.config_mode).toBe('automatic');
  });

  it('should use product override when enabled', () => {
    const global = makeConfig({ config_mode: 'automatic', enable_link: true });
    const override: ProductPaymentConfigOverride = {
      override_enabled: true,
      config_mode: 'custom',
      custom_payment_methods: [{ type: 'blik', enabled: true, display_order: 0 }],
      enable_link: false,
    };

    const result = getEffectivePaymentConfig(global, override);
    expect(result.config_mode).toBe('custom');
    expect(result.enable_link).toBe(false);
  });

  it('should merge override with global (override fields take precedence)', () => {
    const global = makeConfig({
      config_mode: 'automatic',
      enable_apple_pay: true,
      enable_google_pay: true,
    });
    const override: ProductPaymentConfigOverride = {
      override_enabled: true,
      config_mode: 'stripe_preset',
      stripe_pmc_id: 'pmc_product123',
      enable_google_pay: false,
    };

    const result = getEffectivePaymentConfig(global, override);
    expect(result.config_mode).toBe('stripe_preset');
    expect(result.stripe_pmc_id).toBe('pmc_product123');
    expect(result.enable_apple_pay).toBe(true); // from global
    expect(result.enable_google_pay).toBe(false); // from override
  });
});

// ---------------------------------------------------------------------------
// create-payment-intent config logic (simulated)
// ---------------------------------------------------------------------------

describe('create-payment-intent config logic', () => {
  describe('automatic mode', () => {
    it('should use automatic_payment_methods', () => {
      const config = makeConfig({ config_mode: 'automatic' });
      const params = buildPaymentIntentConfig(config, 'PLN');

      expect(params.automatic_payment_methods).toEqual({
        enabled: true,
        allow_redirects: 'always',
      });
      expect(params.payment_method_types).toBeUndefined();
      expect(params.payment_method_configuration).toBeUndefined();
    });
  });

  describe('stripe_preset mode', () => {
    it('should set payment_method_configuration when PMC ID exists', () => {
      const config = makeConfig({
        config_mode: 'stripe_preset',
        stripe_pmc_id: 'pmc_test123456',
      });
      const params = buildPaymentIntentConfig(config, 'PLN');

      expect(params.payment_method_configuration).toBe('pmc_test123456');
      expect(params.automatic_payment_methods).toBeUndefined();
      expect(params.payment_method_types).toBeUndefined();
    });

    it('should fallback to automatic when PMC ID is null', () => {
      const config = makeConfig({
        config_mode: 'stripe_preset',
        stripe_pmc_id: null,
      });
      const params = buildPaymentIntentConfig(config, 'PLN');

      expect(params.automatic_payment_methods).toEqual({
        enabled: true,
        allow_redirects: 'always',
      });
      expect(params.payment_method_configuration).toBeUndefined();
    });
  });

  describe('custom mode', () => {
    it('should set payment_method_types for matching currency', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
          { type: 'card', enabled: true, display_order: 1, currency_restrictions: [] },
          { type: 'sepa_debit', enabled: true, display_order: 2, currency_restrictions: ['EUR'] },
        ],
      });

      const paramsPLN = buildPaymentIntentConfig(config, 'PLN');
      expect(paramsPLN.payment_method_types).toEqual(['blik', 'card']);
      expect(paramsPLN.automatic_payment_methods).toBeUndefined();

      const paramsEUR = buildPaymentIntentConfig(config, 'EUR');
      expect(paramsEUR.payment_method_types).toEqual(['card', 'sepa_debit']);
    });

    it('should fallback to automatic when no methods match currency', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        ],
      });

      const params = buildPaymentIntentConfig(config, 'USD');
      expect(params.automatic_payment_methods).toEqual({
        enabled: true,
        allow_redirects: 'always',
      });
      expect(params.payment_method_types).toBeUndefined();
    });

    it('should fallback to automatic when all methods are disabled', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: false, display_order: 0 },
          { type: 'blik', enabled: false, display_order: 1 },
        ],
      });

      const params = buildPaymentIntentConfig(config, 'PLN');
      expect(params.automatic_payment_methods).toBeDefined();
      expect(params.payment_method_types).toBeUndefined();
    });

    it('should respect display_order in payment_method_types', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
          { type: 'p24', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
          { type: 'blik', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        ],
      });

      const params = buildPaymentIntentConfig(config, 'PLN');
      expect(params.payment_method_types).toEqual(['p24', 'blik', 'card']);
    });
  });

  describe('null/missing config', () => {
    it('should fallback to automatic when config is null', () => {
      const params = buildPaymentIntentConfig(null, 'PLN');
      expect(params.automatic_payment_methods).toEqual({
        enabled: true,
        allow_redirects: 'always',
      });
    });
  });

  describe('mutual exclusivity of Stripe params', () => {
    it('automatic mode: only automatic_payment_methods is set', () => {
      const params = buildPaymentIntentConfig(makeConfig({ config_mode: 'automatic' }), 'PLN');
      expect(params.automatic_payment_methods).toBeDefined();
      expect(params.payment_method_types).toBeUndefined();
      expect(params.payment_method_configuration).toBeUndefined();
    });

    it('stripe_preset mode: only payment_method_configuration is set', () => {
      const config = makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: 'pmc_abc123def' });
      const params = buildPaymentIntentConfig(config, 'PLN');
      expect(params.payment_method_configuration).toBeDefined();
      expect(params.automatic_payment_methods).toBeUndefined();
      expect(params.payment_method_types).toBeUndefined();
    });

    it('custom mode: only payment_method_types is set', () => {
      const config = makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'card', enabled: true, display_order: 0 },
        ],
      });
      const params = buildPaymentIntentConfig(config, 'PLN');
      expect(params.payment_method_types).toBeDefined();
      expect(params.automatic_payment_methods).toBeUndefined();
      expect(params.payment_method_configuration).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Full checkout config pipeline
// ---------------------------------------------------------------------------

describe('full checkout config pipeline', () => {
  it('automatic mode: PaymentIntent uses automatic + express checkout all enabled', () => {
    const config = makeConfig({ config_mode: 'automatic' });

    // Server-side: PaymentIntent params
    const piParams = buildPaymentIntentConfig(config, 'PLN');
    expect(piParams.automatic_payment_methods).toBeDefined();

    // Client-side: Express checkout config
    const expressConfig = extractExpressCheckoutConfig(config);
    expect(expressConfig.enabled).toBe(true);
    expect(expressConfig.link).toBe(true);

    // Client-side: Payment method order (empty for automatic — Stripe decides)
    const order = getEffectivePaymentMethodOrder(config, 'PLN');
    expect(order).toEqual([]);
  });

  it('custom mode PLN: BLIK first, card second + Link enabled', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: true, display_order: 1, currency_restrictions: ['PLN', 'EUR'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
      payment_method_order: ['blik', 'p24', 'card'],
      enable_link: true,
    });

    // Server-side
    const piParams = buildPaymentIntentConfig(config, 'PLN');
    expect(piParams.payment_method_types).toEqual(['blik', 'p24', 'card']);

    // Client-side order
    const order = getEffectivePaymentMethodOrder(config, 'PLN');
    expect(order).toEqual(['blik', 'p24', 'card']);

    // Express checkout
    const expressConfig = extractExpressCheckoutConfig(config);
    expect(expressConfig.link).toBe(true);
  });

  it('custom mode EUR: filters out PLN-only methods', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'sepa_debit', enabled: true, display_order: 1, currency_restrictions: ['EUR'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
      currency_overrides: { EUR: ['sepa_debit', 'card'] },
    });

    // Server-side: BLIK filtered out for EUR
    const piParams = buildPaymentIntentConfig(config, 'EUR');
    expect(piParams.payment_method_types).toEqual(['sepa_debit', 'card']);
    expect(piParams.payment_method_types).not.toContain('blik');

    // Client-side: currency override used
    const order = getEffectivePaymentMethodOrder(config, 'EUR');
    expect(order).toEqual(['sepa_debit', 'card']);
  });

  it('stripe_preset mode: PMC ID propagated, express checkout configurable', () => {
    const config = makeConfig({
      config_mode: 'stripe_preset',
      stripe_pmc_id: 'pmc_production_eu',
      enable_express_checkout: true,
      enable_apple_pay: true,
      enable_google_pay: false,
      enable_link: true,
    });

    // Server-side
    const piParams = buildPaymentIntentConfig(config, 'EUR');
    expect(piParams.payment_method_configuration).toBe('pmc_production_eu');

    // Express checkout toggles
    const expressConfig = extractExpressCheckoutConfig(config);
    expect(expressConfig.applePay).toBe(true);
    expect(expressConfig.googlePay).toBe(false);
    expect(expressConfig.link).toBe(true);
  });

  it('product override replaces global config in full pipeline', () => {
    const global = makeConfig({
      config_mode: 'automatic',
      enable_link: true,
    });
    const override: ProductPaymentConfigOverride = {
      override_enabled: true,
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'card', enabled: true, display_order: 0 },
      ],
      payment_method_order: ['card'],
      enable_link: false,
    };

    const effective = getEffectivePaymentConfig(global, override);

    // Server-side: custom mode from override
    const piParams = buildPaymentIntentConfig(effective, 'USD');
    expect(piParams.payment_method_types).toEqual(['card']);

    // Express checkout: Link disabled by override
    const expressConfig = extractExpressCheckoutConfig(effective);
    expect(expressConfig.link).toBe(false);
  });

  it('graceful degradation: corrupted config falls back to automatic', () => {
    // Null config
    const params1 = buildPaymentIntentConfig(null, 'PLN');
    expect(params1.automatic_payment_methods).toBeDefined();

    // stripe_preset without PMC ID
    const params2 = buildPaymentIntentConfig(
      makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: null }),
      'PLN'
    );
    expect(params2.automatic_payment_methods).toBeDefined();

    // custom with no matching methods
    const params3 = buildPaymentIntentConfig(
      makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        ],
      }),
      'USD'
    );
    expect(params3.automatic_payment_methods).toBeDefined();

    // All three fallbacks produce consistent automatic config
    expect(params1).toEqual(params2);
    expect(params2).toEqual(params3);
  });
});
