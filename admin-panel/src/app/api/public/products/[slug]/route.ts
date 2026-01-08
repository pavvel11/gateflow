import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();
    
    // Get product by slug
    // SECURITY FIX (V18): Only select public-safe fields
    // Previously used select('*') which exposed content_config with download URLs
    // This allowed anyone to get download links without paying
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        icon,
        price,
        currency,
        is_active,
        is_featured,
        available_from,
        available_until,
        allow_custom_price,
        custom_price_min,
        custom_price_presets,
        show_price_presets,
        enable_waitlist,
        content_delivery_type,
        layout_template
      `)
      .eq('slug', slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
