import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error fetching product:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, price, is_active, icon, theme, redirect_url } = body;

    // Validate required fields
    if (!name || !slug || !description || price === undefined) {
      return NextResponse.json({ 
        error: 'Name, slug, description, and price are required' 
      }, { status: 400 });
    }
    
    // Validate slug format (only lowercase letters, numbers, hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ 
        error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
      }, { status: 400 });
    }
    
    // Check if slug already exists for other products
    const { data: existingProduct, error: slugCheckError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)  // Exclude current product
      .maybeSingle();
    
    if (slugCheckError) {
      return NextResponse.json({ error: 'Failed to check slug availability' }, { status: 500 });
    }
    
    if (existingProduct) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 400 });
    }

    // Validate price
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ 
        error: 'Price must be a positive number' 
      }, { status: 400 });
    }

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        price: price,
        redirect_url: redirect_url || null,
        is_active: is_active !== undefined ? is_active : true,
        icon: icon || 'cube',
        theme: theme || 'blue',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error updating product:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the product to find its slug
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('slug')
      .eq('id', id)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    // Check if product has any user access entries
    try {
      // First delete any user access entries for this product
      const { error: deleteAccessError } = await supabase
        .from('user_product_access')
        .delete()
        .eq('product_slug', product.slug);

      if (deleteAccessError) {
        console.error('Error deleting product access entries:', deleteAccessError);
        return NextResponse.json({ error: 'Failed to delete product access entries' }, { status: 500 });
      }
      
      // Now we can safely delete the product
    } catch (accessCheckError) {
      console.error('Exception when checking product access:', accessCheckError);
      return NextResponse.json({ error: 'Failed to check product access' }, { status: 500 });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
