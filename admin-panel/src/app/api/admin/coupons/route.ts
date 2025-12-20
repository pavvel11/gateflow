import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify admin
    const { data: admin } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Coupons GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: admin } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    
    // Validate required fields
    if (!body.code || !body.discount_type || !body.discount_value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: body.code.toUpperCase(), // Normalize code
        name: body.name,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        currency: body.currency,
        allowed_emails: body.allowed_emails || [],
        allowed_product_ids: body.allowed_product_ids || [],
        usage_limit_global: body.usage_limit_global,
        usage_limit_per_user: body.usage_limit_per_user ?? 1,
        starts_at: body.starts_at || new Date().toISOString(),
        expires_at: body.expires_at,
        is_active: body.is_active ?? true,
        exclude_order_bumps: body.exclude_order_bumps ?? false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Coupons POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
