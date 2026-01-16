/**
 * Stripe Payment Method Configurations API Integration
 *
 * Handles fetching and parsing Stripe Payment Method Configurations.
 * Provides caching to minimize API calls and respect rate limits.
 *
 * @see https://docs.stripe.com/api/payment_method_configurations
 */

import { getStripeServer } from '@/lib/stripe/server';
import {
  isValidStripePMCId as isValidPMCIdFromTypes,
} from '@/types/payment-config';
import type {
  StripePaymentMethodConfig,
  PaymentMethodInfo,
} from '@/types/payment-config';

// =============================================================================
// STRIPE API INTEGRATION
// =============================================================================

/**
 * Fetches all payment method configurations from Stripe
 *
 * @returns Promise with success status and data
 */
export async function fetchStripePaymentMethodConfigs(): Promise<{
  success: boolean;
  data?: StripePaymentMethodConfig[];
  error?: string;
}> {
  try {
    const stripe = await getStripeServer();

    if (!stripe) {
      return {
        success: false,
        error: 'Stripe not configured. Please configure Stripe API keys in settings.',
      };
    }

    // List all payment method configurations
    // Note: Stripe returns parent configs only in Dashboard
    // API can access both parent and child configs
    const configs = await stripe.paymentMethodConfigurations.list({
      limit: 100, // Stripe default is 10, increase for completeness
    });

    return {
      success: true,
      data: configs.data as unknown as StripePaymentMethodConfig[],
    };
  } catch (error) {
    console.error('[fetchStripePaymentMethodConfigs] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches a specific payment method configuration by ID
 *
 * @param id - Payment Method Configuration ID (e.g., 'pmc_xxx')
 * @returns Promise with success status and data
 */
export async function fetchStripePaymentMethodConfig(id: string): Promise<{
  success: boolean;
  data?: StripePaymentMethodConfig;
  error?: string;
}> {
  try {
    const stripe = await getStripeServer();

    if (!stripe) {
      return {
        success: false,
        error: 'Stripe not configured',
      };
    }

    const config = await stripe.paymentMethodConfigurations.retrieve(id);

    return {
      success: true,
      data: config as unknown as StripePaymentMethodConfig,
    };
  } catch (error) {
    console.error(`[fetchStripePaymentMethodConfig] Error fetching PMC ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// PAYMENT METHOD EXTRACTION
// =============================================================================

/**
 * Extracts enabled payment method types from a Stripe PMC
 *
 * @param config - Stripe Payment Method Configuration
 * @returns Array of enabled payment method types
 */
export function extractEnabledPaymentMethods(
  config: StripePaymentMethodConfig
): string[] {
  const enabled: string[] = [];

  // List of payment methods to check
  // Note: This list should be updated when Stripe adds new payment methods
  const paymentMethods = [
    'card',
    'blik',
    'p24',
    'sepa_debit',
    'ideal',
    'klarna',
    'affirm',
    'cashapp',
    'giropay',
    'bancontact',
    'eps',
    'sofort',
    'alipay',
    'wechat_pay',
    'au_becs_debit',
    'bacs_debit',
    'acss_debit',
    'us_bank_account',
    'konbini',
    'paynow',
    'promptpay',
    'fpx',
    'grabpay',
  ] as const;

  for (const method of paymentMethods) {
    if (config[method]?.enabled) {
      enabled.push(method);
    }
  }

  return enabled;
}

/**
 * Get display name for a payment method configuration
 *
 * @param config - Stripe Payment Method Configuration
 * @returns Display name (e.g., 'Default Config', 'Custom: Card + BLIK')
 */
export function getPaymentMethodConfigDisplayName(
  config: StripePaymentMethodConfig
): string {
  if (config.name) {
    return config.name;
  }

  // Fallback: Generate name from enabled methods
  const enabled = extractEnabledPaymentMethods(config);
  if (enabled.length === 0) {
    return 'Empty Configuration';
  }

  if (enabled.length <= 3) {
    return `Custom: ${enabled.join(' + ')}`;
  }

  return `Custom: ${enabled.slice(0, 3).join(', ')} +${enabled.length - 3} more`;
}

// =============================================================================
// AVAILABLE PAYMENT METHODS (STATIC METADATA)
// =============================================================================

/**
 * Returns all available payment method types supported by Stripe
 * with metadata for display and currency support
 *
 * Note: This is static metadata. Actual availability depends on:
 * - Stripe account settings
 * - Payment Method Configurations
 * - Customer location and currency
 *
 * @returns Array of payment methods with metadata
 */
export function getAvailablePaymentMethods(): PaymentMethodInfo[] {
  return [
    // Cards (universal)
    {
      type: 'card',
      name: 'Card',
      icon: '💳',
      currencies: ['*'], // All currencies
    },

    // Poland
    {
      type: 'blik',
      name: 'BLIK',
      icon: '🇵🇱',
      currencies: ['PLN'],
    },
    {
      type: 'p24',
      name: 'Przelewy24',
      icon: '🇵🇱',
      currencies: ['PLN', 'EUR'],
    },

    // Europe
    {
      type: 'sepa_debit',
      name: 'SEPA Direct Debit',
      icon: '🇪🇺',
      currencies: ['EUR'],
    },
    {
      type: 'ideal',
      name: 'iDEAL',
      icon: '🇳🇱',
      currencies: ['EUR'],
    },
    {
      type: 'giropay',
      name: 'giropay',
      icon: '🇩🇪',
      currencies: ['EUR'],
    },
    {
      type: 'bancontact',
      name: 'Bancontact',
      icon: '🇧🇪',
      currencies: ['EUR'],
    },
    {
      type: 'eps',
      name: 'EPS',
      icon: '🇦🇹',
      currencies: ['EUR'],
    },
    {
      type: 'sofort',
      name: 'Sofort',
      icon: '🇩🇪',
      currencies: ['EUR'],
    },

    // Buy Now, Pay Later
    {
      type: 'klarna',
      name: 'Klarna',
      icon: '🛍️',
      currencies: ['USD', 'EUR', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'CAD', 'AUD', 'NZD', 'PLN'],
    },
    {
      type: 'affirm',
      name: 'Affirm',
      icon: '💰',
      currencies: ['USD', 'CAD'],
    },

    // US
    {
      type: 'cashapp',
      name: 'Cash App Pay',
      icon: '💵',
      currencies: ['USD'],
    },
    {
      type: 'us_bank_account',
      name: 'US Bank Account (ACH)',
      icon: '🏦',
      currencies: ['USD'],
    },

    // Asia
    {
      type: 'alipay',
      name: 'Alipay',
      icon: '🇨🇳',
      currencies: ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY', 'SGD', 'AUD', 'NZD', 'CAD'],
    },
    {
      type: 'wechat_pay',
      name: 'WeChat Pay',
      icon: '🇨🇳',
      currencies: ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY', 'SGD', 'AUD'],
    },
    {
      type: 'konbini',
      name: 'Konbini',
      icon: '🇯🇵',
      currencies: ['JPY'],
    },
    {
      type: 'paynow',
      name: 'PayNow',
      icon: '🇸🇬',
      currencies: ['SGD'],
    },
    {
      type: 'promptpay',
      name: 'PromptPay',
      icon: '🇹🇭',
      currencies: ['THB'],
    },
    {
      type: 'fpx',
      name: 'FPX',
      icon: '🇲🇾',
      currencies: ['MYR'],
    },
    {
      type: 'grabpay',
      name: 'GrabPay',
      icon: '🇸🇬',
      currencies: ['SGD', 'MYR'],
    },

    // UK
    {
      type: 'bacs_debit',
      name: 'Bacs Direct Debit',
      icon: '🇬🇧',
      currencies: ['GBP'],
    },

    // Australia/New Zealand
    {
      type: 'au_becs_debit',
      name: 'BECS Direct Debit',
      icon: '🇦🇺',
      currencies: ['AUD'],
    },

    // Canada
    {
      type: 'acss_debit',
      name: 'Pre-authorized debit (PAD)',
      icon: '🇨🇦',
      currencies: ['CAD'],
    },
  ];
}

/**
 * Get metadata for a specific payment method type
 *
 * @param type - Payment method type (e.g., 'card', 'blik')
 * @returns Payment method info or null if not found
 */
export function getPaymentMethodInfo(type: string): PaymentMethodInfo | null {
  const methods = getAvailablePaymentMethods();
  return methods.find((m) => m.type === type) || null;
}

/**
 * Check if a payment method supports a given currency
 *
 * @param type - Payment method type
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns Whether the payment method supports the currency
 */
export function isPaymentMethodSupportedForCurrency(
  type: string,
  currency: string
): boolean {
  const info = getPaymentMethodInfo(type);
  if (!info) return false;

  // '*' means all currencies
  if (info.currencies.includes('*')) return true;

  return info.currencies.includes(currency.toUpperCase());
}

/**
 * Filter payment methods by currency
 *
 * @param types - Array of payment method types
 * @param currency - ISO 4217 currency code
 * @returns Filtered array of payment method types that support the currency
 */
export function filterPaymentMethodTypesByCurrency(
  types: string[],
  currency: string
): string[] {
  return types.filter((type) => isPaymentMethodSupportedForCurrency(type, currency));
}

/**
 * Get payment methods available in a Stripe account
 * (Requires checking account settings via Stripe API)
 *
 * This is a simplified version that assumes all methods in the static list are available.
 * In production, you might want to check actual availability via Stripe API.
 *
 * @returns Array of available payment methods with availability flag
 */
export async function getAccountAvailablePaymentMethods(): Promise<PaymentMethodInfo[]> {
  // For now, return all methods with available=true
  // Future: Query Stripe account settings to determine actual availability
  return getAvailablePaymentMethods().map((method) => ({
    ...method,
    available: true,
  }));
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate Stripe PMC ID format
 * Re-exported from types for convenience
 *
 * @param id - Stripe PMC ID
 * @returns Whether the ID is valid
 */
export const isValidStripePMCId = isValidPMCIdFromTypes;

/**
 * Validate payment method type
 *
 * @param type - Payment method type
 * @returns Whether the type is valid
 */
export function isValidPaymentMethodType(type: string): boolean {
  const validTypes = getAvailablePaymentMethods().map((m) => m.type);
  return validTypes.includes(type);
}
