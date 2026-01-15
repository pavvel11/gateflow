import { createPublicClient } from '@/lib/supabase/server';
import { getShopConfig } from '@/lib/actions/shop-config';
import SmartLandingClient from '@/components/storefront/SmartLandingClient';
import { Product } from '@/types';

// Enable ISR - cache for 60 seconds
export const revalidate = 60;

export default async function SmartLandingPage() {
  // Use public client (no cookies) to enable ISR
  const supabase = createPublicClient();
  const shopConfig = await getShopConfig();

  // OPTIMIZED: Single query instead of 2 separate queries
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('price', { ascending: true });

  const products = (data as Product[]) || [];
  const hasProducts = products.length > 0;

  return (
    <SmartLandingClient
      hasProducts={hasProducts}
      products={products}
      shopConfig={shopConfig}
    />
  );
}
