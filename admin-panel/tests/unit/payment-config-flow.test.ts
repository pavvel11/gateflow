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
    link_display_mode: 'above',
    available_payment_methods: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Simulates the create-payment-intent logic that builds PaymentIntent params
 * from payment config. Must match route.ts behavior exactly, including
 * defensive cleanup of mutually exclusive Stripe fields.
 *
 * Stripe rejects PaymentIntents that combine any two of:
 * - automatic_payment_methods
 * - payment_method_types
 * - payment_method_configuration
 */
function buildPaymentIntentConfig(config: PaymentMethodConfig | null, currency: string) {
  const params: Record<string, any> = {};

  function applyAutomatic() {
    params.automatic_payment_methods = { enabled: true, allow_redirects: 'always' };
    delete params.payment_method_types;
    delete params.payment_method_configuration;
  }

  if (config) {
    switch (config.config_mode) {
      case 'automatic':
        applyAutomatic();
        break;
      case 'stripe_preset':
        if (config.stripe_pmc_id) {
          params.payment_method_configuration = config.stripe_pmc_id;
          delete params.automatic_payment_methods;
          delete params.payment_method_types;
        } else {
          applyAutomatic();
        }
        break;
      case 'custom': {
        const enabledMethods = getEnabledPaymentMethodsForCurrency(config, currency);
        if (enabledMethods.length > 0) {
          if (config.enable_link && !enabledMethods.includes('link')) {
            enabledMethods.push('link');
          }
          params.payment_method_types = enabledMethods;
          delete params.automatic_payment_methods;
          delete params.payment_method_configuration;
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
      linkDisplayMode: 'above',
    });
  });

  it('should return all-enabled defaults when config is undefined', () => {
    const result = extractExpressCheckoutConfig(undefined);
    expect(result).toEqual({
      enabled: true,
      applePay: true,
      googlePay: true,
      link: true,
      linkDisplayMode: 'above',
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
      linkDisplayMode: 'above',
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
      linkDisplayMode: 'above',
    });
  });

  it('should map link_display_mode to linkDisplayMode', () => {
    const configAbove = makeConfig({ link_display_mode: 'above' });
    expect(extractExpressCheckoutConfig(configAbove).linkDisplayMode).toBe('above');

    const configTab = makeConfig({ link_display_mode: 'tab' });
    expect(extractExpressCheckoutConfig(configTab).linkDisplayMode).toBe('tab');
  });

  it('should default linkDisplayMode to above when link_display_mode is missing', () => {
    const config = makeConfig();
    // Simulate missing field by deleting it
    delete (config as any).link_display_mode;
    const result = extractExpressCheckoutConfig(config);
    expect(result.linkDisplayMode).toBe('above');
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
      expect(paramsPLN.payment_method_types).toEqual(['blik', 'card', 'link']);
      expect(paramsPLN.automatic_payment_methods).toBeUndefined();

      const paramsEUR = buildPaymentIntentConfig(config, 'EUR');
      expect(paramsEUR.payment_method_types).toEqual(['card', 'sepa_debit', 'link']);
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
      expect(params.payment_method_types).toEqual(['p24', 'blik', 'card', 'link']);
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

    // Server-side: link appended because enable_link=true
    const piParams = buildPaymentIntentConfig(config, 'PLN');
    expect(piParams.payment_method_types).toEqual(['blik', 'p24', 'card', 'link']);

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

    // Server-side: BLIK filtered out for EUR, link appended (enable_link=true default)
    const piParams = buildPaymentIntentConfig(config, 'EUR');
    expect(piParams.payment_method_types).toEqual(['sepa_debit', 'card', 'link']);
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

// ---------------------------------------------------------------------------
// Stripe param mutual exclusivity - defensive cleanup
// ---------------------------------------------------------------------------

describe('Stripe param mutual exclusivity (defensive cleanup)', () => {
  it('every mode produces exactly one Stripe payment param', () => {
    const modes: Array<{ config: PaymentMethodConfig; label: string }> = [
      { config: makeConfig({ config_mode: 'automatic' }), label: 'automatic' },
      { config: makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: 'pmc_test12345' }), label: 'stripe_preset' },
      {
        config: makeConfig({
          config_mode: 'custom',
          custom_payment_methods: [{ type: 'card', enabled: true, display_order: 0 }],
        }),
        label: 'custom',
      },
    ];

    for (const { config, label } of modes) {
      const params = buildPaymentIntentConfig(config, 'PLN');
      const setFields = [
        params.automatic_payment_methods !== undefined,
        params.payment_method_types !== undefined,
        params.payment_method_configuration !== undefined,
      ].filter(Boolean);

      expect(setFields).toHaveLength(1);
    }
  });

  it('fallback paths also produce exactly one Stripe payment param', () => {
    const fallbackCases = [
      // null config
      buildPaymentIntentConfig(null, 'PLN'),
      // stripe_preset without PMC ID
      buildPaymentIntentConfig(makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: null }), 'PLN'),
      // custom with no matching methods for currency
      buildPaymentIntentConfig(
        makeConfig({
          config_mode: 'custom',
          custom_payment_methods: [{ type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] }],
        }),
        'USD'
      ),
      // custom with all methods disabled
      buildPaymentIntentConfig(
        makeConfig({
          config_mode: 'custom',
          custom_payment_methods: [{ type: 'card', enabled: false, display_order: 0 }],
        }),
        'PLN'
      ),
    ];

    for (const params of fallbackCases) {
      const setFields = [
        params.automatic_payment_methods !== undefined,
        params.payment_method_types !== undefined,
        params.payment_method_configuration !== undefined,
      ].filter(Boolean);

      expect(setFields).toHaveLength(1);
      expect(params.automatic_payment_methods).toBeDefined(); // All fallbacks → automatic
    }
  });

  it('no mode ever sets two Stripe payment params simultaneously', () => {
    // Exhaustive check across all currencies and modes
    const currencies = ['PLN', 'EUR', 'USD', 'GBP', 'CZK'];
    const configs = [
      null,
      makeConfig({ config_mode: 'automatic' }),
      makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: 'pmc_test12345' }),
      makeConfig({ config_mode: 'stripe_preset', stripe_pmc_id: null }),
      makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [
          { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
          { type: 'card', enabled: true, display_order: 1, currency_restrictions: [] },
          { type: 'sepa_debit', enabled: true, display_order: 2, currency_restrictions: ['EUR'] },
        ],
      }),
      makeConfig({
        config_mode: 'custom',
        custom_payment_methods: [{ type: 'blik', enabled: false, display_order: 0 }],
      }),
    ];

    for (const config of configs) {
      for (const currency of currencies) {
        const params = buildPaymentIntentConfig(config, currency);
        const setCount = [
          params.automatic_payment_methods !== undefined,
          params.payment_method_types !== undefined,
          params.payment_method_configuration !== undefined,
        ].filter(Boolean).length;

        expect(setCount).toBe(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Link display mode — paymentMethodOrder construction
// ---------------------------------------------------------------------------

describe('paymentMethodOrder — Link filtered out (LAE handles it)', () => {
  /**
   * Simulates the paymentMethodOrder logic in CustomPaymentForm.tsx
   * Link is always filtered out because LAE handles it separately.
   */
  function buildPaymentMethodOrder(
    paymentMethodOrder: string[] | undefined,
    currency: string,
  ): string[] | undefined {
    const baseOrder = paymentMethodOrder && paymentMethodOrder.length > 0
      ? paymentMethodOrder
      : currency === 'PLN'
      ? ['blik', 'p24', 'card']
      : currency === 'EUR'
      ? ['sepa_debit', 'ideal', 'card', 'klarna']
      : currency === 'USD'
      ? ['card', 'cashapp', 'affirm']
      : undefined;
    return baseOrder?.filter(m => m !== 'link');
  }

  it('filters out link from custom order', () => {
    const order = buildPaymentMethodOrder(['blik', 'p24', 'card'], 'PLN');
    expect(order).toEqual(['blik', 'p24', 'card']);
    expect(order).not.toContain('link');
  });

  it('removes link if present in base order', () => {
    const order = buildPaymentMethodOrder(['blik', 'link', 'card'], 'PLN');
    expect(order).toEqual(['blik', 'card']);
    expect(order).not.toContain('link');
  });

  it('uses currency-specific defaults without link', () => {
    const orderPLN = buildPaymentMethodOrder(undefined, 'PLN');
    expect(orderPLN).toEqual(['blik', 'p24', 'card']);

    const orderEUR = buildPaymentMethodOrder(undefined, 'EUR');
    expect(orderEUR).toEqual(['sepa_debit', 'ideal', 'card', 'klarna']);

    const orderUSD = buildPaymentMethodOrder(undefined, 'USD');
    expect(orderUSD).toEqual(['card', 'cashapp', 'affirm']);
  });

  it('returns undefined for unknown currency with no custom order', () => {
    const order = buildPaymentMethodOrder(undefined, 'GBP');
    expect(order).toBeUndefined();
  });

  it('extractExpressCheckoutConfig still reports link enabled state', () => {
    const configEnabled = makeConfig({ enable_link: true });
    const expressEnabled = extractExpressCheckoutConfig(configEnabled);
    expect(expressEnabled.link).toBe(true);

    const configDisabled = makeConfig({ enable_link: false });
    const expressDisabled = extractExpressCheckoutConfig(configDisabled);
    expect(expressDisabled.link).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Admin config → Stripe: field mapping validation
// ---------------------------------------------------------------------------

describe('admin config field mapping to Stripe', () => {
  it('custom mode: disabled methods are excluded from payment_method_types', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: false, display_order: 1, currency_restrictions: ['PLN'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
    });

    const params = buildPaymentIntentConfig(config, 'PLN');
    expect(params.payment_method_types).toEqual(['blik', 'card', 'link']);
    expect(params.payment_method_types).not.toContain('p24');
  });

  it('custom mode: currency_restrictions filter works correctly', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'ideal', enabled: true, display_order: 1, currency_restrictions: ['EUR'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
        { type: 'p24', enabled: true, display_order: 3, currency_restrictions: ['PLN', 'EUR'] },
      ],
    });

    // PLN: blik, card, p24, link (ideal excluded, link appended)
    const plnParams = buildPaymentIntentConfig(config, 'PLN');
    expect(plnParams.payment_method_types).toEqual(['blik', 'card', 'p24', 'link']);

    // EUR: ideal, card, p24, link (blik excluded, link appended)
    const eurParams = buildPaymentIntentConfig(config, 'EUR');
    expect(eurParams.payment_method_types).toEqual(['ideal', 'card', 'p24', 'link']);

    // USD: card, link (no restrictions = all currencies, link appended)
    const usdParams = buildPaymentIntentConfig(config, 'USD');
    expect(usdParams.payment_method_types).toEqual(['card', 'link']);

    // GBP: card, link
    const gbpParams = buildPaymentIntentConfig(config, 'GBP');
    expect(gbpParams.payment_method_types).toEqual(['card', 'link']);
  });

  it('custom mode: empty custom_payment_methods array falls back to automatic', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [],
    });

    const params = buildPaymentIntentConfig(config, 'PLN');
    expect(params.automatic_payment_methods).toBeDefined();
    expect(params.payment_method_types).toBeUndefined();
  });

  it('custom mode: currency_overrides filters methods (not just orders)', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
      // PLN override only includes blik + card (p24 excluded for this currency)
      currency_overrides: { PLN: ['blik', 'card'] },
    });

    // Override filters out p24 even though it's globally enabled for PLN
    const methods = getEnabledPaymentMethodsForCurrency(config, 'PLN');
    expect(methods).toEqual(['blik', 'card']);
    expect(methods).not.toContain('p24');

    // With link appended in buildPaymentIntentConfig
    const params = buildPaymentIntentConfig(config, 'PLN');
    expect(params.payment_method_types).toEqual(['blik', 'card', 'link']);

    // EUR has no override → falls back to globally enabled methods for EUR
    const eurMethods = getEnabledPaymentMethodsForCurrency(config, 'EUR');
    expect(eurMethods).toEqual(['card']);
  });

  it('custom mode: currency_overrides ignores globally disabled methods', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: false, display_order: 1, currency_restrictions: ['PLN'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
      // Override includes p24 but it's disabled globally → should be filtered out
      currency_overrides: { PLN: ['blik', 'p24', 'card'] },
    });

    const methods = getEnabledPaymentMethodsForCurrency(config, 'PLN');
    expect(methods).toEqual(['blik', 'card']);
    expect(methods).not.toContain('p24');
  });

  it('custom mode: currency_overrides preserves override ordering', () => {
    const config = makeConfig({
      config_mode: 'custom',
      custom_payment_methods: [
        { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'] },
        { type: 'p24', enabled: true, display_order: 1, currency_restrictions: ['PLN'] },
        { type: 'card', enabled: true, display_order: 2, currency_restrictions: [] },
      ],
      // Override reverses the order
      currency_overrides: { PLN: ['card', 'p24', 'blik'] },
    });

    const methods = getEnabledPaymentMethodsForCurrency(config, 'PLN');
    expect(methods).toEqual(['card', 'p24', 'blik']);
  });

  it('stripe_preset: PMC ID is passed exactly as stored', () => {
    const pmcId = 'pmc_1QBxYZ2eZvKYlo2C0123abcd';
    const config = makeConfig({
      config_mode: 'stripe_preset',
      stripe_pmc_id: pmcId,
    });

    const params = buildPaymentIntentConfig(config, 'EUR');
    expect(params.payment_method_configuration).toBe(pmcId);
  });

  it('express checkout config maps DB fields to frontend correctly', () => {
    // All possible toggle combinations
    const combinations = [
      { express: true, apple: true, google: true, link: true },
      { express: true, apple: false, google: true, link: false },
      { express: false, apple: true, google: true, link: true },
      { express: true, apple: false, google: false, link: false },
    ];

    for (const combo of combinations) {
      const config = makeConfig({
        enable_express_checkout: combo.express,
        enable_apple_pay: combo.apple,
        enable_google_pay: combo.google,
        enable_link: combo.link,
      });

      const result = extractExpressCheckoutConfig(config);
      expect(result.enabled).toBe(combo.express);
      expect(result.applePay).toBe(combo.apple);
      expect(result.googlePay).toBe(combo.google);
      expect(result.link).toBe(combo.link);
      expect(result.linkDisplayMode).toBe('above'); // default from makeConfig
    }
  });

  it('express checkout config maps linkDisplayMode correctly', () => {
    for (const mode of ['above', 'tab'] as const) {
      const config = makeConfig({ link_display_mode: mode });
      const result = extractExpressCheckoutConfig(config);
      expect(result.linkDisplayMode).toBe(mode);
    }
  });
});
