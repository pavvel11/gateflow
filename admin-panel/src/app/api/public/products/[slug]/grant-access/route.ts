import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiting';

export async function POST(
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

    // Rate limiting
    const rateLimitOk = await checkRateLimit('grant_access', 5, 60, user.id);
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get product
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
      return NextResponse.json({ error: 'Product not available for purchase' }, { status: 400 });
    }

    // For paid products, we would validate payment here
    // For now, we'll only allow free products
    if (product.price > 0) {
      return NextResponse.json({ error: 'Payment processing not implemented' }, { status: 400 });
    }

    // Check if user already has valid access
    const { data: existingAccess } = await supabase
      .from('user_product_access')
      .select('access_expires_at')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .single();

    if (existingAccess) {
      const expiresAt = existingAccess.access_expires_at ? new Date(existingAccess.access_expires_at) : null;
      const isExpired = expiresAt && expiresAt < now;
      
      if (!isExpired) {
        return NextResponse.json({ 
          success: true, 
          message: 'Access already granted',
          alreadyHadAccess: true 
        });
      }
    }

    // Grant access using database function that respects auto_grant_duration_days
    const { data: grantResult, error: grantError } = await supabase
      .rpc('grant_free_product_access', {
        product_slug_param: slug
      });

    if (grantError) {
      console.error('Error granting access:', grantError);
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
    }

    if (!grantResult) {
      return NextResponse.json({ error: 'Failed to grant access - product may not be free or active' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Access granted successfully',
      alreadyHadAccess: false 
    });

  } catch (error) {
    console.error('Error in grant access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
