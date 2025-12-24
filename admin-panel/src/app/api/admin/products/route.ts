import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  validateCreateProduct, 
  sanitizeProductData 
} from '@/lib/validations/product';
import { requireAdminApi } from '@/lib/auth-server';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// Helper to standard headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdminApi(supabase); // Enforce Admin Access

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

    // Apply status filter
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      query = query.eq('is_active', status === 'active');
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
      return NextResponse.json({ error: 'Failed to fetch products' }, { 
        status: 500,
        headers: corsHeaders
      });
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, {
      headers: corsHeaders
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });

    console.error('Error in GET /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdminApi(supabase); // Enforce Admin Access

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Extract categories
    const { categories, ...productDataRaw } = body;

    // Sanitize input data
    const sanitizedData = sanitizeProductData(productDataRaw);

    // Validate create data
    const validation = validateCreateProduct(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Check if slug already exists
    const { data: existingProduct, error: slugCheckError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', sanitizedData.slug)
      .maybeSingle();
    
    if (slugCheckError) {
      console.error('Error checking slug availability:', slugCheckError);
      return NextResponse.json({ error: 'Failed to check slug availability' }, { 
        status: 500,
        headers: corsHeaders
      });
    }
    
    if (existingProduct) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Insert product with sanitized data
    const { data: product, error } = await supabase
      .from('products')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { 
        status: 500,
        headers: corsHeaders
      });
    }

    // Insert categories if present
    if (product && categories && Array.isArray(categories) && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        product_id: product.id,
        category_id: catId
      }));
      
      const { error: catError } = await supabase
        .from('product_categories')
        .insert(categoryInserts);
      
      if (catError) {
        console.error('Error adding categories:', catError);
        // We don't fail the whole request if categories fail, but we log it
      }
    }

    return NextResponse.json(product, { 
      status: 201,
      headers: corsHeaders
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });

    console.error('Error in POST /api/products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}