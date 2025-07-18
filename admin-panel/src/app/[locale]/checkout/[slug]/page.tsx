import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ProductPurchaseView from './components/ProductPurchaseView';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

// Generate metadata for the checkout page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!product) {
    return {
      title: 'Checkout - Product Not Found',
    };
  }

  return {
    title: `Checkout - ${product.name}`,
    description: `Purchase ${product.name} - ${product.description}`,
    robots: 'noindex, nofollow', // Prevent indexing of checkout pages
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!product) {
    return notFound();
  }

  // Check temporal availability
  const now = new Date();
  const availableFrom = product.available_from ? new Date(product.available_from) : null;
  const availableUntil = product.available_until ? new Date(product.available_until) : null;
  
  const isTemporallyAvailable = 
    (!availableFrom || availableFrom <= now) && 
    (!availableUntil || availableUntil > now);

  if (!isTemporallyAvailable) {
    return notFound();
  }

  return <ProductPurchaseView product={product} />;
}
