/**
 * Omnibus Directive (EU 2019/2161) Service
 * Implements 30-day price history tracking for discount transparency
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Check if Omnibus price tracking is globally enabled
 */
export async function isOmnibusEnabled(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('shop_config')
    .select('omnibus_enabled')
    .single();

  if (error) {
    console.error('Error checking Omnibus settings:', error);
    return false;
  }

  return data?.omnibus_enabled ?? false;
}

/**
 * Get the lowest price for a product in the last 30 days
 * Returns null if:
 * - Omnibus is globally disabled
 * - Product is exempt from Omnibus
 * - No price history exists
 */
export async function getLowestPriceInLast30Days(
  productId: string
): Promise<{
  lowestPrice: number;
  currency: string;
  effectiveFrom: Date;
} | null> {
  const supabase = await createClient();

  // Check if Omnibus is globally enabled
  const globalEnabled = await isOmnibusEnabled();
  if (!globalEnabled) {
    return null;
  }

  // Check if product is exempt
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('omnibus_exempt')
    .eq('id', productId)
    .single();

  if (productError) {
    console.error('Error fetching product:', productError);
    return null;
  }

  if (product?.omnibus_exempt) {
    return null;
  }

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Query price history - get ALL entries from last 30 days (including current)
  // We need to calculate the effective price for each entry (min of price and sale_price if set)
  const { data: history, error } = await supabase
    .from('product_price_history')
    .select('price, sale_price, currency, effective_from')
    .eq('product_id', productId)
    .gte('effective_from', thirtyDaysAgo.toISOString())
    .order('effective_from', { ascending: false });

  if (error || !history || history.length === 0) {
    return null;
  }

  // Calculate effective price for each history entry (min of price and active sale_price)
  // For historical entries, we don't know if sale_price was expired, so we take min if set
  const lowestEntry = history.reduce((lowest, entry) => {
    const effectivePrice = entry.sale_price
      ? Math.min(parseFloat(entry.price), parseFloat(entry.sale_price))
      : parseFloat(entry.price);

    const lowestEffectivePrice = lowest.sale_price
      ? Math.min(parseFloat(lowest.price), parseFloat(lowest.sale_price))
      : parseFloat(lowest.price);

    return effectivePrice < lowestEffectivePrice ? entry : lowest;
  });

  const lowestPrice = lowestEntry.sale_price
    ? Math.min(parseFloat(lowestEntry.price), parseFloat(lowestEntry.sale_price))
    : parseFloat(lowestEntry.price);

  return {
    lowestPrice,
    currency: lowestEntry.currency,
    effectiveFrom: new Date(lowestEntry.effective_from),
  };
}

/**
 * Determine if sale price is currently active
 * Sale price is active if set and either no expiration date or expiration is in the future
 */
export function isSalePriceActive(
  salePrice: number | null,
  salePriceUntil: string | null
): boolean {
  if (!salePrice || salePrice <= 0) {
    return false;
  }

  if (!salePriceUntil) {
    return true; // No expiration = active indefinitely
  }

  return new Date(salePriceUntil) > new Date();
}

/**
 * Calculate effective price considering regular price, sale price, and coupon
 * Promotions do NOT stack - we choose the most beneficial for the customer
 */
export function calculateEffectivePrice(
  price: number,
  salePrice: number | null,
  salePriceUntil: string | null,
  couponDiscount: number = 0
): {
  effectivePrice: number;
  originalPrice: number;
  showStrikethrough: boolean;
  isUsingSalePrice: boolean;
  isUsingCoupon: boolean;
} {
  const activeSalePrice = isSalePriceActive(salePrice, salePriceUntil)
    ? salePrice
    : null;

  const priceWithCoupon = couponDiscount > 0 ? price - couponDiscount : null;

  // Choose the most beneficial price (lowest)
  const prices = [
    { value: price, type: 'regular' },
    activeSalePrice ? { value: activeSalePrice, type: 'sale' } : null,
    priceWithCoupon ? { value: priceWithCoupon, type: 'coupon' } : null,
  ].filter((p): p is { value: number; type: string } => p !== null);

  const best = prices.reduce((min, p) => (p.value < min.value ? p : min));

  return {
    effectivePrice: best.value,
    originalPrice: price,
    showStrikethrough: best.value < price,
    isUsingSalePrice: best.type === 'sale',
    isUsingCoupon: best.type === 'coupon',
  };
}

/**
 * Update Omnibus global settings
 */
export async function updateOmnibusSettings(enabled: boolean): Promise<void> {
  const supabase = await createClient();

  // Get shop_config id (singleton table)
  const { data: shopConfig } = await supabase
    .from('shop_config')
    .select('id')
    .single();

  if (!shopConfig) {
    throw new Error('Shop config not found');
  }

  const { error } = await supabase
    .from('shop_config')
    .update({
      omnibus_enabled: enabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', shopConfig.id);

  if (error) {
    throw new Error(`Failed to update Omnibus settings: ${error.message}`);
  }
}

/**
 * Update product Omnibus exemption status
 */
export async function updateProductOmnibusExemption(
  productId: string,
  exempt: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('products')
    .update({ omnibus_exempt: exempt })
    .eq('id', productId);

  if (error) {
    throw new Error(`Failed to update product Omnibus exemption: ${error.message}`);
  }
}
