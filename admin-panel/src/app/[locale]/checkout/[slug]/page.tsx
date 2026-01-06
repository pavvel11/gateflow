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
  // Don't filter by is_active - we might show waitlist for inactive products
  const { data: product } = await supabase
    .from('products')
    .select('name, description, is_active, enable_waitlist')
    .eq('slug', slug)
    .single();

  // Only show 404 if product doesn't exist at all, or is inactive WITHOUT waitlist
  if (!product || (!product.is_active && !product.enable_waitlist)) {
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
  // Don't filter by is_active - we might show waitlist for inactive products
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!product) {
    return notFound();
  }

  // Check if product is available for purchase
  const now = new Date();
  const availableFrom = product.available_from ? new Date(product.available_from) : null;
  const availableUntil = product.available_until ? new Date(product.available_until) : null;

  const isTemporallyAvailable =
    (!availableFrom || availableFrom <= now) &&
    (!availableUntil || availableUntil > now);

  const isFullyAvailable = product.is_active && isTemporallyAvailable;

  // If product is unavailable and doesn't have waitlist enabled, show 404
  if (!isFullyAvailable && !product.enable_waitlist) {
    return notFound();
  }

  // ProductPurchaseView handles showing either checkout form or waitlist form
  return <ProductPurchaseView product={product} />;
}
