'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get('product');

  // If no product slug is provided, redirect to homepage
  if (!productSlug) {
    redirect('/');
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // If user is not authenticated, redirect to product page
    // This assumes the product page handles unauthenticated access
    redirect(`/p/${productSlug}`);
  }

  try {
    console.log(`[ProductAccess] Processing access for user ${user.id} to product ${productSlug}`);
    
    // First, check if the user already has access to the product
    const { data: existingAccess, error: accessError } = await supabase
      .from('user_product_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_slug', productSlug)
      .single();

    if (accessError && accessError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error(`[ProductAccess] Error checking existing access:`, accessError);
      // Continue execution instead of redirecting - we'll just attempt to grant access
    }

    // If the user doesn't have access, check if product is free and grant access if so
    if (!existingAccess) {
      console.log(`[ProductAccess] No existing access found, checking if product is free`);
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('slug', productSlug)
        .eq('is_active', true)
        .single();

      if (productError) {
        console.error(`[ProductAccess] Error fetching product:`, productError);
        // If we can't find the product, redirect to home page
        redirect('/');
        return;
      }

      if (!product) {
        console.log(`[ProductAccess] Product not found or inactive`);
        redirect('/');
        return;
      }

      if (product.price === 0) {
        console.log(`[ProductAccess] Product is free, granting access`);
        
        // Grant access for free products
        const { error: insertError } = await supabase
          .from('user_product_access')
          .insert({
            user_id: user.id,
            product_slug: productSlug
          });
          
        if (insertError) {
          console.error(`[ProductAccess] Error inserting access record:`, insertError);
          // If we couldn't insert the record but it's because it already exists (duplicate key),
          // we can still proceed to the redirect
          if (insertError.code !== '23505') { // PostgreSQL duplicate key error
            // For other errors, redirect to the product page anyway - let the page handle it
            redirect(`/p/${productSlug}`);
            return;
          }
        } else {
          console.log(`[ProductAccess] Access granted successfully`);
        }
      } else {
        // If product exists but is not free, redirect to payment page
        console.log(`[ProductAccess] Product is not free, redirecting to product page for payment`);
        redirect(`/p/${productSlug}`);
        return;
      }
    } else {
      console.log(`[ProductAccess] User already has access to this product`);
    }

    // At this point, user either already had access or we've granted it (for free products)
    // Get the product's redirect_url
    const { data: product, error: redirectError } = await supabase
      .from('products')
      .select('redirect_url')
      .eq('slug', productSlug)
      .single();

    if (redirectError) {
      console.error(`[ProductAccess] Error fetching product for redirect:`, redirectError);
      // If we can't fetch the redirect info, just go to the product page
      redirect(`/p/${productSlug}`);
      return;
    }

    // Redirect to the specified URL if available, otherwise to the product page
    if (product?.redirect_url) {
      console.log(`[ProductAccess] Redirecting to custom URL:`, product.redirect_url);
      // Redirect to the custom URL
      redirect(product.redirect_url);
    } else {
      console.log(`[ProductAccess] No custom redirect URL, going to product page`);
      // Redirect to the product page if no redirect_url is specified
      redirect(`/p/${productSlug}`);
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error('[ProductAccess] Unhandled error:', error);
    
    // Instead of redirecting to access-denied, redirect to the product page
    // This gives a better user experience if something goes wrong
    redirect(`/p/${productSlug}`);
  }
}
