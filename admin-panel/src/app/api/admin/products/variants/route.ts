import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Link products as variants
 * POST /api/admin/products/variants
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { productIds, variantNames } = body as {
      productIds: string[];
      variantNames?: Record<string, string>;
    };

    if (!productIds || productIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 products are required to create variants' },
        { status: 400 }
      );
    }

    // Generate new variant group ID
    const variantGroupId = crypto.randomUUID();

    // Update all products with the new group ID
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const variantName = variantNames?.[productId] || null;

      const { error } = await supabase
        .from('products')
        .update({
          variant_group_id: variantGroupId,
          variant_name: variantName,
          variant_order: i
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
          { error: `Failed to update product ${productId}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      variantGroupId,
      message: `${productIds.length} products linked as variants`
    });
  } catch (error) {
    console.error('Error linking variants:', error);
    return NextResponse.json(
      { error: 'Failed to link variants' },
      { status: 500 }
    );
  }
}

/**
 * Unlink a product from its variant group
 * DELETE /api/admin/products/variants?productId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('products')
      .update({
        variant_group_id: null,
        variant_name: null,
        variant_order: 0
      })
      .eq('id', productId);

    if (error) {
      console.error('Error unlinking product:', error);
      return NextResponse.json(
        { error: 'Failed to unlink product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product unlinked from variant group'
    });
  } catch (error) {
    console.error('Error unlinking variant:', error);
    return NextResponse.json(
      { error: 'Failed to unlink variant' },
      { status: 500 }
    );
  }
}

/**
 * Get variants for a product
 * GET /api/admin/products/variants?productId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const groupId = searchParams.get('groupId');

    if (!productId && !groupId) {
      return NextResponse.json(
        { error: 'productId or groupId is required' },
        { status: 400 }
      );
    }

    let variantGroupId = groupId;

    // If productId provided, get its variant_group_id first
    if (productId && !groupId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('variant_group_id')
        .eq('id', productId)
        .single();

      if (productError || !product?.variant_group_id) {
        return NextResponse.json({ variants: [] });
      }

      variantGroupId = product.variant_group_id;
    }

    // Get all variants in the group
    const { data: variants, error } = await supabase
      .from('products')
      .select('id, name, slug, variant_name, variant_order, price, currency, is_active')
      .eq('variant_group_id', variantGroupId)
      .order('variant_order', { ascending: true });

    if (error) {
      console.error('Error fetching variants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch variants' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variantGroupId,
      variants: variants || []
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    );
  }
}
