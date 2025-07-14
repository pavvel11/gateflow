import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get product by slug
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, price, is_active, available_from, available_until')
      .eq('slug', slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check temporal availability
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && (!availableUntil || availableUntil > now);
    
    if (!product.is_active || !isTemporallyAvailable) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: !product.is_active ? 'inactive' : 'temporal',
        product: {
          name: product.name,
          slug: product.slug,
          price: product.price,
          available_from: product.available_from,
          available_until: product.available_until
        }
      });
    }

    // Check user access with RLS
    const { data: userAccess, error: accessError } = await supabase
      .from('user_product_access')
      .select('access_expires_at, access_duration_days, created_at')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .single();

    if (accessError && accessError.code !== 'PGRST116') {
      console.error('Error checking access:', accessError);
      return NextResponse.json({ error: 'Access check failed' }, { status: 500 });
    }

    // No access record found
    if (!userAccess) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'no_access',
        product: {
          name: product.name,
          slug: product.slug,
          price: product.price
        }
      });
    }

    // Check if access has expired
    const expiresAt = userAccess.access_expires_at ? new Date(userAccess.access_expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;

    if (isExpired) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'expired',
        product: {
          name: product.name,
          slug: product.slug,
          price: product.price
        }
      });
    }

    // User has valid access
    return NextResponse.json({ 
      hasAccess: true,
      userAccess: {
        access_expires_at: userAccess.access_expires_at,
        access_duration_days: userAccess.access_duration_days,
        access_granted_at: userAccess.created_at
      },
      product: {
        name: product.name,
        slug: product.slug,
        price: product.price
      }
    });

  } catch (error) {
    console.error('Error in access check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
