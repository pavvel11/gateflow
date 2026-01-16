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
 * @param config - Payment method configuration
 * @param currency - ISO 4217 currency code
 * @returns Array of enabled payment method types that support the currency
 */
export function getEnabledPaymentMethodsForCurrency(
  config: PaymentMethodConfig,
  currency: string
): string[] {
  if (config.config_mode !== 'custom') {
    return [];
  }

  const currencyUpper = currency.toUpperCase();

  return config.custom_payment_methods
    .filter((pm: PaymentMethodMetadata) => {
      if (!pm.enabled) return false;

      // Check currency restrictions
      if (pm.currency_restrictions && pm.currency_restrictions.length > 0) {
        return pm.currency_restrictions.includes(currencyUpper);
      }

      // No restrictions = supports all currencies
      return true;
    })
    .sort((a, b) => a.display_order - b.display_order)
    .map((pm) => pm.type);
}
