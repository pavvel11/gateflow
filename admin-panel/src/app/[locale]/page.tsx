import { createClient } from '@/lib/supabase/server';
import { getShopConfig } from '@/lib/actions/shop-config';
import SmartLandingClient from '@/components/storefront/SmartLandingClient';
import { Product } from '@/types';

export default async function SmartLandingPage() {
  const supabase = await createClient();
  const shopConfig = await getShopConfig();

  // Efficient EXISTS check - only fetch 1 row to check if products exist
  const { data: productsCheck } = await supabase
    .from('products')
    .select('id')
    .eq('is_active', true)
    .limit(1);

  const hasProducts = (productsCheck?.length || 0) > 0;

  // Fetch products only if they exist
  let products: Product[] = [];
  if (hasProducts) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('price', { ascending: true });

    products = (data as Product[]) || [];
  }

  return (
    <SmartLandingClient
      hasProducts={hasProducts}
      products={products}
      shopConfig={shopConfig}
    />
  );
}
