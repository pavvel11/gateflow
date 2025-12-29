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

  // Query price history - EXCLUDE current price (where effective_until IS NULL)
  // We want the lowest price from BEFORE the current price
  const { data, error } = await supabase
    .from('product_price_history')
    .select('price, currency, effective_from')
    .eq('product_id', productId)
    .gte('effective_from', thirtyDaysAgo.toISOString())
    .not('effective_until', 'is', null) // Only closed price periods (not current)
    .order('price', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    lowestPrice: parseFloat(data.price),
    currency: data.currency,
    effectiveFrom: new Date(data.effective_from),
  };
}

/**
 * Determine if Omnibus price should be displayed
 * Only show if current price is lower than historical lowest
 */
export function shouldDisplayOmnibusPrice(
  currentPrice: number,
  lowestPrice: number | null
): boolean {
  if (!lowestPrice) {
    return false;
  }

  // Only show if there's an actual discount (current price < lowest price)
  return currentPrice < lowestPrice;
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
