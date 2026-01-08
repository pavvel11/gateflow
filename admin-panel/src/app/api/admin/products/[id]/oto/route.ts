import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/products/[id]/oto
 * Get OTO configuration for a product
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;

    const supabase = await createClient();

    // Check admin access
    try {
      await requireAdminApi(supabase);
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unauthorized';
      const status = errorMessage === 'Forbidden' ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status });
    }

    // Fetch OTO configuration via RPC
    const { data, error } = await supabase.rpc('admin_get_product_oto_offer', {
      product_id_param: productId
    });

    if (error) {
      console.error('Failed to fetch OTO config:', error);
      return NextResponse.json({ has_oto: false });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('OTO config API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products/[id]/oto
 * Save OTO configuration for a product
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const body = await request.json();

    const {
      oto_enabled,
      oto_product_id,
      oto_discount_type,
      oto_discount_value,
      oto_duration_minutes,
    } = body;

    const supabase = await createClient();

    // Check admin access
    try {
      await requireAdminApi(supabase);
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unauthorized';
      const status = errorMessage === 'Forbidden' ? 403 : 401;
      return NextResponse.json({ error: errorMessage }, { status });
    }

    if (oto_enabled && oto_product_id) {
      // Save OTO configuration
      const { data, error } = await supabase.rpc('admin_save_oto_offer', {
        source_product_id_param: productId,
        oto_product_id_param: oto_product_id,
        discount_type_param: oto_discount_type || 'percentage',
        discount_value_param: oto_discount_value || 20,
        duration_minutes_param: oto_duration_minutes || 15,
        is_active_param: true
      });

      if (error) {
        console.error('Failed to save OTO config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Delete OTO configuration
      const { data, error } = await supabase.rpc('admin_delete_oto_offer', {
        source_product_id_param: productId
      });

      if (error) {
        console.error('Failed to delete OTO config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('OTO config save API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
