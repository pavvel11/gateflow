import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ProductView from './components/ProductView';
import AccessGrantedView from './components/AccessGrantedView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for the page based on the product data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Fetch product data
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
  
  // Fetch product data from Supabase
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  // If product not found or error, return 404
  if (error || !product) {
    console.error('Product not found:', error);
    return notFound();
  }

  // Get current user (if authenticated)
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user has access to this product
  let hasAccess = false;

  if (user) {
    // Check if user is an admin (admins have access to all products)
    const { data: isAdminData } = await supabase
      .rpc('is_admin', { user_id: user.id });
    
    const isAdmin = isAdminData || false;

    // If not admin, check for specific product access
    if (!isAdmin) {
      const { data: access } = await supabase
        .from('user_product_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_slug', slug)
        .single();
      
      hasAccess = !!access;
    } else {
      // Admins always have access to all products
      hasAccess = true;
    }
  }
  
  // If user has access, show the access granted view
  if (hasAccess) {
    return <AccessGrantedView product={product} />;
  }
  
  // Otherwise, show the standard product view for purchase/signup
  return <ProductView product={product} />;
}
