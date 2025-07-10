import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UserAccessRequest {
  product_id: string;
}

// GET /api/users/[id]/access - Get user's product access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's product access with product details
    const { data: userAccess, error: accessError } = await supabase
      .from('user_product_access')
      .select(`
        id,
        product_id,
        granted_at,
        granted_by,
        products (
          id,
          name,
          description,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (accessError) {
      console.error('Error fetching user access:', accessError);
      return NextResponse.json({ error: 'Failed to fetch user access' }, { status: 500 });
    }

    return NextResponse.json({
      user_id: userId,
      access: userAccess || []
    });
  } catch (error) {
    console.error('Error in GET /api/users/[id]/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users/[id]/access - Grant user access to a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UserAccessRequest = await request.json();

    // Validate request body
    if (!body.product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, is_active')
      .eq('id', body.product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.is_active) {
      return NextResponse.json({ error: 'Cannot grant access to inactive product' }, { status: 400 });
    }

    // Check if user already has access to this product
    const { data: existingAccess, error: existingError } = await supabase
      .from('user_product_access')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', body.product_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing access:', existingError);
      return NextResponse.json({ error: 'Failed to check existing access' }, { status: 500 });
    }

    if (existingAccess) {
      return NextResponse.json({ error: 'User already has access to this product' }, { status: 409 });
    }

    // Grant access
    const { data: newAccess, error: accessError } = await supabase
      .from('user_product_access')
      .insert({
        user_id: userId,
        product_id: body.product_id,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      })
      .select(`
        id,
        product_id,
        granted_at,
        granted_by,
        products (
          id,
          name,
          description,
          is_active
        )
      `)
      .single();

    if (accessError) {
      console.error('Error granting access:', accessError);
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Access granted successfully',
      access: newAccess
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users/[id]/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id]/access - Remove user's access to a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if access exists
    const { data: existingAccess, error: existingError } = await supabase
      .from('user_product_access')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingError || !existingAccess) {
      return NextResponse.json({ error: 'Access not found' }, { status: 404 });
    }

    // Remove access
    const { error: deleteError } = await supabase
      .from('user_product_access')
      .delete()
      .eq('id', existingAccess.id);

    if (deleteError) {
      console.error('Error removing access:', deleteError);
      return NextResponse.json({ error: 'Failed to remove access' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Access removed successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
