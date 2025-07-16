'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Helper function to handle redirect with return_url support
 */
function handleRedirect(url: string, returnUrl?: string | null) {
  if (returnUrl) {
    try {
      // Validate return_url for security
      const returnUrlObj = new URL(returnUrl);
      
      // Basic security checks
      if (returnUrlObj.protocol !== 'https:' && returnUrlObj.protocol !== 'http:') {
        redirect(url);
        return;
      }
      
      // Redirect to return_url
      redirect(returnUrl);
    } catch (error) {
      // Only catch actual errors, not NEXT_REDIRECT
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error; // Re-throw NEXT_REDIRECT - this is expected behavior
      }
      redirect(url);
    }
  } else {
    redirect(url);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get('product');
  const returnUrl = searchParams.get('return_url');

  // If no product slug is provided, redirect to homepage
  if (!productSlug) {
    handleRedirect('/');
    return;
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // If user is not authenticated, redirect to product page with return_url preserved
    handleRedirect(`/p/${productSlug}`, returnUrl);
    return;
  }

  try {
    console.log(`[ProductAccess] Processing access for user ${user.id} to product ${productSlug}`);
    
    // First, check if the user already has access to the product using the view
    const { data: existingAccess, error: accessError } = await supabase
      .from('user_product_access_by_slug')
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
        // If we can't find the product, redirect to home page with return_url
        handleRedirect('/', returnUrl);
        return;
      }

      if (!product) {
        console.log(`[ProductAccess] Product not found or inactive`);
        handleRedirect('/', returnUrl);
        return;
      }

      if (product.price === 0) {
        console.log(`[ProductAccess] Product is free, granting access`);
        
        // Grant access for free products using the secure RPC function
        const { error: insertError } = await supabase
          .rpc('grant_product_access', {
            user_id_param: user.id,
            product_slug_param: productSlug
          });
          
        if (insertError) {
          console.error(`[ProductAccess] Error inserting access record:`, insertError);
          // If we couldn't insert the record but it's because it already exists (duplicate key),
          // we can still proceed to the redirect
          // With the RPC function, we don't need to worry about duplicate key errors
          // as it handles that internally with ON CONFLICT DO NOTHING
          console.error(`[ProductAccess] Error granting access via RPC:`, insertError);
          handleRedirect(`/p/${productSlug}`, returnUrl);
          return;
        } else {
          console.log(`[ProductAccess] Access granted successfully`);
        }
      } else {
        // If product exists but is not free, redirect to payment page with return_url
        console.log(`[ProductAccess] Product is not free, redirecting to product page for payment`);
        handleRedirect(`/p/${productSlug}`, returnUrl);
        return;
      }
    } else {
      console.log(`[ProductAccess] User already has access to this product`);
    }

    // At this point, user either already had access or we've granted it (for free products)
    // Get the product's content delivery configuration
    const { data: product, error: redirectError } = await supabase
      .from('products')
      .select('content_delivery_type, content_config')
      .eq('slug', productSlug)
      .single();

    if (redirectError) {
      console.error(`[ProductAccess] Error fetching product for redirect:`, redirectError);
      // If we can't fetch the redirect info, just go to the product page with return_url
      handleRedirect(`/p/${productSlug}`, returnUrl);
      return;
    }

    // Redirect to the specified URL if available, otherwise to the product page
    if (product?.content_delivery_type === 'redirect' && product?.content_config?.redirect_url) {
      console.log(`[ProductAccess] Redirecting to custom URL:`, product.content_config.redirect_url);
      
      // Security: Validate redirect URL to prevent open redirect attacks
      try {
        const redirectUrl = new URL(product.content_config.redirect_url);
        
        // Basic security checks
        if (redirectUrl.protocol !== 'https:' && redirectUrl.protocol !== 'http:') {
          console.warn(`[ProductAccess] Invalid protocol in redirect URL: ${redirectUrl.protocol}`);
          handleRedirect(`/p/${productSlug}`, returnUrl);
          return;
        }
        
        // Block dangerous URLs (can be expanded)
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
        if (blockedHosts.includes(redirectUrl.hostname)) {
          console.warn(`[ProductAccess] Blocked redirect to localhost/internal IP`);
          handleRedirect(`/p/${productSlug}`, returnUrl);
          return;
        }
        
        // Redirect to the validated URL
        redirect(product.content_config.redirect_url);
      } catch (error) {
        console.error(`[ProductAccess] Invalid redirect URL:`, error);
        handleRedirect(`/p/${productSlug}`, returnUrl);
        return;
      }
    } else {
      console.log(`[ProductAccess] No custom redirect URL, checking for return_url`);
      
      // Check if we have a return_url (cross-domain scenario)
      if (returnUrl) {
        console.log(`[ProductAccess] Redirecting to return_url:`, returnUrl);
        handleRedirect(`/p/${productSlug}`, returnUrl);
      } else {
        // Standard redirect to product page
        handleRedirect(`/p/${productSlug}`, returnUrl);
      }
    }
  } catch (error) {
    // Handle any unexpected errors (but not NEXT_REDIRECT)
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error; // Re-throw NEXT_REDIRECT - this is expected behavior
    }
    
    console.error('[ProductAccess] Unhandled error:', error);
    
    // Instead of redirecting to access-denied, redirect to the product page
    // This gives a better user experience if something goes wrong
    handleRedirect(`/p/${productSlug}`, returnUrl);
  }
}
