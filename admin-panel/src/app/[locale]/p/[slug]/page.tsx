import { createPublicClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { cache } from 'react';
import ProductView from './components/ProductView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Enable ISR - cache for 60 seconds
export const revalidate = 60;

// OPTIMIZED: Cached data fetcher - React cache() deduplicates requests in the same render cycle
// This eliminates duplicate queries between generateMetadata() and ProductPage()
const getProduct = cache(async (slug: string) => {
  const supabase = createPublicClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  return { product, error };
});

// Generate metadata for the page based on the product data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProduct(slug); // DEDUPED

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug); // DEDUPED - same request as generateMetadata()

  if (error || !product) {
    return notFound();
  }

  return <ProductView product={product} />;
}
