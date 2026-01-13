import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

// Note: These must be read at runtime, not build time
const getSupabaseUrl = () => process.env.SUPABASE_URL!;
const getSupabaseServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    let user: { id: string } | null = null;

    // Try Bearer token auth first (for API clients)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createServiceClient(getSupabaseUrl(), getSupabaseServiceKey());
      const { data: { user: tokenUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && tokenUser) {
        user = tokenUser;
      }
    }

    // Fall back to cookie auth (for browser clients)
    if (!user) {
      const supabase = await createClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations
    const supabase = createServiceClient(getSupabaseUrl(), getSupabaseServiceKey());

    const { data: admin } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // SECURITY: Rate limit coupon creation
    const rateLimitOk = await checkRateLimit(
      RATE_LIMITS.ADMIN_COUPON_CREATE.actionType,
      RATE_LIMITS.ADMIN_COUPON_CREATE.maxRequests,
      RATE_LIMITS.ADMIN_COUPON_CREATE.windowMinutes,
      user.id
    );

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 coupon creations per hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.code || !body.discount_type || body.discount_value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY: Validate discount_value to prevent integer overflow/abuse
    const discountValue = Number(body.discount_value);
    const MAX_FIXED_DISCOUNT = 99999999; // ~$999,999.99 in cents

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 });
    }

    if (body.discount_type === 'percentage' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    if (body.discount_type === 'fixed' && discountValue > MAX_FIXED_DISCOUNT) {
      return NextResponse.json({ error: `Fixed discount cannot exceed ${MAX_FIXED_DISCOUNT} cents` }, { status: 400 });
    }

    if (!['percentage', 'fixed'].includes(body.discount_type)) {
      return NextResponse.json({ error: 'Discount type must be "percentage" or "fixed"' }, { status: 400 });
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
