/**
 * Centralized pricing calculation hook for checkout
 * Single source of truth for all price calculations (frontend + backend)
 */

export const STRIPE_MINIMUM_AMOUNT = 0.50;

export interface PricingInput {
  productPrice: number;
  productCurrency: string;
  productVatRate?: number;
  priceIncludesVat?: boolean;
  customAmount?: number;
  bumpPrice?: number;
  bumpSelected?: boolean;
  coupon?: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    code: string;
  } | null;
}

export interface PricingResult {
  basePrice: number;
  bumpAmount: number;
  discountAmount: number;
  subtotal: number;
  totalGross: number;
  totalNet: number;
  vatAmount: number;
  currency: string;
  vatRate: number;
  isPwyw: boolean;
  hasBump: boolean;
  hasDiscount: boolean;
}

/**
 * Pure function for calculating pricing - can be used server-side
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const {
    productPrice,
    productCurrency,
    productVatRate = 0,
    priceIncludesVat = false,
    customAmount,
    bumpPrice = 0,
    bumpSelected = false,
    coupon,
  } = input;

  // Determine base price (PWYW or regular)
  const isPwyw = customAmount !== undefined && customAmount > 0;
  const basePrice = isPwyw ? customAmount : productPrice;

  // Add bump if selected
  const bumpAmount = bumpSelected ? bumpPrice : 0;
  const subtotal = basePrice + bumpAmount;

  // Apply coupon discount
  let discountAmount = 0;
  if (coupon) {
    if (coupon.discount_type === 'percentage') {
      discountAmount = subtotal * (coupon.discount_value / 100);
    } else {
      discountAmount = coupon.discount_value;
    }
  }

  // Calculate totals
  const totalGross = Math.max(subtotal - discountAmount, STRIPE_MINIMUM_AMOUNT);

  // VAT calculation
  const vatRate = productVatRate || 0;
  const totalNet = priceIncludesVat && vatRate > 0
    ? totalGross / (1 + vatRate / 100)
    : totalGross;
  const vatAmount = totalGross - totalNet;

  return {
    basePrice,
    bumpAmount,
    discountAmount,
    subtotal,
    totalGross,
    totalNet,
    vatAmount,
    currency: productCurrency,
    vatRate,
    isPwyw,
    hasBump: bumpSelected && bumpPrice > 0,
    hasDiscount: discountAmount > 0,
  };
}

/**
 * React hook wrapper for calculatePricing
 */
export function usePricing(input: PricingInput): PricingResult {
  return calculatePricing(input);
}

/**
 * Convert amount to Stripe cents
 */
export function toStripeCents(amount: number): number {
  return Math.round(amount * 100);
}
