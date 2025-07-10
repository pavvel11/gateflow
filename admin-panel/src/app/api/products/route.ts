import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Check if slug already exists
    const { data: existingProduct, error: slugCheckError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
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

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        price: price,
        redirect_url: redirect_url || null,
        is_active: is_active !== undefined ? is_active : true,
        icon: icon || 'cube',
        theme: theme || 'blue'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
