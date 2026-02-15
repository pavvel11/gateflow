/**
 * Payment Method Helper Utilities
 *
 * Pure utility functions for payment method configuration.
 * These are NOT server actions - they are synchronous helper functions.
 */

import type { PaymentMethodConfig, PaymentMethodMetadata } from '@/types/payment-config';

/**
 * Default recommended payment configuration optimized for Polish market
 * Order: BLIK -> Przelewy24 -> Card + Express Checkout enabled
 */
export const RECOMMENDED_CONFIG = {
  config_mode: 'custom' as const,
  stripe_pmc_id: null,
  custom_payment_methods: [
    { type: 'blik', enabled: true, display_order: 0, currency_restrictions: ['PLN'], label: 'BLIK' },
    { type: 'p24', enabled: true, display_order: 1, currency_restrictions: ['PLN', 'EUR'], label: 'Przelewy24' },
    { type: 'card', enabled: true, display_order: 2, currency_restrictions: [], label: 'Card' },
  ],
  payment_method_order: ['blik', 'p24', 'card'],
  currency_overrides: {},
  enable_express_checkout: true,
  enable_apple_pay: true,
  enable_google_pay: true,
  enable_link: true,
  link_display_mode: 'above' as const,
};

/**
 * Get effective payment method order for a given currency
 * Checks currency_overrides first, then falls back to payment_method_order
 *
 * @param config - Payment method configuration
 * @param currency - ISO 4217 currency code
 * @returns Ordered array of payment method types
 */
export function getEffectivePaymentMethodOrder(
  config: PaymentMethodConfig,
  currency: string
): string[] {
  // Check currency overrides first
  const currencyUpper = currency.toUpperCase();
  if (config.currency_overrides && config.currency_overrides[currencyUpper]) {
    return config.currency_overrides[currencyUpper];
  }

  // Fallback to global order
  return config.payment_method_order || [];
}

/**
 * Get enabled payment methods for custom mode with currency filtering
 *
 * IMPORTANT: This function is designed specifically for 'custom' config_mode.
 * For 'automatic' and 'stripe_preset' modes, it returns an empty array because:
 * - 'automatic': Stripe determines available methods dynamically
 * - 'stripe_preset': Methods are defined in Stripe Dashboard PMC
 *
 * This follows Liskov Substitution Principle by having consistent behavior
 * (always returns string[]) while the caller (create-payment-intent) handles
 * mode-specific logic via switch statement.
 *
 * @param config - Payment method configuration
 * @param currency - ISO 4217 currency code
 * @returns Array of enabled payment method types for custom mode, empty array for other modes
 */
export function getEnabledPaymentMethodsForCurrency(
  config: PaymentMethodConfig,
  currency: string
): string[] {
  // Only process custom mode - automatic and stripe_preset modes
  // delegate payment method selection to Stripe (see create-payment-intent/route.ts)
  if (config.config_mode !== 'custom') {
    return [];
  }

  const currencyUpper = currency.toUpperCase();

  // Get all globally enabled methods valid for this currency
  const enabledSet = new Set(
    config.custom_payment_methods
      .filter((pm: PaymentMethodMetadata) => {
        if (!pm.enabled) return false;
        if (pm.currency_restrictions && pm.currency_restrictions.length > 0) {
          return pm.currency_restrictions.includes(currencyUpper);
        }
        return true;
      })
      .map((pm) => pm.type)
  );

  // If currency override exists, use it as filter + ordering.
  // Only methods present in both the override AND globally enabled are returned.
  // This allows per-currency method selection (not just reordering).
  const override = config.currency_overrides?.[currencyUpper];
  if (override && override.length > 0) {
    return override.filter((type) => enabledSet.has(type));
  }

  // Default: return by display_order
  return config.custom_payment_methods
    .filter((pm) => enabledSet.has(pm.type))
    .sort((a, b) => a.display_order - b.display_order)
    .map((pm) => pm.type);
}
