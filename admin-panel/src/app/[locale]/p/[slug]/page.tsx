import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ProductView from './components/ProductView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for the page based on the product data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Fetch product data - for metadata we can check active products only
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

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
  
  // First, get the current user to check if they have access
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let product = null;
  
  if (user) {
    // For logged in users: check if they have access to the product
    // If they do, show the product even if it's inactive or expired
    const { data: accessData } = await supabase
      .from('user_product_access')
      .select('product_id')
      .eq('user_id', user.id)
      .single();
    
    if (accessData) {
      // User has access to some product, fetch the requested product regardless of active status
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();
      
      // But only if user actually has access to THIS specific product
      const { data: specificAccess } = await supabase
        .from('user_product_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productData?.id)
        .single();
      
      if (specificAccess && productData) {
        product = productData;
      }
    }
  }
  
  // If no product found yet (user not logged in, or no access, or product doesn't exist)
  // Try to fetch any product (active or inactive) to handle temporal availability
  if (!product) {
    const { data: anyProduct } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (anyProduct) {
      // Check if product is temporally available
      const now = new Date();
      const availableFrom = anyProduct.available_from ? new Date(anyProduct.available_from) : null;
      const availableUntil = anyProduct.available_until ? new Date(anyProduct.available_until) : null;
      
      const isTemporallyAvailable = 
        (!availableFrom || availableFrom <= now) && 
        (!availableUntil || availableUntil > now);
      
      // Show product if:
      // 1. It's active AND temporally available, OR
      // 2. It has temporal settings (to show "coming soon" or "expired" messaging), OR  
      // 3. It's inactive (to show "no longer available" messaging)
      if ((anyProduct.is_active && isTemporallyAvailable) || 
          anyProduct.available_from || 
          anyProduct.available_until || 
          !anyProduct.is_active) {
        product = anyProduct;
      }
    }
  }

  // If still no product found, return 404
  if (!product) {
    console.log('Product not found');
    return notFound();
  }

  // The ProductView component will handle all logic for access checking and rendering
  return <ProductView product={product} />;
}
